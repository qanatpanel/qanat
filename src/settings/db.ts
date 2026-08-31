/**
 * لایه‌ی ذخیره‌سازی D1
 * - اعمال خودکار اسکیما (idempotent)
 * - دسترسی key-value به تنظیمات
 * - لاگین‌ترکینگ برای محافظ بروت‌فورس
 *
 * ⚠️ نکته: هر دستور SQL باید در یک خط باشد — miniflare (dev محلی)
 *    از SQL چندخطی در exec پشتیبانی نمی‌کند. (در Cloudflare واقعی ایرادی ندارد)
 */
import type { Env } from '../types/global';

const SCHEMA = [
  "CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL DEFAULT '')",
  'CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE, uuid TEXT NOT NULL UNIQUE, trojan_password TEXT UNIQUE, quota_gb INTEGER NOT NULL DEFAULT 0, used_gb REAL NOT NULL DEFAULT 0, expiry INTEGER NOT NULL DEFAULT 0, traffic_reset_days INTEGER NOT NULL DEFAULT 0, is_active INTEGER NOT NULL DEFAULT 1, note TEXT NOT NULL DEFAULT \'\', created_at INTEGER NOT NULL)',
  'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)',
  'CREATE INDEX IF NOT EXISTS idx_users_uuid ON users(uuid)',
  'CREATE TABLE IF NOT EXISTS login_attempts (ip TEXT PRIMARY KEY, failed INTEGER NOT NULL DEFAULT 0, locked_until INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL)',
  'CREATE TABLE IF NOT EXISTS usage_logs (user_id INTEGER NOT NULL, day TEXT NOT NULL, bytes INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (user_id, day))',
  'CREATE INDEX IF NOT EXISTS idx_usage_logs_day ON usage_logs(day)',
  'CREATE TABLE IF NOT EXISTS kv_cache (k TEXT PRIMARY KEY, v TEXT NOT NULL, ts INTEGER NOT NULL)',
].join(';\n');

let schemaReady = false;

/** اعمال اسکیما — یک‌بار در طول حیات ایزوله اجرا می‌شود */
export async function ensureSchema(env: Env): Promise<void> {
  if (schemaReady) return;
  await env.DB.exec(SCHEMA);
  schemaReady = true;
}

/* ─────────────── تنظیمات (key-value) ─────────────── */

export async function getSetting(env: Env, key: string): Promise<string | null> {
  const row = await env.DB.prepare('SELECT value FROM settings WHERE key = ?')
    .bind(key)
    .first<{ value: string }>();
  return row?.value ?? null;
}

export async function getSettings(env: Env, keys: string[]): Promise<Record<string, string>> {
  if (keys.length === 0) return {};
  const placeholders = keys.map(() => '?').join(',');
  const rows = await env.DB.prepare(`SELECT key, value FROM settings WHERE key IN (${placeholders})`)
    .bind(...keys)
    .all<{ key: string; value: string }>();
  const out: Record<string, string> = {};
  for (const row of rows.results) out[row.key] = row.value;
  return out;
}

export async function setSetting(env: Env, key: string, value: string): Promise<void> {
  await env.DB.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
  )
    .bind(key, value)
    .run();
}

export async function setSettings(env: Env, entries: Record<string, string>): Promise<void> {
  const values = Object.entries(entries);
  if (values.length === 0) return;
  const stmt = env.DB.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
  );
  await env.DB.batch(values.map(([k, v]) => stmt.bind(k, v)));
}

/* ─────────────── محافظ بروت‌فورس ─────────────── */

export interface LoginGuardInfo {
  failed: number;
  lockedUntil: number;
}

/** رکورد تلاش ناموفق؛ اگر از حد بگذرد قفل می‌کند */
export async function recordFailedLogin(env: Env, ip: string, maxAttempts: number, lockMs: number): Promise<LoginGuardInfo> {
  const now = Date.now();
  const row = await env.DB.prepare('SELECT failed, locked_until FROM login_attempts WHERE ip = ?')
    .bind(ip)
    .first<{ failed: number; locked_until: number }>();

  const failed = (row?.failed ?? 0) + 1;
  const lockedUntil = failed >= maxAttempts ? now + lockMs : (row?.locked_until ?? 0);

  await env.DB.prepare(
    `INSERT INTO login_attempts (ip, failed, locked_until, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(ip) DO UPDATE SET failed = excluded.failed, locked_until = excluded.locked_until, updated_at = excluded.updated_at`,
  )
    .bind(ip, failed, lockedUntil, now)
    .run();

  return { failed, lockedUntil };
}

/** تلاش موفق — پاک‌سازی شمارنده */
export async function clearFailedLogins(env: Env, ip: string): Promise<void> {
  await env.DB.prepare('DELETE FROM login_attempts WHERE ip = ?').bind(ip).run();
}

/** آیا IP الان قفل است؟ */
export async function isIpLocked(env: Env, ip: string): Promise<{ locked: boolean; retryAfterMs: number }> {
  const row = await env.DB.prepare('SELECT locked_until FROM login_attempts WHERE ip = ?')
    .bind(ip)
    .first<{ locked_until: number }>();
  if (!row || row.locked_until === 0) return { locked: false, retryAfterMs: 0 };
  const remaining = row.locked_until - Date.now();
  if (remaining <= 0) {
    await env.DB.prepare('DELETE FROM login_attempts WHERE ip = ?').bind(ip).run();
    return { locked: false, retryAfterMs: 0 };
  }
  return { locked: true, retryAfterMs: remaining };
}

/* ─────────────── کش key-value با TTL ─────────────── */

export async function cacheGet(env: Env, key: string): Promise<string | null> {
  const row = await env.DB.prepare('SELECT v FROM kv_cache WHERE k = ?').bind(key).first<{ v: string }>();
  return row?.v ?? null;
}

export async function cacheSet(env: Env, key: string, value: string): Promise<void> {
  await env.DB
    .prepare('INSERT INTO kv_cache (k, v, ts) VALUES (?, ?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v, ts = excluded.ts')
    .bind(key, value, Date.now())
    .run();
}
