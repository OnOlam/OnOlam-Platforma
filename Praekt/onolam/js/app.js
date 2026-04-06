/* ================================================================
   OnOlam — Main JavaScript
   js/app.js — Barcha sahifalarga ulash
   ================================================================ */
(function () {
  'use strict';

  /* ────────────────────────────────────────
     1. BURGER MENU
  ──────────────────────────────────────── */
  const burgerBtn = document.getElementById('burgerBtn');
  const drawer    = document.getElementById('mobileDrawer');

  function openDrawer() {
    if (!burgerBtn || !drawer) return;
    burgerBtn.classList.add('open');
    drawer.classList.add('open');
    document.body.classList.add('no-scroll');
  }

  function closeDrawer() {
    if (!burgerBtn || !drawer) return;
    burgerBtn.classList.remove('open');
    drawer.classList.remove('open');
    document.body.classList.remove('no-scroll');
  }

  if (burgerBtn) {
    burgerBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      drawer.classList.contains('open') ? closeDrawer() : openDrawer();
    });
  }

  // Tashqariga bosish
  document.addEventListener('click', function (e) {
    if (drawer && drawer.classList.contains('open')) {
      if (!drawer.contains(e.target) && !burgerBtn.contains(e.target)) closeDrawer();
    }
  });

  // Drawer link bosilganda yopish
  if (drawer) {
    drawer.querySelectorAll('.drawer-link').forEach(function (l) {
      l.addEventListener('click', closeDrawer);
    });
  }

  // Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeDrawer();
  });

  // Ekran kengayganda yopish
  window.addEventListener('resize', function () {
    if (window.innerWidth > 900) closeDrawer();
  });

  /* ────────────────────────────────────────
     2. SCROLL REVEAL
  ──────────────────────────────────────── */
  var revealEls = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window && revealEls.length) {
    var revealObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    revealEls.forEach(function (el) { revealObs.observe(el); });
  } else {
    // Fallback: hamma narsani ko'rsatish
    revealEls.forEach(function (el) { el.classList.add('visible'); });
  }

  /* ────────────────────────────────────────
     3. TAB SWITCHING
  ──────────────────────────────────────── */
  document.querySelectorAll('[data-tab-group]').forEach(function (group) {
    var tabs    = group.querySelectorAll('[data-tab]');
    var panels  = group.querySelectorAll('[data-panel]');

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var target = tab.dataset.tab;

        tabs.forEach(function (t) { t.classList.remove('active'); });
        panels.forEach(function (p) { p.hidden = (p.dataset.panel !== target); });
        tab.classList.add('active');
      });
    });
  });

  /* ────────────────────────────────────────
     4. NAVBAR SCROLL EFFECT
  ──────────────────────────────────────── */
  var navbar = document.querySelector('.navbar');
  if (navbar) {
    window.addEventListener('scroll', function () {
      navbar.style.borderBottomColor = window.scrollY > 10
        ? 'var(--c-border-2)'
        : 'var(--c-border)';
    }, { passive: true });
  }

  /* ────────────────────────────────────────
     5. COUNTER ANIMATSIYA (landing statistika)
  ──────────────────────────────────────── */
  function animateCounter(el) {
    var target = parseInt(el.dataset.count, 10);
    var duration = 1600;
    var start = performance.now();

    function step(now) {
      var progress = Math.min((now - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
      el.textContent = Math.floor(eased * target).toLocaleString();
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  var counterEls = document.querySelectorAll('[data-count]');
  if ('IntersectionObserver' in window && counterEls.length) {
    var counterObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    counterEls.forEach(function (el) { counterObs.observe(el); });
  }

  /* ────────────────────────────────────────
     6. TOAST NOTIFICATION
  ──────────────────────────────────────── */
  window.showToast = function (msg, type) {
    type = type || 'info';
    var toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.textContent = msg;
    document.body.appendChild(toast);

    requestAnimationFrame(function () {
      toast.classList.add('toast-show');
      setTimeout(function () {
        toast.classList.remove('toast-show');
        setTimeout(function () { toast.remove(); }, 400);
      }, 3000);
    });
  };

  /* ────────────────────────────────────────
     7. COPY TO CLIPBOARD (kod editor)
  ──────────────────────────────────────── */
  document.querySelectorAll('.copy-code-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var target = document.querySelector(btn.dataset.target);
      if (!target) return;
      var text = target.tagName === 'TEXTAREA' ? target.value : target.textContent;
      navigator.clipboard.writeText(text).then(function () {
        var original = btn.textContent;
        btn.textContent = 'Nusxalandi ✓';
        setTimeout(function () { btn.textContent = original; }, 2000);
      });
    });
  });

  /* ────────────────────────────────────────
     8. KOD EDITOR — clear button
  ──────────────────────────────────────── */
  document.querySelectorAll('.clear-code-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var target = document.querySelector(btn.dataset.target);
      if (target) target.value = '';
    });
  });

  /* ────────────────────────────────────────
     9. SMOOTH ANCHOR SCROLL
  ──────────────────────────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href').slice(1);
      var el = document.getElementById(id);
      if (!el) return;
      e.preventDefault();
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

})();

/* ================================================================
   TOAST CSS (dinamik — JS bilan qo'shiladi)
   ================================================================ */
(function () {
  var style = document.createElement('style');
  style.textContent = `
    .toast {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      background: var(--c-surface-3);
      border: 1px solid var(--c-border-2);
      color: var(--c-text);
      font-family: 'Satoshi', sans-serif;
      font-size: 0.875rem;
      padding: 10px 20px;
      border-radius: var(--r-full);
      opacity: 0;
      transition: opacity 0.3s, transform 0.3s;
      z-index: 9999;
      pointer-events: none;
      white-space: nowrap;
    }
    .toast-show {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
    .toast-success { border-color: rgba(34,197,94,0.4); }
    .toast-error   { border-color: rgba(239,68,68,0.4); }
  `;
  document.head.appendChild(style);
})();
