/**
 * OnOlam — Admin Panel uchun API
 * admin/ papkasidagi barcha sahifalar uchun
 */

const ADMIN_API = window.OnOlam || window.api || (() => {
  // api.js yuklanmagan bo'lsa — qayta ulash
  const script = document.createElement('script');
  script.src   = '../js/api.js';
  document.head.appendChild(script);
})();

// Admin huquq tekshirish
document.addEventListener('DOMContentLoaded', async () => {
  if (!api.Token.isLoggedIn()) {
    location.href = 'index.html';
    return;
  }
  // Admin ekanligini tekshirish
  try {
    const user = await api.auth.profile();
    if (!user.is_staff && !user.is_superuser) {
      api.showToast('Admin huquqi yo\'q', 'error');
      setTimeout(() => location.href = '../index.html', 1500);
      return;
    }
    // Admin navbarda user ko'rsatish
    document.querySelectorAll('.ta-name').forEach(el => el.textContent = user.first_name || 'Admin');
  } catch {
    location.href = 'index.html';
  }
});

// ── ADMIN API ──
const adminApi = {

  // Foydalanuvchilar
  async users(params = {}) {
    const q = new URLSearchParams(params).toString();
    return api.auth.profile().then(() =>
      fetch(`${api.API_BASE}/auth/admin/users/${q ? '?' + q : ''}`, {
        headers: { 'Authorization': `Bearer ${api.Token.access}` }
      }).then(r => r.json())
    );
  },

  async blockUser(userId, reason) {
    return fetch(`${api.API_BASE}/auth/admin/users/${userId}/block/`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${api.Token.access}`,
      },
      body: JSON.stringify({ reason }),
    }).then(r => r.json());
  },

  async givePro(userId, days = 30) {
    return fetch(`${api.API_BASE}/auth/admin/users/${userId}/give-pro/`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${api.Token.access}`,
      },
      body: JSON.stringify({ days }),
    }).then(r => r.json());
  },

  // Analytics
  async dashboard() {
    return fetch(`${api.API_BASE}/analytics/dashboard/`, {
      headers: { 'Authorization': `Bearer ${api.Token.access}` }
    }).then(r => r.json());
  },

  async visitors(params = {}) {
    const q = new URLSearchParams(params).toString();
    return fetch(`${api.API_BASE}/analytics/visitors/${q ? '?' + q : ''}`, {
      headers: { 'Authorization': `Bearer ${api.Token.access}` }
    }).then(r => r.json());
  },

  async realtime() {
    return fetch(`${api.API_BASE}/analytics/realtime/`, {
      headers: { 'Authorization': `Bearer ${api.Token.access}` }
    }).then(r => r.json());
  },

  async securityEvents() {
    return fetch(`${api.API_BASE}/analytics/security/`, {
      headers: { 'Authorization': `Bearer ${api.Token.access}` }
    }).then(r => r.json());
  },

  // To'lovlar
  async payments() {
    return fetch(`${api.API_BASE}/payments/admin/list/`, {
      headers: { 'Authorization': `Bearer ${api.Token.access}` }
    }).then(r => r.json());
  },

  async refund(paymentId, reason) {
    return fetch(`${api.API_BASE}/payments/admin/${paymentId}/refund/`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${api.Token.access}`,
      },
      body: JSON.stringify({ reason }),
    }).then(r => r.json());
  },

  // AI
  async kbList() {
    return fetch(`${api.API_BASE}/ai/admin/kb/`, {
      headers: { 'Authorization': `Bearer ${api.Token.access}` }
    }).then(r => r.json());
  },

  async kbCreate(data) {
    return fetch(`${api.API_BASE}/ai/admin/kb/create/`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${api.Token.access}`,
      },
      body: JSON.stringify(data),
    }).then(r => r.json());
  },

  async unanswered() {
    return fetch(`${api.API_BASE}/ai/admin/unanswered/`, {
      headers: { 'Authorization': `Bearer ${api.Token.access}` }
    }).then(r => r.json());
  },
};

// Global
window.adminApi = adminApi;
