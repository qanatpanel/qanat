/** سرور echo محلی (TCP) برای تست E2E پروکسی */
const net = require('node:net');
const port = Number(process.argv[2] || 9999);
const PREFIX = Buffer.from('ECHO:', 'utf8');
const server = net.createServer((socket) => {
  socket.on('data', (chunk) => socket.write(Buffer.concat([PREFIX, chunk])));
});
server.listen(port, '127.0.0.1', () => console.log(`[echo] listening on 127.0.0.1:${port}`));
