const COMM_API = 'https://onolam-platforma.onrender.com/api/v1';
let currentChannel = 'umumiy';

window.addEventListener('load', async () => {
  const token = localStorage.getItem('onolam_access');
  if (!token) { window.location.href = 'login.html'; return; }

  try {
    const res  = await fetch(COMM_API + '/auth/profile/', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (res.ok) {
      const user = await res.json();
      localStorage.setItem('onolam_user', JSON.stringify(user));
      const proGate = document.getElementById('proGate');
      if (proGate) proGate.style.display = user.is_pro ? 'none' : 'flex';
      if (!user.is_pro) return;
      const npAv = document.getElementById('npAvatar');
      if (npAv) npAv.src = user.avatar || 'https://api.dicebear.com/7.x/pixel-art/svg?seed=' + user.username;
    }
  } catch(e) { console.error(e); }

  await loadChannels();
  await loadSidebarStats();
  await loadPosts();

  document.querySelectorAll('.exit').forEach(el => {
    el.addEventListener('click', async e => {
      e.preventDefault();
      if (confirm('Chiqishni xohlaysizmi?')) {
        const token   = localStorage.getItem('onolam_access');
        const refresh = localStorage.getItem('onolam_refresh');
        if (token) {
          try {
            await fetch('https://onolam-platforma.onrender.com/api/v1/auth/logout/', {
              method:  'POST',
              headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
              body:    JSON.stringify({ refresh_token: refresh || '' })
            });
          } catch(e) {}
        }
        localStorage.clear();
        window.location.href = 'login.html';
      }
    });
  });
});


async function loadChannels() {
  const token = localStorage.getItem('onolam_access');
  const el    = document.getElementById('channelList');
  if (!el) return;
  try {
    const res  = await fetch(COMM_API + '/community/channels/', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await res.json();
    el.innerHTML = data.channels.map((ch, i) =>
      '<div class="channel ' + (i===0 ? 'active' : '') + '" id="ch-' + ch.slug + '" ' +
      'onclick="switchChannel(\'' + ch.slug + '\',\'' + ch.name + '\',\'' + ch.description + '\')" ' +
      'style="cursor:pointer;">' +
      '<span class="ch-icon">' + ch.icon + '</span>' +
      '<div class="ch-info"><div class="ch-name">' + ch.name + '</div></div>' +
      (ch.new_count > 0 ? '<div class="ch-badge" style="background:var(--neon);color:black;">' + ch.new_count + '</div>' : (ch.post_count > 0 ? '<div class="ch-badge" style="background:var(--surface-2);color:var(--text-3);opacity:.6;">' + ch.post_count + '</div>' : '')) +
      '</div>'
    ).join('');
  } catch(e) { el.innerHTML = '<div style="padding:8px;color:var(--text-3);">Yuklanmadi</div>'; }
}

// Mobil — hamburger tugmani ko'rsatish
function checkMobile() {
  const btn = document.getElementById('sidebarToggle');
  if (btn) btn.style.display = window.innerWidth <= 768 ? 'block' : 'none';
}
checkMobile();
window.addEventListener('resize', checkMobile);

window.toggleMonthAccordion = function(monthId) {
  const el    = document.getElementById(monthId);
  const arrow = document.getElementById('arrow_' + monthId) || document.getElementById('arrow-' + monthId);
  if (!el) return;
  if (el.style.display === 'none') {
    el.style.display = 'block';
    if (arrow) arrow.textContent = '▲';
  } else {
    el.style.display = 'none';
    if (arrow) arrow.textContent = '▼';
  }
};

window.switchChannel = async function(slug, name, desc) {
  currentChannel = slug;
  document.querySelectorAll('.channel').forEach(c => c.classList.remove('active'));
  const active = document.getElementById('ch-' + slug);
  if (active) active.classList.add('active');
  const nameEl = document.getElementById('channelName');
  const descEl = document.getElementById('channelDesc');
  if (nameEl) nameEl.textContent = name;
  if (descEl) descEl.textContent = desc;
  await loadPosts();
};

async function loadPosts() {
  const token = localStorage.getItem('onolam_access');
  const box   = document.getElementById('postsBox');
  if (!box) return;

  box.innerHTML = '<div style="text-align:center;padding:32px;color:var(--text-3);">Yuklanmoqda...</div>';

  try {
    const res  = await fetch(COMM_API + '/community/posts/?channel=' + currentChannel, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await res.json();

    if (!data.posts || !data.posts.length) {
      box.innerHTML = '<div style="text-align:center;padding:48px;color:var(--text-3);">' +
        '<div style="font-size:40px;margin-bottom:12px;">💬</div>' +
        '<p>Hali post yoq. Birinchi bolib yozing!</p></div>';
      return;
    }

    const now    = new Date();
    const monthNames = ['Yanvar','Fevral','Mart','Aprel','May','Iyun',
                        'Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr'];
    const dayNames   = ['Yak','Dush','Sesh','Chor','Pay','Jum','Shan'];

    // Postlarni oylarga guruhlash
    const months = {};
    data.posts.forEach(p => {
      const d   = new Date(p.created_at);
      const key = d.getFullYear() + '-' + String(d.getMonth()).padStart(2,'0');
      if (!months[key]) months[key] = {
        label: monthNames[d.getMonth()] + ' ' + d.getFullYear(),
        year:  d.getFullYear(),
        month: d.getMonth(),
        posts: []
      };
      months[key].posts.push(p);
    });

    // Oylarni yangi-eskiga tartiblash
    const sortedMonths = Object.keys(months).sort((a,b) => b.localeCompare(a));
    const currentKey   = now.getFullYear() + '-' + String(now.getMonth()).padStart(2,'0');

    let html = '';

    sortedMonths.forEach(mKey => {
      const month     = months[mKey];
      const isCurrent = mKey === currentKey;

      if (isCurrent) {
        // Hozirgi oy — ochiq, kunlarga bo'lingan
        html += '<div style="margin-bottom:24px;">' +
          '<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;' +
          'padding:10px 14px;background:var(--void-3);border-radius:var(--r-lg);' +
          'border:1px solid var(--border);">' +
          '<span>📅</span>' +
          '<span style="font-size:14px;font-weight:800;color:var(--neon);">' + month.label + '</span>' +
          '<span style="font-size:12px;color:var(--text-4);margin-left:auto;">' + month.posts.length + ' post</span>' +
          '</div>';

        // Kunlarga guruhlash
        const days = {};
        month.posts.forEach(p => {
          const d    = new Date(p.created_at);
          const dKey = d.getFullYear() + '-' + String(d.getMonth()).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
          const dLabel = dayNames[d.getDay()] + ', ' + d.getDate() + ' ' + monthNames[d.getMonth()];
          if (!days[dKey]) days[dKey] = { label: dLabel, posts: [] };
          days[dKey].posts.push(p);
        });

        // Kunlarni yangi-eskiga tartiblash
        const sortedDays = Object.keys(days).sort((a,b) => b.localeCompare(a));

        sortedDays.forEach(dKey => {
          const day = days[dKey];
          html += '<div style="margin-bottom:12px;">' +
            '<div style="font-size:12px;color:var(--text-3);font-weight:600;' +
            'padding:4px 8px;margin-bottom:6px;border-left:2px solid var(--neon);">📍 ' + day.label + '</div>';
          // Kun ichida yangi post yuqorida
          html += day.posts
            .sort((a,b) => new Date(b.created_at) - new Date(a.created_at))
            .map(p => renderPost(p)).join('');
          html += '</div>';
        });

        html += '</div>';

      } else {
        // O'tgan oylar — yopiq accordion
        const mId = 'month_' + mKey.replace('-','_');
        html += '<div style="margin-bottom:12px;">' +
          '<div onclick="toggleMonthAccordion(\'' + mId + '\')" ' +
          'style="display:flex;align-items:center;gap:10px;padding:10px 14px;' +
          'background:var(--surface);border:1px solid var(--border);' +
          'border-radius:var(--r-lg);cursor:pointer;">' +
          '<span>📅</span>' +
          '<span style="font-size:13px;font-weight:700;">' + month.label + '</span>' +
          '<span style="font-size:12px;color:var(--text-4);margin-left:auto;">' + month.posts.length + ' post</span>' +
          '<span id="arrow_' + mId + '" style="color:var(--text-4);font-size:12px;margin-left:8px;">▼</span>' +
          '</div>' +
          '<div id="' + mId + '" style="display:none;margin-top:8px;">' +
          month.posts
            .sort((a,b) => new Date(b.created_at) - new Date(a.created_at))
            .map(p => renderPost(p)).join('') +
          '</div>' +
          '</div>';
      }
    });

    box.innerHTML = html || '<div style="text-align:center;padding:48px;color:var(--text-3);">Hali post yoq</div>';

  } catch(e) {
    box.innerHTML = '<div style="padding:16px;color:var(--red-accent);">Yuklab bolmadi</div>';
  }
}



function renderPost(post) {
  const av   = post.user.avatar || ('https://api.dicebear.com/7.x/pixel-art/svg?seed=' + post.user.username);
  const date = new Date(post.created_at);
  const now  = new Date();
  const diff = Math.floor((now - date) / 1000);

  // Vaqt formatlash
  const hour  = date.getHours().toString().padStart(2,'0');
  const min   = date.getMinutes().toString().padStart(2,'0');
  const day   = date.getDate();
  const month = ['Yan','Fev','Mar','Apr','May','Iyun','Iyul','Avg','Sen','Okt','Noy','Dek'][date.getMonth()];
  const year  = date.getFullYear();
  const days  = Math.floor(diff/86400);

  let timeStr = '';
  if (diff < 60)        timeStr = 'Hozirgina';
  else if (diff < 3600) timeStr = Math.floor(diff/60) + ' daqiqa oldin';
  else if (diff < 86400) timeStr = Math.floor(diff/3600) + ' soat oldin · ' + hour + ':' + min;
  else if (days < 7)    timeStr = days + ' kun oldin · ' + hour + ':' + min;
  else if (year === now.getFullYear()) timeStr = day + ' ' + month + ' · ' + hour + ':' + min;
  else                  timeStr = day + ' ' + month + ' ' + year + ' · ' + hour + ':' + min;

  const btns = post.is_own
    ? '<div style="display:flex;gap:4px;">' +
      '<button onclick="editPost(' + post.id + ')" title="Tahrirlash" ' +
      'style="background:none;border:none;color:var(--text-4);cursor:pointer;font-size:13px;padding:4px;">✏️</button>' +
      '<button onclick="deletePost(' + post.id + ')" title="Ochirish" ' +
      'style="background:none;border:none;color:var(--text-4);cursor:pointer;font-size:13px;padding:4px;">🗑</button>' +
      '</div>'
    : '';

  return [
    '<div class="post-card" id="post-' + post.id + '" style="' +
      'background:var(--surface);' +
      'border:1px solid var(--border);' +
      'border-radius:var(--r-xl);' +
      'padding:16px 20px;' +
      'margin-bottom:12px;' +
      'transition:border-color .2s;">',

      // Header
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">',
        '<img src="' + av + '" style="width:38px;height:38px;border-radius:50%;' +
          'border:2px solid var(--border);flex-shrink:0;">',
        '<div style="flex:1;min-width:0;">',
          '<div style="font-size:13px;font-weight:700;display:flex;align-items:center;gap:6px;">' +
            escapeHtml(post.user.name) +
            (post.user.is_pro ? ' <span class="badge badge-pro" style="font-size:9px;">Pro</span>' : '') +
          '</div>',
          '<div style="font-size:11px;color:var(--text-4);margin-top:2px;">' +
            '🕐 ' + timeStr +
          '</div>',
        '</div>',
        btns,
      '</div>',

      // Kontent
      '<p data-content="true" style="font-size:14px;color:var(--text-1);' +
        'line-height:1.8;margin-bottom:12px;white-space:pre-wrap;">' +
        escapeHtml(post.content) + '</p>',

      // Media
      (post.image ? '<img src="' + (post.image.startsWith('http') ? post.image : 'http://127.0.0.1:8000' + post.image) + '" ' +
        'onclick="openImageViewer(this.src)" ' +
        'style="width:100%;border-radius:var(--r-lg);margin-bottom:12px;max-height:320px;' +
        'object-fit:cover;cursor:pointer;">' : ''),

      (post.video ? '<video controls src="' + (post.video.startsWith('http') ? post.video : 'http://127.0.0.1:8000' + post.video) + '" ' +
        'style="width:100%;border-radius:var(--r-lg);margin-bottom:12px;max-height:300px;"></video>' : ''),

      (post.file ? '<a href="' + (post.file.startsWith('http') ? post.file : 'http://127.0.0.1:8000' + post.file) + '" ' +
        'download="' + (post.file_name||'fayl') + '" target="_blank" ' +
        'style="display:inline-flex;align-items:center;gap:8px;padding:8px 14px;' +
        'background:var(--void-3);border:1px solid var(--border);' +
        'border-radius:var(--r-md);font-size:13px;color:var(--neon);' +
        'text-decoration:none;margin-bottom:12px;">📎 ' + (post.file_name||'Fayl') + '</a>' : ''),

      (post.link ? '<a href="' + post.link + '" target="_blank" ' +
        'style="display:inline-flex;align-items:center;gap:8px;padding:8px 14px;' +
        'background:var(--void-3);border:1px solid var(--border);' +
        'border-radius:var(--r-md);font-size:13px;color:var(--neon);' +
        'text-decoration:none;margin-bottom:12px;">🔗 ' + escapeHtml(post.link) + '</a>' : ''),

      // Footer
      '<div style="display:flex;align-items:center;gap:16px;' +
        'padding-top:10px;border-top:1px solid var(--border);">',
        '<button onclick="likePost(' + post.id + ',this)" ' +
          'style="background:none;border:none;cursor:pointer;' +
          'color:' + (post.is_liked ? 'var(--red)' : 'var(--text-3)') + ';' +
          'font-size:13px;display:flex;align-items:center;gap:4px;">' +
          (post.is_liked ? '❤️' : '🤍') + ' <span>' + post.like_count + '</span>' +
        '</button>',
        '<button onclick="toggleComments(' + post.id + ')" ' +
          'style="background:none;border:none;cursor:pointer;' +
          'color:var(--text-3);font-size:13px;display:flex;align-items:center;gap:4px;">' +
          '💬 <span>' + post.comment_count + '</span>' +
        '</button>',
      '</div>',

      // Izohlar
      '<div id="comments-' + post.id + '" style="display:none;margin-top:12px;"></div>',

    '</div>'
  ].join('');
}


let selectedMedia = { type: null, file: null };

window.toggleMediaMenu = function() {
  const menu = document.getElementById('mediaMenu');
  if (menu) menu.style.display = menu.style.display === 'none' ? 'flex' : 'none';
};

window.closeMediaMenu = function() {
  const menu = document.getElementById('mediaMenu');
  if (menu) menu.style.display = 'none';
};

window.selectMedia = function(type) {
  if (type === 'image') {
    document.getElementById('mediaImageInput').click();
  } else if (type === 'video') {
    document.getElementById('mediaVideoInput').click();
  } else if (type === 'file') {
    document.getElementById('mediaFileInput').click();
  } else if (type === 'link') {
    const linkDiv = document.getElementById('linkInput');
    if (linkDiv) linkDiv.style.display = linkDiv.style.display === 'none' ? 'block' : 'none';
  }
};

window.handleMediaSelect = function(input, type) {
  const file    = input.files[0];
  const preview = document.getElementById('mediaPreview');
  if (!file || !preview) return;

  // Video tekshirish — 2 daqiqa
  if (type === 'video') {
    const video = document.createElement('video');
    video.src   = URL.createObjectURL(file);
    video.onloadedmetadata = function() {
      if (video.duration > 180) {
        alert('Video 3 daqiqadan oshmasligi kerak!');
        input.value = '';
        selectedMedia = { type: null, file: null };
        preview.innerHTML = '';
        return;
      }
      selectedMedia = { type, file };
      preview.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;padding:6px 10px;
                    background:var(--surface);border:1px solid var(--border);
                    border-radius:var(--r-md);font-size:12px;color:var(--text-2);">
          🎥 ${file.name} (${(file.size/1024/1024).toFixed(1)}MB)
          <button onclick="clearMedia()" style="margin-left:auto;background:none;border:none;
                  color:var(--text-4);cursor:pointer;">✕</button>
        </div>`;
    };
    return;
  }

  selectedMedia = { type, file };

  if (type === 'image') {
    const reader = new FileReader();
    reader.onload = e => {
      preview.innerHTML = `
        <div style="position:relative;display:inline-block;">
          <img src="${e.target.result}" style="max-height:150px;border-radius:var(--r-md);border:1px solid var(--border);">
          <button onclick="clearMedia()" style="position:absolute;top:4px;right:4px;
                  background:rgba(0,0,0,.6);border:none;color:white;border-radius:50%;
                  width:20px;height:20px;cursor:pointer;font-size:10px;">✕</button>
        </div>`;
    };
    reader.readAsDataURL(file);
  } else {
    preview.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;padding:6px 10px;
                  background:var(--surface);border:1px solid var(--border);
                  border-radius:var(--r-md);font-size:12px;color:var(--text-2);">
        📎 ${file.name} (${(file.size/1024).toFixed(0)}KB)
        <button onclick="clearMedia()" style="margin-left:auto;background:none;border:none;
                color:var(--text-4);cursor:pointer;">✕</button>
      </div>`;
  }
};

window.clearMedia = function() {
  selectedMedia = { type: null, file: null };
  const preview = document.getElementById('mediaPreview');
  if (preview) preview.innerHTML = '';
  ['mediaImageInput','mediaVideoInput','mediaFileInput'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
};

window.submitPost = async function() {
  const token   = localStorage.getItem('onolam_access');
  const input   = document.getElementById('newPostInput');
  const content = input ? input.value.trim() : '';
  const link    = document.getElementById('postLink')?.value.trim() || '';

  if (!content && !selectedMedia.file && !link) { alert('Biror narsa kiriting!'); return; }

  const formData = new FormData();
  formData.append('content',    content);
  formData.append('channel',    currentChannel);
  formData.append('post_type',  'text');
  if (link) formData.append('link', link);

  // Media qo'shish
  if (selectedMedia.file) {
    formData.append(selectedMedia.type, selectedMedia.file);
    if (selectedMedia.type === 'file') {
      formData.append('file_name', selectedMedia.file.name);
    }
  }

  try {
    const res  = await fetch(COMM_API + '/community/posts/create/', {
      method:  'POST',
      headers: { 'Authorization': 'Bearer ' + token },
      body:    formData
    });
    const data = await res.json();
    if (res.ok) {
      input.value = '';
      clearMedia();
      const linkDiv = document.getElementById('linkInput');
      if (linkDiv) linkDiv.style.display = 'none';
      const postLink = document.getElementById('postLink');
      if (postLink) postLink.value = '';
      const box = document.getElementById('postsBox');
      if (box) box.insertAdjacentHTML('afterbegin', renderPost(data.post));
    } else {
      alert(data.error || 'Xatolik');
    }
  } catch(e) { alert('Server bilan boglanib bolmadi'); }
};

window.likePost = async function(postId, btn) {
  const token = localStorage.getItem('onolam_access');
  try {
    const res  = await fetch(COMM_API + '/community/posts/' + postId + '/like/', {
      method: 'POST', headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await res.json();
    if (res.ok) {
      btn.style.color = data.liked ? 'var(--red)' : 'var(--text-3)';
      btn.innerHTML   = (data.liked ? '❤️' : '🤍') + ' <span>' + data.like_count + '</span>';
    }
  } catch(e) {}
};

window.deletePost = async function(postId) {
  if (!confirm('Postni ochirish?')) return;
  const token = localStorage.getItem('onolam_access');
  try {
    const res = await fetch(COMM_API + '/community/posts/' + postId + '/delete/', {
      method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token }
    });
    if (res.ok) document.getElementById('post-' + postId)?.remove();
  } catch(e) {}
};

window.editPost = async function(postId) {
  // post yoki proj id bilan topamiz
  const postEl    = document.getElementById('post-' + postId) || document.getElementById('proj-' + postId);
  const oldText   = postEl ? (postEl.querySelector('[data-content]') || postEl.querySelector('p') || postEl.querySelector('h3'))?.textContent.trim() || '' : '';
  if (!postEl) { alert('Tahrirlash imkoni yoq'); return; }
  const newText = prompt('Postni tahrirlang:', oldText);
  if (!newText || newText === oldText) return;

  const token = localStorage.getItem('onolam_access');
  try {
    const res  = await fetch(COMM_API + '/community/posts/' + postId + '/edit/', {
      method:  'PATCH',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ content: newText })
    });
    const data = await res.json();
    if (res.ok) {
      const el = postEl.querySelector('[data-content]') || postEl.querySelector('p') || postEl.querySelector('h3');
      if (el) el.textContent = newText;
    } else {
      alert(data.error || 'Xatolik');
    }
  } catch(e) { alert('Xatolik'); }
};

window.toggleComments = async function(postId) {
  const token      = localStorage.getItem('onolam_access');
  const commentDiv = document.getElementById('comments-' + postId);
  if (!commentDiv) return;
  if (commentDiv.style.display === 'none') {
    commentDiv.style.display = 'block';
    try {
      const res  = await fetch(COMM_API + '/community/posts/' + postId + '/comments/', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const data = await res.json();
      let html = '<div style="border-top:1px solid var(--border);padding-top:12px;">';
      (data.comments || []).forEach(c => {
        const cav = c.user.avatar || ('https://api.dicebear.com/7.x/pixel-art/svg?seed=' + c.user.username);
        html += '<div style="display:flex;gap:10px;margin-bottom:10px;">' +
          '<img src="' + cav + '" style="width:28px;height:28px;border-radius:50%;">' +
          '<div style="background:var(--void-3);border-radius:var(--r-lg);padding:8px 12px;flex:1;">' +
          '<div style="font-size:12px;font-weight:700;">' + c.user.name + '</div>' +
          '<div style="font-size:13px;color:var(--text-2);">' + escapeHtml(c.content) + '</div>' +
          '</div></div>';
      });
      html += '<div style="display:flex;gap:8px;margin-top:8px;">' +
        '<input type="text" id="ci-' + postId + '" placeholder="Izoh..." ' +
        'style="flex:1;background:var(--void-3);border:1px solid var(--border);border-radius:var(--r-md);padding:8px 12px;font-size:13px;color:var(--text-1);"' +
        ' onkeydown="if(event.key===\'Enter\')submitComment(' + postId + ')">' +
        '<button onclick="submitComment(' + postId + ')" class="btn btn-neon btn-sm">Yuborish</button>' +
        '</div></div>';
      commentDiv.innerHTML = html;
    } catch(e) {}
  } else {
    commentDiv.style.display = 'none';
  }
};

window.submitComment = async function(postId) {
  const token   = localStorage.getItem('onolam_access');
  const input   = document.getElementById('ci-' + postId);
  const content = input ? input.value.trim() : '';
  if (!content) return;
  try {
    const res = await fetch(COMM_API + '/community/posts/' + postId + '/comments/', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: content })
    });
    if (res.ok && input) input.value = '';
  } catch(e) {}
};

window.setFeedTab = function(name, el) {
  document.querySelectorAll('[id^="feed-"]').forEach(f => f.style.display = 'none');
  document.querySelectorAll('.ftb').forEach(t => t.classList.remove('active'));
  const feedEl = document.getElementById('feed-' + name);
  if (feedEl) feedEl.style.display = name === 'chat' ? 'flex' : 'block';
  if (el) el.classList.add('active');
  if (name === 'chat') loadChat();
  if (name === 'projects') loadProjects();
};

function escapeHtml(text) {
  return String(text).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function timeAgo(dateStr) {
  const date = new Date(dateStr);
  const now  = new Date();
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60)     return 'Hozirgina';
  if (diff < 3600)   return Math.floor(diff/60) + ' daqiqa oldin';
  if (diff < 86400)  return Math.floor(diff/3600) + ' soat oldin';

  const day   = date.getDate();
  const month = ['Yan','Fev','Mar','Apr','May','Iyun','Iyul','Avg','Sen','Okt','Noy','Dek'][date.getMonth()];
  const year  = date.getFullYear();
  const hour  = date.getHours().toString().padStart(2,'0');
  const min   = date.getMinutes().toString().padStart(2,'0');
  const days  = Math.floor(diff/86400);

  if (days < 7)  return days + ' kun oldin · ' + hour + ':' + min;
  if (year === now.getFullYear()) return day + ' ' + month + ' · ' + hour + ':' + min;
  return day + ' ' + month + ' ' + year + ' · ' + hour + ':' + min;
}

// ── CHAT ──
async function loadChat() {
  const token  = localStorage.getItem('onolam_access');
  const msgsEl = document.getElementById('chatMsgs');
  if (!msgsEl) return;

  msgsEl.innerHTML = '<div style="text-align:center;padding:16px;color:var(--text-3);">Yuklanmoqda...</div>';

  try {
    const res  = await fetch(COMM_API + '/community/chat/' + currentChannel + '/', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await res.json();

    if (!data.messages.length) {
      msgsEl.innerHTML = '<div style="text-align:center;padding:32px;color:var(--text-3);">Hali xabar yoq</div>';
      return;
    }

    msgsEl.innerHTML = data.messages.map(m => renderChatMsg(m)).join('');
    msgsEl.scrollTop = msgsEl.scrollHeight;
  } catch(e) {}
}

function renderChatMsg(m) {
  const av   = m.user.avatar || ('https://api.dicebear.com/7.x/pixel-art/svg?seed=' + m.user.username);
  const time = timeAgo(m.created_at);
  if (m.is_own) {
    return '<div style="display:flex;justify-content:flex-end;margin-bottom:10px;gap:6px;align-items:flex-end;">' +
      '<button onclick="deleteChatMsg(' + m.id + ',this)" style="background:none;border:none;color:var(--text-4);cursor:pointer;font-size:12px;">🗑</button>' +
      '<div style="max-width:70%;">' +
      '<div style="background:rgba(0,255,65,.1);border:1px solid rgba(0,255,65,.2);border-radius:12px 12px 0 12px;padding:10px 14px;font-size:13px;color:var(--text-1);">' +
      escapeHtml(m.content) + '</div>' +
      '<div style="font-size:10px;color:var(--text-4);text-align:right;margin-top:3px;">' + time + '</div>' +
      '</div></div>';
  }
  return '<div style="display:flex;gap:8px;margin-bottom:10px;">' +
    '<img src="' + av + '" style="width:28px;height:28px;border-radius:50%;flex-shrink:0;">' +
    '<div style="max-width:70%;">' +
    '<div style="font-size:11px;color:var(--text-3);margin-bottom:3px;">' + m.user.name +
    (m.user.is_pro ? ' <span class="badge badge-pro" style="font-size:9px;">Pro</span>' : '') + '</div>' +
    '<div style="background:var(--surface);border:1px solid var(--border);border-radius:0 12px 12px 12px;padding:10px 14px;font-size:13px;color:var(--text-1);">' +
    escapeHtml(m.content) + '</div>' +
    '<div style="font-size:10px;color:var(--text-4);margin-top:3px;">' + time + '</div>' +
    '</div></div>';
}

window.deleteChatMsg = async function(msgId, btn) {
  if (!confirm('Xabarni o\'chirish?')) return;
  const token = localStorage.getItem('onolam_access');
  try {
    const res = await fetch(COMM_API + '/community/chat/message/' + msgId + '/delete/', {
      method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token }
    });
    if (res.ok) btn.closest('div[style*="flex-end"]')?.remove();
  } catch(e) {}
};



let currentProjectTab = 'all';

window.switchProjectTab = function(tab, btn) {
  currentProjectTab = tab;
  document.querySelectorAll('#feed-projects .ftb').forEach(b => {
    b.style.color       = 'var(--text-3)';
    b.style.borderBottom = '2px solid transparent';
  });
  btn.style.color       = 'var(--neon)';
  btn.style.borderBottom = '2px solid var(--neon)';
  loadProjects();
};

async function loadProjects() {
  const token = localStorage.getItem('onolam_access');
  const box   = document.getElementById('projectsBox');
  if (!box) return;

  box.innerHTML = '<div style="grid-column:1/-1;padding:32px;text-align:center;color:var(--text-3);">Yuklanmoqda...</div>';

  try {
    const user = JSON.parse(localStorage.getItem('onolam_user') || '{}');
    // Barcha kanallardan loyihalarni yuklash
    const channels = ['umumiy', 'loihalar', 'savol-javob'];
    const allPosts = [];
    for (const ch of channels) {
      try {
        const r = await fetch(COMM_API + '/community/posts/?channel=' + ch, {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        const d = await r.json();
        allPosts.push(...(d.posts || []));
      } catch(e) {}
    }
    let projects = allPosts.filter(p => p.post_type === 'project');
    if (currentProjectTab === 'mine') {
      projects = projects.filter(p => p.user.username === user.username);
    }

    if (!projects.length) {
      box.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:48px;color:var(--text-3);">' +
        '<div style="font-size:40px;margin-bottom:12px;">🚀</div>' +
        '<p>' + (currentProjectTab === 'mine' ? 'Sizda hali loyiha yoq' : 'Hali loyiha yoq') + '</p>' +
        '<button class="btn btn-neon btn-sm" style="margin-top:12px;" onclick="showProjectForm()">+ Loyiha qoshish</button>' +
        '</div>';
      return;
    }

    let html = projects.map(p => {
      const lines2  = p.content.split('\n');
      const title   = lines2[0] || 'Loyiha';
      const desc    = lines2[1] || '';
      const link    = lines2.find(l => l.startsWith('🔗')) || '';
      const tech    = lines2.find(l => l.startsWith('💻')) || '';
      const av      = p.user.avatar || ('https://api.dicebear.com/7.x/pixel-art/svg?seed=' + p.user.username);
      const linkUrl = link.replace('🔗 ', '').trim();

      return '<div class="card" id="proj-' + p.id + '" style="cursor:pointer;" onclick="' + (linkUrl ? 'window.open(\'' + linkUrl + '\',\'_blank\')' : '') + '">' +
        '<div style="font-size:28px;margin-bottom:10px;">🚀</div>' +
        '<h3 style="font-size:14px;font-weight:700;margin-bottom:6px;">' + escapeHtml(title) + '</h3>' +
        (desc ? '<p style="font-size:12px;color:var(--text-3);margin-bottom:8px;">' + escapeHtml(desc) + '</p>' : '') +
        (linkUrl ? '<div style="font-size:11px;color:var(--neon);margin-bottom:8px;">🔗 GitHub</div>' : '') +
        (tech ? '<div style="font-size:11px;color:var(--text-4);margin-bottom:8px;">' + escapeHtml(tech) + '</div>' : '') +
        '<div style="display:flex;align-items:center;gap:6px;margin-top:auto;">' +
        '<img src="' + av + '" style="width:20px;height:20px;border-radius:50%;">' +
        '<span style="font-size:11px;color:var(--text-3);">' + escapeHtml(p.user.name) + '</span>' +
        (p.user.is_pro ? '<span class="badge badge-pro" style="font-size:9px;">Pro</span>' : '') +
        (p.is_own ? '<button onclick="event.stopPropagation();deletePost(' + p.id + ')" style="margin-left:auto;background:none;border:none;color:var(--text-4);cursor:pointer;font-size:12px;">🗑</button>' : '') +
        '</div></div>';
    }).join('');

    html += '<div class="card" style="border-style:dashed;cursor:pointer;display:flex;flex-direction:column;' +
      'align-items:center;justify-content:center;text-align:center;min-height:140px;" onclick="showProjectForm()">' +
      '<div style="font-size:32px;margin-bottom:8px;color:var(--text-4);">+</div>' +
      '<div style="font-size:13px;color:var(--text-3);">Loyiha qoshish</div></div>';

    box.innerHTML = html;

  } catch(e) {
    box.innerHTML = '<div style="grid-column:1/-1;padding:16px;color:var(--red-accent);">Yuklab bolmadi</div>';
  }
}


window.showProjectForm = function() {
  const modal = document.getElementById('projectModal');
  if (modal) modal.style.display = 'flex';
};

window.closeProjectModal = function() {
  const modal = document.getElementById('projectModal');
  if (modal) modal.style.display = 'none';
};

window.submitProject = async function() {
  const name   = document.getElementById('projName')?.value.trim();
  const desc   = document.getElementById('projDesc')?.value.trim();
  const github = document.getElementById('projGithub')?.value.trim();
  const tech   = document.getElementById('projTech')?.value.trim();

  if (!name)   { alert('Loyiha nomini kiriting!'); return; }
  if (!desc)   { alert('Tavsif kiriting!'); return; }
  if (!github) { alert('GitHub linkini kiriting!'); return; }

  // GitHub link tekshirish
  if (!github.includes('github.com')) {
    alert('Haqiqiy GitHub link kiriting! (https://github.com/...)');
    return;
  }

  const content = `${name}\n${desc}\n🔗 ${github}\n💻 ${tech || ''}`;
  const token   = localStorage.getItem('onolam_access');

  try {
    const res  = await fetch(COMM_API + '/community/posts/create/', {
      method:  'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ content, channel: 'loihalar', post_type: 'project' })
    });
    const data = await res.json();
    if (res.ok) {
      window.closeProjectModal();
      // Inputlarni tozalash
      ['projName','projDesc','projGithub','projTech'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      loadProjects();
    } else {
      alert(data.error || 'Xatolik');
    }
  } catch(e) {
    alert('Server bilan boglanib bolmadi');
  }
};

window.openImageViewer = function(src) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.95);z-index:9999;display:flex;align-items:center;justify-content:center;cursor:zoom-out;';
  overlay.onclick = () => overlay.remove();
  const img = document.createElement('img');
  img.src = src;
  img.style.cssText = 'max-width:95vw;max-height:95vh;border-radius:8px;object-fit:contain;';
  img.onclick = e => e.stopPropagation();
  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'x';
  closeBtn.style.cssText = 'position:absolute;top:16px;right:16px;background:rgba(255,255,255,.1);border:none;color:white;width:36px;height:36px;border-radius:50%;font-size:18px;cursor:pointer;';
  closeBtn.onclick = () => overlay.remove();
  const dlBtn = document.createElement('button');
  dlBtn.textContent = '⬇ Yuklab olish';
  dlBtn.style.cssText = 'position:absolute;bottom:16px;right:16px;background:rgba(0,255,65,.1);border:1px solid rgba(0,255,65,.3);color:#00ff41;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer;';
  dlBtn.onclick = async function(e) {
    e.stopPropagation();
    try {
      const res  = await fetch(src);
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = src.split('/').pop() || 'rasm.jpg';
      a.click();
      URL.revokeObjectURL(url);
    } catch(err) {
      window.open(src, '_blank');
    }
  };
  overlay.appendChild(img);
  overlay.appendChild(closeBtn);
  overlay.appendChild(dlBtn);
  document.body.appendChild(overlay);
};

window.openFile = async function(data) {
  const parts = data.split('|||');
  const url   = parts[0];
  const name  = parts[1] || 'fayl';
  const LIMIT = 5 * 1024 * 1024;
  try {
    const headRes = await fetch(url, { method: 'HEAD' });
    const size = parseInt(headRes.headers.get('content-length') || '0');
    if (size > LIMIT) {
      const sizeMB = (size / 1024 / 1024).toFixed(1);
      if (confirm('Fayl hajmi ' + sizeMB + 'MB. Yuklab olasizmi?')) {
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.click();
      }
    } else {
      if (confirm('Faylni ochish (OK) yoki yuklab olish (Bekor)?')) {
        window.open(url, '_blank');
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.click();
      }
    }
  } catch(e) {
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
  }
};

// ── CHAT TAB ALMASHTIRISH ──
let currentDMUser = null;

window.switchChatTab = function(tab, btn) {
  document.querySelectorAll('#feed-chat .ftb').forEach(b => {
    b.style.color       = 'var(--text-3)';
    b.style.borderBottom = '2px solid transparent';
  });
  btn.style.color       = 'var(--neon)';
  btn.style.borderBottom = '2px solid var(--neon)';

  const generalBox = document.getElementById('generalChatBox');
  const dmBox      = document.getElementById('dmChatBox');
  const dmWindow   = document.getElementById('dmChatWindow');

  if (tab === 'general') {
    if (generalBox) generalBox.style.display = 'flex';
    if (dmBox)      dmBox.style.display      = 'none';
    if (dmWindow)   dmWindow.style.display   = 'none';
    loadChat();
  } else {
    if (generalBox) generalBox.style.display = 'none';
    if (dmBox)      dmBox.style.display      = 'flex';
    if (dmWindow)   dmWindow.style.display   = 'none';
    loadDMConversations();
  }
};

// ── DM SUHBATLAR ──
async function loadDMConversations() {
  const token = localStorage.getItem('onolam_access');
  const box   = document.getElementById('dmConversations');
  if (!box) return;

  box.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-3);">Yuklanmoqda...</div>';

  try {
    const res  = await fetch(COMM_API + '/community/dm/', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await res.json();

    if (!data.conversations.length) {
      box.innerHTML = '<div style="padding:32px;text-align:center;color:var(--text-3);">Hali xabar yoq</div>';
      return;
    }

    box.innerHTML = data.conversations.map(c => {
      const av = c.avatar || ('https://api.dicebear.com/7.x/pixel-art/svg?seed=' + c.username);
      return '<div onclick="openDMWindow(' + c.user_id + ',\'' + c.name + '\',\'' + c.username + '\',\'' + av + '\')" ' +
        'style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:var(--r-lg);cursor:pointer;border-bottom:1px solid var(--border);">' +
        '<img src="' + av + '" style="width:40px;height:40px;border-radius:50%;flex-shrink:0;">' +
        '<div style="flex:1;min-width:0;">' +
        '<div style="font-size:13px;font-weight:700;">' + c.name + '</div>' +
        '<div style="font-size:12px;color:var(--text-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + (c.last_msg || '') + '</div>' +
        '</div>' +
        (c.unread ? '<span style="background:var(--neon);color:black;border-radius:50%;width:18px;height:18px;font-size:10px;display:flex;align-items:center;justify-content:center;">' + c.unread + '</span>' : '') +
        '</div>';
    }).join('');

  } catch(e) {
    box.innerHTML = '<div style="padding:16px;color:var(--red-accent);">Yuklanmadi</div>';
  }
}

// ── DM OYNA ──
window.openDMWindow = async function(userId, name, username, avatar) {
  currentDMUser = userId;
  const token   = localStorage.getItem('onolam_access');

  const dmBox    = document.getElementById('dmChatBox');
  const dmWindow = document.getElementById('dmChatWindow');
  if (dmBox)    dmBox.style.display    = 'none';
  if (dmWindow) dmWindow.style.display = 'flex';

  const nameEl     = document.getElementById('dmUserName');
  const usernameEl = document.getElementById('dmUserUsername');
  const avatarEl   = document.getElementById('dmUserAvatar');
  if (nameEl)     nameEl.textContent     = name;
  if (usernameEl) usernameEl.textContent = '@' + username;
  if (avatarEl)   avatarEl.src           = avatar || ('https://api.dicebear.com/7.x/pixel-art/svg?seed=' + username);

  const msgsEl = document.getElementById('dmMessages');
  if (msgsEl) msgsEl.innerHTML = '<div style="text-align:center;padding:16px;color:var(--text-3);">Yuklanmoqda...</div>';

  try {
    const res  = await fetch(COMM_API + '/community/dm/' + userId + '/', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await res.json();

    if (msgsEl) {
      if (!data.messages.length) {
        msgsEl.innerHTML = '<div style="text-align:center;padding:32px;color:var(--text-3);">Birinchi xabarni yuboring!</div>';
      } else {
        msgsEl.innerHTML = data.messages.map(m => renderDMMsg(m)).join('');
        msgsEl.scrollTop = msgsEl.scrollHeight;
      }
    }
  } catch(e) {}
};

window.closeDMWindow = function() {
  currentDMUser = null;
  const dmBox    = document.getElementById('dmChatBox');
  const dmWindow = document.getElementById('dmChatWindow');
  if (dmBox)    dmBox.style.display    = 'flex';
  if (dmWindow) dmWindow.style.display = 'none';
  loadDMConversations();
};

function renderDMMsg(m) {
  if (m.is_own) {
    return '<div style="display:flex;justify-content:flex-end;margin-bottom:8px;">' +
      '<div style="max-width:70%;">' +
      '<div style="background:rgba(0,255,65,.1);border:1px solid rgba(0,255,65,.2);border-radius:12px 12px 0 12px;padding:10px 14px;font-size:13px;">' +
      escapeHtml(m.content) + '</div>' +
      '<div style="font-size:10px;color:var(--text-4);text-align:right;margin-top:2px;">' +
      timeAgo(m.created_at) + (m.is_read ? ' ✓✓' : ' ✓') + '</div>' +
      '</div></div>';
  }
  return '<div style="display:flex;margin-bottom:8px;">' +
    '<div style="max-width:70%;">' +
    '<div style="background:var(--surface);border:1px solid var(--border);border-radius:0 12px 12px 12px;padding:10px 14px;font-size:13px;">' +
    escapeHtml(m.content) + '</div>' +
    '<div style="font-size:10px;color:var(--text-4);margin-top:2px;">' + timeAgo(m.created_at) + '</div>' +
    '</div></div>';
}

window.sendDM = async function() {
  if (!currentDMUser) return;
  const token   = localStorage.getItem('onolam_access');
  const input   = document.getElementById('dmInput');
  const content = input ? input.value.trim() : '';
  if (!content) return;

  try {
    const res  = await fetch(COMM_API + '/community/dm/' + currentDMUser + '/', {
      method:  'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ content })
    });
    const data = await res.json();
    if (res.ok && input) {
      input.value = '';
      const msgsEl = document.getElementById('dmMessages');
      if (msgsEl) {
        msgsEl.insertAdjacentHTML('beforeend', renderDMMsg(data.message));
        msgsEl.scrollTop = msgsEl.scrollHeight;
      }
    }
  } catch(e) {}
};

// Yangi DM — user qidirish
window.showNewDM = function() {
  const name = prompt('Foydalanuvchi username ini kiriting:');
  if (!name) return;
  searchUserForDM(name);
};

async function searchUserForDM(query) {
  const token = localStorage.getItem('onolam_access');
  try {
    const res  = await fetch(COMM_API + '/community/users/?q=' + query, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await res.json();

    if (!data.users.length) {
      alert('Foydalanuvchi topilmadi: ' + query);
      return;
    }

    if (data.users.length === 1) {
      const u  = data.users[0];
      const av = u.avatar || ('https://api.dicebear.com/7.x/pixel-art/svg?seed=' + u.username);
    } else {
      const names = data.users.map((u, i) => (i+1) + '. ' + u.username + ' (' + u.name + ')').join('\n');
      const choice = prompt('Qaysi foydalanuvchi?\n' + names + '\n\nRaqam kiriting:');
      if (!choice) return;
      const idx = parseInt(choice) - 1;
      if (idx >= 0 && idx < data.users.length) {
        const u  = data.users[idx];
        const av = u.avatar || ('https://api.dicebear.com/7.x/pixel-art/svg?seed=' + u.username);
        openDMWindow(u.id, u.name, u.username, av);
      }
    }
  } catch(e) {}
}

window.sendChatMsg = async function() {
  const token   = localStorage.getItem('onolam_access');
  const input   = document.getElementById('chatInput');
  const content = input ? input.value.trim() : '';
  if (!content) return;

  try {
    const res  = await fetch(COMM_API + '/community/chat/' + currentChannel + '/', {
      method:  'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ content })
    });
    const data = await res.json();
    if (res.ok) {
      input.value = '';
      const msgsEl = document.getElementById('chatMsgs');
      if (msgsEl) {
        msgsEl.insertAdjacentHTML('beforeend', renderChatMsg(data.message));
        msgsEl.scrollTop = msgsEl.scrollHeight;
      }
    }
  } catch(e) {}
};

async function loadSidebarStats() {
  const token = localStorage.getItem('onolam_access');
  try {
    const res  = await fetch(COMM_API + '/community/stats/', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await res.json();

    // Onlayn users
    const onlineEl = document.getElementById('onlineUsers') || document.getElementById('onlineUsersList');
    if (onlineEl) {
      if (!data.online_users.length) {
        onlineEl.innerHTML = '<div style="font-size:12px;color:var(--text-3);">Hozir hech kim yo\'q</div>';
      } else {
        onlineEl.innerHTML = data.online_users.map(u => {
          const av = u.avatar || ('https://api.dicebear.com/7.x/pixel-art/svg?seed=' + u.username);
          return '<div class="online-user" onclick="openDMWindow(' + u.id + ',\'' + u.name + '\',\'' + u.username + '\',\'' + av + '\')" style="cursor:pointer;">' +
            '<div class="ou-av"><img src="' + av + '" alt=""><div class="ou-dot"></div></div>' +
            '<div class="ou-info"><h5>' + u.name + '</h5><p>@' + u.username + '</p></div>' +
            '</div>';
        }).join('');
      }
    }

    // Top a'zolar
    const topEl = document.getElementById('topMembersList');
    if (topEl) {
      const medals = ['🥇', '🥈', '🥉'];
      topEl.innerHTML = data.top_members.map((u, i) => {
        const av = u.avatar || ('https://api.dicebear.com/7.x/pixel-art/svg?seed=' + u.username);
        return '<div class="top-member">' +
          '<div class="tm-rank">' + (medals[i] || (i+1)) + '</div>' +
          '<div class="tm-av"><img src="' + av + '" alt=""></div>' +
          '<div class="tm-info"><h5>' + u.name + '</h5><p>' + u.post_count + ' post</p></div>' +
          '<div class="tm-pts">' + u.post_count + '</div>' +
          '</div>';
      }).join('');
    }

    // Bugungi statistika
    const statsEl = document.getElementById('dailyStats');
    if (statsEl && data.daily_stats) {
      const s = data.daily_stats;
      statsEl.innerHTML =
        '<div style="display:flex;justify-content:space-between;"><span>Yangi postlar</span><span style="color:var(--neon)">' + s.posts + '</span></div>' +
        '<div style="display:flex;justify-content:space-between;"><span>Izohlar</span><span style="color:var(--neon)">' + s.comments + '</span></div>' +
        '<div style="display:flex;justify-content:space-between;"><span>Loyihalar</span><span style="color:var(--neon)">' + s.projects + '</span></div>' +
        '<div style="display:flex;justify-content:space-between;"><span>Yangi a\'zolar</span><span style="color:var(--neon)">' + s.new_members + '</span></div>';
    }

  } catch(e) { console.error('Sidebar stats yuklanmadi:', e); }
}

// ── QIDIRUV ──
let searchTimer = null;

// ── MOBIL SIDEBAR ──
window.toggleSidebar = function() {
  const sidebar = document.querySelector('.comm-left');
  const overlay = document.getElementById('commOverlay');
  if (sidebar) sidebar.classList.toggle('open');
  if (overlay) overlay.classList.toggle('show');
};

window.closeSidebar = function() {
  const sidebar = document.querySelector('.comm-left');
  const overlay = document.getElementById('commOverlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('show');
};

window.toggleSearch = function() {
  const modal = document.getElementById('searchModal');
  const input = document.getElementById('modalSearchInput');
  if (modal) modal.style.display = 'flex';
  if (input) { input.value = ''; input.focus(); }
  const results = document.getElementById('modalSearchResults');
  if (results) results.innerHTML = '<div style="text-align:center;padding:32px;color:var(--text-3);"><div style="font-size:40px;margin-bottom:12px;">🔍</div><p>Biror narsa izlang</p></div>';
};

window.closeSearchModal = function() {
  const modal = document.getElementById('searchModal');
  if (modal) modal.style.display = 'none';
};

window.closeSearch = function() {
  const box     = document.getElementById('searchBox');
  const input   = document.getElementById('searchInput');
  const results = document.getElementById('searchResults');
  const postsBox = document.getElementById('postsBox');
  if (box)     box.style.display     = 'none';
  if (input)   input.value           = '';
  if (results) results.style.display = 'none';
  if (postsBox) postsBox.style.display = 'block';
};

window.handleSearch = function(query) {
  clearTimeout(searchTimer);
  if (!query || query.length < 2) {
    const results  = document.getElementById('searchResults');
    const postsBox = document.getElementById('postsBox');
    if (results)  results.style.display  = 'none';
    if (postsBox) postsBox.style.display = 'block';
    return;
  }
  searchTimer = setTimeout(() => doSearch(query), 500);
};

async function doSearch(query) {
  const token    = localStorage.getItem('onolam_access');
  const results  = document.getElementById('searchResults');
  const postsBox = document.getElementById('postsBox');
  if (!results) return;

  results.style.display = 'block';
  if (postsBox) postsBox.style.display = 'none';
  results.innerHTML = '<div style="padding:16px;color:var(--text-3);">Qidirilmoqda...</div>';

  try {
    const [postsRes, usersRes] = await Promise.all([
      fetch(COMM_API + '/community/posts/?channel=' + currentChannel + '&q=' + encodeURIComponent(query), {
        headers: { 'Authorization': 'Bearer ' + token }
      }),
      fetch(COMM_API + '/community/users/?q=' + encodeURIComponent(query), {
        headers: { 'Authorization': 'Bearer ' + token }
      })
    ]);

    const postsData = await postsRes.json();
    const usersData = await usersRes.json();

    const posts    = (postsData.posts || []).filter(p => p.post_type !== 'project');
    const projects = (postsData.posts || []).filter(p => p.post_type === 'project');
    const users    = usersData.users || [];

    if (!posts.length && !projects.length && !users.length) {
      results.innerHTML = '<div style="text-align:center;padding:32px;color:var(--text-3);"><div style="font-size:32px;">🔍</div><p>Hech narsa topilmadi</p></div>';
      return;
    }

    let html = '';

    if (users.length) {
      html += '<div style="padding:12px 16px;font-size:11px;font-weight:700;color:var(--text-4);text-transform:uppercase;">👤 Foydalanuvchilar</div>';
      users.forEach(u => {
        const av = u.avatar || ('https://api.dicebear.com/7.x/pixel-art/svg?seed=' + u.username);
        html += '<div style="display:flex;align-items:center;gap:10px;padding:10px 16px;cursor:pointer;border-bottom:1px solid var(--border);" ' +
          'onclick="openDMWindow(' + u.id + ',decodeURIComponent(atob(\'' + btoa(unescape(encodeURIComponent(u.name))) + '\')),\'' + u.username + '\',\'' + av + '\')">' +
          '<img src="' + av + '" style="width:36px;height:36px;border-radius:50%;">' +
          '<div><div style="font-size:13px;font-weight:700;">' + escapeHtml(u.name) +
          (u.is_pro ? ' <span class="badge badge-pro" style="font-size:9px;">Pro</span>' : '') +
          '</div><div style="font-size:11px;color:var(--text-4);">@' + escapeHtml(u.username) + '</div></div></div>';
      });
    }

    if (posts.length) {
      html += '<div style="padding:12px 16px;font-size:11px;font-weight:700;color:var(--text-4);text-transform:uppercase;">📌 Postlar</div>';
      html += '<div style="padding:0 16px;">' + posts.map(p => renderPost(p)).join('') + '</div>';
    }

    if (projects.length) {
      html += '<div style="padding:12px 16px;font-size:11px;font-weight:700;color:var(--text-4);text-transform:uppercase;">🚀 Loyihalar</div>';
      html += '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;padding:0 16px 16px;">';
      projects.forEach(p => {
        const title = p.content.split('\n')[0] || 'Loyiha';
        const av    = p.user.avatar || ('https://api.dicebear.com/7.x/pixel-art/svg?seed=' + p.user.username);
        html += '<div class="card"><div style="font-size:24px;margin-bottom:8px;">🚀</div>' +
          '<h3 style="font-size:13px;font-weight:700;">' + escapeHtml(title) + '</h3>' +
          '<div style="display:flex;align-items:center;gap:6px;margin-top:8px;">' +
          '<img src="' + av + '" style="width:18px;height:18px;border-radius:50%;">' +
          '<span style="font-size:11px;color:var(--text-3);">' + escapeHtml(p.user.name) + '</span>' +
          '</div></div>';
      });
      html += '</div>';
    }

    results.innerHTML = html;

  } catch(e) {
    results.innerHTML = '<div style="padding:16px;color:var(--red-accent);">Qidirib bolmadi</div>';
  }
}


let modalSearchTimer = null;

window.modalSearch = function(query) {
  clearTimeout(modalSearchTimer);
  const results = document.getElementById('modalSearchResults');
  if (!query || query.length < 2) {
    if (results) results.innerHTML = '<div style="text-align:center;padding:32px;color:var(--text-3);"><div style="font-size:40px;margin-bottom:12px;">🔍</div><p>Biror narsa izlang</p></div>';
    return;
  }
  if (results) results.innerHTML = '<div style="text-align:center;padding:16px;color:var(--text-3);">Qidirilmoqda...</div>';
  modalSearchTimer = setTimeout(() => doModalSearch(query), 400);
};

async function doModalSearch(query) {
  const token   = localStorage.getItem('onolam_access');
  const results = document.getElementById('modalSearchResults');
  if (!results) return;

  try {
    const [postsRes, usersRes] = await Promise.all([
      fetch(COMM_API + '/community/posts/?channel=' + currentChannel + '&q=' + encodeURIComponent(query), {
        headers: { 'Authorization': 'Bearer ' + token }
      }),
      fetch(COMM_API + '/community/users/?q=' + encodeURIComponent(query), {
        headers: { 'Authorization': 'Bearer ' + token }
      })
    ]);

    const postsData = await postsRes.json();
    const usersData = await usersRes.json();

    const users    = usersData.users    || [];
    const posts    = (postsData.posts   || []).filter(p => p.post_type !== 'project');
    const projects = (postsData.posts   || []).filter(p => p.post_type === 'project');

    if (!users.length && !posts.length && !projects.length) {
      results.innerHTML = '<div style="text-align:center;padding:32px;color:var(--text-3);"><div style="font-size:32px;">🔍</div><p>Hech narsa topilmadi</p></div>';
      return;
    }

    let html = '';

    // ── USERLAR ──
    if (users.length) {
      html += renderModalSection('👤 Foydalanuvchilar', users.length, 'users', users.map(u => {
        const av = u.avatar || ('https://api.dicebear.com/7.x/pixel-art/svg?seed=' + u.username);
        return '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;' +
          'background:var(--surface);border-radius:var(--r-lg);cursor:pointer;margin-bottom:6px;" ' +
          'onclick="closeSearchModal();setDMUser(' + u.id + ',\'' + u.username + '\',\'' + u.name + '\',\'' + av + '\')">' +
          '<img src="' + av + '" style="width:36px;height:36px;border-radius:50%;">' +
          '<div><div style="font-size:13px;font-weight:700;">' + escapeHtml(u.name) +
          (u.is_pro ? ' <span class="badge badge-pro" style="font-size:9px;">Pro</span>' : '') +
          '</div><div style="font-size:11px;color:var(--text-4);">@' + escapeHtml(u.username) + '</div></div>' +
          '</div>';
      }).join(''), users);
    }

    // ── LOYIHALAR ──
    if (projects.length) {
      html += renderModalSection('🚀 Loyihalar', projects.length, 'projects', projects.map(p => {
        const title = p.content.split('\n')[0] || 'Loyiha';
        const av    = p.user.avatar || ('https://api.dicebear.com/7.x/pixel-art/svg?seed=' + p.user.username);
        return '<div style="background:var(--surface);border-radius:var(--r-lg);padding:12px;margin-bottom:6px;cursor:pointer;" onclick="showFilteredProject(' + p.id + ')">' +
          '<div style="font-size:13px;font-weight:700;margin-bottom:4px;">🚀 ' + escapeHtml(title) + '</div>' +
          '<div style="display:flex;align-items:center;gap:6px;">' +
          '<img src="' + av + '" style="width:16px;height:16px;border-radius:50%;">' +
          '<span style="font-size:11px;color:var(--text-3);">' + escapeHtml(p.user.name) + '</span>' +
          '</div></div>';
      }).join(''), projects);
    }

    // ── POSTLAR ──
    if (posts.length) {
      html += renderModalSection('📌 Postlar', posts.length, 'posts', posts.map(p => {
        const av = p.user.avatar || ('https://api.dicebear.com/7.x/pixel-art/svg?seed=' + p.user.username);
        return '<div style="background:var(--surface);border-radius:var(--r-lg);padding:12px;margin-bottom:6px;cursor:pointer;" onclick="closeSearchModal();scrollToPost(' + p.id + ')">' +
          '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">' +
          '<img src="' + av + '" style="width:24px;height:24px;border-radius:50%;">' +
          '<span style="font-size:12px;font-weight:700;">' + escapeHtml(p.user.name) + '</span>' +
          '</div>' +
          '<div style="font-size:13px;color:var(--text-2);">' + escapeHtml(p.content.slice(0,100)) + (p.content.length > 100 ? '...' : '') + '</div>' +
          '</div>';
      }).join(''), posts);
    }

    results.innerHTML = html;

  } catch(e) {
    results.innerHTML = '<div style="padding:16px;color:var(--red-accent);">Xatolik yuz berdi</div>';
  }
}

function renderModalSection(title, count, type, itemsHtml, allItems) {
  return '<div style="margin-bottom:20px;">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">' +
    '<div>' +
    '<span style="font-size:14px;font-weight:800;">' + title + '</span>' +
    '<span style="font-size:12px;color:var(--text-4);margin-left:8px;">' + count + ' ta natija</span>' +
    '</div>' +
    (count > 3 ? '<button onclick="showAllResults(\'' + type + '\',' + JSON.stringify(allItems).replace(/'/g,"\\'") + ')" style="font-size:12px;color:var(--neon);background:none;border:none;cursor:pointer;">Barchasini ko\'rish →</button>' : '') +
    '</div>' +
    itemsHtml +
    '</div>';
}

window.setDMUser = function(userId, username, name, avatar) {
  closeSearchModal();
  const av = avatar || ('https://api.dicebear.com/7.x/pixel-art/svg?seed=' + username);
  const nm = name || username;

  // Chat tabiga o'tish
  const chatTab = document.querySelector('.ftb[onclick*="chat"]');
  if (chatTab) setFeedTab('chat', chatTab);

  setTimeout(() => {
    const dmBtn = document.getElementById('chatTabDM');
    if (dmBtn) switchChatTab('dm', dmBtn);
    setTimeout(() => openDMWindow(userId, nm, username, av), 200);
  }, 200);
};

window.scrollToPost = function(postId) {
  closeSearchModal();
  const postsTab = document.querySelector('.ftb[onclick*="posts"]');
  if (postsTab) setFeedTab('posts', postsTab);
  setTimeout(() => {
    const postEl = document.getElementById('post-' + postId);
    if (postEl) {
      postEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      postEl.style.border = '2px solid var(--neon)';
      postEl.style.boxShadow = '0 0 20px rgba(0,255,65,.3)';
      postEl.style.transition = 'all .3s';
      setTimeout(() => {
        postEl.style.border = '1px solid var(--border)';
        postEl.style.boxShadow = '';
      }, 3000);
    } else {
      // Post topilmasa qayta yuklaymiz
      loadPosts().then(() => {
        setTimeout(() => {
          const el = document.getElementById('post-' + postId);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.style.border = '2px solid var(--neon)';
            el.style.boxShadow = '0 0 20px rgba(0,255,65,.3)';
            setTimeout(() => { el.style.border = '1px solid var(--border)'; el.style.boxShadow = ''; }, 3000);
          }
        }, 500);
      });
    }
  }, 300);
};

window.showFilteredProject = function(postId) {
  closeSearchModal();

  // Loyihalar tabiga o'tish
  const projTab = document.querySelector('.ftb[onclick*="projects"]');
  if (projTab) setFeedTab('projects', projTab);

  setTimeout(() => {
    const box = document.getElementById('projectsBox');
    if (!box) return;

    // Barcha loyihalarni yashirib faqat tanlanganni ko'rsatamiz
    const allCards = box.querySelectorAll('.card');
    allCards.forEach(card => {
      card.style.display = 'none';
    });

    // Tanlangan loyihani topamiz
    const target = document.getElementById('proj-' + postId);
    if (target) {
      target.style.display = 'block';
      target.style.border     = '2px solid var(--neon)';
      target.style.boxShadow  = '0 0 20px rgba(0,255,65,.3)';
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Qaytish tugmasi qo'shamiz
    const backBtn = document.createElement('div');
    backBtn.style.cssText = 'grid-column:1/-1;text-align:center;padding:12px;';
    backBtn.innerHTML = '<button class="btn btn-ghost btn-sm" onclick="loadProjects()">← Barcha loyihalar</button>';
    box.appendChild(backBtn);

  }, 400);
};
