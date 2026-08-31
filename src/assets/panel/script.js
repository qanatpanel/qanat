(function () {
  'use strict';

  /* ═══════════ ذخیره‌سازی امن (در iframe های sandbox شده localStorage کار نمی‌کند) ═══════════ */
  var store = (function () {
    try {
      localStorage.setItem('__t', '1');
      localStorage.removeItem('__t');
      return localStorage;
    } catch (e) {
      var mem = {};
      return {
        getItem: function (k) { return k in mem ? mem[k] : null; },
        setItem: function (k, v) { mem[k] = String(v); },
        removeItem: function (k) { delete mem[k]; },
      };
    }
  })();

  /* ═══════════ ترجمه‌ها ═══════════ */
  var I18N = {
    fa: {
      panelTitle: 'قنات', logout: 'خروج',
      tabOverview: 'داشبورد', tabUsers: 'کاربران', tabSubs: 'اشتراک‌ها', tabSettings: 'تنظیمات', tabScanner: 'اسکنر IP',
      dashTitle: 'داشبورد', usersTitle: 'کاربران', subsTitle: 'اشتراک کاربران', scanTitle: '📡 اسکنر IP تمیز کلودفلر',
      setSub: 'امنیت، پروکسی و رمز عبور',
      loading: 'در حال بارگذاری…', refresh: 'تازه‌سازی', addUser: '+ کاربر جدید',
      stActive: 'فعال', stDisabled: 'غیرفعال', stExpired: 'منقضی', stFull: 'پر',
      unlimited: 'نامحدود', never: 'بدون انقضا', days: 'روز',
      infoTitle: 'اطلاعات پنل',
      statUsers: 'کل کاربران', statActive: 'کاربران فعال', statToday: 'مصرف امروز', statTotal: 'مصرف کل',
      tbYesterday: 'دیروز', tbQuota: 'کوتای کل', tbExpired: 'منقضی', tbDisabled: 'غیرفعال',
      chartTitle: 'مصرف ۷ روز اخیر', chartLegend: 'ترافیک', noData: 'هنوز داده‌ای ثبت نشده — بعد از اولین اتصال نمودار پر می‌شود.',
      topUsersTitle: 'پر مصرف‌ترین کاربران', recentTitle: 'آخرین کاربران', seeAll: 'مشاهده همه',
      searchPh: 'جستجوی نام، UUID یا یادداشت…',
      fAll: 'همه', fActive: 'فعال', fExpired: 'منقضی', fDisabled: 'غیرفعال', fFull: 'پر',
      noUsersTitle: 'هنوز کاربری ساخته نشده', noUsers: 'با دکمه‌ی «کاربر جدید» شروع کنید — هر کاربر کانفیگ اختصاصی VLESS و Trojan می‌گیرد.',
      noMatch: 'کاربری با این جستجو پیدا نشد.',
      usedShort: 'مصرف', quotaShort: 'کوتا', expiryShort: 'انقضا',
      copyUuid: 'کپی UUID', showQr: 'کانفیگ و QR', delete: 'حذف',
      addUserTitle: 'کاربر جدید', uUsername: 'نام کاربری', uUsernameHint: '۳ تا ۳۲ حرف — حروف، اعداد، _ و -',
      uQuota: 'کوتای حجم (GB) — ۰ = نامحدود', uExpiry: 'انقضا (روز) — ۰ = بدون انقضا',
      uNote: 'یادداشت (اختیاری)', cancel: 'انصراف', save: 'ذخیره',
      saved: 'ذخیره شد ✓', deleted: 'حذف شد', sureDelete: 'مطمئنی؟', copied: 'کپی شد ✓',
      passChanged: 'رمز عبور تغییر کرد ✓', wrongCurrent: 'رمز فعلی اشتباه است',
      weakPass: 'رمز جدید حداقل ۸ کاراکتر باشد', passMismatch: 'رمزهای جدید یکسان نیستند',
      pathRegenerated: 'مسیر مخفی بازسازی شد — لینک جدید را ذخیره کنید',
      errNetwork: 'خطا در ارتباط با سرور', errUnauthorized: 'نشست منقضی شده — دوباره وارد شوید',
      invalidUsername: 'نام کاربری نامعتبر است', taken: 'این نام کاربری قبلاً استفاده شده',
      confirmDel: 'این کاربر حذف شود؟',
      delUserTitle: 'حذف کاربر', delUserText: 'کاربر «{name}» برای همیشه حذف می‌شود؟ این عمل قابل بازگشت نیست.',
      confirmYes: 'بله، حذف کن', confirmNo: 'انصراف',
      subsTitle2: 'اشتراک کاربران', subsHint: 'هر کاربر لینک اختصاصی خودش را دارد — با دانستن UUID قابل دسترسی است.',
      noSubs: 'کاربری وجود ندارد — اول کاربر بسازید.',
      copyUri: 'کپی', openSubPage: 'صفحه‌ی اشتراک', txtSub: 'اشتراک متنی', clashSub: 'Clash', singboxSub: 'sing-box',
      copyVless: 'کپی VLESS', copyTrojan: 'کپی Trojan', copySubLink: 'کپی لینک اشتراک', copySubTxt: 'کپی اشتراک متنی',
      qrAppsTitle: 'نصب سریع — اشتراک مستقیم در اپ (همین دستگاه)', appHiddify: 'Hiddify', appV2rayng: 'v2rayNG', appV2box: 'V2Box', appHapp: 'Happ',
      qrLoading: 'در حال آماده‌سازی…',
      secTitle: 'امنیت', securePathLabel: 'مسیر مخفی پنل', regenerate: 'بازسازی',
      securePathHint: 'بعد از بازسازی، آدرس پنل عوض می‌شود. لینک جدید را ذخیره کنید.',
      claimLabel: 'توکن ادعای نصب (Claim Token)', claimOn: 'تنظیم شده ✓', claimOff: 'تنظیم نشده',
      claimHint: 'اگر تنظیم شده باشد، اولین نصب فقط با این توکن امکان‌پذیر است.',
      verLabel: 'نسخه', hostLabel: 'دامنه',
      passTitle: 'تغییر رمز عبور', curPass: 'رمز فعلی', newPass: 'رمز جدید (حداقل ۸ کاراکتر)',
      confPass: 'تکرار رمز جدید', changePass: 'تغییر رمز عبور',
      proxyTitle: 'تنظیمات پروکسی', pHost: 'هاست (خالی = خودکار)', pPort: 'پورت',
      pProtocols: 'پروتکل‌ها', pBoth: 'هر دو (VLESS + Trojan)', pVless: 'فقط VLESS', pTrojan: 'فقط Trojan',
      pTls: 'TLS', pTlsHint: 'اگر پشت دامنه‌ی خودتان است روشن باشد', pSni: 'SNI (خالی = هاست)',
      pPathLabel: 'مسیر مخفی پروکسی', pPathHint: 'کلاینت‌ها با این مسیر وصل می‌شوند — بعد از تغییر، کانفیگ‌ها را به‌روز کنید.', pUpstreams: 'بالادست‌ها (هاپ) — اختیاری', pUpstreamsHint: 'وقتی سایت‌ها اتصال مستقیم کلودفلر را می‌بندند (ERR_CONNECTION_CLOSED)، ترافیک از این‌ها رد می‌شود — مثل کانفیگ edgetunnel خودتان. هر خط یک کانفیگ؛ به ترتیب امتحان می‌شوند.', pFailover: 'مهلت fallback (میلی‌ثانیه)', pFailoverHint: 'اگر اتصال مستقیم تا این مدت پاسخ نداد، سراغ بالادست‌ها می‌رود.',
      saveProxy: 'ذخیره تنظیمات پروکسی', proxySaved: 'تنظیمات پروکسی ذخیره شد ✓', proxyPathRegen: 'مسیر پروکسی بازسازی شد ✓',
      errProxy: 'خطا در ذخیره تنظیمات پروکسی',
      usageOf: 'مصرف:', noLimit: 'نامحدود',
      scanHint: 'IP های تصادفی کلودفلر از مرورگر شما تست می‌شوند — پینگ واقعی RTT از دستگاه شما. IP های «زنده» معمولاً تمیز و قابل استفاده‌اند.',
      scanStart: 'شروع اسکن', scanStop: 'توقف', scanCount: 'تعداد IP', scanTimeout: 'مهلت اتصال', scanConc: 'همزمانی', scanPort: 'پورت', scanPortHint: 'اگر ۴۴۳ وصل نشد، پورت‌های جایگزین را امتحان کنید',
      scanResults: 'نتایج', scanIdle: 'اسکن را شروع کنید — نتایج اینجا نمایش داده می‌شود.', scanCopyBest: 'کپی کانفیگ ۵ IP برتر',
      scanProgress: 'در حال اسکن…', scanFound: 'زنده', scanAlive: 'زنده', scanBest: 'بهترین',
      scanNoResult: 'IP زنده‌ای پیدا نشد — تعداد یا مهلت را بیشتر کنید.', scanCopied: 'کانفیگ کپی شد ✓', scanErr: 'برای کپی کانفیگ باید اول اسکن کنید.', scanCalibFail: 'تشخیص خودکار شبکه ممکن نشد — از آستانه‌ی پیش‌فرض استفاده شد.',
      scanCopy: 'کپی',
      scanSetIp: '🎯 ست کردن IP روی کانفیگ‌ها',
      scanSetIpBtn: 'ست کردن IP روی کانفیگ‌ها',
      relaySetBest: 'ست کردن IP برتر روی کانفیگ‌ها',
      scanSetDone: 'IP روی کانفیگ‌ها ست شد — کانفیگ‌ها و لینک اشتراک از این به بعد به این IP وصل می‌شوند',
      scanSetCleared: 'IP ست‌شده پاک شد — کانفیگ‌ها دوباره به دامنه وصل می‌شوند',
      scanSetEmpty: 'اول اسکن کنید یا از نتایج رله استفاده کنید',
      scanSetBadge: 'ست‌شده روی کانفیگ‌ها',

      srcMix: '⚡ همه منابع زنده (پیشنهادی)', srcIrcf: '🌐 IRCF.space — هر اپراتور', srcCf2dns: '📡 cf2dns — روزانه + امتیاز', srcBestcf: '🌏 best-cf-ips — هر ۳ ساعت',
      liveLoading: 'دریافت لیست زنده…', liveFallback: 'منبع زنده در دسترس نبود — از لیست داخلی استفاده شد',
      liveChip: (e, n, time) => e + ' × ' + n + ' · ' + time,


      dashGreetM: '🌅 صبح بخیر، کاپیتان!', dashGreetA: '☀️ ظهر بخیر!', dashGreetE: '🌆 عصر بخیر!', dashGreetN: '🌙 شب بخیر!',
      scanSource: 'منبع IP', scanSourceHint: 'لیست تمیز شامل IP های شناخته‌شده‌ی هرکست کلودفلر با شانس بالای عبور است',
      srcClean: '🔥 IP تمیز کلودفلر', srcRandom: '🎲 تصادفی از رنج‌ها', srcSaved: '⭐ لیست ذخیره‌شده',
      scanSaved: 'نتایج در لیست تمیز ذخیره شد', scanEtc: 'مانده', scanRange: 'رنج فعال', scanSavedEmpty: 'لیست ذخیره‌شده خالی است — اول اسکن کنید و «⭐ ذخیره نتایج» را بزنید',


      stabQuick: 'اسکن سریع', stabRelay: 'تست رله‌ها',
      scanSendRelay: 'تست رله روی نتایج',
      relayTitle: 'تست رله‌ها', relaySub: 'تأیید چندمرحله‌ای + آمار دقیق',
      relayIpsLabel: 'آدرس IP ها (هر خط یک IP — یا ip:port)',
      relayAdd: 'افزودن', relayImport: 'از نتایج اسکن', relayFavs: 'علاقه‌مندی‌ها',
      relayProbes: 'پینگ به ازای هر IP', relayConc: 'همزمانی', relayTimeout: 'مهلت هر پینگ',
      relayStart: 'شروع تست رله', relayExport: 'خروجی متن',
      relayConsole: 'کنترل ترمینال', relayConsoleIdle: '— کنسول آماده است —',
      relayResults: 'نتایج تست رله', relayEmpty: 'هنوز تستی اجرا نشده — IP اضافه کنید و شروع کنید.',
      relayFavTitle: 'IP های ذخیره‌شده', relayClearFavs: 'پاک‌سازی', relayNoFavs: 'هنوز چیزی ذخیره نکرده‌اید — روی ⭐ در نتایج بزنید.',
      relayThIp: 'IP', relayThPort: 'پورت', relayThMin: 'min', relayThAvg: 'avg', relayThMax: 'max',
      relayThJitter: 'jitter', relayThLoss: 'loss', relayThScore: 'امتیاز', relayThTrend: 'روند', relayThAct: 'عملیات',
      relayScoreHint: 'A+ تا F بر اساس میانگین پینگ، جیتر و افت بسته',
      relayLogStart: '⚙️ شروع تست رله — {n} IP × {p} پینگ — پورت {port} (همزمانی {c})',
      relayLogFinish: '🏁 پایان — {alive} از {total} IP سالم',
      relayLogStop: '⏹ متوقف شد توسط کاربر',
      relaySummary: '🏁 تست کامل شد: {alive} از {total} IP سالم ({pct}٪). میانگین پینگ: {avg}. بهترین: {best} با {bestms}. از ۳ IP برتر کانفیگ بسازید — دکمه 📋 در جدول.',
      relayNoIps: 'اول IP اضافه کنید', relayImported: 'وارد شد', relayFavSaved: 'ذخیره شد — در علاقه‌مندی‌ها', relayFavExists: 'قبلاً ذخیره شده',

    },
    en: {
      panelTitle: 'Qanat', logout: 'Logout',
      tabOverview: 'Dashboard', tabUsers: 'Users', tabSubs: 'Subscriptions', tabSettings: 'Settings', tabScanner: 'IP Scanner',
      dashTitle: 'Dashboard', usersTitle: 'Users', subsTitle: 'User subscriptions', scanTitle: '📡 Cloudflare Clean IP Scanner',
      setSub: 'Security, proxy & password',
      loading: 'Loading…', refresh: 'Refresh', addUser: '+ New user',
      stActive: 'Active', stDisabled: 'Disabled', stExpired: 'Expired', stFull: 'Full',
      unlimited: 'Unlimited', never: 'No expiry', days: 'days',
      infoTitle: 'Panel info',
      statUsers: 'Total users', statActive: 'Active users', statToday: "Today's usage", statTotal: 'Total usage',
      tbYesterday: 'Yesterday', tbQuota: 'Total quota', tbExpired: 'Expired', tbDisabled: 'Disabled',
      chartTitle: 'Traffic — last 7 days', chartLegend: 'Traffic', noData: 'No data yet — the chart fills after the first connection.',
      topUsersTitle: 'Top users', recentTitle: 'Recent users', seeAll: 'See all',
      searchPh: 'Search name, UUID or note…',
      fAll: 'All', fActive: 'Active', fExpired: 'Expired', fDisabled: 'Disabled', fFull: 'Full',
      noUsersTitle: 'No users yet', noUsers: 'Start with "New user" — each user gets a private VLESS & Trojan config.',
      noMatch: 'No user matches this search.',
      usedShort: 'Used', quotaShort: 'Quota', expiryShort: 'Expiry',
      copyUuid: 'Copy UUID', showQr: 'Config & QR', delete: 'Delete',
      addUserTitle: 'New user', uUsername: 'Username', uUsernameHint: '3-32 chars: letters, digits, _ , -',
      uQuota: 'Quota (GB) — 0 = unlimited', uExpiry: 'Expiry (days) — 0 = none',
      uNote: 'Note (optional)', cancel: 'Cancel', save: 'Save',
      saved: 'Saved ✓', deleted: 'Deleted', sureDelete: 'Sure?', copied: 'Copied ✓',
      passChanged: 'Password changed ✓', wrongCurrent: 'Current password is wrong',
      weakPass: 'New password must be at least 8 chars', passMismatch: 'New passwords do not match',
      pathRegenerated: 'Secret path regenerated — save the new link',
      errNetwork: 'Server connection error', errUnauthorized: 'Session expired — sign in again',
      invalidUsername: 'Invalid username', taken: 'This username is already taken',
      confirmDel: 'Delete this user?',
      delUserTitle: 'Delete user', delUserText: 'User "{name}" will be permanently deleted. This cannot be undone.',
      confirmYes: 'Yes, delete', confirmNo: 'Cancel',
      subsTitle2: 'User subscriptions', subsHint: 'Each user has their own private link — accessible by UUID.',
      noSubs: 'No users yet — create one first.',
      copyUri: 'Copy', openSubPage: 'Subscription page', txtSub: 'Text sub', clashSub: 'Clash', singboxSub: 'sing-box',
      copyVless: 'Copy VLESS', copyTrojan: 'Copy Trojan', copySubLink: 'Copy subscription link', copySubTxt: 'Copy text subscription',
      qrAppsTitle: 'Quick install — opens the sub directly in the app (this device)', appHiddify: 'Hiddify', appV2rayng: 'v2rayNG', appV2box: 'V2Box', appHapp: 'Happ',
      qrLoading: 'Preparing…',
      secTitle: 'Security', securePathLabel: 'Panel secret path', regenerate: 'Regenerate',
      securePathHint: 'After regeneration the panel URL changes. Save the new link.',
      claimLabel: 'Install claim token', claimOn: 'Set ✓', claimOff: 'Not set',
      claimHint: 'When set, first-time setup is only possible with this token.',
      verLabel: 'Version', hostLabel: 'Host',
      passTitle: 'Change password', curPass: 'Current password', newPass: 'New password (min 8 chars)',
      confPass: 'Confirm new password', changePass: 'Change password',
      proxyTitle: 'Proxy settings', pHost: 'Host (empty = auto)', pPort: 'Port',
      pProtocols: 'Protocols', pBoth: 'Both (VLESS + Trojan)', pVless: 'VLESS only', pTrojan: 'Trojan only',
      pTls: 'TLS', pTlsHint: 'Enable if behind your own domain', pSni: 'SNI (empty = host)',
      pPathLabel: 'Secret proxy path', pPathHint: 'Clients connect through this path — regenerate configs after changing.', pUpstreams: 'Upstreams (hops) — optional', pUpstreamsHint: 'When sites close the direct Cloudflare connection (ERR_CONNECTION_CLOSED), traffic is routed through these — like your own edgetunnel config. One config per line, tried in order.', pFailover: 'Fallback timeout (ms)', pFailoverHint: 'If the direct connection sends nothing within this time, upstreams are tried.',
      saveProxy: 'Save proxy settings', proxySaved: 'Proxy settings saved ✓', proxyPathRegen: 'Proxy path regenerated ✓',
      errProxy: 'Error saving proxy settings',
      usageOf: 'Usage:', noLimit: 'Unlimited',
      scanHint: 'Random Cloudflare IPs are tested from your browser — real RTT ping from your device. Alive IPs are usually clean and usable.',
      scanStart: 'Start scan', scanStop: 'Stop', scanCount: 'IP count', scanTimeout: 'Timeout', scanConc: 'Concurrency', scanPort: 'Port', scanPortHint: 'If 443 fails, try alternative ports',
      scanResults: 'Results', scanIdle: 'Start a scan — results appear here.', scanCopyBest: 'Copy top 5 configs',
      scanProgress: 'Scanning…', scanFound: 'alive', scanAlive: 'Alive', scanBest: 'Best',
      scanNoResult: 'No alive IP found — increase count or timeout.', scanCopied: 'Config copied ✓', scanErr: 'Run a scan first.', scanCalibFail: 'Network auto-calibration failed — using default threshold.',
      scanCopy: 'Copy',
      scanSetIp: '🎯 Set IP on configs',
      scanSetIpBtn: 'Set IP on configs',
      relaySetBest: 'Set best IP on configs',
      scanSetDone: 'IP applied to configs — configs & subscription links now connect to this IP',
      scanSetCleared: 'Set IP cleared — configs use the domain again',
      scanSetEmpty: 'Run a scan or use relay results first',
      scanSetBadge: 'applied to configs',

      srcMix: '⚡ All live sources (recommended)', srcIrcf: '🌐 IRCF.space — per ISP', srcCf2dns: '📡 cf2dns — daily + score', srcBestcf: '🌏 best-cf-ips — every 3h',
      liveLoading: 'Fetching live list…', liveFallback: 'Live source unavailable — using built-in list',
      liveChip: (e, n, time) => e + ' × ' + n + ' · ' + time,


      dashGreetM: '🌅 Good morning, captain!', dashGreetA: '☀️ Good afternoon!', dashGreetE: '🌆 Good evening!', dashGreetN: '🌙 Good night!',
      scanSource: 'IP source', scanSourceHint: 'Clean list = well-known Cloudflare anycast IPs with high pass odds',
      srcClean: '🔥 Cloudflare clean IPs', srcRandom: '🎲 Random from ranges', srcSaved: '⭐ Saved list',
      scanSaved: 'Results saved to clean list', scanNoResult: 'No alive IP found — increase count or timeout.', scanEtc: 'left', scanRange: 'Active range', scanSavedEmpty: 'Saved list is empty — scan first and hit ⭐',


      stabQuick: 'Quick scan', stabRelay: 'Relay test',
      scanSendRelay: 'Relay-test results',
      relayTitle: 'Relay Test', relaySub: 'Multi-phase verification + precise stats',
      relayIpsLabel: 'IP addresses (one per line — or ip:port)',
      relayAdd: 'Add', relayImport: 'From scan results', relayFavs: 'Favorites',
      relayProbes: 'Pings per IP', relayConc: 'Concurrency', relayTimeout: 'Per-ping timeout',
      relayStart: 'Start relay test', relayExport: 'Export text',
      relayConsole: 'Terminal', relayConsoleIdle: '— console ready —',
      relayResults: 'Relay test results', relayEmpty: 'No test yet — add IPs and start.',
      relayFavTitle: 'Saved IPs', relayClearFavs: 'Clear', relayNoFavs: 'Nothing saved yet — press ⭐ in results.',
      relayThIp: 'IP', relayThPort: 'Port', relayThMin: 'min', relayThAvg: 'avg', relayThMax: 'max',
      relayThJitter: 'jitter', relayThLoss: 'loss', relayThScore: 'Score', relayThTrend: 'Trend', relayThAct: 'Actions',
      relayScoreHint: 'A+ to F based on avg ping, jitter and packet loss',
      relayLogStart: '⚙️ Relay test started — {n} IPs × {p} pings — port {port} (concurrency {c})',
      relayLogFinish: '🏁 Done — {alive} of {total} IPs alive',
      relayLogStop: '⏹ Stopped by user',
      relaySummary: '🏁 Test finished: {alive} of {total} IPs alive ({pct}%). Avg ping: {avg}. Best: {best} at {bestms}. Build configs from the top 3 — use 📋 in the table.',
      relayNoIps: 'Add IPs first', relayImported: 'Imported', relayFavSaved: 'Saved — see Favorites', relayFavExists: 'Already saved',

    },
  };

  var lang = store.getItem('panel_lang') || 'fa';
  var theme = store.getItem('panel_theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  var t = I18N[lang] || I18N.fa;
  var users = [];
  var info = null;
  var stats = null;
  var subsData = null;
  var userFilter = 'all';
  var qrItem = null;

  /* ═══════════ ابزارها ═══════════ */
  function $(id) { return document.getElementById(id); }
  function fmtNum(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '٬').replace(/[0-9]/g, function (d) { return lang === 'fa' ? '۰۱۲۳۴۵۶۷۸۹'[d] : d; }); }
  function fmtBytes(b) {
    if (!b || b <= 0) return '0 B';
    var u = ['B', 'KB', 'MB', 'GB', 'TB'];
    var i = Math.min(u.length - 1, Math.floor(Math.log(b) / Math.log(1024)));
    var v = b / Math.pow(1024, i);
    return (v >= 100 ? v.toFixed(0) : v.toFixed(1)) + ' ' + u[i];
  }
  function fmtGb(gb) {
    if (gb >= 1000) return (gb / 1024).toFixed(2) + ' TB';
    if (gb >= 100) return Math.round(gb) + ' GB';
    return gb.toFixed(2) + ' GB';
  }
  function fmtDate(ms) {
    if (!ms) return '—';
    return new Date(ms).toLocaleDateString(lang === 'fa' ? 'fa-IR' : 'en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function toast(msg) {
    var el = $('toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(el._tm);
    el._tm = setTimeout(function () { el.hidden = true; }, 2600);
  }
  function copyText(text) {
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast(t.copied); }).catch(fallback);
    } else fallback();
    if (!navigator.clipboard || !navigator.clipboard.writeText) toast(t.copied);
  }

  /* ═══════════ API ═══════════ */
  function api(path, opts) {
    opts = opts || {};
    return fetch('panel/api/' + path, {
      method: opts.method || 'GET',
      headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    }).then(function (res) {
      return res.json().catch(function () { return { ok: false, error: 'bad_response' }; }).then(function (data) {
        return { status: res.status, data: data };
      });
    });
  }
  function errMsg(r) {
    if (r.data.error === 'unauthorized') return t.errUnauthorized;
    return t.errNetwork + ' (' + r.data.error + ')';
  }

  /* ═══════════ ترجمه و تم ═══════════ */
  function applyLang() {
    t = I18N[lang] || I18N.fa;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var k = el.getAttribute('data-i18n');
      if (t[k] != null) el.textContent = t[k];
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(function (el) {
      var k = el.getAttribute('data-i18n-ph');
      if (t[k] != null) el.placeholder = t[k];
    });
    $('lang-btn').textContent = lang === 'fa' ? 'EN' : 'فا';
    updateMobileTitle();
  }
  function applyTheme() {
    document.documentElement.setAttribute('data-theme', theme);
    $('theme-btn').textContent = theme === 'dark' ? '🌙' : '☀️';
  }
  $('lang-btn').addEventListener('click', function () {
    lang = lang === 'fa' ? 'en' : 'fa';
    store.setItem('panel_lang', lang);
    applyLang();
    renderAll();
  });
  $('theme-btn').addEventListener('click', function () {
    theme = theme === 'dark' ? 'light' : 'dark';
    store.setItem('panel_theme', theme);
    applyTheme();
  });

  /* ═══════════ ناوبری ═══════════ */
  var VIEW_KEYS = { overview: 'tabOverview', users: 'tabUsers', subs: 'tabSubs', scanner: 'tabScanner', settings: 'tabSettings' };
  function updateMobileTitle() {
    var v = currentView;
    $('mobile-page').textContent = t[VIEW_KEYS[v]] || '';
  }
  var currentView = 'overview';
  function switchView(name) {
    currentView = name;
    ['overview', 'users', 'subs', 'scanner', 'settings'].forEach(function (v) {
      var el = $('view-' + v);
      if (el) el.classList.toggle('active', v === name);
    });
    document.querySelectorAll('.nav-item, .bn-item').forEach(function (el) {
      el.classList.toggle('active', el.getAttribute('data-view') === name);
    });
    updateMobileTitle();
    if (name === 'users') loadUsers();
    if (name === 'subs') loadSubs();
    if (name === 'settings') { loadSettings(); loadProxySettings(); }
  }
  document.querySelectorAll('.nav-item, .bn-item').forEach(function (el) {
    el.addEventListener('click', function () { switchView(el.getAttribute('data-view')); });
  });
  document.querySelectorAll('[data-goto]').forEach(function (el) {
    el.addEventListener('click', function () { switchView(el.getAttribute('data-goto')); });
  });
  document.querySelectorAll('.view').forEach(function (el) {
    el.classList.remove('active');
  });
  $('view-overview').classList.add('active');

  /* ═══════════ مودال تأیید ═══════════ */
  var confirmCb = null;
  function openConfirm(title, text, okLabel, cb) {
    $('confirm-title').textContent = title;
    $('confirm-text').textContent = text;
    $('confirm-ok').textContent = okLabel || t.confirmYes;
    confirmCb = cb;
    $('confirm-modal').hidden = false;
  }
  function closeConfirm() { $('confirm-modal').hidden = true; confirmCb = null; }
  $('confirm-cancel').addEventListener('click', closeConfirm);
  $('confirm-modal').addEventListener('click', function (e) { if (e.target === $('confirm-modal')) closeConfirm(); });
  $('confirm-ok').addEventListener('click', function () {
    var cb = confirmCb;
    closeConfirm();
    if (cb) cb();
  });

  /* ═══════════ داشبورد ═══════════ */
  var AV_COLORS = ['av-cyan', 'av-violet', 'av-amber', 'av-emerald', 'av-rose', 'av-indigo'];
  function avatarCls(id) { return AV_COLORS[Math.abs(Number(id) || 0) % AV_COLORS.length]; }
  function statusPill(u) {
    var full = u.quotaGb > 0 && u.usedGb >= u.quotaGb;
    var cls = full ? 'st-full' : u.status === 'active' ? 'st-active' : u.status === 'expired' ? 'st-expired' : 'st-disabled';
    var lbl = full ? t.stFull : u.status === 'active' ? t.stActive : u.status === 'expired' ? t.stExpired : t.stDisabled;
    return '<span class="status-pill ' + cls + '">' + lbl + '</span>';
  }
  function progressHtml(pct, extraCls) {
    var c = pct >= 100 ? ' full' : pct >= 85 ? ' warn' : '';
    if (extraCls) c += ' ' + extraCls;
    return '<div class="progress' + c + '"><i style="width:' + Math.min(100, pct).toFixed(1) + '%"></i></div>';
  }

  function loadStats() {
    api('stats').then(function (r) {
      if (!r.data.ok) { toast(errMsg(r)); return; }
      stats = r.data;
      renderStats();
    }).catch(function () { toast(t.errNetwork); });
  }

  function renderStats() {
    if (!stats) return;
    var c = stats.counts || {};
    var u = stats.usage || {};

    // اسپارکلاین ۱۴ روزه برای کارت مصرف امروز
    var spark = '';
    var dl = (u.daily || []).slice(-14);
    if (dl.length >= 2) {
      var smax = Math.max.apply(null, dl.map(function (d) { return d.bytes; })) || 1;
      var sp = dl.map(function (d, i) {
        var x = (i / (dl.length - 1)) * 96 + 2;
        var y = 26 - ((d.bytes / smax) * 22) - 1;
        return x.toFixed(1) + ',' + y.toFixed(1);
      }).join(' ');
      spark = '<svg class="stat-spark" viewBox="0 0 100 28" preserveAspectRatio="none"><polyline points="' + sp + '"/></svg>';
    }

    var cards = [
      { ic: 'ic-cyan', emoji: '👥', label: t.statUsers, value: fmtNum(c.total), sub: '', glow: 'rgba(34,211,238,0.16)' },
      { ic: 'ic-emerald', emoji: '✅', label: t.statActive, value: fmtNum(c.active),
        sub: '<span class="down">' + fmtNum(c.expired) + ' ' + t.tbExpired + '</span> · <span class="up">' + fmtNum(c.disabled) + ' ' + t.tbDisabled + '</span>', glow: 'rgba(52,211,153,0.15)' },
      { ic: 'ic-violet', emoji: '⚡', label: t.statToday, value: fmtBytes(u.todayBytes), sub: t.tbYesterday + ': ' + fmtBytes(u.yesterdayBytes), glow: 'rgba(139,92,246,0.15)', sparkline: spark },
      { ic: 'ic-amber', emoji: '🌊', label: t.statTotal, value: fmtBytes(u.totalBytes),
        sub: u.totalQuotaBytes ? t.tbQuota + ': ' + fmtBytes(u.totalQuotaBytes) : '', glow: 'rgba(251,191,36,0.14)' },
    ];
    $('stat-cards').innerHTML = cards.map(function (card) {
      return '<div class="stat-card" style="--glow-c:' + card.glow + '">' +
        '<div class="stat-top"><span class="stat-ico ' + card.ic + '">' + card.emoji + '</span>' +
        '<span class="stat-label">' + esc(card.label) + '</span></div>' +
        '<div class="stat-value">' + card.value + '</div>' +
        (card.sub ? '<div class="stat-sub">' + card.sub + '</div>' : '') +
        (card.sparkline ? card.sparkline : '') +
        '</div>';
    }).join('');

    // شمارش انیمیشنی اعداد کارت‌های آمار (count-up)
    document.querySelectorAll('#stat-cards .stat-value').forEach(function (el) {
      var faMap = { '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9' };
      function enDigits(s) { return s.replace(/[۰-۹]/g, function (d) { return faMap[d]; }); }
      function faDigits(s) { return s.replace(/\d/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'[d]; }); }
      var raw = enDigits(el.textContent.trim());
      var m = raw.match(/^([\d]+(?:[.,]\d+)?)\s*(.*)$/);
      if (!m) return;
      var target = parseFloat(m[1].replace(/,/g, ''));
      if (isNaN(target)) return;
      var unit = m[2];
      var intOnly = m[1].indexOf('.') === -1 && m[1].indexOf(',') === -1;
      var dur = 950, t0 = null;
      function fmt(v) {
        var s = intOnly ? String(Math.round(v)) : v.toFixed(1);
        if (lang === 'fa') s = faDigits(s);
        return s + (unit ? ' ' + unit : '');
      }
      function step(ts) {
        if (!t0) t0 = ts;
        var p = Math.min(1, (ts - t0) / dur);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt(target * eased);
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });

    renderChart(u.daily || []);
    renderTopUsers(stats.topUsers || []);
    renderInfoList(stats.panel);
    renderRecent(stats.recent || []);
  }

  function renderChart(daily) {
    var box = $('chart-box');
    if (!daily || !daily.length || daily.every(function (d) { return d.bytes <= 0; })) {
      box.innerHTML = '<div class="empty-hint">' + t.noData + '</div>';
      return;
    }
    var W = 640, H = 240, padB = 34, padT = 18;
    var vals = daily.map(function (d) { return d.bytes; });
    var max = Math.max.apply(null, vals) * 1.18;
    var n = daily.length;
    var slot = W / n;
    // نقاط خط روند
    var pts = vals.map(function (v, i) {
      var x = i * slot + slot / 2;
      var y = H - padB - Math.max(3, (v / max) * (H - padB - padT));
      return [x.toFixed(1), y.toFixed(1)];
    });
    var line = pts.map(function (p) { return p.join(','); }).join(' ');
    var area = '0,' + (H - padB) + ' ' + line + ' ' + (W) + ',' + (H - padB);
    var bars = daily.map(function (d, i) {
      var h = Math.max(2, (d.bytes / max) * (H - padB - padT));
      var x = i * slot + slot * 0.22;
      var w = slot * 0.56;
      var y = H - padB - h;
      var label = new Date(d.day + 'T00:00:00').toLocaleDateString(lang === 'fa' ? 'fa-IR' : 'en-GB', { weekday: 'short' });
      var isMax = d.bytes === max;
      return '<g class="bar-g">' +
        '<rect class="bar" x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="6">' +
        '<title>' + d.day + ' — ' + fmtBytes(d.bytes) + '</title></rect>' +
        '<text x="' + (x + w / 2).toFixed(1) + '" y="' + (H - 10).toFixed(1) + '" class="bar-lbl" text-anchor="middle">' + esc(label) + '</text>' +
        '<circle class="bar-dot' + (isMax ? ' hot' : '') + '" cx="' + pts[i][0] + '" cy="' + pts[i][1] + '" r="3">' +
        '<title>' + d.day + ' — ' + fmtBytes(d.bytes) + '</title></circle></g>';
    }).join('');
    box.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="chart-svg" preserveAspectRatio="xMidYMid meet">' +
      '<defs>' +
      '<linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#22d3ee"/><stop offset="1" stop-color="#14b8a6"/></linearGradient>' +
      '<linearGradient id="cga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#22d3ee" stop-opacity="0.35"/><stop offset="1" stop-color="#22d3ee" stop-opacity="0.02"/></linearGradient>' +
      '</defs>' +
      '<line x1="0" y1="' + (H - padB) + '" x2="' + W + '" y2="' + (H - padB) + '" class="grid-line"/>' +
      '<polygon points="' + area + '" class="chart-area"/>' +
      '<polyline points="' + line + '" class="chart-line"/>' +
      bars + '</svg>';
  }

  function renderTopUsers(list) {
    var box = $('top-users');
    if (!list.length) { box.innerHTML = '<div class="empty-hint">' + t.noUsersTitle + '</div>'; return; }
    box.innerHTML = list.map(function (u, i) {
      var pct = u.quotaGb > 0 ? Math.min(100, (u.usedGb / u.quotaGb) * 100) : 0;
      var full = u.quotaGb > 0 && u.usedGb >= u.quotaGb;
      var cls = full ? 'st-full' : u.status === 'active' ? 'st-active' : u.status === 'expired' ? 'st-expired' : 'st-disabled';
      var lbl = full ? t.stFull : u.status === 'active' ? t.stActive : u.status === 'expired' ? t.stExpired : t.stDisabled;
      return '<div class="mini-row">' +
        '<div class="mini-avatar ' + avatarCls(u.id) + '">' + esc((u.username[0] || '?').toUpperCase()) + '</div>' +
        '<div class="mini-meta">' +
        '<div class="mini-name">' + esc(u.username) + '</div>' +
        '<div class="mini-sub">' + fmtGb(u.usedGb) + ' / ' + (u.quotaGb > 0 ? fmtGb(u.quotaGb) : '∞') + '</div>' +
        (u.quotaGb > 0 ? progressHtml(pct) : '') +
        '</div>' +
        '<span class="status-pill ' + cls + '">' + lbl + '</span>' +
        '</div>';
    }).join('');
  }

  function renderInfoList(panel) {
    if (!panel) return;
    var rows = [
      ['🏷️ ' + t.securePathLabel, '/' + panel.securePath + '/panel'],
      ['🌐 ' + t.hostLabel, location.host],
      ['📦 ' + t.verLabel, 'v' + panel.version],
      ['🔑 ' + t.claimLabel, panel.claimTokenSet ? t.claimOn : t.claimOff],
    ];
    $('info-list').innerHTML = rows.map(function (r) {
      return '<div class="info-row"><span class="info-key">' + r[0] + '</span><span class="info-val" title="' + esc(r[1]) + '">' + esc(r[1]) + '</span></div>';
    }).join('');
  }

  function renderRecent(list) {
    var box = $('recent-users');
    if (!list.length) { box.innerHTML = '<div class="empty-hint">' + t.noUsersTitle + '</div>'; return; }
    box.innerHTML = list.map(function (u) {
      return '<div class="mini-row">' +
        '<div class="mini-avatar ' + avatarCls(u.id) + '">' + esc((u.username[0] || '?').toUpperCase()) + '</div>' +
        '<div class="mini-meta"><div class="mini-name">' + esc(u.username) + '</div>' +
        '<div class="mini-sub">' + fmtDate(u.createdAt) + '</div></div>' +
        '<span class="status-pill ' + (u.status === 'active' ? 'st-active' : u.status === 'expired' ? 'st-expired' : 'st-disabled') + '">' +
        (u.status === 'active' ? t.stActive : u.status === 'expired' ? t.stExpired : t.stDisabled) + '</span>' +
        '</div>';
    }).join('');
  }

  $('refresh-all').addEventListener('click', function () { loadStats(); loadUsers(); });

  /* ═══════════ کاربران ═══════════ */
  function loadUsers() {
    api('users').then(function (r) {
      if (!r.data.ok) { toast(errMsg(r)); return; }
      users = r.data.users || [];
      renderUsers();
      $('nav-users-badge').hidden = users.length === 0;
      $('nav-users-badge').textContent = fmtNum(users.length);
    }).catch(function () { toast(t.errNetwork); });
  }

  function filteredUsers() {
    var q = ($('user-search').value || '').trim().toLowerCase();
    return users.filter(function (u) {
      if (userFilter !== 'all') {
        var full = u.quotaGb > 0 && u.usedGb >= u.quotaGb;
        if (userFilter === 'active' && u.status !== 'active') return false;
        if (userFilter === 'expired' && u.status !== 'expired') return false;
        if (userFilter === 'disabled' && u.status !== 'disabled') return false;
        if (userFilter === 'full' && !full) return false;
      }
      if (!q) return true;
      return (u.username || '').toLowerCase().indexOf(q) !== -1 ||
        (u.uuid || '').toLowerCase().indexOf(q) !== -1 ||
        (u.note || '').toLowerCase().indexOf(q) !== -1;
    });
  }

  function renderUsers() {
    var grid = $('users-grid');
    var empty = $('users-empty');
    empty.hidden = users.length > 0;
    $('users-count').textContent = users.length ? fmtNum(users.length) + ' ' + t.tabUsers : '—';

    if (!users.length) { grid.innerHTML = ''; return; }
    var list = filteredUsers();
    if (!list.length) {
      grid.innerHTML = '<div class="empty-hint">' + t.noMatch + '</div>';
      return;
    }
    grid.innerHTML = list.map(function (u) {
      var pct = u.quotaGb > 0 ? Math.min(100, (u.usedGb / u.quotaGb) * 100) : 0;
      var expiryTxt = u.expiryDaysLeft == null ? '∞' : (u.expiryDaysLeft === 0 ? '—' : fmtNum(u.expiryDaysLeft) + ' ' + t.days);
      return '<div class="user-card" data-id="' + u.id + '">' +
        '<div class="uc-top">' +
        '<div class="mini-avatar ' + avatarCls(u.id) + '">' + esc((u.username[0] || '?').toUpperCase()) + '</div>' +
        '<div class="uc-name"><strong title="' + esc(u.username) + '">' + esc(u.username) + '</strong>' +
        (u.note ? '<span class="uc-note">' + esc(u.note) + '</span>' : '') + '</div>' +
        statusPill(u) +
        '</div>' +
        '<div class="uc-stats">' +
        '<div class="uc-stat"><span class="k">' + t.usedShort + '</span><span class="v">' + fmtGb(u.usedGb) + ' / ' + (u.quotaGb > 0 ? fmtGb(u.quotaGb) : '∞') + '</span>' +
        (u.quotaGb > 0 ? progressHtml(pct) : '') + '</div>' +
        '<div class="uc-stat"><span class="k">' + t.expiryShort + '</span><span class="v">' + expiryTxt + '</span>' +
        '<span class="k" style="margin-top:6px">UUID</span><span class="v" style="font-size:10.5px" title="' + esc(u.uuid) + '">' + esc(u.uuid.slice(0, 13)) + '…</span></div>' +
        '</div>' +
        '<div class="uc-actions">' +
        '<label class="switch" title="toggle"><input type="checkbox" data-act="toggle" ' + (u.status === 'active' ? 'checked' : '') + '><span class="track"></span></label>' +
        '<button class="ghost-btn" data-act="qr" title="' + t.showQr + '">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM21 14v.01M14 21v.01M21 21h-3"/></svg>' +
        t.showQr + '</button>' +
        '<button class="ghost-btn" data-act="copy" title="' + t.copyUuid + '">📋</button>' +
        '<button class="ghost-btn uc-del" data-act="delete" title="' + t.delete + '">🗑</button>' +
        '</div>' +
        '</div>';
    }).join('');
  }

  $('user-search').addEventListener('input', renderUsers);
  $('filter-chips').addEventListener('click', function (e) {
    var btn = e.target.closest('.chip-btn');
    if (!btn) return;
    userFilter = btn.getAttribute('data-filter');
    document.querySelectorAll('.chip-btn').forEach(function (b) { b.classList.toggle('active', b === btn); });
    renderUsers();
  });

  $('users-grid').addEventListener('change', function (e) {
    var box = e.target;
    if (box.getAttribute('data-act') !== 'toggle') return;
    var card = box.closest('.user-card');
    if (!card) return;
    var id = Number(card.getAttribute('data-id'));
    api('users/' + id + '/toggle', { method: 'POST', body: { active: box.checked } }).then(function (r) {
      if (r.data.ok) {
        toast(r.data.active ? t.stActive : t.stDisabled);
        loadUsers();
      } else { box.checked = !box.checked; toast(errMsg(r)); }
    }).catch(function () { box.checked = !box.checked; toast(t.errNetwork); });
  });

  $('users-grid').addEventListener('click', function (e) {
    var btn = e.target.closest('[data-act]');
    if (!btn) return;
    var card = btn.closest('.user-card');
    if (!card) return;
    var id = Number(card.getAttribute('data-id'));
    var user = users.find(function (u) { return u.id === id; });
    if (!user) return;
    var act = btn.getAttribute('data-act');

    if (act === 'delete') {
      openConfirm(t.delUserTitle, t.delUserText.replace('{name}', user.username), t.confirmYes, function () {
        api('users/' + id, { method: 'DELETE' }).then(function (r) {
          if (r.data.ok) { toast(t.deleted); loadUsers(); loadStats(); }
          else toast(errMsg(r));
        });
      });
    }
    if (act === 'copy') copyText(user.uuid);
    if (act === 'qr') openQrModal(user);
  });

  /* ─── مودال ساخت کاربر ─── */
  function openUserModal() {
    $('user-modal-error').classList.remove('show');
    $('u-username').value = '';
    $('u-quota').value = '0';
    $('u-expiry').value = '0';
    $('u-note').value = '';
    $('user-modal').hidden = false;
    setTimeout(function () { $('u-username').focus(); }, 60);
  }
  function closeUserModal() { $('user-modal').hidden = true; }
  ['add-user', 'add-user-2', 'add-user-mobile', 'empty-add'].forEach(function (id) {
    var el = $(id);
    if (el) el.addEventListener('click', openUserModal);
  });
  $('user-modal-close').addEventListener('click', closeUserModal);
  $('user-modal-cancel').addEventListener('click', closeUserModal);
  $('user-modal').addEventListener('click', function (e) { if (e.target === $('user-modal')) closeUserModal(); });

  $('user-modal-save').addEventListener('click', function () {
    var errBox = $('user-modal-error');
    errBox.classList.remove('show');
    var body = {
      username: $('u-username').value.trim(),
      quotaGb: Number($('u-quota').value) || 0,
      expiryDays: Number($('u-expiry').value) || 0,
      note: $('u-note').value.trim(),
    };
    api('users', { method: 'POST', body: body }).then(function (r) {
      if (r.data.ok) { toast(t.saved); closeUserModal(); loadUsers(); loadStats(); }
      else if (r.data.error === 'invalid_username') { errBox.textContent = t.invalidUsername; errBox.classList.add('show'); }
      else if (r.data.error === 'username_taken') { errBox.textContent = t.taken; errBox.classList.add('show'); }
      else { errBox.textContent = errMsg(r); errBox.classList.add('show'); }
    }).catch(function () {
      errBox.textContent = t.errNetwork;
      errBox.classList.add('show');
    });
  });
  $('u-username').addEventListener('keydown', function (e) { if (e.key === 'Enter') $('user-modal-save').click(); });

  $('refresh-users').addEventListener('click', function () { loadUsers(); loadStats(); });

  /* ─── مودال QR / کانفیگ ─── */
  function openQrModal(user) {
    qrItem = null;
    $('qr-title').textContent = user.username + ' — ' + t.qrLoading;
    $('qr-img').src = '';
    $('qr-modal').hidden = false;
    var ensure = subsData ? Promise.resolve(subsData) : loadSubs(true);
    Promise.resolve(ensure).then(function () {
      var item = (subsData && subsData.items || []).find(function (it) { return it.id === user.id; });
      if (!item) { $('qr-title').textContent = user.username; toast(t.noSubs); return; }
      qrItem = item;
      $('qr-title').textContent = user.username;
      $('qr-img').src = 'panel/api/qr?text=' + encodeURIComponent(item.vless);
    });
  }
  function closeQrModal() { $('qr-modal').hidden = true; }
  $('qr-modal-close').addEventListener('click', closeQrModal);
  $('qr-modal').addEventListener('click', function (e) { if (e.target === $('qr-modal')) closeQrModal(); });
  $('qr-modal').addEventListener('click', function (e) {
    var btn = e.target.closest('[data-qr-copy]');
    if (!btn || !qrItem) return;
    var kind = btn.getAttribute('data-qr-copy');
    if (kind === 'vless') copyText(qrItem.vless);
    if (kind === 'trojan') copyText(qrItem.trojan);
    if (kind === 'sub') copyText(qrItem.subUrl);
    if (kind === 'subtxt') copyText(qrItem.subTxt);
  });
  // نصب سریع در اپ — deep link با لینک اشتراک
  $('qr-modal').addEventListener('click', function (e) {
    var btn = e.target.closest('[data-app-link]');
    if (!btn || !qrItem || !qrItem.subTxt) return;
    var kind = btn.getAttribute('data-app-link');
    var sub = qrItem.subTxt;
    var link =
      kind === 'hiddify' ? 'hiddify://install-sub?url=' + encodeURIComponent(sub)
      : kind === 'v2rayng' ? 'v2rayng://install-config?url=' + btoa(sub)
      : kind === 'v2box' ? 'v2box://install-sub?url=' + encodeURIComponent(sub) + '&name=' + encodeURIComponent(qrItem.username)
      : 'happ://install-config?url=' + btoa(sub);
    window.open(link, '_self');
  });

  /* ═══════════ اشتراک‌ها ═══════════ */
  function loadSubs(silent) {
    var list = $('subs-list');
    if (!silent) list.innerHTML = '<div class="empty-hint">' + t.loading + '</div>';
    return api('subscriptions').then(function (r) {
      if (!r.data.ok) {
        if (!silent) list.innerHTML = '<div class="empty-hint">' + errMsg(r) + '</div>';
        return null;
      }
      subsData = r.data;
      if (!silent) renderSubs();
      return subsData;
    }).catch(function () {
      if (!silent) list.innerHTML = '<div class="empty-hint">' + t.errNetwork + '</div>';
      return null;
    });
  }

  function renderSubs() {
    var list = $('subs-list');
    var items = (subsData && subsData.items) || [];
    if (!items.length) {
      list.innerHTML = '<div class="empty-hint">' + t.noSubs + '</div>';
      return;
    }
    list.innerHTML = items.map(function (it) {
      var usage = it.quotaGb > 0 ? fmtGb(it.usedGb) + ' / ' + fmtGb(it.quotaGb) : fmtGb(it.usedGb) + ' / ∞';
      var stCls = it.status === 'active' ? 'st-active' : it.status === 'expired' ? 'st-expired' : 'st-disabled';
      var stLbl = it.status === 'active' ? t.stActive : it.status === 'expired' ? t.stExpired : t.stDisabled;
      return '<div class="sub-row" id="sub-' + it.id + '">' +
        '<div class="sub-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></div>' +
        '<div class="sub-meta"><strong>' + esc(it.username) + '</strong>' +
        '<small dir="ltr">' + esc(it.subUrl) + '</small></div>' +
        '<span class="status-pill ' + stCls + '">' + stLbl + '</span>' +
        '<div class="sub-actions">' +
        '<button class="ghost-btn sm" data-open-sub="' + it.id + '">🔗 ' + t.openSubPage + '</button>' +
        '<button class="ghost-btn sm" data-copy-uri="' + esc(it.vless) + '">' + t.copyVless + '</button>' +
        '<button class="ghost-btn sm" data-copy-uri="' + esc(it.trojan) + '">' + t.copyTrojan + '</button>' +
        '<button class="ghost-btn sm" data-copy-uri="' + esc(it.subTxt) + '">📄 ' + t.txtSub + '</button>' +
        '<a class="ghost-btn sm" href="' + esc(it.clashUrl) + '" target="_blank" rel="noopener">⚡ ' + t.clashSub + '</a>' +
        '<a class="ghost-btn sm" href="' + esc(it.singboxUrl) + '" target="_blank" rel="noopener">📦 ' + t.singboxSub + '</a>' +
        '</div></div>';
    }).join('');
  }

  $('subs-list').addEventListener('click', function (e) {
    var btn = e.target.closest('[data-copy-uri]');
    if (btn) {
      copyText(btn.getAttribute('data-copy-uri'));
      return;
    }
    var opener = e.target.closest('[data-open-sub]');
    if (opener) {
      var item = (subsData && subsData.items || []).find(function (it) { return it.id === Number(opener.getAttribute('data-open-sub')); });
      if (item) window.open(item.subUrl, '_blank', 'noopener');
    }
  });
  $('refresh-subs').addEventListener('click', function () { loadSubs(false); });

  /* ═══════════ تنظیمات ═══════════ */
  function loadSettings() {
    api('settings').then(function (r) {
      if (!r.data.ok) return;
      info = r.data;
      $('secure-path').value = '/' + info.securePath + '/panel';
      $('claim-status').textContent = info.claimTokenSet ? t.claimOn : t.claimOff;
      $('ver-status').textContent = 'v' + info.version;
    });
  }
  $('copy-path').addEventListener('click', function () {
    copyText(location.origin + $('secure-path').value);
  });
  $('regenerate-path').addEventListener('click', function () {
    var btn = $('regenerate-path');
    if (btn.getAttribute('data-arm') !== '1') {
      btn.setAttribute('data-arm', '1');
      btn.textContent = t.sureDelete;
      setTimeout(function () { btn.removeAttribute('data-arm'); btn.textContent = t.regenerate; }, 3000);
      return;
    }
    api('settings/secure-path', { method: 'POST', body: {} }).then(function (r) {
      if (r.data.ok) {
        toast(t.pathRegenerated);
        window.location.href = '/' + r.data.securePath + '/panel';
      } else toast(errMsg(r));
    });
  });

  /* ─── تنظیمات پروکسی ─── */
  function fillProxyForm(p) {
    $('p-host').value = p.host || '';
    $('p-port').value = p.port || 443;
    $('p-protocols').value = p.protocols || 'both';
    $('p-tls').checked = !!p.tls;
    $('p-sni').value = p.sni || '';
    $('p-path').value = '/' + (p.proxyPath || '');
    $('p-upstreams').value = p.upstreams || '';
    $('p-failover').value = p.failoverMs || 3000;
  }
  function loadProxySettings() {
    api('settings/proxy').then(function (r) {
      if (r.data.ok) { fillProxyForm(r.data.proxy); proxyData = r.data.proxy; renderSetBadge(); }
    });
  }
  $('save-proxy').addEventListener('click', function () {
    var errBox = $('proxy-error');
    errBox.classList.remove('show');
    api('settings/proxy', {
      method: 'POST',
      body: {
        host: $('p-host').value.trim(),
        port: Number($('p-port').value),
        protocols: $('p-protocols').value,
        tls: $('p-tls').checked,
        sni: $('p-sni').value.trim(),
        upstreams: $('p-upstreams').value,
        failoverMs: Number($('p-failover').value) || 3000,
      },
    }).then(function (r) {
      if (r.data.ok) { toast(t.proxySaved); fillProxyForm(r.data.proxy); }
      else { errBox.textContent = t.errProxy + (r.data.error ? ' (' + r.data.error + ')' : ''); errBox.classList.add('show'); }
    }).catch(function () {
      errBox.textContent = t.errProxy; errBox.classList.add('show');
    });
  });
  $('regenerate-proxy-path').addEventListener('click', function () {
    var btn = $('regenerate-proxy-path');
    if (btn.getAttribute('data-arm') !== '1') {
      btn.setAttribute('data-arm', '1');
      btn.textContent = t.sureDelete;
      setTimeout(function () { btn.removeAttribute('data-arm'); btn.textContent = t.regenerate; }, 3000);
      return;
    }
    api('settings/proxy/regenerate-path', { method: 'POST', body: {} }).then(function (r) {
      if (r.data.ok) { toast(t.proxyPathRegen); $('p-path').value = '/' + r.data.proxyPath; }
      else toast(errMsg(r));
    });
  });

  /* ─── تغییر رمز ─── */
  $('change-pass').addEventListener('click', function () {
    var errBox = $('pass-error');
    errBox.classList.remove('show');
    var body = {
      current: $('cur-pass').value,
      next: $('new-pass').value,
      confirm: $('conf-pass').value,
    };
    api('settings/password', { method: 'POST', body: body }).then(function (r) {
      if (r.data.ok) {
        toast(t.passChanged);
        $('cur-pass').value = '';
        $('new-pass').value = '';
        $('conf-pass').value = '';
      } else if (r.data.error === 'wrong_current') {
        errBox.textContent = t.wrongCurrent; errBox.classList.add('show');
      } else if (r.data.error === 'weak_password') {
        errBox.textContent = t.weakPass; errBox.classList.add('show');
      } else if (r.data.error === 'mismatch') {
        errBox.textContent = t.passMismatch; errBox.classList.add('show');
      } else {
        errBox.textContent = errMsg(r); errBox.classList.add('show');
      }
    }).catch(function () {
      errBox.textContent = t.errNetwork; errBox.classList.add('show');
    });
  });

  $('logout-btn').addEventListener('click', function () { window.location.href = 'logout'; });

  /* ═══════════ اسکنر IP تمیز کلودفلر ═══════════ */
  var CF_RANGES = [
    '173.245.48.0/20', '103.21.244.0/22', '103.22.200.0/22', '103.31.4.0/22',
    '141.101.64.0/18', '108.162.192.0/18', '190.93.240.0/20', '188.114.96.0/20',
    '197.234.240.0/22', '198.41.128.0/17', '162.158.0.0/15', '104.16.0.0/13',
    '104.24.0.0/14', '172.64.0.0/13', '131.0.72.0/22',
  ];
  function ipFromRange(range) {
    var parts = range.split('/');
    var base = parts[0].split('.').map(Number);
    var mask = 32 - Number(parts[1]);
    var n = ((base[0] << 24) | (base[1] << 16) | (base[2] << 8) | base[3]) >>> 0;
    var r = (Math.random() * Math.pow(2, mask)) | 0;
    n = (n | r) >>> 0;
    return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
  }
  function randomCfIps(count) {
    var seen = {};
    var out = [];
    var guard = 0;
    while (out.length < count && guard < count * 20) {
      var ip = ipFromRange(CF_RANGES[(Math.random() * CF_RANGES.length) | 0]);
      if (!seen[ip]) { seen[ip] = 1; out.push(ip); }
      guard++;
    }
    return out;
  }

  // ═══ IP تمیز کلودفلر ═══
  // لیست seed از IP های هرکست شناخته‌شده‌ی کلودفلر با شانس بالای عبور (معمولاً تمیزتر از بقیه)
  var CLEAN_SEED = [
    '1.1.1.1', '1.0.0.1',
    '104.16.0.1', '104.16.1.1', '104.16.2.1', '104.16.3.1', '104.16.4.1', '104.16.5.1',
    '104.16.6.1', '104.16.7.1', '104.16.8.1', '104.16.9.1', '104.16.10.1', '104.16.11.1',
    '104.16.12.1', '104.16.13.1', '104.16.14.1', '104.16.15.1', '104.16.16.1', '104.16.17.1',
    '104.16.18.1', '104.16.19.1', '104.16.20.1', '104.16.21.1', '104.16.22.1', '104.16.23.1',
    '104.16.24.1', '104.16.25.1', '104.16.26.1', '104.16.27.1', '104.16.28.1', '104.16.29.1',
    '104.16.30.1', '104.16.31.1', '104.16.32.1', '104.16.33.1', '104.16.64.1', '104.16.80.1',
    '104.16.96.1', '104.16.112.1', '104.16.128.1', '104.16.160.1', '104.16.192.1', '104.16.224.1',
    '104.17.0.1', '104.17.16.1', '104.17.32.1', '104.17.48.1', '104.17.64.1', '104.17.80.1',
    '104.17.96.1', '104.17.112.1', '104.17.128.1', '104.17.144.1', '104.17.160.1', '104.17.176.1',
    '104.17.192.1', '104.17.208.1', '104.17.224.1', '104.17.240.1', '104.18.0.1', '104.18.16.1',
    '104.18.32.1', '104.18.48.1', '104.18.64.1', '104.18.80.1', '104.18.96.1', '104.18.112.1',
    '104.18.128.1', '104.18.144.1', '104.18.160.1', '104.18.176.1', '104.18.192.1', '104.18.208.1',
    '104.18.224.1', '104.18.240.1', '104.19.0.1', '104.19.16.1', '104.19.32.1', '104.19.64.1',
    '104.19.96.1', '104.19.128.1', '104.19.160.1', '104.19.192.1', '104.19.224.1',
    '104.20.0.1', '104.20.16.1', '104.20.32.1', '104.20.64.1', '104.20.96.1', '104.20.128.1',
    '104.20.160.1', '104.20.192.1', '104.20.224.1', '104.21.0.1', '104.21.16.1', '104.21.32.1',
    '104.21.64.1', '104.21.96.1', '104.21.128.1', '104.21.160.1', '104.21.192.1', '104.21.224.1',
    '104.22.0.1', '104.22.32.1', '104.22.64.1', '104.22.96.1', '104.22.128.1', '104.22.160.1',
    '104.22.192.1', '104.22.224.1', '104.23.0.1', '104.23.32.1', '104.23.64.1', '104.23.96.1',
    '104.23.128.1', '104.23.160.1', '104.23.192.1', '104.23.224.1', '104.24.0.1', '104.24.16.1',
    '104.24.32.1', '104.24.64.1', '104.24.96.1', '104.24.128.1', '104.24.160.1', '104.24.192.1',
    '104.24.224.1', '104.25.0.1', '104.25.16.1', '104.25.32.1', '104.25.64.1', '104.25.96.1',
    '104.25.128.1', '104.25.160.1', '104.25.192.1', '104.25.224.1', '104.26.0.1', '104.26.32.1',
    '104.26.64.1', '104.26.96.1', '104.26.128.1', '104.26.160.1', '104.26.192.1', '104.26.224.1',
    '104.27.0.1', '104.27.32.1', '104.27.64.1', '104.27.96.1', '104.27.128.1', '104.27.160.1',
    '104.27.192.1', '104.27.224.1', '104.28.0.1', '104.28.32.1', '104.28.64.1', '104.28.96.1',
    '104.28.128.1', '104.28.160.1', '104.28.192.1', '104.28.224.1', '104.29.0.1', '104.29.32.1',
    '104.29.64.1', '104.29.96.1', '104.29.128.1', '104.29.160.1', '104.29.192.1', '104.29.224.1',
    '104.30.0.1', '104.30.32.1', '104.30.64.1', '104.30.96.1', '104.30.128.1', '104.30.160.1',
    '104.30.192.1', '104.30.224.1', '104.31.0.1', '104.31.32.1', '104.31.64.1', '104.31.96.1',
    '104.31.128.1', '104.31.160.1', '104.31.192.1', '104.31.224.1',
    '172.64.0.1', '172.64.1.1', '172.64.2.1', '172.64.3.1', '172.64.4.1', '172.64.5.1',
    '172.64.6.1', '172.64.7.1', '172.64.8.1', '172.64.9.1', '172.64.10.1', '172.64.11.1',
    '172.64.12.1', '172.64.13.1', '172.64.14.1', '172.64.15.1', '172.64.16.1', '172.64.17.1',
    '172.64.18.1', '172.64.19.1', '172.64.20.1', '172.64.21.1', '172.64.22.1', '172.64.23.1',
    '172.64.24.1', '172.64.25.1', '172.64.26.1', '172.64.27.1', '172.64.28.1', '172.64.29.1',
    '172.64.30.1', '172.64.31.1', '172.64.32.1', '172.64.33.1', '172.64.34.1', '172.64.35.1',
    '172.64.36.1', '172.64.37.1', '172.64.38.1', '172.64.39.1', '172.64.40.1', '172.64.41.1',
    '172.64.42.1', '172.64.43.1', '172.64.44.1', '172.64.45.1', '172.64.46.1', '172.64.47.1',
    '172.64.48.1', '172.64.49.1', '172.64.50.1', '172.64.51.1', '172.64.52.1', '172.64.53.1',
    '172.64.54.1', '172.64.55.1', '172.64.56.1', '172.64.57.1', '172.64.58.1', '172.64.59.1',
    '172.64.60.1', '172.64.61.1', '172.64.62.1', '172.64.63.1', '172.64.64.1', '172.64.96.1',
    '172.64.128.1', '172.64.160.1', '172.64.192.1', '172.64.224.1', '172.65.0.1', '172.65.32.1',
    '172.65.64.1', '172.65.96.1', '172.65.128.1', '172.65.160.1', '172.65.192.1', '172.65.224.1',
    '172.66.0.1', '172.66.32.1', '172.66.64.1', '172.66.96.1', '172.66.128.1', '172.66.160.1',
    '172.66.192.1', '172.66.224.1', '172.67.0.1', '172.67.32.1', '172.67.64.1', '172.67.96.1',
    '172.67.128.1', '172.67.160.1', '172.67.192.1', '172.67.224.1',
    '162.158.0.1', '162.158.1.1', '162.158.2.1', '162.158.3.1', '162.158.4.1', '162.158.5.1',
    '162.158.6.1', '162.158.7.1', '162.158.8.1', '162.158.9.1', '162.158.10.1', '162.158.11.1',
    '162.158.12.1', '162.158.13.1', '162.158.14.1', '162.158.15.1', '162.158.16.1', '162.158.17.1',
    '162.158.18.1', '162.158.19.1', '162.158.20.1', '162.158.21.1', '162.158.22.1', '162.158.23.1',
    '162.158.24.1', '162.158.25.1', '162.158.26.1', '162.158.27.1', '162.158.28.1', '162.158.29.1',
    '162.158.30.1', '162.158.31.1', '162.158.32.1', '162.158.33.1', '162.158.34.1', '162.158.35.1',
    '162.158.36.1', '162.158.37.1', '162.158.38.1', '162.158.39.1', '162.158.40.1', '162.158.41.1',
    '162.158.42.1', '162.158.43.1', '162.158.44.1', '162.158.45.1', '162.158.46.1', '162.158.47.1',
    '162.158.48.1', '162.158.49.1', '162.158.50.1', '162.158.51.1', '162.158.52.1', '162.158.53.1',
    '162.158.54.1', '162.158.55.1', '162.158.56.1', '162.158.57.1', '162.158.58.1', '162.158.59.1',
    '162.158.60.1', '162.158.61.1', '162.158.62.1', '162.158.63.1', '162.158.64.1', '162.158.96.1',
    '162.158.128.1', '162.158.160.1', '162.158.192.1', '162.158.224.1', '162.159.0.1', '162.159.32.1',
    '162.159.64.1', '162.159.96.1', '162.159.128.1', '162.159.160.1', '162.159.192.1', '162.159.224.1',
    '188.114.96.1', '188.114.97.1', '188.114.98.1', '188.114.99.1', '188.114.100.1',
    '188.114.101.1', '188.114.102.1', '188.114.103.1', '188.114.104.1', '188.114.105.1',
    '188.114.106.1', '188.114.107.1', '188.114.108.1', '188.114.109.1', '188.114.110.1',
    '188.114.111.1', '173.245.48.1', '173.245.49.1', '173.245.50.1', '173.245.51.1',
    '173.245.52.1', '173.245.53.1', '173.245.54.1', '173.245.55.1', '173.245.56.1',
    '173.245.57.1', '173.245.58.1', '173.245.59.1', '173.245.60.1', '173.245.61.1',
    '173.245.62.1', '173.245.63.1', '198.41.128.1', '198.41.129.1', '198.41.130.1',
    '198.41.131.1', '198.41.132.1', '198.41.133.1', '198.41.134.1', '198.41.135.1',
    '198.41.136.1', '198.41.137.1', '198.41.138.1', '198.41.139.1', '198.41.140.1',
    '198.41.141.1', '198.41.142.1', '198.41.143.1', '198.41.144.1', '198.41.145.1',
    '198.41.146.1', '198.41.147.1', '198.41.148.1', '198.41.149.1', '198.41.150.1',
    '198.41.151.1', '198.41.152.1', '198.41.153.1', '198.41.154.1', '198.41.155.1',
    '198.41.156.1', '198.41.157.1', '198.41.158.1', '198.41.159.1', '198.41.160.1',
    '198.41.161.1', '198.41.162.1', '198.41.163.1', '198.41.164.1', '198.41.165.1',
    '198.41.166.1', '198.41.167.1', '198.41.168.1', '198.41.169.1', '198.41.170.1',
    '198.41.171.1', '198.41.172.1', '198.41.173.1', '198.41.174.1', '198.41.175.1',
    '198.41.176.1', '198.41.177.1', '198.41.178.1', '198.41.179.1', '198.41.180.1',
    '198.41.181.1', '198.41.182.1', '198.41.183.1', '198.41.184.1', '198.41.185.1',
    '198.41.186.1', '198.41.187.1', '198.41.188.1', '198.41.189.1', '198.41.190.1',
    '198.41.191.1', '198.41.192.1', '198.41.193.1', '198.41.194.1', '198.41.195.1',
    '198.41.196.1', '198.41.197.1', '198.41.198.1', '198.41.199.1', '198.41.200.1',
    '198.41.201.1', '198.41.202.1', '198.41.203.1', '198.41.204.1', '198.41.205.1',
    '198.41.206.1', '198.41.207.1', '198.41.208.1', '198.41.209.1', '198.41.210.1',
    '198.41.211.1', '198.41.212.1', '198.41.213.1', '198.41.214.1', '198.41.215.1',
    '198.41.216.1', '198.41.217.1', '198.41.218.1', '198.41.219.1', '198.41.220.1',
    '198.41.221.1', '198.41.222.1', '198.41.223.1', '198.41.224.1', '198.41.225.1',
    '198.41.226.1', '198.41.227.1', '198.41.228.1', '198.41.229.1', '198.41.230.1',
    '198.41.231.1', '198.41.232.1', '198.41.233.1', '198.41.234.1', '198.41.235.1',
    '198.41.236.1', '198.41.237.1', '198.41.238.1', '198.41.239.1', '198.41.240.1',
    '198.41.241.1', '198.41.242.1', '198.41.243.1', '198.41.244.1', '198.41.245.1',
    '198.41.246.1', '198.41.247.1', '198.41.248.1', '198.41.249.1', '198.41.250.1',
    '198.41.251.1', '198.41.252.1', '198.41.253.1', '198.41.254.1', '198.41.255.1',
    '141.101.64.1', '141.101.65.1', '141.101.66.1', '141.101.67.1', '141.101.68.1',
    '141.101.69.1', '141.101.70.1', '141.101.71.1', '141.101.72.1', '141.101.73.1',
    '141.101.74.1', '141.101.75.1', '141.101.76.1', '141.101.77.1', '141.101.78.1',
    '141.101.79.1', '141.101.80.1', '141.101.81.1', '141.101.82.1', '141.101.83.1',
    '141.101.84.1', '141.101.85.1', '141.101.86.1', '141.101.87.1', '141.101.88.1',
    '141.101.89.1', '141.101.90.1', '141.101.91.1', '141.101.92.1', '141.101.93.1',
    '141.101.94.1', '141.101.95.1', '141.101.96.1', '141.101.97.1', '141.101.98.1',
    '141.101.99.1', '141.101.100.1', '141.101.101.1', '141.101.102.1', '141.101.103.1',
    '141.101.104.1', '141.101.105.1', '141.101.106.1', '141.101.107.1', '141.101.108.1',
    '141.101.109.1', '141.101.110.1', '141.101.111.1', '141.101.112.1', '141.101.113.1',
    '141.101.114.1', '141.101.115.1', '141.101.116.1', '141.101.117.1', '141.101.118.1',
    '141.101.119.1', '141.101.120.1', '141.101.121.1', '141.101.122.1', '141.101.123.1',
    '141.101.124.1', '141.101.125.1', '141.101.126.1', '141.101.127.1', '141.101.128.1',
    '108.162.192.1', '108.162.193.1', '108.162.194.1', '108.162.195.1', '108.162.196.1',
    '108.162.197.1', '108.162.198.1', '108.162.199.1', '108.162.200.1', '108.162.201.1',
    '108.162.202.1', '108.162.203.1', '108.162.204.1', '108.162.205.1', '108.162.206.1',
    '108.162.207.1', '108.162.208.1', '108.162.209.1', '108.162.210.1', '108.162.211.1',
    '108.162.212.1', '108.162.213.1', '108.162.214.1', '108.162.215.1', '108.162.216.1',
    '108.162.217.1', '108.162.218.1', '108.162.219.1', '108.162.220.1', '108.162.221.1',
    '108.162.222.1', '108.162.223.1', '108.162.224.1', '108.162.225.1', '108.162.226.1',
    '108.162.227.1', '108.162.228.1', '108.162.229.1', '108.162.230.1', '108.162.231.1',
    '108.162.232.1', '108.162.233.1', '108.162.234.1', '108.162.235.1', '108.162.236.1',
    '108.162.237.1', '108.162.238.1', '108.162.239.1', '108.162.240.1', '108.162.241.1',
    '108.162.242.1', '108.162.243.1', '108.162.244.1', '108.162.245.1', '108.162.246.1',
    '108.162.247.1', '108.162.248.1', '108.162.249.1', '108.162.250.1', '108.162.251.1',
    '108.162.252.1', '108.162.253.1', '108.162.254.1', '108.162.255.1',
  ];

  function cleanCfIps(count) {
    var seen = {};
    var out = [];
    var i = 0;
    // ابتدا از لیست seed (شانس بالای تمیز بودن)
    var order = CLEAN_SEED.slice();
    // shuffle ملایم
    for (var j = order.length - 1; j > 0; j--) {
      var k = (Math.random() * (j + 1)) | 0;
      var tmp = order[j]; order[j] = order[k]; order[k] = tmp;
    }
    while (out.length < count && i < order.length) {
      var ip = order[i++];
      if (!seen[ip]) { seen[ip] = 1; out.push(ip); }
    }
    // اگر seed کافی نبود — از رنج‌های اصلی تولید کن
    var guard = 0;
    while (out.length < count && guard < count * 30) {
      var ip2 = ipFromRange(CF_RANGES[(Math.random() * CF_RANGES.length) | 0]);
      if (!seen[ip2]) { seen[ip2] = 1; out.push(ip2); }
      guard++;
    }
    return out;
  }

  function savedCfIps(count) {
    try {
      var list = JSON.parse(store.getItem('panel_clean_ips') || '[]');
      if (!list.length) { toast(t.scanSavedEmpty); return null; }
      return list.slice(0, count);
    } catch (e) { return null; }
  }

  function scanIps(count) {
    count = Number(count) || 100;
    var src = ($('scan-source') ? $('scan-source').value : 'clean');
    if (src === 'saved') {
      var sv = savedCfIps(count);
      if (sv) return sv;
    }
    if (src === 'clean') return cleanCfIps(count);
    if (src === 'random') return randomCfIps(count);
    // منابع زنده: mix | ircf | cf2dns | bestcf — خروجی Promise است (async)
    return liveIps(count, src);
  }

  var SRC_EMOJI = { mix: '⚡', ircf: '🌐', cf2dns: '📡', bestcf: '🌏' };

  // لیست زنده — از API پنل (منابع ircf/cf2dns/bestcf با کش سمت سرور) + کش محلی مرورگر
  async function liveIps(count, src) {
    var emoji = SRC_EMOJI[src] || '🌐';
    var chip = $('scan-source-chip');
    var showChip = function (txt) { if (chip) { chip.textContent = txt; chip.hidden = false; } };
    var setLoading = function () {
      var l = $('scan-list');
      if (l) l.innerHTML = '<div class="empty-hint">' + esc(t.liveLoading) + '</div>';
    };
    var cacheKey = 'panel_clean_cache_' + src;
    setLoading();
    try {
      var r = await api('clean-ips?src=' + src);
      if (r.data && r.data.ok && r.data.items && r.data.items.length) {
        var seen = {}, out = [];
        r.data.items.forEach(function (it) { var ip = String(it.ip); if (!seen[ip]) { seen[ip] = 1; out.push(ip); } });
        if (out.length) {
          var ts = r.data.updatedAt || Date.now();
          var timeTxt = new Date(ts).toLocaleTimeString(lang === 'fa' ? 'fa-IR' : 'en-GB', { hour: '2-digit', minute: '2-digit' });
          showChip(t.liveChip(emoji, out.length, timeTxt));
          try { store.setItem(cacheKey, JSON.stringify({ ts: Date.now(), ips: out })); } catch (e) {}
          while (out.length < count) {
            var extra = cleanCfIps(count - out.length);
            var added = false;
            extra.forEach(function (ip) { if (!seen[ip]) { seen[ip] = 1; out.push(ip); added = true; } });
            if (!added) break;
          }
          return out;
        }
      }
    } catch (e) { /* fallback */ }
    try {
      var cached = JSON.parse(store.getItem(cacheKey) || 'null');
      if (cached && Array.isArray(cached.ips) && cached.ips.length) {
        showChip(t.liveChip(emoji, cached.ips.length, 'cache'));
        return cached.ips.slice(0, count);
      }
    } catch (e) { /* ignore */ }
    toast(t.liveFallback);
    return cleanCfIps(count);
  }
  // پینگ واقعی (RTT) با WebSocket — از مرورگر کاربر
  // تشخیص «زنده» بودن: خطای سریع‌تر از آستانه = مسدود (RST تحریم/مرده)،
  // خطای بالای آستانه = TCP+TLS به کلودفلر رسیده (خطای گواهی/403) → زنده.
  // آستانه ثابت نمی‌ماند؛ قبل از هر اسکن با «کالیبراسیون شبکه» محاسبه می‌شود
  // (بر اساس RTT واقعی شبکه‌ی کاربر) تا در اینترنت‌های پرسرعت هم درست کار کند.
  function pingIp(ip, timeoutMs, port, thresholdMs) {
    port = port || 443;
    var thr = (typeof thresholdMs === 'number' && thresholdMs > 0) ? thresholdMs : 110;
    return new Promise(function (resolve) {
      var t0 = performance.now();
      var done = false;
      var ws = null;
      var timer = setTimeout(function () {
        if (done) return; done = true;
        try { ws && ws.close(); } catch (e) {}
        resolve({ ip: ip, port: port, ok: false, ms: null, reason: 'timeout' });
      }, timeoutMs);
      try { ws = new WebSocket('wss://' + ip + ':' + port); } catch (e) {
        if (done) return; done = true; clearTimeout(timer);
        resolve({ ip: ip, port: port, ok: false, ms: null, reason: 'error' });
        return;
      }
      ws.onopen = function () {
        if (done) return; done = true; clearTimeout(timer);
        var ms = Math.round(performance.now() - t0);
        try { ws.close(); } catch (e) {}
        resolve({ ip: ip, port: port, ok: true, ms: ms, reason: 'open' });
      };
      ws.onerror = function () {
        if (done) return; done = true; clearTimeout(timer);
        var ms = Math.round(performance.now() - t0);
        try { ws.close(); } catch (e) {}
        resolve({ ip: ip, port: port, ok: ms >= thr, ms: ms, reason: 'reachable' });
      };
    });
  }

  // کالیبراسیون: RTT شبکه‌ی کاربر را با چند IP مرجع کلودفلر می‌سنجد و
  // آستانه‌ی تشخیص را بر اساس آن تنظیم می‌کند (آستانه‌ی ثابت ۱۱۰ms در
  // اینترنت‌های پرسرعت همه را «مسدود» نشان می‌داد — رفع شد).
  var REF_IPS = ['104.16.132.229', '1.1.1.1', '172.64.155.154'];
  async function calibrateThreshold() {
    var samples = [];
    var res = await Promise.all(REF_IPS.map(function (ip) { return pingIp(ip, 2500, 443, 0); }));
    res.forEach(function (r) { if (r.ms !== null) samples.push(r.ms); });
    if (!samples.length) return null; // شبکه به کلودفلر دسترسی ندارد
    samples.sort(function (a, b) { return a - b; });
    var med = samples[Math.floor(samples.length / 2)];
    return Math.max(30, Math.min(250, Math.round(med * 0.75)));
  }

  // تست هوشمند: IP های «زنده‌ی مرزی» (نزدیک آستانه) با یک پورت جایگزین
  // تأیید می‌شوند تا RTT متغیر، نتیجه را خراب نکند.
  var ALT_PORTS = { 443: 2053, 2053: 443, 8443: 443, 2096: 443 };
  async function pingIpSmart(ip, timeoutMs, port, thresholdMs) {
    var r = await pingIp(ip, timeoutMs, port, thresholdMs);
    if (!r.ok || r.ms === null) return r;
    if (r.ms < thresholdMs * 1.6) {
      var alt = ALT_PORTS[port] || (port === 443 ? 2053 : 443);
      var r2 = await pingIp(ip, Math.min(timeoutMs, 1500), alt, thresholdMs);
      if (r2.ok && r2.ms !== null && r2.ms < r.ms) r.ms = r2.ms;
    }
    return r;
  }

  var scanner = {
    running: false, ips: [], results: [], index: 0, active: 0, timer: null,

    start: async function () {
      var count = Number($('scan-count').value) || 100;
      var timeout = Number($('scan-timeout').value) || 2000;
      var conc = Number($('scan-conc').value) || 30;
      this.port = Number($('scan-port').value) || 443;
      this.running = true;
      this.index = 0;
      this.active = 0;
      this.results = [];
      this.t0 = Date.now();
      var sr0 = $('scan-send-relay');
      if (sr0) sr0.disabled = true;
      var srcChip = $('scan-source-chip');
      if (srcChip) srcChip.hidden = true;
      $('scan-start').hidden = true;
      $('scan-stop').hidden = false;
      $('scan-progress').hidden = false;
      $('scan-list').innerHTML = '<div class="empty-hint">' + esc(t.scanProgress) + '</div>';
      var ips = await scanIps(count);
      if (!this.running) return;
      this.ips = ips;
      this.updateProgress();
      // کالیبراسیون آستانه بر اساس شبکه‌ی کاربر
      var thr = await calibrateThreshold();
      if (thr === null) {
        this.threshold = 110;
        toast(t.scanCalibFail);
      } else {
        this.threshold = thr;
      }
      this.tick(timeout, conc);
    },

    stop: function () {
      this.running = false;
      $('scan-start').hidden = false;
      $('scan-stop').hidden = true;
      this.render();
    },

    tick: function (timeout, conc) {
      var self = this;
      if (!this.running) return;
      while (this.active < conc && this.index < this.ips.length) {
        var ip = this.ips[this.index++];
        this.active++;
        pingIpSmart(ip, timeout, this.port, this.threshold).then(function (res) {
          self.active--;
          if (res.ok && res.ms !== null) self.results.push(res);
          self.updateProgress();
          if (self.active === 0 && self.index >= self.ips.length) {
            self.running = false;
            self.render();
            $('scan-start').hidden = false;
            $('scan-stop').hidden = true;
          }
        });
      }
      if (this.running && (this.index < this.ips.length || this.active > 0)) {
        this.timer = setTimeout(function () { self.tick(timeout, conc); }, 120);
      }
    },

    updateProgress: function () {
      var done = this.index;
      var total = this.ips.length;
      var pct = total ? Math.round((done / total) * 100) : 0;
      $('scan-bar-fill').style.width = pct + '%';
      var eta = '';
      if (this.t0 && done > 5 && this.running) {
        var per = (Date.now() - this.t0) / done;
        var left = Math.round((total - done) * per / 1000);
        if (left > 0) eta = ' · ⏱ ' + left + 's ' + t.scanEtc;
      }
      $('scan-counter').textContent = done + ' / ' + total + eta;
      $('scan-found').textContent = this.results.length + ' ' + t.scanFound + ' ✓';
      var ring = $('scan-ring-fg');
      if (ring) {
        var C = 2 * Math.PI * 15.9;
        ring.style.strokeDasharray = C.toFixed(2);
        ring.style.strokeDashoffset = (C * (1 - pct / 100)).toFixed(2);
      }
      $('scan-pct').textContent = pct + '%';
      var sr = $('scan-send-relay');
      if (sr) sr.disabled = !this.results.length;
    },

    render: function () {
      var list = $('scan-list');
      if (!this.results.length) {
        list.innerHTML = '<div class="empty-hint">' + esc(t.scanNoResult) + '</div>';
        return;
      }
      var sorted = this.results.slice().sort(function (a, b) { return a.ms - b.ms; });
      list.innerHTML = sorted.map(function (r, i) {
        var best = i < 5 ? ' scan-best' : '';
        return '<div class="scan-row' + (r.ok ? '' : ' scan-bad') + '">' +
          '<span class="scan-rank">' + (i + 1) + '</span>' +
          '<span class="scan-ip">' + r.ip + '</span>' +
          '<span class="scan-rt">' + r.ms + ' ms</span>' +
          (best ? '<span class="status-pill st-active">★ ' + t.scanBest + '</span>' : '') +
          '<button class="ghost-btn sm scan-copy-btn" data-ip="' + r.ip + '" data-port="' + r.port + '">' + t.scanCopy + '</button>' +
          '<button class="ghost-btn sm scan-set-btn" data-set-ip="' + r.ip + '" data-set-port="' + (r.port || 443) + '" title="' + esc(t.scanSetIp) + '">🎯</button>' +
          '</div>';
      }).join('');
    },
  };

  $('scan-start').addEventListener('click', function () { scanner.start(); });
  $('scan-stop').addEventListener('click', function () { scanner.stop(); });
  $('scan-save').addEventListener('click', function () {
    var alive = scanner.results.filter(function (r) { return r.ok; });
    if (!alive.length) { toast(t.scanNoResult); return; }
    var sorted = alive.slice().sort(function (a, b) { return a.ms - b.ms; });
    var prev = [];
    try { prev = JSON.parse(store.getItem('panel_clean_ips') || '[]'); } catch (e) {}
    var seen = {};
    prev.forEach(function (x) { seen[x] = 1; });
    sorted.forEach(function (r) { if (!seen[r.ip]) { seen[r.ip] = 1; prev.push(r.ip); } });
    store.setItem('panel_clean_ips', JSON.stringify(prev.slice(0, 500)));
    toast(t.scanSaved + ' — ' + sorted.length);
  });

  function copyServerConfig(ip, port) {
    api('users').then(function (r) {
      if (!r.data.ok || !r.data.users || !r.data.users.length) { toast(t.scanErr); return; }
      var user = r.data.users[0];
      var q = 'config?server=' + encodeURIComponent(ip) + '&uuid=' + encodeURIComponent(user.uuid);
      if (port) q += '&port=' + port;
      api(q).then(function (c) {
        if (!c.data.ok) { toast(c.data.error || t.scanErr); return; }
        copyText(c.data.vless + '\n' + c.data.trojan);
      });
    });
  }
  $('scan-list').addEventListener('click', function (e) {
    var btn = e.target.closest('.scan-copy-btn');
    if (btn) copyServerConfig(btn.getAttribute('data-ip'), btn.getAttribute('data-port'));
  });
  $('scan-copy-best').addEventListener('click', function () {
    var best = scanner.results.slice().sort(function (a, b) { return a.ms - b.ms; }).slice(0, 5);
    if (!best.length) { toast(t.scanErr); return; }
    api('users').then(function (r) {
      if (!r.data.ok || !r.data.users || !r.data.users.length) { toast(t.scanErr); return; }
      var user = r.data.users[0];
      var jobs = best.map(function (b2) {
        var q = 'config?server=' + encodeURIComponent(b2.ip) + '&uuid=' + encodeURIComponent(user.uuid);
        if (b2.port) q += '&port=' + b2.port;
        return api(q);
      });
      Promise.all(jobs).then(function (resps) {
        var lines = [];
        resps.forEach(function (c) { if (c.data.ok) { lines.push(c.data.vless); lines.push(c.data.trojan); } });
        if (!lines.length) { toast(t.scanErr); return; }
        copyText(lines.join('\n'));
      });
    });
  });

  /* ═══════════ ست کردن IP روی کانفیگ‌ها ═══════════ */
  var proxyData = null;
  function renderSetBadge() {
    var badge = $('scan-set-badge');
    if (!badge) return;
    if (proxyData && proxyData.overrideIp) {
      $('scan-set-badge-text').textContent = proxyData.overrideIp + (proxyData.overridePort ? ':' + proxyData.overridePort : '') + ' · ' + t.scanSetBadge;
      badge.hidden = false;
    } else {
      badge.hidden = true;
    }
  }
  function setConfigIp(ip, port) {
    if (!ip) { toast(t.scanSetEmpty); return; }
    api('settings/proxy', {
      method: 'POST',
      body: { overrideIp: ip, overridePort: port ? Number(port) : undefined },
    }).then(function (r) {
      if (r.data.ok) {
        proxyData = r.data.proxy;
        renderSetBadge();
        toast(t.scanSetDone + ' — ' + ip + (port ? ':' + port : ''));
      } else {
        toast(errMsg(r) || t.errProxy);
      }
    }).catch(function () { toast(t.errProxy); });
  }
  function clearConfigIp() {
    api('settings/proxy', { method: 'POST', body: { overrideIp: '' } }).then(function (r) {
      if (r.data.ok) {
        proxyData = r.data.proxy;
        renderSetBadge();
        toast(t.scanSetCleared);
      } else toast(errMsg(r) || t.errProxy);
    }).catch(function () { toast(t.errProxy); });
  }
  $('scan-set-ip').addEventListener('click', function () {
    var alive = scanner.results.filter(function (r) { return r.ok; }).slice().sort(function (a, b) { return a.ms - b.ms; });
    if (!alive.length) { toast(t.scanSetEmpty); return; }
    setConfigIp(alive[0].ip, alive[0].port || 443);
  });
  $('scan-list').addEventListener('click', function (e) {
    var btn = e.target.closest('.scan-set-btn');
    if (btn) setConfigIp(btn.getAttribute('data-set-ip'), btn.getAttribute('data-set-port'));
  });
  $('scan-set-clear').addEventListener('click', clearConfigIp);
  $('relay-set-best').addEventListener('click', function () {
    var alive = relay.results.filter(function (r) { return r.avg != null; }).slice()
      .sort(function (a, b) { return relayScoreRank(a.score) - relayScoreRank(b.score) || (a.avg - b.avg); });
    if (!alive.length) { toast(t.scanSetEmpty); return; }
    setConfigIp(alive[0].ip, alive[0].port || 443);
  });
  /* ═══════════ تست رله‌ها (پیشرفته) ═══════════ */
  var relay = {
    running: false, ips: [], results: [], index: 0, active: 0,
    probeCount: 5, timeoutMs: 2500, conc: 10,
  };

  function switchScanTab(name) {
    document.querySelectorAll('.scan-tab').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-stab') === name);
    });
    var a = $('stab-ipscan'), b = $('stab-relay');
    if (a) a.classList.toggle('active', name === 'ipscan');
    if (b) b.classList.toggle('active', name === 'relay');
  }
  $('scan-tabs').addEventListener('click', function (e) {
    var btn = e.target.closest('.scan-tab');
    if (btn) switchScanTab(btn.getAttribute('data-stab'));
  });

  /* ─── لاگ کنسول ─── */
  function relayLog(cls, msg) {
    var box = $('relay-console');
    if (!box) return;
    var now = new Date().toLocaleTimeString('en-GB', { hour12: false });
    var line = document.createElement('div');
    line.className = 'console-line ' + (cls || '');
    line.innerHTML = '<span class="time">' + now + '</span> ' + msg;
    box.appendChild(line);
    while (box.children.length > 220) box.removeChild(box.firstChild);
    box.scrollTop = box.scrollHeight;
  }

  /* ─── امتیاز کیفیت ─── */
  function relayScore(avg, loss, jitter) {
    if (loss >= 100 || avg == null) return 'F';
    var pts = 100 - avg * 0.22 - jitter * 0.6 - loss * 1.2;
    if (pts >= 88) return 'A+';
    if (pts >= 75) return 'A';
    if (pts >= 60) return 'B';
    if (pts >= 45) return 'C';
    if (pts >= 30) return 'D';
    return 'F';
  }
  function relayScoreRank(sc) { return { 'A+': 0, A: 1, B: 2, C: 3, D: 4, F: 5 }[sc] || 9; }
  function relayScoreClass(sc) { return 'score-' + sc.replace('+', '-plus'); }

  function relayStats(probes) {
    var alive = probes.filter(function (m) { return m != null; });
    var loss = Math.round((1 - alive.length / probes.length) * 100);
    var min = alive.length ? Math.min.apply(null, alive) : null;
    var max = alive.length ? Math.max.apply(null, alive) : null;
    var avg = alive.length ? Math.round(alive.reduce(function (a, b) { return a + b; }, 0) / alive.length) : null;
    var jitter = 0;
    if (alive.length >= 2) {
      var sum = 0;
      for (var i = 1; i < alive.length; i++) sum += Math.abs(alive[i] - alive[i - 1]);
      jitter = Math.round(sum / (alive.length - 1));
    }
    return { min: min, max: max, avg: avg, jitter: jitter, loss: loss, score: relayScore(avg, loss, jitter) };
  }

  /* ─── اسپارکلاین ─── */
  function relaySpark(probes) {
    var W = 90, H = 24, pad = 2;
    var alive = [];
    for (var i = 0; i < probes.length; i++) if (probes[i] != null) alive.push({ i: i, m: probes[i] });
    var pts, cls;
    if (!alive.length) {
      pts = [{ x: 0, y: H - pad }, { x: W, y: H - pad }];
      cls = 'sp-line-bad';
    } else {
      var max = Math.max.apply(null, alive.map(function (p) { return p.m; }));
      pts = alive.map(function (p) {
        var x = probes.length > 1 ? (p.i / (probes.length - 1)) * (W - 2 * pad) + pad : W / 2;
        var y = H - pad - (p.m / max) * (H - 2 * pad);
        return { x: x, y: y };
      });
    }
    var line = pts.map(function (p) { return p.x.toFixed(1) + ',' + p.y.toFixed(1); }).join(' ');
    var last = pts[pts.length - 1];
    return '<svg class="spark" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">' +
      '<polyline points="' + line + '" class="' + cls + '"/>' +
      (alive.length ? '<circle cx="' + last.x.toFixed(1) + '" cy="' + last.y.toFixed(1) + '" r="2.2"/>' : '') +
      '</svg>';
  }

  /* ─── پارس IP (پشتیبانی از ip و ip:port) ─── */
  function relayParseIps(text) {
    var out = [], seen = {};
    String(text).split(/[\n,;]+/).forEach(function (line) {
      line = line.trim();
      if (!line) return;
      var ip = line, port = null;
      if (line.indexOf(':') !== -1) {
        var parts = line.split(':');
        ip = parts[0].trim();
        port = Number(parts[1]);
      }
      if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return;
      if (port != null && (!Number.isInteger(port) || port < 1 || port > 65535)) return;
      var key = ip + ':' + (port || '');
      if (seen[key]) return;
      seen[key] = 1;
      out.push({ ip: ip, port: port || Number($('relay-port').value) || 443 });
    });
    return out;
  }

  /* ─── اجرای تست ─── */
  function relayStart() {
    var ips = relayParseIps($('relay-ips').value);
    if (!ips.length) { toast(t.relayNoIps); return; }
    relay.running = true;
    relay.ips = ips;
    relay.index = 0;
    relay.active = 0;
    relay.results = [];
    relay.probeCount = Number($('relay-probes').value) || 5;
    relay.timeoutMs = Number($('relay-timeout').value) || 2500;
    relay.conc = Number($('relay-conc').value) || 10;
    $('relay-console').innerHTML = '';
    $('relay-start').hidden = true;
    $('relay-stop').hidden = false;
    $('relay-empty').hidden = true;
    $('relay-summary').hidden = true;
    $('relay-tbody').innerHTML = '';
    $('relay-count').textContent = '';
    relayLog('info', t.relayLogStart
      .replace('{n}', ips.length)
      .replace('{p}', relay.probeCount)
      .replace('{port}', ips[0].port)
      .replace('{c}', relay.conc));
    relayTick();
  }

  function relayTick() {
    if (!relay.running) return;
    while (relay.active < relay.conc && relay.index < relay.ips.length) {
      var entry = relay.ips[relay.index++];
      relay.active++;
      relayTestIp(entry);
    }
  }

  async function relayTestIp(entry) {
    var probes = [];
    for (var i = 1; i <= relay.probeCount; i++) {
      if (!relay.running) break;
      var r = await pingIp(entry.ip, relay.timeoutMs, entry.port);
      var alive = !!r.ok;
      probes.push(alive ? r.ms : null);
      var tag = r.reason === 'open' ? '✔' : (alive ? '▸' : '✗');
      var cls = r.reason === 'open' ? 'good' : (alive ? 'info' : 'bad');
      var note = r.reason === 'open' ? ' رله ✓' : (alive ? ' reachable' : ' TIMEOUT');
      relayLog(cls, tag + ' ' + esc(entry.ip) + ':' + entry.port + ' — ping ' + i + '/' + relay.probeCount +
        ': ' + (alive ? r.ms + 'ms' + note : '—'));
    }
    if (!relay.running) { relay.active--; relayRender(); return; }
    var st = relayStats(probes);
    var result = {
      ip: entry.ip, port: entry.port, probes: probes,
      min: st.min, max: st.max, avg: st.avg, jitter: st.jitter, loss: st.loss, score: st.score,
    };
    relay.results.push(result);
    relayLog(st.score === 'F' ? 'bad' : 'good',
      '✔ ' + esc(entry.ip) + ':' + entry.port + ' → avg ' + (st.avg == null ? '—' : st.avg + 'ms') +
      ' · loss ' + st.loss + '% · score ' + st.score);
    relayRender();
    relay.active--;
    if (relay.running && relay.active === 0 && relay.index >= relay.ips.length) relayFinish();
    else relayTick();
  }

  function relayFinish() {
    relay.running = false;
    $('relay-start').hidden = false;
    $('relay-stop').hidden = true;
    var alive = relay.results.filter(function (r) { return r.avg != null; });
    var total = relay.results.length;
    var avgAll = alive.length ? Math.round(alive.reduce(function (s, r) { return s + r.avg; }, 0) / alive.length) : null;
    var best = alive.slice().sort(function (a, b) { return a.avg - b.avg; })[0];
    relayLog('info', t.relayLogFinish.replace('{alive}', alive.length).replace('{total}', total));
    var sum = $('relay-summary');
    sum.innerHTML = t.relaySummary
      .replace('{alive}', '<b class="ok">' + alive.length + '</b>')
      .replace('{total}', '<b>' + total + '</b>')
      .replace('{pct}', Math.round(total ? (alive.length / total) * 100 : 0))
      .replace('{avg}', avgAll == null ? '—' : '<b>' + avgAll + 'ms</b>')
      .replace('{best}', best ? '<b>' + esc(best.ip) + '</b>' : '—')
      .replace('{bestms}', best ? best.avg + 'ms' : '—');
    sum.hidden = false;
    relayRender();
  }

  /* ─── رندر جدول ─── */
  function relayRender() {
    var tbody = $('relay-tbody');
    if (!tbody) return;
    if (!relay.results.length) {
      tbody.innerHTML = '';
      $('relay-empty').hidden = false;
      $('relay-count').textContent = '—';
      return;
    }
    $('relay-empty').hidden = true;
    var sorted = relay.results.slice().sort(function (a, b) {
      return relayScoreRank(a.score) - relayScoreRank(b.score) ||
        (a.avg == null ? 99999 : a.avg) - (b.avg == null ? 99999 : b.avg);
    });
    tbody.innerHTML = sorted.map(function (r, i) {
      var dead = r.avg == null;
      return '<tr>' +
        '<td><span class="rank">' + (i + 1) + '</span></td>' +
        '<td class="ip-cell">' + esc(r.ip) + '</td>' +
        '<td class="num">' + r.port + '</td>' +
        '<td class="num">' + (r.min == null ? '—' : r.min) + '</td>' +
        '<td class="num">' + (r.avg == null ? '—' : r.avg) + '</td>' +
        '<td class="num">' + (r.max == null ? '—' : r.max) + '</td>' +
        '<td class="num">' + r.jitter + '</td>' +
        '<td class="num">' + (dead ? '—' : r.loss + '%') + '</td>' +
        '<td><span class="score ' + relayScoreClass(r.score) + '" title="' + esc(t.relayScoreHint) + '">' + r.score + '</span></td>' +
        '<td>' + relaySpark(r.probes) + '</td>' +
        '<td><div class="cell-actions">' +
        '<button class="icon-btn" data-relay-copy="' + esc(r.ip) + '" data-relay-port="' + r.port + '" title="' + esc(t.copyVless) + '">📋</button>' +
        '<button class="icon-btn" data-relay-set="' + esc(r.ip) + '" data-relay-port="' + r.port + '" title="' + esc(t.scanSetIp) + '">🎯</button>' +
        '<button class="icon-btn" data-relay-fav="' + esc(r.ip) + '" data-relay-port="' + r.port + '" title="⭐">⭐</button>' +
        '</div></td>' +
        '</tr>';
    }).join('');
    var alive = relay.results.filter(function (r) { return r.avg != null; }).length;
    var avg = alive ? Math.round(relay.results.filter(function (r) { return r.avg != null; }).reduce(function (s, r) { return s + r.avg; }, 0) / alive) : 0;
    $('relay-count').textContent = alive + ' / ' + relay.results.length + ' · avg ' + avg + 'ms';
  }

  /* ─── علاقه‌مندی‌ها ─── */
  function favsList() {
    try { var v = JSON.parse(store.getItem('panel_favs') || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; }
  }
  function favsSave(l) { store.setItem('panel_favs', JSON.stringify(l)); }
  function favsRender() {
    var box = $('relay-favs');
    if (!box) return;
    var l = favsList();
    if (!l.length) { box.innerHTML = '<div class="empty-hint">' + t.relayNoFavs + '</div>'; return; }
    box.innerHTML = l.map(function (f) {
      return '<span class="fav-chip" data-fav-ip="' + esc(f.ip) + '" data-fav-port="' + f.port + '">' +
        esc(f.ip) + '<span class="fav-port">:' + f.port + '</span>' +
        '<button data-fav-del="' + esc(f.ip) + '" title="del">✕</button></span>';
    }).join('');
  }

  /* ─── خروجی ─── */
  function relayExport() {
    if (!relay.results.length) { toast(t.relayEmpty); return; }
    var sorted = relay.results.slice().sort(function (a, b) {
      return relayScoreRank(a.score) - relayScoreRank(b.score) ||
        (a.avg == null ? 99999 : a.avg) - (b.avg == null ? 99999 : b.avg);
    });
    var lines = ['QANAT RELAY TEST — ' + new Date().toISOString().slice(0, 19).replace('T', ' ')];
    lines.push('==================================================');
    lines.push('#' + '\t' + 'IP' + '\t' + 'PORT' + '\t' + 'MIN' + '\t' + 'AVG' + '\t' + 'MAX' + '\t' + 'JITTER' + '\t' + 'LOSS%' + '\t' + 'SCORE');
    sorted.forEach(function (r, i) {
      lines.push((i + 1) + '\t' + r.ip + '\t' + r.port + '\t' + (r.min == null ? '-' : r.min) + '\t' +
        (r.avg == null ? '-' : r.avg) + '\t' + (r.max == null ? '-' : r.max) + '\t' + r.jitter + '\t' + r.loss + '\t' + r.score);
    });
    copyText(lines.join('\n'));
  }

  /* ─── رویدادها ─── */
  $('relay-start').addEventListener('click', relayStart);
  $('relay-stop').addEventListener('click', function () {
    relay.running = false;
    relayLog('warn', t.relayLogStop);
    $('relay-start').hidden = false;
    $('relay-stop').hidden = true;
  });
  $('relay-add-ip').addEventListener('click', function () {
    var v = $('relay-ip-add').value.trim();
    if (!v) return;
    var cur = $('relay-ips').value.trim();
    $('relay-ips').value = (cur ? cur + '\n' : '') + v;
    $('relay-ip-add').value = '';
    $('relay-ip-add').focus();
  });
  $('relay-ip-add').addEventListener('keydown', function (e) { if (e.key === 'Enter') $('relay-add-ip').click(); });
  $('relay-import-scan').addEventListener('click', function () {
    if (!scanner.results.length) { toast(t.scanErr); return; }
    var best = scanner.results.slice().sort(function (a, b) { return a.ms - b.ms; }).slice(0, 20);
    $('relay-ips').value = best.map(function (r) { return r.ip + (r.port && r.port !== 443 ? ':' + r.port : ''); }).join('\n');
    toast(t.relayImported + ': ' + best.length);
  });
  $('relay-import-fav').addEventListener('click', function () {
    var l = favsList();
    if (!l.length) { toast(t.relayNoFavs); return; }
    $('relay-ips').value = l.map(function (f) { return f.ip + ':' + f.port; }).join('\n');
    toast(t.relayImported + ': ' + l.length);
  });
  $('relay-export').addEventListener('click', relayExport);
  $('relay-clear-favs').addEventListener('click', function () { favsSave([]); favsRender(); });
  $('relay-favs').addEventListener('click', function (e) {
    var del = e.target.closest('[data-fav-del]');
    if (del) {
      var ip = del.getAttribute('data-fav-del');
      favsSave(favsList().filter(function (f) { return f.ip !== ip; }));
      favsRender();
      return;
    }
    var chip = e.target.closest('[data-fav-ip]');
    if (chip) {
      var cur = $('relay-ips').value.trim();
      $('relay-ips').value = (cur ? cur + '\n' : '') + chip.getAttribute('data-fav-ip') + ':' + chip.getAttribute('data-fav-port');
    }
  });
  $('relay-tbody').addEventListener('click', function (e) {
    var setb = e.target.closest('[data-relay-set]');
    if (setb) {
      setConfigIp(setb.getAttribute('data-relay-set'), setb.getAttribute('data-relay-port'));
      return;
    }
    var btn = e.target.closest('[data-relay-copy]');
    if (btn) {
      copyServerConfig(btn.getAttribute('data-relay-copy'), btn.getAttribute('data-relay-port'));
      return;
    }
    var fav = e.target.closest('[data-relay-fav]');
    if (fav) {
      var fip = fav.getAttribute('data-relay-fav');
      var fport = Number(fav.getAttribute('data-relay-port'));
      var l = favsList();
      if (l.some(function (f) { return f.ip === fip && Number(f.port) === fport; })) { toast(t.relayFavExists); return; }
      l.push({ ip: fip, port: fport });
      favsSave(l);
      favsRender();
      toast(t.relayFavSaved);
    }
  });
  $('scan-send-relay').addEventListener('click', function () {
    if (!scanner.results.length) return;
    switchScanTab('relay');
    var best = scanner.results.slice().sort(function (a, b) { return a.ms - b.ms; }).slice(0, 20);
    $('relay-ips').value = best.map(function (r) { return r.ip + (r.port && r.port !== 443 ? ':' + r.port : ''); }).join('\n');
    relayStart();
  });

  favsRender();

  /* ═══════════ سراسری ═══════════ */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeUserModal(); closeQrModal(); closeConfirm();
    }
  });

  /* ═══════════ شروع ═══════════ */
  function renderAll() {
    if (stats) renderStats();
    renderUsers();
    if (subsData) renderSubs();
  }

  applyLang();
  applyTheme();

  // سلام پویا + ساعت زنده
  function tickClock() {
    var now = new Date();
    var h = now.getHours();
    $('dash-date').textContent = now.toLocaleDateString(lang === 'fa' ? 'fa-IR' : 'en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    var clk = $('dash-clock'), cld = $('dash-clock-date');
    if (clk) clk.textContent = now.toLocaleTimeString(lang === 'fa' ? 'fa-IR' : 'en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    if (cld) cld.textContent = now.toLocaleDateString(lang === 'fa' ? 'fa-IR' : 'en-GB', { day: 'numeric', month: 'long' });
    var greet = h < 5 ? t.dashGreetN : h < 12 ? t.dashGreetM : h < 17 ? t.dashGreetA : h < 21 ? t.dashGreetE : t.dashGreetN;
    var g = $('dash-greet');
    if (g && g.textContent !== greet) g.textContent = greet;
  }
  tickClock();
  setInterval(tickClock, 1000);

  api('me').then(function (r) {
    if (r.data.ok) {
      $('session-chip').textContent = '✓ ' + r.data.sub + ' · v' + r.data.version;
      loadSettings();
      loadProxySettings();
      loadUsers();
      loadStats();
    } else {
      window.location.href = 'login';
    }
  }).catch(function () {
    window.location.href = 'login';
  });
})();
