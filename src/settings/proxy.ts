/**
 * تنظیمات پروکسی
 * - proxy_path:   مسیر مخفی پروکسی (جدا از مسیر پنل) — تولید تصادفی
 * - proxy_host:   هاست پابلیک (اگر خالی باشد → هاست خودکار از درخواست)
 * - proxy_port:   پورت (پیش‌فرض ۴۴۳)
 * - proxy_tls:    آیا TLS فعال است
 * - proxy_sni:    SNI (اگر خالی باشد = host)
 * - proxy_protocols: 'vless' | 'trojan' | 'both'
 * - proxy_upstreams: بالادست‌ها (هر خط یک کانفیگ vless/trojan یا host:port شفاف)
 * - proxy_failover_ms: مهلت fallback — اگر اتصال مستقیم تا این مدت پاسخ نداد، بالادست
 */
import type { Env } from '../types/global';
import { getSettings, setSettings } from './db';
import { randomString } from './main';

export type ProtocolMode = 'vless' | 'trojan' | 'both';

export interface ProxySettings {
  proxyPath: string;
  host: string;
  port: number;
  tls: boolean;
  sni: string;
  protocols: ProtocolMode;
  /** متن چندخطی بالادست‌ها */
  upstreams: string;
  /** مهلت fallback بر حسب میلی‌ثانیه */
  failoverMs: number;
}

export const PROXY_KEYS = [
  'proxy_path',
  'proxy_host',
  'proxy_port',
  'proxy_tls',
  'proxy_sni',
  'proxy_protocols',
  'proxy_upstreams',
  'proxy_failover_ms',
] as const;

export async function getProxySettings(env: Env, requestHost?: string): Promise<ProxySettings> {
  const rows = await getSettings(env, [...PROXY_KEYS]);

  const updates: Record<string, string> = {};
  let proxyPath = rows.proxy_path;
  if (!proxyPath) {
    proxyPath = randomString(10);
    updates.proxy_path = proxyPath;
  }

  const host = rows.proxy_host || requestHost || '';
  if (!rows.proxy_host && requestHost) updates.proxy_host = requestHost;

  if (Object.keys(updates).length > 0) await setSettings(env, updates);

  const port = Number(rows.proxy_port);
  const tls = rows.proxy_tls === '1' || rows.proxy_tls === 'true' || rows.proxy_tls === undefined;
  const failoverMs = Number(rows.proxy_failover_ms);

  return {
    proxyPath,
    host,
    port: Number.isInteger(port) && port > 0 && port < 65536 ? port : 443,
    tls,
    sni: rows.proxy_sni || host,
    protocols: (rows.proxy_protocols as ProtocolMode) || 'both',
    upstreams: rows.proxy_upstreams || '',
    failoverMs: Number.isFinite(failoverMs) && failoverMs >= 800 && failoverMs <= 15000 ? Math.round(failoverMs) : 3000,
  };
}

export async function saveProxySettings(
  env: Env,
  input: {
    host?: string;
    port?: number;
    tls?: boolean;
    sni?: string;
    protocols?: string;
    proxyPath?: string;
    upstreams?: string;
    failoverMs?: number;
  },
): Promise<ProxySettings> {
  const entries: Record<string, string> = {};
  if (input.host !== undefined) entries.proxy_host = input.host.trim();
  if (input.port !== undefined) entries.proxy_port = String(input.port);
  if (input.tls !== undefined) entries.proxy_tls = input.tls ? '1' : '0';
  if (input.sni !== undefined) entries.proxy_sni = input.sni.trim();
  if (input.protocols !== undefined) entries.proxy_protocols = input.protocols;
  if (input.proxyPath !== undefined) entries.proxy_path = input.proxyPath;
  if (input.upstreams !== undefined) entries.proxy_upstreams = input.upstreams.trim();
  if (input.failoverMs !== undefined) entries.proxy_failover_ms = String(Math.round(input.failoverMs));
  await setSettings(env, entries);
  return getProxySettings(env);
}

export async function regenerateProxyPath(env: Env): Promise<string> {
  const p = randomString(10);
  await setSettings(env, { proxy_path: p });
  return p;
}

export function protocolsEnabled(p: ProxySettings): { vless: boolean; trojan: boolean } {
  return {
    vless: p.protocols === 'vless' || p.protocols === 'both',
    trojan: p.protocols === 'trojan' || p.protocols === 'both',
  };
}
