# قنات — Qanat

<p align="center"><img src="assets/logo-mark.svg" width="120" alt="لوگوی قنات"/></p>

پنل چندکاربره و هسته‌ی پروکسی روی **Cloudflare Workers** — TypeScript + D1 + esbuild

> **قنات** — کانال زیرزمینی که آب را از دل کویر عبور می‌دهد؛ همین کار را این پنل با داده‌ها می‌کند:
> داده را از دل فیلترینگ، بی‌صدا و زیر رادار عبور می‌دهد.

> معماری بر اساس تحلیل ۴ پروژهی مشابه (BPB / Nahan / ZEUS / Nova):
> ماژولار مثل **BPB**، مدل داده و امکانات چندکاربره مثل **ZEUS/Nova**، امنیت نصب مثل **Nova**.

---

## 🚀 اجرای محلی

```bash
npm install          # نصب وابستگی‌ها
npm run check        # تایپ‌چک
npm run build        # بیلد → dist/_worker.js (تک‌فایل)
npm run dev          # بیلد + سرور محلی wrangler روی :8787
```

پیش‌نمایش زنده در مرورگر: پورت `8788` (پراکسی → wrangler).

## ☁️ دیپلوی روی Cloudflare

```bash
# ۱. ساخت دیتابیس D1 (یک‌بار)
npx wrangler d1 create panel-db
#    → شناسه‌ی تولیدشده را در wrangler.jsonc قرار بده

# ۲. اعمال اسکیما
npm run db:remote

# ۳. دیپلوی
npm run deploy
```

> اسکیما همچنین به‌صورت خودکار و idempotent در اولین استفاده اعمال می‌شود (`src/settings/db.ts`).

---

## 📁 ساختار پروژه

```
panel/
├── wrangler.jsonc          # کانفیگ Wrangler + بایند D1
├── schema.sql              # اسکیمای دیتابیس (مرجع دستی)
├── scripts/
│   ├── build.mjs           # بیلد: assets → TS → dist/_worker.js (الگوی BPB)
│   ├── preview-proxy.mjs   # پراکسی پیش‌نمایش (۰.۰.۰.۰:8788)
│   ├── test-auth.sh        # تست خودکار ۱۸ سناریوی احراز هویت
│   ├── test-panel.sh       # تست خودکار ۲۲ سناریوی داشبورد
│   ├── test-parser.sh      # تست واحد پارسرهای VLESS/Trojan (۱۴ مورد)
│   └── test-proxy.sh       # تست E2E پروکسی: VLESS + Trojan + مصرف + اشتراک
└── src/
    ├── worker.ts           # ورودی + روتینگ اصلی
    ├── types/              # تایپ‌های Env و سراسری
    ├── auth/               # 🔐 password (PBKDF2) + session (JWT) + guard (بروت‌فورس)
    ├── settings/           # db (D1) + main (تنظیمات امنیتی) + users (چندکاربره)
    ├── proxy/              # 🚀 هسته‌ی پروکسی: parse (VLESS/Trojan) + relay (WS→TCP)
    ├── cores/              # qr — تولید QR سمت سرور (SVG)
    ├── handlers/           # install / login / panel / api (کاربران+تنظیمات) / subscription
    ├── assets/             # صفحات HTML (login / install / panel) + shared.css
    └── generated/          # (خودکار) صفحات مینی‌فای‌شده — gitignore
```

## 🎛️ داشبورد (قدم ۳)

سه بخش با تب‌های ساده (بدون وابستگی خارجی):

| بخش | امکانات |
|---|---|
| **نمای کلی** | ۴ کارت آمار (کل کاربران، فعال، مصرف، کوتای کل) + دسترسی سریع + اطلاعات پنل |
| **کاربران** | جدول کامل: وضعیت، کوتا با نوار پیشرفت، انقضا — ساخت/فعال‌سازی/حذف/کپی UUID |
| **تنظیمات** | تغییر رمز (با تأیید رمز فعلی) + نمایش/بازسازی مسیر مخفی + وضعیت کلایم توکن |

API های جدید (همه با سشن):
```
GET    /{securePath}/panel/api/users
POST   /{securePath}/panel/api/users
POST   /{securePath}/panel/api/users/:id/toggle
DELETE /{securePath}/panel/api/users/:id
GET    /{securePath}/panel/api/settings
POST   /{securePath}/panel/api/settings/password
POST   /{securePath}/panel/api/settings/secure-path
```

## 🔐 احراز هویت (قدم ۲)

## 🗄️ مدل داده (D1)

| جدول | نقش |
|---|---|
| `settings` | تنظیمات پنل (key-value): پسورد، مسیر مخفی، کلایم توکن و... |
| `users` | کاربران: `uuid`، `trojan_password`، کوتای GB، انقضا، وضعیت |
| `login_attempts` | محافظ بروت‌فورس (قفل موقت IP بعد از N تلاش ناموفق) |

## 🗺️ نقشه‌ی راه

- [x] **قدم ۰** — اسکلت پروژه: TS + بیلد + wrangler + D1
- [x] **قدم ۱** — لایه‌ی ذخیره‌سازی: اسکیما + تنظیمات + کاربران + بروت‌فورس
- [x] **قدم ۲** — 🔐 احراز هویت: JWT (jose) + PBKDF2 + مسیر مخفی + کلایم توکن
- [x] **قدم ۳** — پوسته‌ی داشبورد: ناوبری + نمای کلی + مدیریت کاربران CRUD + تنظیمات
- [x] **قدم ۴** — تنظیمات پروکسی (فیلدهای پیشرفته: پروتکل، دامنه، Fragment و...) + بکاپ/رستور
- [x] **قدم ۵** — تولید اشتراک/کانفیگ: vless:// + Clash + sing-box + Xray
- [x] **قدم ۶** — هسته‌ی پروکسی: WebSocket + VLESS/Trojan
- [ ] **قدم ۷** — ربات تلگرام + آپدیت خودکار (با healthz و احتیاط Nova)

## 🚀 هسته‌ی پروکسی (قدم ۶)

رله‌ی واقعی WebSocket → TCP با پشتیبانی از دو پروتکل:

| ویژگی | جزئیات |
|---|---|
| **VLESS** | پارس هدر کامل (UUID + آدرس + پورت + command)، پاسخ `[0,0]`، پشتیبانی از داده‌ی هم‌فریم |
| **Trojan** | پارس پسورد (۵۶ هگز) + هدر (CRLF)، پاسخ `\r\n`، پشتیبانی از داده‌ی هم‌فریم |
| **مسیر اتصال** | `/api/{proxyPath}/{uuid-or-password}` — بدون نیاز به هیچ هدر اضافه |
| **مصرف** | ثبت خودکار ترافیک (up+down) روی کاربر در D1 — فقط برای کاربران دارای کوتا |
| **نرخ‌دهی** | فقط کاربران `active` با کوتای باقی‌مانده مجازند |
| **رله** | non-blocking با `WebSocketPair` + حلقه‌ی پس‌زمینه؛ بستن کامل دوطرفه |
| **اعتبارسنجی** | UUID نامعتبر / پسورد نامعتبر → بستن اتصال |

### اشتراک و کانفیگ (قدم ۵)

- `/{securePath}/sub/{uuid}` — صفحه‌ی زیبای اشتراک با **QR سمت سرور** (SVG) و دکمه‌ی کپی
- `/{securePath}/sub/{uuid}/txt` — اشتراک متنی base64 (سازگار با v2rayN و...)
- `?format=clash` — کانفیگ YAML برای Clash Meta
- `?format=singbox` — کانفیگ JSON برای sing-box
- کانفیگ‌ها بر اساس تنظیمات پروکسی (host/port/tls/sni) بازسازی می‌شوند

### 🔧 سازگاری کامل با کلاینتهای واقعی

پروتکل پروکسی **استاندارد رسمی VLESS/Trojan** است (سازگار با v2rayNG، Hiddify، Streisand، sing-box، Clash):
- مسیر WebSocket: `/{proxyPath}/{uuid|password}` — الگوی BPB
- هدر VLESS کاملاً استاندارد: `version | uuid | addonLen | cmd | port | atype | addr`
- `alpn=http/1.1` (نه h2 — WebSocket روی h2 با کلودفلر خراب میشود)
- `fp=chrome`، `sni`، `host` کامل

تأیید شده با تست E2E روی کلودفلر واقعی: **IP تمیز → worker → یوتیوب → HTTP 200** (285ms)

### 📡 اسکنر IP تمیز کلودفلر (جدید)

تب «اسکنر» در داشبورد — پیدا کردن IP های تمیز کلودفلر از مرورگر خودتان:

- **پینگ واقعی (RTT)**: هر IP با WebSocket روی پورت 443 از مرورگر شما تست می‌شود — نتیجه، تأخیر واقعی دستگاه شماست
- **رنج‌های رسمی Cloudflare**: تولید IP تصادفی از ۱۵ رنج IPv4 رسمی (۱۶۰+ میلیون آدرس)
- **همزمانی قابل تنظیم**: ۱۵/۳۰/۶۰ اتصال موازی + مهلت ۱–۳ ثانیه
- **رتبه‌بندی**: بهترین IP ها بر اساس کمترین پینگ با نشان ★
- **کانفیگ با IP تمیز**: با دکمه‌ی «کپی» روی هر IP، کانفیگی ساخته می‌شود که به آن IP وصل می‌شود ولی Host/SNI همچنان دامنه‌ی شماست — این کانفیگ واقعاً کار می‌کند (اتصال به IP تمیز + احراز هویت با دامنه)

### تست‌ها

| اسکریپت | پوشش | نتیجه |
|---|---|---|
| `scripts/test-parser.sh` | ۱۴ تست واحد پارسر VLESS/Trojan | ✅ |
| `scripts/test-config.sh` | ۲۲ تست واحد تولید کانفیگ (URI/Clash/sing-box/IP تمیز) | ✅ |
| `scripts/test-proxy.sh` | E2E: VLESS echo، Trojan echo، UUID نامعتبر، مصرف، ۴ endpoint اشتراک (۱۱ تست) | ✅ |
| `scripts/test-panel.sh` | ۲۲ سناریوی داشبورد و API کاربران | ✅ |
| `scripts/test-auth.sh` | ۱۸ سناریوی احراز هویت و بروت‌فورس | ✅ |

## 🔐 احراز هویت (قدم ۲)

| مؤلفه | پیاده‌سازی | برگرفته از |
|---|---|---|
| هش پسورد | PBKDF2 — ۱۰۰هزار تکرار، salt تصادفی، مقایسه‌ی زمان‌ثابت | ⚠️ بهتر از SHA-256 خام ZEUS |
| سشن | JWT (HS256) با `jose` — ۷ روز، کوکی HttpOnly + SameSite=Lax | BPB |
| مسیر مخفی | `secure_path` تصادفی ۱۴ حرفی — تولید خودکار در D1 | BPB |
| بروت‌فورس | جدول `login_attempts` در D1 — ۵ تلاش = قفل ۱۰ دقیقه | ZEUS (ولی ماندگار) |
| امنیت نصب | کلایم توکن (`?claim=...` یا env `CLAIM_TOKEN`) | Nova |
| CSRF | چک Origin روی POST ها + SameSite=Lax | — |

### جریان نصب و ورود
```
GET  /install                    → فرم تعیین پسورد
POST /install (با کلایم در صورت تنظیم) → ذخیره‌ی hash + ساخت securePath
GET  /{securePath}/login         → فرم ورود
POST /{securePath}/login         → بررسی قفل بروت‌فورس → JWT → کوکی
GET  /{securePath}/panel         → پنل (بدون کوکی: ریدایرکت به login)
GET  /{securePath}/panel/api/me  → اطلاعات سشن
GET  /{securePath}/logout        → پاک‌سازی کوکی
```

## 📐 تصمیم‌های پایه (ثبت‌شده)

| موضوع | تصمیم | دلیل |
|---|---|---|
| زبان | TypeScript | مثل BPB — امن‌تر و مقیاس‌پذیر |
| ذخیره‌سازی | D1 | چندکاربره + کوئری‌های پیچیده (ZEUS/Nova) |
| سشن | JWT بدون-state (قدم ۲) | مثل BPB — با `jose` |
| هش پسورد | PBKDF2 (Web Crypto) | ⚠️ نه SHA-256 خام مثل ZEUS |
| بروت‌فورس | جدول `login_attempts` در D1 | ماندگار بین ایزوله‌ها (بهتر از Map در حافظه) |
| امنیت نصب | کلایم توکن (قدم ۲) | ایده‌ی Nova — جلوگیری از تصاحب پنل |
