let formData = {};
let selectedPlan = 'free';

document.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('onolam_access')) {
    window.location.href = 'dashboard.html';
    return;
  }
});

window.goStep = function(step) {
  if (step === 2) {
    const firstName = document.getElementById('regFirst')?.value.trim();
    const lastName  = document.getElementById('regLast')?.value.trim();
    const email     = document.getElementById('regEmail')?.value.trim();
    const username  = document.getElementById('regUser')?.value.trim();

    if (!firstName) { alert('Ism kiriting!'); return; }
    if (!lastName)  { alert('Familiya kiriting!'); return; }
    if (!email || !email.includes('@') || !email.includes('.')) {
      alert('Haqiqiy email kiriting! (masalan: user@gmail.com)'); return;
    }
    if (!username || username.length < 3) {
      alert('Username kamida 3 ta belgi bolishi kerak!'); return;
    }
    if (/\s/.test(username)) {
      alert('Username da bosh joy bolmasligi kerak!'); return;
    }

    formData.first_name = firstName;
    formData.last_name  = lastName;
    formData.email      = email;
    formData.username   = username;
  }

  if (step === 3) {
    const pass  = document.getElementById('regPass')?.value;
    const pass2 = document.getElementById('regPass2')?.value;
    const phone = document.getElementById('regPhone')?.value.trim();

    if (!pass || pass.length < 8) {
      alert('Parol kamida 8 ta belgi bolishi kerak!'); return;
    }
    if (pass !== pass2) {
      alert('Parollar mos kelmadi!'); return;
    }
    if (phone && phone.length > 0) {
      const clean = phone.replace(/[\s\-\(\)]/g, '');
      if (!/^\+998\d{9}$/.test(clean)) {
        alert('Telefon notogri! Format: +998901234567'); return;
      }
      formData.phone = clean;
    }
    formData.password = pass;
  }

  [1, 2, 3].forEach(i => {
    const stepEl = document.getElementById('step' + i);
    const dotEl  = document.getElementById('s' + i);
    if (stepEl) stepEl.style.display = (i === step) ? 'block' : 'none';
    if (dotEl) {
      dotEl.className = 'step' + (i < step ? ' done' : i === step ? ' active' : '');
    }
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.selectPlan = function(plan) {
  selectedPlan = plan;
  document.getElementById('planFree').className = plan === 'free' ? 'plan-row highlight' : 'plan-row';
  document.getElementById('planPro').className  = plan === 'pro'  ? 'plan-row highlight' : 'plan-row';
};

window.handleRegister = async function() {
  const terms = document.getElementById('termsCheck')?.checked;
  if (!terms) { alert('Shartlarga rozilik bildiring!'); return; }

  if (!formData.email || !formData.username || !formData.password) {
    alert('Iltimos barcha bosqichlarni toldirib chiqing!');
    window.goStep(1);
    return;
  }

  const btn = document.getElementById('regBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Yuklanmoqda...'; }

  try {
    const res = await fetch('https://onolam-platforma.onrender.com/api/v1/auth/register/', {
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
      localStorage.setItem('onolam_access',  data.tokens.access);
      localStorage.setItem('onolam_refresh', data.tokens.refresh);
      localStorage.setItem('onolam_user',    JSON.stringify(data.user));

      alert('Tabriklaymiz! Royxatdan otdingiz! 🎉');
      setTimeout(() => {
        window.location.href = selectedPlan === 'pro' ? 'pricing.html' : 'dashboard.html';
      }, 500);

    } else {
      const msg = data.email?.[0]
        || data.username?.[0]
        || data.password?.[0]
        || data.error
        || 'Xatolik yuz berdi';
      alert(msg);
      if (btn) { btn.disabled = false; btn.textContent = 'Hisob yaratish →'; }
    }

  } catch(e) {
    alert('Server bilan boglanib bolmadi!');
    if (btn) { btn.disabled = false; btn.textContent = 'Hisob yaratish →'; }
  }
};
