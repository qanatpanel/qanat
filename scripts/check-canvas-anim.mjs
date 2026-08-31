import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('https://qanat-e2e-up.amirhesamfathalian7.workers.dev/Qanat', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
const check = await page.evaluate(() => {
  const c = document.getElementById('bg-canvas');
  if (!c) return { found: false };
  const ctx = c.getContext('2d');
  const d1 = ctx.getImageData(0, 0, c.width, c.height).data;
  // نمونهٔ پیکسل‌های غیرشفاف
  let n1 = 0;
  for (let i = 3; i < d1.length; i += 997) if (d1[i] > 0) n1++;
  return new Promise((res) => {
    setTimeout(() => {
      const d2 = ctx.getImageData(0, 0, c.width, c.height).data;
      let n2 = 0, diff = 0;
      for (let i = 3; i < d2.length; i += 997) {
        if (d2[i] > 0) n2++;
        if (d2[i] !== d1[i]) diff++;
      }
      res({ found: true, size: c.width + 'x' + c.height, nonEmpty1: n1, nonEmpty2: n2, changed: diff });
    }, 500);
  });
});
console.log(JSON.stringify(check));
await browser.close();
