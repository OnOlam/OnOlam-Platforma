/* OnOlam — burger.js  (barcha sahifalar uchun) */
(function () {
  const btn    = document.getElementById('burgerBtn');
  const drawer = document.getElementById('drawer');
  if (!btn || !drawer) return;

  function open()   { btn.classList.add('open'); drawer.classList.add('open'); document.body.classList.add('no-scroll'); btn.setAttribute('aria-expanded','true'); }
  function close()  { btn.classList.remove('open'); drawer.classList.remove('open'); document.body.classList.remove('no-scroll'); btn.setAttribute('aria-expanded','false'); }
  function toggle() { drawer.classList.contains('open') ? close() : open(); }

  btn.addEventListener('click', toggle);
  document.addEventListener('click', e => { if (drawer.classList.contains('open') && !drawer.contains(e.target) && !btn.contains(e.target)) close(); });
  drawer.querySelectorAll('.drawer-link').forEach(l => l.addEventListener('click', close));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  window.addEventListener('resize', () => { if (window.innerWidth > 768) close(); });
})();
