/** تست بصری تم v3 — کانواس، موج‌ها، فلش تم، سلامت اسکنر + اسکرین‌شات */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

mkdirSync('/home/user/theme-shots', { recursive: true });
const BASE = 'https://qanat-e2e-up.amirhesamfathalian7.workers.dev';
const results = [];
const ok = (n, p, x = '') => results.push(`${p ? '✅' : '❌'} ${n}${x ? ' — ' + x : ''}`);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push('JS: ' + e.message.slice(0, 150)));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('ERR_CERT') && !m.text().includes('WebSocket')) errors.push('console: ' + m.text().slice(0, 150)); });

// ۱) صفحهٔ ورود — کانواس
await page.goto(BASE + '/Qanat', { waitUntil: 'networkidle' });
await page.waitForSelector('#login-form', { timeout: 15000 });
ok('لاگین: کانواس بک‌گراند', (await page.locator('#bg-canvas').count()) === 1 || (await page.locator('.bg-canvas').count()) === 1);
ok('لاگین: وینیت', (await page.locator('.bg-vignette').count()) === 1);
await page.screenshot({ path: '/home/user/theme-shots/01-login.png' });

// ۲) تغییر تم در لاگین
await page.click('#theme-btn');
await page.waitForTimeout(300);
ok('لاگین: فلش تم', await page.evaluate(() => document.documentElement.classList.contains('theme-flash')));
await page.waitForTimeout(700);
await page.screenshot({ path: '/home/user/theme-shots/02-login-light.png' });
await page.click('#theme-btn'); // برگرد به دارک
await page.waitForTimeout(800);

// ۳) لاگین → پنل
await page.fill('#password', 'TestPass1234!');
await Promise.all([page.waitForURL((u) => u.pathname === '/Qanat', { timeout: 20000 }), page.click('#submit')]);
await page.waitForSelector('.sidebar', { timeout: 20000 });
ok('پنل: کانواس', (await page.locator('#bg-canvas').count()) === 1 || (await page.locator('.bg-canvas').count()) === 1);
ok('پنل: موج‌های هیرو', (await page.locator('.hero-waves').count()) === 1);
ok('پنل: تیتر گرادیانی', await page.evaluate(() => {
  const el = document.querySelector('.hero-title');
  return el && getComputedStyle(el).backgroundImage.includes('linear-gradient');
}));
ok('پنل: پیل فعال ناوبری', await page.evaluate(() => {
  const el = document.querySelector('.nav-item.active');
  return el && getComputedStyle(el).backgroundImage.includes('linear-gradient');
}));
await page.waitForTimeout(2500); // بگذار ذرات برقصند
await page.screenshot({ path: '/home/user/theme-shots/03-dashboard.png' });

// ۴) تغییر تم در پنل
await page.click('#theme-btn');
await page.waitForTimeout(300);
ok('پنل: فلش تم', await page.evaluate(() => document.documentElement.classList.contains('theme-flash')));
await page.waitForTimeout(700);
await page.screenshot({ path: '/home/user/theme-shots/04-dashboard-light.png' });
// برگرد دارک
await page.click('#theme-btn');
await page.waitForTimeout(700);

// ۵) اسکنر هنوز سالم است؟
await page.click('[data-view="scanner"]');
await page.waitForSelector('.scan-big-btn', { timeout: 10000 });
await page.screenshot({ path: '/home/user/theme-shots/05-scanner.png' });
await page.click('#scan-start');
try {
  await page.waitForSelector('#scan-start:not([hidden])', { timeout: 90000 });
  ok('اسکنر سالم', (await page.locator('.srow').count()) > 0);
} catch {
  ok('اسکنر سالم', false, 'timeout');
}
await page.screenshot({ path: '/home/user/theme-shots/06-scanner-results.png' });

// ۶) حرکت موس — هاله باید رندر شود (بررسی غیرمستقیم: بدون خطا)
await page.mouse.move(700, 400);
await page.waitForTimeout(400);
ok('بدون خطای JS', errors.length === 0, errors.slice(0, 3).join(' | '));

console.log(results.join('\n'));
await browser.close();
