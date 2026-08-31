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
  if (!session) return redirect(`/${settings.securePath}/login`);
  return htmlPage(ASSETS.panel);
}

export async function handleMe(request: Request, env: Env, settings: PanelSettings): Promise<Response> {
  const session = await verifySessionCookie(request, settings.jwtSecret);
  if (!session) return json({ ok: false }, 401);
  return json({ ok: true, sub: session.sub, version: __VERSION__ });
}
