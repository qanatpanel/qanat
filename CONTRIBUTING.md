# 🤝 مشارکت در قنات — Contributing Guide

مرسی که می‌خوای کمک کنی! 💧

## شروع

1. **Fork** کن و یک branch بساز: `git checkout -b feat/your-idea`
2. تغییراتت را اعمال کن
3. چک کن: `npm run check` (تایپ‌چک + بیلد)
4. تست‌ها را اجرا کن: `bash scripts/test-panel.sh && bash scripts/test-parser.sh && bash scripts/test-config.sh && bash scripts/test-auth.sh && bash scripts/test-proxy.sh`
5. یک **PR** باز کن با توضیح واضح

## قوانین کد

- **TypeScript strict** — به `tsconfig.json` احترام بگذار
- همه‌ی API ها باید **JSON پارامتری‌شده** بمانند (بدون SQL رشته‌ای)
- همه‌ی خروجی‌های HTML باید escape شوند (تابع `htmlEscape` در `src/utils.ts`)
- UI را بدون وابستگی خارجی نگه دار (بدون CDN/فونت/لایبرری)
- متن‌های جدید UI: هم فارسی هم انگلیسی (کلید i18n در `script.js`)
- تست برای هر تغییر منطقی: اسکریپت‌های `scripts/test-*.sh`

## ساختار کامیت

`feat: ...` / `fix: ...` / `docs: ...` / `refactor: ...` / `test: ...` / `chore: ...`

## گزارش باگ

یک Issue با قالب آماده باز کن (قالب‌های `ISSUE_TEMPLATE`). حتماً:
- مرورگر/نسخه
- خروجی `wrangler` لاگ (بدون اطلاعات حساس!)
- مراحل بازتولید
