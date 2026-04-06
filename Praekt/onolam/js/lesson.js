document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('onolam_access');
  if (!token) { window.location.href = 'login.html'; return; }

  // AVVAL profil yangilaymiz
  try {
    const profileRes = await fetch('http://127.0.0.1:8000/api/v1/auth/profile/', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (profileRes.ok) {
      const freshUser = await profileRes.json();
      localStorage.setItem('onolam_user', JSON.stringify(freshUser));
    }
  } catch(e) {}

  const params   = new URLSearchParams(window.location.search);
  const lessonId = params.get('id');

  if (!lessonId) {
    window.location.href = 'courses.html';
    return;
  }

  // User avatar
  const user = JSON.parse(localStorage.getItem('onolam_user') || '{}');
  const avatarEl = document.getElementById('lessonAvatar');
  if (avatarEl) {
    avatarEl.src = user.avatar ||
      'https://api.dicebear.com/7.x/pixel-art/svg?seed=' + (user.username || 'user');
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

  await loadLesson(lessonId);
});

let currentLesson = null;

async function loadLesson(id) {
  const token = localStorage.getItem('onolam_access');
  const user  = JSON.parse(localStorage.getItem('onolam_user') || '{}');
  const set   = (elId, val) => {
    const el = document.getElementById(elId);
    if (el) el.textContent = val || '';
  };

  try {
    const res = await fetch(`http://127.0.0.1:8000/api/v1/courses/lessons/${id}/`, {
      headers: { 'Authorization': 'Bearer ' + token }
    });

    if (!res.ok) {
      if (res.status === 401) {
        localStorage.clear();
        window.location.href = 'login.html';
        return;
      }
      if (res.status === 403) {
        const data = await res.json();
        if (data.upgrade_required) {
          if (confirm('Bu dars Pro uchun. Pro tarifga o\'tasizmi?')) {
            window.location.href = 'pricing.html';
          } else {
            window.location.href = 'courses.html';
          }
          return;
        }
      }
      const contentEl = document.getElementById('lessonContent');
      if (contentEl) {
        contentEl.innerHTML = `
          <div style="text-align:center;padding:32px;color:var(--red-accent);">
            <div style="font-size:40px;margin-bottom:12px;">❌</div>
            <p>Dars yuklanmadi (${res.status})</p>
            <a href="courses.html">
              <button class="btn btn-neon btn-sm" style="margin-top:16px;">
                Kurslarga qaytish →
              </button>
            </a>
          </div>`;
      }
      return;
    }

    currentLesson = await res.json();

    // Kurs ma'lumotini olish (sidebar uchun)
    if (currentLesson.course_slug) {
      try {
        const courseRes = await fetch(
          `http://127.0.0.1:8000/api/v1/courses/${currentLesson.course_slug}/`,
          { headers: { 'Authorization': 'Bearer ' + token } }
        );
        if (courseRes.ok) {
          const courseData              = await courseRes.json();
          currentLesson.course_progress = courseData.progress || 0;
          currentLesson.course_lessons  = courseData.lessons  || [];
        }
      } catch(e) {}
    }

    // Sarlavhalar
    document.title = currentLesson.title + ' — OnOlam';
    set('lessonTitle',      currentLesson.title);
    set('videoTitle',       currentLesson.title);
    set('lessonBreadcrumb', currentLesson.title);
    set('lessonCourse',     currentLesson.course_title || 'Kurs');
    set('lessonDuration',   '⏱ ' + (currentLesson.duration_minutes || 0) + ' daqiqa');

    const typeMap = {
      'text':        '📝 Matn format',
      'video':       '📹 Video format',
      'text_video':  '📝📹 Matn + Video',
      'interactive': '💻 Interaktiv'
    };
    set('lessonType', typeMap[currentLesson.lesson_type] || '📝 Matn format');

    // ── PRO OVERLAY BOSHQARUV ──
    const termOverlay = document.getElementById('termProOverlay');
    if (termOverlay) {
      termOverlay.style.display = user.is_pro ? 'none' : 'flex';
    }

    document.querySelectorAll('.video-pro-overlay').forEach(el => {
      el.style.display = user.is_pro ? 'none' : 'flex';
    });

    if (user.is_pro) {
      // Pro lock ikonalarini yashirish
      document.querySelectorAll('.pro-lock').forEach(el => {
        el.style.display = 'none';
      });
      // Tab larni to'liq ochish
      const termTab  = document.getElementById('tab-terminal');
      const videoTab = document.getElementById('tab-video');
      if (termTab)  { termTab.style.opacity = '1'; termTab.style.cursor = 'pointer'; }
      if (videoTab) { videoTab.style.opacity = '1'; videoTab.style.cursor = 'pointer'; }
    }

    // AI Chat welcome
    const welcomeText = document.getElementById('aiWelcomeText');
    const chatHints   = document.getElementById('chatHints');

    if (welcomeText) {
      welcomeText.innerHTML = `
        Salom, <strong>${user.first_name || 'foydalanuvchi'}</strong>! 👋
        Men <strong>OnOlam AI</strong> yordamchisiman.<br><br>
        📚 <strong>${currentLesson.course_title || 'Kurs'}</strong> bo'yicha
        savollaringizga javob beraman.<br><br>
        ${!user.is_pro
          ? '⚡ Kunlik <strong>3 ta savol</strong> huquqingiz bor. <a href="pricing.html" style="color:var(--neon);">Pro</a> tarifda cheksiz!'
          : '✅ Pro foydalanuvchi — cheksiz savollar!'}`;
    }

    if (chatHints) {
      const hints = [
        `${currentLesson.title} haqida tushuntir`,
        'Bu darsda nimani o\'rganaman?',
        'Misol ko\'rsat',
        'Keyingi darsda nima bo\'ladi?',
      ];
      chatHints.innerHTML = hints.map(h => `
        <div class="chat-hint" onclick="useHint('${h.replace(/'/g, "\\'")}')">${h}</div>
      `).join('');
    }

    // Sidebar
    set('sidebarCourse', currentLesson.course_title || 'Kurs');
    const sidebarProg = document.getElementById('sidebarProg');
    const sidebarPct  = document.getElementById('sidebarPct');
    if (sidebarProg) sidebarProg.style.width = (currentLesson.course_progress || 0) + '%';
    if (sidebarPct)  sidebarPct.textContent  = (currentLesson.course_progress || 0) + '% tugallandi';

    // Darslar ro'yxati
    const lessonList = document.getElementById('lessonList');
    if (lessonList && currentLesson.course_lessons?.length) {
      lessonList.innerHTML = currentLesson.course_lessons.map((l, i) => {
        const isCurrent = l.id === currentLesson.id;
        const isDone    = l.is_completed;
        const isPro     = l.access_type === 'pro' && !user.is_pro;

        let icon = '📄';
        if (isDone)    icon = '✅';
        if (isCurrent) icon = '▶';
        if (isPro)     icon = '🔒';

        return `
          <div class="ln-item ${isCurrent ? 'active' : ''}"
               onclick="${isPro
                 ? 'location.href=\'pricing.html\''
                 : `location.href='lesson.html?id=${l.id}'`}"
               style="cursor:pointer;${isPro ? 'opacity:.6;' : ''}">
            <span class="li-num">${i + 1}</span>
            <span class="li-icon">${icon}</span>
            <span class="li-title">
              ${l.title}
              ${l.access_type === 'pro'
                ? '<span class="badge badge-pro" style="font-size:9px;margin-left:4px;">Pro</span>'
                : ''}
            </span>
            ${isDone    ? '<span class="li-done" style="color:var(--neon)">✔</span>'    : ''}
            ${isCurrent ? '<span class="li-done" style="color:var(--yellow)">●</span>' : ''}
          </div>`;
      }).join('');
    }

    // Kontent
    const contentEl = document.getElementById('lessonContent');
    if (contentEl) {
      if (currentLesson.content) {
        contentEl.innerHTML = currentLesson.content;
      } else {
        contentEl.innerHTML = `
          <div style="text-align:center;padding:32px;color:var(--text-3);">
            <div style="font-size:40px;margin-bottom:12px;">📝</div>
            <p>Bu dars uchun kontent hali qo'shilmagan.</p>
          </div>`;
      }
    }

    // Video
    if (currentLesson.video_file) {
      const videoEl  = document.getElementById('lessonVideo');
      const iframeEl = document.getElementById('lessonIframe');
      const url      = currentLesson.video_file;

      // YouTube yoki boshqa embed URL
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        // YouTube embed
        let embedUrl = url;
        if (url.includes('watch?v=')) {
          embedUrl = 'https://www.youtube.com/embed/' + url.split('watch?v=')[1].split('&')[0];
        } else if (url.includes('youtu.be/')) {
          embedUrl = 'https://www.youtube.com/embed/' + url.split('youtu.be/')[1];
        }
        if (iframeEl) { iframeEl.src = embedUrl; iframeEl.style.display = 'block'; }
        if (videoEl)  videoEl.style.display = 'none';
      } else {
        // MP4 yoki boshqa video fayl
        if (videoEl) {
          videoEl.src           = url;
          videoEl.style.display = 'block';
          videoEl.load();
        }
        if (iframeEl) iframeEl.style.display = 'none';
      }
    }

    // Quiz
    if (currentLesson.quiz) renderQuiz(currentLesson.quiz);

    // Footer nav
    const lessons    = currentLesson.course_lessons || [];
    const currentIdx = lessons.findIndex(l => l.id === currentLesson.id);
    const totalNum   = document.getElementById('lessonTotalNum');
    const orderNum   = document.getElementById('lessonOrderNum');
    const prevBtn    = document.getElementById('prevLessonBtn');

    if (totalNum) totalNum.textContent = lessons.length || 1;
    if (orderNum) orderNum.textContent = currentIdx >= 0 ? currentIdx + 1 : 1;
    if (prevBtn && currentIdx > 0) {
      prevBtn.style.display = 'inline-flex';
      prevBtn.onclick = () => {
        window.location.href = `lesson.html?id=${lessons[currentIdx - 1].id}`;
      };
    }

  } catch(e) {
    console.error('Dars yuklanmadi:', e);
    const contentEl = document.getElementById('lessonContent');
    if (contentEl) {
      contentEl.innerHTML = `
        <div style="text-align:center;padding:32px;color:var(--red-accent);">
          <p>❌ Xato: ${e.message}</p>
          <a href="courses.html">
            <button class="btn btn-neon btn-sm" style="margin-top:12px;">Qaytish →</button>
          </a>
        </div>`;
    }
  }
}

// Quiz
function renderQuiz(quiz) {
  const container = document.getElementById('quizContainer');
  if (!container) return;
  container.innerHTML = `
    <div class="quiz-block">
      <h4>🎯 Bilimni tekshiring</h4>
      <p style="font-size:13px;color:var(--text-3);margin-bottom:16px;">${quiz.question}</p>
      <div class="quiz-options">
        ${quiz.options.map((opt, i) => `
          <div class="qopt" onclick="selectQuizOption(this,'${opt.id}')"
               data-option-id="${opt.id}">
            <div class="qo-num">${String.fromCharCode(65+i)}</div>
            ${opt.text}
          </div>
        `).join('')}
      </div>
    </div>`;
}

window.selectQuizOption = function(el, optionId) {
  document.querySelectorAll('.qopt').forEach(o => {
    o.classList.remove('selected');
    o.style.borderColor = '';
  });
  el.classList.add('selected');
  el.style.borderColor = 'var(--neon)';
  window._selectedQuiz = optionId;
};

window.completeLesson = async function() {
  if (!currentLesson) return;
  const token = localStorage.getItem('onolam_access');
  const btn   = document.getElementById('completeLessonBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Saqlanmoqda...'; }

  try {
    const res  = await fetch(
      `http://127.0.0.1:8000/api/v1/courses/lessons/${currentLesson.id}/complete/`,
      {
        method:  'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type':  'application/json'
        },
        body: JSON.stringify({ quiz_answer_id: window._selectedQuiz || null })
      }
    );
    const data = await res.json();

    if (res.ok) {
      if (btn) btn.textContent = '✔ Tugatildi';
      const progBar = document.getElementById('lessonProgBar');
      const pctEl   = document.getElementById('lessonPct');
      if (progBar) progBar.style.width = (data.progress || 0) + '%';
      if (pctEl)   pctEl.textContent   = (data.progress || 0) + '%';

      if (data.certificate) {
        if (confirm('🎉 Kursni tugatdingiz! Sertifikat sahifasiga o\'tasizmi?')) {
          window.location.href = 'certificate.html';
          return;
        }
      }
      if (data.next_lesson_id) {
        setTimeout(() => {
          window.location.href = `lesson.html?id=${data.next_lesson_id}`;
        }, 1000);
      } else {
        alert(data.message || 'Dars tugatildi ✔');
      }
    } else {
      alert(data.error || 'Xatolik');
      if (btn) { btn.disabled = false; btn.textContent = 'Tugatdim ✔'; }
    }
  } catch(e) {
    alert('Server bilan bog\'lanib bo\'lmadi');
    if (btn) { btn.disabled = false; btn.textContent = 'Tugatdim ✔'; }
  }
};

window.sendAiMessage = async function() {
  const input = document.getElementById('chatInput');
  const msg   = input?.value.trim();
  if (!msg) return;

  const token = localStorage.getItem('onolam_access');
  const msgs  = document.getElementById('chatMessages');
  input.value = '';

  if (msgs) {
    msgs.innerHTML += `
      <div style="display:flex;justify-content:flex-end;margin-bottom:10px;">
        <div style="background:rgba(0,255,65,.08);border:1px solid rgba(0,255,65,.2);
                    border-radius:10px;padding:10px 14px;font-size:13px;max-width:80%;">
          ${msg}
        </div>
      </div>`;
    msgs.scrollTop = msgs.scrollHeight;
  }

  const typingId = 'typing_' + Date.now();
  if (msgs) {
    msgs.innerHTML += `
      <div id="${typingId}" style="display:flex;gap:8px;margin-bottom:10px;">
        <div style="font-size:20px;">🤖</div>
        <div style="background:var(--surface);border:1px solid var(--border);
                    border-radius:10px;padding:10px 14px;font-size:13px;">
          ⏳ Javob tayyorlanmoqda...
        </div>
      </div>`;
    msgs.scrollTop = msgs.scrollHeight;
  }

  try {
    const res  = await fetch('http://127.0.0.1:8000/api/v1/ai/chat/', {
      method:  'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type':  'application/json'
      },
      body: JSON.stringify({ message: msg, lesson_id: currentLesson?.id || null })
    });

    document.getElementById(typingId)?.remove();
    const data = await res.json();

    if (msgs) {
      if (res.ok) {
        const u     = JSON.parse(localStorage.getItem('onolam_user') || '{}');
        const limit = !u.is_pro
          ? `<div style="font-size:10px;color:var(--text-3);margin-top:6px;">
               ${data.remaining || 0} ta savol qoldi
             </div>` : '';
        msgs.innerHTML += `
          <div style="display:flex;gap:8px;margin-bottom:10px;">
            <div style="font-size:20px;">🤖</div>
            <div style="background:var(--surface);border:1px solid var(--border);
                        border-radius:10px;padding:10px 14px;font-size:13px;max-width:80%;">
              ${data.reply}${limit}
            </div>
          </div>`;
      } else if (res.status === 429) {
        msgs.innerHTML += `
          <div style="display:flex;gap:8px;margin-bottom:10px;">
            <div style="font-size:20px;">🤖</div>
            <div style="background:var(--surface);border:1px solid rgba(255,215,0,.3);
                        border-radius:10px;padding:10px 14px;font-size:13px;color:var(--yellow);">
              ⚠️ Kunlik limit tugadi.
              <a href="pricing.html" style="color:var(--neon);">Pro tarifga o'ting →</a>
            </div>
          </div>`;
      }
      msgs.scrollTop = msgs.scrollHeight;
    }
  } catch(e) {
    document.getElementById(typingId)?.remove();
  }
};

document.getElementById('chatInput')?.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    window.sendAiMessage();
  }
});

window.useHint = function(text) {
  const input = document.getElementById('chatInput');
  if (input) {
    input.value = text;
    window.sendAiMessage();
  }
};
