/** آپدیت asset ریلیز گیتهاب (qanat-v1.0.0-worker.js) از dist/_worker.js — استفاده: node tools/update-release-asset.mjs */
import { readFileSync } from 'node:fs';
const TOKEN = process.env.GH_TOKEN;
if (!TOKEN) { console.log('GH_TOKEN env required'); process.exit(1); }
const code = readFileSync('/home/user/panel/dist/_worker.js', 'utf8');
const api = async (path, init = {}) => {
  const res = await fetch('https://api.github.com' + path, { ...init, headers: { Authorization: `Bearer ${TOKEN}`, 'User-Agent': 'qanat', ...(init.headers || {}) } });
  return { status: res.status, body: await res.json().catch(() => null) };
};
const rel = await api('/repos/qanatpanel/qanat/releases/tags/v1.0.0');
for (const a of rel.body?.assets || []) {
  if (a.name === 'qanat-v1.0.0-worker.js') await api(`/repos/qanatpanel/qanat/releases/assets/${a.id}`, { method: 'DELETE' });
}
const up = await fetch(`https://uploads.github.com/repos/qanatpanel/qanat/releases/${rel.body.id}/assets?name=qanat-v1.0.0-worker.js`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${TOKEN}`, 'User-Agent': 'qanat', 'Content-Type': 'application/javascript' },
  body: code,
});
const upj = await up.json();
console.log('asset:', up.status, upj.size);
