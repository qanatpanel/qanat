// ─── لیست IP تمیز — چند منبع زنده ───
//
// بررسی شد که پنل‌ها/سرویس‌های محبوب IP تمیز را از کجا می‌گیرند؛ این هندلر سه
// منبع تأییدشده را پیاده می‌کند (روش رایج: کش سمت سرور + تست پینگ سمت مرورگر):
//
//  1) ircf    — رزولوشن زنده DNS-over-HTTPS ساب‌دامین‌های ircf.space
//               (IP تمیز فعلی هر اپراتور ایرانی: همراه اول، مخابرات، ایرانسل، رایتل)
//  2) cf2dns  — ircfspace/cf2dns (github) → list/ipv4.json
//               آپدیت روزانه، شامل latency/loss/speed/line/colo برای هر IP
//  3) bestcf  — LancelotRar/best-cf-ips (github) → best-cf-ipv4.txt
//               تجمیع چند پروژه‌ی «بهترین IP» هر ۳ ساعت + پرچم کشور
//               (فقط رنج‌های رسمی کلودفلر نگه داشته می‌شوند)
//
// هر منبع کش D1 مستقل دارد (TTL ۱۰-۱۵ دقیقه) و اگر بالادست در دسترس نبود،
// کش منقضی به‌عنوان fallback برمی‌گردد. حالت «mix» همه را ادغام/حذف تکراری می‌کند.
//
//   GET /{secure}/panel/api/clean-ips?src=ircf|cf2dns|bestcf|mix   (پیش‌فرض: mix)

import type { Env } from '../types/global';
import type { PanelSettings } from '../settings/main';
import { verifySessionCookie } from '../auth/session';
import { json } from './utils';
import { cacheGet, cacheSet } from '../settings/db';

const TTL_IRC = 10 * 60 * 1000;
const TTL_JSON = 15 * 60 * 1000;

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

const CF2DNS_URL = 'https://raw.githubusercontent.com/ircfspace/cf2dns/master/list/ipv4.json';
const BESTCF_URL = 'https://raw.githubusercontent.com/LancelotRar/best-cf-ips/main/best-cf-ipv4.txt';

// رنج‌های رسمی IPv4 کلودفلر (cloudflare.com/ips-v4)
const CF_RANGE_STR = [
  '173.245.48.0/20', '103.21.244.0/22', '103.22.200.0/22', '103.31.4.0/22', '141.101.64.0/18',
  '108.162.192.0/18', '190.93.240.0/20', '188.114.96.0/20', '197.234.240.0/22', '198.41.128.0/17',
  '162.158.0.0/15', '104.16.0.0/13', '104.24.0.0/14', '172.64.0.0/13', '131.0.72.0/22',
];

function ipToInt(ip: string): number | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip);
  if (!m) return null;
  const p0 = Number(m[1]!);
  const p1 = Number(m[2]!);
  const p2 = Number(m[3]!);
  const p3 = Number(m[4]!);
  if ([p0, p1, p2, p3].some((p) => p > 255)) return null;
  return ((p0 << 24) | (p1 << 16) | (p2 << 8) | p3) >>> 0;
}

const CF_RANGES: [number, number][] = CF_RANGE_STR.map((s) => {
  const parts = s.split('/');
  return [ipToInt(parts[0]!) ?? 0, parseInt(parts[1]!, 10)];
});

function isCfIp(ip: string): boolean {
  const n = ipToInt(ip);
  if (n === null) return false;
  for (const [base, bits] of CF_RANGES) {
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    if ((n & mask) === (base & mask)) return true;
  }
  return false;
}

interface CleanItem {
  ip: string;
  isp: string;
  sub: string;
  src: string;
}

/* ─────────── منبع ۱: ircf.space (DNS زنده) ─────────── */

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

async function sourceIrcf(): Promise<CleanItem[]> {
  const results = await Promise.all(
    IRCF_SUBS.map(async (it) => {
      const ips = await resolveOne(it.sub);
      return ips.map((ip) => ({ ip, isp: it.isp, sub: it.sub + '.ircf.space', src: 'ircf' }));
    }),
  );
  const seen = new Set<string>();
  const out: CleanItem[] = [];
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

/* ─────────── منبع ۲: cf2dns (JSON روزانه + امتیاز) ─────────── */

async function sourceCf2dns(): Promise<CleanItem[]> {
  const r = await fetch(CF2DNS_URL, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) return [];
  const parsed = (await r.json().catch(() => null)) as any[] | null;
  if (!Array.isArray(parsed)) return [];
  const list = parsed;
  const items: CleanItem[] = [];
  const seen = new Set<string>();
  for (const it of list) {
    const ip = String(it?.ip ?? '');
    if (!ip || seen.has(ip) || !isCfIp(ip)) continue;
    seen.add(ip);
    const line = String(it?.line ?? '');
    const lat = Number(it?.latency);
    items.push({
      ip,
      isp: 'cf2dns' + (line ? ' · ' + line : ''),
      sub: Number.isFinite(lat) ? 'latency ' + Math.round(lat) + 'ms' : 'cf2dns',
      src: 'cf2dns',
    });
  }
  items.sort((a, b) => {
    const la = parseInt(a.sub.replace(/\D/g, ''), 10) || 1e9;
    const lb = parseInt(b.sub.replace(/\D/g, ''), 10) || 1e9;
    return la - lb;
  });
  return items.slice(0, 60);
}

/* ─────────── منبع ۳: best-cf-ips (تجمیعی هر ۳ ساعت) ─────────── */

async function sourceBestcf(): Promise<CleanItem[]> {
  const r = await fetch(BESTCF_URL, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) return [];
  const text = await r.text().catch(() => '');
  const items: CleanItem[] = [];
  for (const line of text.split(/\r?\n/)) {
    const m = /^(\d{1,3}(?:\.\d{1,3}){3})(?::\d+)?#(.+)$/.exec(line.trim());
    if (!m) continue;
    const ip = m[1]!;
    if (!isCfIp(ip)) continue;
    const flag = m[2]!.trim().replace(/[^a-z\u00a1-\uffff]/gi, ' ').replace(/\s+/g, ' ').trim();
    items.push({ ip, isp: 'best-cf' + (flag ? ' · ' + flag : ''), sub: 'best-cf-ips', src: 'bestcf' });
    if (items.length >= 60) break;
  }
  return items;
}

/* ─────────── کش + اورکستریشن ─────────── */

async function withCache(env: Env, key: string, ttl: number, fetcher: () => Promise<CleanItem[]>): Promise<{ items: CleanItem[]; cached: boolean; stale: boolean; ts: number }> {
  const cached = await cacheGet(env, key);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.ts && Array.isArray(parsed.items)) {
        if (Date.now() - parsed.ts < ttl) {
          return { items: parsed.items, cached: true, stale: false, ts: parsed.ts };
        }
        // کش منقضی — در حین تلاش برای رفرش، اگر بالادست شکست خورد برمی‌گردد
        const fresh = await fetcher();
        if (fresh.length) {
          const ts = Date.now();
          await cacheSet(env, key, JSON.stringify({ ts, items: fresh })).catch(() => null);
          return { items: fresh, cached: false, stale: false, ts };
        }
        return { items: parsed.items, cached: true, stale: true, ts: parsed.ts };
      }
    } catch {
      /* کش خراب — رفرش */
    }
  }
  const items = await fetcher();
  if (items.length) {
    const ts = Date.now();
    await cacheSet(env, key, JSON.stringify({ ts, items })).catch(() => null);
    return { items, cached: false, stale: false, ts };
  }
  return { items: [], cached: false, stale: false, ts: Date.now() };
}

type SrcName = 'ircf' | 'cf2dns' | 'bestcf' | 'mix';

export async function handleCleanIps(request: Request, env: Env, settings: PanelSettings): Promise<Response> {
  if (!(await verifySessionCookie(request, settings.jwtSecret))) {
    return json({ ok: false, error: 'unauthorized' }, 401);
  }

  const srcParam = new URL(request.url).searchParams.get('src') || 'mix';
  const src: SrcName = srcParam === 'ircf' || srcParam === 'cf2dns' || srcParam === 'bestcf' ? srcParam : 'mix';

  const fetchOne = async (name: SrcName): Promise<{ items: CleanItem[]; cached: boolean; stale: boolean; ts: number }> => {
    if (name === 'ircf') return withCache(env, 'ircf_clean_ips_v1', TTL_IRC, sourceIrcf);
    if (name === 'cf2dns') return withCache(env, 'cf2dns_clean_ips_v1', TTL_JSON, sourceCf2dns);
    return withCache(env, 'bestcf_clean_ips_v1', TTL_JSON, sourceBestcf);
  };

  if (src !== 'mix') {
    const res = await fetchOne(src);
    if (!res.items.length) return json({ ok: false, error: 'upstream_unavailable' }, 502);
    return json({
      ok: true,
      source: src,
      cached: res.cached,
      stale: res.stale ? true : undefined,
      updatedAt: res.ts,
      items: res.items,
    });
  }

  // mix — همه منابع موازی، ادغام و حذف تکراری
  const [irc, cf, bc] = await Promise.all([fetchOne('ircf'), fetchOne('cf2dns'), fetchOne('bestcf')]);
  const seen = new Set<string>();
  const items: CleanItem[] = [];
  for (const res of [irc, cf, bc]) {
    for (const it of res.items) {
      if (!seen.has(it.ip)) {
        seen.add(it.ip);
        items.push(it);
      }
    }
  }
  if (!items.length) return json({ ok: false, error: 'upstream_unavailable' }, 502);

  const used = [irc.items.length ? 'ircf' : null, cf.items.length ? 'cf2dns' : null, bc.items.length ? 'bestcf' : null].filter(Boolean);
  return json({
    ok: true,
    source: 'mix',
    sources: used,
    cached: irc.cached && cf.cached && bc.cached,
    updatedAt: Math.max(irc.ts, cf.ts, bc.ts),
    items: items.slice(0, 80),
  });
}
