/**
 * OnOlam — courses.html uchun JS
 */
document.addEventListener('DOMContentLoaded', async () => {

  if (!api.requireLogin()) return;
  api.updateNavUser();

  // Kurslarni yuklash
  await loadCourses();

  // Qidiruv
  const searchInput = document.getElementById('courseSearch');
  searchInput?.addEventListener('input', function() {
    filterCourses(this.value.toLowerCase());
  });
});

let allCourses = [];

async function loadCourses() {
  const grid = document.getElementById('coursesGrid');
  if (!grid) return;

  // Yuklash animatsiyasi
  grid.innerHTML = '<div style="text-align:center;padding:48px;color:var(--text-3);">Yuklanmoqda...</div>';

  try {
    const data = await api.courses.list();
    allCourses  = data.results || data;
    renderCourses(allCourses);
  } catch (err) {
    grid.innerHTML = '<div style="text-align:center;padding:48px;color:var(--text-3);">Yuklab bo\'lmadi. Qayta urinib ko\'ring.</div>';
    console.error(err);
  }
}

function renderCourses(courses) {
  const grid = document.getElementById('coursesGrid');
  if (!grid) return;

  if (!courses.length) {
    grid.innerHTML = '<div style="text-align:center;padding:48px;color:var(--text-3);">Kurs topilmadi</div>';
    return;
  }

  grid.innerHTML = courses.map(c => `
    <div class="course-card ${c.is_enrolled ? 'enrolled' : ''}"
         onclick="openCoursePanel('${c.slug}', '${c.icon || '📚'}', \`${c.short_desc || ''}\`, ${c.progress || 0})">
      <div class="cc-header">
        <span class="cc-icon">${c.icon || '📚'}</span>
        <div class="cc-badges">
          <span class="badge ${c.access_type === 'pro' ? 'badge-pro' : 'badge-free'}">
            ${c.access_type === 'pro' ? 'Pro' : 'Bepul'}
          </span>
          ${c.is_enrolled ? '<span class="chip chip-green">Yozilgan</span>' : ''}
        </div>
      </div>
      <h3 class="cc-title">${c.title}</h3>
      <p class="cc-desc">${c.short_desc || ''}</p>
      <div class="cc-meta">
        <span>${c.lesson_count || 0} dars</span>
        <span>${c.duration_hours || 0}h</span>
      </div>
      ${c.is_enrolled && c.progress > 0 ? `
        <div class="cc-progress">
          <div class="progress"><div class="progress-fill" style="width:${c.progress}%"></div></div>
          <span style="font-size:11px;color:var(--neon);">${c.progress}%</span>
        </div>
      ` : ''}
    </div>
  `).join('');
}

function filterCourses(query) {
  const filtered = allCourses.filter(c =>
    c.title.toLowerCase().includes(query) ||
    (c.short_desc || '').toLowerCase().includes(query)
  );
  renderCourses(filtered);
}

// ── SIDE PANEL ──
let currentSlug = null;

async function openCoursePanel(slug, icon, desc, progress) {
  currentSlug = slug;
  const panel = document.getElementById('coursePanel');
  if (!panel) return;

  panel.classList.add('open');
  document.getElementById('panelOverlay')?.classList.add('open');

  // Loading
  document.getElementById('panelLessons').innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-3);">Yuklanmoqda...</div>';

  try {
    const course = await api.courses.detail(slug);

    document.getElementById('panelTitle').textContent      = course.title;
    document.getElementById('panelIcon').textContent       = course.icon || '📚';
    document.getElementById('panelDesc').textContent       = course.description;
    document.getElementById('panelProgress').style.width   = (course.progress || 0) + '%';
    document.getElementById('panelProgressPct').textContent = (course.progress || 0) + '%';

    // Darslar ro'yxati
    const lessonsHtml = (course.lessons || []).map((l, i) => {
      let statusIcon = '○';
      if (l.is_accessible === false) statusIcon = '🔒';
      return `
        <div class="panel-lesson" onclick="goToLesson(${l.id}, '${l.access_type}')">
          <span class="pl-num">${i + 1}</span>
          <span class="pl-icon">${statusIcon}</span>
          <div class="pl-info">
            <span class="pl-title">${l.title}</span>
            <span class="pl-meta">${l.duration_minutes} daq · ${l.lesson_type}</span>
          </div>
          ${l.access_type === 'pro' ? '<span class="badge badge-pro">Pro</span>' : ''}
        </div>
      `;
    }).join('');

    document.getElementById('panelLessons').innerHTML = lessonsHtml || '<p style="color:var(--text-3);padding:16px;">Darslar yuklanmadi</p>';

    // Enroll tugmasi
    const enrollBtn = document.getElementById('panelEnrollBtn');
    if (enrollBtn) {
      if (course.is_enrolled) {
        enrollBtn.textContent = 'Davom ettirish →';
        enrollBtn.onclick = () => location.href = `lesson.html?course=${slug}`;
      } else {
        enrollBtn.textContent = 'Kursga yozilish →';
        enrollBtn.onclick = () => enrollToCourse(slug);
      }
    }

  } catch (err) {
    api.showError(err);
  }
}

async function enrollToCourse(slug) {
  try {
    const data = await api.courses.enroll(slug);
    api.showToast(data.message, 'success');
    const btn = document.getElementById('panelEnrollBtn');
    if (btn) {
      btn.textContent = 'Davom ettirish →';
      btn.onclick = () => location.href = `lesson.html?course=${slug}`;
    }
    // Ro'yxatni yangilash
    await loadCourses();
  } catch (err) {
    if (err?.data?.upgrade_required) {
      if (confirm('Bu Pro kurs. Pro tarifga o\'tmoqchimisiz?')) {
        location.href = 'pricing.html';
      }
    } else {
      api.showError(err);
    }
  }
}

function goToLesson(lessonId, accessType) {
  if (accessType === 'pro' && !api.Token.isPro()) {
    if (confirm('Bu dars Pro foydalanuvchilar uchun. Pro tarifga o\'tmoqchimisiz?')) {
      location.href = 'pricing.html';
    }
    return;
  }
  location.href = `lesson.html?id=${lessonId}`;
}

function closePanel() {
  document.getElementById('coursePanel')?.classList.remove('open');
  document.getElementById('panelOverlay')?.classList.remove('open');
}
