// تست runtime — فلوی ircf.space در اسکنر
const fs = require('fs');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync('src/assets/panel/index.html', 'utf-8');
const js = fs.readFileSync('src/assets/panel/script.js', 'utf-8');
const dom = new JSDOM(html, { url: 'http://localhost:8787/panel', runScripts: 'outside-only', pretendToBeVisual: true });
const w = dom.window;
let wsN = 0;
w.WebSocket = function (url) {
  this.url = url;
  const id = ++wsN;
  setTimeout(() => {
    if (id % 3 !== 0) this.onopen && this.onopen();
    else this.onerror && this.onerror();
  }, id % 3 === 0 ? 3 : 20);
  this.close = function () {};
};
w.performance = { now: () => Date.now() };
w.scrollTo = () => {};
w.fetch = (u) => {
  if (String(u).indexOf('clean-ips') !== -1) {
    return Promise.resolve({
      status: 200,
      json: async () => ({
        ok: true, source: 'ircf.space', cached: false, updatedAt: Date.now(),
        items: [
          { ip: '172.66.213.38', isp: 'همراه اول', sub: 'mci.ircf.space' },
          { ip: '104.16.4.103', isp: 'مخابرات', sub: 'mkh.ircf.space' },
          { ip: '203.32.121.53', isp: 'ایرانسل', sub: 'mtn.ircf.space' },
          { ip: '162.251.82.187', isp: 'رایتل', sub: 'rtl.ircf.space' },
        ],
      }),
    });
  }
  return Promise.resolve({ status: 401, json: async () => ({ ok: false }) });
};
try {
  w.eval(js);
  const doc = w.document;
  console.log('default source:', doc.getElementById('scan-source').value);
  doc.getElementById('scan-count').value = '50';
  doc.getElementById('scan-start').click();
  setTimeout(() => {
    console.log('counter:', doc.getElementById('scan-counter').textContent);
    const chip = doc.getElementById('scan-source-chip');
    console.log('chip:', JSON.stringify(chip.textContent), '| hidden:', chip.hidden);
    const rows = (doc.getElementById('scan-list').innerHTML.match(/<div class="scan-row/g) || []).length;
    console.log('rows:', rows);
    const cached = JSON.parse(w.localStorage.getItem('panel_ircf_cache') || 'null');
    console.log('browser cache ips:', cached ? cached.ips.length : 'none');
    process.exit(0);
  }, 9000);
} catch (e) {
  console.error('ERROR:', e.message);
  process.exit(1);
}
