document.addEventListener('DOMContentLoaded', () => {
  // Token yo'q bo'lsa login ga
  const token = localStorage.getItem('onolam_access');
  const user  = JSON.parse(localStorage.getItem('onolam_user') || '{}');

  // Pro bo'lsa banner ko'rsat
  if (user.is_pro) {
    document.querySelectorAll('.pro-upgrade-banner, #alreadyProBanner').forEach(el => {
      if (el) el.style.display = 'flex';
    });
    // Pro tugmasini o'zgartirish
    const proBtn = document.getElementById('payBtn-pro');
    if (proBtn) {
      proBtn.textContent = '✔ Siz Pro foydalanuvchisiz!';
      proBtn.disabled    = true;
      proBtn.style.background = 'rgba(0,255,65,.2)';
    }
  }

  // Oylik/Yillik toggle
  let isYearly = false;
  window.toggleBilling = function() {
    isYearly = !isYearly;
    const sw     = document.getElementById('btSwitch');
    const mLabel = document.getElementById('monthLabel');
    const yLabel = document.getElementById('yearLabel');
    const badge  = document.getElementById('saveBadge');

    if (sw)     sw.classList.toggle('yearly', isYearly);
    if (mLabel) mLabel.classList.toggle('active', !isYearly);
    if (yLabel) yLabel.classList.toggle('active',  isYearly);
    if (badge)  badge.style.opacity = isYearly ? '1' : '.4';

    const proAmount  = document.getElementById('proAmount');
    const teamAmount = document.getElementById('teamAmount');
    const proOrig    = document.getElementById('proOriginal');

    if (proAmount)  proAmount.textContent  = isYearly ? '6' : '9';
    if (teamAmount) teamAmount.textContent = isYearly ? '4' : '6';
    if (proOrig)    proOrig.style.display  = isYearly ? 'inline' : 'none';
  };
});

// To'lov boshlash
window.startPayment = async function(plan, method) {
  const token = localStorage.getItem('onolam_access');

  // Login bo'lmasa
  if (!token) {
    if (confirm('To\'lov uchun avval tizimga kirish kerak. Kirish sahifasiga o\'tasizmi?')) {
      localStorage.setItem('redirect_after_login', 'pricing.html');
      window.location.href = 'login.html';
    }
    return;
  }

  // Free plan
  if (plan === 'free') {
    window.location.href = 'dashboard.html';
    return;
  }

  // Pro plan
  const user = JSON.parse(localStorage.getItem('onolam_user') || '{}');
  if (user.is_pro) {
    alert('Siz allaqachon Pro foydalanuvchisiz! ✔');
    return;
  }

  const btn    = document.getElementById('payBtn-' + plan);
  const coupon = document.getElementById('couponInput')?.value.trim() || '';

  if (btn) { btn.disabled = true; btn.textContent = 'Yuklanmoqda...'; }

  try {
    const res  = await fetch('https://onolam-platforma.onrender.com/api/v1/payments/create/', {
      method:  'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type':  'application/json'
      },
      body: JSON.stringify({ plan, method, coupon })
    });

    const data = await res.json();

    if (res.ok) {
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else if (data.success || data.demo) {
        // Pro faollashdi — localStorage yangilash
        const profileRes = await fetch('http://127.0.0.1:8000/api/v1/auth/profile/', {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        if (profileRes.ok) {
          const user = await profileRes.json();
          localStorage.setItem('onolam_user', JSON.stringify(user));
        }

        alert('🎉 ' + (data.message || 'Pro tarif faollashtirildi!'));
        setTimeout(() => { window.location.href = 'dashboard.html'; }, 500);
      }
    }

  } catch(e) {
    // Server xatosi — demo rejimda ishlash
    alert(
      'To\'lov tizimi hozircha ulanmagan.\n\n' +
      'Pro versiyani sinab ko\'rish uchun:\n' +
      'admin@onolam.uz ga yozing yoki admin paneldan so\'rang.'
    );
    if (btn) { btn.disabled = false; btn.textContent = 'Pro boshlash →'; }
  }
};

// Kupon tekshirish
window.checkCoupon = async function() {
  const code = document.getElementById('couponInput')?.value.trim();
  if (!code) { alert('Kupon kodi kiriting!'); return; }

  const btn = document.getElementById('couponBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Tekshirilmoqda...'; }

  try {
    const res  = await fetch('http://127.0.0.1:8000/api/v1/payments/verify/', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ code })
    });
    const data = await res.json();

    if (data.valid) {
      alert('✔ ' + data.message);
      const discount  = 1 - (data.discount / 100);
      const proAmount = document.getElementById('proAmount');
      if (proAmount) proAmount.textContent = (9 * discount).toFixed(2);
    } else {
      alert('✗ ' + (data.message || 'Kupon yaroqsiz'));
    }
  } catch(e) {
    alert('Tekshirib bo\'lmadi');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Tekshirish'; }
  }
};

// FAQ accordion
window.toggleFAQ = function(header) {
  const item   = header.parentElement;
  const isOpen = item.classList.contains('open');
  document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
  if (!isOpen) item.classList.add('open');
};
