/**
 * تنظیمات امنیتی پنل
 * - secure_path: مسیر مخفی پنل (تولید تصادفی در اولین اجرا)
 * - jwt_secret:  کلید امضای سشن‌ها (تولید تصادفی در اولین اجرا)
 * - password_hash: هش PBKDF2 پسورد ادمین (بعد از نصب)
 * - claim_token: توکن ادعای نصب (اختیاری — ایده‌ی Nova)
 */
import type { Env } from '../types/global';
import { getSettings, setSettings, setSetting } from './db';
import { hashPassword } from '../auth/password';

export interface PanelSettings {
  securePath: string;
  passwordHash: string;
  jwtSecret: string;
  claimToken: string;
  installed: boolean;
}

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

export function randomString(len: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  let out = '';
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length]!;
  return out;
}

/** بارگذاری تنظیمات + تولید خودکار مقدارهای غایب (idempotent) */
export async function getPanelSettings(env: Env): Promise<PanelSettings> {
  const rows = await getSettings(env, ['secure_path', 'password_hash', 'jwt_secret', 'claim_token']);

  const updates: Record<string, string> = {};
  let securePath = rows.secure_path;
  if (!securePath) {
    securePath = randomString(14);
    updates.secure_path = securePath;
  }
  let jwtSecret = rows.jwt_secret;
  if (!jwtSecret) {
    jwtSecret = randomString(48);
    updates.jwt_secret = jwtSecret;
  }
  if (Object.keys(updates).length > 0) await setSettings(env, updates);

  return {
    securePath,
    passwordHash: rows.password_hash ?? '',
    jwtSecret,
    claimToken: rows.claim_token ?? '',
    installed: Boolean(rows.password_hash),
  };
}

export async function setAdminPassword(env: Env, password: string): Promise<void> {
  const hash = await hashPassword(password);
  await setSetting(env, 'password_hash', hash);
  await setSetting(env, 'installed_at', String(Date.now()));
}

export async function setClaimToken(env: Env, token: string): Promise<void> {
  await setSetting(env, 'claim_token', token);
}

/** بازسازی مسیر مخفی — بعد از این، URL پنل عوض می‌شود */
export async function regenerateSecurePath(env: Env): Promise<string> {
  const sp = randomString(14);
  await setSetting(env, 'secure_path', sp);
  return sp;
}
