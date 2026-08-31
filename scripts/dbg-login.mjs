import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('https://qanat-e2e-up.amirhesamfathalian7.workers.dev/Qanat', { waitUntil: 'networkidle' });
console.log('URL0:', page.url());
await page.fill('#password', 'TestPass1234!');
await Promise.all([
  page.waitForNavigation({ timeout: 20000 }).catch(e => console.log('NAV-ERR:', e.message.slice(0, 120))),
  page.click('#submit'),
]);
await page.waitForTimeout(3000);
console.log('URL1:', page.url());
console.log('sidebar:', await page.locator('.sidebar').count());
await browser.close();
