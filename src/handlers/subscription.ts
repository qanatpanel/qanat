/**
 * اشتراک‌ها
 *
 * عمومی (با دانستن UUID — خود UUID راز است):
 *   GET /{securePath}/sub/{uuid}            → صفحه‌ی وضعیت/اشتراک HTML کاربر
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
import { buildUris, buildBase64Sub, buildClashConfig, buildSingboxConfig, buildVlessUri, buildTrojanUri, utf8ToB64, type BuildInput } from '../cores/config';
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
      expiry: user.expiry,
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
    const headers: Record<string, string> = { 'content-type': 'text/plain; charset=utf-8' };
    // هدرهای استاندارد اشتراک — اپ‌ها مصرف/انقضا را نمایش می‌دهند
    if (user.quotaGb > 0) {
      headers['subscription-userinfo'] =
        `upload=0; download=${Math.round(user.usedGb * 1073741824)}; total=${Math.round(user.quotaGb * 1073741824)}` +
        (user.expiry > 0 ? `; expire=${Math.floor(user.expiry / 1000)}` : '');
    }
    headers['profile-title'] = `Qanat — ${user.username}`;
    return new Response(buildBase64Sub(input), { headers });
  }

  return htmlPage(renderSubPage(input, settings, request));
}

/* ─────────────── صفحه‌ی وضعیت/اشتراک HTML ─────────────── */

interface AppDef {
  id: string;
  name: string;
  tag: string;
  badge: string; // برچسب پلتفرم (Android / iOS / هر دو)
  dl: { android?: string; ios?: string; web: string };
  icon: string; // SVG
}

function appDefs(): AppDef[] {
  return [
    {
      id: 'hiddify',
      name: 'Hiddify',
      tag: 'ساده و قدرتمند، چندپلتفرم',
      badge: 'Android · iOS · ویندوز',
      dl: {
        android: 'https://play.google.com/store/apps/details?id=app.hiddify.com',
        ios: 'https://apps.apple.com/app/id1612825540',
        web: 'https://hiddify.com/app/',
      },
      icon: `<svg viewBox="0 0 64 64"><defs><linearGradient id="gh" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#38bdf8"/><stop offset="1" stop-color="#1d4ed8"/></linearGradient></defs><rect width="64" height="64" rx="16" fill="url(#gh)"/><circle cx="32" cy="32" r="24" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="2"/><path d="M20 45V19h4l14 16V19h4v26h-4L24 29v16z" fill="#fff"/></svg>`,
    },
    {
      id: 'v2rayng',
      name: 'v2rayNG',
      tag: 'کلاسیک و سبک برای اندروید',
      badge: 'Android',
      dl: { android: 'https://github.com/2dust/v2rayNG/releases', web: 'https://github.com/2dust/v2rayNG' },
      icon: `<svg viewBox="0 0 64 64"><defs><linearGradient id="gv" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1e293b"/><stop offset="1" stop-color="#0b1220"/></linearGradient></defs><rect width="64" height="64" rx="16" fill="url(#gv)"/><path d="M36 10L14 36h12l-4 18 22-26H32z" fill="#fbbf24"/></svg>`,
    },
    {
      id: 'v2box',
      name: 'V2Box',
      tag: 'هم‌اندروید هم آیفون',
      badge: 'Android · iOS',
      dl: {
        android: 'https://github.com/v2box/v2box/releases',
        ios: 'https://apps.apple.com/us/app/v2box-v2ray-client/id6446814690',
        web: 'https://github.com/v2box/v2box',
      },
      icon: `<svg viewBox="0 0 64 64"><defs><linearGradient id="gb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a78bfa"/><stop offset="1" stop-color="#6d28d9"/></linearGradient></defs><rect width="64" height="64" rx="16" fill="url(#gb)"/><rect x="14" y="20" width="36" height="30" rx="7" fill="none" stroke="#fff" stroke-width="4"/><path d="M22 20l10 14 10-14M32 34v10" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    },
    {
      id: 'happ',
      name: 'Happ',
      tag: 'مدرن و سریع روی Xray',
      badge: 'Android · iOS',
      dl: {
        android: 'https://play.google.com/store/apps/details?id=com.happproxy',
        ios: 'https://github.com/Happ-proxy/happ-ios/releases',
        web: 'https://github.com/Happ-proxy',
      },
      icon: `<svg viewBox="0 0 64 64"><defs><linearGradient id="gp" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2dd4bf"/><stop offset="1" stop-color="#0f766e"/></linearGradient></defs><rect width="64" height="64" rx="16" fill="url(#gp)"/><path d="M18 46V18h6v10h16V18h6v28h-6V34H24v12z" fill="#fff"/></svg>`,
    },
  ];
}

/** deep-link های نصب اشتراک برای هر اپ */
function appDeepLinks(subTxtUrl: string, username: string): Record<string, string> {
  return {
    hiddify: `hiddify://install-sub?url=${encodeURIComponent(subTxtUrl)}`,
    v2rayng: `v2rayng://install-config?url=${btoa(subTxtUrl)}`,
    v2box: `v2box://install-sub?url=${encodeURIComponent(subTxtUrl)}&name=${encodeURIComponent(username)}`,
    happ: `happ://install-config?url=${btoa(subTxtUrl)}`,
  };
}

function renderSubPage(b: BuildInput, settings: PanelSettings, request: Request): string {
  const origin = subOrigin(request);
  const { user, proxy } = b;
  const uris = buildUris(b);
  const now = Date.now();
  const expired = user.expiry > 0 && user.expiry < now;
  const statusTxt = !user.isActive ? 'غیرفعال' : expired ? 'منقضی' : 'فعال';
  const statusCls = !user.isActive ? 'bad' : expired ? 'bad' : 'ok';
  const pct = user.quotaGb > 0 ? Math.min(100, (user.usedGb / user.quotaGb) * 100) : 0;
  const hasExpiry = user.expiry > 0;
  const daysLeft = hasExpiry ? Math.max(0, Math.ceil((user.expiry - now) / 86400000)) : null;

  const subUrl = `${origin}/${settings.securePath}/sub/${user.uuid}`;
  const subTxtUrl = subUrl + '/txt';
  const clashUrl = subUrl + '?format=clash';
  const singboxUrl = subUrl + '?format=singbox';

  const deep = appDeepLinks(subTxtUrl, user.username);
  const apps = appDefs();

  const appTiles = apps
    .map(
      (a, i) => `
      <div class="app-tile" data-app="${a.id}" data-ios="${a.dl.ios ? 1 : 0}" data-android="${a.dl.android ? 1 : 0}" style="--i:${i}">
        <div class="app-icon">${a.icon}</div>
        <div class="app-info">
          <div class="app-name">${esc(a.name)}</div>
          <div class="app-tag">${esc(a.tag)}</div>
        </div>
        <a class="app-cta" href="${esc(deep[a.id] ?? '')}">افزودن اشتراک
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7M9 7h8v8"/></svg>
        </a>
        <a class="app-dl" href="${esc(a.dl.web)}" target="_blank" rel="noopener">دانلود اپ ↓</a>
      </div>`,
    )
    .join('');

  const configs = uris
    .map(
      (uri) => `
      <details class="cfg">
        <summary>
          <span class="cfg-flag">${uri.startsWith('vless') ? 'VLESS' : 'Trojan'}</span>
          <code>${esc(uri)}</code>
          <button class="copy" data-copy="${esc(uri)}">کپی</button>
        </summary>
        <div class="cfg-body">
          <div class="cfg-qr">${makeQrSvg(uri, 5, 1)}</div>
          <p class="muted">اسکن کنید یا کپی کنید و در اپ جای‌گذاری کنید.</p>
        </div>
      </details>`,
    )
    .join('');

  // QR ها: اشتراک / VLESS / Trojan
  const qrSub = makeQrSvg(subTxtUrl, 10, 2);
  const qrVless = makeQrSvg(uris[0] ?? '', 10, 2);
  const qrTrojan = makeQrSvg(uris[1] ?? '', 10, 2);

  return `<!DOCTYPE html>
<html lang="fa" dir="rtl" data-theme="dark">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>
<title>اشتراک ${esc(user.username)} | قنات</title>
<meta name="theme-color" content="#05080f"/>
<link rel="icon" href="data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2064%2064%22%3E%0A%20%20%3Cdefs%3E%0A%20%20%20%20%3ClinearGradient%20id%3D%22s%22%20gradientUnits%3D%22userSpaceOnUse%22%20x1%3D%2214%22%20y1%3D%2210%22%20x2%3D%2250%22%20y2%3D%2254%22%3E%0A%20%20%20%20%20%20%3Cstop%20offset%3D%220%22%20stop-color%3D%22%2357e6ff%22/%3E%0A%20%20%20%20%20%20%3Cstop%20offset%3D%221%22%20stop-color%3D%22%2314b8a6%22/%3E%0A%20%20%20%20%3C/linearGradient%3E%0A%20%20%3C/defs%3E%0A%20%20%3Ccircle%20cx%3D%2227%22%20cy%3D%2229%22%20r%3D%2214.5%22%20fill%3D%22none%22%20stroke%3D%22url%28%23s%29%22%20stroke-width%3D%225.5%22%20stroke-linecap%3D%22round%22/%3E%0A%20%20%3Cpath%20d%3D%22M37%2038c7.5%201%2010.5%207%208.5%2012.5-1.2%203.4-5.4%205.4-9%204%22%20fill%3D%22none%22%20stroke%3D%22url%28%23s%29%22%20stroke-width%3D%225.5%22%20stroke-linecap%3D%22round%22/%3E%0A%20%20%3Ccircle%20cx%3D%2241%22%20cy%3D%229%22%20r%3D%222.1%22%20fill%3D%22%2367e8f9%22/%3E%0A%20%20%3Ccircle%20cx%3D%2249.5%22%20cy%3D%2213.5%22%20r%3D%221.7%22%20fill%3D%22%2367e8f9%22/%3E%0A%3C/svg%3E"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;600;700;800;900&display=swap" rel="stylesheet"/>
<style>
:root{
  --bg:#05080f;--bg2:#081120;--card:rgba(15,23,42,.66);--card2:rgba(30,41,59,.5);
  --line:rgba(148,163,184,.14);--line2:rgba(148,163,184,.26);
  --text:#e8eef7;--muted:#93a1b8;--accent:#22d3ee;--accent2:#14b8a6;
  --ok:#34d399;--bad:#f87171;--warn:#fbbf24;
  --glow:0 0 0 1px rgba(34,211,238,.12),0 18px 50px -12px rgba(14,165,233,.25);
  --radius:22px;--radius-sm:14px;
}
html[data-theme="light"]{
  --bg:#eef4fb;--bg2:#e3ecf7;--card:rgba(255,255,255,.78);--card2:rgba(240,246,255,.85);
  --line:rgba(15,23,42,.1);--line2:rgba(15,23,42,.18);
  --text:#0b1526;--muted:#5b6b84;--accent:#0891b2;--accent2:#0d9488;
  --ok:#059669;--bad:#dc2626;--warn:#d97706;
  --glow:0 0 0 1px rgba(8,145,178,.1),0 18px 40px -18px rgba(8,145,178,.25);
}
*{box-sizing:border-box;margin:0;padding:0}
html{-webkit-text-size-adjust:100%}
body{font-family:'Vazirmatn',system-ui,-apple-system,sans-serif;background:var(--bg);color:var(--text);min-height:100vh;overflow-x:hidden;transition:background .5s,color .5s}
/* ── پس‌زمینه: آب و نور ── */
.bg{position:fixed;inset:0;z-index:-1;overflow:hidden;background:
  radial-gradient(1100px 520px at 85% -10%,rgba(14,116,144,.28),transparent 60%),
  radial-gradient(800px 480px at -10% 108%,rgba(6,95,122,.26),transparent 55%),
  linear-gradient(180deg,var(--bg2),var(--bg) 55%)}
html[data-theme="light"] .bg{background:
  radial-gradient(1100px 520px at 85% -10%,rgba(56,189,248,.22),transparent 60%),
  radial-gradient(800px 480px at -10% 108%,rgba(45,212,191,.18),transparent 55%),
  linear-gradient(180deg,#eef4fb,#e6eef8)}
.aurora{position:absolute;border-radius:50%;filter:blur(70px);opacity:.5;animation:drift 26s ease-in-out infinite alternate}
.a1{width:520px;height:520px;top:-160px;right:-120px;background:radial-gradient(circle,rgba(34,211,238,.5),transparent 65%)}
.a2{width:460px;height:460px;bottom:-180px;left:-140px;background:radial-gradient(circle,rgba(20,184,166,.45),transparent 65%);animation-delay:-9s}
.a3{width:380px;height:380px;top:38%;left:52%;background:radial-gradient(circle,rgba(59,130,246,.3),transparent 65%);animation-delay:-17s}
@keyframes drift{0%{transform:translate(0,0) scale(1)}50%{transform:translate(-40px,30px) scale(1.12)}100%{transform:translate(36px,-28px) scale(.96)}}
.streams i{position:absolute;left:-30%;height:1px;background:linear-gradient(90deg,transparent,rgba(34,211,238,.5),transparent);width:80%;animation:flow 14s linear infinite;opacity:.35}
.streams i:nth-child(1){top:22%;animation-duration:16s}
.streams i:nth-child(2){top:58%;animation-duration:22s;animation-delay:-8s}
.streams i:nth-child(3){top:84%;animation-duration:18s;animation-delay:-4s}
@keyframes flow{from{transform:translateX(-30vw)}to{transform:translateX(140vw)}}
html[dir="rtl"] .streams i{animation-name:flow-r}
@keyframes flow-r{from{transform:translateX(30vw)}to{transform:translateX(-140vw)}}
.particle{position:absolute;bottom:-12px;border-radius:50%;background:radial-gradient(circle,rgba(103,232,249,.9),rgba(34,211,238,.15) 70%);animation:rise linear infinite;opacity:0}
@keyframes rise{0%{transform:translateY(0);opacity:0}12%{opacity:.7}88%{opacity:.5}100%{transform:translateY(-108vh);opacity:0}}
/* ── چیدمان ── */
.wrap{width:100%;max-width:660px;margin:0 auto;padding:22px 16px 60px}
.card{position:relative;background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:22px;margin-bottom:16px;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);box-shadow:var(--glow);animation:up .6s cubic-bezier(.2,.7,.2,1) both}
@keyframes up{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
.card:nth-child(2){animation-delay:.05s}.card:nth-child(3){animation-delay:.1s}.card:nth-child(4){animation-delay:.15s}.card:nth-child(5){animation-delay:.2s}
h1{font-size:19px;font-weight:800}h2{font-size:15.5px;font-weight:800;margin-bottom:4px;display:flex;align-items:center;gap:8px}
h2 .ico{font-size:17px}
.muted{color:var(--muted);font-size:12.5px;line-height:1.9}
.sm{font-size:11.5px}
/* ── هیرو ── */
.hero{overflow:hidden}
.hero::after{content:'';position:absolute;inset:0;background:linear-gradient(120deg,transparent 55%,rgba(34,211,238,.06));pointer-events:none}
.hero-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;position:relative;z-index:1}
.brand{display:flex;align-items:center;gap:13px}
.logo{width:52px;height:52px;flex:none;filter:drop-shadow(0 8px 22px rgba(34,211,238,.4));animation:float 5s ease-in-out infinite}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
.logo svg{width:100%;height:100%;display:block;border-radius:15px}
.hero-actions{display:flex;gap:8px}
.icon-btn{width:38px;height:38px;border-radius:12px;border:1px solid var(--line2);background:var(--card2);color:var(--text);cursor:pointer;font-size:16px;display:grid;place-items:center;transition:.2s}
.icon-btn:hover{border-color:var(--accent);transform:translateY(-2px)}
.hero-sub{margin-top:16px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;position:relative;z-index:1}
.status-pill{display:inline-flex;align-items:center;gap:7px;padding:6px 15px;border-radius:999px;font-size:12.5px;font-weight:800;border:1px solid}
.status-pill .dot{width:8px;height:8px;border-radius:50%;position:relative}
.status-pill.ok{color:var(--ok);border-color:rgba(52,211,153,.35);background:rgba(52,211,153,.1)}
.status-pill.ok .dot{background:var(--ok);animation:pulse 2s infinite}
.status-pill.bad{color:var(--bad);border-color:rgba(248,113,113,.35);background:rgba(248,113,113,.1)}
.status-pill.bad .dot{background:var(--bad)}
@keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(52,211,153,.55)}55%{box-shadow:0 0 0 7px rgba(52,211,153,0)}}
.water-txt{font-size:12px;color:var(--muted)}
.water-txt b{color:var(--accent);font-weight:800}
/* ── آمار ── */
.stats{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.stat{display:flex;flex-direction:column;align-items:center;gap:4px;padding:20px 14px}
.stat .k{font-size:11.5px;color:var(--muted);font-weight:700}
.ring{position:relative;width:118px;height:118px}
.ring svg{width:100%;height:100%;transform:rotate(-90deg)}
.ring .bgc{fill:none;stroke:var(--card2);stroke-width:9}
.ring .fgc{fill:none;stroke:url(#ringGrad);stroke-width:9;stroke-linecap:round;stroke-dasharray:326.7;stroke-dashoffset:326.7;transition:stroke-dashoffset 1.4s cubic-bezier(.2,.7,.2,1)}
.ring .full{stroke:url(#ringGradWarn)}
.ring-c{position:absolute;inset:0;display:grid;place-items:center;font-size:20px;font-weight:900;color:var(--accent)}
.ring-c small{font-size:10px;color:var(--muted);display:block;text-align:center;font-weight:600}
.ring-cap{font-size:12.5px;font-weight:700;color:var(--muted)}
.ring-cap b{color:var(--text)}
.cd{display:flex;gap:7px;margin-top:6px}
.cd .unit{min-width:52px;background:var(--card2);border:1px solid var(--line);border-radius:12px;padding:8px 4px;text-align:center}
.cd .num{font-size:18px;font-weight:900;color:var(--accent);font-variant-numeric:tabular-nums}
.cd .lbl{font-size:9.5px;color:var(--muted);font-weight:700}
.cd-note{margin-top:8px;font-size:11.5px;color:var(--muted)}
.cd-note .warn{color:var(--warn);font-weight:700}
/* ── اپ‌ها ── */
.apps{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px}
.app-tile{position:relative;display:flex;flex-direction:column;gap:10px;padding:14px;border:1px solid var(--line);border-radius:var(--radius-sm);background:var(--card2);transition:.25s;opacity:0;transform:translateY(10px);animation:up .5s cubic-bezier(.2,.7,.2,1) both;animation-delay:calc(var(--i)*.07s + .2s)}
.app-tile:hover{border-color:var(--accent);transform:translateY(-3px);box-shadow:0 12px 30px -12px rgba(34,211,238,.35)}
.app-tile .best{position:absolute;top:-9px;inset-inline-start:10px;font-size:9.5px;font-weight:800;color:#04222b;background:linear-gradient(90deg,#22d3ee,#2dd4bf);padding:2px 10px;border-radius:999px;display:none}
.app-tile.reco .best{display:block}
.app-row{display:flex;align-items:center;gap:11px}
.app-icon{width:46px;height:46px;flex:none;border-radius:13px;box-shadow:0 8px 18px -6px rgba(0,0,0,.45)}
.app-icon svg{width:100%;height:100%;display:block}
.app-name{font-size:14px;font-weight:800}
.app-tag{font-size:10.5px;color:var(--muted);line-height:1.6}
.app-cta{display:flex;align-items:center;justify-content:center;gap:6px;padding:9px;border-radius:11px;background:linear-gradient(90deg,rgba(34,211,238,.16),rgba(20,184,166,.16));border:1px solid rgba(34,211,238,.35);color:var(--accent);font-size:12.5px;font-weight:800;text-decoration:none;transition:.2s}
.app-cta:hover{background:linear-gradient(90deg,rgba(34,211,238,.3),rgba(20,184,166,.3));transform:scale(1.02)}
.app-cta svg{width:14px;height:14px}
.app-dl{position:absolute;top:12px;inset-inline-end:12px;font-size:10px;color:var(--muted);text-decoration:none;border-bottom:1px dashed var(--line2)}
.app-dl:hover{color:var(--accent)}
.plat-tip{margin-top:12px;padding:10px 13px;border-radius:12px;border:1px dashed var(--line2);font-size:11.5px;color:var(--muted);display:none}
.plat-tip.show{display:block}
.plat-tip b{color:var(--accent)}
/* ── QR ── */
.qr-tabs{display:flex;gap:8px;margin-top:12px}
.qr-tab{flex:1;padding:9px;border-radius:11px;border:1px solid var(--line);background:var(--card2);color:var(--muted);cursor:pointer;font-family:inherit;font-size:12px;font-weight:700;transition:.2s}
.qr-tab.active{color:var(--accent);border-color:rgba(34,211,238,.45);background:rgba(34,211,238,.1)}
.qr-frame{display:flex;flex-direction:column;align-items:center;gap:10px;margin-top:16px}
.qr-frame .box{background:#fff;padding:12px;border-radius:18px;box-shadow:0 14px 40px -12px rgba(0,0,0,.5);line-height:0}
.qr-frame .box svg{width:210px;height:210px;display:block}
.qr-frame[hidden]{display:none}
/* ── کانفیگ‌ها ── */
.cfg{border:1px solid var(--line);border-radius:var(--radius-sm);background:var(--card2);margin-bottom:10px;overflow:hidden}
.cfg summary{display:flex;align-items:center;gap:9px;padding:11px 13px;cursor:pointer;list-style:none}
.cfg summary::-webkit-details-marker{display:none}
.cfg summary::before{content:'▸';color:var(--muted);font-size:12px;transition:.2s;flex:none}
.cfg[open] summary::before{transform:rotate(90deg)}
.cfg-flag{flex:none;font-size:9.5px;font-weight:800;padding:3px 9px;border-radius:999px;background:rgba(34,211,238,.14);color:var(--accent);letter-spacing:.5px}
.cfg summary code{flex:1;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:10.5px;direction:ltr;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--muted)}
.copy{flex:none;border:1px solid var(--line2);background:var(--card);color:var(--text);border-radius:9px;padding:6px 12px;cursor:pointer;font-family:inherit;font-size:11px;font-weight:700;transition:.2s}
.copy:hover{border-color:var(--accent);color:var(--accent)}
.copy.ok{border-color:var(--ok);color:var(--ok)}
.cfg-body{display:flex;flex-direction:column;align-items:center;gap:8px;padding:12px}
.cfg-body .box{background:#fff;padding:8px;border-radius:12px;line-height:0}
.cfg-body .box svg{width:130px;height:130px;display:block}
/* ── فرمت‌ها ── */
.links{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px}
.links a,.links button{display:flex;align-items:center;justify-content:center;gap:8px;padding:12px;border:1px solid var(--line);border-radius:13px;color:var(--text);text-decoration:none;font-family:inherit;font-size:12.5px;font-weight:700;background:var(--card2);cursor:pointer;transition:.2s}
.links a:hover,.links button:hover{border-color:var(--accent);color:var(--accent);transform:translateY(-2px)}
.links .full{grid-column:1/-1}
.links svg{width:15px;height:15px}
/* ── فوتر ── */
.foot{text-align:center;margin-top:22px;color:var(--muted);font-size:11px;opacity:.75}
.foot .wave{display:inline-block;animation:wave 1.6s ease-in-out infinite}
@keyframes wave{0%,100%{transform:rotate(0)}25%{transform:rotate(12deg)}75%{transform:rotate(-12deg)}}
@media (max-width:560px){
  .wrap{padding:14px 12px 44px}
  .card{padding:18px;border-radius:18px}
  .stats{grid-template-columns:1fr}
  .apps{grid-template-columns:1fr 1fr;gap:10px}
  .app-tile{padding:12px}
  .app-icon{width:40px;height:40px}
}
@media (max-width:380px){
  .apps{grid-template-columns:1fr}
}
</style>
<script>
try{var th=localStorage.getItem('qanat-theme');if(th)document.documentElement.setAttribute('data-theme',th)}catch(e){}
</script>
</head>
<body>
<div class="bg" aria-hidden="true">
  <div class="aurora a1"></div><div class="aurora a2"></div><div class="aurora a3"></div>
  <div class="streams"><i></i><i></i><i></i></div>
</div>

<div class="wrap">

  <!-- ═══════ هیرو ═══════ -->
  <header class="card hero">
    <div class="hero-top">
      <div class="brand">
        <div class="logo"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="tile" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0d1836"/><stop offset="0.55" stop-color="#0b2340"/><stop offset="1" stop-color="#07293e"/>
    </linearGradient>
    <linearGradient id="stream" gradientUnits="userSpaceOnUse" x1="150" y1="120" x2="380" y2="460">
      <stop offset="0" stop-color="#57e6ff"/><stop offset="0.5" stop-color="#22d3ee"/><stop offset="1" stop-color="#14b8a6"/>
    </linearGradient>
    <linearGradient id="wave" gradientUnits="userSpaceOnUse" x1="0" y1="205" x2="0" y2="295">
      <stop offset="0" stop-color="#8ef0ff" stop-opacity="0.95"/><stop offset="1" stop-color="#2dd4bf" stop-opacity="0.5"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.42" r="0.62">
      <stop offset="0" stop-color="#22d3ee" stop-opacity="0.24"/><stop offset="1" stop-color="#22d3ee" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="7"/></filter>
  </defs>
  <rect rx="118" fill="url(#tile)"/>
  <rect rx="118" fill="url(#glow)"/>
  <rect x="9" y="9" width="494" height="494" rx="110" fill="none" stroke="#ffffff" stroke-opacity="0.07" stroke-width="2"/>
  <circle cx="215" cy="238" r="152" fill="none" stroke="#57e6ff" stroke-opacity="0.08" stroke-width="2"/>
  <circle cx="215" cy="238" r="172" fill="none" stroke="#57e6ff" stroke-opacity="0.05" stroke-width="2"/>
  <circle cx="215" cy="238" r="110" fill="none" stroke="url(#stream)" stroke-width="36" stroke-linecap="round"/>
  <line x1="160" y1="212" x2="270" y2="212" stroke="url(#wave)" stroke-width="15" stroke-linecap="round"/>
  <line x1="178" y1="246" x2="252" y2="246" stroke="url(#wave)" stroke-width="15" stroke-linecap="round" opacity="0.62"/>
  <line x1="193" y1="280" x2="237" y2="280" stroke="url(#wave)" stroke-width="15" stroke-linecap="round" opacity="0.36"/>
  <path d="M 297 306 C 356 312 388 352 370 402 C 358 438 314 456 278 442" fill="none" stroke="url(#stream)" stroke-width="36" stroke-linecap="round"/>
  <circle cx="252" cy="446" r="16" fill="url(#stream)"/>
  <circle cx="249" cy="443" r="5" fill="#ffffff" opacity="0.55"/>
  <circle cx="300" cy="76" r="10" fill="#67e8f9"/>
  <circle cx="300" cy="76" r="15" fill="#22d3ee" opacity="0.4" filter="url(#soft)"/>
  <circle cx="356" cy="98" r="8" fill="#67e8f9"/>
  <circle cx="356" cy="98" r="12" fill="#22d3ee" opacity="0.4" filter="url(#soft)"/>
</svg></div>
        <div>
          <h1>اشتراک شما</h1>
          <div class="muted">قنات · ${esc(user.username)}</div>
        </div>
      </div>
      <div class="hero-actions">
        <button id="theme-btn" class="icon-btn" title="تغییر تم">🌙</button>
        <button id="share-btn" class="icon-btn" title="اشتراک‌گذاری لینک">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
        </button>
      </div>
    </div>
    <div class="hero-sub">
      <span class="status-pill ${statusCls}"><span class="dot"></span>${statusTxt}</span>
      <span class="water-txt">${hasExpiry && !expired && daysLeft !== null && daysLeft <= 7 ? '⚠️ <b>' + daysLeft + '</b> روز تا پایان — تمدید کن!' : '🌊 جریان تو فعاله'}</span>
    </div>
  </header>

  <!-- ═══════ آمار ═══════ -->
  <div class="stats">
    <div class="card stat">
      <span class="k">مصرف ترافیک</span>
      <div class="ring">
        <svg viewBox="0 0 118 118">
          <defs>
            <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#22d3ee"/><stop offset="1" stop-color="#14b8a6"/></linearGradient>
            <linearGradient id="ringGradWarn" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbbf24"/><stop offset="1" stop-color="#ef4444"/></linearGradient>
          </defs>
          <circle class="bgc" cx="59" cy="59" r="52"/>
          <circle class="fgc ${pct >= 100 ? 'full' : ''}" id="ring-fg" cx="59" cy="59" r="52"/>
        </svg>
        <div class="ring-c"><div>${pct.toFixed(0)}%<small>استفاده</small></div></div>
      </div>
      <div class="ring-cap"><b dir="ltr">${fmtGb(user.usedGb)}</b> از ${user.quotaGb > 0 ? fmtGb(user.quotaGb) : '∞'}</div>
    </div>

    <div class="card stat">
      <span class="k">${expired ? 'انقضا گذشته' : hasExpiry ? 'زمان باقی‌مانده' : 'انقضا'}</span>
      ${hasExpiry && !expired
        ? `<div class="cd" id="countdown">
            <div class="unit"><div class="num" id="cd-d">--</div><div class="lbl">روز</div></div>
            <div class="unit"><div class="num" id="cd-h">--</div><div class="lbl">ساعت</div></div>
            <div class="unit"><div class="num" id="cd-m">--</div><div class="lbl">دقیقه</div></div>
            <div class="unit"><div class="num" id="cd-s">--</div><div class="lbl">ثانیه</div></div>
          </div>
          <div class="cd-note">تا <b dir="ltr">${new Date(user.expiry).toLocaleDateString('fa-IR')}</b></div>`
        : hasExpiry
          ? `<div class="cd-note warn" style="margin-top:14px;font-size:15px;font-weight:800">⛔ اشتراک در ${new Date(user.expiry).toLocaleDateString('fa-IR')} منقضی شده</div>`
          : `<div class="cd-note" style="margin-top:14px;font-size:15px;font-weight:800">♾️ بدون محدودیت زمان</div>`}
    </div>
  </div>

  <!-- ═══════ نصب سریع اپ ═══════ -->
  <section class="card">
    <h2><span class="ico">⚡</span> نصب سریع با یک لمس</h2>
    <p class="muted">روی اپ خودت بزن — اشتراک <b>${esc(user.username)}</b> خودکار داخلش اضافه می‌شود و به‌روز می‌ماند.</p>
    <div class="apps" id="apps">${appTiles}</div>
    <div class="plat-tip" id="plat-tip"></div>
  </section>

  <!-- ═══════ QR ═══════ -->
  <section class="card">
    <h2><span class="ico">📲</span> اسکن کن، وصل شو</h2>
    <p class="muted">با دوربین اپ، کد را اسکن کن — کانفیگ به‌صورت خودکار وارد می‌شود.</p>
    <div class="qr-tabs">
      <button class="qr-tab active" data-qr="sub">🔗 اشتراک</button>
      <button class="qr-tab" data-qr="vless" ${uris[0] ? '' : 'disabled'}>VLESS</button>
      <button class="qr-tab" data-qr="trojan" ${uris[1] ? '' : 'disabled'}>Trojan</button>
    </div>
    <div class="qr-frame" data-qr="sub">
      <div class="box">${qrSub}</div>
      <span class="muted sm">کد اشتراک — در اپ وارد و آپدیت می‌شود</span>
    </div>
    <div class="qr-frame" data-qr="vless" ${uris[0] ? '' : 'hidden'}>
      <div class="box">${qrVless}</div>
      <span class="muted sm">کانفیگ VLESS</span>
    </div>
    <div class="qr-frame" data-qr="trojan" ${uris[1] ? '' : 'hidden'}>
      <div class="box">${qrTrojan}</div>
      <span class="muted sm">کانفیگ Trojan</span>
    </div>
  </section>

  <!-- ═══════ کانفیگ‌ها ═══════ -->
  ${uris.length ? `
  <section class="card">
    <h2><span class="ico">🔐</span> کانفیگ دستی</h2>
    <p class="muted">برای اتصال دستی — روی هر کانفیگ بزن تا باز شود، یا کپی کن.</p>
    <div style="margin-top:12px">${configs}</div>
  </section>` : ''}

  <!-- ═══════ فرمت‌ها ═══════ -->
  <section class="card">
    <h2><span class="ico">🧩</span> خروجی‌ها و فرمت‌ها</h2>
    <div class="links">
      <a href="${esc(subTxtUrl)}">📄 اشتراک متنی (base64)</a>
      <a href="${esc(clashUrl)}">🐉 Clash / Mihomo</a>
      <a href="${esc(singboxUrl)}">📦 sing-box</a>
      <button class="full" id="copy-sub">🔗 کپی لینک اشتراک</button>
    </div>
  </section>

  <div class="foot">قنات <span class="wave">💙</span> — جریان بی‌پایان</div>
</div>

<script>
(function(){
  var SUB_URL = ${JSON.stringify(subTxtUrl)};
  var EXPIRY = ${user.expiry > 0 ? user.expiry : 0};
  var RING_C = 326.7, PCT = ${pct.toFixed(2)}, FULL = ${pct >= 100};

  /* ── تم ── */
  var root=document.documentElement, themeBtn=document.getElementById('theme-btn');
  function syncTheme(){var d=root.getAttribute('data-theme');themeBtn.textContent=d==='light'?'🌙':'☀️';try{localStorage.setItem('qanat-theme',d)}catch(e){}}
  syncTheme();
  themeBtn.addEventListener('click',function(){root.setAttribute('data-theme',root.getAttribute('data-theme')==='light'?'dark':'light');syncTheme()});

  /* ── رینگ مصرف ── */
  var ring=document.getElementById('ring-fg');
  requestAnimationFrame(function(){requestAnimationFrame(function(){ring.style.strokeDashoffset=(RING_C*(1-PCT/100)).toFixed(1)})});

  /* ── شمارش معکوس ── */
  function pad(n){return n<10?'0'+n:''+n}
  function tick(){
    if(!EXPIRY||Date.now()>=EXPIRY)return;
    var s=Math.max(0,Math.floor((EXPIRY-Date.now())/1000));
    var d=Math.floor(s/86400),h=Math.floor(s%86400/3600),m=Math.floor(s%3600/60),sec=s%60;
    var el=function(id){return document.getElementById(id)};
    el('cd-d').textContent=d;el('cd-h').textContent=pad(h);el('cd-m').textContent=pad(m);el('cd-s').textContent=pad(sec);
  }
  tick();setInterval(tick,1000);

  /* ── تب‌های QR ── */
  var tabs=document.querySelectorAll('.qr-tab');
  tabs.forEach(function(t){t.addEventListener('click',function(){
    tabs.forEach(function(x){x.classList.remove('active')});t.classList.add('active');
    document.querySelectorAll('.qr-frame').forEach(function(f){f.hidden=f.getAttribute('data-qr')!==t.getAttribute('data-qr')});
  })});

  /* ── کپی ── */
  function copyText(t,btn){
    function done(){if(btn){var old=btn.textContent;btn.textContent='✓ کپی شد';btn.classList.add('ok');setTimeout(function(){btn.textContent=old;btn.classList.remove('ok')},1400)}}
    if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(done).catch(function(){fallback();done()})}else{fallback();done()}
    function fallback(){var ta=document.createElement('textarea');ta.value=t;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();try{document.execCommand('copy')}catch(e){}document.body.removeChild(ta)}
  }
  document.querySelectorAll('[data-copy]').forEach(function(b){b.addEventListener('click',function(){copyText(b.getAttribute('data-copy'),b)})});
  document.getElementById('copy-sub').addEventListener('click',function(){copyText(SUB_URL,this)});

  /* ── اشتراک‌گذاری ── */
  document.getElementById('share-btn').addEventListener('click',function(){
    if(navigator.share){navigator.share({title:'اشتراک قنات',text:'لینک اشتراک شما',url:SUB_URL}).catch(function(){})}
    else{var btn=this;copyText(SUB_URL,btn);btn.innerHTML='✓';setTimeout(function(){btn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>'},1400)}
  });

  /* ── تشخیص پلتفرم و ترتیب اپ‌ها ── */
  var ua=navigator.userAgent, isIOS=/iPad|iPhone|iPod/.test(ua), isAndroid=/Android/.test(ua);
  var tip=document.getElementById('plat-tip');
  document.querySelectorAll('.app-tile').forEach(function(tile){
    var ios=+tile.getAttribute('data-ios'), and=+tile.getAttribute('data-android');
    if(isIOS&&!ios){tile.style.display='none'}
    else if(isAndroid&&!and){tile.style.display='none'}
    if(isIOS&&ios){tile.classList.add('reco')}
    if(isAndroid&&and){tile.classList.add('reco')}
  });
  if(isIOS||isAndroid){
    var names=[];
    document.querySelectorAll('.app-tile.reco').forEach(function(t){names.push(t.querySelector('.app-name').textContent)});
    if(names.length){tip.innerHTML='📱 روی <b>'+names.join('، ')+'</b> بزن — برای این دستگاه آماده است.';tip.classList.add('show')}
  }

  /* ── ذرات آب ── */
  (function(){
    var n=isIOS||isAndroid?9:14,wrap=document.createElement('div');
    for(var i=0;i<n;i++){
      var p=document.createElement('i');p.className='particle';
      var sz=(Math.random()*5+2.5).toFixed(1);
      p.style.cssText='left:'+(Math.random()*100).toFixed(1)+'%;width:'+sz+'px;height:'+sz+'px;animation-duration:'+(Math.random()*10+9).toFixed(1)+'s;animation-delay:-'+(Math.random()*18).toFixed(1)+'s';
      wrap.appendChild(p);
    }
    document.querySelector('.bg').appendChild(wrap);
  })();
})();
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
