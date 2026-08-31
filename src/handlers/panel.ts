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
  return htmlPage(panelHtml(settings));
}

/** پنل با تزریق __SP__ — مسیر مطلق پایه برای API/لاگین/خروج (پنل در /Qanat هم کار کند) */
export function panelHtml(settings: PanelSettings): string {
  const tag = `<script>window.__SP__=${JSON.stringify('/' + settings.securePath)};</script>`;
  return ASSETS.panel.includes('</head>') ? ASSETS.panel.replace('</head>', tag + '</head>') : ASSETS.panel + tag;
}

export async function handleMe(request: Request, env: Env, settings: PanelSettings): Promise<Response> {
  const session = await verifySessionCookie(request, settings.jwtSecret);
  if (!session) return json({ ok: false }, 401);
  return json({ ok: true, sub: session.sub, version: __VERSION__ });
}
