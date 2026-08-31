#!/usr/bin/env bash
# تست end-to-end پروکسی WebSocket (VLESS + Trojan) — با سرور echo محلی
set -u
BASE="http://localhost:8787"
PASS="TestPass1234!"
JAR=$(mktemp)
PASS_CNT=0
FAIL_CNT=0

pass() { PASS_CNT=$((PASS_CNT+1)); echo "  ✅ $1"; }
fail() { FAIL_CNT=$((FAIL_CNT+1)); echo "  ❌ $1"; }

echo "═══ ۰) راه‌اندازی: نصب + کاربر ═══"
cd /home/user/panel && npx wrangler d1 execute panel-db --local --command "DELETE FROM settings; DELETE FROM login_attempts; DELETE FROM users;" >/dev/null 2>&1

INSTALL_RESP=$(curl -s -X POST "$BASE/install" -H 'Content-Type: application/json' -d "{\"password\":\"$PASS\",\"confirm\":\"$PASS\"}")
SP=$(echo "$INSTALL_RESP" | sed -n 's/.*"redirect":"\/\([a-z0-9]*\)\/panel".*/\1/p')
curl -s -c "$JAR" -X POST "$BASE/$SP/login" -H 'Content-Type: application/json' -d "{\"password\":\"$PASS\"}" >/dev/null
[ -n "$SP" ] && pass "نصب شد (securePath=$SP)" || fail "نصب"

USER_RESP=$(curl -s -b "$JAR" -X POST "$BASE/$SP/panel/api/users" -H 'Content-Type: application/json' -d '{"username":"alice","quotaGb":10}')
UUID=$(echo "$USER_RESP" | sed -n 's/.*"uuid":"\([^"]*\)".*/\1/p')
[ -n "$UUID" ] && pass "کاربر ساخته شد ($UUID)" || fail "کاربر"

# مسیر پروکسی از تنظیمات
PROXY_RESP=$(curl -s -b "$JAR" "$BASE/$SP/panel/api/settings/proxy")
PROXY_PATH=$(echo "$PROXY_RESP" | sed -n 's/.*"proxyPath":"\([a-z0-9]*\)".*/\1/p')
[ -n "$PROXY_PATH" ] && pass "مسیر پروکسی: $PROXY_PATH" || fail "proxyPath: $PROXY_RESP"

echo "═══ ۱) تست VLESS (echo) ═══"
RESULT=$(node -e "
const WebSocket = require('ws');
const { buildVlessHeader } = require('/tmp/parse.test.cjs');

(async () => {
  const uuid = '$UUID';
  const path = '$PROXY_PATH';
  const ws = new WebSocket('ws://127.0.0.1:8787/' + path + '/' + uuid);

  const timer = setTimeout(() => { console.log('TIMEOUT'); process.exit(2); }, 8000);

  ws.on('open', () => {
    const header = buildVlessHeader(uuid, '127.0.0.1', 9999, 'tcp');
    const payload = new Uint8Array(header.length + 5);
    payload.set(header, 0);
    payload.set(new TextEncoder().encode('hello'), header.length);
    ws.send(payload);
  });

  let received = '';
  ws.on('message', (data) => {
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
    received += buf.toString('utf8');
    if (received.length >= 5) {
      clearTimeout(timer);
      console.log('ECHO:' + received);
      ws.close();
      process.exit(received.includes('hello') ? 0 : 1);
    }
  });
  ws.on('error', (e) => { clearTimeout(timer); console.log('WS_ERROR:' + e.message); process.exit(3); });
})();
")
RESULT_CLEAN=$(printf "%s" "$RESULT" | tr -d "\000")
if echo "$RESULT_CLEAN" | grep -q "ECHO:hello"; then pass "VLESS: echo دریافت شد → $RESULT_CLEAN"; else fail "VLESS: $RESULT_CLEAN"; fi

echo "═══ ۲) تست VLESS با UUID نامعتبر (باید بسته شود) ═══"
RESULT=$(node -e "
const WebSocket = require('ws');
const { buildVlessHeader } = require('/tmp/parse.test.cjs');
(async () => {
  const uuid = '00000000-0000-0000-0000-000000000000';
  const path = '$PROXY_PATH';
  const ws = new WebSocket('ws://127.0.0.1:8787/' + path + '/' + uuid);
  const timer = setTimeout(() => { console.log('TIMEOUT'); process.exit(2); }, 5000);
  ws.on('open', () => {
    const header = buildVlessHeader(uuid, '127.0.0.1', 9999, 'tcp');
    const payload = new Uint8Array(header.length + 4);
    payload.set(header, 0);
    payload.set(new TextEncoder().encode('ping'), header.length);
    ws.send(payload);
  });
  let got = false;
  ws.on('message', () => { got = true; });
  ws.on('close', (code) => {
    clearTimeout(timer);
    console.log('CLOSED:' + code + ':got=' + got);
    process.exit(got ? 4 : 0);
  });
  ws.on('error', () => {});
})();
")
if echo "$RESULT" | grep -q "CLOSED"; then pass "UUID نامعتبر → اتصال بسته شد"; else fail "UUID نامعتبر: $RESULT"; fi

echo "═══ ۳) تست Trojan (echo) ═══"
# ساخت پسورد تروجان ۵۶ هگز برای کاربر
TROJAN_PASS=$(node -e "
const crypto = require('crypto');
process.stdout.write(crypto.randomBytes(28).toString('hex'));
")
cd /home/user/panel && npx wrangler d1 execute panel-db --local --command "UPDATE users SET trojan_password='$TROJAN_PASS' WHERE username='alice';" >/dev/null 2>&1

RESULT=$(node -e "
const WebSocket = require('ws');
const { buildTrojanHeader } = require('/tmp/parse.test.cjs');
(async () => {
  const pass = '$TROJAN_PASS';
  const path = '$PROXY_PATH';
  const ws = new WebSocket('ws://127.0.0.1:8787/' + path + '/' + pass);
  const timer = setTimeout(() => { console.log('TIMEOUT'); process.exit(2); }, 8000);
  ws.on('open', () => {
    const header = buildTrojanHeader(pass, '127.0.0.1', 9999, 'tcp');
    const payload = new Uint8Array(header.length + 5);
    payload.set(header, 0);
    payload.set(new TextEncoder().encode('troj'), header.length);
    ws.send(payload);
  });
  let received = '';
  ws.on('message', (data) => {
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
    received += buf.toString('utf8');
    if (received.length >= 4) {
      clearTimeout(timer);
      console.log('ECHO:' + received);
      ws.close();
      process.exit(received.includes('troj') ? 0 : 1);
    }
  });
  ws.on('error', (e) => { clearTimeout(timer); console.log('WS_ERROR:' + e.message); process.exit(3); });
})();
")
RESULT_CLEAN=$(printf "%s" "$RESULT" | tr -d "\000")
if echo "$RESULT_CLEAN" | grep -q "troj"; then pass "Trojan: echo دریافت شد"; else fail "Trojan: $RESULT_CLEAN"; fi

echo "═══ ۴) مصرف کاربر ثبت شد؟ ═══"
USAGE=$(cd /home/user/panel && npx wrangler d1 execute panel-db --local --command "SELECT used_gb FROM users WHERE username='alice';" 2>/dev/null | sed -n 's/.*"used_gb":[ ]*\([0-9.e-]*\).*/\1/p')
if [ -n "$USAGE" ] && [ "$USAGE" != "0" ] && [ "$USAGE" != "0.0" ]; then pass "مصرف ثبت شد: $USAGE GB"; else fail "مصرف: '$USAGE'"; fi

echo "═══ ۵) endpoint های اشتراک ═══"
TXT=$(curl -s "$BASE/$SP/sub/$UUID/txt")
if echo "$TXT" | base64 -d 2>/dev/null | grep -q "vless://"; then pass "اشتراک متنی base64 → vless:// موجود"; else fail "txt: $TXT"; fi
CODE=$(curl -s -o /tmp/clash.yaml -w '%{http_code}' "$BASE/$SP/sub/$UUID?format=clash")
if [ "$CODE" = "200" ] && grep -q "proxies:" /tmp/clash.yaml && grep -q "vless" /tmp/clash.yaml; then pass "Clash YAML تولید شد"; else fail "clash: $CODE"; fi
CODE=$(curl -s -o /tmp/singbox.json -w '%{http_code}' "$BASE/$SP/sub/$UUID?format=singbox")
if [ "$CODE" = "200" ] && grep -q '"outbounds"' /tmp/singbox.json; then pass "sing-box JSON تولید شد"; else fail "singbox: $CODE"; fi
CODE=$(curl -s -o /tmp/sub.html -w '%{http_code}' "$BASE/$SP/sub/$UUID")
if [ "$CODE" = "200" ] && grep -q "اشتراک شما" /tmp/sub.html && grep -q "svg" /tmp/sub.html; then pass "صفحه اشتراک با QR"; else fail "sub page: $CODE"; fi

echo ""
echo "═══════════════════════════════════"
echo "  نتیجه: $PASS_CNT موفق / $FAIL_CNT ناموفق"
echo "═══════════════════════════════════"
rm -f "$JAR"
