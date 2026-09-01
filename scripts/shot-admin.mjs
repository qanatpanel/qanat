import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message.slice(0, 120)));

// پنل مدیریت — صفحهٔ لاگین
await page.goto('https://qanat-admin.amirhesamfathalian7.workers.dev/panel', { waitUntil: 'load' });
await page.waitForTimeout(800);
await page.screenshot({ path: '/home/user/bot-shots/01-admin-login.png' });

// لاگین
await page.fill('#passInput', process.env.ADMIN_PASS);
await page.click('#loginBtn');
await page.waitForTimeout(1500);
await page.screenshot({ path: '/home/user/bot-shots/02-admin-dashboard.png' });

// تیکت‌ها
await page.click('button[data-page="tickets"]');
await page.waitForTimeout(800);
await page.screenshot({ path: '/home/user/bot-shots/03-admin-tickets.png' });

// کاربران
await page.click('button[data-page="users"]');
await page.waitForTimeout(800);
await page.screenshot({ path: '/home/user/bot-shots/04-admin-users.png' });

// پنل‌ها
await page.click('button[data-page="panels"]');
await page.waitForTimeout(2500);
await page.screenshot({ path: '/home/user/bot-shots/05-admin-panels.png' });

// مینیاپ پشتیبانی
const page2 = await browser.newPage({ viewport: { width: 420, height: 780 } });
await page2.goto('https://qanat-bot.amirhesamfathalian7.workers.dev/support', { waitUntil: 'load' });
await page2.waitForTimeout(1200);
await page2.screenshot({ path: '/home/user/bot-shots/06-support-home.png' });
await page2.click('button[data-tab="ticket"]');
await page2.waitForTimeout(600);
await page2.screenshot({ path: '/home/user/bot-shots/07-support-ticket.png' });
await page2.click('button[data-tab="guide"]');
await page2.waitForTimeout(600);
await page2.screenshot({ path: '/home/user/bot-shots/08-support-guide.png' });
await page2.click('button[data-tab="faq"]');
await page2.waitForTimeout(600);
await page2.screenshot({ path: '/home/user/bot-shots/09-support-faq.png' });

await browser.close();
console.log('shots done');
