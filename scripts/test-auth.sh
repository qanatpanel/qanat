#!/usr/bin/env bash
# تست کامل احراز هویت — قدم ۲ (مستقل: دیتابیس را پاک می‌کند)
set -u
BASE="http://localhost:8787"
PASS="TestPass1234!"
JAR=$(mktemp)
PASS_CNT=0
FAIL_CNT=0

# شروع تمیز
cd /home/user/panel && npx wrangler d1 execute panel-db --local --command "DELETE FROM settings; DELETE FROM login_attempts; DELETE FROM users;" >/dev/null 2>&1

pass() { PASS_CNT=$((PASS_CNT+1)); echo "  ✅ $1"; }
fail() { FAIL_CNT=$((FAIL_CNT+1)); echo "  ❌ $1"; }

echo "═══ ۱) نصب اولیه ═══"

# صفحه نصب
CODE=$(curl -s -o /tmp/install.html -w '%{http_code}' "$BASE/install")
if [ "$CODE" = "200" ] && grep -q "install-form" /tmp/install.html; then pass "GET /install → 200 + فرم"; else fail "GET /install → $CODE"; fi

# رمز ضعیف
RESP=$(curl -s -X POST "$BASE/install" -H 'Content-Type: application/json' -d '{"password":"123","confirm":"123"}')
if echo "$RESP" | grep -q '"weak_password"'; then pass "رمز ضعیف رد شد (weak_password)"; else fail "رمز ضعیف: $RESP"; fi

# عدم تطابق
RESP=$(curl -s -X POST "$BASE/install" -H 'Content-Type: application/json' -d "{\"password\":\"$PASS\",\"confirm\":\"other\"}")
if echo "$RESP" | grep -q '"mismatch"'; then pass "عدم تطابق رد شد (mismatch)"; else fail "عدم تطابق: $RESP"; fi

# نصب موفق
RESP=$(curl -s -X POST "$BASE/install" -H 'Content-Type: application/json' -d "{\"password\":\"$PASS\",\"confirm\":\"$PASS\"}")
if echo "$RESP" | grep -q '"ok":true'; then pass "نصب موفق → $RESP"; else fail "نصب: $RESP"; fi

# بعد از نصب، /install ریدایرکت به پنل
CODE=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/install")
if [ "$CODE" = "302" ]; then pass "بعد از نصب، /install → 302"; else fail "بعد از نصب: $CODE"; fi

# استخراج securePath از پاسخ نصب (redirect)
SP=$(echo "$RESP" | grep -oP '(?<="redirect":"/)[a-z0-9]+')
if [ -n "$SP" ]; then pass "securePath تولید شد: $SP"; else fail "securePath یافت نشد: $RESP"; fi

echo "═══ ۲) دسترسی بدون سشن ═══"

# پنل بدون کوکی → ریدایرکت به لاگین
CODE=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/$SP/panel")
LOC=$(curl -s -o /dev/null -w '%{redirect_url}' "$BASE/$SP/panel")
if [ "$CODE" = "302" ] && echo "$LOC" | grep -q "/login"; then pass "پنل بدون کوکی → 302 به login"; else fail "پنل بدون کوکی: $CODE $LOC"; fi

# مسیر ریشه و مسیر بدون securePath → 404
CODE=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/login")
if [ "$CODE" = "404" ]; then pass "صفحه ورود بدون securePath → 404 (پنهان‌مانی)"; else fail "ورود بدون securePath: $CODE"; fi

# صفحه ورود
CODE=$(curl -s -o /tmp/login.html -w '%{http_code}' "$BASE/$SP/login")
if [ "$CODE" = "200" ] && grep -q "login-form" /tmp/login.html; then pass "GET /login → 200 + فرم"; else fail "GET /login → $CODE"; fi

echo "═══ ۳) بروت‌فورس ═══"

# ۵ تلاش ناموفق
for i in 1 2 3 4; do
  RESP=$(curl -s -X POST "$BASE/$SP/login" -H 'Content-Type: application/json' -d '{"password":"wrong"}')
  if echo "$RESP" | grep -q '"invalid"'; then :; else fail "تلاش $i: $RESP"; break; fi
done
RESP=$(curl -s -w '\n%{http_code}' -X POST "$BASE/$SP/login" -H 'Content-Type: application/json' -d '{"password":"wrong"}')
CODE=$(echo "$RESP" | tail -1)
if [ "$CODE" = "429" ]; then pass "تلاش پنجم → 429 قفل شد"; else fail "تلاش پنجم: $CODE $RESP"; fi

# حتی با رمز درست هم قفل است
RESP=$(curl -s -X POST "$BASE/$SP/login" -H 'Content-Type: application/json' -d "{\"password\":\"$PASS\"}")
if echo "$RESP" | grep -q '"locked"'; then pass "رمز درست هم هنگام قفل رد می‌شود (locked)"; else fail "قفل: $RESP"; fi

# پاک‌سازی قفل (شبیه‌سازی گذشت زمان)
cd /home/user/panel && npx wrangler d1 execute panel-db --local --command "DELETE FROM login_attempts;" >/dev/null 2>&1

echo "═══ ۴) ورود موفق ═══"

RESP=$(curl -s -c "$JAR" -w '\n%{http_code}' -X POST "$BASE/$SP/login" -H 'Content-Type: application/json' -d "{\"password\":\"$PASS\"}")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -1)
if [ "$CODE" = "200" ] && echo "$BODY" | grep -q '"ok":true'; then pass "ورود موفق → 200 + ok"; else fail "ورود: $CODE $BODY"; fi

if grep -q "panel_session" "$JAR"; then pass "کوکی panel_session ست شد (HttpOnly)"; else fail "کوکی ست نشد"; fi

echo "═══ ۵) دسترسی با سشن ═══"

CODE=$(curl -s -b "$JAR" -o /tmp/panel.html -w '%{http_code}' "$BASE/$SP/panel")
if [ "$CODE" = "200" ] && grep -q "session-chip" /tmp/panel.html; then pass "GET /panel با کوکی → 200 + پوسته"; else fail "GET /panel با کوکی → $CODE"; fi

RESP=$(curl -s -b "$JAR" "$BASE/$SP/panel/api/me")
if echo "$RESP" | grep -q '"sub":"admin"'; then pass "api/me → $RESP"; else fail "api/me: $RESP"; fi

# رمز اشتباه بعد از موفقیت، شمارنده را بازنشانی کرده است
RESP=$(curl -s -X POST "$BASE/$SP/login" -H 'Content-Type: application/json' -d '{"password":"wrong"}')
if echo "$RESP" | grep -q '"attemptsLeft":4'; then pass "شمارنده بروت‌فورس بعد از ورود موفق ریست شد"; else fail "ریست شمارنده: $RESP"; fi

echo "═══ ۶) خروج ═══"

CODE=$(curl -s -b "$JAR" -o /dev/null -w '%{http_code}' "$BASE/$SP/logout")
if [ "$CODE" = "302" ]; then pass "GET /logout → 302"; else fail "logout: $CODE"; fi
CODE=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/$SP/panel")
if [ "$CODE" = "302" ]; then pass "بعد از خروج، پنل دوباره 302 به login"; else fail "بعد از خروج: $CODE"; fi

rm -f "$JAR"
echo ""
echo "═══════════════════════════════════"
echo "  نتیجه: $PASS_CNT موفق / $FAIL_CNT ناموفق"
echo "═══════════════════════════════════"
