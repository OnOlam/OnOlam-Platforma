document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('onolam_access');
  if (!token) { window.location.href = 'login.html'; return; }

  // User ma'lumotlari
  const userData = localStorage.getItem('onolam_user');
  if (userData) {
    const user = JSON.parse(userData);
    document.querySelectorAll('.drawer-user-info h4').forEach(el => el.textContent = user.first_name);
    document.querySelectorAll('.sidebar-user-info h5').forEach(el => {
      el.textContent = user.first_name + ' ' + (user.last_name?.[0] || '') + '.';
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

  await loadCertificates();
});

async function loadCertificates() {
  const token = localStorage.getItem('onolam_access');
  const grid  = document.getElementById('certGrid');
  const set   = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };

  try {
    // Sertifikatlar
    const certRes  = await fetch('http://127.0.0.1:8000/api/v1/certificates/', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const certData = await certRes.json();
    const certs    = certData.certificates || [];

    // Kurslar (jarayonda hisoblash uchun)
    const courseRes  = await fetch('http://127.0.0.1:8000/api/v1/courses/', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const courseData = await courseRes.json();
    const courses    = courseData.results || courseData;
    const enrolled   = courses.filter(c => c.is_enrolled);
    const inProgress = enrolled.filter(c => c.progress > 0 && c.progress < 100);

    // Statistika
    set('certEarned',     certs.length);
    set('certInProgress', inProgress.length);
    set('certTotal',      courses.length);

    if (!grid) return;

    // Sertifikatlar yo'q
    if (!certs.length && !inProgress.length) {
      grid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:64px;color:var(--text-3);">
          <div style="font-size:56px;margin-bottom:16px;">🏆</div>
          <h3 style="margin-bottom:8px;">Hali sertifikat yo'q</h3>
          <p style="margin-bottom:20px;">Kursni to'liq tugatgandan keyin sertifikat olasiz</p>
          <a href="courses.html">
            <button class="btn btn-neon btn-sm">Kurslarni ko'rish →</button>
          </a>
        </div>`;
      return;
    }

    const user = JSON.parse(localStorage.getItem('onolam_user') || '{}');
    let html   = '';

    // Olingan sertifikatlar
    certs.forEach(cert => {
      const date = new Date(cert.issued_at).toLocaleDateString('uz-UZ');
      html += `
        <div class="cert-card" onclick="openCertModal('${cert.cert_id}','${cert.course_title}','${cert.issued_at}')">
          <div class="cert-visual">
            <div class="cert-inner">
              <div class="ci-logo">⚡ OnOlam</div>
              <div class="ci-title">Sertifikat taqdim etadi</div>
              <div class="ci-name">${cert.user_name || user.first_name + ' ' + (user.last_name||'')}</div>
              <div class="ci-course">${cert.course_title}</div>
              <span class="ci-seal">🎖️</span>
            </div>
          </div>
          <div class="cert-info">
            <h3>${cert.course_title}</h3>
            <div class="cert-meta">
              <span class="chip chip-green">✓ Olingan</span>
              <span>${date}</span>
            </div>
            <div class="cert-actions">
              <button class="btn btn-neon btn-sm"
                onclick="event.stopPropagation();downloadCert('${cert.cert_id}')">
                ⬇ Yuklab olish
              </button>
              <button class="btn btn-ghost btn-sm"
                onclick="event.stopPropagation();shareCert('${cert.verify_url}','${cert.course_title}')">
                ↗ Ulashish
              </button>
            </div>
          </div>
        </div>`;
    });

    // Jarayondagi kurslar
    inProgress.forEach(c => {
      html += `
        <div class="cert-card">
          <div class="cert-visual" style="position:relative;">
            <div class="cert-inner" style="opacity:.4;">
              <div class="ci-logo">⚡ OnOlam</div>
              <div class="ci-title">Sertifikat taqdim etadi</div>
              <div class="ci-name">— — —</div>
              <div class="ci-course">${c.title}</div>
              <span class="ci-seal" style="filter:grayscale(1)">🔒</span>
            </div>
            <div class="cert-lock">
              <span>⏳</span>
              <p>${c.progress}% tugatildi. Kursni oxiriga yetkazing.</p>
            </div>
          </div>
          <div class="cert-info">
            <h3>${c.title}</h3>
            <div class="cert-progress">
              <div class="cp-label">
                <span>Progress</span>
                <span>${c.progress}%</span>
              </div>
              <div class="progress">
                <div class="progress-fill" style="width:${c.progress}%"></div>
              </div>
            </div>
            <div class="cert-actions">
              <a href="courses.html" style="flex:1;">
                <button class="btn btn-outline btn-sm w-full">Davom ettirish →</button>
              </a>
            </div>
          </div>
        </div>`;
    });

    // Boshlanmagan kurslar
    const notStarted = enrolled.filter(c => c.progress === 0);
    notStarted.forEach(c => {
      html += `
        <div class="cert-card locked">
          <div class="cert-visual" style="position:relative;">
            <div class="cert-inner" style="opacity:.3;">
              <div class="ci-logo">⚡ OnOlam</div>
              <div class="ci-course">${c.title}</div>
              <span class="ci-seal" style="filter:grayscale(1)">🔒</span>
            </div>
            <div class="cert-lock">
              <span>📚</span>
              <p>Kursni boshlang.</p>
            </div>
          </div>
          <div class="cert-info">
            <h3>${c.title}</h3>
            <div class="cert-meta">
              <span class="badge ${c.access_type==='pro'?'badge-pro':'badge-free'}">
                ${c.access_type==='pro'?'Pro':'Bepul'}
              </span>
            </div>
            <div class="cert-actions">
              <a href="courses.html" style="flex:1;">
                <button class="btn btn-ghost btn-sm w-full">Boshlash →</button>
              </a>
            </div>
          </div>
        </div>`;
    });

    grid.innerHTML = html || `
      <div style="grid-column:1/-1;text-align:center;padding:48px;color:var(--text-3);">
        <p>Hali sertifikat yo'q. Kurs boshlang!</p>
      </div>`;

  } catch(e) {
    if (grid) grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:48px;color:var(--red-accent);">
        ❌ Yuklab bo'lmadi. Serverni tekshiring.
      </div>`;
  }
}

// Modal
window.openCertModal = function(certId, course, issuedAt) {
  const user = JSON.parse(localStorage.getItem('onolam_user') || '{}');
  const date = new Date(issuedAt).toLocaleDateString('uz-UZ');
  const id   = 'ONOLAM-' + certId.slice(0,8).toUpperCase();

  const set = (selector, val) => {
    document.querySelectorAll(selector).forEach(el => el.textContent = val);
  };

  set('#modalName',     user.first_name + ' ' + (user.last_name||''));
  set('#modalCourse',   course);
  set('#modalDate',     date);
  set('#modalId',       'ID: ' + id);
  set('#modalIdFooter', id);

  document.getElementById('certModal')?.classList.add('open');
  document.body.classList.add('no-scroll');
};

window.closeCert = function() {
  document.getElementById('certModal')?.classList.remove('open');
  document.body.classList.remove('no-scroll');
};

// PDF yuklash
window.downloadCert = async function(certId) {
  const token = localStorage.getItem('onolam_access');
  alert('PDF tayyorlanmoqda...');
  try {
    const res  = await fetch(`http://127.0.0.1:8000/api/v1/certificates/${certId}/pdf/`, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `OnOlam-sertifikat-${certId.slice(0,8)}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  } catch(e) {
    alert('PDF yuklanmadi');
  }
};

// Ulashish
window.shareCert = function(verifyUrl, course) {
  const text = `Men OnOlam'da "${course}" kursini muvaffaqiyatli tugatdim! 🎉`;
  if (navigator.share) {
    navigator.share({ title: 'OnOlam Sertifikat', text, url: verifyUrl || window.location.href });
  } else {
    navigator.clipboard?.writeText(text + '\n' + (verifyUrl || window.location.href))
      .then(() => alert('Havola nusxalandi!'));
  }
};
