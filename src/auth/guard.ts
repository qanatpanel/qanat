/**
 * محافظ بروت‌فورس — الگوی ZEUS ولی با ذخیره‌سازی در D1 (نه حافظه)
 * تا بین ایزوله‌های Worker هم پابرجا بماند.
 *
 * پیش‌فرض: ۵ تلاش ناموفق = قفل ۱۰ دقیقه
 * قابل تنظیم با env: LOGIN_MAX_ATTEMPTS و LOGIN_LOCK_MS
 */
import type { Env } from '../types/global';
import { isIpLocked, recordFailedLogin, clearFailedLogins } from '../settings/db';

export interface GuardResult {
  attemptsLeft: number;
  locked: boolean;
  retryAfterSec: number;
}

const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_LOCK_MS = 10 * 60 * 1000;

export function limits(env: Env): { maxAttempts: number; lockMs: number } {
  const max = Number(env.LOGIN_MAX_ATTEMPTS ?? '');
  const lock = Number(env.LOGIN_LOCK_MS ?? '');
  return {
    maxAttempts: Number.isFinite(max) && max > 0 ? max : DEFAULT_MAX_ATTEMPTS,
    lockMs: Number.isFinite(lock) && lock > 0 ? lock : DEFAULT_LOCK_MS,
  };
}

/** آیا IP الان قفل است؟ */
export async function guardCheck(env: Env, ip: string): Promise<{ locked: boolean; retryAfterSec: number }> {
  const r = await isIpLocked(env, ip);
  return { locked: r.locked, retryAfterSec: Math.ceil(r.retryAfterMs / 1000) };
}

/** ثبت تلاش ناموفق → قفل خودکار بعد از سقف */
export async function guardFailure(env: Env, ip: string): Promise<GuardResult> {
  const { maxAttempts, lockMs } = limits(env);
  const g = await recordFailedLogin(env, ip, maxAttempts, lockMs);
  const locked = g.lockedUntil > Date.now();
  return {
    attemptsLeft: Math.max(0, maxAttempts - g.failed),
    locked,
    retryAfterSec: locked ? Math.ceil((g.lockedUntil - Date.now()) / 1000) : 0,
  };
}

/** تلاش موفق → پاک‌سازی شمارنده */
export async function guardSuccess(env: Env, ip: string): Promise<void> {
  await clearFailedLogins(env, ip);
}

export function clientIp(request: Request): string {
  return (
    request.headers.get('CF-Connecting-IP') ??
    request.headers.get('x-real-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  );
}
