#!/usr/bin/env bash
# تست داشبورد — قدم ۳ (کاربران CRUD + تنظیمات)
set -u
BASE="http://localhost:8787"
PASS="TestPass1234!"
JAR=$(mktemp)
PASS_CNT=0
FAIL_CNT=0

pass() { PASS_CNT=$((PASS_CNT+1)); echo "  ✅ $1"; }
fail() { FAIL_CNT=$((FAIL_CNT+1)); echo "  ❌ $1"; }

echo "═══ ۰) نصب و ورود ═══"
cd /home/user/panel && npx wrangler d1 execute panel-db --local --command "DELETE FROM settings; DELETE FROM login_attempts; DELETE FROM users;" >/dev/null 2>&1

INSTALL_RESP=$(curl -s -X POST "$BASE/install" -H 'Content-Type: application/json' -d "{\"password\":\"$PASS\",\"confirm\":\"$PASS\"}")
SP=$(echo "$INSTALL_RESP" | sed -n 's/.*"redirect":"\/\([a-z0-9]*\)\/panel".*/\1/p')
[ -n "$SP" ] && pass "securePath: $SP" || fail "securePath: $INSTALL_RESP"
curl -s -c "$JAR" -X POST "$BASE/$SP/login" -H 'Content-Type: application/json' -d "{\"password\":\"$PASS\"}" >/dev/null

echo "═══ ۱) API بدون سشن → 401 ═══"
CODE=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/$SP/panel/api/users")
[ "$CODE" = "401" ] && pass "GET users بدون کوکی → 401" || fail "GET users بدون کوکی: $CODE"
CODE=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/$SP/panel/api/settings")
[ "$CODE" = "401" ] && pass "GET settings بدون کوکی → 401" || fail "GET settings بدون کوکی: $CODE"

echo "═══ ۲) ساخت کاربر ═══"
RESP=$(curl -s -b "$JAR" -X POST "$BASE/$SP/panel/api/users" -H 'Content-Type: application/json' -d '{"username":"alice","quotaGb":50,"expiryDays":30,"note":"تست"}')
if echo "$RESP" | grep -q '"ok":true' && echo "$RESP" | grep -q '"uuid"'; then pass "ساخت alice → $RESP"; else fail "ساخت alice: $RESP"; fi

RESP=$(curl -s -b "$JAR" -X POST "$BASE/$SP/panel/api/users" -H 'Content-Type: application/json' -d '{"username":"alice","quotaGb":50}')
if echo "$RESP" | grep -q '"username_taken"'; then pass "تکراری → 409 username_taken"; else fail "تکراری: $RESP"; fi

RESP=$(curl -s -b "$JAR" -X POST "$BASE/$SP/panel/api/users" -H 'Content-Type: application/json' -d '{"username":"a!","quotaGb":10}')
if echo "$RESP" | grep -q '"invalid_username"'; then pass "نام نامعتبر → invalid_username"; else fail "نام نامعتبر: $RESP"; fi

curl -s -b "$JAR" -X POST "$BASE/$SP/panel/api/users" -H 'Content-Type: application/json' -d '{"username":"bob","quotaGb":0,"expiryDays":0}' >/dev/null

echo "═══ ۳) لیست کاربران ═══"
RESP=$(curl -s -b "$JAR" "$BASE/$SP/panel/api/users")
if echo "$RESP" | grep -q '"alice"' && echo "$RESP" | grep -q '"bob"' && echo "$RESP" | grep -q '"status":"active"'; then pass "لیست شامل alice و bob است"; else fail "لیست: $RESP"; fi
ALICE_ID=$(echo "$RESP" | sed -n 's/.*"id":\([0-9]*\),"username":"alice".*/\1/p')
BOB_QUOTA=$(echo "$RESP" | sed -n 's/.*"username":"bob","uuid":"[^"]*","quotaGb":\([0-9]*\).*/\1/p')
[ "$BOB_QUOTA" = "0" ] && pass "bob بدون کوتا (0=نامحدود)" || fail "bob کوتا: $BOB_QUOTA"

echo "═══ ۴) فعال/غیرفعال ═══"
RESP=$(curl -s -b "$JAR" -X POST "$BASE/$SP/panel/api/users/$ALICE_ID/toggle" -H 'Content-Type: application/json' -d '{"active":false}')
if echo "$RESP" | grep -q '"active":false'; then pass "غیرفعال‌سازی alice"; else fail "toggle: $RESP"; fi
RESP=$(curl -s -b "$JAR" "$BASE/$SP/panel/api/users")
echo "$RESP" | grep -q '"username":"alice","uuid":"[^"]*","quotaGb":50,"usedGb":[0-9.]*,"expiry":[0-9]*,"expiryDaysLeft":[0-9]*,"status":"disabled"' && pass "وضعیت alice = disabled در لیست" || fail "وضعیت: $RESP"

echo "═══ ۵) تنظیمات — تغییر رمز ═══"
# رمز فعلی اشتباه
RESP=$(curl -s -b "$JAR" -X POST "$BASE/$SP/panel/api/settings/password" -H 'Content-Type: application/json' -d '{"current":"wrong","next":"NewPass5678!","confirm":"NewPass5678!"}')
echo "$RESP" | grep -q '"wrong_current"' && pass "رمز فعلی اشتباه → 401" || fail "wrong_current: $RESP"
# رمز ضعیف
RESP=$(curl -s -b "$JAR" -X POST "$BASE/$SP/panel/api/settings/password" -H 'Content-Type: application/json' -d "{\"current\":\"$PASS\",\"next\":\"123\",\"confirm\":\"123\"}")
echo "$RESP" | grep -q '"weak_password"' && pass "رمز ضعیف → 400" || fail "weak: $RESP"
# عدم تطابق
RESP=$(curl -s -b "$JAR" -X POST "$BASE/$SP/panel/api/settings/password" -H 'Content-Type: application/json' -d "{\"current\":\"$PASS\",\"next\":\"NewPass5678!\",\"confirm\":\"x\"}")
echo "$RESP" | grep -q '"mismatch"' && pass "عدم تطابق → 400" || fail "mismatch: $RESP"
# تغییر موفق
RESP=$(curl -s -b "$JAR" -X POST "$BASE/$SP/panel/api/settings/password" -H 'Content-Type: application/json' -d "{\"current\":\"$PASS\",\"next\":\"NewPass5678!\",\"confirm\":\"NewPass5678!\"}")
echo "$RESP" | grep -q '"ok":true' && pass "تغییر رمز موفق" || fail "change: $RESP"
# ورود با رمز قدیمی → ناموفق
CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/$SP/login" -H 'Content-Type: application/json' -d "{\"password\":\"$PASS\"}")
[ "$CODE" = "401" ] && pass "رمز قدیمی دیگر کار نمی‌کند" || fail "رمز قدیمی: $CODE"
# ورود با رمز جدید → موفق
CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/$SP/login" -H 'Content-Type: application/json' -d '{"password":"NewPass5678!"}')
[ "$CODE" = "200" ] && pass "رمز جدید کار می‌کند" || fail "رمز جدید: $CODE"

echo "═══ ۶) بازسازی مسیر مخفی ═══"
RESP=$(curl -s -b "$JAR" -X POST "$BASE/$SP/panel/api/settings/secure-path" -H 'Content-Type: application/json' -d '{}')
NEW_SP=$(echo "$RESP" | sed -n 's/.*"securePath":"\([a-z0-9]*\)".*/\1/p')
if [ -n "$NEW_SP" ] && [ "$NEW_SP" != "$SP" ]; then pass "مسیر جدید: $NEW_SP"; else fail "secure-path: $RESP"; fi
CODE=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/$SP/panel")
[ "$CODE" = "404" ] && pass "مسیر قدیمی → 404" || fail "مسیر قدیمی: $CODE"
CODE=$(curl -s -b "$JAR" -o /dev/null -w '%{http_code}' "$BASE/$NEW_SP/panel")
[ "$CODE" = "200" ] && pass "مسیر جدید با سشن → 200" || fail "مسیر جدید: $CODE"
SP=$NEW_SP

echo "═══ ۷) حذف کاربر ═══"
RESP=$(curl -s -b "$JAR" -X POST "$BASE/$SP/panel/api/users" -H 'Content-Type: application/json' -d '{"username":"temp","quotaGb":5}')
TEMP_ID=$(echo "$RESP" | sed -n 's/.*"id":\([0-9]*\),"username":"temp".*/\1/p')
RESP=$(curl -s -b "$JAR" -X DELETE "$BASE/$SP/panel/api/users/$TEMP_ID")
echo "$RESP" | grep -q '"ok":true' && pass "حذف کاربر" || fail "delete: $RESP"
RESP=$(curl -s -b "$JAR" "$BASE/$SP/panel/api/users")
echo "$RESP" | grep -q '"temp"' && fail "temp هنوز هست" || pass "کاربر حذف‌شده در لیست نیست"

echo "═══ ۸) صفحه پنل ═══"
CODE=$(curl -s -b "$JAR" -o /tmp/panel3.html -w '%{http_code}' "$BASE/$SP/panel")
if [ "$CODE" = "200" ] && grep -q "view-overview" /tmp/panel3.html && grep -q "view-users" /tmp/panel3.html && grep -q "view-settings" /tmp/panel3.html; then
  pass "پنل کامل → سه view موجود"
else
  fail "پنل: $CODE"
fi

echo "═══ ۹) آمار داشبورد (stats) ═══"
CODE=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/$SP/panel/api/stats")
[ "$CODE" = "401" ] && pass "stats بدون کوکی → 401" || fail "stats بدون کوکی: $CODE"
RESP=$(curl -s -b "$JAR" "$BASE/$SP/panel/api/stats")
if echo "$RESP" | grep -q '"counts"' && echo "$RESP" | grep -q '"topUsers"' && echo "$RESP" | grep -q '"recent"' && echo "$RESP" | grep -q '"daily"'; then
  pass "stats → counts/topUsers/recent/daily موجود"
else
  fail "stats: $RESP"
fi
echo "$RESP" | grep -q '"panel"' && echo "$RESP" | grep -q '"securePath"' && pass "stats → info پنل موجود" || fail "stats panel: $RESP"

echo "═══ ۱۰) کانفیگ با IP تمیز و پورت جایگزین ═══"
RESP=$(curl -s -b "$JAR" "$BASE/$SP/panel/api/users")
ALICE_UUID=$(echo "$RESP" | sed -n 's/.*"username":"alice","uuid":"\([0-9a-f-]*\)".*/\1/p')
RESP=$(curl -s -b "$JAR" "$BASE/$SP/panel/api/config?server=104.16.130.229&uuid=$ALICE_UUID&port=8443")
if echo "$RESP" | grep -q '"ok":true' && echo "$RESP" | grep -q '@104.16.130.229:8443' && echo "$RESP" | grep -q '"port":8443'; then
  pass "config با پورت 8443 → کانفیگ روی 8443"
else
  fail "config port: $RESP"
fi
RESP=$(curl -s -b "$JAR" "$BASE/$SP/panel/api/config?server=104.16.130.229&uuid=$ALICE_UUID")
if echo "$RESP" | grep -q '@104.16.130.229:443'; then
  pass "config بدون پورت → پیش‌فرض 443"
else
  fail "config default: $RESP"
fi
RESP=$(curl -s -b "$JAR" "$BASE/$SP/panel/api/config?server=104.16.130.229&uuid=$ALICE_UUID&port=99999")
echo "$RESP" | grep -q '"bad_params"' && pass "پورت نامعتبر → bad_params" || fail "port bad: $RESP"

echo ""
echo "═══════════════════════════════════"
echo "  نتیجه: $PASS_CNT موفق / $FAIL_CNT ناموفق"
echo "═══════════════════════════════════"

rm -f "$JAR"
