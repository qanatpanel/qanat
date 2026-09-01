/**
 * ارسال نوتیف «نسخهٔ جدید QANAT منتشر شد» به همهٔ کاربران بات
 * استفاده:
 *   node tools/notify-update.mjs v1.5.0 "رفع مشکل اتصال + اسکنر جدید"
 *
 * ADMIN_PASS از این منابع خوانده می‌شود (به ترتیب):
 *   1) env ADMIN_PASS
 *   2) فایل بکاپ سکرت‌ها: پوشهٔ qanat-full-backup-* + 02-secrets.env (خط ADMIN_PASS=…)
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const version = process.argv[2];
const note = process.argv.slice(3).join(' ');

if (!version) {
  console.log('نشان دادن: node tools/notify-update.mjs <version> [note]');
  process.exit(1);
}

function adminPassFromBackup() {
  try {
    const base = '/home/user';
    const dirs = readdirSync(base).filter((d) => d.startsWith('qanat-full-backup-'));
    for (const d of dirs) {
      const p = join(base, d, '02-secrets.env');
      if (!existsSync(p)) continue;
      const txt = readFileSync(p, 'utf8');
      const m = txt.match(/^ADMIN_PASS\s*=\s*(\S+)/m);
      if (m) return m[1];
    }
  } catch {
    /* ignore */
  }
  return '';
}

let adminPass = process.env.ADMIN_PASS || adminPassFromBackup();
if (!adminPass) {
  console.log('ADMIN_PASS یافت نشد — آن را در env بدهید (یا فایل بکاپ سکرت‌ها را چک کنید)');
  process.exit(1);
}

console.log(`📢 ارسال نوتیف نسخهٔ ${version} به همهٔ کاربران...`);

// چند هاست را امتحان کن: دامنهٔ سفارشی (مقاومتر) → workers.dev
const hosts = [
  'https://qanat-bot.amirhesamfathalian7.workers.dev',
  'https://qanat-bot.workers.dev',
];
let lastErr = null;
for (const host of hosts) {
  try {
    const res = await fetch(host + '/broadcast-update', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-admin-key': adminPass },
      body: JSON.stringify({ version, note }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.ok) {
      console.log(`✅ نوتیف ارسال شد: ${data.sent} ارسال موفق / ${data.failed} ناموفق (از ${data.total})`);
      process.exit(0);
    }
    lastErr = `HTTP ${res.status}: ${JSON.stringify(data).slice(0, 200)}`;
  } catch (e) {
    lastErr = e.message;
  }
}
console.log(`❌ خطا (${lastErr})`);
process.exit(1);
