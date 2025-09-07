// Kuroki Ryota (TROY) — Portfolio interactions (ESM)
// Modern features: SW registration, reduced-motion handling, optional View Transitions

(function () {
  const page = document.body?.dataset?.page || 'home';
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

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

    // Media
    projectMedia.innerHTML = '';
    if (kind === 'video') {
      const src = node.getAttribute('data-video-src') || $('.work-video', node)?.getAttribute('src') || $('.work-video', node)?.getAttribute('data-src');
      const poster = node.getAttribute('data-poster') || $('.work-video', node)?.getAttribute('poster') || '';
      const v = document.createElement('video');
      v.setAttribute('controls', ''); v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', ''); v.setAttribute('autoplay', ''); v.setAttribute('loop', ''); v.muted = true;
      if (poster) v.setAttribute('poster', poster);
      if (src) v.src = src;
      projectMedia.appendChild(v);
      const tryPlay = () => { const p=v.play(); if(p&&p.catch) p.catch(()=>{}); };
      v.addEventListener('loadedmetadata', tryPlay, { once: true });
    } else if (kind === 'image') {
      const src = node.getAttribute('data-image');
      const img = document.createElement('img');
      img.src = src || '';
      img.alt = title || 'Work image';
      projectMedia.appendChild(img);
    }

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
            if (this.duration > 1) {
              this.currentTime = 0.5;
            }
          });
          
          el.addEventListener('mouseenter', () => {
            video.play().catch(() => {}); // Ignore autoplay errors
          });
          
          el.addEventListener('mouseleave', () => {
            video.pause();
            // Set to 0.5 seconds to avoid black frame at start
            if (video.duration > 1) {
              video.currentTime = 0.5;
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
    const stop = () => { try { video.pause(); if (video.duration > 1) video.currentTime = 0.5; } catch {} };

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
        if (this.duration > 1) {
          this.currentTime = 0.5;
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
      const vids = items.filter(w => (w.kind||'video') !== 'image' && (w.videoSrc||'').length > 0);
      if (vids.length === 0) { hero.style.display='none'; return false; }
      const pick = vids[Math.floor(Math.random()*vids.length)];
      const src = (origin && pick.videoSrc?.startsWith('/') ? origin + pick.videoSrc : pick.videoSrc);
      const poster = pick.poster ? (origin && pick.poster.startsWith('/') ? origin + pick.poster : pick.poster) : '';
      heroVideo.innerHTML = '';
      heroVideo.removeAttribute('src');
      heroVideo.setAttribute('src', src);
      heroVideo.src = src;
      if (heroVideo.load) heroVideo.load();
      if (poster) heroVideo.setAttribute('poster', poster); else heroVideo.removeAttribute('poster');
      const ht=$('#hero-title'); const hm=$('#hero-meta'); if (ht) ht.textContent = pick.title||''; if (hm) hm.textContent = pick.meta||'';
      heroVideo.muted = true; heroVideo.volume = 0; heroVideo.autoplay = true; heroVideo.playsInline = true;
      heroVideo.setAttribute('muted',''); heroVideo.setAttribute('autoplay',''); heroVideo.setAttribute('playsinline',''); heroVideo.setAttribute('webkit-playsinline',''); heroVideo.setAttribute('preload','auto');
      if (heroVideo.load) heroVideo.load();
      const tryPlay = ()=> { const p=heroVideo.play(); if(p&&p.catch) p.catch(()=>{}); };
      ['canplay','loadedmetadata','loadeddata','canplaythrough'].forEach(ev=> heroVideo.addEventListener(ev, tryPlay, {once:true})); setTimeout(tryPlay,80);
      const io = new IntersectionObserver(es=>{ es.forEach(e=>{ if(e.isIntersecting) tryPlay(); }); }, {threshold:0.2}); io.observe(heroVideo);
      document.addEventListener('pointerdown', tryPlay, { once: true });
      document.addEventListener('visibilitychange', ()=>{ if (!document.hidden) tryPlay(); }, { once: true });
      const slug = pick.slug; hero.onclick = () => { if (slug) location.hash = `#project/${slug}`; };
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
      items = items.filter(w => (w.kind||'video') === 'image' ? !!w.imageSrc : (!!w.videoSrc && typeof w.videoSrc === 'string'));
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
        if (w.pinHero) fig.setAttribute('data-pin-hero', '1');
        if (w.kind === 'image') {
          const imgSrc = makeAbs(w.imageSrc || '');
          fig.setAttribute('data-image', imgSrc || '');
          fig.innerHTML = `<div class="media-frame"><img class="work-image" src="${imgSrc || ''}" alt="${w.title || ''}"><div class="overlay"><div class="ovl-title">${w.title || ''}</div><div class="ovl-meta">${w.meta || ''}</div></div></div>`;
        } else {
          const vSrc = makeAbs(w.videoSrc || '');
          const poster = makeAbs(w.poster || '');
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
    $$('.works-grid .work').forEach((el)=>{ el.classList.add('reveal'); revIO.observe(el); });

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

  // Loading screen management
  (function initLoader() {
    const loadingScreen = document.getElementById('loading-screen');
    if (!loadingScreen) return;

    let loadingComplete = false;
    let minDisplayTime = 1500; // Minimum display time in ms
    const startTime = Date.now();

    function hideLoader() {
      const elapsed = Date.now() - startTime;
      const remainingTime = Math.max(0, minDisplayTime - elapsed);
      
      setTimeout(() => {
        loadingScreen.classList.add('fade-out');
        setTimeout(() => {
          loadingScreen.remove();
        }, 500); // Match CSS transition duration
      }, remainingTime);
    }

    // Wait for page to fully load
    function checkLoadingComplete() {
      // Check if videos are ready to play (at least metadata loaded)
      const videos = document.querySelectorAll('video[src]');
      let videosReady = 0;
      
      if (videos.length === 0) {
        loadingComplete = true;
        hideLoader();
        return;
      }

      videos.forEach(video => {
        if (video.readyState >= 1) { // HAVE_METADATA
          videosReady++;
        } else {
          video.addEventListener('loadedmetadata', () => {
            videosReady++;
            if (videosReady >= videos.length) {
              loadingComplete = true;
              hideLoader();
            }
          }, { once: true });
        }
      });

      if (videosReady >= videos.length) {
        loadingComplete = true;
        hideLoader();
      }
    }

    // Start checking after DOM is loaded and scripts executed
    if (document.readyState === 'complete') {
      setTimeout(checkLoadingComplete, 100);
    } else {
      window.addEventListener('load', () => {
        setTimeout(checkLoadingComplete, 100);
      });
    }

    // Fallback: hide loader after maximum time
    setTimeout(() => {
      if (!loadingComplete) {
        loadingComplete = true;
        hideLoader();
      }
    }, 8000);
  })();
})();
