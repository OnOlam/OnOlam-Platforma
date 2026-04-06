/**
 * OnOlam — login.html uchun JS
 */
document.addEventListener('DOMContentLoaded', () => {

  // Allaqachon kirgan bo'lsa — dashboard ga
  if (api.Token.isLoggedIn()) {
    window.location.href = 'dashboard.html';
    return;
  }

  const emailInput = document.getElementById('loginEmail');
  const passInput  = document.getElementById('loginPass');
  const loginBtn   = document.getElementById('loginBtn');

  // ── KIRISH ──
  async function handleLogin() {
    const email    = emailInput?.value.trim();
    const password = passInput?.value;

    // Validatsiya
    let hasError = false;
    if (!email) { emailInput?.classList.add('err'); hasError = true; }
    else emailInput?.classList.remove('err');

    if (!password) { passInput?.classList.add('err'); hasError = true; }
    else passInput?.classList.remove('err');

    if (hasError) return;

    // Loading
    if (loginBtn) api.setLoading(loginBtn, true);

    try {
      await api.auth.login(email, password);

      if (loginBtn) {
        loginBtn.textContent = '✔ Xush kelibsiz!';
        loginBtn.style.background = 'rgba(0,255,65,.2)';
      }

      setTimeout(() => location.href = 'dashboard.html', 800);

    } catch (err) {
      if (loginBtn) api.setLoading(loginBtn, false, 'Kirish →');

      const msg = err?.data?.error || 'Email yoki parol noto\'g\'ri';
      api.showToast(msg, 'error');

      emailInput?.classList.add('err');
      passInput?.classList.add('err');
      setTimeout(() => {
        emailInput?.classList.remove('err');
        passInput?.classList.remove('err');
      }, 3000);
    }
  }

  // loginBtn onclick mavjud bo'lsa ham, qo'shimcha listener
  loginBtn?.addEventListener('click', (e) => {
    // HTML da onclick="handleLogin()" bor — override
    e.preventDefault(); e.stopPropagation();
    handleLogin();
  });

  // Enter
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.ctrlKey) handleLogin();
  });

  // Real-time validatsiya
  emailInput?.addEventListener('input', () => {
    const ok = emailInput.value.includes('@') || emailInput.value.length > 3;
    emailInput.classList.toggle('valid', ok);
    emailInput.classList.toggle('err', !ok && emailInput.value.length > 2);
  });

  passInput?.addEventListener('input', () => {
    const ok = passInput.value.length >= 1;
    passInput.classList.toggle('valid', ok);
    passInput.classList.remove('err');
  });

  // login.html dagi handleLogin() ni override qilish
  window.handleLogin = handleLogin;
});
