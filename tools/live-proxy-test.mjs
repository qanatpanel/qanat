/**
 * تست زندهٔ پروکسی پنل (VLESS over WebSocket) — بدون هیچ وابستگی
 * اتصال به wsPath پنل، ارسال هدر VLESS استاندارد، سپس درخواست HTTP از پشت پروکسی.
 * استفاده: node tools/live-proxy-test.mjs <wsBase> <proxyPath> <uuid>
 */
const [, , wsBase, proxyPath, uuid, portArg = '80'] = process.argv;
const PORT = parseInt(portArg, 10);

function uuidToBytes(uuid) {
  const hex = uuid.replace(/-/g, '');
  const out = new Uint8Array(16);
  for (let i = 0; i < 16; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function buildVlessHeader(uuid, host, port) {
  const uuidBytes = uuidToBytes(uuid);
  const hostBytes = new TextEncoder().encode(host);
  const body = new Uint8Array(1 + 2 + 1 + 1 + hostBytes.length);
  let p = 0;
  body[p++] = 1; // tcp
  body[p++] = (port >> 8) & 0xff;
  body[p++] = port & 0xff;
  body[p++] = 2; // atype domain
  body[p++] = hostBytes.length;
  body.set(hostBytes, p);
  const header = new Uint8Array(1 + 16 + 1 + body.length);
  p = 0;
  header[p++] = 0;
  header.set(uuidBytes, p);
  p += 16;
  header[p++] = 0; // addonLen
  header.set(body, p);
  return header;
}

const results = [];
async function testTarget(label, host, request) {
  const url = `wss://${wsBase}/${proxyPath}/${uuid}`;
  const ws = new WebSocket(url);
  const timeout = setTimeout(() => {
    try { ws.close(); } catch {}
  }, 15000);
  const started = Date.now();
  try {
    await new Promise((res, rej) => {
      ws.onopen = res;
      ws.onerror = (e) => rej(new Error('ws error'));
    });
    const t0 = Date.now();
    const header = buildVlessHeader(uuid, host, PORT);
    const payload = new TextEncoder().encode(request);
    const frame = new Uint8Array(header.length + payload.length);
    frame.set(header, 0);
    frame.set(payload, header.length);
    ws.send(frame);
    const data = await new Promise((res, rej) => {
      let buf = '';
      ws.onmessage = async (e) => {
        const ab = e.data instanceof Blob ? await e.data.arrayBuffer() : e.data;
        const chunk = typeof ab === 'string' ? ab : Buffer.from(ab).toString('latin1');
        buf += chunk;
        // بس برای دیدن هدر HTTP
        if (buf.length > 4000 || buf.includes('\r\n\r\n')) {
          clearTimeout(timeout);
          res(buf);
        }
      };
      ws.onclose = () => res(buf);
      ws.onerror = (e) => rej(new Error('ws error after open'));
    });
    const ms = Date.now() - t0;
    const firstLine = data.split('\r\n')[0] || '(no data)';
    results.push(`  ${label}: ${ms}ms → ${firstLine} | ${data.length} bytes`);
  } catch (e) {
    results.push(`  ${label}: FAIL (${e.message})`);
  } finally {
    clearTimeout(timeout);
    try { ws.close(); } catch {}
  }
}

console.log(`پروکسی: ${wsBase} | path=/${proxyPath}/${uuid} | port=${PORT}`);
console.log('── تست اتصال از پشت پروکسی ──');
await testTarget('api.ipify.org', 'api.ipify.org', 'GET / HTTP/1.1\r\nHost: api.ipify.org\r\nUser-Agent: curl/8\r\nConnection: close\r\n\r\n');
await testTarget('google.com', 'www.google.com', 'GET / HTTP/1.1\r\nHost: www.google.com\r\nUser-Agent: curl/8\r\nConnection: close\r\n\r\n');
await testTarget('whatismyipaddress.com (بازتولید ERR_CONNECTION_CLOSED)', 'whatismyipaddress.com', 'GET / HTTP/1.1\r\nHost: whatismyipaddress.com\r\nUser-Agent: curl/8\r\nConnection: close\r\n\r\n');
await testTarget('cloudflare.com', 'www.cloudflare.com', 'GET / HTTP/1.1\r\nHost: www.cloudflare.com\r\nUser-Agent: curl/8\r\nConnection: close\r\n\r\n');
await testTarget('ip.sb', 'ip.sb', 'GET / HTTP/1.1\r\nHost: ip.sb\r\nUser-Agent: curl/8\r\nConnection: close\r\n\r\n');
console.log(results.join('\n'));
