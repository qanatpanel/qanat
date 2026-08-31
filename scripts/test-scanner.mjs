/** تست کامل اسکنر جدید با Playwright — چرخه: لاگین → تب اسکنر → اسکن هوشمند → نتایج → ست IP → سلامت */
import { chromium } from 'playwright';

const BASE = 'https://qanat-e2e-up.amirhesamfathalian7.workers.dev';
const results = [];
const ok = (name, pass, extra = '') => results.push(`${pass ? '✅' : '❌'} ${name}${extra ? ' — ' + extra : ''}`);

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('JS: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

// ۱) لاگین از /Qanat
await page.goto(BASE + '/Qanat', { waitUntil: 'networkidle' });
await page.waitForSelector('#login-form', { timeout: 15000 });
await page.fill('#password', 'TestPass1234!');
await Promise.all([
  page.waitForURL((u) => u.pathname === '/Qanat', { timeout: 20000 }),
  page.click('#submit'),
]);
await page.waitForSelector('.sidebar', { timeout: 20000 });
ok('لاگین + پنل', true);

// ۲) رفتن به تب اسکنر
await page.click('[data-view="scanner"]');
await page.waitForSelector('#view-scanner .scan-big-btn', { timeout: 10000 });
ok('تب اسکنر باز شد', true);
ok('کارت وضعیت (دامنه)', await page.locator('#scan-status-title').textContent().then((t) => t.includes('دامنه')));

// ۳) دکمهٔ اسکن هوشمند
await page.click('#scan-start');
await page.waitForSelector('#scan-progress:not([hidden])', { timeout: 5000 });
ok('پیشرفت نمایش داده شد', true);
ok('دکمه توقف ظاهر شد', !(await page.locator('#scan-stop').isHidden()));

// ۴) منتظر پایان اسکن (حداکثر ۹۰ ثانیه)
try {
  await page.waitForSelector('#scan-start:not([hidden])', { timeout: 90000 });
  ok('اسکن تمام شد', true);
} catch {
  ok('اسکن تمام شد', false, 'timeout');
}

// ۵) نتایج
const rows = await page.locator('.srow').count();
ok('ردیف‌های نتیجه', rows > 0, `${rows} ردیف`);
if (rows > 0) {
  const first = await page.locator('.srow').first().textContent();
  ok('رتبه/امتیاز/دکمه‌ها', first.includes('ms'), first.slice(0, 80).replace(/\n/g, ' '));
  ok('دکمه ست 🎯', (await page.locator('.srow [data-act="set"]').count()) > 0);
  // ست بهترین
  await page.click('#scan-set-best');
  await page.waitForTimeout(1500);
  const badge = await page.locator('#scan-set-badge').isVisible().catch(() => false);
  ok('ست بهترین روی کانفیگ‌ها', badge);
  if (badge) {
    const badgeTxt = await page.locator('#scan-set-badge-text').textContent();
    ok('badge IP ست‌شده', /(\d{1,3}\.){3}\d{1,3}/.test(badgeTxt || ''), badgeTxt || '');
    // کارت وضعیت باید آپدیت شود
    await page.waitForTimeout(1200);
    const statusTitle = await page.locator('#scan-status-title').textContent();
    ok('کارت وضعیت آپدیت شد', statusTitle.includes('IP ست'));
  }
}

// ۶) سلامت
await page.click('#scan-health-btn');
await page.waitForTimeout(4000);
const pdots = await page.locator('#scan-status-ports .pdot').count();
ok('تست سلامت پورت‌ها', pdots === 6, `${pdots} پورت`);
const okDots = await page.locator('#scan-status-ports .pdot.ok').count();
ok('پورت‌های باز (از شبکهٔ تست)', okDots > 0, `${okDots}/6`);

// ۷) پاک کردن IP ست‌شده
await page.click('#scan-clear-ip');
await page.waitForTimeout(1200);
const statusTitle2 = await page.locator('#scan-status-title').textContent();
ok('پاک کردن IP', statusTitle2.includes('دامنه'));

// ۸) تب تست دستی
await page.click('[data-stab="manual"]');
await page.waitForSelector('#stab-manual.active', { timeout: 5000 });
ok('تب تست دستی', true);
await page.fill('#relay-ips', '8.8.8.8\n9.9.9.9');
await page.click('#relay-start');
await page.waitForTimeout(12000);
const relayRows = await page.locator('#relay-tbody tr').count();
ok('تست دستی نتایج داد', relayRows >= 2, `${relayRows} ردیف`);

// ۹) خطاهای JS
ok('بدون خطای JS', errors.length === 0, errors.slice(0, 3).join(' | '));

console.log(results.join('\n'));
await browser.close();
