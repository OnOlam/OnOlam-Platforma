document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('onolam_access');
  if (!token) { window.location.href = 'login.html'; return; }

  // URL dan slug olish
  const params = new URLSearchParams(window.location.search);
  const slug   = params.get('slug');

  if (!slug) {
    window.location.href = 'courses.html';
    return;
  }

  // User ma'lumotlari
  const userData = localStorage.getItem('onolam_user');
  if (userData) {
    const user = JSON.parse(userData);
    document.querySelectorAll('.drawer-user-info h4').forEach(el => {
      el.textContent = user.first_name;
    });
  }

  // Chiqish
  document.querySelectorAll('.exit').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      if (confirm('Chiqishni xohlaysizmi?')) {
        localStorage.clear();
        window.location.href = 'login.html';
      }
    });
  });

  await loadCourse(slug);
});

let currentCourse = null;

async function loadCourse(slug) {
  const token = localStorage.getItem('onolam_access');
  const set   = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val || ''; };

  try {
    const res  = await fetch(`https://onolam-platforma.onrender.com/api/v1/courses/${slug}/`, {
      headers: { 'Authorization': 'Bearer ' + token }
    });

    if (!res.ok) {
      window.location.href = 'courses.html';
      return;
    }

    currentCourse = await res.json();

    // Sarlavhalar
    document.title = currentCourse.title + ' — OnOlam';
    set('cdCourseTitle', currentCourse.title);
    set('cdTitle',       currentCourse.title);
    set('cdDesc',        currentCourse.description || currentCourse.short_desc || '');
    set('cdShortDesc',   currentCourse.short_desc || '');
    set('cdIcon',        currentCourse.icon || '📚');

    // Statistika
    set('cdLessonCount', currentCourse.lesson_count || 0);
    set('cdDuration',    (currentCourse.duration_hours || 0) + 'h');
    set('cdProgress',    (currentCourse.progress || 0) + '%');

    // Progress bar
    const progBar = document.getElementById('cdProgressBar');
    const progTxt = document.getElementById('cdProgressText');
    const progPct = document.getElementById('cdProgressPct');
    if (progBar) progBar.style.width = (currentCourse.progress || 0) + '%';
    if (progPct) progPct.textContent = (currentCourse.progress || 0) + '%';

    // Tugatilgan darslar
    const lessons       = currentCourse.lessons || [];
    const completedLess = lessons.filter(l => l.is_completed).length;
    if (progTxt) progTxt.textContent = `${completedLess}/${lessons.length} dars tugallandi`;

    // Narx
    const priceEl = document.getElementById('cdPrice');
    if (priceEl) {
      priceEl.innerHTML = currentCourse.access_type === 'pro'
        ? 'Pro <span>— Pro tarifga o\'ting</span>'
        : 'Bepul <span>— ro\'yxatdan o\'tish kifoya</span>';
    }

    // Enroll tugmasi
    const enrollBtn = document.getElementById('cdEnrollBtn');
    if (enrollBtn) {
      if (currentCourse.is_enrolled) {
        enrollBtn.textContent = 'Davom ettirish →';
      } else {
        enrollBtn.textContent = currentCourse.access_type === 'pro'
          ? 'Pro olish →'
          : 'Kursga yozilish →';
      }
    }

    // Darslar ro'yxati
    renderLessons(lessons);

  } catch(e) {
    console.error('Kurs yuklanmadi:', e);
  }
}

function renderLessons(lessons) {
  const container = document.getElementById('tab-lessons');
  if (!container) return;

  const user = JSON.parse(localStorage.getItem('onolam_user') || '{}');

  if (!lessons.length) {
    container.innerHTML = `
      <div style="text-align:center;padding:32px;color:var(--text-3);">
        <p>Bu kursda hali darslar yo'q</p>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div class="lessons-list">
      ${lessons.map((l, i) => {
        const isPro    = l.access_type === 'pro' && !user.is_pro;
        const isDone   = l.is_completed;
        const typeIcon = l.lesson_type === 'video' ? '📹' : '📝';

        return `
          <div class="ll-item" onclick="${isPro
            ? 'location.href=\'pricing.html\''
            : `location.href='lesson.html?id=${l.id}'`}"
               style="cursor:pointer;">
            <div class="ll-num">${i + 1}</div>
            <div class="ll-icon-wrap ${isDone ? 'done' : ''}">
              ${isPro ? '🔒' : isDone ? '✅' : typeIcon}
            </div>
            <div class="ll-info">
              <div class="ll-title">${l.title}</div>
              <div class="ll-meta">
                <span class="ll-type">${typeIcon} ${l.lesson_type === 'video' ? 'Video' : 'Matn'}</span>
                <span>·</span>
                <span>${l.duration_minutes || 0} daq</span>
                ${isPro ? '<span>·</span><span class="badge badge-pro" style="font-size:10px;">Pro</span>' : ''}
              </div>
            </div>
            ${isDone ? '<span style="color:var(--neon);font-size:16px;">✔</span>' : ''}
          </div>`;
      }).join('')}
    </div>`;
}

// Enroll yoki davom ettirish
window.enrollOrContinue = async function() {
  const token = localStorage.getItem('onolam_access');
  if (!currentCourse) return;

  if (currentCourse.is_enrolled) {
    // Birinchi tugallanmagan darsga o'tish
    const lessons    = currentCourse.lessons || [];
    const nextLesson = lessons.find(l => !l.is_completed) || lessons[0];
    if (nextLesson) {
      window.location.href = `lesson.html?id=${nextLesson.id}`;
    }
    return;
  }

  // Pro kurs
  if (currentCourse.access_type === 'pro') {
    window.location.href = 'pricing.html';
    return;
  }

  // Yozilish
  try {
    const res  = await fetch(
      `https://onolam-platforma.onrender.com/api/v1/courses/${currentCourse.slug}/enroll/`,
      {
        method:  'POST',
        headers: { 'Authorization': 'Bearer ' + token }
      }
    );
    const data = await res.json();

    if (res.ok) {
      alert(data.message || 'Kursga yozildingiz! ✔');
      currentCourse.is_enrolled = true;
      const btn = document.getElementById('cdEnrollBtn');
      if (btn) btn.textContent = 'Davom ettirish →';
    } else {
      alert(data.error || 'Xatolik');
    }
  } catch(e) {
    alert('Server bilan bog\'lanib bo\'lmadi');
  }
};
