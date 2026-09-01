import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto('https://qanat-admin.amirhesamfathalian7.workers.dev/panel', { waitUntil: 'load' });
await page.waitForTimeout(900);
await page.fill('#passInput', process.env.ADMIN_PASS);
await page.click('#loginBtn');
await page.waitForTimeout(1400);
await page.click('button[data-page="tickets"]');
await page.waitForTimeout(900);
await page.screenshot({ path: '/home/user/bot-shots/03-admin-tickets.png' });
// رویدادها
await page.click('button[data-page="events"]');
await page.waitForTimeout(700);
await page.screenshot({ path: '/home/user/bot-shots/10-admin-events.png' });
// داشبورد با داده
await page.click('button[data-page="dash"]');
await page.waitForTimeout(900);
await page.screenshot({ path: '/home/user/bot-shots/02-admin-dashboard.png' });
await browser.close();
console.log('done');
