/**
 * اکسپورت «پکیج خفن کانفیگ» از پنل قنات
 *
 * استفاده:
 *   node tools/export-configs.mjs <host> <adminPassword> [username]
 * مثال:
 *   node tools/export-configs.mjs qanat-nvsf.amirhesamfathalian7.workers.dev 'رمزپنل'
 *
 * خروجی در پوشه‌ی export-<host>/ :
 *   index.html       — صفحه‌ی زیبای خودکفا (کانفیگ‌ها، QR، Clash، sing-box، اشتراک، راهنما)
 *   configs.txt      — همه‌ی URI ها (برای کپی دستی)
 *   clash.yaml       — کانفیگ Clash/Mihomo با گروه خودکار
 *   singbox.json     — کانفیگ sing-box با urltest
 *   subscription.txt — اشتراک base64 (برای v2rayNG/Hiddify/…)
 */
import { writeFileSync, mkdirSync } from 'node:fs';

const [host, password, wantUser] = process.argv.slice(2);
if (!host || !password) {
  console.log('استفاده: node tools/export-configs.mjs <host> <adminPassword> [username]');
  process.exit(1);
}
const BASE = `https://${host}`;

async function get(path, cookie) {
  const res = await fetch(BASE + path, { headers: cookie ? { Cookie: cookie } : {} });
  return { status: res.status, text: await res.text() };
}
async function post(path, body, cookie) {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: BASE, ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json().catch(() => ({})) };
}

console.log(`🔌 اتصال به ${host} …`);
// ۱) کشف مسیر امن از صفحه‌ی /Qanat
let html = (await get('/Qanat')).text;
let sp = (html.match(/__LOGIN_POST__="([^"]+)"/) || [])[1]?.replace(/\/login$/, '');
if (!sp) sp = (html.match(/__SP__="([^"]+)"/) || [])[1];
if (!sp) {
  // fallback: اسکن landing
  const land = (await get('/')).text;
  const m = land.match(/href="\/([a-z0-9]{6,})\/panel"/);
  sp = m ? '/' + m[1] : null;
}
if (!sp) { console.log('❌ مسیر امن پیدا نشد'); process.exit(1); }
console.log(`   مسیر امن: ${sp}`);

// ۲) لاگین
const login = await post(`${sp}/login`, { password });
if (!login.json.ok) { console.log('❌ لاگین ناموفق:', JSON.stringify(login.json)); process.exit(1); }
const cookie = login.json.cookie; // در واقع Set-Cookie را باید بگیریم؛ زیر از هدر استفاده می‌کنیم
// لاگین واقعی با گرفتن Set-Cookie
const resLogin = await fetch(BASE + `${sp}/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Origin: BASE },
  body: JSON.stringify({ password }),
});
const setCookie = resLogin.headers.get('set-cookie') || '';
const session = setCookie.split(';')[0];
if (!session) { console.log('❌ کوکی سشن داده نشد'); process.exit(1); }
console.log('   سشن: ✓');

// ۳) کاربران
const usersRes = await get(`${sp}/panel/api/users`, session);
const users = JSON.parse(usersRes.text).users || [];
if (!users.length) { console.log('❌ کاربری نیست'); process.exit(1); }
const target = wantUser ? users.find((u) => u.username === wantUser) : users[0];
if (!target) { console.log(`❌ کاربر ${wantUser} پیدا نشد`); process.exit(1); }
console.log(`   کاربر: ${target.username} (${target.uuid.slice(0, 8)}…)`);

// ۴) پکیج کانفیگ
const pkgRes = await get(`${sp}/panel/api/export?uuid=${target.uuid}&server=${host}`, session);
const pkg = JSON.parse(pkgRes.text);
if (!pkg.ok) { console.log('❌ export:', JSON.stringify(pkg)); process.exit(1); }
console.log(`   پکیج: ${pkg.uris.length} کانفیگ + Clash + sing-box + QR ✓`);

// ۵) تشخیص پورت‌ها از شبکه‌ی فعلی
const ports = [443, ...(pkg.proxy.altPorts || [])];
const portStatus = [];
for (const p of ports) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 7000);
    const r = await fetch(`${BASE}:${p}/Qanat`, { signal: ctrl.signal, redirect: 'manual' });
    clearTimeout(t);
    portStatus.push({ port: p, ok: r.status < 500 && r.status !== 0 });
  } catch {
    portStatus.push({ port: p, ok: false });
  }
}
const okPorts = portStatus.filter((x) => x.ok).length;
console.log(`   پورت‌ها: ${okPorts}/${ports.length} باز از این شبکه → ${portStatus.map((x) => `${x.port}${x.ok ? '✓' : '✗'}`).join(' ')}`);

// ۶) نوشتن خروجی
const outDir = `export-${host}`;
mkdirSync(outDir, { recursive: true });
writeFileSync(`${outDir}/configs.txt`, pkg.uris.join('\n') + '\n');
writeFileSync(`${outDir}/clash.yaml`, pkg.clash + '\n');
writeFileSync(`${outDir}/singbox.json`, pkg.singbox + '\n');
writeFileSync(`${outDir}/subscription.txt`, pkg.base64 + '\n');

const usedGb = (pkg.user.usedGb || 0).toFixed(2);
const expiry = pkg.user.expiry
  ? new Date(pkg.user.expiry).toLocaleDateString('fa-IR')
  : 'نامحدود';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const portChips = portStatus
  .map((x) => `<span class="chip ${x.ok ? 'ok' : 'bad'}">${x.port} ${x.ok ? '✓' : '✗'}</span>`)
  .join(' ');

const uriCards = pkg.uris
  .map((u, i) => {
    const kind = u.startsWith('trojan') ? 'تروجان' : u.includes(':' + pkg.proxy.port + '?') ? 'vless اصلی' : 'vless پورت جایگزین';
    const tag = u.startsWith('trojan') ? 'tb' : 'vl';
    return `<div class="uri-row"><span class="tag ${tag}">${kind}</span><code class="uri">${esc(u)}</code><button class="cpy" data-copy="${esc(u.replace(/"/g, '&quot;'))}">کپی</button></div>`;
  })
  .join('');

const pageHtml = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>قنات — پکیج کانفیگ ${esc(target.username)}</title>
<style>
  :root{--bg1:#020a1a;--bg2:#041228;--card:rgba(13,42,84,.55);--line:rgba(94,180,255,.22);--txt:#e8f4ff;--dim:#8fb8dd;--acc:#38bdf8;--acc2:#22d3ee;--gold:#fbbf24;--red:#f87171;--green:#4ade80;}
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Vazirmatn,Tahoma,"Segoe UI",sans-serif;background:radial-gradient(1200px 600px at 80% -10%,#0b2a5e 0%,transparent 55%),radial-gradient(900px 500px at -10% 110%,#0a3a5e 0%,transparent 50%),linear-gradient(160deg,var(--bg1),var(--bg2));color:var(--txt);min-height:100vh;padding:28px 16px}
  .wrap{max-width:980px;margin:0 auto}
  header{display:flex;align-items:center;gap:14px;margin-bottom:22px}
  .logo{width:46px;height:46px;border-radius:14px;background:linear-gradient(135deg,#0ea5e9,#6366f1);display:grid;place-items:center;font-size:24px;box-shadow:0 0 28px rgba(56,189,248,.45)}
  h1{font-size:22px;background:linear-gradient(90deg,#7dd3fc,#c4b5fd);-webkit-background-clip:text;background-clip:text;color:transparent}
  .sub{color:var(--dim);font-size:13px;margin-top:3px}
  .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:20px}
  .stat{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:12px 14px;backdrop-filter:blur(6px)}
  .stat b{display:block;font-size:18px;margin-top:4px}
  .stat span{color:var(--dim);font-size:12px}
  .card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:18px;margin-bottom:16px;backdrop-filter:blur(6px)}
  .card h2{font-size:15px;margin-bottom:12px;color:#a5d8ff;display:flex;align-items:center;gap:8px}
  .tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}
  .tab{background:rgba(14,45,88,.6);border:1px solid var(--line);color:var(--dim);padding:9px 16px;border-radius:12px;cursor:pointer;font-size:13px;transition:.15s;font-family:inherit}
  .tab.on{background:linear-gradient(135deg,rgba(14,116,200,.55),rgba(99,102,241,.4));color:#fff;border-color:#38bdf8;box-shadow:0 0 18px rgba(56,189,248,.25)}
  .pane{display:none}.pane.on{display:block;animation:fade .25s}
  @keyframes fade{from{opacity:0;transform:translateY(4px)}to{opacity:1}}
  .uri-row{display:flex;align-items:center;gap:10px;padding:9px 12px;border:1px solid var(--line);border-radius:12px;margin-bottom:8px;background:rgba(4,16,38,.6)}
  code.uri{direction:ltr;font-family:ui-monospace,Consolas,monospace;font-size:11.5px;color:#bfe3ff;word-break:break-all;flex:1;line-height:1.7}
  .tag{flex-shrink:0;font-size:10.5px;padding:3px 8px;border-radius:8px;font-weight:700}
  .tag.vl{background:rgba(56,189,248,.15);color:#7dd3fc}
  .tag.tb{background:rgba(251,191,36,.15);color:#fcd34d}
  .cpy{flex-shrink:0;background:linear-gradient(135deg,#0284c7,#4f46e5);border:none;color:#fff;padding:7px 14px;border-radius:10px;cursor:pointer;font-size:12px;font-family:inherit;transition:.15s}
  .cpy:hover{filter:brightness(1.2)}
  .cpy.done{background:#16a34a}
  pre{direction:ltr;text-align:left;background:#03101f;border:1px solid var(--line);border-radius:12px;padding:14px;font-family:ui-monospace,Consolas,monospace;font-size:11.5px;max-height:420px;overflow:auto;color:#bfe3ff;white-space:pre-wrap;word-break:break-all}
  .qrs{display:flex;gap:26px;flex-wrap:wrap;justify-content:center;align-items:flex-start}
  .qr{text-align:center}
  .qr img{width:190px;height:190px;border-radius:14px;background:#fff;padding:8px}
  .qr p{margin-top:8px;font-size:12.5px;color:var(--dim)}
  .chip{display:inline-block;padding:4px 10px;border-radius:9px;font-size:12px;margin:2px 3px;direction:ltr}
  .chip.ok{background:rgba(74,222,128,.13);color:var(--green);border:1px solid rgba(74,222,128,.3)}
  .chip.bad{background:rgba(248,113,113,.12);color:var(--red);border:1px solid rgba(248,113,113,.3)}
  .note{background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.25);border-radius:12px;padding:12px 14px;font-size:13px;color:#fde68a;line-height:1.9;margin-top:10px}
  .dl{display:inline-flex;gap:6px;align-items:center;background:rgba(74,222,128,.12);border:1px solid rgba(74,222,128,.3);color:var(--green);padding:9px 16px;border-radius:11px;text-decoration:none;font-size:13px;margin:4px 4px 0 0}
  .dl:hover{background:rgba(74,222,128,.2)}
  ol.guide{padding-right:20px;line-height:2.1;font-size:13.5px;color:#d5ecff}
  ol.guide b{color:#7dd3fc}
  footer{text-align:center;color:#45698c;font-size:11.5px;margin-top:26px}
</style>
</head>
<body>
<div class="wrap">
  <header>
    <div class="logo">🌊</div>
    <div>
      <h1>قنات — پکیج کانفیگ ${esc(target.username)}</h1>
      <div class="sub">${esc(host)} • تولید خودکار از پنل • ${new Date().toLocaleDateString('fa-IR')}</div>
    </div>
  </header>

  <div class="stats">
    <div class="stat"><span>پروتکل‌ها</span><b>${pkg.uris.length} کانفیگ</b></div>
    <div class="stat"><span>مصرف</span><b>${usedGb} GB</b></div>
    <div class="stat"><span>سهمیه</span><b>${pkg.user.quotaGb} GB</b></div>
    <div class="stat"><span>انقضا</span><b style="font-size:15px">${expiry}</b></div>
    <div class="stat"><span>پورت‌های باز از این شبکه</span><b style="font-size:15px">${okPorts}/${ports.length}</b></div>
  </div>

  <div class="tabs">
    <button class="tab on" data-t="uris">🚀 کانفیگ‌ها</button>
    <button class="tab" data-t="qr">🔳 QR کد</button>
    <button class="tab" data-t="clash">⚙️ Clash</button>
    <button class="tab" data-t="singbox">📦 sing-box</button>
    <button class="tab" data-t="sub">🔗 اشتراک</button>
    <button class="tab" data-t="guide">💡 راهنما و عیب‌یابی</button>
  </div>

  <div class="pane on" id="p-uris">
    <div class="card">
      <h2>🔌 لینک‌های اتصال (کپی کن، در اپ وارد کن)</h2>
      ${uriCards}
      <div class="note">💡 <b>پورت‌های جایگزین</b> وقتی ۴۴۳ در شبکه‌ات فیلتر/کند است به‌کار می‌آیند — همه به یک سرور وصل می‌شوند. در Clash گروه «خودکار» بهترین را هر ۵ دقیقه انتخاب می‌کند.</div>
    </div>
  </div>

  <div class="pane" id="p-qr">
    <div class="card">
      <h2>🔳 اسکن کن — همین الان وصل شو</h2>
      <div class="qrs">
        <div class="qr"><img src="${pkg.qrVless}" alt="QR VLESS"><p>VLESS (پیشنهادی)</p></div>
        <div class="qr"><img src="${pkg.qrTrojan}" alt="QR Trojan"><p>Trojan</p></div>
      </div>
      <div class="note">📱 برای v2rayNG / Hiddify / V2Box / Streisand: روی «+» بزن و «اسکن QR» را انتخاب کن.</div>
    </div>
  </div>

  <div class="pane" id="p-clash">
    <div class="card">
      <h2>⚙️ Clash / Mihomo — گروه خودکار + قوانین ایران</h2>
      <pre>${esc(pkg.clash)}</pre>
      <a class="dl" href="clash.yaml" download>⬇ دانلود clash.yaml</a>
      <div class="note">💡 فایل را با «Import from file» در کلاینت Clash (مثلاً v2rayN با هسته‌ی Mihomo یا Clash Verge) وارد کن. سایت‌های ایرانی مستقیم می‌روند و بقیه از سریع‌ترین کانفیگ.</div>
    </div>
  </div>

  <div class="pane" id="p-singbox">
    <div class="card">
      <h2>📦 sing-box — urltest + قوانین ایران</h2>
      <pre>${esc(pkg.singbox)}</pre>
      <a class="dl" href="singbox.json" download>⬇ دانلود singbox.json</a>
      <div class="note">💡 در Hiddify/Streisand: «افزودن از فایل/JSON». حالت TUN دارد (کل سیستم از آن می‌گذرد).</div>
    </div>
  </div>

  <div class="pane" id="p-sub">
    <div class="card">
      <h2>🔗 اشتراک base64 (برای v2rayNG / Hiddify / Happ)</h2>
      <pre>${esc(pkg.base64)}</pre>
      <a class="dl" href="subscription.txt" download>⬇ دانلود subscription.txt</a>
      <div class="note">💡 در v2rayNG: «+» ← «افزودن از کلیپ‌بورد» یا در Hiddify: «افزودن اشتراک». مصرف/انقضا خودکار نمایش داده می‌شود.</div>
    </div>
  </div>

  <div class="pane" id="p-guide">
    <div class="card">
      <h2>💡 راهنما و عیب‌یابی</h2>
      <ol class="guide">
        <li><b>وارد کردن:</b> لینک را کپی کن ← در v2rayNG/Hiddify «افزودن از کلیپ‌بورد» ← فعال کن.</li>
        <li><b>اگر کانفیگ وصل نشد:</b> پورت دیگری از لیست را امتحان کن (مخصوصاً وقتی ۴۴۳ بسته است).</li>
        <li><b>خطای «اتصال بسته شد / ERR_CONNECTION_CLOSED» در سایت‌هایی مثل whatismyipaddress.com:</b> این تقصیر کانفیگ نیست؛ آن سایت‌ها IP خروجی کلودفلر را بلاک کرده‌اند. از سایت‌های تست جایگزین استفاده کن: <span style="direction:ltr;display:inline-block">ifconfig.me</span> یا <span style="direction:ltr;display:inline-block">api.ipify.org</span>.</li>
        <li><b>راه‌حل اصلی سایت‌های بلاک‌کننده‌ی کلودفلر:</b> در پنل ← تنظیمات ← «بالادست (upstream)» یک کانفیگ vless/trojan روی سرور شخصی بده تا ترافیک از آن خارج شود؛ پنل خودکار failover می‌کند.</li>
        <li><b>ست کردن IP تمیز:</b> در پنل از دکمه‌ی «🎯 ست کردن IP روی کانفیگ‌ها» استفاده کن (IP را اسکن می‌کند و روی همه‌ی کانفیگ‌ها اعمال می‌شود؛ Host/SNI همان دامنه می‌ماند).</li>
        <li><b>QR کار نمی‌کند؟</b> مطمئن شو اپت از پروتکل WS پشتیبانی می‌کند (v2rayNG, Hiddify, Streisand, V2Box, Happ — همه بله).</li>
      </ol>
      <div class="note">🖥 وضعیت پورت‌ها از شبکه‌ی فعلی: ${portChips}</div>
    </div>
  </div>

  <footer>🌊 قنات — پکیج تولیدشده با ابزار export-configs • سرور: ${esc(host)}</footer>
</div>
<script>
  document.querySelectorAll('.tab').forEach(function (t) {
    t.addEventListener('click', function () {
      document.querySelectorAll('.tab').forEach(function (x) { x.classList.remove('on'); });
      document.querySelectorAll('.pane').forEach(function (x) { x.classList.remove('on'); });
      t.classList.add('on');
      document.getElementById('p-' + t.dataset.t).classList.add('on');
    });
  });
  document.querySelectorAll('.cpy').forEach(function (b) {
    b.addEventListener('click', function () {
      var v = b.dataset.copy;
      (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(function () {
        b.textContent = '✓ کپی شد'; b.classList.add('done');
        setTimeout(function () { b.textContent = 'کپی'; b.classList.remove('done'); }, 1600);
      }).catch(function () {
        var ta = document.createElement('textarea'); ta.value = v; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); b.textContent = '✓ کپی شد'; } catch (e) { b.textContent = 'خطا'; }
        document.body.removeChild(ta);
        setTimeout(function () { b.textContent = 'کپی'; }, 1600);
      });
    });
  });
</script>
</body>
</html>
`;
writeFileSync(`${outDir}/index.html`, pageHtml);
console.log(`\n✅ خروجی در ${outDir}/  (index.html + configs.txt + clash.yaml + singbox.json + subscription.txt)`);
