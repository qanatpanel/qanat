// ═══════════════ تست E2E نهایی روی کلودفلر واقعی ═══════════════
// ۱) دیپلوی پنل (با کد اصلاحشده) + D1 تستی
// ۲) نصب + لاگین + ساخت کاربر
// ۳) کانفیگ با IP تمیز (api/config)
// ۴) اتصال با کلاینت VLESS واقعی (TLS+WS+VLESS header) از طریق IP تمیز
// ۵) عبور HTTP از تونل و دریافت پاسخ واقعی ← اثبات کامل
import { readFileSync, writeFileSync } from 'node:fs';

const TOKEN = process.env.CLOUDFLARE_API_TOKEN || '';
const ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID || '';
if (!TOKEN || !ACCOUNT) { console.error('CLOUDFLARE_API_TOKEN و CLOUDFLARE_ACCOUNT_ID را ست کنید'); process.exit(1); }
const CLIENT_ONLY = process.env.PHASE === 'client';
const NAME = 'qanat-fix-verify';
const DB = 'qanat-fix-verify-db';

async function cf(path, init = {}) {
  const res = await fetch('https://api.cloudflare.com/client/v4' + path, {
    ...init,
    headers: { Authorization: `Bearer ${TOKEN}`, ...(init.headers || {}) },
  });
  const j = await res.json().catch(() => null);
  return { ok: !!j?.success, status: res.status, result: j?.result, errors: j?.errors };
}

const log = (s) => console.log(s);

if (CLIENT_ONLY) {
  // ─── فقط کلاینت (فاز ۴) ───
  const { vlessTlsTest } = await import('/home/user/panel/scripts/vless-tls-test.mjs');
  const st = JSON.parse(readFileSync('/tmp/e2e-state.json', 'utf8'));
  const ip = process.env.IP || '104.16.130.229';
  const res2 = await fetch(`https://${st.domain}/${st.sp}/panel/api/config?server=${ip}&uuid=${st.uuid}`, { headers: { cookie: st.cookie } });
  const cfg2 = await res2.json();
  const clientPath = decodeURIComponent(cfg2.vless.match(/path=([^&#]*)/)[1]).split('/')[1];
  log(`   state: ${st.domain} sp=${st.sp} path=${clientPath} ip=${ip}`);
  const result = await vlessTlsTest({ ip, sni: st.domain, uuid: st.uuid, proxyPath: clientPath, targetHost: process.env.TARGET_HOST || 'www.youtube.com', targetPort: Number(process.env.TARGET_PORT || 443) });
  if (result.ok) log(`   ✅✅✅ E2E: ${result.response}`);
  else log(`   ❌ E2E: ${result.error}`);
  process.exit(result.ok ? 0 : 1);
}

// ─── ۱) دیپلوی ───
log('══ ۱) دیپلوی پنل تستی ══');
let dbList = await cf(`/accounts/${ACCOUNT}/d1/database?per_page=100`);
let dbId = (dbList.result || []).find(d => d.name === DB)?.id || (dbList.result || []).find(d => d.name === DB)?.uuid;
if (!dbId) {
  const db = await cf(`/accounts/${ACCOUNT}/d1/database`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: DB }),
  });
  dbId = db.result?.id || db.result?.uuid;
  if (!dbId) { log('   ❌ D1: ' + JSON.stringify(db.errors)); process.exit(1); }
}
log(`   ✅ D1: ${dbId}`);

const script = readFileSync('/home/user/panel/dist/_worker.js', 'utf8');
const fd = new FormData();
fd.append('files', new Blob([script], { type: 'application/javascript+module' }), 'worker.js');
fd.append('metadata', new Blob([JSON.stringify({
  main_module: 'worker.js',
  compatibility_date: '2026-05-01',
  bindings: [{ name: 'DB', type: 'd1', database_id: dbId }],
})], { type: 'application/json' }));
const up = await cf(`/accounts/${ACCOUNT}/workers/scripts/${NAME}`, { method: 'PUT', body: fd });
if (!up.ok) { log('   ❌ upload: ' + JSON.stringify(up.errors)); process.exit(1); }
log('   ✅ آپلود شد');

await cf(`/accounts/${ACCOUNT}/workers/scripts/${NAME}/subdomain`, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ enabled: true }),
});
const DOMAIN = `${NAME}.amirhesamfathalian7.workers.dev`;
log(`   ✅ فعال: https://${DOMAIN}`);

// ─── ۲) نصب + لاگین + کاربر ───
log('══ ۲) نصب و کاربر ══');
let res = await fetch(`https://${DOMAIN}/healthz`);
log(`   healthz: ${await res.text()} (${res.status})`);

// صبر برای propagation
await new Promise(r => setTimeout(r, 4000));

// ریست دیتابیس برای نصب تازه
await cf(`/accounts/${ACCOUNT}/d1/database/${dbId}/query`, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ sql: "DELETE FROM settings; DELETE FROM login_attempts; DELETE FROM users;" }),
});

res = await fetch(`https://${DOMAIN}/install`, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ password: 'TestPass1234!', confirm: 'TestPass1234!' }),
});
const inst = await res.json();
const SP = (inst.redirect || '').match(/\/([a-z0-9]+)\/panel/)?.[1];
log(`   نصب: ${JSON.stringify(inst).slice(0, 120)}`);
if (!SP) { log('   ❌ نصب ناموفق'); process.exit(1); }

// لاگین (کوکی)
const jar = {};
res = await fetch(`https://${DOMAIN}/${SP}/login`, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ password: 'TestPass1234!' }),
});
const setCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
const cookie = setCookies.map(c => c.split(';')[0]).join('; ');
log(`   ✅ لاگین (کوکی: ${cookie ? 'داریم' : 'نداریم'})`);

res = await fetch(`https://${DOMAIN}/${SP}/panel/api/users`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', cookie },
  body: JSON.stringify({ username: 'e2e', quotaGb: 10 }),
});
const u = await res.json();
const UUID = u.user?.uuid || (Array.isArray(u.users) ? u.users[0]?.uuid : null) || (u.uuid);
log(`   ✅ کاربر: ${UUID}`);

// ─── ۳) کانفیگ با IP تمیز ───
log('══ ۳) کانفیگ با IP تمیز ══');
const CLEAN_IP = '104.16.130.229';
res = await fetch(`https://${DOMAIN}/${SP}/panel/api/config?server=${CLEAN_IP}&uuid=${UUID}`, {
  headers: { cookie },
});
const cfg = await res.json();
log(`   vless: ${(cfg.vless || '').slice(0, 100)}...`);
if (!cfg.vless) { log('   ❌ کانفیگ نگرفت'); process.exit(1); }
log(`   ✅ کانفیگ: server=${cfg.server} host=${cfg.host}`);

// ─── ۴) کلاینت VLESS واقعی ───
log('══ ۴) اتصال کلاینت VLESS از طریق IP تمیز ══');
const { vlessTlsTest } = await import('/home/user/panel/scripts/vless-tls-test.mjs');
let clientIp = CLEAN_IP;
let clientSni = cfg.host;
let clientUuid = UUID;
let clientPath = decodeURIComponent(cfg.vless.match(/path=([^&#]*)/)[1]).split('/')[1];
if (process.env.PHASE === 'client') {
  const st = JSON.parse(readFileSync('/tmp/e2e-state.json', 'utf8'));
  clientIp = process.env.IP || CLEAN_IP;
  clientSni = st.domain;
  clientUuid = st.uuid;
  clientPath = process.env.PPATH || '';
  // گرفتن proxyPath از کانفیگ جدید
  const res2 = await fetch(`https://${st.domain}/${st.sp}/panel/api/config?server=${clientIp}&uuid=${st.uuid}`, { headers: { cookie: st.cookie } });
  const cfg2 = await res2.json();
  clientPath = decodeURIComponent(cfg2.vless.match(/path=([^&#]*)/)[1]).split('/')[1];
  log(`   state: ${st.domain} sp=${st.sp} uuid=${st.uuid} path=${clientPath}`);
}
const result = await vlessTlsTest({ ip: clientIp, sni: clientSni, uuid: clientUuid, proxyPath: clientPath, targetHost: process.env.TARGET_HOST || 'www.youtube.com', targetPort: Number(process.env.TARGET_PORT || 443) });

if (result.ok) {
  log(`   ✅✅✅ E2E کامل: از طریق IP تمیز ${CLEAN_IP} → ${result.response}`);
} else {
  log(`   ❌❌❌ E2E ناموفق: ${result.error}`);
}

// ─── ۵) پاکسازی ───
if (process.env.KEEP !== '1' && !CLIENT_ONLY) {
  await cf(`/accounts/${ACCOUNT}/workers/scripts/${NAME}`, { method: 'DELETE' });
  await cf(`/accounts/${ACCOUNT}/d1/database/${dbId}`, { method: 'DELETE' });
  log('══ پاکسازی تستی انجام شد ══');
} else {
  log('══ KEEP=1 → worker نگه داشته شد برای دیباگ ══');
  writeFileSync('/tmp/e2e-state.json', JSON.stringify({ domain: DOMAIN, sp: SP, uuid: UUID, cookie }));
}
process.exit(result.ok ? 0 : 1);
