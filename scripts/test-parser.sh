#!/usr/bin/env bash
# تست واحد پارسرهای پروتکل (VLESS + Trojan)
set -u
cd "$(dirname "$0")/.."

npx esbuild src/proxy/parse.ts --bundle --format=esm --outfile=/tmp/parse.test.mjs 2>/dev/null

node -e "
import('/tmp/parse.test.mjs').then(async (m) => {
  const { buildVlessHeader, parseVlessHeader, buildTrojanHeader, parseTrojanPassword, parseTrojanRequest, uuidToBytes, bytesToUuid } = m;
  let pass = 0, fail = 0;
  const check = (name, cond) => { if (cond) { pass++; console.log('  ✅', name); } else { fail++; console.log('  ❌', name); } };

  const uuid = '123e4567-e89b-42d3-a456-426614174000';
  const password = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef01';

  // UUID roundtrip
  check('uuidToBytes/bytesToUuid roundtrip', bytesToUuid(uuidToBytes(uuid)) === uuid.toLowerCase());

  // VLESS
  const vh = buildVlessHeader(uuid, 'example.com', 443, 'tcp');
  const parsed = parseVlessHeader(vh);
  check('VLESS: uuid', parsed && parsed.uuid === uuid);
  check('VLESS: host', parsed && parsed.target.host === 'example.com');
  check('VLESS: port', parsed && parsed.target.port === 443);
  check('VLESS: command tcp', parsed && parsed.target.command === 'tcp');
  check('VLESS: bodyOffset = length', parsed && parsed.bodyOffset === vh.length);

  // VLESS با بدنه
  const withBody = new Uint8Array(vh.length + 5);
  withBody.set(vh, 0);
  withBody.set([1,2,3,4,5], vh.length);
  check('VLESS: data offset', parseVlessHeader(withBody)?.bodyOffset === vh.length);

  // VLESS invalid
  const bad = new Uint8Array(vh); bad[0] = 9;
  check('VLESS: bad version rejected', parseVlessHeader(bad) === null);
  check('VLESS: short rejected', parseVlessHeader(new Uint8Array(10)) === null);

  // Trojan
  const th = buildTrojanHeader(password, 'example.com', 8443, 'tcp');
  check('Trojan: password', parseTrojanPassword(th) === password);
  const tr = parseTrojanRequest(th, 56);
  check('Trojan: host', tr && tr.host === 'example.com');
  check('Trojan: port', tr && tr.port === 8443);
  check('Trojan: command', tr && tr.command === 'tcp');

  // Trojan invalid
  const badTh = new Uint8Array(th); badTh[0] = 122; // 'z'
  check('Trojan: non-hex rejected', parseTrojanPassword(badTh) === null);

  console.log('');
  console.log('نتیجه:', pass, 'موفق /', fail, 'ناموفق');
  process.exit(fail > 0 ? 1 : 0);
});
"
