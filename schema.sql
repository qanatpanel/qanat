-- ============================================================
--  Panel Database Schema (D1 / SQLite)
--  اجرای دستی:   npx wrangler d1 execute panel-db --local --file=schema.sql
--  همچنین به‌صورت خودکار و idempotent توسط src/settings/db.ts
--  در اولین استفاده اعمال می‌شود (CREATE IF NOT EXISTS).
-- ============================================================

-- تنظیمات عمومی پنل (key-value)
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

-- کاربران (چندکاربره — الگوی ZEUS/Nova)
-- uuid و trojan_password شناسه‌های پروتکل هر کاربر هستند
CREATE TABLE IF NOT EXISTS users (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  username            TEXT    NOT NULL UNIQUE,
  uuid                TEXT    NOT NULL UNIQUE,
  trojan_password     TEXT    UNIQUE,
  quota_gb            INTEGER NOT NULL DEFAULT 0,   -- 0 = نامحدود
  used_gb             REAL    NOT NULL DEFAULT 0,
  expiry              INTEGER NOT NULL DEFAULT 0,   -- 0 = بدون انقضا (epoch ms)
  traffic_reset_days  INTEGER NOT NULL DEFAULT 0,   -- 0 = بدون بازنشانی خودکار
  is_active           INTEGER NOT NULL DEFAULT 1,
  note                TEXT    NOT NULL DEFAULT '',
  created_at          INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_uuid     ON users(uuid);

-- مصرف روزانه (برای نمودار داشبورد)
CREATE TABLE IF NOT EXISTS usage_logs (
  user_id INTEGER NOT NULL,
  day     TEXT    NOT NULL,          -- YYYY-MM-DD (UTC)
  bytes   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);
CREATE INDEX IF NOT EXISTS idx_usage_logs_day ON usage_logs(day);

-- محافظ بروت‌فورس لاگین (ایده‌ی ZEUS — ولی به‌جای حافظه، در دیتابیس
-- تا بین ایزوله‌های Worker هم پابرجا بماند)
CREATE TABLE IF NOT EXISTS login_attempts (
  ip           TEXT    PRIMARY KEY,
  failed       INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER NOT NULL DEFAULT 0,   -- epoch ms؛ 0 = قفل نیست
  updated_at   INTEGER NOT NULL
);
