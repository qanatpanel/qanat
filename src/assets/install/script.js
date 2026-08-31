(function () {
  'use strict';
  var STATE = window.__INSTALL_STATE__ || { denied: false, needClaim: false };
  var I18N = {
    fa: {
      title: 'راه‌اندازی پنل',
      subtitle: 'رمز عبور مدیر را تعیین کنید. این رمز برای ورود به پنل استفاده می‌شود.',
      passLabel: 'رمز عبور جدید',
      passPh: 'حداقل ۸ کاراکتر',
      confirmLabel: 'تکرار رمز عبور',
      confirmPh: 'تکرار رمز عبور',
      install: 'نصب پنل',
      denied: 'دسترسی غیرمجاز — توکن نصب (Claim Token) نامعتبر است.',
      weak: 'رمز عبور خیلی کوتاه است (حداقل ۸ کاراکتر).',
      mismatch: 'رمزهای عبور یکسان نیستند.',
      badClaim: 'توکن نصب نامعتبر است.',
      badRequest: 'درخواست نامعتبر است.',
      forbidden: 'درخواست رد شد.',
      network: 'خطا در برقراری ارتباط.',
      installing: 'در حال نصب…',
    },
    en: {
      title: 'Panel Setup',
      subtitle: 'Set the admin password. You will use it to sign in to the panel.',
      passLabel: 'New password',
      passPh: 'At least 8 characters',
      confirmLabel: 'Confirm password',
      confirmPh: 'Confirm password',
      install: 'Install panel',
      denied: 'Access denied — invalid install claim token.',
      weak: 'Password is too short (minimum 8 characters).',
      mismatch: 'Passwords do not match.',
      badClaim: 'Invalid install claim token.',
      badRequest: 'Invalid request.',
      forbidden: 'Request rejected.',
      network: 'Connection error.',
      installing: 'Installing…',
    },
  };

  var lang = localStorage.getItem('panel_lang') || 'fa';
  var theme = localStorage.getItem('panel_theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');

  function applyLang(l) {
    lang = l;
    document.documentElement.lang = l;
    document.documentElement.dir = l === 'fa' ? 'rtl' : 'ltr';
    var t = I18N[l] || I18N.fa;
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var k = el.getAttribute('data-i18n');
      if (t[k]) el.textContent = t[k];
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(function (el) {
      var k = el.getAttribute('data-i18n-ph');
      if (t[k]) el.setAttribute('placeholder', t[k]);
    });
    document.getElementById('lang-btn').textContent = l === 'fa' ? 'English' : 'فارسی';
  }
  function applyTheme(t) {
    theme = t;
    document.documentElement.setAttribute('data-theme', t);
    document.getElementById('theme-btn').textContent = t === 'dark' ? '☀️' : '🌙';
  }

  document.getElementById('lang-btn').addEventListener('click', function () {
    applyLang(lang === 'fa' ? 'en' : 'fa');
    localStorage.setItem('panel_lang', lang);
  });
  document.getElementById('theme-btn').addEventListener('click', function () {
    applyTheme(theme === 'dark' ? 'light' : 'dark');
    localStorage.setItem('panel_theme', theme);
  });
  document.getElementById('toggle-pass').addEventListener('click', function () {
    var input = document.getElementById('password');
    var show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    this.textContent = show ? '🙈' : '👁️';
  });

  applyLang(lang);
  applyTheme(theme);

  if (STATE.denied) {
    document.getElementById('denied-banner').classList.add('show');
    document.getElementById('install-form').style.display = 'none';
  }

  var form = document.getElementById('install-form');
  var errBox = document.getElementById('error');
  var submitBtn = document.getElementById('submit');

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var t = I18N[lang] || I18N.fa;
    errBox.classList.remove('show');
    var password = document.getElementById('password').value;
    var confirm = document.getElementById('confirm').value;

    if (password.length < 8) {
      errBox.textContent = t.weak;
      errBox.classList.add('show');
      return;
    }
    if (password !== confirm) {
      errBox.textContent = t.mismatch;
      errBox.classList.add('show');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = t.installing;

    var claim = new URLSearchParams(location.search).get('claim');
    fetch('install' + (claim ? '?claim=' + encodeURIComponent(claim) : ''), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: password, confirm: confirm }),
    })
      .then(function (res) { return res.json().then(function (d) { return { status: res.status, data: d }; }); })
      .then(function (r) {
        if (r.status === 200 && r.data.ok) {
          window.location.href = r.data.redirect || '';
          return;
        }
        var msg = t.network;
        if (r.status === 400 && r.data.error === 'weak_password') msg = t.weak;
        else if (r.status === 400 && r.data.error === 'mismatch') msg = t.mismatch;
        else if (r.status === 403) msg = t.badClaim;
        errBox.textContent = msg;
        errBox.classList.add('show');
      })
      .catch(function () {
        errBox.textContent = t.network;
        errBox.classList.add('show');
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = t.install;
      });
  });
})();
