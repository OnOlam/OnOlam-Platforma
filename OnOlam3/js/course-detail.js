/**
 * OnOlam — course-detail.html uchun JS
 */
document.addEventListener('DOMContentLoaded', async () => {
  api.updateNavUser();

  // URL dan slug olish
  const params = new URLSearchParams(window.location.search);
  const slug   = params.get('slug');
  if (!slug) return;

  try {
    const course = await api.courses.detail(slug);

    // Sarlavha
    document.title = `${course.title} — OnOlam`;
    document.querySelectorAll('.course-title').forEach(el => el.textContent = course.title);

    // Enroll tugmasi
    const enrollBtn = document.getElementById('enrollBtn');
    if (enrollBtn) {
      if (course.is_enrolled) {
        enrollBtn.textContent = 'Davom ettirish →';
        enrollBtn.onclick = () => {
          const firstLesson = course.lessons?.[0];
          if (firstLesson) location.href = `lesson.html?id=${firstLesson.id}`;
        };
      } else {
        enrollBtn.onclick = async () => {
          if (!api.Token.isLoggedIn()) {
            location.href = 'login.html'; return;
          }
          try {
            await api.courses.enroll(slug);
            api.showToast('Kursga yozildingiz!', 'success');
            enrollBtn.textContent = 'Davom ettirish →';
          } catch (err) {
            if (err?.data?.upgrade_required) {
              if (confirm('Pro kurs. Pro tarifga o\'tasizmi?'))
                location.href = 'pricing.html';
            } else api.showError(err);
          }
        };
      }

      // Progress
      if (course.progress > 0) {
        const progBar = document.getElementById('courseProgressBar');
        if (progBar) progBar.style.width = course.progress + '%';
        const progPct = document.getElementById('courseProgressPct');
        if (progPct) progPct.textContent = course.progress + '%';
      }
    }

  } catch (err) {
    console.error('Kurs yuklanmadi:', err);
  }
});
