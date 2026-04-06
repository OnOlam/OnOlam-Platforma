/**
 * OnOlam — register.html uchun JS
 */
document.addEventListener('DOMContentLoaded', () => {

  if (api.Token.isLoggedIn()) {
    window.location.href = 'dashboard.html';
    return;
  }

  // ── STEP 1: Shaxsiy ma'lumot ──
  let formData = {};

  window.validateStep1 = function() {
    const fields = {
      firstName: document.getElementById('firstName'),
      lastName:  document.getElementById('lastName'),
      email:     document.getElementById('email'),
      username:  document.getElementById('username'),
    };

    let ok = true;
    for (const [key, el] of Object.entries(fields)) {
      if (!el) continue;
      const val = el.value.trim();
      if (!val) {
        el.classList.add('err'); ok = false;
      } else if (key === 'email' && !val.includes('@')) {
        el.classList.add('err'); ok = false;
      } else if (key === 'username' && (val.length < 3 || /\s/.test(val))) {
        el.classList.add('err'); ok = false;
      } else {
        el.classList.remove('err');
        el.classList.add('valid');
      }
    }

    if (ok) {
      formData.first_name = fields.firstName.value.trim();
      formData.last_name  = fields.lastName.value.trim();
      formData.email      = fields.email.value.trim();
      formData.username   = fields.username.value.trim();

      // API da email/username mavjudligini tekshirish (keyinchalik)
      goToStep(2);
    }
  };

  // ── STEP 2: Parol ──
  window.validateStep2 = function() {
    const pass  = document.getElementById('password')?.value;
    const pass2 = document.getElementById('password2')?.value;

    if (!pass || pass.length < 8) {
      api.showToast('Parol kamida 8 ta belgi bo\'lishi kerak', 'error');
      return;
    }
    if (pass !== pass2) {
      api.showToast('Parollar mos kelmadi', 'error');
      document.getElementById('password2')?.classList.add('err');
      return;
    }

    formData.password = pass;
    goToStep(3);
  };

  // ── STEP 3: Tarif tanlash va ro'yxatdan o'tish ──
  window.submitRegister = async function() {
    const selectedPlan = document.querySelector('.plan-option.selected')?.dataset?.plan || 'free';
    const terms = document.getElementById('termsCheck')?.checked;

    if (!terms) {
      api.showToast('Shartlarga rozilik bildiring', 'warning');
      return;
    }

    const btn = document.getElementById('registerBtn');
    api.setLoading(btn, true);

    try {
      const data = await api.auth.register(
        formData.first_name,
        formData.last_name,
        formData.email,
        formData.username,
        formData.password
      );

      api.showToast('Tabriklaymiz! Ro\'yxatdan o\'tdingiz 🎉', 'success');

      // Pro tanlangan bo'lsa — to'lov sahifasiga
      setTimeout(() => {
        if (selectedPlan === 'pro') {
          window.location.href = 'pricing.html';
        } else {
          window.location.href = 'dashboard.html';
        }
      }, 1000);

    } catch (err) {
      api.setLoading(btn, false, 'Boshlash →');
      api.showError(err);
    }
  };

  // ── PAROL KUCHI ──
  document.getElementById('password')?.addEventListener('input', function() {
    const val    = this.value;
    const score  = [
      val.length >= 8,
      /[A-Z]/.test(val),
      /[0-9]/.test(val),
      /[^A-Za-z0-9]/.test(val),
    ].filter(Boolean).length;

    // Strength bar segmentlarini yangilash
    const segs = document.querySelectorAll('.strength-seg');
    const labels = ['', 'Zaif', 'O\'rtacha', 'Yaxshi', 'Kuchli'];
    const colors = ['', '#ff4757', '#ffd700', '#00b4ff', '#00ff41'];

    segs.forEach((seg, i) => {
      seg.style.background = i < score ? colors[score] : 'var(--surface-3, #163016)';
    });

    const label = document.getElementById('strengthLabel');
    if (label) {
      label.textContent = labels[score] || '';
      label.style.color = colors[score] || 'var(--text-3)';
    }
  });

  // ── STEP O'TISH ──
  window.goToStep = function(step) {
    document.querySelectorAll('.step-content').forEach((el, i) => {
      el.style.display = (i + 1 === step) ? 'block' : 'none';
    });

    // Progress bar
    document.querySelectorAll('.step-dot').forEach((dot, i) => {
      dot.classList.toggle('active',    i < step);
      dot.classList.toggle('complete',  i < step - 1);
    });

    // Progress line
    const pct = ((step - 1) / 2) * 100;
    const progressLine = document.getElementById('stepProgress');
    if (progressLine) progressLine.style.width = pct + '%';
  };

  // Plan tanlash
  document.querySelectorAll('.plan-option').forEach(card => {
    card.addEventListener('click', function() {
      document.querySelectorAll('.plan-option').forEach(c => c.classList.remove('selected'));
      this.classList.add('selected');
    });
  });
});
