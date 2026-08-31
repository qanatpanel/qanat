/**
 * هندلر پروکسی WebSocket — VLESS + Trojan روی Cloudflare Workers
 * الگو: WebSocketPair + استریم‌ها (مثل BPB) + connect از cloudflare:sockets
 *
 * خروجی زنجیره‌ای (مثل edgetunnel): ابتدا اتصال مستقیم؛ اگر سایت مقصد
 * اتصال را بست/پاسخی نداد (بلاک IP خروجی کلودفلر)، از بالادست‌های
 * تنظیم‌شده (VLESS/Trojan/شفاف) به‌ترتیب استفاده می‌شود.
 */
import { connect } from 'cloudflare:sockets';
import type { Env } from '../types/global';
import type { ProxySettings } from '../settings/proxy';
import { protocolsEnabled } from '../settings/proxy';
import { getUserByUuid, getUserByTrojanPassword } from '../settings/users';
import { addUsage, recordDailyUsage } from '../settings/users';
import { parseVlessHeader, parseTrojanPassword, parseTrojanRequest, type Target } from './parse';
import { parseUpstreams, openUpstream, type UpstreamTunnel } from './upstream';

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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * باز کردن یک تلاش اتصال و منتظر ماندن برای «اولین بایت» از سمت سرور.
 * اگر تا timeoutMs داده‌ای نرسید یا اتصال بسته شد → null (تلاش بعدی).
 * بعد از موفقیت، پمپ TCP→WS (شامل اولین بایت) در پس‌زمینه ادامه دارد.
 */
async function tryConnection(
  openFn: () => Promise<UpstreamTunnel | null>,
  writer: WritableStreamDefaultWriter<Uint8Array>,
  timeoutMs: number,
  onBytes: (n: number) => void,
): Promise<{ tunnel: UpstreamTunnel; pump: Promise<void> } | null> {
  let tunnel: UpstreamTunnel | null = null;
  try {
    tunnel = await openFn();
  } catch {
    return null;
  }
  if (!tunnel) return null;

  let sawFirst = false;
  let resolveFirst: (ok: boolean) => void = () => {};
  const firstPromise = new Promise<boolean>((resolve) => {
    resolveFirst = resolve;
  });

  const pump = (async () => {
    const tcpReader = tunnel!.reader;
    try {
      while (true) {
        const { value, done } = await tcpReader.read();
        if (done) {
          if (!sawFirst) resolveFirst(false);
          break;
        }
        if (!value || value.length === 0) continue;
        if (!sawFirst) {
          sawFirst = true;
          resolveFirst(true);
        }
        onBytes(value.length);
        await writer.write(value);
      }
    } catch {
      if (!sawFirst) resolveFirst(false);
    } finally {
      try {
        tcpReader.releaseLock();
      } catch {
        /* ignore */
      }
    }
  })();

  const ok = await Promise.race([firstPromise, delay(timeoutMs).then(() => false as boolean)]);
  if (!ok) {
    tunnel.close();
    return null;
  }
  return { tunnel, pump };
}

/**
 * اتصال یک کاربر: بررسی هدر → چک اعتبار → connect (مستقیم + بالادست) → رله‌ی دوطرفه
 * شناسه در مسیر: /{proxyPath}/{uuid|password}
 */
export async function handleProxyWs(ws: WebSocket, identifier: string, env: Env, proxy: ProxySettings): Promise<void> {
  ws.accept();
  ws.binaryType = 'arraybuffer';

  const { vless, trojan } = protocolsEnabled(proxy);
  let userId = 0;
  let bytesUp = 0;
  let bytesDown = 0;

  const isVless = vless && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
  const isTrojan = trojan && /^[0-9a-f]{56}$/i.test(identifier);

  if (!isVless && !isTrojan) {
    closeWs(ws);
    return;
  }

  let remoteTunnel: UpstreamTunnel | null = null;
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
      if (handshake.length < 22) {
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

    // ─── ۳) اتصال خروجی: مستقیم اول، بعد بالادست‌ها (مثل edgetunnel) ───
    const initial = bodyOffset > 0 && bodyOffset < handshake.length ? handshake.slice(bodyOffset) : new Uint8Array(0);
    bytesUp += initial.length;

    const failoverMs = Math.max(800, Math.min(15000, proxy.failoverMs || 3000));
    const upstreams = parseUpstreams(proxy.upstreams || '');
    const attempts: (() => Promise<UpstreamTunnel | null>)[] = [];

    // ۱) اتصال مستقیم + نوشتن داده‌ی اولیه (TLS hello)
    attempts.push(async () => {
      const s = connect({ hostname: target.host, port: target.port });
      const w = s.writable.getWriter();
      try {
        if (initial.length > 0) await w.write(initial);
      } catch {
        /* ignore */
      } finally {
        w.releaseLock();
      }
      return {
        reader: s.readable.getReader(),
        writer: s.writable.getWriter(),
        close: () => {
          try {
            s.close();
          } catch {
            /* ignore */
          }
        },
      };
    });

    // ۲) بالادست‌ها به ترتیب
    for (const up of upstreams) {
      attempts.push(async () => {
        const tunnel = await openUpstream(up, target, initial, failoverMs);
        return tunnel;
      });
    }

    let pump: Promise<void> | null = null;
    for (const open of attempts) {
      const r = await tryConnection(open, writer, failoverMs, (n) => (bytesDown += n));
      if (r) {
        remoteTunnel = r.tunnel;
        pump = r.pump;
        break;
      }
    }
    if (!remoteTunnel || !pump) {
      closeWs(ws);
      return;
    }

    // رله WS → TCP (داده‌ی اولیه قبلاً نوشته شده — مستقیم یا داخل upstream)
    const upstream = (async () => {
      const tcpWriter = remoteTunnel!.writer;
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          bytesUp += value.length;
          await tcpWriter.write(value);
        }
      } finally {
        try {
          tcpWriter.releaseLock();
        } catch {
          /* ignore */
        }
      }
    })();

    // ─── ۴) پایان اتصال ───
    try {
      await Promise.race([upstream, pump]);
    } catch {
      /* ignore */
    } finally {
      try {
        remoteTunnel!.close();
      } catch {
        /* ignore */
      }
      try {
        await writer.close();
      } catch {
        /* ignore */
      }
      closeWs(ws);
      // ثبت مصرف — همیشه (برای نمودارها حتی بدون کوتا)
      if (userId > 0) {
        try {
          await addUsage(env, userId, bytesUp + bytesDown);
          await recordDailyUsage(env, userId, bytesUp + bytesDown);
        } catch {
          /* ignore */
        }
      }
    }
  } catch (e: any) {
    if (remoteTunnel) {
      try {
        remoteTunnel.close();
      } catch {
        /* ignore */
      }
    }
    closeWs(ws);
  }
}
