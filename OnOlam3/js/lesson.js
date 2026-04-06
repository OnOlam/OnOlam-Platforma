/**
 * OnOlam — lesson.html uchun JS
 */
document.addEventListener('DOMContentLoaded', async () => {

  if (!api.requireLogin()) return;
  api.updateNavUser();

  // URL parametrlarini olish
  const params   = new URLSearchParams(window.location.search);
  const lessonId = params.get('id');
  const courseSlug = params.get('course');

  if (!lessonId) {
    api.showToast('Dars topilmadi', 'error');
    location.href = 'courses.html';
    return;
  }

  await loadLesson(lessonId);
});

let currentLesson = null;
let videoProgressInterval = null;

// ── DARSNI YUKLASH ──
async function loadLesson(id) {
  try {
    currentLesson = await api.courses.lesson(id);

    // Sarlavha
    document.title = `${currentLesson.title} — OnOlam`;
    const titleEl = document.getElementById('lessonTitle');
    if (titleEl) titleEl.textContent = currentLesson.title;

    // Kontent
    const contentEl = document.getElementById('lessonContent');
    if (contentEl && currentLesson.content) {
      contentEl.innerHTML = currentLesson.content;
    }

    // Video
    if (currentLesson.video_file && currentLesson.access_type !== 'pro') {
      setupVideo(currentLesson);
    }

    // Pro overlay
    if (currentLesson.access_type === 'pro' && !api.Token.isPro()) {
      showProOverlay();
    }

    // Quiz
    if (currentLesson.quiz) {
      renderQuiz(currentLesson.quiz);
    }

  } catch (err) {
    if (err?.status === 403 && err?.data?.upgrade_required) {
      showProOverlay();
    } else {
      api.showError(err);
    }
  }
}

// ── DARSNI TUGATISH ──
window.completeLesson = async function() {
  if (!currentLesson) return;

  const btn = document.getElementById('completeLessonBtn');
  api.setLoading(btn, true);

  try {
    // Quiz javobini olish
    const selectedOption = document.querySelector('.quiz-option.selected');
    const quizAnswerId   = selectedOption?.dataset?.optionId || null;

    const data = await api.courses.completeLesson(currentLesson.id, quizAnswerId);

    api.showToast(data.message, 'success');

    // Progress yangilash
    const progressEl = document.getElementById('lessonProgress');
    if (progressEl) progressEl.style.width = (data.progress || 0) + '%';

    // Sertifikat olinsa
    if (data.certificate) {
      setTimeout(() => {
        if (confirm('🎉 Kursni tugatdingiz! Sertifikat olish uchun sertifikatlar sahifasiga o\'tasizmi?')) {
          location.href = 'certificate.html';
        }
      }, 1000);
    }

    // Keyingi darsga o'tish
    if (data.next_lesson_id) {
      setTimeout(() => {
        location.href = `lesson.html?id=${data.next_lesson_id}`;
      }, 1500);
    }

    api.setLoading(btn, false, 'Tugatdim ✔');

  } catch (err) {
    api.setLoading(btn, false, 'Tugatdim ✔');
    api.showError(err);
  }
};

// ── VIDEO ──
function setupVideo(lesson) {
  const videoEl = document.getElementById('lessonVideo');
  if (!videoEl || !lesson.video_file) return;

  videoEl.src = lesson.video_file;

  // Video progress saqlash (har 10 soniyada)
  videoEl.addEventListener('timeupdate', () => {
    if (videoProgressInterval) return;
    videoProgressInterval = setInterval(async () => {
      if (!videoEl.paused) {
        await api.courses.updateVideoProgress(lesson.id, Math.floor(videoEl.currentTime));
      }
    }, 10000);
  });
}

// ── QUIZ ──
function renderQuiz(quiz) {
  const quizContainer = document.getElementById('quizContainer');
  if (!quizContainer) return;

  quizContainer.innerHTML = `
    <div class="quiz-question">${quiz.question}</div>
    <div class="quiz-options">
      ${quiz.options.map(opt => `
        <div class="quiz-option" data-option-id="${opt.id}" onclick="selectQuizOption(this)">
          ${opt.text}
        </div>
      `).join('')}
    </div>
  `;
  quizContainer.style.display = 'block';
}

window.selectQuizOption = function(el) {
  document.querySelectorAll('.quiz-option').forEach(o => {
    o.classList.remove('selected', 'correct', 'wrong');
  });
  el.classList.add('selected');
};

// ── PRO OVERLAY ──
function showProOverlay() {
  const overlays = document.querySelectorAll('.pro-overlay');
  overlays.forEach(el => el.style.display = 'flex');
}

// ── AI CHAT ──
window.sendAiMessage = async function() {
  const input = document.getElementById('aiInput');
  const msg   = input?.value.trim();
  if (!msg) return;

  input.value = '';

  const msgsContainer = document.getElementById('aiMessages');
  if (!msgsContainer) return;

  // Foydalanuvchi xabari
  msgsContainer.innerHTML += `
    <div class="ai-msg user">
      <div class="ai-bubble">${msg}</div>
    </div>
  `;

  // Typing animatsiya
  const typingId = 'typing-' + Date.now();
  msgsContainer.innerHTML += `
    <div class="ai-msg bot" id="${typingId}">
      <div class="ai-bubble">
        <span class="typing-dots"><span></span><span></span><span></span></span>
      </div>
    </div>
  `;
  msgsContainer.scrollTop = msgsContainer.scrollHeight;

  try {
    const data = await api.aiChat.send(msg, currentLesson?.id);

    // Typing ni o'chirish
    document.getElementById(typingId)?.remove();

    // AI javobi
    msgsContainer.innerHTML += `
      <div class="ai-msg bot">
        <div class="ai-bubble">${data.reply}</div>
      </div>
    `;

    // Limit ko'rsatish
    if (!api.Token.isPro()) {
      const remaining = data.remaining || 0;
      const limitEl = document.getElementById('aiLimit');
      if (limitEl) limitEl.textContent = `${remaining} ta savol qoldi`;
    }

  } catch (err) {
    document.getElementById(typingId)?.remove();

    if (err?.status === 429) {
      msgsContainer.innerHTML += `
        <div class="ai-msg bot">
          <div class="ai-bubble" style="color:var(--yellow);">
            ⚠️ Kunlik limit tugadi.
            ${!api.Token.isPro() ? '<br><a href="pricing.html" style="color:var(--neon);">Pro tarifga o\'ting →</a>' : ''}
          </div>
        </div>
      `;
    } else {
      api.showError(err);
    }
  }

  msgsContainer.scrollTop = msgsContainer.scrollHeight;
};

// Enter bilan yuborish
document.getElementById('aiInput')?.addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    window.sendAiMessage();
  }
});
