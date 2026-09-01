/** دیپلوی بوت تلگرام (qanat-bot) با بایندینگ BOT_DB — استفاده: node tools/deploy-bot.mjs (از ریشهٔ qanat-bot) */
import { readFileSync } from 'node:fs';
const CF = process.env.CF_TOKEN;
const ACCT = process.env.CF_ACCOUNT || '69a46b828fbe5f30ef66f1890181aed3';
if (!CF) { console.log('CF_TOKEN env required'); process.exit(1); }
async function cf(path, init = {}) {
  const res = await fetch('https://api.cloudflare.com/client/v4' + path, { ...init, headers: { Authorization: `Bearer ${CF}`, ...(init.headers || {}) } });
  return { ok: res.ok, body: await res.json().catch(() => null) };
}
const ADMIN_PASS = process.env.ADMIN_PASS;
if (!ADMIN_PASS) { console.error('ADMIN_PASS env required'); process.exit(1); }
const code = readFileSync('/home/user/qanat-bot/dist/_worker.js', 'utf8');
const fd = new FormData();
fd.append('metadata', new Blob([JSON.stringify({ main_module: 'worker.js', compatibility_date: '2026-05-01', bindings: [{ name: 'BOT_DB', type: 'd1', database_id: '16861b47-3d4f-451a-9ad6-dce2bfe44a29' }] })], { type: 'application/json' }));
fd.append('files', new Blob([code], { type: 'application/javascript+module' }), 'worker.js');
const up = await cf(`/accounts/${ACCT}/workers/scripts/qanat-bot`, { method: 'PUT', body: fd });
if (up.ok) {
  const r = await cf(`/accounts/${ACCT}/workers/scripts/qanat-bot/secrets`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'secret_text', name: 'ADMIN_PASS', text: ADMIN_PASS }) });
  console.log('secret ADMIN_PASS:', r.ok ? 'ok' : 'fail');
}
if (!up.ok) { console.log('upload fail', JSON.stringify(up.body).slice(0, 200)); process.exit(1); }
const vs = await cf(`/accounts/${ACCT}/workers/scripts/qanat-bot/versions?per_page=1`);
const vid = vs.body?.result?.items?.[0]?.id;
const dep = await cf(`/accounts/${ACCT}/workers/scripts/qanat-bot/deployments`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ strategy: 'percentage', versions: [{ version_id: vid, percentage: 100 }] }) });
console.log('bot deployed:', dep.ok ? dep.body?.result?.id : 'FAIL');
