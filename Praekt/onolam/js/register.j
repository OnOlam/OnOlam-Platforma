let formData = {};
let selectedPlan = 'free';

document.addEventListener('DOMContentLoaded', () => {
  // Allaqachon kirgan bo'lsa
  if (localStorage.getItem('onolam_access')) {
    window.location.href = 'dashboard.html';
    return;
  }
});

// ── STEP O'TISH ──
window.goStep = function(step) {

  // Step 2 ga o'tishda — Step 1 validatsiya
  if (step === 2) {
    const firstName = document.getElementById('regFirst')?.value.trim();
    const email     = document.getElementById('regEmail')?.value.trim();
    const username  = document.getElementById('regUser')?.value.trim();

    if (!firstName) {
      alert('Ism kiriting!'); return;
    }
    if (!email || !email.includes('@') || !email.includes('.')) {
      alert('Haqiqiy email kiriting! (masalan: user@gmail.com)'); return;
    }
    if (!username || username.length < 3) {
      alert('Username kamida 3 ta belgi bo\'lishi kerak!'); return;
    }
    if (/\s/.test(username)) {
      alert('Username da bo\'sh joy bo\'lmasligi kerak!'); return;
    }

    formData.first_name = firstName;
    formData.last_name  = document.getElementById('regLast')?.value.trim() || '';
    formData.email      = email;
    formData.username   = username;
  }

  // Step 3 ga o'tishda — Step 2 validatsiya
  if (step === 3) {
    const pass  = document.getElementById('regPass')?.value;
    const pass2 = document.getElementById('regPass2')?.value;
    const phone = document.getElementById('regPhone')?.value.trim();

    if (!pass || pass.length < 8) {
      alert('Parol kamida 8 ta belgi bo\'lishi kerak!'); return;
    }
    if (pass !== pass2) {
      alert('Parollar mos kelmadi!'); return;
    }

    // Telefon ixtiyoriy — kiritilsa tekshirish
    if (phone && phone.length > 0) {
      const clean = phone.replace(/[\s\-\(\)]/g, '');
      if (!/^\+998\d{9}$/.test(clean)) {
        alert('Telefon noto\'g\'ri! Format: +998901234567'); return;
      }
      formData.phone = clean;
    }

    formData.password = pass;
  }

  // Steplarni ko'rsatish/yashirish
  document.querySelectorAll('.step-content, .reg-step').forEach((el, i) => {
    el.style.display = (i + 1 === step) ? 'block' : 'none';
  });

  // Progress
  const line = document.getElementById('stepProgress');
  if (line) line.style.width = ((step - 1) / 2 * 100) + '%';

  // Dots
  document.querySelectorAll('.step-dot, .sdot').forEach((dot, i) => {
    dot.classList.toggle('active',   i < step);
    dot.classList.toggle('complete', i < step - 1);
  });
};

// ── PLAN TANLASH ──
window.selectPlan = function(plan) {
  selectedPlan = plan;
  document.querySelectorAll('.plan-row').forEach(el => el.classList.remove('highlight'));
  const el = document.getElementById('plan' + plan.charAt(0).toUpperCase() + plan.slice(1));
  if (el) el.classList.add('highlight');
};

// ── RO'YXATDAN O'TISH ──
window.handleRegister = async function() {
  const terms = document.getElementById('termsCheck')?.checked;
  if (!terms) {
    alert('Shartlarga rozilik bildiring!'); return;
  }

  // Ma'lumotlar to'liqligini tekshirish
  if (!formData.email || !formData.username || !formData.password) {
    alert('Iltimos, barcha bosqichlarni to\'ldiring!');
    goStep(1);
    return;
  }

  const btn = document.getElementById('regBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Yuklanmoqda...'; }

  try {
    const res = await fetch(''https://onolam-platforma.onrender.com/api/v1/auth/register/', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        first_name: formData.first_name || '',
        last_name:  formData.last_name  || '',
        email:      formData.email,
        username:   formData.username,
        password:   formData.password,
        password2:  formData.password,
        phone:      formData.phone || '',
      })
    });

    const data = await res.json();

    if (res.ok) {
      // Token saqlash
      localStorage.setItem('onolam_access',  data.tokens.access);
      localStorage.setItem('onolam_refresh', data.tokens.refresh);
      localStorage.setItem('onolam_user',    JSON.stringify(data.user));

      alert('Tabriklaymiz! Ro\'yxatdan o\'tdingiz! 🎉');

      setTimeout(() => {
        window.location.href = selectedPlan === 'pro' ? 'pricing.html' : 'dashboard.html';
      }, 500);

    } else {
      const msg = data.email?.[0]
        || data.username?.[0]
        || data.password?.[0]
        || data.non_field_errors?.[0]
        || data.error
        || 'Xatolik yuz berdi';
      alert(msg);
      if (btn) { btn.disabled = false; btn.textContent = 'Hisob yaratish →'; }
    }

  } catch(e) {
    alert('Server bilan bog\'lanib bo\'lmadi!');
    if (btn) { btn.disabled = false; btn.textContent = 'Hisob yaratish →'; }
  }
};
