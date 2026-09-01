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
    throw new Error(`CF ${path}: ${JSON.stringify(body).slice(0, 300)}`);
  }
  return body;
}

for (const name of process.argv.slice(2)) {
  const st = await cf(`/accounts/${ACCT}/workers/scripts/${name}/settings`);
  const all = st.result?.bindings || [];
  // secret_text ها مقدارشان از API خوانده نمی‌شود؛ با keep_bindings حفظ می‌شوند
  const bindings = all.filter((b) => b.type !== 'secret_text');
  const hasSecrets = all.some((b) => b.type === 'secret_text');
  console.log(`${name}: ${all.length} bindings ->`, all.map((b) => `${b.type}:${b.name}`).join(', '));

  const fd = new FormData();
  const meta = { main_module: 'worker.js', compatibility_date: '2026-05-01', bindings };
  if (hasSecrets) meta.keep_bindings = ['secret_text'];
  fd.append('metadata', new Blob([JSON.stringify(meta)], { type: 'application/json' }));
  fd.append('files', new Blob([code], { type: 'application/javascript+module' }), 'worker.js');
  let up;
  try {
    up = await cf(`/accounts/${ACCT}/workers/scripts/${name}`, { method: 'PUT', body: fd });
  } catch (e) {
    console.log(`${name}: SKIP (${e.message})`);
    continue;
  }

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

// ─── نوتیف خودکار به کاربران بعد از آپدیت ───
// استفاده: node deploy-panels.mjs --notify v1.5.0 "توضیح" <workerName...>
const ni = process.argv.indexOf('--notify');
if (ni !== -1) {
  const nv = process.argv[ni + 1];
  const nnote = process.argv.slice(ni + 2).filter((a) => !/^qanat-|^takht-|^tabora-|^zeus-|^zak|^mypanel/.test(a)).join(' ').trim();
  if (nv) {
    console.log(`\n📢 ارسال نوتیف نسخهٔ ${nv} به کاربران...`);
    const { execSync } = await import('node:child_process');
    try {
      execSync(`node tools/notify-update.mjs "${nv.replace(/"/g, '')}" ${JSON.stringify(nnote)}`, { stdio: 'inherit' });
    } catch (e) {
      console.log('نوتیف ناموفق:', e.message);
    }
  }
}
