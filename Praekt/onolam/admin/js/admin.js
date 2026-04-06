/* OnOlam Admin — admin.js (barcha admin sahifalar uchun) */
(function(){
'use strict';

/* ── SIDEBAR MOBILE ── */
const mBtn = document.getElementById('mobSidebarBtn');
const side = document.querySelector('.admin-sidebar');
if(mBtn && side){
  mBtn.addEventListener('click', () => {
    side.classList.toggle('open');
  });
  document.addEventListener('click', e => {
    if(side.classList.contains('open') && !side.contains(e.target) && !mBtn.contains(e.target))
      side.classList.remove('open');
  });
}

/* ── TOAST ── */
window.toast = function(msg, type='success', icon=''){
  let container = document.querySelector('.toast-container');
  if(!container){ container = document.createElement('div'); container.className='toast-container'; document.body.appendChild(container); }
  const icons = {success:'✔',error:'✗',warning:'⚠',info:'ℹ'};
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.innerHTML = `<span>${icon || icons[type] || '●'}</span> ${msg}`;
  container.appendChild(t);
  setTimeout(() => { t.style.opacity='0'; t.style.transform='translateX(20px)'; t.style.transition='.3s'; setTimeout(()=>t.remove(), 300); }, 3000);
};

/* ── MODAL ── */
window.openModal = function(id){ const m=document.getElementById(id); if(m){ m.classList.add('open'); document.body.classList.add('no-scroll'); } };
window.closeModal = function(id){ const m=document.getElementById(id); if(m){ m.classList.remove('open'); document.body.classList.remove('no-scroll'); } };
document.addEventListener('keydown', e => { if(e.key==='Escape') document.querySelectorAll('.admin-modal.open').forEach(m=>m.classList.remove('open')); });

/* ── TABLE SORT ── */
window.sortTable = function(th, col){
  const table = th.closest('table');
  const tbody = table.querySelector('tbody');
  const rows  = Array.from(tbody.querySelectorAll('tr'));
  const asc   = th.dataset.asc !== 'true';
  th.dataset.asc = asc;
  table.querySelectorAll('thead th').forEach(t=>t.classList.remove('sorted'));
  th.classList.add('sorted');
  th.querySelector('.sort-arr').textContent = asc ? '↑' : '↓';
  rows.sort((a,b)=>{
    const av = a.cells[col]?.textContent.trim() || '';
    const bv = b.cells[col]?.textContent.trim() || '';
    return asc ? av.localeCompare(bv) : bv.localeCompare(av);
  });
  rows.forEach(r => tbody.appendChild(r));
};

/* ── TABLE SEARCH ── */
window.searchTable = function(input, tableId){
  const q = input.value.toLowerCase();
  const rows = document.querySelectorAll(`#${tableId} tbody tr`);
  rows.forEach(r => {
    r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
};

/* ── CONFIRM ACTION ── */
window.confirmAction = function(msg, cb){
  if(confirm(msg)) cb();
};

/* ── EXPORT CSV ── */
window.exportCSV = function(tableId, filename){
  const table = document.getElementById(tableId);
  if(!table){ toast('Jadval topilmadi','error'); return; }
  const rows = Array.from(table.querySelectorAll('tr'));
  const csv  = rows.map(r => Array.from(r.cells).map(c => '"'+c.textContent.trim().replace(/"/g,'""')+'"').join(',')).join('\n');
  const a    = document.createElement('a');
  a.href     = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(csv);
  a.download = (filename||'export') + '-' + new Date().toISOString().slice(0,10) + '.csv';
  a.click();
  toast('CSV yuklab olindi ✔','success');
};

/* ── LIVE CLOCK ── */
const clockEl = document.getElementById('liveClock');
if(clockEl){
  function tick(){ clockEl.textContent = new Date().toLocaleTimeString('uz-UZ'); }
  tick(); setInterval(tick, 1000);
}

/* ── REAL-TIME COUNTER (demo) ── */
window.animateCount = function(el, target, duration=1200){
  const start = parseInt(el.textContent.replace(/\D/g,'')) || 0;
  const step  = (target - start) / (duration / 16);
  let   cur   = start;
  const timer = setInterval(()=>{
    cur += step;
    if((step > 0 && cur >= target) || (step < 0 && cur <= target)){
      el.textContent = target.toLocaleString(); clearInterval(timer); return;
    }
    el.textContent = Math.floor(cur).toLocaleString();
  }, 16);
};

/* ── ANIMATE STATS ON LOAD ── */
document.querySelectorAll('.astat-num[data-target]').forEach(el => {
  const target = parseInt(el.dataset.target);
  el.textContent = '0';
  setTimeout(() => window.animateCount(el, target), 300);
});

})();
