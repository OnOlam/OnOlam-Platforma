document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('onolam_access');
  if (!token) { window.location.href = 'login.html'; return; }

  try {
    const res  = await fetch('http://127.0.0.1:8000/api/v1/auth/profile/', {
      headers: { 'Authorization': 'Bearer ' + token }
    });

    if (!res.ok) {
      localStorage.clear();
      window.location.href = 'login.html';
      return;
    }

    const user = await res.json();
    localStorage.setItem('onolam_user', JSON.stringify(user));

    const set    = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || ''; };
    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };

    // Avatar
    const avatarUrl = user.avatar ||
      'https://api.dicebear.com/7.x/pixel-art/svg?seed=' + user.username;
    document.querySelectorAll('img[id="profileAvatar"], .profile-avatar img, .sidebar-user img, .drawer-user img').forEach(img => {
      img.src = avatarUrl;
    });

    // Ismlar
    set('drawerName',    user.first_name);
    set('sidebarName',   user.first_name + ' ' + (user.last_name ? user.last_name[0] + '.' : ''));
    set('sidebarPlan',   user.is_pro ? 'Pro foydalanuvchi' : 'Free foydalanuvchi');
    set('profileFullName', user.first_name + ' ' + (user.last_name || ''));
    set('profileHandle', '@' + user.username + ' · OnOlam member');
    set('securityEmail', user.email);
    set('streakChip',    '🔥 ' + (user.streak_count || 0) + ' kun streak');
    set('enrolledChip', '📚 ' + (user.enrolled_count || 0) + ' faol kurs');
    set('profileBio',   user.bio || '');

    // Statistika
    set('statEnrolled', user.enrolled_count || 0);
    set('statCerts',    user.cert_count     || 0);
    set('statStreak',   user.streak_count   || 0);
    set('statLessons',  0);
    set('statWeekly',   '0h');

// Oxirgi kirish
    const lastLogin = document.getElementById('lastLoginInfo');
    if (lastLogin) {
      const date = user.last_login_at
        ? new Date(user.last_login_at).toLocaleString('uz-UZ')
        : 'Ma\'lumot yo\'q';
      lastLogin.textContent = date;
    }

    // Faollik ro'yxati
    const actList = document.getElementById('activityList');
    if (actList) {
      const activities = [];

      // Streak
      if (user.streak_count > 0) {
        activities.push({
          icon: '🔥',
          title: user.streak_count + ' kunlik streak!',
          desc:  'Har kuni o\'rganishni davom ettiring',
          time:  'Bugun'
        });
      }

      // Kurslar
      if (user.enrolled_count > 0) {
        activities.push({
          icon:  '📚',
          title: user.enrolled_count + ' ta kursga yozilgansiz',
          desc:  'Davom ettiring!',
          time:  user.last_activity || 'Yaqinda'
        });
      }

      // Sertifikatlar
      if (user.cert_count > 0) {
        activities.push({
          icon:  '🏆',
          title: user.cert_count + ' ta sertifikat olindi',
          desc:  'Tabriklaymiz!',
          time:  'Yaqinda'
        });
      }

      if (activities.length === 0) {
        actList.innerHTML = `
          <div style="text-align:center;padding:32px;color:var(--text-3);">
            <div style="font-size:40px;margin-bottom:12px;">📭</div>
            <p>Hali faollik yo'q. Kurs boshlang!</p>
          </div>`;
      } else {
        actList.innerHTML = activities.map(a => `
          <div class="act-card">
            <div class="ac-icon">${a.icon}</div>
            <div class="ac-info">
              <h4>${a.title}</h4>
              <p>${a.desc}</p>
            </div>
            <div class="ac-time">${a.time}</div>
          </div>
        `).join('');
      }
    }

    // Formalar
    setVal('firstName', user.first_name);
    setVal('lastName',  user.last_name);
    setVal('username',  user.username);
    setVal('email',     user.email);
    setVal('phone',     user.phone);
    setVal('bio',       user.bio);
    setVal('location',  user.location);
    setVal('website',   user.website);

    // Plan badge
    document.querySelectorAll('.profile-plan-badge').forEach(el => {
      el.className   = 'badge ' + (user.is_pro ? 'badge-pro' : 'badge-free');
      el.textContent = user.is_pro ? 'Pro' : 'Free';
    });

    // Pro banner yashirish
    if (user.is_pro) {
      document.querySelectorAll('.pro-upgrade-banner').forEach(el => {
        el.style.display = 'none';
      });
    }

  } catch (e) {
    alert('Profil yuklanmadi: ' + e.message);
  }

  // Chiqish tugmasi
  document.querySelectorAll('.exit').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      if (confirm('Chiqishni xohlaysizmi?')) {
        localStorage.clear();
        window.location.href = 'login.html';
      }
    });
  });
});

// Profilni saqlash
window.saveProfile = async function(btn) {
  const token  = localStorage.getItem('onolam_access');
  const getVal = id => document.getElementById(id)?.value || '';

  if (btn) { btn.disabled = true; btn.textContent = 'Saqlanmoqda...'; }

  try {
    const res = await fetch('http://127.0.0.1:8000/api/v1/auth/profile/', {
      method:  'PATCH',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type':  'application/json'
      },
      body: JSON.stringify({
        first_name: getVal('firstName'),
        last_name:  getVal('lastName'),
        bio:        getVal('bio'),
        phone:      getVal('phone'),
        location:   getVal('location'),
        website:    getVal('website'),
      })
    });

    if (res.ok) {
      const user = await res.json();
      localStorage.setItem('onolam_user', JSON.stringify(user));
      alert('Profil saqlandi ✔');
    } else {
      alert('Xatolik yuz berdi');
    }
  } catch (e) {
    alert('Server bilan bog\'lanib bo\'lmadi');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Saqlash'; }
  }
};

// Parol o'zgartirish
window.changePassword = async function(btn) {
  const token    = localStorage.getItem('onolam_access');
  const oldPass  = document.getElementById('oldPassword')?.value;
  const newPass  = document.getElementById('newPassword')?.value;
  const newPass2 = document.getElementById('newPassword2')?.value;

  if (!oldPass || !newPass) { alert('Parollarni to\'ldiring!'); return; }
  if (newPass !== newPass2) { alert('Yangi parollar mos kelmadi!'); return; }
  if (newPass.length < 8)   { alert('Parol kamida 8 ta belgi!'); return; }

  if (btn) { btn.disabled = true; btn.textContent = 'O\'zgartirilmoqda...'; }

  try {
    const res = await fetch('http://127.0.0.1:8000/api/v1/auth/change-password/', {
      method:  'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type':  'application/json'
      },
      body: JSON.stringify({ old_password: oldPass, new_password: newPass })
    });

    if (res.ok) {
      alert('Parol muvaffaqiyatli o\'zgartirildi ✔');
      ['oldPassword', 'newPassword', 'newPassword2'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
    } else {
      const data = await res.json();
      alert(data.old_password?.[0] || data.error || 'Xatolik');
    }
  } catch (e) {
    alert('Server bilan bog\'lanib bo\'lmadi');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Parolni yangilash'; }
  }
};

// Profil havolasini nusxalash
window.copyProfileLink = function() {
  const user = JSON.parse(localStorage.getItem('onolam_user') || '{}');
  const link = window.location.origin + '/profile/' + (user.username || '');
  navigator.clipboard?.writeText(link)
    .then(() => alert('Havola nusxalandi!'))
    .catch(() => alert('Nusxalab bo\'lmadi'));
};

// Avatar yuklash
window.uploadAvatar = async function(input) {
  const file  = input.files[0];
  if (!file) return;

  // Hajm tekshirish (max 2MB)
  if (file.size > 2 * 1024 * 1024) {
    alert('Rasm 2MB dan kichik bo\'lishi kerak!');
    return;
  }

  const token   = localStorage.getItem('onolam_access');
  const formData = new FormData();
  formData.append('avatar', file);

  alert('Rasm yuklanmoqda...');

  try {
    const res = await fetch('http://127.0.0.1:8000/api/v1/auth/profile/', {
      method:  'PATCH',
      headers: { 'Authorization': 'Bearer ' + token },
      body:    formData
    });

    if (res.ok) {
      const user = await res.json();
      localStorage.setItem('onolam_user', JSON.stringify(user));

      // Yangi rasmni ko'rsatish
      const avatarUrl = user.avatar || 
        'https://api.dicebear.com/7.x/pixel-art/svg?seed=' + user.username;

      document.querySelectorAll('.profile-avatar img, #profileAvatar, #settingsAvatar').forEach(img => {
        img.src = avatarUrl;
      });

      alert('Rasm muvaffaqiyatli yuklandi ✔');
    } else {
      alert('Rasm yuklanmadi');
    }
  } catch(e) {
    alert('Server bilan bog\'lanib bo\'lmadi');
  }
};

window.deleteAvatar = async function() {
  if (!confirm('Rasmni o\'chirishni xohlaysizmi?')) return;

  const token = localStorage.getItem('onolam_access');
  try {
    const res = await fetch('http://127.0.0.1:8000/api/v1/auth/profile/', {
      method:  'PATCH',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type':  'application/json'
      },
      body: JSON.stringify({ avatar: null })
    });

    if (res.ok) {
      const user = await res.json();
      localStorage.setItem('onolam_user', JSON.stringify(user));

      const defaultAvatar = 'https://api.dicebear.com/7.x/pixel-art/svg?seed=' + user.username;
      document.querySelectorAll('.profile-avatar img, #profileAvatar, #settingsAvatar').forEach(img => {
        img.src = defaultAvatar;
      });

      const desc = document.getElementById('avatarDesc');
      if (desc) desc.textContent = 'Pixel art uslubi (avtomatik generatsiya)';

      alert('Rasm o\'chirildi ✔');
    }
  } catch(e) {
    alert('Xatolik yuz berdi');
  }
};

// Bildirishnoma toggle larni saqlash
document.addEventListener('DOMContentLoaded', () => {
  // Saqlangan sozlamalarni yuklash
  const notifSettings = JSON.parse(localStorage.getItem('notif_settings') || '{}');

  document.querySelectorAll('.toggle-row input[type="checkbox"]').forEach((checkbox, i) => {
    const key = 'notif_' + i;
    if (notifSettings[key] !== undefined) {
      checkbox.checked = notifSettings[key];
    }
    checkbox.addEventListener('change', () => {
      const settings = JSON.parse(localStorage.getItem('notif_settings') || '{}');
      settings[key]  = checkbox.checked;
      localStorage.setItem('notif_settings', JSON.stringify(settings));
    });
  });
});
