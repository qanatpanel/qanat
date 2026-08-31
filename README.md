<p align="center">
  <img src="assets/banner.svg" alt="قنات — Qanat" width="100%"/>
</p>

<p align="center">
  <a href="README-en.md"><img src="https://img.shields.io/badge/Language-English-blue?style=flat-square&logo=readme" alt="English"/></a>
  <img src="https://img.shields.io/badge/TypeScript-strict-3178c6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Cloudflare%20Workers-deploy--ready-f6821f?style=flat-square&logo=cloudflare&logoColor=white" alt="Cloudflare Workers"/>
  <img src="https://img.shields.io/badge/D1-SQLite%20at%20the%20Edge-22d3ee?style=flat-square" alt="D1"/>
  <img src="https://img.shields.io/badge/tests-95%20passing-14b8a6?style=flat-square" alt="tests"/>
  <img src="https://img.shields.io/badge/VLESS%20%2F%20Trojan-native-57e6ff?style=flat-square" alt="VLESS/Trojan"/>
  <img src="https://img.shields.io/badge/license-MIT-0ea5e9?style=flat-square" alt="MIT"/>
  <img src="https://img.shields.io/badge/PRs-welcome-2dd4bf?style=flat-square" alt="PRs welcome"/>
</p>

<p align="center">
  <b>قنات</b> — کانال زیرزمینی که آب را از دل کویر عبور می‌دهد؛
  <br/>
  این پنل هم داده را از دل فیلترینگ، بی‌صدا و زیر رادار عبور می‌دهد.
</p>

---

## ✨ چرا قنات؟

| | |
|---|---|
| 🚀 **هسته‌ی پروکسی واقعی** | رله‌ی WebSocket → TCP با پروتکل‌های استاندارد **VLESS** و **Trojan** — سازگار با v2rayNG، Hiddify، Streisand، sing-box، Clash و هر کلاینتی که VLESS بلد باشد |
| 🌍 **رایگان تا ابد** | روی **Cloudflare Workers** با طرح رایگان اجرا می‌شود؛ هزینه‌ی زیرساخت: **صفر** |
| 🧮 **چندکاربره با دیتابیس** | کاربران، کوتای مصرف (GB)، تاریخ انقضا و وضعیت فعال/غیرفعال — همه روی **Cloudflare D1** |
| 🔐 **امنیت درجه‌یک** | پسورد **PBKDF2** (۱۰۰هزار تکرار)، سشن **JWT** در کوکی HttpOnly، محافظ **بروت‌فورس**، کلایم توکن برای نصب امن، چک **CSRF** |
| 📱 **داشبورد فارسی** | رابط کاربری راست‌چین، تاریک و بدون هیچ وابستگی خارجی — بدون CDN، بدون کتابخانه، بدون track شدن |
| 📡 **اسکنر IP تمیز** | تست پینگ واقعی از مرورگر شما روی رنج‌های رسمی Cloudflare + سه منبع به‌روزرسانی‌شده‌ی روزانه |
| 🔗 **صفحه‌ی اشتراک اختصاصی** | برای هر کاربر یک صفحه‌ی زیبا با **QR کد**، دکمه‌ی کپی و لینک‌های عمیق (deep-link) برای نصب یک‌کلیکی در اپ‌ها |
| 🎛️ **پیکربندی هوشمند** | کانفیگ‌ها با **Fragment و SNI** مطابق تنظیمات پروکسی شما ساخته می‌شوند؛ خروجی URI، Clash، sing-box و Xray |

---

## 📸 یک نگاه

<details open>
<summary><b>🖥️ داشبورد مدیریت</b></summary>
<br/>

| | |
|---|---|
| ![نمای کلی](assets/screenshots/02-dashboard.jpg) | ![مدیریت کاربران](assets/screenshots/03-users.jpg) |
| ![اسکنر IP تمیز](assets/screenshots/04-scanner.jpg) | ![اشتراک‌ها](assets/screenshots/05-subscription-page.jpg) |

</details>

<details>
<summary><b>📱 صفحه‌ی اشتراک کاربر (دسکتاپ و موبایل)</b></summary>
<br/>

| | |
|---|---|
| ![اشتراک دسکتاپ](assets/screenshots/06-subscription-desktop.jpg) | ![اشتراک موبایل](assets/screenshots/07-subscription-mobile.jpg) |
| ![ورود](assets/screenshots/01-login.jpg) | |

</details>

---

## 🚀 شروع سریع — دیپلوی در ۳ دقیقه

**پیش‌نیاز:** یک حساب [Cloudflare](https://dash.cloudflare.com) (رایگان) و [Node.js 18+](https://nodejs.org).

```bash
# ۱. کلون و نصب
git clone https://github.com/qanatpanel/qanat.git
cd qanat && npm install

# ۲. ساخت دیتابیس D1 و دیپلوی
npx wrangler login
npx wrangler d1 create qanat-db
#    شناسه‌ی d1 تولیدشده را در wrangler.jsonc قرار بده:
#    "database_id": "شناسه‌ی-تولیدشده"

npm run deploy        # دیپلوی worker
npm run db:remote     # اعمال اسکیما روی D1 (اختیاری — خودکار هم می‌شود)
```

تمام! آدرس worker شما: `https://<نام-worker>.workers.dev` — اولین بازدید، صفحه‌ی نصب را نشان می‌دهد.

> 🔒 **نکته‌ی امنیتی:** برای جلوگیری از تصاحب پنل، می‌توانی هنگام اولین نصب یک **کلایم توکن** (Claim Token) تنظیم کنی: `?claim=توکن-شما` — بدون آن، نصب فقط از همان IP باز اول ممکن است.

### اجرای محلی

```bash
npm run dev    # بیلد + سرور محلی روی :8787
```

---

## 🧬 معماری

```
قنات (کلودفلر ورکر — تک‌فایل ۷۳۵KB)
│
├── 🛡️ لایه‌ی امنیتی
│   ├── PBKDF2 (100k)          ← هش پسورد
│   ├── JWT + HttpOnly Cookie  ← سشن
│   ├── login_attempts (D1)    ← قفل ۱۰ دقیقه بعد از ۵ تلاش ناموفق
│   └── Origin/CSRF Check      ← روی همه‌ی POST ها
│
├── 🗄️ لایه‌ی داده (Cloudflare D1)
│   ├── settings        ← تنظیمات پنل (مسیر مخفی، کلایم و…)
│   ├── users           ← کاربران + کوتا + انقضا + مصرف
│   └── login_attempts  ← محافظ بروت‌فورس
│
├── 🚀 هسته‌ی پروکسی
│   ├── VLESS parser    ← هدر استاندارد رسمی (version/uuid/port/…)
│   ├── Trojan parser   ← پسورد + هدر CRLF
│   └── WS → TCP relay  ← WebSocketPair + حلقه‌ی پس‌زمینه
│
├── 📡 ماژول‌های کاربری
│   ├── اسکنر IP تمیز (۳ منبع + پینگ مرورگر)
│   ├── صفحه‌ی اشتراک با QR (SVG سمت سرور)
│   └── تولید کانفیگ: URI / Clash / sing-box / Xray
│
└── 📁 ساختار پوشه‌ها
    ├── src/auth/        🔐 احراز هویت
    ├── src/settings/    🗄️ داده
    ├── src/proxy/       🚀 هسته‌ی پروکسی
    ├── src/handlers/    📡 مسیرها (install/login/panel/api/sub)
    ├── src/cores/       QR و تولید کانفیگ
    └── src/assets/      صفحات HTML + استایل
```

---

## 🗝️ API

### مدیریت (همه با سشن — `/{securePath}/panel/api/...`)

```
GET    /api/users              لیست کاربران
POST   /api/users              ساخت کاربر جدید
POST   /api/users/:id/toggle   فعال/غیرفعال
DELETE /api/users/:id          حذف کاربر
GET    /api/settings           تنظیمات پنل
POST   /api/settings/password  تغییر رمز (با تأیید رمز فعلی)
POST   /api/settings/secure-path   بازسازی مسیر مخفی
GET    /api/clean-ips?src=…    لیست IP تمیز از ۳ منبع (ircf/cf2dns/bestcf/mix)
```

### اشتراک کاربر

```
GET  /{securePath}/sub/{uuid}          صفحه‌ی زیبای اشتراک (QR + کپی + deep-link)
GET  /{securePath}/sub/{uuid}/txt      اشتراک متنی (سازگار با v2rayN و…)
GET  /{securePath}/sub/{uuid}?format=clash     کانفیگ Clash Meta
GET  /{securePath}/sub/{uuid}?format=singbox   کانفیگ sing-box
GET  /{securePath}/sub/{uuid}?format=xray      کانفیگ Xray
```

### اتصال کلاینت‌ها

```
ws://your-worker.workers.dev/{proxyPath}/{uuid-or-trojan-password}
```

پروتکل **کاملاً استاندارد** — بدون هدر اضافه، بدون دستکاری. `alpn=http/1.1`، `fp=chrome`، SNI و Host کامل از تنظیمات شما.

---

## 🧪 کیفیت

| اسکریپت | پوشش | نتیجه |
|---|---|---|
| `scripts/test-parser.sh` | ۱۴ تست واحد پارسر VLESS/Trojan | ✅ |
| `scripts/test-config.sh` | ۲۴ تست تولید کانفیگ (URI/Clash/sing-box/IP تمیز) | ✅ |
| `scripts/test-auth.sh` | ۱۸ سناریوی احراز هویت + بروت‌فورس | ✅ |
| `scripts/test-panel.sh` | ۲۸ سناریوی داشبورد و API کاربران | ✅ |
| `scripts/test-proxy.sh` | ۱۱ تست E2E پروکسی (VLESS/Trojan/مصرف/اشتراک) | ✅ |

**۹۵ تست خودکار — همه سبز. ✅**

تأیید شده با تست E2E روی کلودفلر واقعی: **IP تمیز → ورکر → یوتیوب → HTTP 200** (۲۸۵ms).

---

## 🗺️ نقشه‌ی راه

- [x] اسکلت TypeScript + بیلد تک‌فایل + Wrangler + D1
- [x] لایه‌ی داده: تنظیمات + کاربران + بروت‌فورس
- [x] احراز هویت: JWT + PBKDF2 + مسیر مخفی + کلایم توکن
- [x] داشبورد: نمای کلی + CRUD کاربران + تنظیمات
- [x] تنظیمات پیشرفته‌ی پروکسی (Fragment/SNI/…) + بکاپ/رستور
- [x] تولید اشتراک/کانفیگ: vless:// + Clash + sing-box + Xray
- [x] هسته‌ی پروکسی: WebSocket + VLESS/Trojan
- [x] اسکنر IP تمیز: ۳ منبع + پینگ مرورگر + کانفیگ با IP تمیز
- [ ] ربات تلگرام + آپدیت خودکار
- [ ] پشتیبانی IPv6
- [ ] محدودیت سرعت per-user

---

## 🤝 مشارکت

ایده‌ها، باگ‌ها و PR ها با آغوش باز! قبل از PR:

1. کد را با `npm run check` (تایپ‌چک) چک کن
2. تست‌ها را اجرا کن: `bash scripts/test-*.sh`
3. برای تغییرات UI، اسکرین‌شات هم اضافه کن

[راهنمای مشارکت](CONTRIBUTING.md) · [گزارش باگ امنیتی](SECURITY.md)

---

## 📜 لایسنس

[MIT](LICENSE) © 2026 [qanatpanel](https://github.com/qanatpanel)

<p align="center">
  <sub>ساخته‌شده با 💧 برای عبور از هر کویری</sub>
</p>
