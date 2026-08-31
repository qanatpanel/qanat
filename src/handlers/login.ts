/**
 * ورود / خروج ادمین
 * GET  /{securePath}/login  → صفحه‌ی ورود
 * POST /{securePath}/login  → اعتبارسنجی + ست کوکی
 * GET/POST /{securePath}/logout → پاک‌سازی کوکی
 */
import type { Env } from '../types/global';
import type { PanelSettings } from '../settings/main';
import { ASSETS } from '../generated/assets';
import { verifyPassword } from '../auth/password';
import { createSession, verifySessionCookie, sessionCookie, clearSessionCookie } from '../auth/session';
import { guardCheck, guardFailure, guardSuccess, clientIp } from '../auth/guard';
import { json, htmlPage, redirect, originOk } from './utils';
import { panelHtml } from './panel';

/** رندر صفحه‌ی لاگین با تزریق متغیرهای لازم (next و آدرس مطلق POST) */
export function renderLoginPage(settings: PanelSettings, next?: string | null, postUrl?: string): Response {
  let html: string = ASSETS.login;
  const inj: string[] = [];
  if (next) inj.push(`window.__NEXT__=${JSON.stringify(next)};`);
  if (postUrl) inj.push(`window.__LOGIN_POST__=${JSON.stringify(postUrl)};`);
  if (inj.length) {
    const tag = `<script>${inj.join('')}</script>`;
    html = html.includes('</head>') ? html.replace('</head>', tag + '</head>') : html + tag;
  }
  return htmlPage(html);
}

/** /Qanat بدون سشن → خودِ لاگین (بدون 302 که ممکن است در شبکه/وب‌ویو قطع شود)؛ با سشن → پنل */
export async function handleQanatEntry(request: Request, env: Env, settings: PanelSettings): Promise<Response> {
  const session = await verifySessionCookie(request, settings.jwtSecret);
  if (!session) {
    const path = new URL(request.url).pathname;
    return renderLoginPage(settings, path, `/${settings.securePath}/login`);
  }
  return htmlPage(panelHtml(settings));
}

/** اعتبارسنجی next — فقط مسیرهای نسبی امن (نه // و نه ..) */
function safeNext(next: unknown, securePath: string): string | null {
  if (typeof next !== 'string' || !next) return null;
  if (!next.startsWith('/') || next.startsWith('//') || next.includes('..')) return null;
  const lower = next.toLowerCase();
  const sp = securePath.toLowerCase();
  if (lower === '/qanat' || lower.startsWith('/qanat/')) return next;
  if (lower === '/' + sp || lower.startsWith('/' + sp + '/')) return next;
  return null;
}

export async function handleLogin(request: Request, env: Env, settings: PanelSettings): Promise<Response> {
  const ip = clientIp(request);

  if (request.method === 'GET') {
    const session = await verifySessionCookie(request, settings.jwtSecret);
    if (session) return redirect(`/${settings.securePath}/panel`);
    const next = safeNext(new URL(request.url).searchParams.get('next'), settings.securePath);
    return renderLoginPage(settings, next, `/${settings.securePath}/login`);
  }

  if (request.method === 'POST') {
    if (!originOk(request)) return json({ ok: false, error: 'forbidden' }, 403);

    // قفل بروت‌فورس
    const lock = await guardCheck(env, ip);
    if (lock.locked) {
      return json({ ok: false, error: 'locked', retryAfterSec: lock.retryAfterSec }, 429);
    }

    if (!settings.installed) return json({ ok: false, error: 'not_installed' }, 400);

    let body: { password?: unknown; next?: unknown };
    try {
      body = await request.json();
    } catch {
      return json({ ok: false, error: 'bad_request' }, 400);
    }
    const password = typeof body?.password === 'string' ? body.password : '';
    if (!password) return json({ ok: false, error: 'bad_request' }, 400);
    const next = safeNext(body?.next, settings.securePath);

    const valid = await verifyPassword(password, settings.passwordHash);
    if (!valid) {
      const g = await guardFailure(env, ip);
      if (g.locked) {
        return json({ ok: false, error: 'locked', retryAfterSec: g.retryAfterSec }, 429);
      }
      return json({ ok: false, error: 'invalid', attemptsLeft: g.attemptsLeft }, 401);
    }

    await guardSuccess(env, ip);
    const token = await createSession(settings.jwtSecret, 'admin');
    const res = json({ ok: true, redirect: next || `/${settings.securePath}/panel` });
    res.headers.append('Set-Cookie', sessionCookie(token, request.url));
    return res;
  }

  return new Response('Method Not Allowed', { status: 405 });
}

export async function handleLogout(request: Request, _env: Env, settings: PanelSettings): Promise<Response> {
  const res = redirect(`/${settings.securePath}/login`);
  res.headers.append('Set-Cookie', clearSessionCookie());
  return res;
}
