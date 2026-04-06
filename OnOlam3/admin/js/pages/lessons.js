document.getElementById('pageTitle').innerHTML='📚 Darslar <span style="color:var(--neon)">boshqaruvi</span>';
document.getElementById('pageDesc').textContent='8 ta kurs · 40 ta dars · Tartib o\'zgartirish, qo\'shish, o\'chirish';
document.getElementById('pageBody').innerHTML=`
<div class="stat-grid">
  <div class="stat-card"><div class="sc-top"><div class="sc-icon green">📚</div><span class="sc-change flat">—</span></div><div class="sc-num">8</div><div class="sc-label">Kurslar</div></div>
  <div class="stat-card"><div class="sc-top"><div class="sc-icon blue">📄</div><span class="sc-change up">+2</span></div><div class="sc-num">40</div><div class="sc-label">Darslar</div></div>
  <div class="stat-card"><div class="sc-top"><div class="sc-icon yellow">🆓</div></div><div class="sc-num">32</div><div class="sc-label">Free darslar</div></div>
  <div class="stat-card"><div class="sc-top"><div class="sc-icon orange">⚡</div></div><div class="sc-num">8</div><div class="sc-label">Pro darslar</div></div>
</div>
<div class="card">
  <div class="card-head">
    <h3>Kurslar va darslar</h3>
    <div class="flex gap-8">
      <div class="search-wrap"><span class="si">🔍</span><input class="input" placeholder="Kurs yoki dars qidirish..." oninput="filterTable('ls','lessonsTable')" id="ls" style="width:220px;"></div>
      <a href="lesson-editor.html"><button class="btn btn-neon btn-sm">+ Yangi dars</button></a>
    </div>
  </div>
  <div class="table-wrap">
    <table class="admin-table" id="lessonsTable">
      <thead><tr><th>#</th><th>Kurs</th><th>Dars nomi</th><th>Tur</th><th>Tarif</th><th>Holat</th><th>Ko'rishlar</th><th>Amallar</th></tr></thead>
      <tbody>
        ${[
          ['1','🌐 HTML','HTML bilan tanishish','📝 Matn','Free','✅ Aktiv','189'],
          ['2','🌐 HTML','Teglar va atributlar','📝 Matn','Free','✅ Aktiv','167'],
          ['3','🌐 HTML','Formalar va inputlar','📝 Matn','Free','✅ Aktiv','143'],
          ['4','🌐 HTML','Jadvallar va ro\'yxatlar','📝 Matn','Free','✅ Aktiv','98'],
          ['5','🌐 HTML','Semantik HTML','📹 Video','Pro','✅ Aktiv','42'],
          ['1','🎨 CSS','CSS bilan tanishish','📝 Matn','Free','✅ Aktiv','134'],
          ['2','🎨 CSS','Selektorlar','📝 Matn','Free','✅ Aktiv','118'],
          ['3','🎨 CSS','Flexbox','📝 Matn','Free','✅ Aktiv','102'],
          ['4','🎨 CSS','Grid Layout','📝 Matn','Free','✅ Aktiv','87'],
          ['5','🎨 CSS','Animatsiyalar','📹 Video','Pro','📝 Draft','0'],
        ].map(([n,kurs,nom,tur,tarif,holat,views])=>`
          <tr class="clickable">
            <td>${n}</td>
            <td>${kurs}</td>
            <td style="font-weight:600;color:var(--text-1);">${nom}</td>
            <td>${tur}</td>
            <td><span class="badge ${tarif==='Pro'?'badge-pro':'badge-free'}">${tarif}</span></td>
            <td><span class="chip ${holat.includes('Aktiv')?'chip-green':'chip-yellow'}">${holat}</span></td>
            <td>${views}</td>
            <td>
              <div class="flex gap-4">
                <a href="lesson-editor.html"><button class="btn btn-ghost btn-sm">✏</button></a>
                <button class="btn btn-danger btn-sm" onclick="if(confirm('O\\'chirishni tasdiqlaysizmi?'))toast('Dars o\\'chirildi','error')">🗑</button>
              </div>
            </td>
          </tr>`).join('')}
      </tbody>
    </table>
  </div>
</div>`;
