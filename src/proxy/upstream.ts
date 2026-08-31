/**
 * بالادست‌ها (Upstream/Hop) — زنجیره‌سازی خروجی مثل edgetunnel
 *
 * وقتی اتصال مستقیم worker به سایت مقصد بسته می‌شود (بلاک IP های خروجی
 * Cloudflare توسط سایت‌ها)، ترافیک از یک «هاپ» میانی رد می‌شود:
 *
 *   کلاینت → پنل (IP تمیز) → هاپ (مثلاً یک edgetunnel سالم) → سایت
 *
 * فرمت هر خط (پشتیبانی از هر سه):
 *   vless://UUID@HOST:PORT?security=tls&sni=SNI&type=ws&host=H&path=%2Fp
 *   trojan://PASS@HOST:PORT?security=tls&sni=SNI&type=ws&host=H&path=%2Fp
 *   HOST:PORT            → شفاف (Transparent): داده‌ی خام به آن فرستاده می‌شود
 */
import { connect } from 'cloudflare:sockets';
import type { Target } from './parse';

export interface Upstream {
  kind: 'vless' | 'trojan' | 'transparent';
  uuid?: string;
  password?: string;
  host: string;
  port: number;
  tls: boolean;
  sni: string;
  hostHeader: string;
  path: string;
}

/** پارس یک خط کانفیگ بالادست — null اگر نامعتبر */
export function parseUpstreamLine(line: string): Upstream | null {
  const s = line.trim();
  if (!s || s.startsWith('#')) return null;

  // vless://uuid@host:port?params
  const vless = s.match(/^vless:\/\/([0-9a-fA-F-]{36})@([^:\/?#]+)(?::(\d+))?(?:\?([^#]*))?/);
  if (vless) {
    const q = new URLSearchParams(vless[4] || '');
    const port = Number(vless[3]) || 443;
    const tls = q.get('security') === 'tls' || q.get('security') === 'reality';
    const host = vless[2]!;
    const sni = q.get('sni') || host;
    return {
      kind: 'vless',
      uuid: vless[1]!.toLowerCase(),
      host,
      port,
      tls,
      sni,
      hostHeader: q.get('host') || sni,
      path: q.get('path') || '/',
    };
  }

  // trojan://password@host:port?params
  const trojan = s.match(/^trojan:\/\/([^@]+)@([^:\/?#]+)(?::(\d+))?(?:\?([^#]*))?/);
  if (trojan) {
    const q = new URLSearchParams(trojan[4] || '');
    const port = Number(trojan[3]) || 443;
    const tls = q.get('security') === 'tls' || q.get('security') === 'reality';
    const host = trojan[2]!;
    const sni = q.get('sni') || host;
    return {
      kind: 'trojan',
      password: decodeURIComponent(trojan[1]!),
      host,
      port,
      tls,
      sni,
      hostHeader: q.get('host') || sni,
      path: q.get('path') || '/',
    };
  }

  // HOST:PORT یا HOST (شفاف)
  const plain = s.match(/^([^:\/\s]+)(?::(\d+))?$/);
  if (plain) {
    return {
      kind: 'transparent',
      host: plain[1]!,
      port: Number(plain[2]) || 443,
      tls: false,
      sni: '',
      hostHeader: '',
      path: '',
    };
  }
  return null;
}

/** تبدیل لیست چندخطی به آرایه‌ی بالادست‌های معتبر */
export function parseUpstreams(text: string): Upstream[] {
  const out: Upstream[] = [];
  for (const line of text.split(/\r?\n/)) {
    const up = parseUpstreamLine(line);
    if (up && !out.some((u) => u.kind === up.kind && u.host === up.host && u.port === up.port)) out.push(up);
  }
  return out;
}

/* ─────────────── ابزارهای باینری ─────────────── */

function concat(a: Uint8Array, b: Uint8Array): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

function asAB(u: Uint8Array): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(u.length);
  out.set(u);
  return out;
}

function findHeaderEnd(buf: Uint8Array): number {
  for (let i = 0; i + 3 < buf.length; i++) {
    if (buf[i] === 13 && buf[i + 1] === 10 && buf[i + 2] === 13 && buf[i + 3] === 10) return i + 4;
  }
  return -1;
}

function randomKey(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

/** ساخت درخواست VLESS به سمت بالادست */
export function buildVlessRequest(uuidHex: string, target: Target, payload: Uint8Array): Uint8Array {
  const uuid = uuidHex.replace(/-/g, '');
  const bytes = new Uint8Array(17);
  for (let i = 0; i < 16; i++) bytes[i + 1] = parseInt(uuid.slice(i * 2, i * 2 + 2), 16);
  const addr = encodeAddress(target);
  const head = new Uint8Array(1 + 17 + 1 + 2 + addr.length);
  head.set(bytes, 0);
  head[17] = 0; // addonLen
  head[18] = 1; // command tcp
  head[19] = (target.port >> 8) & 0xff;
  head[20] = target.port & 0xff;
  head.set(addr, 21);
  return concat(head, payload);
}

/** ساخت درخواست Trojan به سمت بالادست */
export function buildTrojanRequest(password: string, target: Target, payload: Uint8Array): Uint8Array {
  const pass = new TextEncoder().encode(password);
  const addr = encodeAddress(target);
  // pass + \r\n + cmd(1) + atyp/addr + port(2 BE) + \r\n
  const head = new Uint8Array(pass.length + 1 + 1 + 1 + addr.length + 2 + 2);
  let p = 0;
  head.set(pass, p);
  p += pass.length;
  head[p++] = 13;
  head[p++] = 10;
  head[p++] = 1; // command tcp
  head.set(addr, p);
  p += addr.length;
  head[p++] = (target.port >> 8) & 0xff;
  head[p++] = target.port & 0xff;
  head[p++] = 13;
  head[p++] = 10;
  return concat(head, payload);
}

/** آدرس مقصد به فرمت VLESS/Trojan (atype + bytes) */
function encodeAddress(target: Target): Uint8Array {
  const atype = target.hostType || 2;
  if (atype === 1) {
    const parts = target.host.split('.').map((x) => Number(x) & 0xff);
    if (parts.length === 4) return new Uint8Array([1, ...parts]);
  }
  if (atype === 3 && target.host.includes(':')) {
    const groups = target.host.split(':');
    if (groups.length === 8) {
      const out = new Uint8Array(17);
      out[0] = 3;
      for (let i = 0; i < 8; i++) {
        const v = parseInt(groups[i]!, 16) || 0;
        out[i * 2 + 1] = (v >> 8) & 0xff;
        out[i * 2 + 2] = v & 0xff;
      }
      return out;
    }
  }
  // دامنه (پیش‌فرض)
  const name = new TextEncoder().encode(target.host);
  const out = new Uint8Array(2 + name.length);
  out[0] = 2;
  out[1] = name.length;
  out.set(name, 2);
  return out;
}

/* ─────────────── اتصال به بالادست ─────────────── */

export interface UpstreamTunnel {
  reader: ReadableStreamDefaultReader<Uint8Array>;
  writer: WritableStreamDefaultWriter<Uint8Array>;
  close: () => void;
}

function closeSocket(s: Socket | null) {
  if (!s) return;
  try {
    s.close();
  } catch {
    /* ignore */
  }
}

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
      if (ws.readyState === 1) ws.send(chunk);
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

function tcpTunnel(socket: Socket): UpstreamTunnel {
  return {
    reader: socket.readable.getReader(),
    writer: socket.writable.getWriter(),
    close: () => {
      try {
        socket.close();
      } catch {
        /* ignore */
      }
    },
  };
}

/**
 * باز کردن تونل به بالادست:
 * - transparent: connect + نوشتن داده‌ی خام (همان پورت مقصد — مثل PROXYIP ادج‌تانل)
 * - vless/trojan: connect (+TLS) + WebSocket handshake + هدر پروتکل + payload
 */
export async function openUpstream(up: Upstream, target: Target, payload: Uint8Array, timeoutMs: number): Promise<UpstreamTunnel | null> {
  const timer = new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs));
  const job = (async (): Promise<UpstreamTunnel | null> => {
    let tunnel: UpstreamTunnel | null = null;
    try {
      if (up.kind === 'transparent') {
        // داده‌ی خام (TLS hello مقصد) مستقیم به هاپِ شفاف — connect خام
        const socket = connect({ hostname: up.host, port: up.port });
        const w = socket.writable.getWriter();
        try {
          if (payload.length > 0) await w.write(payload);
        } finally {
          w.releaseLock();
        }
        tunnel = tcpTunnel(socket);
        return tunnel;
      }

      // vless / trojan با TLS → fetch + Upgrade: websocket
      // (connect به دامنه‌های Cloudflare/Worker ها بلاک است؛ fetch مجاز است و
      //  با flag global_fetch_strictly_public حتی بین Worker های یک اکانت هم کار می‌کند)
      if (up.tls) {
        const key = randomKey();
        const res = await fetch(`https://${up.host}${up.path}`, {
          headers: {
            Host: up.hostHeader,
            Upgrade: 'websocket',
            Connection: 'Upgrade',
            'Sec-WebSocket-Key': key,
            'Sec-WebSocket-Version': '13',
          },
        });
        if (res.status !== 101 || !res.webSocket) return null;
        const ws = res.webSocket;
        ws.accept();
        ws.binaryType = 'arraybuffer';
        const writer = wsWritableStream(ws).getWriter();
        const request =
          up.kind === 'vless'
            ? buildVlessRequest(up.uuid!, target, payload)
            : buildTrojanRequest(up.password!, target, payload);
        await writer.write(request);
        tunnel = {
          reader: wsReadableStream(ws).getReader(),
          writer,
          close: () => {
            try {
              ws.close();
            } catch {
              /* ignore */
            }
          },
        };
        return tunnel;
      }

      // بدون TLS — connect خام + WebSocket handshake دستی
      const socket = connect({ hostname: up.host, port: up.port });
      const writer = socket.writable.getWriter();
      const reader = socket.readable.getReader();
      const key = randomKey();
      const req =
        `GET ${up.path} HTTP/1.1\r\n` +
        `Host: ${up.hostHeader}\r\n` +
        `Upgrade: websocket\r\n` +
        `Connection: Upgrade\r\n` +
        `Sec-WebSocket-Key: ${key}\r\n` +
        `Sec-WebSocket-Version: 13\r\n\r\n`;
      await writer.write(new TextEncoder().encode(req));

      let buf: Uint8Array<ArrayBuffer> = new Uint8Array(0);
      let ok = false;
      while (buf.length < 65536) {
        const { value, done } = await reader.read();
        if (done) break;
        buf = concat(buf, asAB(value));
        const end = findHeaderEnd(buf);
        if (end >= 0) {
          const head = new TextDecoder().decode(asAB(buf.slice(0, end)));
          ok = head.startsWith('HTTP/1.1 101') || head.includes(' 101 ');
          break;
        }
      }
      if (!ok) {
        closeSocket(socket);
        return null;
      }

      const request =
        up.kind === 'vless'
          ? buildVlessRequest(up.uuid!, target, payload)
          : buildTrojanRequest(up.password!, target, payload);
      await writer.write(request);
      writer.releaseLock();
      tunnel = tcpTunnel(socket);
      return tunnel;
    } catch {
      if (tunnel) tunnel.close();
      return null;
    }
  })();

  const result = await Promise.race([job, timer]);
  if (!result) {
    // اگر job دیرتر تمام شد و تونل باز شد، ببندش
    void job.then((r) => {
      if (r) r.close();
    });
  }
  return result;
}
