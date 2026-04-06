/**
 * OnOlam — API Client
 * Barcha sahifalarda ishlatiladigan umumiy API kutubxona
 * 
 * Ishlatish:
 *   import { api, auth } from './api.js'  — yoki
 *   <script src="js/api.js"></script>     — global window.api
 */

// ── SOZLAMA ──────────────────────────────────────────────
const API_BASE = 'http://127.0.0.1:8000/api/v1';
// Production da:
// const API_BASE = 'https://api.onolam.uz/api/v1';

// ── TOKEN BOSHQARUVI ─────────────────────────────────────
const Token = {
  get access()  { return localStorage.getItem('onolam_access'); },
  get refresh() { return localStorage.getItem('onolam_refresh'); },
  get user()    {
    try { return JSON.parse(localStorage.getItem('onolam_user') || 'null'); }
    catch { return null; }
  },

  set(accessToken, refreshToken, user) {
    localStorage.setItem('onolam_access',  accessToken);
    localStorage.setItem('onolam_refresh', refreshToken);
    if (user) localStorage.setItem('onolam_user', JSON.stringify(user));
  },

  clear() {
    localStorage.removeItem('onolam_access');
    localStorage.removeItem('onolam_refresh');
    localStorage.removeItem('onolam_user');
  },

  isLoggedIn() { return !!this.access; },

  isPro() {
    const user = this.user;
    return user?.is_pro === true || user?.plan === 'pro';
  },
};

// ── ASOSIY FETCH FUNKSIYA ─────────────────────────────────
async function request(method, endpoint, data = null, auth = true) {
  const headers = { 'Content-Type': 'application/json' };

  if (auth && Token.access) {
    headers['Authorization'] = `Bearer ${Token.access}`;
  }

  const config = { method, headers };
  if (data) config.body = JSON.stringify(data);

  let response = await fetch(`${API_BASE}${endpoint}`, config);

  // Token muddati tugagan — yangilash
  if (response.status === 401 && Token.refresh) {
    const refreshed = await _refreshToken();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${Token.access}`;
      response = await fetch(`${API_BASE}${endpoint}`, { method, headers, body: config.body });
    } else {
      // Refresh ham o'lik — chiqish
      Token.clear();
      window.location.href = '/login.html';
      return;
    }
  }

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw { status: response.status, data: json };
  }

  return json;
}

// ── TOKEN YANGILASH ───────────────────────────────────────
async function _refreshToken() {
  try {
    const res = await fetch(`${API_BASE}/auth/token/refresh/`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ refresh: Token.refresh }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    localStorage.setItem('onolam_access', data.access);
    return true;
  } catch {
    return false;
  }
}

// ── API MODULLARI ─────────────────────────────────────────

/** Auth */
const auth = {
  async register(first_name, last_name, email, username, password) {
    const data = await request('POST', '/auth/register/', {
      first_name, last_name, email, username,
      password, password2: password,
    }, false);
    Token.set(data.tokens.access, data.tokens.refresh, data.user);
    return data;
  },

  async login(email, password) {
    const data = await request('POST', '/auth/login/', { email, password }, false);
    Token.set(data.tokens.access, data.tokens.refresh, data.user);
    return data;
  },

  async logout() {
    try {
      await request('POST', '/auth/logout/', { refresh_token: Token.refresh });
    } finally {
      Token.clear();
      window.location.href = '/login.html';
    }
  },

  async profile() {
    return request('GET', '/auth/profile/');
  },

  async updateProfile(data) {
    return request('PATCH', '/auth/profile/', data);
  },

  async changePassword(old_password, new_password) {
    return request('POST', '/auth/change-password/', { old_password, new_password });
  },

  isLoggedIn: () => Token.isLoggedIn(),
  isPro:      () => Token.isPro(),
  user:       () => Token.user,
};

/** Kurslar */
const courses = {
  async list(params = {}) {
    const q = new URLSearchParams(params).toString();
    return request('GET', `/courses/${q ? '?' + q : ''}`, null, false);
  },

  async detail(slug) {
    return request('GET', `/courses/${slug}/`);
  },

  async enroll(slug) {
    return request('POST', `/courses/${slug}/enroll/`);
  },

  async lesson(id) {
    return request('GET', `/courses/lessons/${id}/`);
  },

  async completeLesson(id, quiz_answer_id = null) {
    return request('POST', `/courses/lessons/${id}/complete/`, { quiz_answer_id });
  },

  async updateVideoProgress(id, watched_seconds) {
    return request('PATCH', `/courses/lessons/${id}/progress/`, { watched_seconds });
  },

  async categories() {
    return request('GET', '/courses/categories/', null, false);
  },
};

/** To'lovlar */
const payments = {
  async create(plan, method, coupon = '') {
    return request('POST', '/payments/create/', { plan, method, coupon });
  },

  async verifyCoupon(code) {
    return request('POST', '/payments/verify/', { code }, false);
  },

  async history() {
    return request('GET', '/payments/history/');
  },

  async subscription() {
    return request('GET', '/payments/subscription/');
  },
};

/** Sertifikatlar */
const certificates = {
  async list() {
    return request('GET', '/certificates/');
  },

  async verify(cert_id) {
    return request('GET', `/certificates/verify/${cert_id}/`, null, false);
  },

  pdfUrl(cert_id) {
    return `${API_BASE}/certificates/${cert_id}/pdf/`;
  },
};

/** AI Chat */
const aiChat = {
  async send(message, lesson_id = null) {
    return request('POST', '/ai/chat/', { message, lesson_id });
  },

  async sessions() {
    return request('GET', '/ai/sessions/');
  },
};

// ── YORDAMCHI FUNKSIYALAR ─────────────────────────────────

/**
 * Sahifa himoyasi — login bo'lmasa yo'naltirish
 * Himoyalangan sahifa boshida chaqiring
 */
function requireLogin(redirectTo = '/login.html') {
  if (!Token.isLoggedIn()) {
    window.location.href = redirectTo;
    return false;
  }
  return true;
}

/**
 * Pro talab qiluvchi funksiya
 * Pro bo'lmasa pricing.html ga yo'naltiradi
 */
function requirePro(redirectTo = '/pricing.html') {
  if (!Token.isPro()) {
    window.location.href = redirectTo;
    return false;
  }
  return true;
}

/**
 * Navbar va sidebar dagi user ma'lumotlarini yangilash
 */
function updateNavUser() {
  const user = Token.user;
  if (!user) return;

  // Avatar
  document.querySelectorAll('.navbar-avatar img, .sidebar-user img, .drawer-user img').forEach(img => {
    if (img) img.src = user.avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${user.username}`;
  });

  // Ism
  document.querySelectorAll('.drawer-user-info h4').forEach(el => {
    if (el) el.textContent = user.first_name || user.username;
  });

  // Badge
  document.querySelectorAll('.badge-free, .badge-pro').forEach(el => {
    if (!el) return;
    el.className = user.is_pro ? 'badge badge-pro' : 'badge badge-free';
    el.textContent = user.is_pro ? 'Pro' : 'Free';
  });

  // Sidebar user info
  document.querySelectorAll('.sidebar-user-info h5').forEach(el => {
    if (el) el.textContent = `${user.first_name} ${user.last_name || ''}`.trim();
  });

  document.querySelectorAll('.sidebar-user-info p').forEach(el => {
    if (el) el.textContent = user.is_pro ? 'Pro foydalanuvchi' : 'Free foydalanuvchi';
  });
}

/**
 * Toast xabar ko'rsatish
 */
function showToast(message, type = 'success') {
  const icons = { success: '✔', error: '✗', warning: '⚠', info: 'ℹ' };
  const colors = {
    success: 'rgba(0,255,65,.3)',
    error:   'rgba(255,71,87,.3)',
    warning: 'rgba(255,215,0,.3)',
    info:    'rgba(0,180,255,.3)',
  };

  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed; bottom: 24px; right: 24px; z-index: 9999;
    background: var(--surface-2, #112411); border: 1px solid ${colors[type]};
    border-radius: 10px; padding: 12px 18px; font-family: 'JetBrains Mono', monospace;
    font-size: 13px; color: #e8ffe8; display: flex; align-items: center;
    gap: 10px; box-shadow: 0 8px 32px rgba(0,0,0,.5);
    animation: slideIn .3s ease; max-width: 320px;
  `;
  toast.innerHTML = `<span>${icons[type]}</span> ${message}`;
  document.body.appendChild(toast);

  if (!document.getElementById('toast-style')) {
    const style = document.createElement('style');
    style.id = 'toast-style';
    style.textContent = '@keyframes slideIn{from{transform:translateX(20px);opacity:0}to{transform:translateX(0);opacity:1}}';
    document.head.appendChild(style);
  }

  setTimeout(() => {
    toast.style.transition = '.3s';
    toast.style.opacity    = '0';
    toast.style.transform  = 'translateX(20px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

/**
 * Xato xabarini chiqarish
 */
function showError(err) {
  const msg = err?.data?.error
    || err?.data?.detail
    || Object.values(err?.data || {})[0]?.[0]
    || 'Xatolik yuz berdi';
  showToast(Array.isArray(msg) ? msg[0] : msg, 'error');
}

/**
 * Loading tugmasi holati
 */
function setLoading(btn, loading, originalText) {
  if (loading) {
    btn.disabled       = true;
    btn.dataset.orig   = btn.textContent;
    btn.innerHTML      = originalText || '<span style="display:inline-block;width:14px;height:14px;border:2px solid transparent;border-top-color:currentColor;border-radius:50%;animation:spin .7s linear infinite;vertical-align:middle"></span> Yuklanmoqda...';
    if (!document.getElementById('spin-style')) {
      const s = document.createElement('style');
      s.id = 'spin-style';
      s.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
      document.head.appendChild(s);
    }
  } else {
    btn.disabled     = false;
    btn.textContent  = btn.dataset.orig || originalText;
  }
}

// ── GLOBAL EXPORT ─────────────────────────────────────────
window.OnOlam = {
  API_BASE, Token,
  auth, courses, payments, certificates, aiChat,
  requireLogin, requirePro,
  updateNavUser, showToast, showError, setLoading,
};

// Qisqa alias
window.api = window.OnOlam;

// Chiqish — barcha sahifalarda ishlaydi
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.exit, [data-logout]').forEach(el => {
    el.addEventListener('click', async e => {
      e.preventDefault();
      if (confirm('Chiqishni xohlaysizmi?')) {
        const token   = localStorage.getItem('onolam_access');
        const refresh = localStorage.getItem('onolam_refresh');
        if (token) {
          try {
            await fetch('http://127.0.0.1:8000/api/v1/auth/logout/', {
              method:  'POST',
              headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
              body:    JSON.stringify({ refresh_token: refresh || '' })
            });
          } catch(e) {}
        }
        localStorage.clear();
        window.location.href = 'login.html';
      }
    });
  });

  // Navbar da user ismini ko'rsatish
  const userData = localStorage.getItem('onolam_user');
  if (userData) {
    try {
      const user = JSON.parse(userData);
      document.querySelectorAll('.drawer-user-info h4').forEach(el => el.textContent = user.first_name);
      document.querySelectorAll('.sidebar-user-info h5').forEach(el => {
        el.textContent = user.first_name + ' ' + (user.last_name?.[0] || '') + '.';
      });
      document.querySelectorAll('.navbar-avatar img, .sidebar-user img, .drawer-user img').forEach(img => {
        img.src = user.avatar || 'https://api.dicebear.com/7.x/pixel-art/svg?seed=' + user.username;
      });
      document.querySelectorAll('.badge-free, .badge-pro').forEach(el => {
        el.className  = 'badge ' + (user.is_pro ? 'badge-pro' : 'badge-free');
        el.textContent = user.is_pro ? 'Pro' : 'Free';
      });
    } catch(e) {}
  }
});

// Har sahifa yuklananda profil yangilash
async function refreshUserProfile() {
  const token = localStorage.getItem('onolam_access');
  if (!token) return;
  try {
    const res = await fetch('http://127.0.0.1:8000/api/v1/auth/profile/', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (res.ok) {
      const user = await res.json();
      localStorage.setItem('onolam_user', JSON.stringify(user));
      return user;
    }
  } catch(e) {}
}

// Sahifa yuklananda chaqirish
refreshUserProfile();
