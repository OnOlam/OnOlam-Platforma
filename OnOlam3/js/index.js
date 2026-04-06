/**
 * OnOlam — index.html (landing) uchun JS
 */
document.addEventListener('DOMContentLoaded', () => {
  // Kirgan foydalanuvchi uchun navbar o'zgartirish
  if (api.Token.isLoggedIn()) {
    // Login/Register tugmalarini yashirish
    document.querySelectorAll('.navbar-right .btn-ghost').forEach(btn => {
      if (btn.textContent.includes('Kirish')) btn.parentElement?.remove();
    });

    // Dashboard tugmasi ko'rsatish
    const navRight = document.querySelector('.navbar-right');
    if (navRight) {
      const dashLink = document.createElement('a');
      dashLink.href = 'dashboard.html';
      dashLink.innerHTML = '<button class="btn btn-neon btn-sm">Dashboard →</button>';
      navRight.prepend(dashLink);
    }

    api.updateNavUser();
  }
});
