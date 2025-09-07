// Base behaviors for non-home pages: SW registration + year + mobile nav
(function(){
  const $ = (s, r=document)=>r.querySelector(s);
  const y = $('#year'); if (y) y.textContent = new Date().getFullYear();
  const nav = $('.site-nav'); const btn = $('.nav-toggle');
  if (nav && btn) btn.addEventListener('click', ()=>{
    const ex = nav.getAttribute('aria-expanded')==='true';
    nav.setAttribute('aria-expanded', String(!ex));
    btn.setAttribute('aria-expanded', String(!ex));
  });
  if ('serviceWorker' in navigator && (location.protocol==='https:'||location.hostname==='localhost')) {
    window.addEventListener('load', ()=> navigator.serviceWorker.register('service-worker.js').catch(()=>{}));
  }
})();

