document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('onolam_access');
  if (!token) { window.location.href = 'login.html'; return; }
  await loadCourses();
});

let allCourses = [];

async function loadCourses() {
  const token     = localStorage.getItem('onolam_access');
  const container = document.getElementById('coursesContainer');
  const loading   = document.getElementById('coursesLoading');

  if (!container) { console.error('coursesContainer topilmadi!'); return; }

  try {
    const res  = await fetch('https://onolam-platforma.onrender.com/api/v1/courses/', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await res.json();
    allCourses  = data.results || data;

    // Loading yashirish
    if (loading) loading.style.display = 'none';

    if (!allCourses.length) {
      container.innerHTML = `
        <div style="text-align:center;padding:64px;color:var(--text-3);">
          <div style="font-size:56px;margin-bottom:16px;">📚</div>
          <h3 style="margin-bottom:8px;">Hali kurslar qo'shilmagan</h3>
          <p>Admin kurslar qo'shgandan keyin bu yerda ko'rinadi</p>
        </div>`;
      return;
    }

    renderCourses(allCourses);

  } catch (e) {
      // Ekranda ko'rsat
      document.body.innerHTML += `<div style="position:fixed;bottom:0;left:0;right:0;
        background:red;color:white;padding:12px;font-size:12px;z-index:9999;">
        FETCH XATO: ${e.message}</div>`;
  
      const container = document.getElementById('coursesContainer');
      if (container) container.innerHTML = `
        <div style="text-align:center;padding:48px;color:var(--red-accent);">
          <p>Xato: ${e.message}</p>
        </div>`;
    }
}

function renderCourses(courses) {
  const container = document.getElementById('coursesContainer');
  if (!container) return;

  // Kategoriyalar bo'yicha guruhlash
  const grouped = {};
  courses.forEach(c => {
    const cat = c.category?.name || 'Boshqa';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(c);
  });

  let html = '';

  Object.entries(grouped).forEach(([catName, catCourses]) => {
    html += `
      <div style="margin-bottom:40px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
          <h2 style="font-size:18px;font-weight:800;">${catName}</h2>
          <span style="font-size:12px;color:var(--text-3);">${catCourses.length} kurs</span>
        </div>
        <div class="cg-4">
          ${catCourses.map(c => `
            <div class="ccard ${c.is_enrolled && c.progress > 0 ? 'started' : ''}"
                 onclick="openCoursePanel('${c.slug}')"
                 style="cursor:pointer;">
              <div class="ccard-thumb">
                <span class="ccard-emoji">${c.icon || '📚'}</span>
                ${c.is_enrolled && c.progress > 0 ? `
                  <div class="ccard-prog">
                    <div style="width:${c.progress}%"></div>
                  </div>` : ''}
              </div>
              <div class="ccard-body">
                <h3>${c.title}</h3>
                <p>${c.short_desc || ''}</p>
                <div class="ccard-meta">
                  <span>${c.lesson_count || 0} dars</span>
                  <span class="badge ${c.access_type === 'pro' ? 'badge-pro' : 'badge-free'}">
                    ${c.access_type === 'pro' ? 'Pro' : 'Bepul'}
                  </span>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>`;
  });

  container.innerHTML = html;
}

// Qidiruv
window.filterCourses = function(query) {
  const q = query.toLowerCase();
  const filtered = allCourses.filter(c =>
    c.title.toLowerCase().includes(q) ||
    (c.short_desc || '').toLowerCase().includes(q)
  );

  if (!filtered.length) {
    document.getElementById('coursesContainer').innerHTML = `
      <div style="text-align:center;padding:48px;color:var(--text-3);">
        <p>"${query}" bo'yicha hech narsa topilmadi</p>
      </div>`;
  } else {
    allCourses = filtered;
    renderCourses(filtered);
  }
};

// Panel ochish
window.openCoursePanel = async function(slug) {
  const token   = localStorage.getItem('onolam_access');
  const panel   = document.getElementById('detailPanel');
  const overlay = document.getElementById('panelOverlay');
  // "Kursni to'liq ochish" havolasi
   const detailLink = document.getElementById('panelDetailLink');
    if (detailLink) detailLink.href = `course-detail.html?slug=${slug}`;
  const btn = document.getElementById('panelBtn');
    if (btn) {
      if (course.is_enrolled) {
        btn.innerHTML = `<button class="btn btn-neon btn-full btn-lg"
          onclick="goToFirstLesson()">Davom ettirish →</button>`;
      } else {
        btn.innerHTML = `<button class="btn btn-neon btn-full btn-lg"
          onclick="enrollCourse('${slug}')">Kursga yozilish →</button>`;
      }
    }
  // Detail sahifasi havolasi

  if (!panel) return;
  panel.classList.add('open');
  if (overlay) overlay.classList.add('open');

  document.getElementById('panelLessons').innerHTML =
    '<div style="padding:16px;color:var(--text-3);">Yuklanmoqda...</div>';

  try {
    const res    = await fetch('https://onolam-platforma.onrender.com/api/v1/courses/${slug}/`, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const course = await res.json();

    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    set('panelName',  course.title);
    set('panelIcon',  course.icon || '📚');
    set('panelDesc',  course.description || course.short_desc || '');
    set('panelPct',   (course.progress || 0) + '%');

    const prog = document.getElementById('panelProg');
    if (prog) prog.style.width = (course.progress || 0) + '%';

    // Darslar
    const ls = course.lessons || [];
    window._currentLessons = ls;
    window._currentSlug    = slug;

    const lessonsEl = document.getElementById('panelLessons');
    if (!ls.length) {
      lessonsEl.innerHTML =
        '<p style="padding:16px;color:var(--text-3);">Bu kursda hali darslar yo\'q.<br>Admin dars qo\'shgandan keyin ko\'rinadi.</p>';
    } else {
      lessonsEl.innerHTML = ls.map((l, i) => `
        <div onclick="goToLesson(${l.id}, '${l.access_type}')"
             style="display:flex;align-items:center;gap:10px;padding:12px 0;
                    border-bottom:1px solid var(--border);cursor:pointer;
                    transition:.2s;" onmouseover="this.style.paddingLeft='8px'"
                    onmouseout="this.style.paddingLeft='0'">
          <span style="color:var(--text-4);font-size:12px;width:20px;">${i + 1}</span>
          <span style="font-size:16px;">${l.access_type === 'pro' ? '🔒' : '▶'}</span>
          <div style="flex:1;">
            <div style="font-size:13px;font-weight:600;margin-bottom:2px;">${l.title}</div>
            <div style="font-size:11px;color:var(--text-3);">${l.duration_minutes || 0} daqiqa</div>
          </div>
          ${l.access_type === 'pro' ? '<span class="badge badge-pro">Pro</span>' : ''}
        </div>
      `).join('');
    }

    // Tugma
    const btn = document.getElementById('panelBtn');
    if (btn) {
      if (course.is_enrolled) {
        btn.innerHTML = `<button class="btn btn-neon btn-full btn-lg"
          onclick="goToFirstLesson()">Davom ettirish →</button>`;
      } else {
        btn.innerHTML = `<button class="btn btn-neon btn-full btn-lg"
          onclick="enrollCourse('${slug}')">Kursga yozilish →</button>`;
      }
    }

  } catch (e) {
    document.getElementById('panelLessons').innerHTML =
      '<p style="padding:16px;color:var(--red-accent);">Yuklab bo\'lmadi</p>';
  }
};

window.goToFirstLesson = function() {
  const ls = window._currentLessons || [];
  if (ls.length) {
    goToLesson(ls[0].id, ls[0].access_type);
  } else {
    location.href = `course-detail.html?slug=${window._currentSlug}`;
  }
};

window.enrollCourse = async function(slug) {
  const token = localStorage.getItem('onolam_access');
  try {
    const res  = await fetch('https://onolam-platforma.onrender.com/api/v1/courses/${slug}/enroll/`, {
      method:  'POST',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await res.json();

    if (res.ok) {
      alert(data.message || 'Kursga yozildingiz! ✔');
      await loadCourses();
      openCoursePanel(slug);
    } else {
      if (data.upgrade_required) {
        if (confirm('Bu Pro kurs. Pro tarifga o\'tasizmi?')) {
          location.href = 'pricing.html';
        }
      } else {
        alert(data.error || 'Xatolik yuz berdi');
      }
    }
  } catch (e) {
    alert('Server bilan bog\'lanib bo\'lmadi');
  }
};

window.goToLesson = function(id, accessType) {
  const user = JSON.parse(localStorage.getItem('onolam_user') || '{}');
  if (accessType === 'pro' && !user.is_pro) {
    if (confirm('Bu dars Pro foydalanuvchilar uchun. Pro tarifga o\'tasizmi?')) {
      location.href = 'pricing.html';
    }
    return;
  }
  location.href = `lesson.html?id=${id}`;
};

window.closePanel = function() {
  document.getElementById('detailPanel')?.classList.remove('open');
  document.getElementById('panelOverlay')?.classList.remove('open');
};

// Filter tabs
window.setTab = function(btn, tab) {
  // Aktiv tabni belgilash
  document.querySelectorAll('.ftab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  // Filterlash
  let filtered = allCourses;

  if (tab === 'started') {
    filtered = allCourses.filter(c => c.is_enrolled && c.progress > 0 && c.progress < 100);
  } else if (tab === 'free') {
    filtered = allCourses.filter(c => c.access_type === 'free');
  } else if (tab === 'pro') {
    filtered = allCourses.filter(c => c.access_type === 'pro');
  } else if (tab === 'frontend') {
    filtered = allCourses.filter(c =>
      c.category?.name?.toLowerCase().includes('front') ||
      c.category?.slug?.toLowerCase().includes('front')
    );
  } else if (tab === 'backend') {
    filtered = allCourses.filter(c =>
      c.category?.name?.toLowerCase().includes('back') ||
      c.category?.slug?.toLowerCase().includes('back')
    );
  } else if (tab === 'terminal') {
    filtered = allCourses.filter(c =>
      c.category?.name?.toLowerCase().includes('terminal') ||
      c.category?.name?.toLowerCase().includes('linux') ||
      c.category?.slug?.toLowerCase().includes('terminal')
    );
  }
  // tab === 'all' — hammasi

  if (!filtered.length) {
    const container = document.getElementById('coursesContainer');
    if (container) {
      container.innerHTML = `
        <div style="text-align:center;padding:48px;color:var(--text-3);">
          <div style="font-size:40px;margin-bottom:12px;">🔍</div>
          <p>Bu bo'limda hali kurslar yo'q</p>
        </div>`;
    }
  } else {
    renderCourses(filtered);
  }
};
