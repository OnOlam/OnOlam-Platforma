document.addEventListener('DOMContentLoaded', () => {

  if (localStorage.getItem('onolam_access')) {
    window.location.href = 'dashboard.html';
    return;
  }

  window.handleLogin = async function() {
    const email    = document.getElementById('loginEmail')?.value.trim();
    const password = document.getElementById('loginPass')?.value;
    const btn      = document.getElementById('loginBtn');

    if (!email || !password) {
      alert('Email va parol kiriting!');
      return;
    }

    btn.textContent = 'Kirilmoqda...';
    btn.disabled = true;

    try {
      const response = await fetch('https://onolam-platforma.onrender.com/api/v1/auth/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('onolam_access',  data.tokens.access);
        localStorage.setItem('onolam_refresh', data.tokens.refresh);
        localStorage.setItem('onolam_user',    JSON.stringify(data.user));

        btn.textContent = '✔ Xush kelibsiz!';
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 800);

      } else {
        btn.textContent = 'Kirish →';
        btn.disabled = false;
        alert(data.error || 'Email yoki parol noto\'g\'ri');
      }

    } catch (e) {
      btn.textContent = 'Kirish →';
      btn.disabled = false;
      alert('Server bilan bog\'lanib bo\'lmadi. Backend ishlamoqdami?');
    }
  };

  document.addEventListener('keydown', e => {
    if (e.key === 'Enter') window.handleLogin();
  });
});
