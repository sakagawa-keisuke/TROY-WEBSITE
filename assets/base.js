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

  // Load dynamic site content from API if available
  (async function loadSiteContent() {
    try {
      const res = await fetch('/api/site');
      if (res.ok) {
        const site = await res.json();
        const profile = site.profile || {};
        const info = site.info || {};
        
        // Update profile page content
        if (document.querySelector('[data-page="profile"]')) {
          const titleEl = $('#profile-title');
          const tagEl = $('.tag');
          const sectionBody = $('.section-body p');
          const creditsList = $('.credits');
          
          if (titleEl && profile.title) {
            titleEl.innerHTML = profile.title.replace(/\(([^)]+)\)/, '<span class="aka">($1)</span>');
          }
          if (tagEl && profile.tag) {
            tagEl.textContent = profile.tag;
          }
          if (sectionBody && (profile.intro || profile.detail)) {
            sectionBody.textContent = profile.intro || profile.detail;
          }
          if (creditsList && Array.isArray(profile.credits)) {
            creditsList.innerHTML = profile.credits.map(c => `<li>${c}</li>`).join('');
          }
        }
        
        // Update info page content
        if (document.querySelector('[data-page="info"]') && info.email) {
          // Update contact information if needed
          const emailLinks = document.querySelectorAll('a[href^="mailto:"]');
          emailLinks.forEach(link => {
            if (info.email) link.href = `mailto:${info.email}`;
          });
        }
      }
    } catch (e) {
      // Silently fail - use static content as fallback
    }
  })();

})();

