/**
 * ورودی Worker — روتینگ اصلی
 *
 *   /healthz                     → پروب سلامت
 *   /install                     → نصب اولیه
 *   /{proxyPath}/{uuid|password} → WebSocket پروکسی (VLESS/Trojan) — عمومی
 *   /                            → صفحه‌ی فرود (اگر نصب نشده → /install)
 *
 *   /{securePath}/login|logout|panel          → احراز هویت + پنل
 *   /{securePath}/panel/api/*                 → API پنل (کاربران، تنظیمات، QR)
 *   /{securePath}/sub/{uuid}[/txt|?format=]   → اشتراک کاربر (عمومی با UUID)
 */
import type { Env } from './types/global';
import { ensureSchema } from './settings/db';
import { getPanelSettings } from './settings/main';
import { getProxySettings } from './settings/proxy';
import { handleInstall } from './handlers/install';
import { handleLogin, handleLogout } from './handlers/login';
import { handlePanel, handleMe } from './handlers/panel';
import { handleUsersApi, handleSettingsApi, handleQr, handleServerConfig } from './handlers/api';
import { handleSubscriptionsApi, handlePublicSub } from './handlers/subscription';
import { handleProxyWs } from './proxy/relay';
import { json, htmlPage } from './handlers/utils';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX56_RE = /^[0-9a-f]{56}$/i;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const url = new URL(request.url);
      const { pathname } = url;

      // پروب سلامت — بدون نیاز به دیتابیس
      if (pathname === '/healthz') {
        return new Response('ok', { headers: { 'content-type': 'text/plain' } });
      }

      await ensureSchema(env);
      const settings = await getPanelSettings(env);

      // نصب اولیه
      if (pathname === '/install') {
        return handleInstall(request, env, settings);
      }

      // ─── پروکسی WebSocket (مسیر عمومی ولی مخفی) ───
      if (request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
        const proxy = await getProxySettings(env, url.hostname);
        const seg = pathname.split('/').filter(Boolean);
        if (seg.length === 2 && seg[0] === proxy.proxyPath && (UUID_RE.test(seg[1]!) || HEX56_RE.test(seg[1]!))) {
          const pair = new WebSocketPair();
          const [client, server] = Object.values(pair) as [WebSocket, WebSocket];
          // رله در پس‌زمینه — پاسخ 101 فوری
          handleProxyWs(server, seg[1]!, env, proxy).catch(() => {});
          return new Response(null, { status: 101, webSocket: client });
        }
        return new Response('Not Found', { status: 404 });
      }

      // ─── مسیرهای امن پنل ───
      const prefix = `/${settings.securePath}`;
      if (pathname === prefix || pathname.startsWith(prefix + '/')) {
        const rest = pathname.slice(prefix.length) || '/';

        if (rest === '/login') return handleLogin(request, env, settings);
        if (rest === '/logout') return handleLogout(request, env, settings);
        if (rest === '/panel') return handlePanel(request, env, settings);
        if (rest === '/panel/api/me') return handleMe(request, env, settings);
        if (rest === '/panel/api/users' || rest.startsWith('/panel/api/users/'))
          return handleUsersApi(request, env, settings);
        if (rest === '/panel/api/settings' || rest.startsWith('/panel/api/settings/'))
          return handleSettingsApi(request, env, settings);
        if (rest === '/panel/api/subscriptions') return handleSubscriptionsApi(request, env, settings);
        if (rest === '/panel/api/qr') return handleQr(request, env, settings);
        if (rest === '/panel/api/config') return handleServerConfig(request, env, settings);

        // اشتراک عمومی کاربر
        const subMatch = rest.match(/^\/sub\/([0-9a-f-]{36})(\/txt)?(\?.*)?$/i);
        if (subMatch) {
          return handlePublicSub(request, env, settings, subMatch[1]!);
        }

        return new Response('Not Found', { status: 404 });
      }

      // ─── صفحه‌ی فرود ───
      if (pathname === '/') {
        if (!settings.installed) {
          return new Response(null, { status: 302, headers: { location: '/install' } });
        }
        return htmlPage(renderLanding(__VERSION__));
      }

      return new Response('Not Found', { status: 404 });
    } catch (err) {
      console.error(err);
      return new Response('Internal Server Error', { status: 500 });
    }
  },
} satisfies ExportedHandler<Env>;

function renderLanding(version: string): string {
  return `<!DOCTYPE html>
<html lang="fa" dir="rtl" data-theme="dark">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>قنات | Qanat</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,-apple-system,'Segoe UI',Tahoma,sans-serif;background:radial-gradient(900px 480px at 20% -10%,#0c1e33,transparent 60%),radial-gradient(800px 420px at 110% 110%,#062a3a,transparent 55%),#060a13;color:#e5eaf3;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
.card{text-align:center;background:#0e1524;border:1px solid #1c2740;border-radius:22px;padding:44px 40px;max-width:420px}
.logo{width:72px;height:72px;margin:0 auto 20px;filter:drop-shadow(0 8px 24px rgba(34,211,238,.35))}
.logo svg{width:100%;height:100%;display:block}
h1{font-size:24px;margin-bottom:4px}
.qanat{font-size:13px;color:#22d3ee;letter-spacing:6px;direction:ltr;font-weight:700;margin-bottom:10px}
p{color:#8b98ad;font-size:13.5px;line-height:2}
.badge{display:inline-block;margin-top:16px;padding:5px 14px;border-radius:999px;background:rgba(34,211,238,.12);color:#67e8f9;font-size:12px;direction:ltr}
</style>
</head>
<body>
<div class="card">
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
  <h1>قنات</h1>
  <div class="qanat">QANAT</div>
  <p>سرویس اشتراک اینترنت ابری — روی Cloudflare Workers</p>
  <span class="badge">v${version}</span>
</div>
</body>
</html>`;
}
