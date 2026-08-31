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
      tabOverview: 'نمای کلی', tabUsers: 'کاربران', tabSubs: 'اشتراک‌ها', tabSettings: 'تنظیمات',
      loading: 'در حال بارگذاری…', noUsers: 'هنوز کاربری ساخته نشده — با دکمه‌ی «کاربر جدید» شروع کنید.',
      thUser: 'کاربر', thStatus: 'وضعیت', thQuota: 'کوتا (GB)', thUsed: 'مصرف', thExpiry: 'انقضا', thActions: 'عملیات',
      stActive: 'فعال', stDisabled: 'غیرفعال', stExpired: 'منقضی',
      unlimited: 'نامحدود', never: 'بدون انقضا', days: 'روز',
      quickTitle: 'دسترسی سریع', quickUsers: 'مدیریت کاربران', quickSettings: 'تنظیمات پنل',
      infoTitle: 'اطلاعات پنل',
      statUsers: 'کل کاربران', statActive: 'کاربران فعال', statUsed: 'مصرف کل', statQuota: 'کوتای کل',
      usersTitle: 'کاربران', refresh: 'تازه‌سازی', addUser: '+ کاربر جدید',
      secTitle: 'امنیت', securePathLabel: 'مسیر مخفی پنل', regenerate: 'بازسازی',
      securePathHint: 'بعد از بازسازی، آدرس پنل عوض می‌شود. لینک جدید را ذخیره کنید.',
      claimLabel: 'توکن ادعای نصب (Claim Token)', claimOn: 'تنظیم شده ✓', claimOff: 'تنظیم نشده',
      claimHint: 'اگر تنظیم شده باشد، اولین نصب فقط با این توکن امکان‌پذیر است.',
      verLabel: 'نسخه',
      passTitle: 'تغییر رمز عبور', curPass: 'رمز فعلی', newPass: 'رمز جدید (حداقل ۸ کاراکتر)',
      confPass: 'تکرار رمز جدید', changePass: 'تغییر رمز عبور',
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
      subsTitle: 'اشتراک کاربران', subsHint: 'هر کاربر لینک اختصاصی خودش را دارد — با دانستن UUID قابل دسترسی است.',
      noSubs: 'کاربری وجود ندارد — اول کاربر بسازید.',
      copyUri: 'کپی', copiedUri: '✓ کپی شد',
      openSubPage: 'صفحه‌ی اشتراک', txtSub: 'اشتراک متنی', clashSub: 'Clash', singboxSub: 'sing-box',
      proxyTitle: 'تنظیمات پروکسی', pHost: 'هاست (خالی = خودکار)', pPort: 'پورت',
      pProtocols: 'پروتکل‌ها', pBoth: 'هر دو (VLESS + Trojan)', pVless: 'فقط VLESS', pTrojan: 'فقط Trojan',
      pTls: 'TLS', pTlsHint: 'اگر پشت دامنه‌ی خودتان است روشن باشد', pSni: 'SNI (خالی = هاست)',
      pPathLabel: 'مسیر مخفی پروکسی', pPathHint: 'کلاینت‌ها با این مسیر وصل می‌شوند — بعد از تغییر، کانفیگ‌ها را به‌روز کنید.',
      saveProxy: 'ذخیره تنظیمات پروکسی', proxySaved: 'تنظیمات پروکسی ذخیره شد ✓', proxyPathRegen: 'مسیر پروکسی بازسازی شد ✓',
      errProxy: 'خطا در ذخیره تنظیمات پروکسی',
      usageOf: 'مصرف:', noLimit: 'نامحدود',
      tabScanner: 'اسکنر', scanTitle: '📡 اسکنر IP تمیز کلودفلر',
      scanHint: 'IP های تصادفی کلودفلر از مرورگر شما تست می‌شوند — پینگ واقعی RTT از دستگاه شما. IP های «زنده» معمولاً تمیز و قابل استفاده‌اند.',
      scanStart: 'شروع اسکن', scanStop: 'توقف', scanCount: 'تعداد IP', scanTimeout: 'مهلت اتصال', scanConc: 'همزمانی',
      scanResults: 'نتایج', scanIdle: 'اسکن را شروع کنید — نتایج اینجا نمایش داده می‌شود.', scanCopyBest: 'کپی کانفیگ ۵ IP برتر',
      scanProgress: 'در حال اسکن...', scanFound: 'زنده', scanAlive: 'زنده', scanDead: 'مرده/فیلتر', scanBest: 'بهترین',
      scanNoResult: 'IP زنده‌ای پیدا نشد — تعداد یا مهلت را بیشتر کنید.', scanCopied: 'کانفیگ کپی شد ✓', scanErr: 'برای کپی کانفیگ باید اول اسکن کنید.',
      scanIpCol: 'IP', scanPingCol: 'پینگ (ms)', scanStatusCol: 'وضعیت', scanActionCol: 'کانفیگ', scanCopy: 'کپی',
    },
    en: {
      panelTitle: 'Qanat', logout: 'Logout',
      tabOverview: 'Overview', tabUsers: 'Users', tabSubs: 'Subscriptions', tabSettings: 'Settings',
      loading: 'Loading…', noUsers: 'No users yet — create one with "New user".',
      thUser: 'User', thStatus: 'Status', thQuota: 'Quota (GB)', thUsed: 'Usage', thExpiry: 'Expiry', thActions: 'Actions',
      stActive: 'Active', stDisabled: 'Disabled', stExpired: 'Expired',
      unlimited: 'Unlimited', never: 'No expiry', days: 'days',
      quickTitle: 'Quick actions', quickUsers: 'Manage users', quickSettings: 'Panel settings',
      infoTitle: 'Panel info',
      statUsers: 'Total users', statActive: 'Active users', statUsed: 'Total usage', statQuota: 'Total quota',
      usersTitle: 'Users', refresh: 'Refresh', addUser: '+ New user',
      secTitle: 'Security', securePathLabel: 'Panel secret path', regenerate: 'Regenerate',
      securePathHint: 'After regeneration the panel URL changes. Save the new link.',
      claimLabel: 'Install claim token', claimOn: 'Set ✓', claimOff: 'Not set',
      claimHint: 'When set, first-time setup is only possible with this token.',
      verLabel: 'Version',
      passTitle: 'Change password', curPass: 'Current password', newPass: 'New password (min 8 chars)',
      confPass: 'Confirm new password', changePass: 'Change password',
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
      subsTitle: 'User subscriptions', subsHint: 'Each user has their own private link — accessible by UUID.',
      noSubs: 'No users yet — create one first.',
      copyUri: 'Copy', copiedUri: '✓ Copied',
      openSubPage: 'Subscription page', txtSub: 'Text sub', clashSub: 'Clash', singboxSub: 'sing-box',
      proxyTitle: 'Proxy settings', pHost: 'Host (empty = auto)', pPort: 'Port',
      pProtocols: 'Protocols', pBoth: 'Both (VLESS + Trojan)', pVless: 'VLESS only', pTrojan: 'Trojan only',
      pTls: 'TLS', pTlsHint: 'Enable if behind your own domain', pSni: 'SNI (empty = host)',
      pPathLabel: 'Secret proxy path', pPathHint: 'Clients connect through this path — regenerate configs after changing.',
      saveProxy: 'Save proxy settings', proxySaved: 'Proxy settings saved ✓', proxyPathRegen: 'Proxy path regenerated ✓',
      errProxy: 'Error saving proxy settings',
      usageOf: 'Usage:', noLimit: 'Unlimited',
      tabScanner: 'Scanner', scanTitle: '📡 Cloudflare Clean IP Scanner',
      scanHint: 'Random Cloudflare IPs are tested from your browser — real RTT ping from your device. Alive IPs are usually clean and usable.',
      scanStart: 'Start scan', scanStop: 'Stop', scanCount: 'IP count', scanTimeout: 'Timeout', scanConc: 'Concurrency',
      scanResults: 'Results', scanIdle: 'Start a scan — results appear here.', scanCopyBest: 'Copy top 5 configs',
      scanProgress: 'Scanning...', scanFound: 'alive', scanAlive: 'Alive', scanDead: 'Dead/Filtered', scanBest: 'Best',
      scanNoResult: 'No alive IP found — increase count or timeout.', scanCopied: 'Config copied ✓', scanErr: 'Run a scan first.',
      scanIpCol: 'IP', scanPingCol: 'Ping (ms)', scanStatusCol: 'Status', scanActionCol: 'Config', scanCopy: 'Copy',
    },
  };

  var lang = store.getItem('panel_lang') || 'fa';
  var theme = store.getItem('panel_theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  var t = I18N[lang] || I18N.fa;
  var users = [];
  var info = null;
  var modalOpen = false;
  var pendingDelete = null;

  function $(id) { return document.getElementById(id); }
  function fmtNum(n) { return n.toLocaleString(lang === 'fa' ? 'en-US' : 'en-US'); }
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
    $('lang-btn').textContent = lang === 'fa' ? 'English' : 'فارسی';
  }
  function applyTheme() {
    document.documentElement.setAttribute('data-theme', theme);
    $('theme-btn').textContent = theme === 'dark' ? '☀️' : '🌙';
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
  function switchView(name) {
    ['overview', 'users', 'subs', 'scanner', 'settings'].forEach(function (v) {
      $('view-' + v).hidden = v !== name;
    });
    document.querySelectorAll('.tab').forEach(function (el) {
      el.classList.toggle('active', el.getAttribute('data-view') === name);
    });
    if (name === 'users') loadUsers();
    if (name === 'subs') loadSubs();
    if (name === 'settings') loadSettings();
  }
  document.querySelectorAll('.tab').forEach(function (el) {
    el.addEventListener('click', function () { switchView(el.getAttribute('data-view')); });
  });
  document.querySelectorAll('[data-goto]').forEach(function (el) {
    el.addEventListener('click', function () { switchView(el.getAttribute('data-goto')); });
  });

  /* ═══════════ نمای کلی ═══════════ */
  function renderOverview() {
    var now = Date.now();
    var total = users.length;
    var active = users.filter(function (u) { return u.status === 'active'; }).length;
    var used = users.reduce(function (s, u) { return s + u.usedGb; }, 0);
    var quota = users.reduce(function (s, u) { return s + u.quotaGb; }, 0);

    var cards = [
      { n: fmtNum(total), l: t.statUsers },
      { n: fmtNum(active), l: t.statActive },
      { n: fmtGb(used), l: t.statUsed },
      { n: quota === 0 ? '∞' : fmtGb(quota), l: t.statQuota },
    ];
    $('stat-cards').innerHTML = cards.map(function (c) {
      return '<div class="stat acc"><div class="lbl">' + esc(c.l) + '</div><div class="num">' + c.n + '</div></div>';
    }).join('');

    var rows = [
      ['🏷️ ' + t.securePathLabel, '/' + (info ? info.securePath : '…') + '/panel'],
      ['📦 ' + t.verLabel, 'v' + (info ? info.version : '…')],
      ['🔑 ' + t.claimLabel, info ? (info.claimTokenSet ? t.claimOn : t.claimOff) : '…'],
    ];
    $('info-list').innerHTML = rows.map(function (r) {
      return '<div><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>';
    }).join('');
  }

  /* ═══════════ کاربران ═══════════ */
  function loadUsers() {
    var body = $('users-body');
    body.innerHTML = '<tr><td colspan="6" class="empty">' + t.loading + '</td></tr>';
    api('users').then(function (r) {
      if (!r.data.ok) { body.innerHTML = '<tr><td colspan="6" class="empty">' + errMsg(r) + '</td></tr>'; return; }
      users = r.data.users || [];
      $('users-empty-hint').hidden = users.length > 0;
      renderUsers();
      renderOverview();
    }).catch(function () {
      body.innerHTML = '<tr><td colspan="6" class="empty">' + t.errNetwork + '</td></tr>';
    });
  }

  function statusBadge(u) {
    var cls = u.status === 'active' ? 'ok' : u.status === 'expired' ? 'bad' : 'neutral';
    var lbl = u.status === 'active' ? t.stActive : u.status === 'expired' ? t.stExpired : t.stDisabled;
    return '<span class="badge ' + cls + '">' + lbl + '</span>';
  }

  function quotaCell(u) {
    if (u.quotaGb === 0) return '<span>' + t.unlimited + '</span>';
    var pct = u.quotaGb > 0 ? Math.min(100, (u.usedGb / u.quotaGb) * 100) : 0;
    var full = pct >= 100 ? ' full' : '';
    return '<div class="progress"><div class="bar"><i class="' + full + '" style="width:' + pct.toFixed(1) + '%"></i></div><div class="txt">' + fmtGb(u.usedGb) + ' / ' + fmtGb(u.quotaGb) + '</div></div>';
  }

  function renderUsers() {
    var body = $('users-body');
    if (users.length === 0) {
      body.innerHTML = '<tr><td colspan="6" class="empty">' + t.noUsers + '</td></tr>';
      return;
    }
    body.innerHTML = users.map(function (u) {
      var initial = (u.username[0] || '?').toUpperCase();
      var expiryTxt = u.expiryDaysLeft == null ? t.never : (u.expiryDaysLeft === 0 ? '—' : u.expiryDaysLeft + ' ' + t.days);
      return '<tr data-id="' + u.id + '">' +
        '<td><div class="u-cell"><div class="u-avatar">' + esc(initial) + '</div>' +
        '<div><div class="u-name">' + esc(u.username) + '</div>' +
        '<div class="u-sub" title="' + esc(u.uuid) + '">' + esc(u.uuid) + '</div></div></div></td>' +
        '<td>' + statusBadge(u) + '</td>' +
        '<td>' + (u.quotaGb === 0 ? t.unlimited : fmtNum(u.quotaGb)) + '</td>' +
        '<td>' + quotaCell(u) + '</td>' +
        '<td>' + (u.expiryDaysLeft == null ? '—' : expiryTxt) + '</td>' +
        '<td><div class="row-actions">' +
        '<label class="switch" title="toggle"><input type="checkbox" data-act="toggle" ' + (u.status === 'active' ? 'checked' : '') + '><span class="track"></span></label>' +
        '<button class="btn-danger" data-act="delete">🗑</button>' +
        '<button class="ghost-btn" data-act="copy" title="UUID">📋</button>' +
        '</div></td></tr>';
    }).join('');
  }

  $('users-body').addEventListener('click', function (e) {
    var btn = e.target.closest('[data-act]');
    if (!btn) return;
    var tr = btn.closest('tr');
    var id = Number(tr.getAttribute('data-id'));
    var user = users.find(function (u) { return u.id === id; });
    if (!user) return;

    if (btn.getAttribute('data-act') === 'delete') {
      if (pendingDelete !== id) {
        pendingDelete = id;
        btn.textContent = t.sureDelete;
        btn.classList.add('confirm');
        setTimeout(function () {
          if (pendingDelete === id) {
            pendingDelete = null;
            btn.textContent = '🗑';
            btn.classList.remove('confirm');
          }
        }, 2500);
        return;
      }
      pendingDelete = null;
      api('users/' + id, { method: 'DELETE' }).then(function (r) {
        if (r.data.ok) { toast(t.deleted); loadUsers(); }
        else toast(errMsg(r));
      });
    }
    if (btn.getAttribute('data-act') === 'copy') {
      copyText(user.uuid);
    }
  });

  $('users-body').addEventListener('change', function (e) {
    var box = e.target;
    if (box.getAttribute('data-act') !== 'toggle') return;
    var tr = box.closest('tr');
    var id = Number(tr.getAttribute('data-id'));
    api('users/' + id + '/toggle', { method: 'POST', body: { active: box.checked } }).then(function (r) {
      if (r.data.ok) toast(r.data.active ? '✓' : '—');
      else { box.checked = !box.checked; toast(errMsg(r)); }
      loadUsers();
    });
  });

  /* ─── مودال ساخت کاربر ─── */
  function openModal() {
    modalOpen = true;
    $('modal').hidden = false;
    $('modal-error').classList.remove('show');
    $('u-username').value = '';
    $('u-quota').value = '0';
    $('u-expiry').value = '0';
    $('u-note').value = '';
    $('u-username').focus();
  }
  function closeModal() {
    modalOpen = false;
    $('modal').hidden = true;
  }
  $('add-user').addEventListener('click', openModal);
  $('modal-close').addEventListener('click', closeModal);
  $('modal-cancel').addEventListener('click', closeModal);
  $('modal').addEventListener('click', function (e) { if (e.target === $('modal')) closeModal(); });

  $('modal-save').addEventListener('click', function () {
    var errBox = $('modal-error');
    errBox.classList.remove('show');
    var body = {
      username: $('u-username').value.trim(),
      quotaGb: Number($('u-quota').value) || 0,
      expiryDays: Number($('u-expiry').value) || 0,
      note: $('u-note').value.trim(),
    };
    api('users', { method: 'POST', body: body }).then(function (r) {
      if (r.data.ok) { toast(t.saved); closeModal(); loadUsers(); }
      else if (r.data.error === 'invalid_username') { errBox.textContent = t.invalidUsername; errBox.classList.add('show'); }
      else if (r.data.error === 'username_taken') { errBox.textContent = t.taken; errBox.classList.add('show'); }
      else { errBox.textContent = errMsg(r); errBox.classList.add('show'); }
    }).catch(function () {
      errBox.textContent = t.errNetwork;
      errBox.classList.add('show');
    });
  });
  $('u-username').addEventListener('keydown', function (e) { if (e.key === 'Enter') $('modal-save').click(); });

  $('refresh-users').addEventListener('click', loadUsers);

  /* ═══════════ اشتراک‌ها ═══════════ */
  var subsData = null;

  function loadSubs() {
    var list = $('subs-list');
    list.innerHTML = '<div class="empty-hint">' + t.loading + '</div>';
    api('subscriptions').then(function (r) {
      if (!r.data.ok) { list.innerHTML = '<div class="empty-hint">' + errMsg(r) + '</div>'; return; }
      subsData = r.data;
      renderSubs();
    }).catch(function () {
      list.innerHTML = '<div class="empty-hint">' + t.errNetwork + '</div>';
    });
  }

  function renderSubs() {
    var list = $('subs-list');
    var items = (subsData && subsData.items) || [];
    if (items.length === 0) {
      list.innerHTML = '<div class="empty-hint">' + t.noSubs + '</div>';
      return;
    }
    list.innerHTML = items.map(function (it) {
      var statusCls = it.status === 'active' ? 'ok' : it.status === 'expired' ? 'bad' : 'neutral';
      var statusLbl = it.status === 'active' ? t.stActive : it.status === 'expired' ? t.stExpired : t.stDisabled;
      var usage = it.quotaGb > 0 ? fmtGb(it.usedGb) + ' / ' + fmtGb(it.quotaGb) : fmtGb(it.usedGb) + ' / ∞';
      var uriRows = (it.uris || []).map(function (uri) {
        return '<div class="sub-link"><code>' + esc(uri) + '</code>' +
          '<button class="icon-btn" data-copy-uri="' + esc(uri) + '" title="' + t.copyUri + '">📋</button></div>';
      }).join('');
      return '<div class="sub-card" id="sub-' + it.id + '">' +
        '<div class="sub-head"><div class="sub-name"><div class="u-avatar">' + esc((it.username[0] || '?').toUpperCase()) + '</div>' +
        '<span>' + esc(it.username) + '</span> <span class="badge ' + statusCls + '">' + statusLbl + '</span></div>' +
        '<span class="mini">' + t.usageOf + ' ' + usage + '</span></div>' +
        uriRows +
        '<div class="sub-qr-row">' +
        '<div class="qr-img"><img src="panel/api/qr?text=' + encodeURIComponent(it.vless) + '" alt="QR" loading="lazy"/></div>' +
        '<div class="sub-urls">' +
        '<a href="' + esc(it.subUrl) + '" target="_blank" rel="noopener">🔗 ' + t.openSubPage + '</a>' +
        '<a href="' + esc(it.subTxt) + '" target="_blank" rel="noopener">📄 ' + t.txtSub + '</a>' +
        '<a href="' + esc(it.clashUrl) + '" target="_blank" rel="noopener">⚡ ' + t.clashSub + '</a>' +
        '<a href="' + esc(it.singboxUrl) + '" target="_blank" rel="noopener">📦 ' + t.singboxSub + '</a>' +
        '</div></div>' +
        '</div>';
    }).join('');
  }

  $('subs-list').addEventListener('click', function (e) {
    var btn = e.target.closest('[data-copy-uri]');
    if (!btn) return;
    copyText(btn.getAttribute('data-copy-uri'));
    btn.textContent = '✓';
    setTimeout(function () { btn.textContent = '📋'; }, 1500);
  });

  $('refresh-subs').addEventListener('click', loadSubs);

  /* ═══════════ تنظیمات ═══════════ */
  function loadSettings() {
    api('settings').then(function (r) {
      if (!r.data.ok) return;
      info = r.data;
      $('secure-path').value = '/' + info.securePath + '/panel';
      $('claim-status').textContent = info.claimTokenSet ? t.claimOn : t.claimOff;
      $('ver-status').textContent = 'v' + info.version;
      renderOverview();
    });
  }
  $('copy-path').addEventListener('click', function () {
    var v = $('secure-path').value;
    copyText(location.origin + v);
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

  /* ═══════════ تنظیمات پروکسی ═══════════ */
  function fillProxyForm(p) {
    $('p-host').value = p.host || '';
    $('p-port').value = p.port || 443;
    $('p-protocols').value = p.protocols || 'both';
    $('p-tls').checked = !!p.tls;
    $('p-sni').value = p.sni || '';
    $('p-path').value = '/' + (p.proxyPath || '');
  }

  function loadProxySettings() {
    api('settings/proxy').then(function (r) {
      if (r.data.ok) fillProxyForm(r.data.proxy);
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
  // رنج‌های IPv4 رسمی Cloudflare
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

  // پینگ واقعی (RTT) با WebSocket به پورت 443 — از مرورگر کاربر
  function pingIp(ip, timeoutMs) {
    return new Promise(function (resolve) {
      var t0 = performance.now();
      var done = false;
      var ws = null;
      var timer = setTimeout(function () {
        if (done) return; done = true;
        try { ws && ws.close(); } catch (e) {}
        resolve({ ip: ip, ok: false, ms: null, reason: 'timeout' });
      }, timeoutMs);
      try { ws = new WebSocket('wss://' + ip + ':443'); } catch (e) {
        if (done) return; done = true; clearTimeout(timer);
        resolve({ ip: ip, ok: false, ms: null, reason: 'error' });
        return;
      }
      ws.onopen = function () {
        if (done) return; done = true; clearTimeout(timer);
        var ms = Math.round(performance.now() - t0);
        try { ws.close(); } catch (e) {}
        resolve({ ip: ip, ok: true, ms: ms, reason: 'open' });
      };
      ws.onerror = function () {
        // خطای سریع = IP باز و در دسترس (فقط گواهی mismatch) — برای اتصال با SNI دامنه قابل استفاده است
        if (done) return; done = true; clearTimeout(timer);
        var ms = Math.round(performance.now() - t0);
        try { ws.close(); } catch (e) {}
        resolve({ ip: ip, ok: ms < 3000, ms: ms, reason: 'reachable' });
      };
    });
  }

  var scanner = {
    running: false,
    ips: [],
    results: [],
    index: 0,
    active: 0,
    timer: null,

    start: function () {
      var count = Number($('scan-count').value);
      var timeout = Number($('scan-timeout').value);
      var conc = Number($('scan-conc').value);
      this.running = true;
      this.index = 0;
      this.active = 0;
      this.results = [];
      this.ips = randomCfIps(count);
      $('scan-start').hidden = true;
      $('scan-stop').hidden = false;
      $('scan-progress').hidden = false;
      $('scan-list').innerHTML = '<div class="empty-hint">' + esc(t.scanProgress) + '</div>';
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
        pingIp(ip, timeout).then(function (res) {
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
      $('scan-counter').textContent = done + ' / ' + total;
      $('scan-found').textContent = this.results.length + ' ' + t.scanFound + ' ✓';
    },

    render: function () {
      var list = $('scan-list');
      var t2 = t;
      if (!this.results.length) {
        list.innerHTML = '<div class="empty-hint">' + esc(t2.scanNoResult) + '</div>';
        return;
      }
      var sorted = this.results.slice().sort(function (a, b) { return a.ms - b.ms; });
      var rows = sorted.map(function (r, i) {
        var badge = i < 5
          ? '<span class="badge scan-best">★ ' + esc(t2.scanBest) + '</span>'
          : '<span class="badge scan-alive">' + esc(t2.scanAlive) + '</span>';
        return '<div class="scan-row">' +
          '<span class="scan-rank">' + (i + 1) + '</span>' +
          '<code class="scan-ip" dir="ltr">' + r.ip + '</code>' +
          '<span class="scan-ms" dir="ltr">' + r.ms + ' ms</span>' +
          '<span>' + badge + '</span>' +
          '<button class="ghost-btn scan-copy" data-ip="' + r.ip + '">' + esc(t2.scanCopy) + '</button>' +
          '</div>';
      }).join('');
      list.innerHTML = '<div class="scan-head"><span>#</span><span>' + esc(t2.scanIpCol) + '</span><span>' + esc(t2.scanPingCol) + '</span><span>' + esc(t2.scanStatusCol) + '</span><span>' + esc(t2.scanActionCol) + '</span></div>' + rows;
    },
  };

  $('scan-start').addEventListener('click', function () { scanner.start(); });
  $('scan-stop').addEventListener('click', function () { scanner.stop(); });

  // کپی کانفیگ برای یک IP (سرور کانفیگ با server=IP می‌سازد)
  function copyServerConfig(ip) {
    api('users').then(function (r) {
      if (!r.data.ok || !r.data.users || !r.data.users.length) { toast(t.scanErr); return; }
      var user = r.data.users[0];
      api('config?server=' + encodeURIComponent(ip) + '&uuid=' + encodeURIComponent(user.uuid)).then(function (c) {
        if (!c.data.ok) { toast(c.data.error || t.scanErr); return; }
        copyText(c.data.vless + '\n' + c.data.trojan);
      });
    });
  }

  $('scan-list').addEventListener('click', function (e) {
    var btn = e.target.closest('.scan-copy');
    if (btn) copyServerConfig(btn.getAttribute('data-ip'));
  });

  $('scan-copy-best').addEventListener('click', function () {
    var best = scanner.results.slice().sort(function (a, b) { return a.ms - b.ms; }).slice(0, 5);
    if (!best.length) { toast(t.scanErr); return; }
    api('users').then(function (r) {
      if (!r.data.ok || !r.data.users || !r.data.users.length) { toast(t.scanErr); return; }
      var user = r.data.users[0];
      var jobs = best.map(function (b2) {
        return api('config?server=' + encodeURIComponent(b2.ip) + '&uuid=' + encodeURIComponent(user.uuid));
      });
      Promise.all(jobs).then(function (resps) {
        var lines = [];
        resps.forEach(function (c) { if (c.data.ok) { lines.push(c.data.vless); lines.push(c.data.trojan); } });
        if (!lines.length) { toast(t.scanErr); return; }
        copyText(lines.join('\n'));
      });
    });
  });

  /* ═══════════ شروع ═══════════ */
  applyLang();
  applyTheme();

  api('me').then(function (r) {
    if (r.data.ok) {
      $('session-chip').textContent = '✓ ' + r.data.sub + ' · v' + r.data.version;
      loadSettings();
      loadProxySettings();
      loadUsers();
    } else {
      window.location.href = 'login';
    }
  }).catch(function () {
    window.location.href = 'login';
  });

  switchView('overview');
})();
