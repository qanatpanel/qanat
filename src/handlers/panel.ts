/**
 * پنل — نیازمند سشن معتبر
 * GET /{securePath}/panel       → پوسته‌ی پنل
 * GET /{securePath}/panel/api/me → اطلاعات سشن (برای UI)
 */
import type { Env } from '../types/global';
import type { PanelSettings } from '../settings/main';
import { ASSETS } from '../generated/assets';
import { verifySessionCookie } from '../auth/session';
import { json, htmlPage, redirect } from './utils';

export async function handlePanel(request: Request, env: Env, settings: PanelSettings): Promise<Response> {
  const session = await verifySessionCookie(request, settings.jwtSecret);
  if (!session) {
    // اگر کاربر از میانبر /Qanat آمده، بعد از لاگین به همان /Qanat برگردد
    const path = new URL(request.url).pathname;
    const lower = path.toLowerCase();
    if (lower === '/qanat' || lower.startsWith('/qanat/')) {
      return redirect(`/${settings.securePath}/login?next=${encodeURIComponent(path)}`);
    }
    return redirect(`/${settings.securePath}/login`);
  }
  return htmlPage(ASSETS.panel);
}

export async function handleMe(request: Request, env: Env, settings: PanelSettings): Promise<Response> {
  const session = await verifySessionCookie(request, settings.jwtSecret);
  if (!session) return json({ ok: false }, 401);
  return json({ ok: true, sub: session.sub, version: __VERSION__ });
}
