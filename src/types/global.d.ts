/**
 * تایپ‌های سراسری Worker
 */
export interface Env {
  /** بایند D1 — دیتابیس اصلی پنل */
  DB: D1Database;
  /** محیط اجرا: development | production */
  ENVIRONMENT?: string;
  /** توکن ادعای نصب (اختیاری) — اگر ست شود، اولین پسورد فقط با ?claim=<token> قابل تنظیم است */
  CLAIM_TOKEN?: string;
  /** تنظیم سقف تلاش‌های ناموفق لاگین (پیش‌فرض: ۵) */
  LOGIN_MAX_ATTEMPTS?: string;
  /** تنظیم مدت قفل بروت‌فورس بر حسب میلی‌ثانیه (پیش‌فرض: ۶۰۰۰۰۰ = ۱۰ دقیقه) */
  LOGIN_LOCK_MS?: string;
}
