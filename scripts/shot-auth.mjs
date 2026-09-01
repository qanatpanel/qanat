import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto('https://qanat-admin.amirhesamfathalian7.workers.dev/panel', { waitUntil: 'load' });
await page.waitForTimeout(1400);
await page.screenshot({ path: '/home/user/bot-shots/11-admin-login-new.png' });
// رمز غلط → shake + خطا
await page.fill('#passInput', 'wrongpass');
await page.click('#loginBtn');
await page.waitForTimeout(900);
await page.screenshot({ path: '/home/user/bot-shots/12-admin-login-error.png' });
// نمایش رمز
await page.click('#togglePass');
await page.waitForTimeout(300);
await page.screenshot({ path: '/home/user/bot-shots/13-admin-login-visible.png' });
await browser.close();
console.log('done');
