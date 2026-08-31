/**
 * پراکسی ساده برای پیش‌نمایش زنده
 * 0.0.0.0:8788  →  localhost:8787 (wrangler dev)
 */
import http from 'node:http';

const TARGET = { host: '127.0.0.1', port: 8787 };

const server = http.createServer((req, res) => {
  const proxyReq = http.request(
    {
      host: TARGET.host,
      port: TARGET.port,
      method: req.method,
      path: req.url,
      headers: req.headers,
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
      proxyRes.pipe(res);
    },
  );
  proxyReq.on('error', () => {
    res.writeHead(502, { 'content-type': 'text/plain' });
    res.end('502 — wrangler dev is not running');
  });
  req.pipe(proxyReq);
});

server.listen(8788, '0.0.0.0', () => {
  console.log('🌐 preview proxy on http://0.0.0.0:8788 → wrangler :8787');
});
