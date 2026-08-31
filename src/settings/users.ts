/**
 * لایه‌ی کاربران (مدل چندکاربره)
 * الهام‌گرفته از مدل ZEUS/Nova: کوتای حجم، انقضا، بازنشانی خودکار
 */
import type { Env } from '../types/global';

export interface User {
  id: number;
  username: string;
  uuid: string;
  trojanPassword: string | null;
  quotaGb: number;
  usedGb: number;
  expiry: number; // epoch ms — 0 یعنی بدون انقضا
  trafficResetDays: number;
  isActive: boolean;
  note: string;
  createdAt: number;
}

interface UserRow {
  id: number;
  username: string;
  uuid: string;
  trojan_password: string | null;
  quota_gb: number;
  used_gb: number;
  expiry: number;
  traffic_reset_days: number;
  is_active: number;
  note: string;
  created_at: number;
}

function mapRow(row: UserRow): User {
  return {
    id: row.id,
    username: row.username,
    uuid: row.uuid,
    trojanPassword: row.trojan_password,
    quotaGb: row.quota_gb,
    usedGb: row.used_gb,
    expiry: row.expiry,
    trafficResetDays: row.traffic_reset_days,
    isActive: row.is_active === 1,
    note: row.note,
    createdAt: row.created_at,
  };
}

export interface CreateUserInput {
  username: string;
  uuid: string;
  trojanPassword?: string;
  quotaGb?: number;
  expiry?: number;
  note?: string;
}

export async function createUser(env: Env, input: CreateUserInput): Promise<User> {
  const createdAt = Date.now();
  const result = await env.DB.prepare(
    `INSERT INTO users (username, uuid, trojan_password, quota_gb, used_gb, expiry, is_active, note, created_at)
     VALUES (?, ?, ?, ?, 0, ?, 1, ?, ?)`,
  )
    .bind(
      input.username,
      input.uuid,
      input.trojanPassword ?? null,
      input.quotaGb ?? 0,
      input.expiry ?? 0,
      input.note ?? '',
      createdAt,
    )
    .run();
  const id = Number(result.meta.last_row_id);
  return {
    id,
    username: input.username,
    uuid: input.uuid,
    trojanPassword: input.trojanPassword ?? null,
    quotaGb: input.quotaGb ?? 0,
    usedGb: 0,
    expiry: input.expiry ?? 0,
    trafficResetDays: 0,
    isActive: true,
    note: input.note ?? '',
    createdAt,
  };
}

export async function getUserByUsername(env: Env, username: string): Promise<User | null> {
  const row = await env.DB.prepare('SELECT * FROM users WHERE username = ?')
    .bind(username)
    .first<UserRow>();
  return row ? mapRow(row) : null;
}

export async function getUserByUuid(env: Env, uuid: string): Promise<User | null> {
  const row = await env.DB.prepare('SELECT * FROM users WHERE uuid = ?').bind(uuid).first<UserRow>();
  return row ? mapRow(row) : null;
}

/** جستجوی کاربر با پسورد تروجان (هگز ۵۶) */
export async function getUserByTrojanPassword(env: Env, password: string): Promise<User | null> {
  const row = await env.DB.prepare('SELECT * FROM users WHERE trojan_password = ?').bind(password).first<UserRow>();
  return row ? mapRow(row) : null;
}

export async function listUsers(env: Env): Promise<User[]> {
  const rows = await env.DB.prepare('SELECT * FROM users ORDER BY id DESC').all<UserRow>();
  return rows.results.map(mapRow);
}

export async function deleteUser(env: Env, id: number): Promise<void> {
  await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
}

export async function updateUserQuota(env: Env, id: number, quotaGb: number): Promise<void> {
  await env.DB.prepare('UPDATE users SET quota_gb = ? WHERE id = ?').bind(quotaGb, id).run();
}

export async function setUserActive(env: Env, id: number, active: boolean): Promise<void> {
  await env.DB.prepare('UPDATE users SET is_active = ? WHERE id = ?').bind(active ? 1 : 0, id).run();
}

export async function addUsage(env: Env, userId: number, bytes: number): Promise<void> {
  await env.DB.prepare('UPDATE users SET used_gb = used_gb + ? WHERE id = ?')
    .bind(bytes / (1024 ** 3), userId)
    .run();
}

/**
 * بازنشانی خودکار کوتاها — باید در مسیر ترافیک یا کرون صدا زده شود.
 * ایده‌ی ساده‌تر و درست‌تر: بازنشانی بر اساس آخرین بازنشانی (و نه created_at).
 * برای سادگی فعلاً بر اساس created_at؛ در قدم‌های بعدی last_reset_time اضافه می‌شود.
 */
export async function applyAutoResets(env: Env): Promise<number> {
  const now = Date.now();
  const result = await env.DB.prepare(
    `UPDATE users SET used_gb = 0, is_active = 1
     WHERE traffic_reset_days > 0 AND (created_at + traffic_reset_days * 86400000) <= ?`,
  )
    .bind(now)
    .run();
  return Number(result.meta.changes);
}
