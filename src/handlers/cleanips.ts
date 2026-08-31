// ─── لیست IP تمیز ircf.space — رزولوشن زنده از طریق DNS-over-HTTPS ───
//
// ircf.space به‌جای لیست ثابت، ساب‌دامین‌هایی می‌دهد که با DNS به IP های تمیز
// فعلی هر اپراتور رزولوشن می‌شوند (مثل mci.ircf.space، mtn.ircf.space و...).
// این هندلر آن ساب‌دامین‌ها را رزولوشن می‌کند، نتیجه را در D1 کش می‌کند
// (TTL ۱۰ دقیقه) و برای اسکنر مرورگر سرو می‌کند.

import type { Env } from '../types/global';
import type { PanelSettings } from '../settings/main';
import { verifySessionCookie } from '../auth/session';
import { json } from './utils';
import { cacheGet, cacheSet } from '../settings/db';

const CACHE_KEY = 'ircf_clean_ips_v1';
const TTL_MS = 10 * 60 * 1000; // ۱۰ دقیقه

const IRCF_SUBS: { sub: string; isp: string }[] = [
  { sub: 'c', isp: 'عمومی' },
  { sub: 'mci', isp: 'همراه اول' },
  { sub: 'mci-c', isp: 'همراه اول (خزنده)' },
  { sub: 'mkh', isp: 'مخابرات' },
  { sub: 'mkh-c', isp: 'مخابرات (خزنده)' },
  { sub: 'mtn', isp: 'ایرانسل' },
  { sub: 'mtn-c', isp: 'ایرانسل (خزنده)' },
  { sub: 'rtl', isp: 'رایتل' },
  { sub: 'rtl-c', isp: 'رایتل (خزنده)' },
];

const DOH = [
  'https://cloudflare-dns.com/dns-query?name={q}&type=A',
  'https://dns.google/resolve?name={q}&type=A',
];

interface Resolved {
  ip: string;
  isp: string;
  sub: string;
}

async function resolveOne(sub: string): Promise<string[]> {
  const q = encodeURIComponent(sub + '.ircf.space');
  for (const tmpl of DOH) {
    try {
      const r = await fetch(tmpl.replace('{q}', q), {
        headers: { accept: 'application/dns-json' },
        signal: AbortSignal.timeout(4000),
      });
      if (!r.ok) continue;
      const d: any = await r.json().catch(() => null);
      if (!d) continue;
      const ips: string[] = (d.Answer || [])
        .filter((a: any) => a.type === 1 && /^\d{1,3}(\.\d{1,3}){3}$/.test(String(a.data)))
        .map((a: any) => String(a.data));
      if (ips.length) return ips;
    } catch {
      /* رزولور بعدی */
    }
  }
  return [];
}

async function resolveAll(): Promise<Resolved[]> {
  const results = await Promise.all(
    IRCF_SUBS.map(async (it) => {
      const ips = await resolveOne(it.sub);
      return ips.map((ip) => ({ ip, isp: it.isp, sub: it.sub + '.ircf.space' }));
    }),
  );
  const seen = new Set<string>();
  const out: Resolved[] = [];
  for (const group of results) {
    for (const item of group) {
      if (!seen.has(item.ip)) {
        seen.add(item.ip);
        out.push(item);
      }
    }
  }
  return out;
}

export async function handleCleanIps(request: Request, env: Env, settings: PanelSettings): Promise<Response> {
  if (!(await verifySessionCookie(request, settings.jwtSecret))) {
    return json({ ok: false, error: 'unauthorized' }, 401);
  }

  // ۱) کش D1
  const cached = await cacheGet(env, CACHE_KEY);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.ts && Date.now() - parsed.ts < TTL_MS && Array.isArray(parsed.items)) {
        return json({ ok: true, source: 'ircf.space', cached: true, updatedAt: parsed.ts, items: parsed.items });
      }
    } catch {
      /* کش خراب — دوباره رزولوشن */
    }
  }

  // ۲) رزولوشن زنده
  const items = await resolveAll();
  if (items.length) {
    const ts = Date.now();
    await cacheSet(env, CACHE_KEY, JSON.stringify({ ts, items })).catch(() => null);
    return json({ ok: true, source: 'ircf.space', cached: false, updatedAt: ts, items });
  }

  // ۳) کش منقضی اما موجود → هنوز قابل استفاده
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (parsed && Array.isArray(parsed.items) && parsed.items.length) {
        return json({ ok: true, source: 'ircf.space', cached: true, stale: true, updatedAt: parsed.ts, items: parsed.items });
      }
    } catch {
      /* ignore */
    }
  }

  return json({ ok: false, error: 'upstream_unavailable' }, 502);
}
