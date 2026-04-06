/**
 * OnOlam — pricing.html uchun JS
 */
document.addEventListener('DOMContentLoaded', async () => {

  api.updateNavUser();

  // Allaqachon Pro bo'lsa — banner ko'rsatish
  if (api.Token.isPro()) {
    const banner = document.getElementById('alreadyProBanner');
    if (banner) banner.style.display = 'flex';
  }

  // URL da plan= bo'lsa avtomatik tanlash
  const plan = new URLSearchParams(window.location.search).get('plan');
  if (plan) selectPlan(plan);
});

// ── TO'LOV BOSHLASH ──
window.startPayment = async function(plan, method) {
  if (!api.Token.isLoggedIn()) {
    if (confirm('To\'lov uchun kirish kerak. Ro\'yxatdan o\'tasizmi?')) {
      location.href = `register.html?plan=${plan}`;
    }
    return;
  }

  const btn = document.getElementById(`payBtn-${plan}`);
  if (btn) api.setLoading(btn, true);

  // Kupon kodi
  const couponInput = document.getElementById('couponInput');
  const coupon      = couponInput?.value.trim() || '';

  try {
    const data = await api.payments.create(plan, method, coupon);

    // Checkout URL ga yo'naltirish
    if (data.checkout_url) {
      window.location.href = data.checkout_url;
    } else {
      api.showToast('To\'lov tizimiga ulanilmoqda...', 'info');
    }
  } catch (err) {
    if (btn) api.setLoading(btn, false, 'Pro boshlash →');
    api.showError(err);
  }
};

// ── KUPON TEKSHIRISH ──
window.checkCoupon = async function() {
  const input = document.getElementById('couponInput');
  const code  = input?.value.trim();
  if (!code) return;

  const btn = document.getElementById('couponBtn');
  api.setLoading(btn, true);

  try {
    const data = await api.payments.verifyCoupon(code);

    if (data.valid) {
      api.showToast(data.message, 'success');

      // Narxlarni yangilash
      const discount = data.discount / 100;
      updatePrices(discount);

      document.getElementById('couponResult')?.setAttribute('style',
        'display:flex;color:var(--neon);font-size:12px;gap:6px;'
      );
    } else {
      api.showToast(data.message, 'error');
    }
  } catch (err) {
    api.showError(err);
  } finally {
    api.setLoading(btn, false, 'Tekshirish');
  }
};

function updatePrices(discountRate) {
  const proPrice  = document.getElementById('proPrice');
  const origPrice = 9;
  if (proPrice) {
    proPrice.textContent = (origPrice * (1 - discountRate)).toFixed(2);
  }
}

// ── OYLIK/YILLIK TOGGLE (mavjud logikani saqlash) ──
// billing toggle funksiyasi pricing.html da qoladi
