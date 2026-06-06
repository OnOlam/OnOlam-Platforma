document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('onolam_access');
  if (!token) { window.location.href = 'login.html'; return; }
  await loadDashboard();
});

async function loadDashboard() {
  const token = localStorage.getItem('onolam_access');
  const set   = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val||''; };

  // ── PROFIL ──
  try {
    const res  = await fetch('https://onolam-platforma.onrender.com/api/v1/auth/profile/', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!res.ok) { localStorage.clear(); window.location.href = 'login.html'; return; }

    const user = await res.json();
    localStorage.setItem('onolam_user', JSON.stringify(user));

    // Ismlar
    set('heroName',    user.first_name);
    set('drawerName',  user.first_name);
    set('sidebarName', user.first_name + ' ' + (user.last_name ? user.last_name[0]+'.' : ''));
    set('sidebarPlan', user.is_pro ? 'Pro foydalanuvchi' : 'Free foydalanuvchi');

    // Avatar
    const avatar = user.avatar || 'https://api.dicebear.com/7.x/pixel-art/svg?seed=' + user.username;
    document.querySelectorAll('.navbar-avatar img,.sidebar-user img,.drawer-user img').forEach(img => {
      img.src = avatar;
    });

    // Barcha badge lar
    document.querySelectorAll('.badge-free,.badge-pro').forEach(el => {
      el.className   = 'badge ' + (user.is_pro ? 'badge-pro' : 'badge-free');
      el.textContent = user.is_pro ? 'Pro' : 'Free';
    });

    // Streak
    set('statStreak', user.streak_count || 0);
    updateStreakCalendar(user.streak_count || 0);

    // ── PRO / FREE BANNER ──
    const freeBanner    = document.getElementById('freeUpgradeBanner');
    const proBanner     = document.getElementById('proBanner');
    const proBannerText = document.getElementById('proBannerText');

    if (user.is_pro) {
      if (freeBanner) freeBanner.style.display = 'none';
      if (proBanner)  proBanner.style.display  = 'flex';
      if (proBannerText && user.pro_expires_at) {
        const expires = new Date(user.pro_expires_at).toLocaleDateString('uz-UZ');
        proBannerText.textContent = `Pro tarif ${expires} gacha faol. Barcha imkoniyatlar ochiq!`;
      }
    } else {
      if (freeBanner) freeBanner.style.display = 'flex';
      if (proBanner)  proBanner.style.display  = 'none';
    }

  } catch(e) {
    console.error('Profil yuklanmadi:', e);
  }

  // ── KURSLAR ──
  try {
    const res     = await fetch('https://onolam-platforma.onrender.com/api/v1/courses/', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data    = await res.json();
    const courses = data.results || data;
    const set2    = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val||''; };

    const enrolled = courses.filter(c => c.is_enrolled);
    set2('statCourses', enrolled.length);

    let totalLessons = 0;
    enrolled.forEach(c => {
      totalLessons += Math.floor((c.lesson_count||0) * (c.progress||0) / 100);
    });
    set2('statLessons', totalLessons);

    // Oxirgi dars
    if (enrolled.length > 0) {
      const last = enrolled.sort((a,b) => (b.progress||0) - (a.progress||0))[0];
      const titleEl = document.getElementById('lastLessonTitle');
      const pctEl   = document.getElementById('lastLessonPct');
      const progEl  = document.getElementById('lastLessonProg');
      const descEl  = document.getElementById('lastLessonDesc');
      const btnEl   = document.getElementById('lastLessonBtn');
      if (titleEl) titleEl.textContent = last.title;
      if (pctEl)   pctEl.textContent   = (last.progress||0) + '%';
      if (progEl)  progEl.style.width  = (last.progress||0) + '%';
      if (descEl)  descEl.textContent  = last.short_desc || '';
      if (btnEl)   btnEl.href          = 'courses.html';
    }

    // Progress ro'yxati
    const progressList = document.getElementById('progressList');
    if (progressList) {
      if (!enrolled.length) {
        progressList.innerHTML = `
          <div style="text-align:center;padding:24px;color:var(--text-3);">
            <p>Hali kursga yozilmadingiz</p>
            <a href="courses.html">
              <button class="btn btn-neon btn-sm" style="margin-top:12px;">Kurslarni ko'rish →</button>
            </a>
          </div>`;
      } else {
        progressList.innerHTML = enrolled.slice(0,4).map(c => `
          <a href="courses.html" style="text-decoration:none;color:inherit;">
            <div class="cl-item">
              <div class="cl-icon">${c.icon||'📚'}</div>
              <div class="cl-info">
                <h4>${c.title}</h4>
                <div class="cl-meta">
                  ${Math.floor((c.lesson_count||0)*(c.progress||0)/100)}/${c.lesson_count||0} dars ·
                  ${c.progress > 0 ? 'Faol' : 'Boshlangan'}
                </div>
              </div>
              <div class="cl-right">
                <div class="cl-pct">${c.progress||0}%</div>
                <div class="cl-bar"><div style="width:${c.progress||0}%"></div></div>
              </div>
            </div>
          </a>`).join('');
      }
    }

    // Faollik
    const actList = document.getElementById('activityList');
    if (actList) {
      if (!enrolled.length) {
        actList.innerHTML = `<div style="padding:16px;color:var(--text-3);">Hali faollik yo'q</div>`;
      } else {
        actList.innerHTML = enrolled.map(c => `
          <div class="act-item">
            <div class="act-dot ${c.progress > 0 ? '' : 'dim'}"></div>
            <div class="act-info">
              <h5>${c.title} — ${c.progress > 0 ? 'davom ettirilmoqda' : 'yozilindi'}</h5>
              <p>${c.progress > 0 ? c.progress+'% tugatildi' : 'Hali boshlanmagan'}</p>
            </div>
          </div>`).join('');
      }
    }

    // Tavsiya
    renderRecommended(courses.filter(c => !c.is_enrolled).slice(0,3));

  } catch(e) {
    console.error('Kurslar yuklanmadi:', e);
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
}

function renderRecommended(courses) {
  const grid = document.getElementById('recommendedGrid');
  if (!grid || !courses.length) return;
  grid.innerHTML = courses.map(c => `
    <div class="card" onclick="location.href='courses.html'" style="cursor:pointer;">
      <div style="font-size:28px;margin-bottom:12px;">${c.icon||'📚'}</div>
      <h3 style="font-size:14px;font-weight:700;margin-bottom:6px;">${c.title}</h3>
      <p style="font-size:12px;color:var(--text-3);margin-bottom:12px;">${c.short_desc||''}</p>
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <span class="badge ${c.access_type==='pro'?'badge-pro':'badge-free'}">
          ${c.access_type==='pro'?'Pro':'Bepul'}
        </span>
        <span style="font-size:11px;color:var(--text-3);">${c.lesson_count||0} dars</span>
      </div>
    </div>`).join('');
}

function updateStreakCalendar(streak) {
  const streakNum = document.getElementById('streakNum');
  if (streakNum) streakNum.textContent = streak;
  const today  = new Date().getDay();
  const days   = document.querySelectorAll('#streakDays .sd');
  const uzDays = [6,0,1,2,3,4,5];
  days.forEach((day, i) => {
    day.classList.remove('done','today');
    const d = uzDays[i];
    if (d === today) day.classList.add('today');
    let diff = today - d;
    if (diff < 0) diff += 7;
    if (diff < streak && diff > 0) day.classList.add('done');
  });
}
