import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
// لاگین پنل قنات با گیت‌هاب
await page.goto('https://qanat-e2e-up.amirhesamfathalian7.workers.dev/51egezz7vgej71/login', { waitUntil: 'load' });
await page.waitForTimeout(1400);
await page.screenshot({ path: '/home/user/bot-shots/14-panel-login-github.png' });
// داشبورد با گیت‌هاب در سایدبار
await page.fill('#password', 'TestPass1234!');
await page.click('#submit');
await page.waitForTimeout(1800);
await page.screenshot({ path: '/home/user/bot-shots/15-panel-dash-github.png' });
// مینیاپ با گیت‌هاب
const page2 = await browser.newPage({ viewport: { width: 420, height: 780 } });
await page2.goto('https://qanat-bot.amirhesamfathalian7.workers.dev/support', { waitUntil: 'load' });
await page2.waitForTimeout(1200);
await page2.screenshot({ path: '/home/user/bot-shots/16-support-github.png' });
// پنل ادمین — داشبورد بعد از ورود (هدر گیت‌هاب)
await page.goto('https://qanat-admin.amirhesamfathalian7.workers.dev/panel', { waitUntil: 'load' });
await page.waitForTimeout(1000);
await page.fill('#passInput', process.env.ADMIN_PASS);
await page.click('#loginBtn');
await page.waitForTimeout(1600);
await page.screenshot({ path: '/home/user/bot-shots/17-admin-dash-github.png' });
await browser.close();
console.log('done');
