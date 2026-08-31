/**
 * اسکنر هوشمند — وضعیت اتصال فعلی
 *
 *   GET /{secure}/panel/api/scan/status
 *       وضعیت فعلی: IP ست‌شده روی کانفیگ‌ها (overrideIp) + پورت + هاست پنل.
 *       (تست پورت‌ها از سمت مرورگر انجام می‌شود — Workers نمی‌تواند به
 *        IP های خود کلودفلر TCP connect کند؛ تست از مرورگر واقعی‌تر است.)
 */
import type { Env } from '../types/global';
import type { PanelSettings } from '../settings/main';
import { verifySessionCookie } from '../auth/session';
import { json } from './utils';
import { getProxySettings } from '../settings/proxy';

export async function handleScanStatus(request: Request, env: Env, settings: PanelSettings): Promise<Response> {
  if (request.method !== 'GET') return json({ ok: false, error: 'method' }, 405);
  const authed = await verifySessionCookie(request, settings.jwtSecret);
  if (!authed) return json({ ok: false, error: 'unauthorized' }, 401);

  const url = new URL(request.url);
  const proxy = await getProxySettings(env, url.hostname);
  const host = proxy.host || url.hostname;
  const appliedIp = proxy.overrideIp || '';
  const appliedPort = proxy.overridePort || 0;

  return json({
    ok: true,
    host,
    applied: !!appliedIp,
    ip: appliedIp || null,
    port: appliedPort || null,
  });
}
