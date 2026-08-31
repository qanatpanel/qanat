/**
 * بکگراند زندهٔ قنات — ذرات درخشان اقیانوسی (Canvas)
 * - ذرات شناور با سَری موجی + درخشش
 * - خطوط «صورت‌فلکی» بین ذرات نزدیک (بسیار ملایم)
 - هالهٔ نورانی دور موس + واکنش ذرات به موس
 * - رنگ‌ها از متغیرهای تم خوانده می‌شوند (با تغییر تم به‌روز می‌شود)
 * - موبایل/کاهش‌حرکت: تعداد ذرات محدود؛ prefers-reduced-motion → فریم ثابت
 * - بدون وابستگی؛ در همهٔ صفحات (لاگین/پنل/نصب) تزریق می‌شود
 */
(function () {
  if (window.__QANAT_BGFX__) return;
  window.__QANAT_BGFX__ = 1;
  try {
    var reduced =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var canvas = document.createElement('canvas');
    canvas.className = 'bg-canvas';
    canvas.id = 'bg-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);
    var vg = document.createElement('div');
    vg.className = 'bg-vignette';
    vg.setAttribute('aria-hidden', 'true');
    document.body.appendChild(vg);

    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var W = 0, H = 0, DPR = 1;
    var parts = [];
    var mouse = { x: -9999, y: -9999 };
    var palette = [[34, 211, 238], [45, 212, 191], [167, 139, 250]];
    var t = 0;
    var raf = null;

    function parseColor(str, fallback) {
      if (!str) return fallback;
      var m = str.match(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/);
      if (m) {
        var h = m[1].length === 3 ? m[1].split('').map(function (x) { return x + x; }).join('') : m[1];
        return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
      }
      var m2 = str.match(/rgba?\(([^)]+)\)/);
      if (m2) {
        var n = m2[1].split(',').map(function (x) { return parseInt(x, 10) || 0; });
        return [n[0], n[1], n[2]];
      }
      return fallback;
    }

    function themeColors() {
      var cs = getComputedStyle(document.documentElement);
      palette = [
        parseColor(cs.getPropertyValue('--accent'), [34, 211, 238]),
        parseColor(cs.getPropertyValue('--accent-2'), [45, 212, 191]),
        parseColor(cs.getPropertyValue('--accent-3'), [167, 139, 250]),
      ];
    }
    themeColors();
    if (typeof MutationObserver !== 'undefined') {
      new MutationObserver(themeColors).observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme'],
      });
    }

    function newParticle(anywhere) {
      var c = palette[(Math.random() * palette.length) | 0];
      return {
        x: Math.random() * W,
        y: anywhere ? Math.random() * H : H + 14,
        r: 0.6 + Math.random() * 1.8,
        vx: (Math.random() - 0.5) * 0.2,
        vy: -(0.14 + Math.random() * 0.38),
        ph: Math.random() * 6.2832,
        a: 0.14 + Math.random() * 0.42,
        tw: 0.002 + Math.random() * 0.009,
        col: c,
        glow: Math.random() < 0.16,
      };
    }

    function resize() {
      DPR = Math.min(window.devicePixelRatio || 1, 1.5);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = Math.round(W * DPR);
      canvas.height = Math.round(H * DPR);
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      var target = Math.min(110, Math.round((W * H) / 16000));
      if (parts.length < target) {
        while (parts.length < target) parts.push(newParticle(true));
      } else if (parts.length > target) {
        parts.length = target;
      }
    }

    function frame() {
      t += 0.016;
      ctx.clearRect(0, 0, W, H);
      var i, j, k;

      // خطوط صورت‌فلکی (حداکثر ۷۰ ذره برای هزینهٔ کم)
      var L = Math.min(parts.length, 70);
      ctx.lineWidth = 0.6;
      for (i = 0; i < L; i++) {
        var p = parts[i];
        for (j = i + 1; j < L; j++) {
          var q = parts[j];
          var dx = p.x - q.x, dy = p.y - q.y;
          var d2 = dx * dx + dy * dy;
          if (d2 < 12100) {
            var al = (1 - Math.sqrt(d2) / 110) * 0.1;
            ctx.strokeStyle = 'rgba(' + p.col[0] + ',' + p.col[1] + ',' + p.col[2] + ',' + al + ')';
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }
      }

      // ذرات
      for (k = 0; k < parts.length; k++) {
        var pt = parts[k];
        pt.ph += pt.tw;
        var sway = Math.sin(pt.ph) * 0.24;
        var mdx = pt.x - mouse.x, mdy = pt.y - mouse.y;
        var md2 = mdx * mdx + mdy * mdy;
        var mx = 0, my = 0;
        if (md2 < 25600) {
          var md = Math.sqrt(md2) || 1;
          var f = (1 - md / 160) * 0.55;
          mx = (mdx / md) * f;
          my = (mdy / md) * f;
        }
        pt.x += pt.vx + sway + mx;
        pt.y += pt.vy + my;
        if (pt.y < -14 || pt.x < -14 || pt.x > W + 14) {
          parts[k] = newParticle(false);
          continue;
        }
        var alpha = pt.a * (0.72 + 0.28 * Math.sin(t * 2 + pt.ph));
        if (pt.glow) {
          var g = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, pt.r * 7);
          g.addColorStop(0, 'rgba(' + pt.col[0] + ',' + pt.col[1] + ',' + pt.col[2] + ',' + (alpha * 0.5) + ')');
          g.addColorStop(1, 'rgba(' + pt.col[0] + ',' + pt.col[1] + ',' + pt.col[2] + ',0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pt.r * 7, 0, 6.2832);
          ctx.fill();
        }
        ctx.fillStyle = 'rgba(' + pt.col[0] + ',' + pt.col[1] + ',' + pt.col[2] + ',' + alpha + ')';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.r, 0, 6.2832);
        ctx.fill();
      }

      // هالهٔ موس
      if (mouse.x > -1000) {
        var mcol = palette[0];
        var cg = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 140);
        cg.addColorStop(0, 'rgba(' + mcol[0] + ',' + mcol[1] + ',' + mcol[2] + ',0.08)');
        cg.addColorStop(1, 'rgba(' + mcol[0] + ',' + mcol[1] + ',' + mcol[2] + ',0)');
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 140, 0, 6.2832);
        ctx.fill();
      }
    }

    function loop() {
      frame();
      raf = requestAnimationFrame(loop);
    }

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', function (e) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    });
    document.addEventListener('mouseleave', function () {
      mouse.x = -9999;
      mouse.y = -9999;
    });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        if (raf) cancelAnimationFrame(raf);
        raf = null;
      } else if (!reduced && !raf) {
        loop();
      }
    });

    resize();
    if (reduced) {
      frame();
    } else {
      loop();
    }
  } catch (e) {
    /* در صورت هر خطایی، بکگراند بدون افکت می‌ماند — صفحه هرگز نمی‌شکند */
  }
})();
