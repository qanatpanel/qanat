/**
 * نصب اولیه — تعیین پسورد ادمین
 * با claim token (ایده‌ی Nova): اگر تنظیم شده باشد، فقط با ?claim=<token> قابل نصب است
 */
import type { Env } from '../types/global';
import type { PanelSettings } from '../settings/main';
import { setAdminPassword } from '../settings/main';
import { ASSETS } from '../generated/assets';
import { json, htmlPage, redirect, originOk } from './utils';

const MIN_PASSWORD_LENGTH = 8;

export async function handleInstall(request: Request, env: Env, settings: PanelSettings): Promise<Response> {
  if (settings.installed) return redirect(`/${settings.securePath}/panel`);

  const expectedClaim = settings.claimToken || (env.CLAIM_TOKEN ?? '');
  const needClaim = expectedClaim.length > 0;
  const url = new URL(request.url);
  const claim = url.searchParams.get('claim') ?? '';
  const claimOk = !needClaim || claim === expectedClaim;

  if (request.method === 'GET') {
    const state = { denied: needClaim && !claimOk, needClaim };
    const page = ASSETS.install.replace(
      '<!--STATE-->',
      `<script>window.__INSTALL_STATE__=${JSON.stringify(state)};</script>`,
    );
    return htmlPage(page, state.denied ? 403 : 200);
  }

  if (request.method === 'POST') {
    if (!originOk(request)) return json({ ok: false, error: 'forbidden' }, 403);
    if (!claimOk) return json({ ok: false, error: 'bad_claim' }, 403);

    let body: { password?: unknown; confirm?: unknown };
    try {
      body = await request.json();
    } catch {
      return json({ ok: false, error: 'bad_request' }, 400);
    }
    const password = typeof body?.password === 'string' ? body.password : '';
    const confirm = typeof body?.confirm === 'string' ? body.confirm : '';

    if (password.length < MIN_PASSWORD_LENGTH) {
      return json({ ok: false, error: 'weak_password', min: MIN_PASSWORD_LENGTH }, 400);
    }
    if (password !== confirm) return json({ ok: false, error: 'mismatch' }, 400);

    await setAdminPassword(env, password);
    return json({ ok: true, redirect: `/${settings.securePath}/panel` });
  }

  return new Response('Method Not Allowed', { status: 405 });
}
