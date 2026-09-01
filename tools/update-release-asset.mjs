/**
 * آپدیت asset ریلیز گیتهاب از dist/_worker.js
 * استفاده:
 *   node tools/update-release-asset.mjs v1.1.0
 *
 * فایل آپلودشده: qanat-v1.1.0-worker.js (روی ریلیز tag=v1.1.0)
 * پیش‌نیاز: GH_TOKEN (env)
 */
import { readFileSync } from 'node:fs';

const VERSION = process.argv[2] || '1.1.0';
const TOKEN = process.env.GH_TOKEN;
if (!TOKEN) { console.log('GH_TOKEN env required'); process.exit(1); }

const code = readFileSync('/home/user/panel/dist/_worker.js', 'utf8');
const assetName = `qanat-v${VERSION}-worker.js`;

const api = async (path, init = {}) => {
  const res = await fetch('https://api.github.com' + path, { ...init, headers: { Authorization: `Bearer ${TOKEN}`, 'User-Agent': 'qanat', ...(init.headers || {}) } });
  return { status: res.status, body: await res.json().catch(() => null) };
};

const rel = await api(`/repos/qanatpanel/qanat/releases/tags/v${VERSION}`);
if (!rel.body?.id) {
  console.log(`ریلیز v${VERSION} پیدا نشد — اول release بسازید`);
  process.exit(1);
}

for (const a of rel.body.assets || []) {
  if (a.name === assetName) {
    await api(`/repos/qanatpanel/qanat/releases/assets/${a.id}`, { method: 'DELETE' });
  }
}

const up = await fetch(`https://uploads.github.com/repos/qanatpanel/qanat/releases/${rel.body.id}/assets?name=${assetName}`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${TOKEN}`, 'User-Agent': 'qanat', 'Content-Type': 'application/javascript' },
  body: code,
});
const upj = await up.json();
console.log('asset:', up.status, upj.size, upj.browser_download_url || '');
