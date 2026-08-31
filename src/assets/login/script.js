(function () {
  'use strict';
  var I18N = {
    fa: {
      title: 'قنات',
      subtitle: 'برای دسترسی به پنل، رمز عبور را وارد کنید',
      passwordLabel: 'رمز عبور',
      passwordPh: 'رمز عبور',
      enter: 'ورود به پنل',
      invalid: 'رمز عبور اشتباه است.',
      attemptsLeft: 'تلاش‌های باقی‌مانده:',
      locked: 'به دلیل تلاش‌های ناموفق، ورود موقتاً قفل شد.',
      retryIn: 'دوباره بعد از',
      seconds: 'ثانیه تلاش کنید',
      badRequest: 'درخواست نامعتبر است.',
      forbidden: 'درخواست رد شد.',
      notInstalled: 'پنل هنوز نصب نشده است.',
      network: 'خطا در برقراری ارتباط. دوباره تلاش کنید.',
      show: 'نمایش رمز',
      hide: 'پنهان‌کردن رمز',
    },
    en: {
      title: 'Qanat',
      subtitle: 'Enter your password to access the panel',
      passwordLabel: 'Password',
      passwordPh: 'Password',
      enter: 'Sign in',
      invalid: 'Invalid password.',
      attemptsLeft: 'Attempts left:',
      locked: 'Too many failed attempts. Login is temporarily locked.',
      retryIn: 'Try again in',
      seconds: 'seconds',
      badRequest: 'Invalid request.',
      forbidden: 'Request rejected.',
      notInstalled: 'Panel is not installed yet.',
      network: 'Connection error. Please try again.',
      show: 'Show password',
      hide: 'Hide password',
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
    document.getElementById('toggle-pass').setAttribute('aria-label', t.show);
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

  var form = document.getElementById('login-form');
  var errBox = document.getElementById('error');
  var submitBtn = document.getElementById('submit');
  var lockTimer = null;

  function showError(msg) {
    errBox.textContent = msg;
    errBox.classList.add('show');
  }
  function clearError() {
    errBox.textContent = '';
    errBox.classList.remove('show');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (lockTimer) return;
    clearError();
    var password = document.getElementById('password').value;
    submitBtn.disabled = true;
    submitBtn.textContent = '…';

    fetch('login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: password, next: window.__NEXT__ || null }),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { status: res.status, data: data };
        });
      })
      .then(function (r) {
        var t = I18N[lang] || I18N.fa;
        if (r.status === 200 && r.data.ok) {
          window.location.href = r.data.redirect || 'panel';
          return;
        }
        if (r.status === 429) {
          var sec = r.data.retryAfterSec || 60;
          showError(t.locked + ' ' + t.retryIn + ' ' + sec + ' ' + t.seconds + '.');
          lockTimer = setInterval(function () {
            sec--;
            showError(t.locked + ' ' + t.retryIn + ' ' + sec + ' ' + t.seconds + '.');
            if (sec <= 0) {
              clearInterval(lockTimer);
              lockTimer = null;
              clearError();
            }
          }, 1000);
        } else if (r.status === 401) {
          showError(t.invalid + (r.data.attemptsLeft != null ? ' (' + t.attemptsLeft + ' ' + r.data.attemptsLeft + ')' : ''));
        } else if (r.status === 403) {
          showError(t.forbidden);
        } else if (r.status === 400 && r.data.error === 'not_installed') {
          showError(t.notInstalled);
        } else {
          showError(t.network);
        }
      })
      .catch(function () {
        showError((I18N[lang] || I18N.fa).network);
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = (I18N[lang] || I18N.fa).enter;
      });
  });
})();
