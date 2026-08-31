/**
 * پارسرهای پروتکل VLESS و Trojan — توابع خالص (قابل تست در Node)
 *
 * VLESS (بعد از WebSocket upgrade):
 *   [0]=version(0) [1..16]=UUID [17]=addonLen [addon]
 *   سپس: [0]=ver(0) [1..2]=طول (BE16) [body]:
 *        [0]=command(1=tcp/2=udp) [1]=reserved [2]=atype
 *        آدرس (1→4B, 2→1B طول+دامنه, 3→16B) [نهایی]=پورت (BE16)
 *   پاسخ سرور: [version, 0]
 *
 * Trojan (بعد از WebSocket upgrade):
 *   [0..55]=پسورد هگز(56) [56..57]=\r\n  → سپس سرور \r\n می‌فرستد
 *   بعد: [0]=command(1=tcp/2=udp) [1]=atype آدرس پورت
 */

export type Command = 'tcp' | 'udp';

export interface Target {
  command: Command;
  host: string;
  port: number;
  hostType: number;
}

export interface VlessHeader {
  uuid: string;
  target: Target;
  responseHeader: Uint8Array; // [version, 0]
  bodyOffset: number; // جایی که داده‌ی واقعی شروع می‌شود
}

export interface TrojanHeader {
  password: string;
  target: TrojanTarget;
  bodyOffset: number;
}

/* ─────────────── ابزار ─────────────── */

export function uuidToBytes(uuid: string): Uint8Array | null {
  const hex = uuid.replace(/-/g, '');
  if (!/^[0-9a-fA-F]{32}$/.test(hex)) return null;
  const out = new Uint8Array(16);
  for (let i = 0; i < 16; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export function bytesToUuid(bytes: Uint8Array): string {
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function parseAddress(data: Uint8Array, p: number, textDecoder: TextDecoder): { host: string; next: number } | null {
  if (p >= data.length) return null;
  const atype = data[p]!;
  if (atype === 1) {
    if (p + 4 >= data.length + 1 && p + 4 > data.length) return null;
    if (p + 5 > data.length) return null;
    return {
      host: `${data[p + 1]}.${data[p + 2]}.${data[p + 3]}.${data[p + 4]}`,
      next: p + 5,
    };
  }
  if (atype === 2) {
    if (p + 1 >= data.length) return null;
    const len = data[p + 1]!;
    if (p + 2 + len > data.length) return null;
    return {
      host: textDecoder.decode(data.slice(p + 2, p + 2 + len)),
      next: p + 2 + len,
    };
  }
  if (atype === 3) {
    if (p + 17 > data.length) return null;
    const b = data.slice(p + 1, p + 17);
    const parts: string[] = [];
    for (let i = 0; i < 8; i++) parts.push(((b[i * 2]! << 8) | b[i * 2 + 1]!).toString(16));
    return { host: parts.join(':'), next: p + 17 };
  }
  return null;
}

const TEXT_DECODER = new TextDecoder();

/* ─────────────── VLESS ─────────────── */

export function parseVlessHeader(data: Uint8Array): VlessHeader | null {
  // حداقل: ver(1) + uuid(16) + addonLen(1) + req(1+2) + cmd(1)+rsv(1)+atype(1) + addr min 1 + port(2)
  if (data.length < 26) return null;

  let p = 0;
  const version = data[p++]!;
  if (version !== 0) return null;

  const uuid = bytesToUuid(data.slice(p, p + 16));
  p += 16;

  const addonLen = data[p++]!;
  p += addonLen;

  if (p + 3 > data.length) return null;
  p++; // version req
  const reqLen = (data[p]! << 8) | data[p + 1]!;
  p += 2;
  if (p + reqLen > data.length) return null;
  const reqEnd = p + reqLen;

  const command = data[p++] === 2 ? ('udp' as const) : ('tcp' as const);
  p++; // reserved

  const addr = parseAddress(data, p, TEXT_DECODER);
  if (!addr) return null;
  p = addr.next;
  if (p + 2 > reqEnd) return null;
  const port = (data[p]! << 8) | data[p + 1]!;
  p += 2;

  return {
    uuid,
    target: { command, host: addr.host, port, hostType: data[2 + 16 + addonLen + 3] ?? 0 },
    responseHeader: new Uint8Array([0, 0]),
    bodyOffset: p,
  };
}

/* ─────────────── Trojan ─────────────── */

export function parseTrojanPassword(data: Uint8Array): string | null {
  if (data.length < 58) return null;
  const hex = TEXT_DECODER.decode(data.slice(0, 56));
  if (!/^[0-9a-fA-F]{56}$/.test(hex)) return null;
  if (data[56] !== 13 || data[57] !== 10) return null;
  return hex.toLowerCase();
}

export interface TrojanTarget extends Target {
  offset: number; // آفست پایان هدر (شروع داده)
}

export function parseTrojanRequest(data: Uint8Array, start = 0): TrojanTarget | null {
  let p = start;
  // رد شدن از \r\n های احتمالی قبل از درخواست
  while (p + 1 < data.length && data[p] === 13 && data[p + 1] === 10) p += 2;
  if (p + 2 > data.length) return null;

  const command = data[p++] === 2 ? ('udp' as const) : ('tcp' as const);
  const addr = parseAddress(data, p, TEXT_DECODER);
  if (!addr) return null;
  p = addr.next;
  if (p + 2 > data.length) return null;
  const port = (data[p]! << 8) | data[p + 1]!;
  p += 2;

  return { command, host: addr.host, port, hostType: 0, offset: p };
}

/** ترکیب هدر Trojan: پسورد + CRLF + CRLF + درخواست — و آفست بدنه */
export function parseTrojanHeader(data: Uint8Array): TrojanHeader | null {
  const password = parseTrojanPassword(data);
  if (!password) return null;

  // بررسی اینکه بعد از پسورد+\r\n، درخواست هم هست یا نه
  let p = 58;
  while (p + 1 < data.length && data[p] === 13 && data[p + 1] === 10) p += 2;
  if (p >= data.length) return { password, target: null as unknown as TrojanTarget, bodyOffset: -1 };

  const target = parseTrojanRequest(data, 56);
  if (!target) return { password, target: null as unknown as TrojanTarget, bodyOffset: -1 };

  return { password, target, bodyOffset: data.length };
}

/* ─────────────── ساخت هدر برای تست ─────────────── */

export function buildVlessHeader(uuid: string, host: string, port: number, command: 'tcp' | 'udp' = 'tcp'): Uint8Array {
  const uuidBytes = uuidToBytes(uuid)!;
  const hostBytes = new TextEncoder().encode(host);

  const body = new Uint8Array(1 + 1 + 1 + 1 + hostBytes.length + 2);
  let p = 0;
  body[p++] = command === 'udp' ? 2 : 1;
  body[p++] = 0; // reserved
  body[p++] = 2; // atype: domain
  body[p++] = hostBytes.length;
  body.set(hostBytes, p);
  p += hostBytes.length;
  body[p++] = (port >> 8) & 0xff;
  body[p++] = port & 0xff;

  const header = new Uint8Array(1 + 16 + 1 + 3 + body.length);
  p = 0;
  header[p++] = 0; // version
  header.set(uuidBytes, p);
  p += 16;
  header[p++] = 0; // addonLen
  header[p++] = 0; // req version
  header[p++] = (body.length >> 8) & 0xff;
  header[p++] = body.length & 0xff;
  header.set(body, p);

  return header;
}

export function buildTrojanHeader(password: string, host: string, port: number, command: 'tcp' | 'udp' = 'tcp'): Uint8Array {
  const hostBytes = new TextEncoder().encode(host);
  const out = new Uint8Array(56 + 2 + 2 + 1 + 1 + 1 + hostBytes.length + 2);
  let p = 0;
  const pw = new TextEncoder().encode(password);
  out.set(pw, p);
  p += 56;
  out[p++] = 13;
  out[p++] = 10;
  out[p++] = 13;
  out[p++] = 10;
  out[p++] = command === 'udp' ? 2 : 1;
  out[p++] = 2; // atype domain
  out[p++] = hostBytes.length;
  out.set(hostBytes, p);
  p += hostBytes.length;
  out[p++] = (port >> 8) & 0xff;
  out[p++] = port & 0xff;
  return out;
}

export function randomHexPassword(len = 28): string {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
