/**
 * OnOlam — dashboard.html uchun JS
 */
document.addEventListener('DOMContentLoaded', async () => {

  // Himoya
  if (!api.requireLogin()) return;

  // Navbar yangilash
  api.updateNavUser();

  // ── MA'LUMOTLARNI YUKLASH ──
  await Promise.all([
    loadProfile(),
    loadEnrollments(),
  ]);
});

// ── PROFIL VA STATISTIKA ──
async function loadProfile() {
  try {
    const user = await api.auth.profile();

    // Tokenni yangilash (yangi ma'lumotlar bilan)
    localStorage.setItem('onolam_user', JSON.stringify(user));
    api.updateNavUser();

    // Streak
    const streakEl = document.getElementById('streakCount');
    if (streakEl) streakEl.textContent = user.streak_count || 0;

    // Streak kunlari (7 kunlik)
    updateStreakCalendar(user.streak_count || 0, user.last_activity);

    // Kurslar soni
    const enrolledEl = document.getElementById('enrolledCount');
    if (enrolledEl) enrolledEl.textContent = user.enrolled_count || 0;

    // Sertifikatlar
    const certEl = document.getElementById('certCount');
    if (certEl) certEl.textContent = user.cert_count || 0;

    // Pro/Free ko'rsatish
    if (user.is_pro) {
      document.querySelectorAll('.pro-upgrade-banner').forEach(el => {
        el.style.display = 'none';
      });
    }

  } catch (err) {
    console.error('Profil yuklanmadi:', err);
  }
}

// ── KURS PROGRESSLARI ──
async function loadEnrollments() {
  try {
    const data = await api.courses.list();
    const courses = data.results || data;

    // Faol kurslar
    const activeCourses = courses.filter(c => c.is_enrolled && c.progress > 0 && c.progress < 100);
    const completedCourses = courses.filter(c => c.progress === 100);

    // Progress ro'yxatini yangilash
    const progressList = document.getElementById('progressList');
    if (progressList && activeCourses.length > 0) {
      progressList.innerHTML = activeCourses.slice(0, 4).map(c => `
        <div class="progress-item">
          <div class="pi-info">
            <span class="pi-icon">${c.icon || '📚'}</span>
            <div>
              <h4>${c.title}</h4>
              <p>${c.progress || 0}% tugatildi</p>
            </div>
          </div>
          <div class="progress" style="width:120px;">
            <div class="progress-fill" style="width:${c.progress || 0}%"></div>
          </div>
        </div>
      `).join('');
    }

    // Tugatilgan kurslar
    const completedEl = document.getElementById('completedCount');
    if (completedEl) completedEl.textContent = completedCourses.length;

    // Tavsiya kurslar (yozilmagan)
    const notEnrolled = courses.filter(c => !c.is_enrolled).slice(0, 3);
    renderRecommended(notEnrolled);

  } catch (err) {
    console.error('Kurslar yuklanmadi:', err);
  }
}

// ── TAVSIYA KURSLAR ──
function renderRecommended(courses) {
  const grid = document.getElementById('recommendedGrid');
  if (!grid || !courses.length) return;

  grid.innerHTML = courses.map(c => `
    <div class="card" onclick="location.href='course-detail.html?slug=${c.slug}'" style="cursor:pointer;">
      <div style="font-size:28px;margin-bottom:12px;">${c.icon || '📚'}</div>
      <h3 style="font-size:14px;font-weight:700;margin-bottom:6px;">${c.title}</h3>
      <p style="font-size:12px;color:var(--text-3);margin-bottom:12px;">${c.short_desc || ''}</p>
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <span class="badge ${c.access_type === 'pro' ? 'badge-pro' : 'badge-free'}">
          ${c.access_type === 'pro' ? 'Pro' : 'Bepul'}
        </span>
        <span style="font-size:11px;color:var(--text-3);">${c.lesson_count || 0} dars</span>
      </div>
    </div>
  `).join('');
}

// ── STREAK KALENDAR ──
function updateStreakCalendar(streak, lastActivity) {
  const days   = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];
  const today  = new Date();
  const cells  = document.querySelectorAll('.streak-day');

  cells.forEach((cell, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));

    const isToday  = i === 6;
    const isFilled = streak > 0 && i >= (7 - streak);

    cell.classList.toggle('active', isFilled || isToday);
    if (isToday) cell.classList.add('today');
  });
}

// ── KOD EDITOR (mavjud logikani saqlash) ──
// Bu funksiyalar dashboard.html ichida qoladi
