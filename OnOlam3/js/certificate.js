/**
 * OnOlam — certificate.html uchun JS
 */
document.addEventListener('DOMContentLoaded', async () => {

  if (!api.requireLogin()) return;
  api.updateNavUser();

  await loadCertificates();

  // URL da verify= parametri bo'lsa — tekshirish
  const certId = new URLSearchParams(window.location.search).get('verify');
  if (certId) verifyCertificate(certId);
});

async function loadCertificates() {
  const grid = document.getElementById('certGrid');
  if (!grid) return;

  try {
    const data  = await api.certificates.list();
    const certs = data.certificates || [];

    // Statistika
    const earnedEl = document.getElementById('earnedCount');
    if (earnedEl) earnedEl.textContent = certs.length;

    if (certs.length === 0) {
      document.getElementById('noCertsMsg')?.style.setProperty('display', 'block');
      return;
    }

    // Mavjud sertifikat kartalarini yangilash
    certs.forEach((cert, i) => {
      const card = grid.children[i];
      if (!card) return;

      // Kurs nomi
      card.querySelector('.ci-course')?.setAttribute('data-course', cert.course);
      card.querySelector('.cert-info h3').textContent = cert.course;

      // Sana
      const date = new Date(cert.issued_at).toLocaleDateString('uz-UZ');
      card.querySelector('.cert-meta').innerHTML = `
        <span class="chip chip-green">✓ Olingan</span>
        <span>${date}</span>
      `;

      // Tugmalar
      const downloadBtn = card.querySelector('.download-btn');
      const shareBtn    = card.querySelector('.share-btn');

      if (downloadBtn) {
        downloadBtn.onclick = (e) => {
          e.stopPropagation();
          downloadCertPdf(cert.cert_id);
        };
      }
      if (shareBtn) {
        shareBtn.onclick = (e) => {
          e.stopPropagation();
          shareCert(cert.verify_url, cert.course);
        };
      }

      // Karta bosilsa — modal
      card.onclick = () => openCertModal(cert);
    });

  } catch (err) {
    console.error('Sertifikatlar yuklanmadi:', err);
  }
}

// ── MODAL ──
window.openCertModal = function(cert) {
  if (typeof cert === 'string') {
    // JSON string kelgan bo'lsa
    try { cert = JSON.parse(cert); } catch {}
  }

  const user     = api.Token.user;
  const fullName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim();
  const date     = cert.issued_at
    ? new Date(cert.issued_at).toLocaleDateString('uz-UZ')
    : new Date().toLocaleDateString('uz-UZ');

  document.getElementById('modalName')?.setAttribute('textContent', fullName);
  document.querySelectorAll('#modalName').forEach(el => el.textContent = fullName);
  document.querySelectorAll('#modalCourse').forEach(el => el.textContent = cert.course || cert);
  document.querySelectorAll('#modalDate').forEach(el => el.textContent = date);
  document.querySelectorAll('#modalId, #modalIdFooter').forEach(el => {
    el.textContent = cert.cert_id ? `ONOLAM-${cert.cert_id.slice(0,8).toUpperCase()}` : '—';
  });

  document.getElementById('certModal')?.classList.add('open');
  document.body.classList.add('no-scroll');
};

window.closeCert = function() {
  document.getElementById('certModal')?.classList.remove('open');
  document.body.classList.remove('no-scroll');
};

// ── PDF YUKLASH ──
window.downloadCertPdf = async function(certId) {
  api.showToast('PDF tayyorlanmoqda...', 'info');
  try {
    const token  = api.Token.access;
    const url    = `${api.API_BASE}/certificates/${certId}/pdf/`;
    const res    = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
    const blob   = await res.blob();
    const link   = document.createElement('a');
    link.href     = URL.createObjectURL(blob);
    link.download = `OnOlam-sertifikat-${certId.slice(0,8)}.pdf`;
    link.click();
    api.showToast('PDF yuklab olindi ✔', 'success');
  } catch (err) {
    api.showToast('PDF yuklanmadi', 'error');
  }
};

// ── ULASHISH ──
window.shareCert = function(verifyUrl, course) {
  const text = `Men OnOlam'da "${course}" kursini muvaffaqiyatli tugatdim! 🎉`;
  const url  = verifyUrl || window.location.href;

  if (navigator.share) {
    navigator.share({ title: 'OnOlam Sertifikat', text, url });
  } else {
    navigator.clipboard.writeText(`${text}\n${url}`)
      .then(() => api.showToast('Havola nusxalandi!', 'success'));
  }
};

// ── VERIFY ──
async function verifyCertificate(certId) {
  try {
    const data = await api.certificates.verify(certId);
    if (data.valid) {
      api.showToast(`✔ Sertifikat haqiqiy — ${data.user_name}`, 'success');
    }
  } catch {
    api.showToast('Sertifikat topilmadi yoki yaroqsiz', 'error');
  }
}
