/**
 * سشن بدون‌state با JWT (HS256) — الگوی BPB با کتابخانه‌ی jose
 * کوکی HttpOnly + SameSite=Lax — برای پنل، نه API عمومی
 */
import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE = 'panel_session';
const SESSION_TTL_SECONDS = 7 * 24 * 3600; // ۷ روز

export async function createSession(secret: string, sub: string): Promise<string> {
  return await new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(new TextEncoder().encode(secret));
}

export async function verifySession(secret: string, token: string): Promise<{ sub: string } | null> {
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ['HS256'],
    });
    if (typeof payload.sub !== 'string') return null;
    return { sub: payload.sub };
  } catch {
    return null;
  }
}

export function parseCookies(header: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) {
      try {
        out[key] = decodeURIComponent(value);
      } catch {
        out[key] = value;
      }
    }
  }
  return out;
}

export async function verifySessionCookie(
  request: Request,
  secret: string,
): Promise<{ sub: string } | null> {
  const cookies = parseCookies(request.headers.get('cookie') ?? '');
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;
  return verifySession(secret, token);
}

export function sessionCookie(token: string, requestUrl: string): string {
  const secure = requestUrl.startsWith('https://');
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}${secure ? '; Secure' : ''}`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
