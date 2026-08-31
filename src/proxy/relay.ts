/**
 * هندلر پروکسی WebSocket — VLESS + Trojan روی Cloudflare Workers
 * الگو: WebSocketPair + استریم‌ها (مثل BPB) + connect از cloudflare:sockets
 */
import { connect } from 'cloudflare:sockets';
import type { Env } from '../types/global';
import type { ProxySettings } from '../settings/proxy';
import { protocolsEnabled } from '../settings/proxy';
import { getUserByUuid, getUserByTrojanPassword } from '../settings/users';
import { addUsage } from '../settings/users';
import { parseVlessHeader, parseTrojanPassword, parseTrojanRequest, type Target } from './parse';

const WS_OPEN = 1;

/** تبدیل WebSocket به ReadableStream (رویدادها → استریم) */
function wsReadableStream(ws: WebSocket): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      ws.addEventListener('message', (event) => {
        const data = event.data as ArrayBuffer | string;
        controller.enqueue(typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data));
      });
      ws.addEventListener('close', () => controller.close());
      ws.addEventListener('error', (e) => controller.error(e));
    },
    cancel() {
      try {
        ws.close();
      } catch {
        /* ignore */
      }
    },
  });
}

function wsWritableStream(ws: WebSocket): WritableStream<Uint8Array> {
  return new WritableStream({
    write(chunk) {
      if (ws.readyState === WS_OPEN) ws.send(chunk);
    },
    close() {
      try {
        ws.close();
      } catch {
        /* ignore */
      }
    },
    abort() {
      try {
        ws.close();
      } catch {
        /* ignore */
      }
    },
  });
}

/** بستن امن سوکت TCP */
function closeTcp(socket: Socket | null) {
  if (!socket) return;
  try {
    socket.close();
  } catch {
    /* ignore */
  }
}

/** بستن امن WebSocket */
function closeWs(ws: WebSocket) {
  try {
    ws.close();
  } catch {
    /* ignore */
  }
}

/** ادغام دو بافر */
function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

/**
 * اتصال یک کاربر: بررسی هدر → چک اعتبار → connect → رله‌ی دوطرفه
 * شناسه در مسیر: /{proxyPath}/{uuid|password}
 */
export async function handleProxyWs(ws: WebSocket, identifier: string, env: Env, proxy: ProxySettings): Promise<void> {
  ws.accept();
  ws.binaryType = 'arraybuffer';

  const { vless, trojan } = protocolsEnabled(proxy);
  let userId = 0;
  let bytesUp = 0;
  let bytesDown = 0;
  let remoteSocket: Socket | null = null;

  const isVless = vless && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
  const isTrojan = trojan && /^[0-9a-f]{56}$/i.test(identifier);

  if (!isVless && !isTrojan) {
    closeWs(ws);
    return;
  }

  try {
    const reader = wsReadableStream(ws).getReader();
    const writer = wsWritableStream(ws).getWriter();

    // ─── ۱) دریافت فریم‌(های) هندشیک ───
    let first = await reader.read();
    if (first.done) return closeWs(ws);
    let handshake = first.value;

    let target: Target | null = null;
    let bodyOffset = -1;
    let user = null;

    if (isVless) {
      // اگر هدر ناقص بود یک فریم دیگر بگیر
      if (handshake.length < 26) {
        const second = await reader.read();
        if (second.done) return closeWs(ws);
        handshake = concat(handshake, second.value);
      }
      const parsed = parseVlessHeader(handshake);
      if (!parsed) return closeWs(ws);
      user = await getUserByUuid(env, parsed.uuid);
      if (!user) return closeWs(ws);
      userId = user.id;
      target = parsed.target;
      bodyOffset = parsed.bodyOffset;
      await writer.write(parsed.responseHeader); // [0,0]
    } else {
      const password = parseTrojanPassword(handshake);
      if (!password) return closeWs(ws);
      user = await getUserByTrojanPassword(env, password);
      if (!user) return closeWs(ws);
      userId = user.id;
      await writer.write(new Uint8Array([13, 10])); // \r\n پاسخ تروجان
      const troj = parseTrojanRequest(handshake, 56);
      if (troj) {
        target = troj;
        bodyOffset = troj.offset;
      } else {
        // درخواست در فریم بعدی
        const second = await reader.read();
        if (second.done) return closeWs(ws);
        handshake = second.value;
        const troj2 = parseTrojanRequest(handshake, 0);
        if (troj2) {
          target = troj2;
          bodyOffset = troj2.offset;
        }
      }
    }

    // ─── ۲) چک اعتبار کاربر و هدف ───
    if (!user || !target) {
      closeWs(ws);
      return;
    }
    const now = Date.now();
    if (!user.isActive || (user.expiry > 0 && user.expiry < now)) {
      closeWs(ws);
      return;
    }
    if (user.quotaGb > 0 && user.usedGb >= user.quotaGb) {
      closeWs(ws);
      return;
    }
    if (target.command !== 'tcp' || !target.host || target.port === 0) {
      closeWs(ws);
      return;
    }

    // ─── ۳) اتصال TCP ───
    remoteSocket = connect({ hostname: target.host, port: target.port });

    // داده‌های باقی‌مانده بعد از هدر → TCP
    const initial = bodyOffset > 0 && bodyOffset < handshake.length ? handshake.slice(bodyOffset) : new Uint8Array(0);
    bytesUp += initial.length;

    // رله WS → TCP
    const upstream = (async () => {
      const tcpWriter = remoteSocket!.writable.getWriter();
      try {
        if (initial.length > 0) await tcpWriter.write(initial);
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          bytesUp += value.length;
          await tcpWriter.write(value);
        }
      } finally {
        tcpWriter.releaseLock();
      }
    })();

    // رله TCP → WS
    const downstream = (async () => {
      const tcpReader = remoteSocket!.readable.getReader();
      try {
        while (true) {
          const { value, done } = await tcpReader.read();
          if (done) break;
          bytesDown += value.length;
          await writer.write(value);
        }
      } finally {
        tcpReader.releaseLock();
      }
    })();

    // ─── ۴) پایان اتصال ───
    try {
      await Promise.race([upstream, downstream]);
    } catch {
      /* خطا → بستن */
    } finally {
      closeTcp(remoteSocket);
      try {
        await writer.close();
      } catch {
        /* ignore */
      }
      closeWs(ws);
      // ثبت مصرف — فقط اگر کاربر کوتا داشته باشد
      if (user.quotaGb > 0 && userId > 0) {
        try {
          await addUsage(env, userId, bytesUp + bytesDown);
        } catch {
          /* ignore */
        }
      }
    }
  } catch {
    closeTcp(remoteSocket);
    closeWs(ws);
  }
}
