/**
 * هش‌کردن پسورد با PBKDF2 (Web Crypto)
 * فرمت ذخیره‌سازی: pbkdf2$<iterations>$<salt_b64>$<hash_b64>
 *
 * چرا PBKDF2؟ — درس‌گرفته از ZEUS که SHA-256 خام می‌زد (شکننده در برابر
 * rainbow table). PBKDF2 با ۱۰۰هزار تکرار، brute-force را عملاً بی‌صرفه می‌کند.
 */
const ITERATIONS = 100_000;
const KEY_LENGTH_BYTES = 32;
const SALT_BYTES = 16;

function toB64(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromB64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    keyMaterial,
    KEY_LENGTH_BYTES * 8,
  );
  return new Uint8Array(bits);
}

/** مقایسه‌ی زمان‌ثابت — جلوگیری از timing attack */
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const derived = await derive(password, salt, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${toB64(salt)}$${toB64(derived)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations) || iterations <= 0) return false;
  try {
    const salt = fromB64(parts[2]!);
    const expected = fromB64(parts[3]!);
    const actual = await derive(password, salt, iterations);
    return constantTimeEqual(actual, expected);
  } catch {
    return false;
  }
}
