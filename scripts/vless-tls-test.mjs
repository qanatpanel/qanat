// تست TLS واقعی از داخل تونل VLESS — اثبات کامل: IP تمیز → worker → سایت واقعی
import tls from 'node:tls';
import { Duplex } from 'node:stream';
import crypto from 'node:crypto';
import { vlessHeader, wsFrame } from './vless-client.mjs';

export async function vlessTlsTest({ ip, sni, uuid, proxyPath, targetHost = 'www.youtube.com', targetPort = 443 }) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    let stage = 'tls';
    let upgradeBuf = Buffer.alloc(0);
    let gotAck = false;
    let buffered = Buffer.alloc(0);
    let settled = false;

    // پل دوطرفه WS ↔ TLS — کنترل کامل read/write
    const bridge = new Duplex({
      write(chunk, _enc, cb) {
        try { socket.write(wsFrame(chunk)); cb(); } catch (e) { cb(e); }
      },
      read() { /* داده از طریق push میآید */ },
    });

    const done = (ok, extra) => {
      if (settled) return;
      settled = true;
      try { socket.destroy(); } catch {}
      try { innerTls?.destroy(); } catch {}
      resolve({ ok, ...extra });
    };

    const socket = tls.connect({
      host: ip, port: 443,
      servername: sni,
      ALPNProtocols: ['http/1.1'],
      rejectUnauthorized: false,
      timeout: 15000,
    });
    socket.setTimeout(15000, () => done(false, { error: 'timeout at ' + stage }));

    let innerTls = null;

    socket.on('secureConnect', () => {
      stage = 'upgrade';
      socket.write(
        `GET /${proxyPath}/${uuid} HTTP/1.1\r\n` +
        `Host: ${sni}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n` +
        'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\nSec-WebSocket-Version: 13\r\n\r\n'
      );
    });

    socket.on('data', (chunk) => {
      if (stage === 'upgrade') {
        upgradeBuf = Buffer.concat([upgradeBuf, chunk]);
        const idx = upgradeBuf.indexOf('\r\n\r\n');
        if (idx === -1) return;
        if (!upgradeBuf.slice(0, idx).toString('utf8').startsWith('HTTP/1.1 101')) return done(false, { error: 'upgrade rejected' });
        stage = 'ws';
        socket.write(wsFrame(vlessHeader(uuid, targetHost, targetPort)));
        return;
      }
      buffered = Buffer.concat([buffered, chunk]);
      while (true) {
        if (buffered.length < 2) break;
        const opcode = buffered[0] & 0x0f;
        let len = buffered[1] & 0x7f;
        let hdr = 2;
        if (len === 126) { if (buffered.length < 4) break; len = buffered.readUInt16BE(2); hdr = 4; }
        else if (len === 127) { if (buffered.length < 10) break; len = Number(buffered.readBigUInt64BE(2)); hdr = 10; }
        if (buffered.length < hdr + len) break;
        const payload = buffered.subarray(hdr, hdr + len);
        buffered = buffered.subarray(hdr + len);

        if (opcode === 2 && !gotAck && payload.length === 2 && payload[0] === 0 && payload[1] === 0) {
          gotAck = true;
          innerTls = tls.connect({ socket: bridge, servername: targetHost, rejectUnauthorized: false }, () => {
            innerTls.write('GET / HTTP/1.1\r\nHost: ' + targetHost + '\r\nConnection: close\r\n\r\n');
          });
          let out = '';
          innerTls.on('data', (d) => {
            out += d.toString('utf8');
            if (out.includes('\r\n\r\n')) {
              const line = out.split('\r\n')[0];
              done(out.startsWith('HTTP/'), { ms: Date.now() - t0, response: line });
            }
          });
          innerTls.on('error', (e) => done(false, { error: 'inner tls: ' + e.message.slice(0, 60) }));
        } else if (opcode === 2) {
          bridge.push(payload);
        } else if (opcode === 8) {
          done(false, { error: 'server closed ws' });
        }
      }
    });

    socket.on('error', (e) => done(false, { error: e.message }));
  });
}
