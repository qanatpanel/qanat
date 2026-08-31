// کلاینت VLESS+WS+TLS واقعی (مینیمال، مثل xray) — برای تست E2E
// پروتکل: TLS(SNI=دامنه) → HTTP/1.1 Upgrade → WS binary → هدر VLESS → داده
import tls from 'node:tls';
import crypto from 'node:crypto';

/** ساخت فریم WS باینری (ماسک‌شده) */
export function wsFrame(payload) {
  const mask = crypto.randomBytes(4);
  const len = payload.length;
  let header;
  if (len < 126) header = Buffer.from([0x82, 0x80 | len]);
  else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x82; header[1] = 0x80 | 126;
    header.writeUInt16BE(len, 2);
  } else throw new Error('payload too big');
  const masked = Buffer.from(payload);
  for (let i = 0; i < len; i++) masked[i] ^= mask[i % 4];
  return Buffer.concat([header, mask, masked]);
}

/** هدر VLESS: version=0 + uuid + addons=0 + cmd=TCP + port + atyp=domain */
export function vlessHeader(uuid, domain, port) {
  const uuidBuf = Buffer.from(uuid.replace(/-/g, ''), 'hex');
  const dom = Buffer.from(domain, 'utf8');
  return Buffer.concat([
    Buffer.from([0x00]), uuidBuf, Buffer.from([0x00]),
    Buffer.from([0x01]),
    Buffer.from([port >> 8, port & 0xff]),
    Buffer.from([0x02, dom.length]), dom,
  ]);
}

export async function vlessClientTest({ ip, sni, uuid, proxyPath, targetHost = 'example.com', targetPort = 80 }) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    let stage = 'tls';
    let upgradeBuf = Buffer.alloc(0);
    let gotVlessAck = false;
    let sentGet = false;
    let output = '';

    const socket = tls.connect({
      host: ip, port: 443,
      servername: sni,
      ALPNProtocols: ['http/1.1'],
      rejectUnauthorized: false,
      timeout: 10000,
    });

    const fail = (err) => {
      socket.destroy();
      resolve({ ok: false, error: `${stage}: ${err}` });
    };

    socket.setTimeout(10000, () => fail('timeout'));

    socket.on('secureConnect', () => {
      stage = 'upgrade';
      // درخواست Upgrade به مسیر پروکسی
      socket.write(
        `GET /${proxyPath}/${uuid} HTTP/1.1\r\n` +
        `Host: ${sni}\r\n` +
        'Upgrade: websocket\r\n' +
        'Connection: Upgrade\r\n' +
        'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n' +
        'Sec-WebSocket-Version: 13\r\n\r\n'
      );
    });

    socket.on('data', (chunk) => {
      // ── فاز ۱: پاسخ Upgrade ──
      if (stage === 'upgrade') {
        upgradeBuf = Buffer.concat([upgradeBuf, chunk]);
        const idx = upgradeBuf.indexOf('\r\n\r\n');
        if (idx === -1) return; // هنوز کامل نشده
        const head = upgradeBuf.slice(0, idx).toString('utf8');
        if (!head.startsWith('HTTP/1.1 101')) {
          fail(`upgrade rejected: ${head.split('\r\n')[0]}`);
          return;
        }
        stage = 'ws';
        // ارسال هدر VLESS
        socket.write(wsFrame(vlessHeader(uuid, targetHost, targetPort)));
        return;
      }

      // ── فاز ۲: فریم‌های WS ──
      if (stage === 'ws') {
        let off = 0;
        const buf = upgradeBuf.length ? Buffer.concat([upgradeBuf, chunk]) : chunk;
        upgradeBuf = Buffer.alloc(0);
        while (off + 2 <= buf.length) {
          const opcode = buf[off] & 0x0f;
          let len = buf[off + 1] & 0x7f;
          let hdrLen = 2;
          if (len === 126) { len = buf.readUInt16BE(off + 2); hdrLen = 4; }
          else if (len === 127) { len = Number(buf.readBigUInt64BE(off + 2)); hdrLen = 10; }
          if (off + hdrLen + len > buf.length) break; // ناقص
          const payload = buf.subarray(off + hdrLen, off + hdrLen + len);
          if (opcode === 1) output += payload.toString('utf8'); // text
          else if (opcode === 2) { // binary
            if (!gotVlessAck && payload.length >= 2 && payload[0] === 0 && payload[1] === 0) {
              gotVlessAck = true; // تأیید هدر VLESS
            } else {
              output += payload.toString('utf8');
            }
          }
          off += hdrLen + len;
        }
        upgradeBuf = buf.subarray(off);

        if (gotVlessAck && !sentGet) {
          sentGet = true;
          const probe = targetPort === 80 || targetPort === 443
            ? Buffer.from('GET / HTTP/1.0\r\nHost: ' + targetHost + '\r\n\r\n', 'utf8')
            : Buffer.from('hello-probe', 'utf8');
          socket.write(wsFrame(probe));
        }

        if (output.includes('HTTP/1.0 200 OK') || output.includes('<title>Example Domain</title>')) {
          const ms = Date.now() - t0;
          socket.destroy();
          resolve({ ok: true, ms, response: output.slice(0, 80).replace(/\n/g, ' ') });
        }
      }
    });

    socket.on('error', (e) => fail(e.message));
  });
}
