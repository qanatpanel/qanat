/**
 * تولید کانفیگ کلاینت‌ها از روی تنظیمات پروکسی و کاربر
 * خروجی: URI (vless/trojan)، Clash YAML، sing-box JSON، اشتراک base64
 */
import type { ProxySettings } from '../settings/proxy';
import { protocolsEnabled } from '../settings/proxy';
import type { User } from '../settings/users';

export interface BuildInput {
  user: User;
  proxy: ProxySettings;
  originHost: string; // هاستی که درخواست به آن آمده (پیش‌فرض host)
  /** IP تمیز/سرور جایگزین — اتصال به این IP ولی Host/SNI همچنان دامنه‌ی اصلی می‌ماند */
  serverHost?: string;
  /** پورت جایگزین (مثلاً پورت‌های غیراستاندارد کلودفلر برای IP های تمیز) */
  serverPort?: number;
}

/** هاست اصلی (دامنه) — برای Host header و SNI */
function effectiveHost(b: BuildInput): string {
  return b.proxy.host || b.originHost;
}

/** سرور اتصال — اگر IP تمیز داده شود، اتصال به آن است (host همچنان دامنه) */
function effectiveServer(b: BuildInput): string {
  return b.serverHost || effectiveHost(b);
}

/**
 * مسیر WebSocket: روت پروکسی worker به شکل `/{proxyPath}/{uuid|password}` است
 * (شناسه‌ی کاربر در مسیر — الگوی BPB) — کانفیگ باید همین مسیر را داشته باشد
 */
function wsPath(p: ProxySettings, identifier: string): string {
  return `/${p.proxyPath}/${identifier}`;
}

function port(b: BuildInput): number {
  return b.serverPort || b.proxy.port || (b.proxy.tls ? 443 : 80);
}

function name(b: BuildInput, suffix = ''): string {
  return `Panel | ${b.user.username}${suffix}`;
}

/* ─────────────── URI ─────────────── */

export function buildVlessUri(b: BuildInput): string {
  const host = effectiveHost(b);
  const server = effectiveServer(b);
  const p = port(b);
  const security = b.proxy.tls ? 'tls' : 'none';
  const params = [
    'encryption=none',
    `security=${security}`,
    'type=ws',
    `host=${encodeURIComponent(host)}`,
    `path=${encodeURIComponent(wsPath(b.proxy, b.user.uuid))}`,
  ];
  if (b.proxy.tls) params.push(`sni=${encodeURIComponent(b.proxy.sni || host)}`);
  if (b.proxy.tls) params.push('fp=chrome');
  if (b.proxy.tls) params.push('alpn=http/1.1');
  return `vless://${b.user.uuid}@${server}:${p}?${params.join('&')}#${encodeURIComponent(name(b, server !== host ? ' ✈️' : ''))}`;
}

export function buildTrojanUri(b: BuildInput): string {
  const host = effectiveHost(b);
  const server = effectiveServer(b);
  const p = port(b);
  const security = b.proxy.tls ? 'tls' : 'none';
  const params = [
    `security=${security}`,
    'type=ws',
    `host=${encodeURIComponent(host)}`,
  ];
  const pass = b.user.trojanPassword ?? b.user.uuid.replace(/-/g, '').slice(0, 56);
  params.push(`path=${encodeURIComponent(wsPath(b.proxy, pass))}`);
  if (b.proxy.tls) params.push(`sni=${encodeURIComponent(b.proxy.sni || host)}`);
  if (b.proxy.tls) params.push('fp=chrome');
  if (b.proxy.tls) params.push('alpn=http/1.1');
  return `trojan://${pass}@${server}:${p}?${params.join('&')}#${encodeURIComponent(name(b, ' (Trojan)'))}`;
}

/** همه‌ی URI های فعال برای یک کاربر */
export function buildUris(b: BuildInput): string[] {
  const { vless, trojan } = protocolsEnabled(b.proxy);
  const uris: string[] = [];
  if (vless) uris.push(buildVlessUri(b));
  if (trojan) uris.push(buildTrojanUri(b));
  return uris;
}

/** اشتراک متنی (base64) — سازگار با کلاینت‌ها */
export function buildBase64Sub(b: BuildInput): string {
  const uris = buildUris(b);
  return btoa(uris.join('\n'));
}

/* ─────────────── Clash / Mihomo YAML ─────────────── */

export function buildClashConfig(b: BuildInput): string {
  const host = effectiveHost(b);
  const p = port(b);
  const { vless, trojan } = protocolsEnabled(b.proxy);
  const lines: string[] = [];

  const server = effectiveServer(b);
  const proxyList: string[] = [];
  if (vless) {
    proxyList.push(
      `      - name: "${name(b)}"\n        type: vless\n        server: ${server}\n        port: ${p}\n        uuid: ${b.user.uuid}\n        network: ws\n        udp: true\n        tls: ${b.proxy.tls}\n        servername: ${b.proxy.sni || host}\n        client-fingerprint: chrome\n        alpn: [http/1.1]\n        ws-opts:\n          path: "${wsPath(b.proxy, b.user.uuid)}"\n          headers:\n            Host: ${host}`,
    );
  }
  if (trojan) {
    const pass = b.user.trojanPassword ?? b.user.uuid.replace(/-/g, '').slice(0, 56);
    proxyList.push(
      `      - name: "${name(b, ' (Trojan)')}"\n        type: trojan\n        server: ${server}\n        port: ${p}\n        password: "${pass}"\n        network: ws\n        udp: true\n        tls: ${b.proxy.tls}\n        sni: ${b.proxy.sni || host}\n        client-fingerprint: chrome\n        alpn: [http/1.1]\n        ws-opts:\n          path: "${wsPath(b.proxy, pass)}"\n          headers:\n            Host: ${host}`,
    );
  }

  lines.push(`# Panel — ${b.user.username}`, 'mixed-port: 7890', 'allow-lan: true', 'mode: rule', 'log-level: info');
  lines.push('proxies:');
  lines.push(proxyList.join('\n'));
  const groupMembers = proxyList.map((l) => {
    const m = l.match(/name: "([^"]+)"/);
    return '      - ' + (m ? m[1]! : '');
  });
  lines.push('proxy-groups:', `  - name: "🚀 Panel"\n    type: select\n    proxies:\n${groupMembers.join('\n')}`);
  lines.push('rules:', '  - MATCH,🚀 Panel');
  return lines.join('\n');
}

/* ─────────────── sing-box JSON ─────────────── */

export function buildSingboxConfig(b: BuildInput): string {
  const host = effectiveHost(b);
  const p = port(b);
  const { vless, trojan } = protocolsEnabled(b.proxy);
  const server = effectiveServer(b);
  const outbounds: Array<Record<string, unknown>> = [];

  if (vless) {
    outbounds.push({
      type: 'vless',
      tag: name(b),
      server: server,
      server_port: p,
      uuid: b.user.uuid,
      tls: b.proxy.tls
        ? { enabled: true, server_name: b.proxy.sni || host, alpn: ['http/1.1'], utls: { enabled: true, fingerprint: 'chrome' } }
        : undefined,
      transport: { type: 'ws', path: wsPath(b.proxy, b.user.uuid), headers: { Host: host } },
    });
  }
  if (trojan) {
    const pass = b.user.trojanPassword ?? b.user.uuid.replace(/-/g, '').slice(0, 56);
    outbounds.push({
      type: 'trojan',
      tag: name(b, ' (Trojan)'),
      server: server,
      server_port: p,
      password: pass,
      tls: b.proxy.tls
        ? { enabled: true, server_name: b.proxy.sni || host, alpn: ['http/1.1'], utls: { enabled: true, fingerprint: 'chrome' } }
        : undefined,
      transport: { type: 'ws', path: wsPath(b.proxy, pass), headers: { Host: host } },
    });
  }

  return JSON.stringify(
    {
      log: { level: 'info' },
      dns: { servers: ['https://1.1.1.1/dns-query', 'https://8.8.8.8/dns-query'] },
      inbounds: [
        { type: 'mixed', tag: 'mixed-in', listen: '127.0.0.1', listen_port: 2080 },
        { type: 'tun', tag: 'tun-in', auto_route: true, strict_route: true },
      ],
      outbounds: [...outbounds, { type: 'direct', tag: 'direct' }, { type: 'block', tag: 'block' }],
      route: {
        rules: [
          { action: 'route', outbound: 'direct', geosite: ['private', 'cn'] },
          { action: 'block', protocol: ['quic'] },
        ],
        final: outbounds[0]?.tag ?? 'direct',
        auto_detect_interface: true,
      },
    },
    null,
    2,
  );
}
