/**
 * API های داشبورد (همه نیازمند سشن معتبر)
 *
 *   GET    /panel/api/users              → لیست کاربران
 *   POST   /panel/api/users              → ساخت کاربر
 *   POST   /panel/api/users/:id/toggle   → فعال/غیرفعال (body: {active})
 *   DELETE /panel/api/users/:id          → حذف کاربر
 *
 *   GET    /panel/api/settings              → اطلاعات تنظیمات
 *   POST   /panel/api/settings/password     → تغییر رمز (body: {current,next,confirm})
 *   POST   /panel/api/settings/secure-path  → بازسازی مسیر مخفی
 */
import type { Env } from '../types/global';
import type { PanelSettings } from '../settings/main';
import { verifySessionCookie } from '../auth/session';
import { verifyPassword } from '../auth/password';
import { createUser, listUsers, deleteUser, setUserActive, getUserByUsername, type User } from '../settings/users';
import { regenerateSecurePath, setAdminPassword } from '../settings/main';
import { getProxySettings, saveProxySettings, regenerateProxyPath, protocolsEnabled } from '../settings/proxy';
import { getUserByUuid } from '../settings/users';
import { buildVlessUri, buildTrojanUri, type BuildInput } from '../cores/config';
import { makeQrSvg } from '../cores/qr';
import { json } from './utils';

const USERNAME_RE = /^[a-zA-Z0-9_-]{3,32}$/;
const MIN_PASSWORD_LENGTH = 8;

/** تبدیل مدل به شکل کلاینت */
function serializeUser(u: User, now: number) {
  const expired = u.expiry > 0 && u.expiry < now;
  const status = !u.isActive ? 'disabled' : expired ? 'expired' : 'active';
  return {
    id: u.id,
    username: u.username,
    uuid: u.uuid,
    quotaGb: u.quotaGb,
    usedGb: u.usedGb,
    expiry: u.expiry,
    expiryDaysLeft: u.expiry > 0 ? Math.max(0, Math.ceil((u.expiry - now) / 86400000)) : null,
    status,
    note: u.note,
    createdAt: u.createdAt,
  };
}

async function requireAuth(request: Request, settings: PanelSettings): Promise<boolean> {
  return (await verifySessionCookie(request, settings.jwtSecret)) !== null;
}

function readJson(request: Request): Promise<Record<string, unknown>> {
  return request
    .json()
    .then((body: unknown) => (body && typeof body === 'object' ? (body as Record<string, unknown>) : {}))
    .catch(() => ({}));
}

/* ─────────────── کاربران ─────────────── */

export async function handleUsersApi(request: Request, env: Env, settings: PanelSettings): Promise<Response> {
  if (!(await requireAuth(request, settings))) return json({ ok: false, error: 'unauthorized' }, 401);

  const url = new URL(request.url);
  const rest = url.pathname.split('/').filter(Boolean).slice(4);
  const now = Date.now();

  if (request.method === 'GET' && rest.length === 0) {
    const users = await listUsers(env);
    return json({ ok: true, users: users.map((u) => serializeUser(u, now)) });
  }

  if (request.method === 'POST' && rest.length === 0) {
    const body = await readJson(request);
    const username = typeof body.username === 'string' ? body.username.trim() : '';
    if (!USERNAME_RE.test(username)) {
      return json({ ok: false, error: 'invalid_username', hint: '3-32 حرف: a-z, 0-9, _ , -' }, 400);
    }
    const quotaGb = typeof body.quotaGb === 'number' && Number.isFinite(body.quotaGb) && body.quotaGb >= 0 ? body.quotaGb : 0;
    const expiryDays = typeof body.expiryDays === 'number' && Number.isFinite(body.expiryDays) && body.expiryDays >= 0 ? Math.floor(body.expiryDays) : 0;
    const note = typeof body.note === 'string' ? body.note.slice(0, 200) : '';

    const existing = await getUserByUsername(env, username);
    if (existing) return json({ ok: false, error: 'username_taken' }, 409);

    const uuid = crypto.randomUUID();
    const expiry = expiryDays > 0 ? now + expiryDays * 86400000 : 0;
    try {
      const user = await createUser(env, { username, uuid, quotaGb, expiry, note });
      return json({ ok: true, user: serializeUser(user, now) }, 201);
    } catch {
      return json({ ok: false, error: 'username_taken' }, 409);
    }
  }

  if (request.method === 'POST' && rest.length === 2 && rest[1] === 'toggle') {
    const id = Number(rest[0]);
    if (!Number.isInteger(id)) return json({ ok: false, error: 'bad_request' }, 400);
    const body = await readJson(request);
    const active = body.active === true;
    await setUserActive(env, id, active);
    return json({ ok: true, active });
  }

  if (request.method === 'DELETE' && rest.length === 1) {
    const id = Number(rest[0]);
    if (!Number.isInteger(id)) return json({ ok: false, error: 'bad_request' }, 400);
    await deleteUser(env, id);
    return json({ ok: true });
  }

  return json({ ok: false, error: 'not_found' }, 404);
}

/* ─────────────── تنظیمات ─────────────── */

export async function handleSettingsApi(request: Request, env: Env, settings: PanelSettings): Promise<Response> {
  if (!(await requireAuth(request, settings))) return json({ ok: false, error: 'unauthorized' }, 401);

  const url = new URL(request.url);
  const rest = url.pathname.split('/').filter(Boolean).slice(4);

  if (request.method === 'GET' && rest.length === 0) {
    return json({
      ok: true,
      securePath: settings.securePath,
      version: __VERSION__,
      claimTokenSet: settings.claimToken.length > 0,
      passwordSet: settings.installed,
    });
  }

  if (request.method === 'POST' && rest.length === 1 && rest[0] === 'password') {
    const body = await readJson(request);
    const current = typeof body.current === 'string' ? body.current : '';
    const next = typeof body.next === 'string' ? body.next : '';
    const confirm = typeof body.confirm === 'string' ? body.confirm : '';

    if (!(await verifyPassword(current, settings.passwordHash))) {
      return json({ ok: false, error: 'wrong_current' }, 401);
    }
    if (next.length < MIN_PASSWORD_LENGTH) {
      return json({ ok: false, error: 'weak_password', min: MIN_PASSWORD_LENGTH }, 400);
    }
    if (next !== confirm) {
      return json({ ok: false, error: 'mismatch' }, 400);
    }
    await setAdminPassword(env, next);
    return json({ ok: true });
  }

  if (request.method === 'POST' && rest.length === 1 && rest[0] === 'secure-path') {
    const sp = await regenerateSecurePath(env);
    return json({ ok: true, securePath: sp });
  }

  /* ─────── تنظیمات پروکسی ─────── */

  if (rest.length === 1 && rest[0] === 'proxy') {
    if (request.method === 'GET') {
      const proxy = await getProxySettings(env, new URL(request.url).hostname);
      return json({ ok: true, proxy });
    }
    if (request.method === 'POST') {
      const body = await readJson(request);
      const protocols = typeof body.protocols === 'string' ? body.protocols : undefined;
      if (protocols !== undefined && !['vless', 'trojan', 'both'].includes(protocols)) {
        return json({ ok: false, error: 'invalid_protocols' }, 400);
      }
      const port = typeof body.port === 'number' ? body.port : undefined;
      if (port !== undefined && (!Number.isInteger(port) || port <= 0 || port > 65535)) {
        return json({ ok: false, error: 'invalid_port' }, 400);
      }
      const proxy = await saveProxySettings(env, {
        host: typeof body.host === 'string' ? body.host : undefined,
        port,
        tls: typeof body.tls === 'boolean' ? body.tls : undefined,
        sni: typeof body.sni === 'string' ? body.sni : undefined,
        protocols,
      });
      return json({ ok: true, proxy });
    }
  }

  if (request.method === 'POST' && rest.length === 2 && rest[0] === 'proxy' && rest[1] === 'regenerate-path') {
    const proxyPath = await regenerateProxyPath(env);
    return json({ ok: true, proxyPath });
  }

  return json({ ok: false, error: 'not_found' }, 404);
}

/* ─────────────── QR Code ─────────────── */

/**
 * تولید کانفیگ با سرور جایگزین (IP تمیز) — GET /panel/api/config?server=IP&uuid=UUID
 * اتصال به IP تمیز ولی Host/SNI همچنان دامنه‌ی اصلی — این کانفیگ واقعاً کار می‌کند
 */
export async function handleServerConfig(request: Request, env: Env, settings: PanelSettings): Promise<Response> {
  if (request.method !== 'GET') return json({ ok: false, error: 'method' }, 405);
  const authed = await requireAuth(request, settings);
  if (!authed) return json({ ok: false, error: 'unauthorized' }, 401);

  const url = new URL(request.url);
  const server = (url.searchParams.get('server') || '').trim();
  const uuid = (url.searchParams.get('uuid') || '').trim();
  if (!server || !uuid) return json({ ok: false, error: 'bad_params' }, 400);

  const user = await getUserByUuid(env, uuid);
  if (!user) return json({ ok: false, error: 'not_found' }, 404);

  const proxy = await getProxySettings(env, url.hostname);
  const input: BuildInput = { user, proxy, originHost: proxy.host || url.hostname, serverHost: server };
  return json({
    ok: true,
    server,
    host: proxy.host || url.hostname,
    vless: buildVlessUri(input),
    trojan: buildTrojanUri(input),
  });
}

export async function handleQr(request: Request, env: Env, settings: PanelSettings): Promise<Response> {
  const session = await verifySessionCookie(request, settings.jwtSecret);
  if (!session) return json({ ok: false, error: 'unauthorized' }, 401);

  const url = new URL(request.url);
  const text = url.searchParams.get('text') ?? '';
  if (!text || text.length > 1000) return json({ ok: false, error: 'bad_request' }, 400);

  const svg = makeQrSvg(text, 8, 2);
  if (!svg) return json({ ok: false, error: 'qr_failed' }, 500);

  return new Response(svg, {
    headers: { 'content-type': 'image/svg+xml; charset=utf-8', 'cache-control': 'no-store' },
  });
}
