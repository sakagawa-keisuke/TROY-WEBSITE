// Kuroki Ryota (TROY) — Portfolio interactions (ESM)
// Modern features: SW registration, reduced-motion handling, optional View Transitions

(function () {
  const START_TS = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  const page = document.body?.dataset?.page || 'home';
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // Loading screen fade-out
  (function initLoadingScreen(){
    const loading = document.getElementById('loading-screen');
    if (!loading) return;
    const MIN_LOADING_MS = 2000; // show at least ~2s (shorter)
    const hide = () => {
      if (!loading) return;
      loading.classList.add('fade-out');
      setTimeout(() => { try { loading.remove(); } catch { loading.style.display = 'none'; } }, 550);
    };
    const scheduleHide = () => {
      const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      const elapsed = now - START_TS;
      const delay = Math.max(0, MIN_LOADING_MS - elapsed);
      setTimeout(hide, delay);
    };
    if (document.readyState === 'complete') scheduleHide();
    else { window.addEventListener('load', scheduleHide); setTimeout(hide, MIN_LOADING_MS + 2000); }
  })();

  // Custom cursor (dot + ring)
  (function initCursor(){
    if (matchMedia('(pointer: coarse)').matches) return; // skip on touch
    const dot = document.createElement('div'); dot.className = 'cursor-dot';
    const ring = document.createElement('div'); ring.className = 'cursor-ring';
    const label = document.createElement('div'); label.className = 'cursor-label'; label.textContent = '';
    document.body.appendChild(dot); document.body.appendChild(ring); document.body.appendChild(label);
    let hideTimer=null;
    const move = (e)=>{
      dot.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
      ring.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
      label.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -140%)`;
      clearTimeout(hideTimer); dot.classList.remove('cursor-hide'); ring.classList.remove('cursor-hide');
      hideTimer = setTimeout(()=>{ dot.classList.add('cursor-hide'); ring.classList.add('cursor-hide'); }, 3000);
    };
    window.addEventListener('pointermove', move);
    // Hover state on interactive elements
    const setHover = (on)=>{ document.documentElement.classList.toggle('cursor-hover', on); };
    document.addEventListener('mouseover', (e)=>{
      const t = e.target;
      const interactive = t && t.closest && t.closest('a,button,.work,.filter-btn');
      const on = !!interactive; setHover(on);
      if (on) {
        const custom = interactive.getAttribute('data-cursor-label');
        label.textContent = custom || (interactive.tagName === 'A' ? 'OPEN' : '');
      } else { label.textContent = ''; }
    });
  })();

  // Landing animations and transition
  (function initLanding(){
    if (page !== 'landing') return;
    const title = document.getElementById('landing-title');
    const cta = document.getElementById('landing-cta');
    const bg = document.getElementById('bg-video');
    const landingWrap = document.querySelector('.landing-wrap');
    
    // Split title into characters for stagger animation
    if (title && !title.dataset.splitted) {
      const txt = title.textContent || '';
      title.textContent = '';
      for (const ch of txt) {
        const span = document.createElement('span');
        span.className = 'ch'; span.textContent = ch;
        title.appendChild(span);
      }
      title.dataset.splitted = '1';
    }
    
    // Navigation function
    const navigateToMain = () => {
      document.documentElement.classList.add('leaving','pt-leave');
      const ovl = document.createElement('div'); ovl.className = 'pt-overlay'; document.body.appendChild(ovl);
      setTimeout(()=>{ location.href = 'index.html#works'; }, 360);
    };
    
    // CTA transition
    if (cta) {
      cta.addEventListener('click', (e)=>{
        navigateToMain();
        e.preventDefault();
      });
    }
    
    // Full screen click for navigation
    if (landingWrap) {
      landingWrap.addEventListener('click', navigateToMain);
      landingWrap.style.cursor = 'pointer';
    }
    
    // Auto-navigate after loading video finishes or 4 seconds
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      const video = loadingScreen.querySelector('video');
      if (video) {
        video.addEventListener('ended', () => {
          setTimeout(navigateToMain, 500);
        });
        // Fallback timeout
        setTimeout(() => {
          if (!document.hidden) navigateToMain();
        }, 4000);
      } else {
        // No video, just timeout
        setTimeout(navigateToMain, 3000);
      }
    }
    
    // Subtle parallax on mouse move
    if (bg) {
      window.addEventListener('mousemove', (e)=>{
        const x = (e.clientX / innerWidth - 0.5) * 2; // -1..1
        const y = (e.clientY / innerHeight - 0.5) * 2;
        bg.style.transform = `translate(-50%,-50%) scale(1.04) translate(${x*6}px, ${y*4}px)`;
      });
    }
  })();

  // Works intro blurb auto-hide
  (function initWorksIntro(){
    if (page !== 'home') return;
    const intro = document.getElementById('works-intro');
    if (!intro) return;
    const HIDE_AFTER = 2000; // 2s
    setTimeout(()=>{
      intro.classList.add('fade-out');
      setTimeout(()=>{ try { intro.remove(); } catch { intro.style.display='none'; } }, 450);
    }, HIDE_AFTER);
  })();

  // Interactive smoke overlay for home
  (function initSmoke(){
    if (page !== 'home') return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isCoarse = window.matchMedia('(pointer: coarse)').matches;
    const vw = Math.min(window.innerWidth, window.innerHeight);
    const isDesktop = !isCoarse;
    // Read user preference (desktop only). Default: enabled on desktop, disabled on phone.
    let stored = null; try { stored = localStorage.getItem('smoke:enabled'); } catch {}
    const defaultEnabled = false; // default OFF even on desktop
    let userEnabled = stored == null ? defaultEnabled : stored === '1';

    // Small coarse-pointer devices (phones): disable entirely
    if (isCoarse && vw < 780) return;

    // Runtime controller (start/stop without reload)
    let canvas = null, ctx = null, w = 0, h = 0, rafId = 0;
    let resizeHandler = null, moveHandler = null;

    function start() {
      // Scale down resolution on tablets / reduced motion
      let scale = window.devicePixelRatio > 1 ? 0.55 : 0.65; // default
      if (isCoarse || prefersReducedMotion) scale = 0.5;
      canvas = document.createElement('canvas');
      canvas.id = 'smoke-canvas';
      canvas.className = 'smoke-canvas';
      document.body.appendChild(canvas);
      ctx = canvas.getContext('2d');
      const resize = ()=>{
        w = Math.max(1, Math.floor(innerWidth * scale));
        h = Math.max(1, Math.floor(innerHeight * scale));
        canvas.width = w; canvas.height = h;
      };
      resize();
      resizeHandler = resize; window.addEventListener('resize', resizeHandler);

    // Parameters for variability (thinner/thicker over time)
    const reduced = (isCoarse || prefersReducedMotion);
    const CFG = reduced ? {
      baseFog: 0.020,
      fogRange: 0.020,
      innerBase: 0.008,
      innerRange: 0.012,
      outerBase: 0.055,
      outerRange: 0.070,
      trailLife: 900
    } : {
      baseFog: 0.028,
      fogRange: 0.030,
      innerBase: 0.012,
      innerRange: 0.016,
      outerBase: 0.080,
      outerRange: 0.090,
      trailLife: 1200
    };

    // Seeds for drifting blobs
    const SEEDS = Array.from({length: 7}, (_,i)=>({
      r: 120 + Math.random()*200,
      x: Math.random(), y: Math.random(),
      spx: (Math.random()*0.4+0.08) * (Math.random()<0.5?-1:1),
      spy: (Math.random()*0.3+0.06) * (Math.random()<0.5?-1:1),
      phase: Math.random()*Math.PI*2
    }));

    // Flowing noise patterns (two layers) to avoid monotony
    function makeNoiseTile(size=256, alphaMax=60) {
      const c = document.createElement('canvas'); c.width = c.height = size;
      const ictx = c.getContext('2d');
      const img = ictx.createImageData(size, size);
      for (let i=0;i<img.data.length;i+=4) {
        const a = Math.random() * alphaMax; // 0..alphaMax (out of 255)
        img.data[i+0] = 0; img.data[i+1] = 0; img.data[i+2] = 0; img.data[i+3] = a;
      }
      ictx.putImageData(img, 0, 0);
      return c;
    }
      const noiseTile1 = makeNoiseTile(256, 50);
      const noiseTile2 = makeNoiseTile(320, 40);
      const pat1 = ctx.createPattern(noiseTile1, 'repeat');
      const pat2 = ctx.createPattern(noiseTile2, 'repeat');
      const noiseTile3 = makeNoiseTile(192, 55);
      const pat3 = ctx.createPattern(noiseTile3, 'repeat');
      let n1x = 0, n1y = 0, n2x = 0, n2y = 0, n3x = 0, n3y = 0;
    // Wind vector that slowly changes direction
    let windT = Math.random()*1000;

    // Persistent clear mask (keeps bright areas once revealed)
      const maskC = document.createElement('canvas');
      const maskCtx = maskC.getContext('2d');
      const allowMask = !(isCoarse || prefersReducedMotion); // disable on tablets / reduced motion
      const setMaskSize = () => { maskC.width = w; maskC.height = h; };
      setMaskSize(); window.addEventListener('resize', setMaskSize);
      const stamp = (clientX, clientY) => {
        const px = clientX * scale, py = clientY * scale;
        const r = 160 * scale; // reveal radius
        const g = maskCtx.createRadialGradient(px, py, r*0.1, px, py, r);
        g.addColorStop(0, 'rgba(255,255,255,1)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        maskCtx.globalCompositeOperation = 'source-over';
        maskCtx.fillStyle = g;
        maskCtx.beginPath(); maskCtx.arc(px, py, r, 0, Math.PI*2); maskCtx.fill();
      };
      if (allowMask) {
        moveHandler = (e)=>{ stamp(e.clientX, e.clientY); };
        window.addEventListener('pointermove', moveHandler);
        window.addEventListener('pointerdown', moveHandler);
      }

      let last = performance.now();
      const DECAY_MS = 20000; // mask fades back over ~20s
      function tick(now){
        const dt = Math.min(33, now - last); last = now;
      // Global breathing for fog density (make it thinner/thicker over time)
      const breath = (Math.sin(now/5200) + Math.sin(now/7300 + 0.8)) * 0.5; // -1..1 approx
      const clamp01 = (v)=> Math.max(0, Math.min(1, v));
      const fogAlpha = clamp01(CFG.baseFog + CFG.fogRange * (0.5 + 0.5*breath));

      // Lightly re-fog with translucent black
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = `rgba(0,0,0,${fogAlpha.toFixed(3)})`;
      ctx.fillRect(0,0,w,h);

      // Update wind and pattern offsets
      windT += dt/10000;
      const wind = {
        x: Math.cos(windT*0.9) * 0.08 + Math.sin(windT*0.7) * 0.05,
        y: Math.sin(windT*0.8) * 0.06 + Math.cos(windT*0.6) * 0.04
      };
      n1x += (0.08 + wind.x*0.7) * dt; n1y += (0.05 + wind.y*0.6) * dt;
      n2x += (0.03 + wind.x*0.4) * dt; n2y += (0.09 + wind.y*0.8) * dt;
      n3x += (0.06 + wind.x*0.5) * dt; n3y += (0.04 + wind.y*0.7) * dt;

      // Draw moving noise layers at different scales
      if (!prefersReducedMotion) {
        if (pat1) {
          ctx.save();
          ctx.globalAlpha = (reduced ? 0.16 : 0.22) + 0.15*(0.5+0.5*breath);
          ctx.setTransform(1,0,0,1, 0,0); // reset
          const s1 = 1.06 + 0.02*Math.sin(now/5000);
          const a1 = 0.02*Math.sin(now/7000);
          ctx.translate(w/2, h/2);
          ctx.rotate(a1);
          ctx.scale(s1, s1);
          ctx.translate(-w/2, -h/2);
          ctx.translate(-((n1x/40)%noiseTile1.width), -((n1y/40)%noiseTile1.height));
          ctx.fillStyle = pat1;
          ctx.fillRect(0,0, (w/s1)+noiseTile1.width*2, (h/s1)+noiseTile1.height*2);
          ctx.restore();
        }
        if (pat2) {
          ctx.save();
          ctx.globalAlpha = (reduced ? 0.12 : 0.16) + 0.12*(0.5-0.5*breath);
          ctx.setTransform(1,0,0,1, 0,0);
          const s2 = 0.74 + 0.02*Math.cos(now/6200);
          const a2 = -0.018*Math.sin(now/8200 + 0.6);
          ctx.translate(w/2, h/2);
          ctx.rotate(a2);
          ctx.scale(s2, s2);
          ctx.translate(-w/2, -h/2);
          ctx.translate(-((n2x/30)%noiseTile2.width), -((n2y/30)%noiseTile2.height));
          ctx.fillStyle = pat2;
          ctx.fillRect(0,0, (w/s2)+noiseTile2.width*2, (h/s2)+noiseTile2.height*2);
          ctx.restore();
        }
        if (pat3) {
          ctx.save();
          ctx.globalAlpha = (reduced ? 0.08 : 0.12) + 0.10*(0.5+0.5*Math.sin(now/9100));
          ctx.setTransform(1,0,0,1, 0,0);
          const s3 = 0.9 + 0.03*Math.sin(now/7800 + 1.1);
          const a3 = 0.026*Math.sin(now/10400 + 0.3);
          ctx.translate(w/2, h/2);
          ctx.rotate(a3);
          ctx.scale(s3, s3);
          ctx.translate(-w/2, -h/2);
          ctx.translate(-((n3x/36)%noiseTile3.width), -((n3y/36)%noiseTile3.height));
          ctx.fillStyle = pat3;
          ctx.fillRect(0,0, (w/s3)+noiseTile3.width*2, (h/s3)+noiseTile3.height*2);
          ctx.restore();
        }
      }

      // Drifting soft dark blobs to create uneven smoke density
      for (let i=0;i<SEEDS.length;i++){
        const s = SEEDS[i];
        s.x += s.spx * dt/60000; s.y += s.spy * dt/60000; // very slow drift
        if (s.x < -0.2) s.x = 1.2; if (s.x > 1.2) s.x = -0.2;
        if (s.y < -0.2) s.y = 1.2; if (s.y > 1.2) s.y = -0.2;
        const cx = s.x * w, cy = s.y * h; const r = (s.r * (0.6 + 0.4*Math.sin(now/4000 + i))) * (scale*1.4);
        const innerA = clamp01(CFG.innerBase + CFG.innerRange * (0.5 + 0.5*Math.sin(now/4600 + s.phase)));
        const outerA = clamp01(CFG.outerBase + CFG.outerRange * (0.5 + 0.5*Math.sin(now/6400 + s.phase*1.3)));
        const g = ctx.createRadialGradient(cx, cy, r*0.2, cx, cy, r);
        g.addColorStop(0, `rgba(0,0,0,${innerA.toFixed(3)})`);
        g.addColorStop(1, `rgba(0,0,0,${outerA.toFixed(3)})`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fill();
      }

      // Gradually fade the mask so fog returns in ~30s
      if (allowMask) {
        const fade = Math.min(1, dt / DECAY_MS);
        maskCtx.save();
        maskCtx.globalCompositeOperation = 'destination-out';
        maskCtx.globalAlpha = fade;
        maskCtx.fillStyle = 'rgba(0,0,0,1)';
        maskCtx.fillRect(0, 0, maskC.width, maskC.height);
        maskCtx.restore();
        // Apply persistent clear mask (dest-out keeps revealed areas bright until it decays)
        ctx.globalCompositeOperation = 'destination-out';
        ctx.drawImage(maskC, 0, 0);
      }
      ctx.globalCompositeOperation = 'source-over';
      } // end tick
      const loop = (t)=>{ tick(t); rafId = requestAnimationFrame(loop); };
      rafId = requestAnimationFrame(loop);

      // Expose stop/cleanup
      return function stop() {
        try { if (rafId) cancelAnimationFrame(rafId); } catch {}
        if (resizeHandler) window.removeEventListener('resize', resizeHandler);
        if (moveHandler) { window.removeEventListener('pointermove', moveHandler); window.removeEventListener('pointerdown', moveHandler); }
        try { canvas?.remove(); } catch {}
      };
    } // end start

    // Toggle UI (desktop only)
    let stopFn = null;
    const addToggle = () => {
      if (!isDesktop) return;
      const btn = document.createElement('button');
      btn.className = 'smoke-toggle';
      const setLabel = () => { btn.textContent = `Smoke: ${userEnabled ? 'On' : 'Off'}`; };
      setLabel();
      btn.addEventListener('click', () => {
        userEnabled = !userEnabled;
        try { localStorage.setItem('smoke:enabled', userEnabled ? '1' : '0'); } catch {}
        setLabel();
        if (userEnabled) {
          if (!stopFn) stopFn = start();
        } else {
          if (stopFn) { stopFn(); stopFn = null; }
        }
      });
      document.body.appendChild(btn);
    };
    addToggle();

    if (userEnabled) stopFn = start();
  })();

  // Page transition for internal links
  (function initPageTransitions(){
    const isInternal = (a)=>{
      try { const u = new URL(a, location.href); return u.origin === location.origin; } catch { return false; }
    };
    document.addEventListener('click', (e)=>{
      const a = e.target.closest && e.target.closest('a');
      if (!a) return;
      const href = a.getAttribute('href') || '';
      if (!href || href.startsWith('#')) return; // hash handled elsewhere
      if (!isInternal(href)) return;
      if (a.hasAttribute('data-no-transition')) return;
      e.preventDefault();
      const go = ()=>{ location.href = href; };
      if (document.startViewTransition) {
        document.startViewTransition(go);
      } else {
        document.documentElement.classList.add('pt-leave');
        const ovl = document.createElement('div'); ovl.className = 'pt-overlay'; document.body.appendChild(ovl);
        setTimeout(go, 320);
      }
    });
    // Enter animation
    window.addEventListener('pageshow', ()=>{
      // Add reverse animation shortly after load
      setTimeout(()=>{
        document.documentElement.classList.add('pt-enter');
        const ovl = document.querySelector('.pt-overlay');
        if (!ovl) { const o=document.createElement('div'); o.className='pt-overlay'; document.body.appendChild(o); }
        setTimeout(()=>{
          document.documentElement.classList.remove('pt-enter');
          const el = document.querySelector('.pt-overlay'); if (el) el.remove();
        }, 450);
      }, 10);
    });
  })();

  // Year
  const y = new Date().getFullYear();
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = y;

  // Mobile nav toggle
  const nav = $('.site-nav');
  const navBtn = $('.nav-toggle');
  if (nav && navBtn) {
    navBtn.addEventListener('click', () => {
      const expanded = nav.getAttribute('aria-expanded') === 'true';
      nav.setAttribute('aria-expanded', String(!expanded));
      navBtn.setAttribute('aria-expanded', String(!expanded));
    });
  }

  // Sections and routing (home only)
  const sectionIds = page === 'home' ? ['profile', 'works', 'info'] : [];
  const sectionsMap = Object.fromEntries(
    sectionIds.map((id) => [id, document.getElementById(id)]).filter(([, el]) => !!el)
  );
  let pendingCategory = null; // for deep-linked category
  let applyFilter; // will be defined later

  const parseHash = () => {
    const h = (location.hash || '').replace('#', '');
    const parts = h.split('/');
    const id = parts[0] || '';
    const arg = parts[1] || '';
    return { id, arg };
  };

  const showAll = () => {
    Object.values(sectionsMap).forEach((el) => { if (el) el.hidden = false; });
  };
  const showOnly = (id) => {
    Object.entries(sectionsMap).forEach(([key, el]) => { if (el) el.hidden = key !== id; });
    activate(id);
    if (nav) { nav.setAttribute('aria-expanded', 'false'); }
    if (navBtn) { navBtn.setAttribute('aria-expanded', 'false'); }
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  };

  const applyRouteFromHash = () => {
    const { id, arg } = parseHash();
    if (id === 'project' && arg) {
      // Deep link project view
      const node = $(`.work[data-slug="${CSS.escape(arg)}"]`);
      if (node) openProject(node);
      return;
    }

    if (sectionIds.includes(id)) {
      showOnly(id);
      if (id === 'works') pendingCategory = arg || 'all';
    } else {
      // Default to Works-only on top
      showOnly('works');
      pendingCategory = arg || 'all';
    }
    // applyFilter will be called later after it's defined
  };

  if (page === 'home') {
    // Intercept only nav links to switch sections
    $$('.site-nav a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const id = a.getAttribute('href');
        if (id && id.startsWith('#') && id.length > 1) {
          const target = id.slice(1);
          if (sectionIds.includes(target)) {
            e.preventDefault();
            history.replaceState(null, '', id);
            showOnly(target);
            return;
          }
        }
      });
    });
  }

  // Keep smooth scroll for non-nav internal links (e.g., skip link)
  $$('a[href^="#"]').filter((a) => !a.closest('.site-nav')).forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id && id.startsWith('#') && id.length > 1) {
        const el = document.getElementById(id.slice(1));
        if (el) {
          e.preventDefault();
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          history.replaceState(null, '', id);
        }
      }
    });
  });

  // Active link on scroll
  const sections = Object.values(sectionsMap).filter(Boolean);
  const navLinks = $$('.site-nav a').filter((a) => a.getAttribute('href')?.startsWith('#'));
  const activate = (id) => {
    navLinks.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === `#${id}`));
  };
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) activate(entry.target.id);
      });
    },
    { rootMargin: '-40% 0px -55% 0px', threshold: [0, 1] }
  );
  if (page === 'home') sections.forEach((s) => io.observe(s));

  // Initialize route (home only)
  if (page === 'home') {
    window.addEventListener('hashchange', applyRouteFromHash);
    // applyRouteFromHash will be called after applyFilter is defined
  }

  // Register Service Worker (PWA)
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('service-worker.js').catch(() => {});
    });
  }

  // Live refresh when Admin updates works (BroadcastChannel)
  (function initLiveRefresh(){
    try {
      if ('BroadcastChannel' in window) {
        const bc = new BroadcastChannel('troy-sync');
        bc.onmessage = (ev) => {
          if (ev && ev.data === 'works-updated') {
            location.reload();
          }
        };
      }
    } catch {}
  })();

  // Load site content (profile, info) if available
  (async function loadSiteContent(){
    try {
      const res = await fetch('/api/site');
      if (!res.ok) return;
      const site = await res.json();
      if (!site) return;
      // Background video (index.html and landing/top.html)
      try {
        const bgVideoEl = document.getElementById('bg-video');
        const cfg = site.background || site.hero || {};
        const src = cfg.video || cfg.src;
        const poster = cfg.poster || '';
        if (bgVideoEl && src) {
          // If <video> had <source> children, replace with direct src for simplicity
          bgVideoEl.innerHTML = '';
          bgVideoEl.setAttribute('src', src);
          if (poster) bgVideoEl.setAttribute('poster', poster);
          const tryPlay = () => { const p = bgVideoEl.play?.(); if (p && p.catch) p.catch(()=>{}); };
          bgVideoEl.addEventListener('loadedmetadata', tryPlay, { once: true });
        }
      } catch {}
      // Profile
      if (site.profile) {
        const p = site.profile;
        const t = document.getElementById('profile-title');
        const tag = document.querySelector('#profile .tag');
        const intro = document.querySelector('#profile .bio-intro');
        const detail = document.querySelector('#profile .bio-detail');
        const credits = document.querySelector('#profile .credits');
        if (t && p.title) t.textContent = p.title;
        if (tag && p.tag) tag.textContent = p.tag;
        if (intro && p.intro) intro.textContent = p.intro;
        if (detail && p.detail) detail.textContent = p.detail;
        if (credits && Array.isArray(p.credits)) { credits.innerHTML = p.credits.map((s)=>`<li>${s}</li>`).join(''); }
      }
      // Info
      if (site.info) {
        const i = site.info;
        const mailA = document.querySelector('#info a[href^="mailto:"]');
        if (mailA && i.email) { mailA.href = `mailto:${i.email}`; mailA.textContent = i.email; }
        const instaA = document.querySelector('#info a[href*="instagram.com"]');
        if (instaA && i.instagramUrl) { instaA.href = i.instagramUrl; if (i.instagramHandle) instaA.textContent = i.instagramHandle; }
        const avail = document.querySelector('#info .info-cols ul:nth-of-type(2)');
        const press = document.querySelector('#info .info-cols ul:nth-of-type(3)');
        const availBox = document.querySelector('#info .info-cols > div:nth-of-type(2) ul');
        const pressBox = document.querySelector('#info .info-cols > div:nth-of-type(3) ul');
        if (availBox && Array.isArray(i.availability)) { availBox.innerHTML = i.availability.map((s)=>`<li>${s}</li>`).join(''); }
        if (pressBox && Array.isArray(i.press)) { pressBox.innerHTML = i.press.map((s)=>`<li>${s}</li>`).join(''); }
      }

      // Landing (top.html) text overrides
      try {
        const landing = site.landing || {};
        const titleEl = document.getElementById('landing-title');
        const subtitleEl = document.getElementById('landing-subtitle');
        const ctaEl = document.getElementById('landing-cta');
        if (titleEl && landing.title) titleEl.textContent = landing.title;
        if (subtitleEl && landing.subtitle) subtitleEl.textContent = landing.subtitle;
        if (ctaEl) {
          if (landing.ctaLabel) ctaEl.textContent = landing.ctaLabel;
          if (landing.ctaHref) ctaEl.setAttribute('href', landing.ctaHref);
        }
      } catch {}
    } catch {}
  })();

  // Lightbox
  const lightbox = $('#lightbox');
  const media = $('#lightbox-media');
  const caption = $('#lightbox-caption');
  const closeBtn = $('#lightbox .close');
  let lastFocus = null;

  function openLightbox(node) {
    if (!lightbox || !media || !caption) return;
    const kind = node.getAttribute('data-kind');
    const title = $('.ovl-title', node)?.textContent || $('.work-title', node)?.textContent || '';
    const meta = $('.ovl-meta', node)?.textContent || $('.work-meta', node)?.textContent || '';
    caption.textContent = `${title} ${meta ? `— ${meta}` : ''}`;

    // Clear
    media.innerHTML = '';

    if (kind === 'video') {
      const src = node.getAttribute('data-video-src') || $('.work-video', node)?.getAttribute('src') || $('.work-video', node)?.getAttribute('data-src');
      const poster = node.getAttribute('data-poster') || $('.work-video', node)?.getAttribute('poster') || '';
      const v = document.createElement('video');
      v.setAttribute('controls', '');
      v.setAttribute('playsinline', '');
      v.setAttribute('autoplay', '');
      v.setAttribute('loop', '');
      if (poster) v.setAttribute('poster', poster);
      if (src) v.src = src;
      media.appendChild(v);
    } else if (kind === 'youtube') {
      const id = node.getAttribute('data-video');
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
      iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
      iframe.allowFullscreen = true;
      iframe.title = title || 'YouTube video';
      media.appendChild(iframe);
    } else if (kind === 'vimeo') {
      const id = node.getAttribute('data-video');
      const iframe = document.createElement('iframe');
      iframe.src = `https://player.vimeo.com/video/${id}?autoplay=1`;
      iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
      iframe.allowFullscreen = true;
      iframe.title = title || 'Vimeo video';
      media.appendChild(iframe);
    } else if (kind === 'image') {
      const src = node.getAttribute('data-image');
      const img = document.createElement('img');
      img.src = src || '';
      img.alt = title || 'Work image';
      media.appendChild(img);
    }

    const doOpen = () => {
      lightbox.hidden = false;
      lightbox.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      lastFocus = document.activeElement;
      closeBtn?.focus();
    };
    if (document.startViewTransition) {
      document.startViewTransition(doOpen);
    } else {
      doOpen();
    }
  }

  function closeLightbox() {
    if (!lightbox || !media) return;
    const doClose = () => {
      lightbox.hidden = true;
      lightbox.setAttribute('aria-hidden', 'true');
      media.innerHTML = '';
      document.body.style.overflow = '';
      if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
    };
    if (document.startViewTransition) {
      document.startViewTransition(doClose);
    } else {
      doClose();
    }
  }

  if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
  if (lightbox) {
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeLightbox();
    });
  }

  // Project view (detail overlay)
  const project = $('#project');
  const projectMedia = $('#project-media');
  const projectTitle = $('#project-title');
  const projectMeta = $('#project-meta');
  const projectDesc = $('#project-desc');
  const projectCredits = $('#project-credits');
  const projectLinks = $('#project-links');
  const projectClose = $('.project-close');

  function openProject(node) {
    if (!project) return;
    const kind = node.getAttribute('data-kind');
    const title = node.getAttribute('data-title') || $('.ovl-title', node)?.textContent || '';
    const meta = node.getAttribute('data-meta') || $('.ovl-meta', node)?.textContent || '';
    const desc = node.getAttribute('data-desc') || '';
    const link = node.getAttribute('data-link') || '';
    const cats = node.getAttribute('data-cats') || '';

    // Additional details
    const projectType = node.getAttribute('data-project-type') || '';
    const date = node.getAttribute('data-date') || '';
    const role = node.getAttribute('data-role') || '';

    projectTitle.textContent = title;
    // Build meta line (e.g., Dir. · Type · Role · Category)
    const metaParts = [meta];
    if (projectType) metaParts.push(projectType);
    if (role) metaParts.push(role);
    if (cats) metaParts.push(cats);
    projectMeta.textContent = metaParts.filter(Boolean).join(' · ');

    // Populate details grid
    const populateProjectInfo = (id, value) => {
      const wrap = document.getElementById(id + '-info');
      const val = document.getElementById(id);
      if (!wrap || !val) return;
      if (value && String(value).trim()) {
        val.textContent = value;
        wrap.style.display = 'flex';
      } else {
        wrap.style.display = 'none';
      }
    };

    const categoryNames = {
      'feature-films': 'Feature Films',
      'music-videos': 'Music Videos',
      'short-films': 'Short Films',
      'documentaries': 'Documentaries',
      'commercials': 'Commercials'
    };

    populateProjectInfo('project-client', node.getAttribute('data-client-name') || '');
    populateProjectInfo('project-type', projectType);
    populateProjectInfo('project-date', date);
    populateProjectInfo('project-role', role);
    populateProjectInfo('project-category', categoryNames[cats] || cats);

    // Toggle whole section
    const detailsSection = document.getElementById('project-details');
    if (detailsSection) {
      const hasAny = [
        node.getAttribute('data-client-name'), projectType, date, role, cats
      ].some(v => v && String(v).trim());
      detailsSection.style.display = hasAny ? 'block' : 'none';
    }
    
    projectDesc.textContent = desc;
    projectCredits.innerHTML = '';
    projectLinks.innerHTML = '';

    // Media (single or gallery)
    projectMedia.innerHTML = '';
    // Build media list from data-media (JSON) or fallback to single
    const mediaJson = node.getAttribute('data-media');
    let mediaList = [];
    if (mediaJson) {
      try { const arr = JSON.parse(mediaJson); if (Array.isArray(arr)) mediaList = arr; } catch {}
    }
    if (mediaList.length === 0) {
      const src = node.getAttribute('data-video-src') || $('.work-video', node)?.getAttribute('src') || $('.work-video', node)?.getAttribute('data-src') || '';
      const poster = node.getAttribute('data-poster') || $('.work-video', node)?.getAttribute('poster') || '';
      const imgSrc = node.getAttribute('data-image') || '';
      if (imgSrc) mediaList.push({ kind: 'image', imageSrc: imgSrc });
      else if (src) mediaList.push({ kind: 'video', videoSrc: src, poster });
    }

    // Normalize
    mediaList = mediaList.map((m)=>({
      kind: m.kind || (m.imageSrc ? 'image' : 'video'),
      videoSrc: m.videoSrc || m.src || '',
      imageSrc: m.imageSrc || '',
      poster: m.poster || ''
    })).filter(m => (m.kind === 'image' ? !!m.imageSrc : !!m.videoSrc));

    let cur = 0;
    const total = mediaList.length;
    const render = (i)=>{
      cur = Math.max(0, Math.min(total-1, i));
      projectMedia.innerHTML = '';
      const m = mediaList[cur];
      if (!m) return;
      if (m.kind === 'image') {
        const img = document.createElement('img');
        img.src = m.imageSrc; img.alt = title || 'Work image';
        projectMedia.appendChild(img);
      } else { // video
        const v = document.createElement('video');
        v.setAttribute('controls', ''); v.setAttribute('playsinline',''); v.setAttribute('webkit-playsinline',''); v.setAttribute('autoplay',''); v.setAttribute('loop',''); v.muted = true;
        if (m.poster) v.setAttribute('poster', m.poster);
        v.src = m.videoSrc;
        projectMedia.appendChild(v);
        const tryPlay = () => { const p=v.play(); if(p&&p.catch) p.catch(()=>{}); };
        v.addEventListener('loadedmetadata', tryPlay, { once: true });
      }
      // Update thumbs ARIA
      const thumbs = document.querySelectorAll('.project-thumb');
      thumbs.forEach((t, idx)=> t.setAttribute('aria-current', String(idx === cur)));
    };

    if (total > 1) {
      // Nav buttons
      let nav = document.querySelector('.project-nav');
      if (!nav) { nav = document.createElement('div'); nav.className = 'project-nav'; projectMedia.appendChild(nav); }
      nav.innerHTML = '';
      const prev = document.createElement('button'); prev.type='button'; prev.setAttribute('aria-label','Previous'); prev.textContent = '‹';
      const next = document.createElement('button'); next.type='button'; next.setAttribute('aria-label','Next'); next.textContent = '›';
      nav.appendChild(prev); nav.appendChild(next);
      prev.addEventListener('click', (e)=>{ e.stopPropagation(); render((cur-1+total)%total); });
      next.addEventListener('click', (e)=>{ e.stopPropagation(); render((cur+1)%total); });

      // Thumbs
      let thumbsWrap = document.getElementById('project-thumbs');
      if (!thumbsWrap) {
        thumbsWrap = document.createElement('div');
        thumbsWrap.id = 'project-thumbs';
        thumbsWrap.className = 'project-thumbs';
        projectMedia.insertAdjacentElement('afterend', thumbsWrap);
      } else { thumbsWrap.innerHTML=''; }
      mediaList.forEach((m, idx)=>{
        const th = document.createElement('div'); th.className = 'project-thumb'; th.setAttribute('role','button'); th.setAttribute('tabindex','0'); th.setAttribute('aria-current', String(idx===0));
        if (m.kind === 'image') {
          const im = document.createElement('img'); im.src = m.imageSrc; im.alt = `Media ${idx+1}`; th.appendChild(im);
        } else {
          const vv = document.createElement('video'); vv.src = m.videoSrc; vv.muted=true; vv.playsInline=true; vv.preload='metadata'; th.appendChild(vv);
        }
        th.addEventListener('click', (e)=>{ e.stopPropagation(); render(idx); });
        th.addEventListener('keydown', (e)=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); render(idx);} });
        thumbsWrap.appendChild(th);
      });

      // Keyboard navigation
      const onKey = (e)=>{
        if (project.hidden) return;
        if (e.key === 'ArrowRight') { render((cur+1)%total); }
        else if (e.key === 'ArrowLeft') { render((cur-1+total)%total); }
      };
      document.addEventListener('keydown', onKey);
      // Clean up on close
      const origClose = closeProject;
      closeProject = function(){ document.removeEventListener('keydown', onKey); origClose(); };
    } else {
      // Ensure thumbs are cleared when single media
      const thumbsWrap = document.getElementById('project-thumbs'); if (thumbsWrap) thumbsWrap.remove();
      const nav = document.querySelector('.project-nav'); if (nav) nav.remove();
    }

    render(0);

    if (link) {
      const a = document.createElement('a');
      a.href = link; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'External Link ↗';
      projectLinks.appendChild(a);
    }

    // Inject JSON-LD (VideoObject / CreativeWork)
    try {
      const ld = document.getElementById('ld-project'); if (ld) ld.remove();
      const data = (function(){
        if (kind === 'video') {
          return {
            '@context':'https://schema.org', '@type':'VideoObject',
            name: title || '', description: desc || meta || '',
            thumbnailUrl: poster || undefined, uploadDate: date || undefined, creator: client || undefined,
            genre: cats || undefined, url: (typeof location!=='undefined'? location.href : ''),
          };
        } else {
          return { '@context':'https://schema.org', '@type':'CreativeWork', name: title || '', description: desc || meta || '', url: (typeof location!=='undefined'? location.href : '') };
        }
      })();
      const s = document.createElement('script'); s.type='application/ld+json'; s.id='ld-project'; s.textContent = JSON.stringify(data);
      document.body.appendChild(s);
    } catch {}
    // Related works
    populateRelatedVideos(cats, node.getAttribute('data-slug'));

    const doOpen = () => {
      project.hidden = false; project.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      lastFocus = document.activeElement; projectClose?.focus();
    };
    if (document.startViewTransition) document.startViewTransition(doOpen); else doOpen();
  }

  // Related works: same category, exclude current
  async function populateRelatedVideos(currentCategory, currentSlug) {
    const relatedSection = document.getElementById('project-related');
    const relatedGrid = document.getElementById('related-videos');
    if (!relatedSection || !relatedGrid || !currentCategory) {
      if (relatedSection) relatedSection.style.display = 'none';
      return;
    }

    try {
      const SERVER_ORIGIN = 'http://localhost:3000';
      let apiOrigin = location.origin;
      let allWorks = [];
      // Prefer API
      try {
        const res = await fetch('/api/works');
        if (res.ok) allWorks = await res.json();
      } catch {}
      // Fallback to localhost:3000
      if (!Array.isArray(allWorks) || allWorks.length === 0) {
        try { const res2 = await fetch(SERVER_ORIGIN + '/api/works', { mode: 'cors' }); if (res2.ok) { allWorks = await res2.json(); apiOrigin = SERVER_ORIGIN; } } catch {}
      }
      // Fallback to DOM
      if (!Array.isArray(allWorks) || allWorks.length === 0) {
        const nodes = $$('.works-grid .work');
        allWorks = nodes.map(n => ({
          slug: n.getAttribute('data-slug'),
          title: n.getAttribute('data-title') || $('.ovl-title', n)?.textContent || '',
          cats: n.getAttribute('data-cats') || '',
          kind: n.getAttribute('data-kind') || 'video',
          videoSrc: n.getAttribute('data-video-src') || $('.work-video', n)?.getAttribute('data-src') || '',
          poster: n.getAttribute('data-poster') || $('.work-video', n)?.getAttribute('poster') || '',
          imageSrc: n.getAttribute('data-image') || ''
        }));
      }

      // Normalize categories for robust matching
      const toCats = (v) => Array.isArray(v) ? v : String(v||'').split(/[ ,;]+/).filter(Boolean);
      const curCats = toCats(currentCategory);
      const related = allWorks.filter(w => {
        if (!w || !w.slug) return false;
        const wc = toCats(w.cats);
        return w.slug !== currentSlug && curCats.some(c => wc.includes(c));
      }).slice(0, 6);
      if (related.length === 0) { relatedSection.style.display = 'none'; return; }

      const makeAbs = (p) => { if (!p) return p; if (apiOrigin !== location.origin && p.startsWith('/')) return apiOrigin + p; return p; };
      relatedGrid.innerHTML = '';
      related.forEach(w => {
        const el = document.createElement('div');
        el.className = 'related-item';
        el.setAttribute('data-slug', w.slug);
        const videoSrc = makeAbs(w.videoSrc || '');
        const posterSrc = makeAbs(w.poster || '');
        const fallbackSrc = '/assets/placeholders/still-01.svg';
        
        let mediaHtml;
        if (videoSrc && w.kind !== 'image') {
          if (typeof w.thumbSec === 'number') el.setAttribute('data-thumb-sec', String(w.thumbSec));
          // Always show video, play on hover
          mediaHtml = `
            <video 
              src="${videoSrc}" 
              poster="${posterSrc || fallbackSrc}"
              muted 
              loop 
              playsinline
              preload="metadata"
              class="related-video"
              data-thumb-sec="${typeof w.thumbSec === 'number' ? String(w.thumbSec) : ''}"
              style="width: 100%; aspect-ratio: 16/9; object-fit: cover; border-radius: 4px; display: block;"
            ></video>
          `;
        } else {
          const imageSrc = makeAbs(w.imageSrc || posterSrc || fallbackSrc);
          mediaHtml = `<img src="${imageSrc}" alt="${w.title || ''}" loading="lazy" style="width: 100%; aspect-ratio: 16/9; object-fit: cover; border-radius: 4px; display: block;" onerror="this.src='${fallbackSrc}'; this.onerror=null;" />`;
        }
        
        el.innerHTML = `
          ${mediaHtml}
          <div class="related-item-title">${w.title || ''}</div>
          <div class="related-item-meta">${w.cats || ''}</div>
        `;
        
        relatedGrid.appendChild(el);
        
        // Add hover effects for video thumbnails after DOM insertion
        const video = el.querySelector('.related-video');
        if (video) {
          // Set initial thumbnail frame when metadata loads
          video.addEventListener('loadedmetadata', function() {
            if (this.duration > 0.1) {
              const sec = Number(el.getAttribute('data-thumb-sec'));
              this.currentTime = Number.isFinite(sec) ? Math.min(Math.max(sec, 0), Math.max(0, this.duration - 0.1)) : 0.5;
            }
          });
          
          el.addEventListener('mouseenter', () => {
            video.play().catch(() => {}); // Ignore autoplay errors
          });
          
          el.addEventListener('mouseleave', () => {
            video.pause();
            const sec = Number(el.getAttribute('data-thumb-sec'));
            if (video.duration > 0.1) {
              video.currentTime = Number.isFinite(sec) ? Math.min(Math.max(sec, 0), Math.max(0, video.duration - 0.1)) : 0.5;
            }
          });
        }
        
        el.addEventListener('click', () => {
          if (w.slug) location.hash = `#project/${w.slug}`;
        });
      });
      relatedSection.style.display = 'block';
    } catch (e) {
      console.error('Related error:', e);
      relatedSection.style.display = 'none';
    }
  }

  function closeProject() {
    if (!project) return;
    const doClose = () => {
      project.hidden = true; project.setAttribute('aria-hidden', 'true');
      projectMedia.innerHTML = '';
      document.body.style.overflow = '';
      if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
    };
    if (document.startViewTransition) document.startViewTransition(doClose); else doClose();
  }

  if (projectClose) projectClose.addEventListener('click', () => {
    closeProject();
    if (location.hash.startsWith('#project/')) location.hash = '#works';
  });

  // Bind works (click to open project)
  $$('.work').forEach((w) => {
    const slug = w.getAttribute('data-slug');
    w.addEventListener('click', () => {
      if (slug) location.hash = `#project/${slug}`; else openProject(w);
    });
    w.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (slug) location.hash = `#project/${slug}`; else openProject(w); }
    });
  });

  // Hover autoplay for video thumbnails + lazy load
  const videoWorks = $$('.work[data-kind="video"]');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const loadVideoSrc = (video) => {
    if (!video) return;
    if (!video.src) {
      const src = video.getAttribute('data-src');
      if (src) video.src = src;
    }
  };

  const vio = new IntersectionObserver(
    (entries) => {
      entries.forEach(({ isIntersecting, target }) => {
        const video = $('.work-video', target);
        if (!video) return;
        if (isIntersecting) {
          // Video src is now set by default
        } else {
          // Pause when leaving viewport
          try { video.pause(); } catch {}
        }
      });
    },
    { rootMargin: '100px 0px 100px 0px', threshold: 0.1 }
  );

  videoWorks.forEach((w) => {
    const video = $('.work-video', w);
    if (!video) return;
    vio.observe(w);

    const play = () => { video.muted = true; video.play().catch(() => {}); };
    const stop = () => { try {
      video.pause();
      const secAttr = w.getAttribute('data-thumb-sec');
      const sec = Number(secAttr);
      if (video.duration > 0.1) {
        video.currentTime = Number.isFinite(sec) ? Math.min(Math.max(sec, 0), Math.max(0, video.duration - 0.1)) : 0.5;
      }
    } catch {} };

    w.addEventListener('mouseenter', play);
    w.addEventListener('mouseleave', stop);
    // Touch fallback: short play on tap-hold would conflict with click-open; keep click for modal only
  });

  // Set src and poster attributes for static video elements
  videoWorks.forEach((w) => {
    const v = $('.work-video', w);
    if (v) {
      // Set src if not already set
      if (!v.src && v.getAttribute('data-src')) {
        v.src = v.getAttribute('data-src');
      }
      
      // Ensure preload is set to metadata to show first frame
      if (!v.getAttribute('preload')) {
        v.setAttribute('preload', 'metadata');
      }
      
      // Set poster from data attribute or try to find matching poster
      const dataPoster = w.getAttribute('data-poster');
      if (dataPoster && !v.getAttribute('poster')) {
        v.setAttribute('poster', dataPoster);
      } else if (!v.getAttribute('poster')) {
        // Try to find matching poster in assets/works/
        const videoSrc = v.src || v.getAttribute('data-src') || '';
        const baseName = videoSrc.split('/').pop()?.replace(/\.[^.]*$/, '');
        if (baseName) {
          // Try common poster paths
          const posterPaths = [
            `/assets/works/${baseName}.jpg`,
            `/movies/${baseName}.jpg`
          ];
          
          // Set the first available poster path
          posterPaths.forEach(path => {
            if (!v.getAttribute('poster')) {
              v.setAttribute('poster', path);
            }
          });
          
          // If still no poster, set fallback
          if (!v.getAttribute('poster')) {
            v.setAttribute('poster', '/assets/placeholders/still-01.svg');
          }
        }
      }
      
      // Add error handling for video loading
      v.addEventListener('error', function() {
        console.warn('Video failed to load:', this.src);
        // Set fallback poster if video fails
        if (!this.getAttribute('poster')) {
          this.setAttribute('poster', '/assets/placeholders/still-01.svg');
        }
      });
      
      // Force better thumbnail by setting currentTime to 0.5s to avoid black frame
      v.addEventListener('loadedmetadata', function() {
        if (this.duration > 0.1) {
          const secAttr = w.getAttribute('data-thumb-sec');
          const sec = Number(secAttr);
          this.currentTime = Number.isFinite(sec) ? Math.min(Math.max(sec, 0), Math.max(0, this.duration - 0.1)) : 0.5;
        }
      });
    }
  });

  // Hero (random autoplay video from works)
  (function initHero() {
    const hero = $('#hero');
    const heroVideo = $('#hero-video');
    const soundBtn = $('#hero-sound');
    const playBtn = $('#hero-play');
    if (!hero || !heroVideo) return;

    function setHeroFromNode(pick) {
      if (!pick) return false;
      const src = pick.getAttribute('data-video-src') || $('.work-video', pick)?.getAttribute('src') || $('.work-video', pick)?.getAttribute('data-src') || '';
      if (!src) return false;
      const poster = pick.getAttribute('data-poster') || $('.work-video', pick)?.getAttribute('poster') || '';
      const title = $('.ovl-title', pick)?.textContent || '';
      const meta = $('.ovl-meta', pick)?.textContent || '';
      if (poster) heroVideo.setAttribute('poster', poster); else heroVideo.removeAttribute('poster');
      heroVideo.muted = true; heroVideo.volume = 0; heroVideo.autoplay = true; heroVideo.playsInline = true;
      heroVideo.setAttribute('muted',''); heroVideo.setAttribute('autoplay',''); heroVideo.setAttribute('playsinline',''); heroVideo.setAttribute('webkit-playsinline', ''); heroVideo.setAttribute('preload','auto');
      // Set src directly for Chrome
      heroVideo.innerHTML = '';
      heroVideo.removeAttribute('src');
      heroVideo.setAttribute('src', src);
      heroVideo.src = src;
      if (heroVideo.load) heroVideo.load();
      const tryPlay = () => { const p = heroVideo.play(); if (p && p.catch) p.catch(()=>{}); };
      ['canplay','loadedmetadata','loadeddata','canplaythrough'].forEach(ev => heroVideo.addEventListener(ev, tryPlay, { once: true }));
      setTimeout(tryPlay, 80);
      // Also attempt when hero enters viewport
      try {
        const io = new IntersectionObserver((entries)=>{ entries.forEach(e=>{ if (e.isIntersecting) tryPlay(); }); }, { threshold: 0.2 });
        io.observe(heroVideo);
      } catch {}
      const ht = $('#hero-title'); const hm = $('#hero-meta');
      if (ht) ht.textContent = title; if (hm) hm.textContent = meta;
      const slug = pick.getAttribute('data-slug');
      hero.onclick = () => { if (slug) location.hash = `#project/${slug}`; else openProject(pick); };
      return true;
    }

    function setHeroFromWorks(items, origin) {
      if (!Array.isArray(items) || items.length === 0) { hero.style.display='none'; return false; }
      const firstVideoSrc = (w) => {
        if (Array.isArray(w.media) && w.media.length) {
          const m0 = w.media.find(m => (m.kind||'video') !== 'image' && (m.videoSrc||m.src));
          const src = m0?.videoSrc || m0?.src || '';
          return src ? (origin && src.startsWith('/') ? origin + src : src) : '';
        }
        const s = w.videoSrc || '';
        return s ? (origin && s.startsWith('/') ? origin + s : s) : '';
      };
      const vids = items.map(w => ({ w, src: firstVideoSrc(w), poster: (w.poster||'') })).filter(x => !!x.src);
      if (vids.length === 0) { hero.style.display='none'; return false; }
      const pick = vids[Math.floor(Math.random()*vids.length)];
      const src = pick.src;
      const poster = pick.poster ? (origin && pick.poster.startsWith('/') ? origin + pick.poster : pick.poster) : '';
      heroVideo.innerHTML = '';
      heroVideo.removeAttribute('src');
      heroVideo.setAttribute('src', src);
      heroVideo.src = src;
      if (heroVideo.load) heroVideo.load();
      if (poster) heroVideo.setAttribute('poster', poster); else heroVideo.removeAttribute('poster');
      const ht=$('#hero-title'); const hm=$('#hero-meta'); if (ht) ht.textContent = pick.w.title||''; if (hm) hm.textContent = pick.w.meta||'';
      heroVideo.muted = true; heroVideo.volume = 0; heroVideo.autoplay = true; heroVideo.playsInline = true;
      heroVideo.setAttribute('muted',''); heroVideo.setAttribute('autoplay',''); heroVideo.setAttribute('playsinline',''); heroVideo.setAttribute('webkit-playsinline',''); heroVideo.setAttribute('preload','auto');
      if (heroVideo.load) heroVideo.load();
      const tryPlay = ()=> { const p=heroVideo.play(); if(p&&p.catch) p.catch(()=>{}); };
      ['canplay','loadedmetadata','loadeddata','canplaythrough'].forEach(ev=> heroVideo.addEventListener(ev, tryPlay, {once:true})); setTimeout(tryPlay,80);
      const io = new IntersectionObserver(es=>{ es.forEach(e=>{ if(e.isIntersecting) tryPlay(); }); }, {threshold:0.2}); io.observe(heroVideo);
      document.addEventListener('pointerdown', tryPlay, { once: true });
      document.addEventListener('visibilitychange', ()=>{ if (!document.hidden) tryPlay(); }, { once: true });
      const slug = pick.w.slug; hero.onclick = () => { if (slug) location.hash = `#project/${slug}`; };
      hero.style.display=''; return true;
    }

    // Try immediate candidates (static grid)
    const candidates = $$('.works-grid .work[data-kind="video"]').filter(n => (n.getAttribute('data-video-src')||'').length > 0);
    if (!setHeroFromNode(candidates[Math.floor(Math.random() * (candidates.length||1))])) {
      hero.style.display = 'none';
    }

    // Expose setter for dynamic works
    hero.setAttribute('data-hero-ready','true');
    window.__setHeroFromWorks = setHeroFromWorks;

    // Sound toggle
    const updateSoundUI = () => {
      const on = !heroVideo.muted;
      if (soundBtn) {
        soundBtn.setAttribute('aria-pressed', String(on));
        soundBtn.textContent = on ? 'Mute' : 'Sound On';
        soundBtn.setAttribute('aria-label', on ? 'Turn sound off' : 'Turn sound on');
      }
    };
    if (soundBtn) {
      soundBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        heroVideo.muted = !heroVideo.muted;
        if (!heroVideo.muted) { heroVideo.volume = 1; heroVideo.play().catch(()=>{}); }
        updateSoundUI();
      });
      updateSoundUI();
    }

    if (playBtn) {
      const updatePlayUI = () => { playBtn.setAttribute('aria-pressed', String(!heroVideo.paused)); };
      playBtn.addEventListener('click', (e)=>{ e.stopPropagation(); if (heroVideo.paused) { heroVideo.play().catch(()=>{}); } else { heroVideo.pause(); } updatePlayUI(); });
      heroVideo.addEventListener('play', updatePlayUI); heroVideo.addEventListener('pause', updatePlayUI);
      updatePlayUI();
    }
  })();

  // Render works dynamically from API if available
  (async function loadDynamicWorks(){
    const grid = $('.works-grid');
    if (!grid) return;
    try {
      const SERVER_ORIGIN = 'http://localhost:3000';
      let usedOrigin = location.origin;
      let items = [];
      try { const res = await fetch('/api/works'); if (res.ok) items = await res.json(); } catch {}
      if (!Array.isArray(items) || items.length === 0) {
        try { const res2 = await fetch(SERVER_ORIGIN + '/api/works', { mode: 'cors' }); if (res2.ok) { items = await res2.json(); usedOrigin = SERVER_ORIGIN; } } catch {}
      }
      if (!Array.isArray(items)) items = [];
      // Clear current grid regardless (to avoid showing static when API is reachable)
      grid.innerHTML = '';
      if (items.length === 0) { return; }
      const hasDisplay = (w) => {
        if (Array.isArray(w.media) && w.media.length) {
          const m0 = w.media[0] || {};
          if ((m0.kind||'video') === 'image') return !!m0.imageSrc;
          return !!m0.videoSrc || !!m0.src;
        }
        return (w.kind||'video') === 'image' ? !!w.imageSrc : (!!w.videoSrc && typeof w.videoSrc === 'string');
      };
      items = items.filter(hasDisplay);
      const makeAbs = (p) => { if (!p) return p; if (usedOrigin !== location.origin && p.startsWith('/')) return usedOrigin + p; return p; };
      for (const w of items) {
        const fig = document.createElement('figure');
        fig.className = 'work';
        fig.setAttribute('data-kind', w.kind || 'video');
        fig.setAttribute('data-slug', w.slug);
        if (w.cats) fig.setAttribute('data-cats', w.cats);
        if (w.link) fig.setAttribute('data-link', w.link);
        if (w.desc) fig.setAttribute('data-desc', w.desc);
        if (w.projectType) fig.setAttribute('data-project-type', w.projectType);
        if (w.date) fig.setAttribute('data-date', w.date);
        if (w.role) fig.setAttribute('data-role', w.role);
        if (w.clientName) fig.setAttribute('data-client-name', w.clientName);
        if (w.title) fig.setAttribute('data-title', w.title);
        if (w.updatedAt || w.createdAt) fig.setAttribute('data-updated', String(w.updatedAt || w.createdAt));
        if (typeof w.thumbSec === 'number') fig.setAttribute('data-thumb-sec', String(w.thumbSec));
        if (w.pinHero) fig.setAttribute('data-pin-hero', '1');
        // Determine display media from media[] or top-level
        let display = null;
        if (Array.isArray(w.media) && w.media.length) display = { ...w.media[0] };
        const displayKind = (display?.kind) || (w.kind || 'video');
        // Attach data-media if present
        if (Array.isArray(w.media) && w.media.length) {
          try {
            const mapped = w.media.map(m => ({
              kind: m.kind || (m.imageSrc ? 'image' : 'video'),
              videoSrc: makeAbs(m.videoSrc || m.src || ''),
              imageSrc: makeAbs(m.imageSrc || ''),
              poster: makeAbs(m.poster || ''),
            }));
            fig.setAttribute('data-media', JSON.stringify(mapped));
          } catch {}
        }
        if (displayKind === 'image') {
          const imgSrc = makeAbs(display?.imageSrc || w.imageSrc || '');
          fig.setAttribute('data-image', imgSrc || '');
          fig.innerHTML = `<div class="media-frame"><img class="work-image" src="${imgSrc || ''}" alt="${w.title || ''}"><div class="overlay"><div class="ovl-title">${w.title || ''}</div><div class="ovl-meta">${w.meta || ''}</div></div></div>`;
        } else if (displayKind === 'youtube') {
          const youtubeId = w.youtubeId || '';
          const poster = makeAbs(w.poster || `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`);
          fig.setAttribute('data-video', youtubeId);
          if (poster) fig.setAttribute('data-poster', poster);
          fig.innerHTML = `<div class="media-frame"><div class="video-thumbnail" style="background-image: url('${poster}'); background-size: cover; background-position: center; aspect-ratio: 16/9; position: relative;"><div class="play-overlay" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80px; height: 80px; background: rgba(255,0,0,0.8); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 32px;">▶</div></div><div class="overlay"><div class="ovl-title">${w.title || ''}</div><div class="ovl-meta">${w.meta || ''}</div></div></div>`;
        } else if (displayKind === 'vimeo') {
          const vimeoId = w.vimeoId || '';
          const poster = makeAbs(w.poster || '');
          fig.setAttribute('data-video', vimeoId);
          if (poster) fig.setAttribute('data-poster', poster);
          fig.innerHTML = `<div class="media-frame"><div class="video-thumbnail" style="background-image: url('${poster}'); background-size: cover; background-position: center; aspect-ratio: 16/9; position: relative;"><div class="play-overlay" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80px; height: 80px; background: rgba(26,183,234,0.8); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 32px;">▶</div></div><div class="overlay"><div class="ovl-title">${w.title || ''}</div><div class="ovl-meta">${w.meta || ''}</div></div></div>`;
        } else {
          const vSrc = makeAbs(display?.videoSrc || display?.src || w.videoSrc || '');
          const poster = makeAbs(display?.poster || w.poster || '');
          fig.setAttribute('data-video-src', vSrc || '');
          if (poster) fig.setAttribute('data-poster', poster);
          fig.innerHTML = `<div class="media-frame"><video class="work-video" muted playsinline webkit-playsinline loop preload="metadata" ${poster?`poster="${poster}"`:''} src="${vSrc || ''}" aria-label="${w.title || ''}"></video><div class="overlay"><div class="ovl-title">${w.title || ''}</div><div class="ovl-meta">${w.meta || ''}</div></div></div>`;
        }
        grid.appendChild(fig);
      }
      // Rebind interactions after rendering
      $$('.work').forEach((w) => {
        const slug = w.getAttribute('data-slug');
        w.addEventListener('click', () => { if (slug) location.hash = `#project/${slug}`; else openProject(w); });
        w.addEventListener('keydown', (e) => { if (e.key==='Enter'||e.key===' ') { e.preventDefault(); if (slug) location.hash = `#project/${slug}`; else openProject(w); }});
      });
      const vws = $$('.work[data-kind="video"]');
      vws.forEach((w) => { const v=$('.work-video', w); if (!v) return; vio.observe(w); w.addEventListener('mouseenter', ()=>{ v.muted=true; v.play().catch(()=>{}); }); w.addEventListener('mouseleave', ()=>{ try{v.pause(); v.currentTime=0;}catch{} }); });
      // Reapply filter
      applyFilter(pendingCategory || 'all');
      // Update HERO from loaded items
      if (typeof window.__setHeroFromWorks === 'function') {
        // prefer pinned, then latest by updatedAt/createdAt
        const sorted = [...items].sort((a,b)=>{
          const ap=a.pinHero?1:0, bp=b.pinHero?1:0; if (ap!==bp) return bp-ap;
          const au=a.updatedAt||a.createdAt||0, bu=b.updatedAt||b.createdAt||0; return bu-au;
        });
        window.__setHeroFromWorks(sorted, usedOrigin);
      }
    } catch (e) {
      // no API available; keep static
    }
  })();

  // Category Filters (Works)
  const filterBtns = $$('.filters .filter-btn');
  let currentFilter = 'all';

  applyFilter = function(filter) {
    if (!filter) filter = 'all';
    currentFilter = filter;
    filterBtns.forEach((btn) => {
      const active = btn.getAttribute('data-filter') === filter;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
    });

    $$('.works-grid .work').forEach((item, idx) => {
      const cats = (item.getAttribute('data-cats') || '').split(/\s+/).filter(Boolean);
      const match = filter === 'all' || cats.includes(filter);
      const video = $('.work-video', item);
      if (match) {
        item.style.display = '';
        item.classList.remove('is-hiding');
        item.classList.add('is-showing');
        item.style.transitionDelay = (idx % 8) * 12 + 'ms';
      } else {
        item.classList.remove('is-showing');
        item.classList.add('is-hiding');
        if (video) { try { video.pause(); } catch {} }
        setTimeout(()=>{ item.style.display = 'none'; }, 180);
      }
    });
  };


  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const f = btn.getAttribute('data-filter');
      location.hash = `#works/${f}`;
      applyFilter(f); // Always call applyFilter directly
      // Reappear blurb briefly (flash)
      try {
        const header = document.querySelector('.section-works .section-header');
        if (header) {
          const flash = document.createElement('div');
          flash.className = 'works-flash';
          flash.textContent = 'A lens on the edge of culture.';
          header.appendChild(flash);
          // Trigger
          requestAnimationFrame(()=>{ flash.classList.add('show'); });
          // Hide after short beat
          setTimeout(()=>{ flash.classList.remove('show'); setTimeout(()=>{ flash.remove(); }, 280); }, 900);
        }
      } catch {}
    });
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); btn.click(); }
    });
  });


  // Apply pending category or default
  applyFilter(pendingCategory || 'all');

  // Initialize route after applyFilter is defined
  if (page === 'home') {
    applyRouteFromHash();
  }

  // (removed duplicate filter block)
  // Microinteractions
  (function initMicroInteractions(){
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    // Scroll reveal
    const revIO = new IntersectionObserver((entries)=>{
      entries.forEach((e)=>{
        if (e.isIntersecting) e.target.classList.add('is-inview');
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
    $('.works-grid .work').forEach((el)=>{ el.classList.add('reveal'); revIO.observe(el); });
    // Reveal hero on scroll as it comes into view
    const heroEl = document.getElementById('hero');
    if (heroEl) { heroEl.classList.add('reveal'); revIO.observe(heroEl); }

    // 3D tilt on work cards
    $$('.works-grid .work').forEach((card)=>{
      card.classList.add('tilt');
      let raf = null;
      const onMove = (ev)=>{
        const r = card.getBoundingClientRect();
        const cx = r.left + r.width/2; const cy = r.top + r.height/2;
        const dx = (ev.clientX - cx) / (r.width/2); // -1..1
        const dy = (ev.clientY - cy) / (r.height/2);
        const rotX = (-dy * 4); // degrees
        const rotY = (dx * 4);
        if (!raf) raf = requestAnimationFrame(()=>{
          raf = null;
          card.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
        });
      };
      const onLeave = ()=>{ card.style.transform = ''; };
      card.addEventListener('mousemove', onMove);
      card.addEventListener('mouseleave', onLeave);
    });

    // Magnetic buttons
    const magnets = [...$$('.filter-btn'), $('#hero-sound')].filter(Boolean);
    magnets.forEach((btn)=>{
      btn.classList.add('magnet');
      const maxPull = 12;
      let raf=null;
      const onMove = (e)=>{
        const r = btn.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width/2);
        const dy = e.clientY - (r.top + r.height/2);
        const distClamp = (v, m) => Math.max(-m, Math.min(m, v));
        const tx = distClamp(dx*0.2, maxPull);
        const ty = distClamp(dy*0.2, maxPull);
        if (!raf) raf = requestAnimationFrame(()=>{ raf=null; btn.style.transform = `translate(${tx}px, ${ty}px)`; });
      };
      const onLeave = ()=>{ btn.style.transform = ''; };
      btn.addEventListener('mousemove', onMove);
      btn.addEventListener('mouseleave', onLeave);
    });

    // Hero overlay parallax
    const hero = $('#hero');
    const overlay = $('.hero-overlay');
    if (hero && overlay) {
      hero.addEventListener('mousemove', (e)=>{
        const r = hero.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width/2)) / r.width; // -0.5..0.5
        const dy = (e.clientY - (r.top + r.height/2)) / r.height;
        overlay.style.transform = `translate(${dx*10}px, ${dy*6}px)`;
      });
      hero.addEventListener('mouseleave', ()=>{ overlay.style.transform = ''; });
    }
  })();

  
})();
