/**
 * اشتراک‌ها
 *
 * عمومی (با دانستن UUID — خود UUID راز است):
 *   GET /{securePath}/sub/{uuid}            → صفحه‌ی اشتراک HTML کاربر
 *   GET /{securePath}/sub/{uuid}/txt        → اشتراک base64 (برای کلاینت‌ها)
 *   GET /{securePath}/sub/{uuid}?format=clash|singbox → کانفیگ
 *
 * مدیریت (نیازمند سشن):
 *   GET /{securePath}/panel/api/subscriptions → همه‌ی لینک‌ها برای داشبورد
 */
import type { Env } from '../types/global';
import type { PanelSettings } from '../settings/main';
import { getProxySettings, type ProxySettings } from '../settings/proxy';
import { getUserByUuid, listUsers } from '../settings/users';
import { verifySessionCookie } from '../auth/session';
import { buildUris, buildBase64Sub, buildClashConfig, buildSingboxConfig, buildVlessUri, buildTrojanUri, type BuildInput } from '../cores/config';
import { makeQrSvg } from '../cores/qr';
import { json, htmlPage } from './utils';

function subOrigin(request: Request): string {
  return new URL(request.url).origin;
}

/* ─────────────── مدیریت (داشبورد) ─────────────── */

export async function handleSubscriptionsApi(request: Request, env: Env, settings: PanelSettings): Promise<Response> {
  const session = await verifySessionCookie(request, settings.jwtSecret);
  if (!session) return json({ ok: false, error: 'unauthorized' }, 401);

  const proxy = await getProxySettings(env, new URL(request.url).hostname);
  const origin = subOrigin(request);
  const users = await listUsers(env);
  const now = Date.now();

  const items = users.map((user) => {
    const input: BuildInput = { user, proxy, originHost: proxy.host || new URL(request.url).hostname };
    const uris = buildUris(input);
    const status = !user.isActive ? 'disabled' : user.expiry > 0 && user.expiry < now ? 'expired' : 'active';
    return {
      id: user.id,
      username: user.username,
      status,
      uuid: user.uuid,
      usedGb: user.usedGb,
      quotaGb: user.quotaGb,
      vless: buildVlessUri(input),
      trojan: buildTrojanUri(input),
      uris,
      subUrl: `${origin}/${settings.securePath}/sub/${user.uuid}`,
      subTxt: `${origin}/${settings.securePath}/sub/${user.uuid}/txt`,
      clashUrl: `${origin}/${settings.securePath}/sub/${user.uuid}?format=clash`,
      singboxUrl: `${origin}/${settings.securePath}/sub/${user.uuid}?format=singbox`,
      qrVless: `${origin}/${settings.securePath}/panel/api/qr?text=${encodeURIComponent(buildVlessUri(input))}`,
    };
  });

  return json({
    ok: true,
    proxy: { host: proxy.host, port: proxy.port, tls: proxy.tls, protocols: proxy.protocols, proxyPath: proxy.proxyPath },
    items,
  });
}

/* ─────────────── عمومی (کاربر) ─────────────── */

export async function handlePublicSub(request: Request, env: Env, settings: PanelSettings, identifier: string): Promise<Response> {
  const user = await getUserByUuid(env, identifier);
  if (!user) return new Response('Not Found', { status: 404 });

  const proxy = await getProxySettings(env, new URL(request.url).hostname);
  const input: BuildInput = { user, proxy, originHost: proxy.host || new URL(request.url).hostname };
  const url = new URL(request.url);
  const format = url.searchParams.get('format');

  if (format === 'clash') {
    return new Response(buildClashConfig(input), {
      headers: { 'content-type': 'text/yaml; charset=utf-8', 'content-disposition': `attachment; filename="panel-${user.username}.yaml"` },
    });
  }
  if (format === 'singbox') {
    return new Response(buildSingboxConfig(input), {
      headers: { 'content-type': 'application/json; charset=utf-8', 'content-disposition': `attachment; filename="panel-${user.username}.json"` },
    });
  }

  if (url.pathname.endsWith('/txt')) {
    return new Response(buildBase64Sub(input), {
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }

  return htmlPage(renderSubPage(input, settings, request));
}

/* ─────────────── صفحه‌ی اشتراک HTML ─────────────── */

function renderSubPage(b: BuildInput, settings: PanelSettings, request: Request): string {
  const origin = subOrigin(request);
  const { user, proxy } = b;
  const uris = buildUris(b);
  const now = Date.now();
  const expired = user.expiry > 0 && user.expiry < now;
  const statusTxt = !user.isActive ? 'غیرفعال' : expired ? 'منقضی' : 'فعال';
  const statusCls = !user.isActive || expired ? 'bad' : 'ok';
  const pct = user.quotaGb > 0 ? Math.min(100, (user.usedGb / user.quotaGb) * 100) : 0;

  const subTxt = `${origin}/${settings.securePath}/sub/${user.uuid}/txt`;
  const clashUrl = `${origin}/${settings.securePath}/sub/${user.uuid}?format=clash`;
  const singboxUrl = `${origin}/${settings.securePath}/sub/${user.uuid}?format=singbox`;

  const configs = uris
    .map(
      (uri) => `
      <div class="cfg">
        <div class="cfg-top">
          <code>${esc(uri)}</code>
          <button class="copy" data-copy="${esc(uri)}">📋 کپی</button>
        </div>
      </div>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="fa" dir="rtl" data-theme="dark">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>اشتراک ${esc(user.username)} | قنات</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2064%2064%22%3E%0A%20%20%3Cdefs%3E%0A%20%20%20%20%3ClinearGradient%20id%3D%22s%22%20gradientUnits%3D%22userSpaceOnUse%22%20x1%3D%2214%22%20y1%3D%2210%22%20x2%3D%2250%22%20y2%3D%2254%22%3E%0A%20%20%20%20%20%20%3Cstop%20offset%3D%220%22%20stop-color%3D%22%2357e6ff%22/%3E%0A%20%20%20%20%20%20%3Cstop%20offset%3D%221%22%20stop-color%3D%22%2314b8a6%22/%3E%0A%20%20%20%20%3C/linearGradient%3E%0A%20%20%3C/defs%3E%0A%20%20%3Ccircle%20cx%3D%2227%22%20cy%3D%2229%22%20r%3D%2214.5%22%20fill%3D%22none%22%20stroke%3D%22url%28%23s%29%22%20stroke-width%3D%225.5%22%20stroke-linecap%3D%22round%22/%3E%0A%20%20%3Cpath%20d%3D%22M37%2038c7.5%201%2010.5%207%208.5%2012.5-1.2%203.4-5.4%205.4-9%204%22%20fill%3D%22none%22%20stroke%3D%22url%28%23s%29%22%20stroke-width%3D%225.5%22%20stroke-linecap%3D%22round%22/%3E%0A%20%20%3Ccircle%20cx%3D%2241%22%20cy%3D%229%22%20r%3D%222.1%22%20fill%3D%22%2367e8f9%22/%3E%0A%20%20%3Ccircle%20cx%3D%2249.5%22%20cy%3D%2213.5%22%20r%3D%221.7%22%20fill%3D%22%2367e8f9%22/%3E%0A%3C/svg%3E"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;600;700;800&display=swap" rel="stylesheet"/>
<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#060a13;--card:#0e1524;--card2:#111a2e;--line:#1c2740;--text:#e5eaf3;--muted:#8b98ad;--accent:#22d3ee;--ok:#4ade80;--bad:#f87171;--radius:18px}
body{font-family:'Vazirmatn',system-ui,sans-serif;background:radial-gradient(1000px 500px at 80% -10%,#0c1e33,transparent 60%),radial-gradient(700px 400px at -10% 110%,#062a3a,transparent 55%),var(--bg);color:var(--text);min-height:100vh;padding:24px;display:flex;justify-content:center}
.wrap{width:100%;max-width:640px}
.card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:24px;margin-bottom:16px}
.brand{display:flex;align-items:center;gap:12px;margin-bottom:18px}
.logo{width:46px;height:46px;flex:none;filter:drop-shadow(0 6px 18px rgba(34,211,238,.35))}
.logo svg{width:100%;height:100%;display:block;border-radius:13px}
h1{font-size:18px}h2{font-size:15px;margin-bottom:12px}
.muted{color:var(--muted);font-size:12.5px;line-height:1.8}
.badge{display:inline-block;padding:4px 12px;border-radius:999px;font-size:11.5px;font-weight:700}
.badge.ok{background:rgba(74,222,128,.14);color:var(--ok)}
.badge.bad{background:rgba(248,113,113,.14);color:var(--bad)}
.row{display:flex;justify-content:space-between;gap:10px;padding:9px 0;border-bottom:1px dashed var(--line);font-size:13.5px}
.row:last-child{border-bottom:none}.row .k{color:var(--muted)}
.bar{height:8px;border-radius:999px;background:var(--card2);overflow:hidden;margin-top:8px}
.bar i{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#22d3ee,#14b8a6)}
.bar i.full{background:linear-gradient(90deg,#f59e0b,#ef4444)}
.cfg{margin-bottom:12px}
.cfg-top{display:flex;gap:8px;align-items:stretch}
.cfg code{flex:1;background:var(--card2);border:1px solid var(--line);border-radius:12px;padding:10px 12px;font-size:11px;direction:ltr;text-align:left;word-break:break-all;color:var(--text)}
.copy{border:1px solid var(--accent);background:transparent;color:var(--accent);border-radius:12px;padding:0 14px;cursor:pointer;font-family:inherit;font-size:12.5px;font-weight:600;flex:none}
.copy:hover{background:rgba(34,211,238,.15)}
.copy.ok{border-color:var(--ok);color:var(--ok)}
.links{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.links a{display:block;text-align:center;padding:11px;border:1px solid var(--line);border-radius:12px;color:var(--text);text-decoration:none;font-size:13px;font-weight:600;background:var(--card2)}
.links a:hover{border-color:var(--accent)}
.qr{display:flex;justify-content:center;margin-top:14px}
.qr svg{width:200px;height:200px;border-radius:14px;background:#fff;padding:10px}
</style>
</head>
<body>
<div class="wrap">
  <div class="card">
    <div class="brand">
      <div class="logo"><svg xmlns="http://www.w3.org/2000/svg" class="qanat-mark" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="tile" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0d1836"/>
      <stop offset="0.55" stop-color="#0b2340"/>
      <stop offset="1" stop-color="#07293e"/>
    </linearGradient>
    <linearGradient id="stream" gradientUnits="userSpaceOnUse" x1="150" y1="120" x2="380" y2="460">
      <stop offset="0" stop-color="#57e6ff"/>
      <stop offset="0.5" stop-color="#22d3ee"/>
      <stop offset="1" stop-color="#14b8a6"/>
    </linearGradient>
    <linearGradient id="wave" gradientUnits="userSpaceOnUse" x1="0" y1="205" x2="0" y2="295">
      <stop offset="0" stop-color="#8ef0ff" stop-opacity="0.95"/>
      <stop offset="1" stop-color="#2dd4bf" stop-opacity="0.5"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.42" r="0.62">
      <stop offset="0" stop-color="#22d3ee" stop-opacity="0.24"/>
      <stop offset="1" stop-color="#22d3ee" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="7"/>
    </filter>
  </defs>

  <!-- tile -->
  <rect rx="118" fill="url(#tile)"/>
  <rect rx="118" fill="url(#glow)"/>
  <rect x="9" y="9" width="494" height="494" rx="110" fill="none" stroke="#ffffff" stroke-opacity="0.07" stroke-width="2"/>

  <!-- ripples -->
  <circle cx="215" cy="238" r="152" fill="none" stroke="#57e6ff" stroke-opacity="0.08" stroke-width="2"/>
  <circle cx="215" cy="238" r="172" fill="none" stroke="#57e6ff" stroke-opacity="0.05" stroke-width="2"/>

  <!-- tunnel ring (Q) -->
  <circle cx="215" cy="238" r="110" fill="none" stroke="url(#stream)" stroke-width="36" stroke-linecap="round"/>

  <!-- water levels -->
  <line x1="160" y1="212" x2="270" y2="212" stroke="url(#wave)" stroke-width="15" stroke-linecap="round"/>
  <line x1="178" y1="246" x2="252" y2="246" stroke="url(#wave)" stroke-width="15" stroke-linecap="round" opacity="0.62"/>
  <line x1="193" y1="280" x2="237" y2="280" stroke="url(#wave)" stroke-width="15" stroke-linecap="round" opacity="0.36"/>

  <!-- Q tail: flowing stream -->
  <path d="M 297 306 C 356 312 388 352 370 402 C 358 438 314 456 278 442" fill="none" stroke="url(#stream)" stroke-width="36" stroke-linecap="round"/>

  <!-- droplet -->
  <circle cx="252" cy="446" r="16" fill="url(#stream)"/>
  <circle cx="249" cy="443" r="5" fill="#ffffff" opacity="0.55"/>

  <!-- qaf dots -->
  <circle cx="300" cy="76" r="10" fill="#67e8f9"/>
  <circle cx="300" cy="76" r="15" fill="#22d3ee" opacity="0.4" filter="url(#soft)"/>
  <circle cx="356" cy="98" r="8" fill="#67e8f9"/>
  <circle cx="356" cy="98" r="12" fill="#22d3ee" opacity="0.4" filter="url(#soft)"/>
</svg></div>
      <div><h1>اشتراک شما</h1><div class="muted">قنات — ${esc(user.username)}</div></div>
    </div>
    <div class="row"><span class="k">وضعیت</span><span><span class="badge ${statusCls}">${statusTxt}</span></span></div>
    <div class="row"><span class="k">مصرف</span><span dir="ltr">${fmtGb(user.usedGb)} / ${user.quotaGb > 0 ? fmtGb(user.quotaGb) : '∞'}</span></div>
    <div class="bar"><i class="${pct >= 100 ? 'full' : ''}" style="width:${pct.toFixed(1)}%"></i></div>
    <div class="row"><span class="k">انقضا</span><span>${user.expiry > 0 ? new Date(user.expiry).toLocaleDateString('fa-IR') : 'بدون انقضا'}</span></div>
  </div>

  <div class="card">
    <h2>🔗 لینک‌های اتصال</h2>
    ${configs}
  </div>

  <div class="card">
    <h2>📲 اسکن کد QR</h2>
    <div class="qr">${makeQrSvg(uris[0] ?? '', 10)}</div>
  </div>

  <div class="card">
    <h2>📥 دریافت کانفیگ</h2>
    <div class="links">
      <a href="${subTxt}">اشتراک متنی (base64)</a>
      <a href="${clashUrl}">Clash / Mihomo</a>
      <a href="${singboxUrl}">sing-box</a>
      <a href="javascript:void(0)" onclick="copySub()">کپی لینک اشتراک</a>
    </div>
  </div>
</div>
<script>
var SUB_URL = ${JSON.stringify(subTxt)};
function copyText(t){if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t)}else{var ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta)}}
document.querySelectorAll('[data-copy]').forEach(function(b){b.addEventListener('click',function(){b.textContent='✓ کپی شد';setTimeout(function(){b.textContent='📋 کپی'},1500);copyText(b.getAttribute('data-copy'))})});
function copySub(){copyText(SUB_URL)}
</script>
</body>
</html>`;
}

function esc(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as Record<string, string>)[c]!);
}

function fmtGb(gb: number): string {
  if (gb >= 1024) return (gb / 1024).toFixed(2) + ' TB';
  return gb.toFixed(2) + ' GB';
}
