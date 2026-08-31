/**
 * تولید کانفیگ کلاینت‌ها از روی تنظیمات پروکسی و کاربر
 * خروجی: URI (vless/trojan)، Clash YAML، sing-box JSON، اشتراک base64
 *
 * استراتژی «کانفیگ خفن»:
 *  - پورت‌های جایگزین کلودفلر (8443/2053/2083/2087/2096) کنار 443 — اگر 443 فیلتر/بسته بود،
 *    بقیه جواب می‌دهند (Host/SNI و مسیر ثابت می‌مانند).
 *  - Clash: گروه url-test خودکار (بدترین→بهترین در ۳۰۰ms) + انتخاب دستی + قوانین ایران (دایرکت)
 *    + بلاک تبلیغات + DNS.
 *  - sing-box: outbound urltest + قوانین geoip/geosite ایران + DNS امن.
 *  - تروجان: پسورد همیشه ۵۶ کاراکتر هگز معتبر (relay فقط ۵۶ هگز می‌پذیرد).
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

/** پورت‌های جایگزین TLS کلودفلر — برای کانفیگ‌های چندگانه (failover در شبکه‌های مختلف) */
export const ALT_PORTS = [8443, 2053, 2083, 2087, 2096] as const;

/** هاست اصلی (دامنه) — برای Host header و SNI */
function effectiveHost(b: BuildInput): string {
  return b.proxy.host || b.originHost;
}

/** سرور اتصال — اگر IP تمیز داده شود (دستی یا ست‌شده روی کانفیگ‌ها)، اتصال به آن است (host همچنان دامنه) */
function effectiveServer(b: BuildInput): string {
  return b.serverHost || b.proxy.overrideIp || effectiveHost(b);
}

/**
 * مسیر WebSocket: روت پروکسی worker به شکل `/{proxyPath}/{uuid|password}` است
 * (شناسه‌ی کاربر در مسیر — الگوی BPB) — کانفیگ باید همین مسیر را داشته باشد
 */
function wsPath(p: ProxySettings, identifier: string): string {
  return `/${p.proxyPath}/${identifier}`;
}

function port(b: BuildInput): number {
  return b.serverPort || b.proxy.overridePort || b.proxy.port || (b.proxy.tls ? 443 : 80);
}

function name(b: BuildInput, suffix = ''): string {
  return `Panel | ${b.user.username}${suffix}`;
}

/**
 * پسورد تروجان — همیشه ۵۶ کاراکتر هگز معتبر (relay فقط ۵۶ هگز می‌پذیرد).
 * اگر کاربر پسورد اختصاصی ندارد، از uuid یک پسورد قطعی مشتق می‌شود
 * (بدون نیاز به ذخیره‌سازی؛ همان uuid → همان پسورد در همه‌ی خروجی‌ها).
 */
export function trojanPassword(user: User): string {
  if (user.trojanPassword) return user.trojanPassword;
  const hex = user.uuid.replace(/-/g, '');
  return (hex + hex).slice(0, 56);
}

/* ─────────────── URI ─────────────── */

export function buildVlessUri(b: BuildInput, overPort?: number): string {
  const host = effectiveHost(b);
  const server = effectiveServer(b);
  const p = overPort || port(b);
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
  const pass = trojanPassword(b.user);
  params.push(`path=${encodeURIComponent(wsPath(b.proxy, pass))}`);
  if (b.proxy.tls) params.push(`sni=${encodeURIComponent(b.proxy.sni || host)}`);
  if (b.proxy.tls) params.push('fp=chrome');
  if (b.proxy.tls) params.push('alpn=http/1.1');
  return `trojan://${pass}@${server}:${p}?${params.join('&')}#${encodeURIComponent(name(b, ' (Trojan)'))}`;
}

/** همه‌ی URI های فعال برای یک کاربر: اصلی + پورت‌های جایگزین + تروجان */
export function buildUris(b: BuildInput): string[] {
  const { vless, trojan } = protocolsEnabled(b.proxy);
  const uris: string[] = [];
  if (vless) {
    uris.push(buildVlessUri(b));
    for (const alt of ALT_PORTS) uris.push(buildVlessUri(b, alt));
  }
  if (trojan) uris.push(buildTrojanUri(b));
  return uris;
}

/** UTF-8 → base64 (برای متن‌های فارسی در کامنت‌های اشتراک) */
export function utf8ToB64(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  bytes.forEach((x) => (bin += String.fromCharCode(x)));
  return btoa(bin);
}

/**
 * اشتراک متنی (base64) — سازگار با کلاینت‌ها
 * با کامنت‌های profile-title / subscription-userinfo تا اپ‌ها
 * (Hiddify, v2rayNG, V2Box, Happ, …) مصرف و انقضا را خودکار نشان دهند.
 */
export function buildBase64Sub(b: BuildInput): string {
  const uris = buildUris(b);
  const header = [
    `#profile-title: base64:${utf8ToB64(`قنات — ${b.user.username}`)}`,
    '#profile-update-interval: 12',
    `#subscription-userinfo: upload=0; download=${Math.round(b.user.usedGb * 1073741824)}; total=${b.user.quotaGb > 0 ? Math.round(b.user.quotaGb * 1073741824) : 0}; expire=${b.user.expiry > 0 ? Math.floor(b.user.expiry / 1000) : 0}`,
  ].join('\n');
  return btoa(header + '\n' + uris.join('\n'));
}

/* ─────────────── Clash / Mihomo YAML ─────────────── */

/**
 * کانفیگ Clash/Mihomo:
 *  - همه‌ی پروکسی‌ها (اصلی + پورت‌های جایگزین + تروجان)
 *  - گروه خودکار url-test (هر ۳۰۰ ثانیه بهترین را انتخاب می‌کند)
 *  - گروه دستی (REJECT/DIRECT هم دارد)
 *  - DNS + قوانین ایران (دایرکت) + بلاک تبلیغات سبک
 */
export function buildClashConfig(b: BuildInput): string {
  const host = effectiveHost(b);
  const p = port(b);
  const { vless, trojan } = protocolsEnabled(b.proxy);
  const server = effectiveServer(b);
  const serverLabel = server !== host ? ` (${server})` : '';

  const proxyEntries: string[] = [];
  const names: string[] = [];

  const pushVless = (label: string, portNum: number) => {
    const nm = `${name(b)}${label}${serverLabel}`;
    names.push(nm);
    proxyEntries.push(
      `      - name: "${nm}"\n        type: vless\n        server: ${server}\n        port: ${portNum}\n        uuid: ${b.user.uuid}\n        network: ws\n        udp: true\n        tls: ${b.proxy.tls}\n        servername: ${b.proxy.sni || host}\n        client-fingerprint: chrome\n        alpn: [http/1.1]\n        ws-opts:\n          path: "${wsPath(b.proxy, b.user.uuid)}"\n          headers:\n            Host: ${host}`,
    );
  };

  if (vless) {
    pushVless('', p);
    for (const alt of ALT_PORTS) pushVless(` :${alt}`, alt);
  }
  if (trojan) {
    const pass = trojanPassword(b.user);
    const nm = `${name(b, ' (Trojan)')}${serverLabel}`;
    names.push(nm);
    proxyEntries.push(
      `      - name: "${nm}"\n        type: trojan\n        server: ${server}\n        port: ${p}\n        password: "${pass}"\n        network: ws\n        udp: true\n        tls: ${b.proxy.tls}\n        sni: ${b.proxy.sni || host}\n        client-fingerprint: chrome\n        alpn: [http/1.1]\n        ws-opts:\n          path: "${wsPath(b.proxy, pass)}"\n          headers:\n            Host: ${host}`,
    );
  }

  const groupList = names.map((n) => `      - ${n}`).join('\n');
  const autoGroup = `  - name: "🚀 قنات | خودکار"\n    type: url-test\n    url: http://www.gstatic.com/generate_204\n    interval: 300\n    tolerance: 50\n    proxies:\n${groupList}`;
  const selectList = [`      - "🚀 قنات | خودکار"`, ...names.map((n) => `      - ${n}`), '      - DIRECT', '      - REJECT'].join('\n');
  const selectGroup = `  - name: "🎯 قنات | دستی"\n    type: select\n    proxies:\n${selectList}`;

  return [
    `# قنات — ${b.user.username}`,
    'mixed-port: 7890',
    'allow-lan: true',
    'mode: rule',
    'log-level: info',
    'ipv6: true',
    'dns:',
    '  enable: true',
    '  enhanced-mode: fake-ip',
    '  fake-ip-filter:',
    "    - '*.lan'",
    "    - '*.local'",
    "    - '+.msftconnecttest.com'",
    '  nameserver:',
    '    - 1.1.1.1',
    '    - 8.8.8.8',
    'proxies:',
    proxyEntries.join('\n'),
    'proxy-groups:',
    autoGroup,
    selectGroup,
    'rules:',
    '  # بلاک تبلیغات (سبک)',
    '  - DOMAIN-SUFFIX,doubleclick.net,REJECT',
    '  - DOMAIN-SUFFIX,googlesyndication.com,REJECT',
    '  - DOMAIN-SUFFIX,adservice.google.com,REJECT',
    '  - DOMAIN-SUFFIX,googletagservices.com,REJECT',
    '  # شبکه‌های داخلی — مستقیم',
    '  - IP-CIDR,127.0.0.0/8,DIRECT,no-resolve',
    '  - IP-CIDR,10.0.0.0/8,DIRECT,no-resolve',
    '  - IP-CIDR,172.16.0.0/12,DIRECT,no-resolve',
    '  - IP-CIDR,192.168.0.0/16,DIRECT,no-resolve',
    '  # ایران — مستقیم (صرفه‌جویی و سرعت داخلی)',
    '  - GEOIP,IR,DIRECT',
    '  - DOMAIN-SUFFIX,ir,DIRECT',
    '  # بقیه → قنات',
    '  - MATCH,🎯 قنات | دستی',
  ].join('\n');
}

/* ─────────────── sing-box JSON ─────────────── */

/**
 * کانفیگ sing-box:
 *  - همه‌ی پروکسی‌ها + outbound urltest (انتخاب خودکار بهترین)
 *  - قوانین geoip/geosite ایران → مستقیم، QUIC → بلاک
 *  - DNS امن (DoH کلودفلر/گوگل)
 */
export function buildSingboxConfig(b: BuildInput): string {
  const host = effectiveHost(b);
  const p = port(b);
  const { vless, trojan } = protocolsEnabled(b.proxy);
  const server = effectiveServer(b);

  const outbounds: Array<Record<string, unknown>> = [];
  const proxyTags: string[] = [];

  const pushVless = (tag: string, portNum: number) => {
    outbounds.push({
      type: 'vless',
      tag,
      server,
      server_port: portNum,
      uuid: b.user.uuid,
      tls: b.proxy.tls
        ? { enabled: true, server_name: b.proxy.sni || host, alpn: ['http/1.1'], utls: { enabled: true, fingerprint: 'chrome' } }
        : undefined,
      transport: { type: 'ws', path: wsPath(b.proxy, b.user.uuid), headers: { Host: host } },
    });
    proxyTags.push(tag);
  };

  if (vless) {
    pushVless(name(b), p);
    for (const alt of ALT_PORTS) pushVless(`${name(b)} :${alt}`, alt);
  }
  if (trojan) {
    const pass = trojanPassword(b.user);
    const tag = name(b, ' (Trojan)');
    outbounds.push({
      type: 'trojan',
      tag,
      server,
      server_port: p,
      password: pass,
      tls: b.proxy.tls
        ? { enabled: true, server_name: b.proxy.sni || host, alpn: ['http/1.1'], utls: { enabled: true, fingerprint: 'chrome' } }
        : undefined,
      transport: { type: 'ws', path: wsPath(b.proxy, pass), headers: { Host: host } },
    });
    proxyTags.push(tag);
  }

  outbounds.push(
    {
      type: 'urltest',
      tag: '🚀 قنات | خودکار',
      outbounds: proxyTags,
      url: 'http://www.gstatic.com/generate_204',
      interval: '5m',
    },
    { type: 'direct', tag: 'direct' },
    { type: 'block', tag: 'block' },
  );

  return JSON.stringify(
    {
      log: { level: 'info' },
      dns: { servers: ['https://1.1.1.1/dns-query', 'https://8.8.8.8/dns-query'] },
      inbounds: [
        { type: 'mixed', tag: 'mixed-in', listen: '127.0.0.1', listen_port: 2080 },
        { type: 'tun', tag: 'tun-in', auto_route: true, strict_route: true },
      ],
      outbounds,
      route: {
        rules: [
          { action: 'route', outbound: 'direct', geoip: ['ir', 'private'] },
          { action: 'route', outbound: 'direct', geosite: ['ir', 'private', 'cn'] },
          { action: 'block', protocol: ['quic'] },
        ],
        final: '🚀 قنات | خودکار',
        auto_detect_interface: true,
      },
    },
    null,
    2,
  );
}
