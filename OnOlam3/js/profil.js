/**
 * OnOlam — profile.html uchun JS
 */
document.addEventListener('DOMContentLoaded', async () => {

  if (!api.requireLogin()) return;
  api.updateNavUser();

  await loadProfile();
});

async function loadProfile() {
  try {
    const user = await api.auth.profile();

    // Asosiy ma'lumotlar
    setVal('firstName',  user.first_name);
    setVal('lastName',   user.last_name);
    setVal('username',   user.username);
    setVal('email',      user.email);
    setVal('phone',      user.phone);
    setVal('bio',        user.bio);
    setVal('location',   user.location);
    setVal('website',    user.website);

    // Profil rasmi
    const avatar = user.avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${user.username}`;
    document.querySelectorAll('.profile-avatar img').forEach(img => img.src = avatar);

    // Ism familiya
    const fullName = document.getElementById('profileFullName');
    if (fullName) fullName.textContent = `${user.first_name} ${user.last_name || ''}`.trim();

    // Handle
    const handle = document.getElementById('profileHandle');
    if (handle) handle.textContent = `@${user.username}`;

    // Statistika
    setVal('statEnrolled',    user.enrolled_count, 'textContent');
    setVal('statCerts',       user.cert_count,      'textContent');
    setVal('statStreak',      user.streak_count,    'textContent');

    // Pro/Free badge
    document.querySelectorAll('.profile-plan-badge').forEach(el => {
      el.className = `badge ${user.is_pro ? 'badge-pro' : 'badge-free'}`;
      el.textContent = user.is_pro ? 'Pro' : 'Free';
    });

    // Pro bo'lsa upgrade banner yashirish
    if (user.is_pro) {
      document.querySelectorAll('.pro-upgrade-banner').forEach(el => el.style.display = 'none');
    }

  } catch (err) {
    api.showError(err);
  }
}

// ── PROFILNI SAQLASH ──
window.saveProfile = async function(btn) {
  api.setLoading(btn, true);

  try {
    await api.auth.updateProfile({
      first_name: getVal('firstName'),
      last_name:  getVal('lastName'),
      bio:        getVal('bio'),
      phone:      getVal('phone'),
      location:   getVal('location'),
      website:    getVal('website'),
    });

    api.showToast('Profil saqlandi ✔', 'success');
    await loadProfile();

  } catch (err) {
    api.showError(err);
  } finally {
    api.setLoading(btn, false, 'Saqlash');
  }
};

// ── PAROL O'ZGARTIRISH ──
window.changePassword = async function(btn) {
  const oldPass  = getVal('oldPassword');
  const newPass  = getVal('newPassword');
  const newPass2 = getVal('newPassword2');

  if (!oldPass || !newPass) {
    api.showToast('Parollarni to\'ldiring', 'warning'); return;
  }
  if (newPass !== newPass2) {
    api.showToast('Yangi parollar mos kelmadi', 'error'); return;
  }
  if (newPass.length < 8) {
    api.showToast('Parol kamida 8 ta belgi', 'warning'); return;
  }

  api.setLoading(btn, true);

  try {
    await api.auth.changePassword(oldPass, newPass);
    api.showToast('Parol o\'zgartirildi ✔', 'success');
    ['oldPassword','newPassword','newPassword2'].forEach(id => setVal(id, ''));
  } catch (err) {
    api.showError(err);
  } finally {
    api.setLoading(btn, false, 'Parolni yangilash');
  }
};

// ── COPY LINK ──
window.copyProfileLink = function() {
  const user = api.Token.user;
  const link = `${window.location.origin}/profile/${user?.username}`;
  navigator.clipboard.writeText(link)
    .then(() => api.showToast('Havola nusxalandi!', 'success'));
};

// ── YORDAMCHI ──
function setVal(id, val, prop = 'value') {
  const el = document.getElementById(id);
  if (el) el[prop] = val || '';
}
function getVal(id) {
  return document.getElementById(id)?.value || '';
}
