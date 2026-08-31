#!/usr/bin/env bash
# تست واحد تولید کانفیگ (VLESS/Trojan URI + Clash + sing-box + IP تمیز)
set -u
cd "$(dirname "$0")/.."

npx esbuild src/cores/config.ts --bundle --format=cjs --outfile=/tmp/config.test.cjs 2>/dev/null

node -e "
const { buildVlessUri, buildTrojanUri, buildClashConfig, buildSingboxConfig } = require('/tmp/config.test.cjs');
const user = { id: 1, username: 'alice', uuid: '11111111-2222-3333-4444-555555555555', trojanPassword: 'a'.repeat(56), quotaGb: 10, usedGb: 0, expiry: 0, isActive: true, note: '', createdAt: Date.now() };
const proxy = { proxyPath: 'abc123def', host: 'my-panel.example.com', port: 443, tls: true, sni: '', protocols: 'both' };
let pass = 0, fail = 0;
const ok = (cond, label) => { if (cond) { pass++; console.log('  ✅', label); } else { fail++; console.log('  ❌', label); } };
const v = buildVlessUri({ user, proxy, originHost: 'x.workers.dev' });
const tr = buildTrojanUri({ user, proxy, originHost: 'x.workers.dev' });
ok(v.startsWith('vless://'), 'VLESS URI prefix');
ok(v.includes('@my-panel.example.com:443'), 'VLESS server = host');
ok(v.includes('type=ws'), 'VLESS ws');
ok(v.includes('security=tls'), 'VLESS tls');
ok(v.includes('host=' + encodeURIComponent('my-panel.example.com')), 'VLESS Host header');
ok(v.includes('path=' + encodeURIComponent('/abc123def')), 'VLESS path');
ok(v.includes('fp=chrome'), 'VLESS fingerprint');
ok(v.includes('alpn=h2,http/1.1'), 'VLESS alpn');
ok(tr.startsWith('trojan://'), 'Trojan URI prefix');
ok(tr.includes('@my-panel.example.com:443'), 'Trojan server = host');
ok(tr.includes('type=ws'), 'Trojan ws');
const v2 = buildVlessUri({ user, proxy, originHost: 'x.workers.dev', serverHost: '104.16.5.5' });
ok(v2.includes('@104.16.5.5:443'), 'VLESS clean-IP server');
ok(v2.includes('host=' + encodeURIComponent('my-panel.example.com')), 'VLESS clean-IP Host stays domain');
ok(!v2.includes('host=104.16'), 'VLESS clean-IP Host NOT the IP');
const t2 = buildTrojanUri({ user, proxy, originHost: 'x.workers.dev', serverHost: '104.16.5.5' });
ok(t2.includes('@104.16.5.5:443'), 'Trojan clean-IP server');
ok(t2.includes('host=' + encodeURIComponent('my-panel.example.com')), 'Trojan clean-IP Host stays domain');
const c = buildClashConfig({ user, proxy, originHost: 'x.workers.dev', serverHost: '104.16.5.5' });
ok(c.includes('server: 104.16.5.5'), 'Clash server = clean IP');
ok(c.includes('servername: my-panel.example.com'), 'Clash servername = domain');
ok(c.includes('Host: my-panel.example.com'), 'Clash ws Host = domain');
const sb = buildSingboxConfig({ user, proxy, originHost: 'x.workers.dev', serverHost: '104.16.5.5' });
const j = JSON.parse(sb);
const ob = j.outbounds.find(o => o.type === 'vless');
ok(ob.server === '104.16.5.5', 'sing-box server = clean IP');
ok(ob.transport.headers.Host === 'my-panel.example.com', 'sing-box Host = domain');
ok(ob.tls.server_name === 'my-panel.example.com', 'sing-box SNI = domain');
console.log('');
console.log('نتیجه: ' + pass + ' موفق / ' + fail + ' ناموفق');
process.exit(fail ? 1 : 0);
"
