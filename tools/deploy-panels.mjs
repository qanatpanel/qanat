/**
 * دیپلوی پنل روی همهٔ worker ها — بایندینگ‌های فعلی هر worker را می‌گیرد و با نسخهٔ جدید
 * (فقط main_module + compatibility_date + همان bindings) آپلود و ۱۰۰٪ دیپلوی می‌کند.
 * استفاده: node deploy-panels.mjs <workerName> [workerName...]
 */
import { readFileSync } from 'node:fs';
const CF = process.env.CF_TOKEN;
const ACCT = process.env.CF_ACCOUNT || '69a46b828fbe5f30ef66f1890181aed3';
if (!CF) { console.log('نشان دادن: CF_TOKEN env required'); process.exit(1); }
const code = readFileSync('/home/user/panel/dist/_worker.js', 'utf8');

async function cf(path, init = {}) {
  const res = await fetch('https://api.cloudflare.com/client/v4' + path, { ...init, headers: { Authorization: `Bearer ${CF}`, ...(init.headers || {}) } });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.success) {
    console.log(`CF ERROR ${path}:`, JSON.stringify(body).slice(0, 300));
    process.exit(1);
  }
  return body;
}

for (const name of process.argv.slice(2)) {
  const st = await cf(`/accounts/${ACCT}/workers/scripts/${name}/settings`);
  const bindings = st.result?.bindings || [];
  console.log(`${name}: ${bindings.length} bindings ->`, bindings.map((b) => `${b.type}:${b.name}`).join(', '));

  const fd = new FormData();
  fd.append('metadata', new Blob([JSON.stringify({ main_module: 'worker.js', compatibility_date: '2026-05-01', bindings })], { type: 'application/json' }));
  fd.append('files', new Blob([code], { type: 'application/javascript+module' }), 'worker.js');
  const up = await cf(`/accounts/${ACCT}/workers/scripts/${name}`, { method: 'PUT', body: fd });

  const vs = await cf(`/accounts/${ACCT}/workers/scripts/${name}/versions?per_page=1`);
  const vid = vs.result?.items?.[0]?.id;
  if (!vid) { console.log(`${name}: no version id`); continue; }
  const dep = await cf(`/accounts/${ACCT}/workers/scripts/${name}/deployments`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ strategy: 'percentage', versions: [{ version_id: vid, percentage: 100 }] }),
  });
  console.log(`${name}: deployed → ${dep.result?.id}`);
}
