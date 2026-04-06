document.getElementById('pageTitle').innerHTML='✏️ Dars <span style="color:var(--neon)">yaratish / tahrirlash</span>';
document.getElementById('pageDesc').textContent='Rich text editor, video yuklash, tarif belgilash';
document.getElementById('pageBody').innerHTML=`
<div class="grid-2" style="grid-template-columns:1fr 320px;gap:20px;">
  <div>
    <!-- Meta -->
    <div class="card">
      <div class="card-head"><h3>📋 Dars ma'lumotlari</h3></div>
      <div class="grid-2">
        <div class="input-group"><label class="input-label">Kurs tanlash</label><select class="input"><option>🌐 HTML</option><option>🎨 CSS</option><option>⚡ JavaScript</option><option>🐍 Python</option><option>🗄️ SQL</option><option>📱 Termux</option><option>🐧 Linux</option></select></div>
        <div class="input-group"><label class="input-label">Dars raqami</label><input class="input" type="number" value="6" min="1"></div>
      </div>
      <div class="input-group"><label class="input-label">Dars sarlavhasi</label><input class="input" type="text" placeholder="Masalan: Formalar va inputlar" value="Semantik HTML elementlari"></div>
      <div class="input-group"><label class="input-label">Qisqa tavsif (meta)</label><input class="input" type="text" placeholder="Dars haqida qisqa ma'lumot" value="HTML5 semantik teglar — header, nav, main, footer, article"></div>
      <div class="grid-2">
        <div class="input-group"><label class="input-label">Dars turi</label><select class="input"><option>📝 Matn</option><option>📹 Video</option><option>📝+📹 Ikkalasi</option></select></div>
        <div class="input-group"><label class="input-label">Tarif</label><select class="input"><option>🆓 Free</option><option>⚡ Pro</option></select></div>
      </div>
    </div>

    <!-- Rich text toolbar -->
    <div class="card" style="padding:0;overflow:hidden;">
      <div style="padding:12px 16px;background:var(--void-3);border-bottom:1px solid var(--border);display:flex;align-items:center;gap:4px;flex-wrap:wrap;">
        <button class="btn btn-ghost btn-sm" onclick="fmt('bold')"><b>B</b></button>
        <button class="btn btn-ghost btn-sm" onclick="fmt('italic')"><i>I</i></button>
        <button class="btn btn-ghost btn-sm" onclick="fmt('underline')"><u>U</u></button>
        <div style="width:1px;height:20px;background:var(--border);margin:0 4px;"></div>
        <button class="btn btn-ghost btn-sm" onclick="fmtBlock('h2')">H2</button>
        <button class="btn btn-ghost btn-sm" onclick="fmtBlock('h3')">H3</button>
        <button class="btn btn-ghost btn-sm" onclick="fmtBlock('p')">P</button>
        <div style="width:1px;height:20px;background:var(--border);margin:0 4px;"></div>
        <button class="btn btn-ghost btn-sm" onclick="fmtBlock('ul')">• List</button>
        <button class="btn btn-ghost btn-sm" onclick="insertCode()">🖥 Kod</button>
        <button class="btn btn-ghost btn-sm" onclick="insertNote('tip')">💡 Tip</button>
        <button class="btn btn-ghost btn-sm" onclick="insertNote('warn')">⚠ Eslatma</button>
        <div style="width:1px;height:20px;background:var(--border);margin:0 4px;"></div>
        <select class="input" style="width:auto;padding:4px 8px;font-size:11px;" onchange="if(this.value)document.execCommand('foreColor',false,this.value);this.value=''">
          <option value="">Rang</option>
          <option value="#00ff41">🟢 Yashil</option>
          <option value="#ffd700">🟡 Sariq</option>
          <option value="#00b4ff">🔵 Ko'k</option>
          <option value="#ff4757">🔴 Qizil</option>
          <option value="#e8ffe8">⬜ Oq</option>
        </select>
        <select class="input" style="width:auto;padding:4px 8px;font-size:11px;" onchange="if(this.value)document.execCommand('fontSize',false,this.value);this.value=''">
          <option value="">O'lcham</option>
          <option value="1">Kichik</option>
          <option value="3">Oddiy</option>
          <option value="5">Katta</option>
          <option value="7">Juda katta</option>
        </select>
      </div>
      <div id="richEditor" contenteditable="true" style="min-height:320px;padding:20px 24px;outline:none;font-size:14px;line-height:1.8;color:var(--text-1);">
        <h2 style="color:#e8ffe8;margin-bottom:12px;">Semantik HTML elementlari</h2>
        <p style="color:#7aad7a;margin-bottom:12px;">HTML5 da semantik teglar brauzer va qidiruv tizimlari uchun sahifaning tuzilishini tushunarli qiladi.</p>
        <h3 style="color:#e8ffe8;margin-bottom:8px;">Asosiy semantik teglar:</h3>
        <ul style="color:#7aad7a;padding-left:20px;margin-bottom:12px;">
          <li>&lt;header&gt; — sahifa yoki bo'lim boshi</li>
          <li>&lt;nav&gt; — navigatsiya havolalari</li>
          <li>&lt;main&gt; — asosiy kontent</li>
          <li>&lt;footer&gt; — pastki qism</li>
        </ul>
      </div>
    </div>

    <!-- Video upload -->
    <div class="card" id="videoSection">
      <div class="card-head"><h3>📹 Video dars (Pro)</h3></div>
      <div id="videoDropzone" style="border:2px dashed var(--border);border-radius:var(--r-lg);padding:40px;text-align:center;cursor:pointer;transition:var(--t);" onclick="triggerUpload()" ondragover="this.style.borderColor='var(--neon)'" ondragleave="this.style.borderColor='var(--border)'">
        <div style="font-size:40px;margin-bottom:12px;">📹</div>
        <div style="font-size:14px;font-weight:700;margin-bottom:6px;">Video yuklang yoki shu yerga torting</div>
        <div style="font-size:12px;color:var(--text-3);">MP4, MOV, AVI · Max 2GB · HD sifat tavsiya etiladi</div>
        <input type="file" id="videoInput" accept="video/*" style="display:none" onchange="startUpload(this)">
      </div>
      <div id="uploadProgress" style="display:none;margin-top:12px;">
        <div class="flex-between mb-8"><span style="font-size:12px;">lesson-6-semantik.mp4</span><span class="neon" style="font-size:12px;" id="upPct">0%</span></div>
        <div class="progress"><div class="progress-fill" id="upBar" style="width:0%"></div></div>
        <div style="font-size:11px;color:var(--text-3);margin-top:6px;" id="upInfo">Tayyorlanmoqda...</div>
      </div>
    </div>
  </div>

  <!-- Right: publish panel -->
  <div>
    <div class="card" style="position:sticky;top:calc(var(--nav-h)+16px);">
      <div class="card-head"><h3>📤 Nashr etish</h3></div>
      <div class="input-group"><label class="input-label">Holat</label>
        <select class="input" id="publishStatus">
          <option value="draft">📝 Draft (yashirin)</option>
          <option value="active" selected>✅ Aktiv (ko'rinadi)</option>
          <option value="scheduled">⏰ Vaqt belgilash</option>
        </select>
      </div>
      <div id="scheduleDate" style="display:none;">
        <div class="input-group"><label class="input-label">Nashr sanasi</label><input class="input" type="datetime-local"></div>
      </div>
      <div class="input-group"><label class="input-label">Taxminiy o'qish vaqti (daq)</label><input class="input" type="number" value="20" min="5"></div>
      <div class="input-group"><label class="input-label">SEO kalit so'zlar</label><input class="input" type="text" placeholder="html, semantik, teglar"></div>
      <hr>
      <div class="flex-between mb-12"><span style="font-size:12px;">So'ngi saqlangan:</span><span style="font-size:12px;color:var(--text-3);" id="saveTime">—</span></div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        <button class="btn btn-neon btn-full" onclick="publishLesson()">✅ Nashr etish</button>
        <button class="btn btn-ghost btn-full" onclick="saveDraft()">💾 Draft saqlash</button>
        <button class="btn btn-ghost btn-full" onclick="previewLesson()">👁 Preview</button>
        <button class="btn btn-danger btn-full" onclick="if(confirm('O\\'chirishni tasdiqlaysizmi?'))toast('Dars o\\'chirildi','error')">🗑 O'chirish</button>
      </div>
    </div>
  </div>
</div>`;

// Rich editor functions
function fmt(cmd){ document.execCommand(cmd, false, null); document.getElementById('richEditor').focus(); }
function fmtBlock(tag){ document.execCommand('formatBlock', false, '<'+tag+'>'); document.getElementById('richEditor').focus(); }
function insertCode(){
  document.execCommand('insertHTML', false, '<div style="background:#0a160a;border:1px solid #1a3a1a;border-radius:8px;padding:14px 18px;font-family:monospace;font-size:13px;color:#00ff41;margin:12px 0;">&lt;!-- Kod shu yerga --&gt;</div>');
}
function insertNote(type){
  const colors={tip:['#00ff41','rgba(0,255,65,.06)'],warn:['#ffd700','rgba(255,215,0,.06)']};
  const [c,bg]=colors[type]||colors.tip;
  document.execCommand('insertHTML',false,`<div style="background:${bg};border-left:3px solid ${c};border-radius:8px;padding:12px 16px;margin:12px 0;font-size:13px;color:var(--text-2);">💡 Eslatma matnini shu yerga yozing</div>`);
}
function triggerUpload(){ document.getElementById('videoInput').click(); }
function startUpload(input){
  if(!input.files[0]) return;
  const prog = document.getElementById('uploadProgress');
  prog.style.display='block';
  let pct=0;
  const t=setInterval(()=>{
    pct=Math.min(pct+2+(Math.random()*3|0),100);
    document.getElementById('upPct').textContent=pct+'%';
    document.getElementById('upBar').style.width=pct+'%';
    document.getElementById('upInfo').textContent=pct<100?'Yuklanmoqda... '+pct+'%':'✓ Yuklandi! Transcodlash boshlandi...';
    if(pct>=100){clearInterval(t);setTimeout(()=>{document.getElementById('upInfo').textContent='✓ Video tayyor! MP4 1080p';document.getElementById('upInfo').style.color='var(--neon)';},1500);}
  },120);
}
function publishLesson(){ toast('Dars nashr etildi ✓','success'); }
function saveDraft(){ document.getElementById('saveTime').textContent=new Date().toLocaleTimeString('uz-UZ',{hour:'2-digit',minute:'2-digit'}); toast('Draft saqlandi 💾','success'); }
function previewLesson(){ window.open('../lesson.html','_blank'); }
document.getElementById('publishStatus').addEventListener('change',function(){
  document.getElementById('scheduleDate').style.display=this.value==='scheduled'?'block':'none';
});
// Autosave
setInterval(()=>{ document.getElementById('saveTime').textContent=new Date().toLocaleTimeString('uz-UZ',{hour:'2-digit',minute:'2-digit'})+' (auto)'; },30000);
