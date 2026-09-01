import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto('https://qanat-admin.amirhesamfathalian7.workers.dev/panel', { waitUntil: 'load' });
await page.waitForTimeout(1000);
await page.fill('#passInput', process.env.ADMIN_PASS);
const val = await page.inputValue('#passInput');
console.log('input value length:', val.length, 'chars:', JSON.stringify(val.slice(0, 3)), '...', JSON.stringify(val.slice(-2)));
const r = await page.evaluate(async (p) => {
  const res = await fetch('/panel/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: p }) });
  return { status: res.status, body: await res.text(), cookie: document.cookie };
}, val);
console.log('result:', JSON.stringify(r));
await browser.close();
