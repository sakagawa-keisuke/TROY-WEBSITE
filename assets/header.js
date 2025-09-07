// Header component management
class HeaderManager {
  constructor() {
    this.currentPage = this.getCurrentPage();
  }

  getCurrentPage() {
    const path = window.location.pathname;
    if (path.includes('profile.html')) return 'profile';
    if (path.includes('info.html')) return 'info';
    return 'works';
  }

  generateHeader() {
    const logoLink = this.currentPage === 'works' ? '#works' : 'index.html';
    
    return `
      <header class="site-header" role="banner">
        <div class="brand">
          <a href="${logoLink}" class="logo" aria-label="Kuroki Ryota (TROY)">TROY</a>
        </div>
        <nav class="site-nav" aria-label="Primary">
          <button class="nav-toggle" aria-expanded="false" aria-controls="menu">MENU</button>
          <ul id="menu">
            <li><a href="profile.html"${this.currentPage === 'profile' ? ' class="active"' : ''}>Profile</a></li>
            <li><a href="index.html"${this.currentPage === 'works' ? ' class="active"' : ''}>Works</a></li>
            <li><a href="info.html"${this.currentPage === 'info' ? ' class="active"' : ''}>Information</a></li>
            <li class="ext">
              <a class="icon" href="https://www.instagram.com/troy_loss/#" target="_blank" rel="noopener" aria-label="Instagram">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7zm5 3.5A5.5 5.5 0 1 1 6.5 13 5.5 5.5 0 0 1 12 7.5zm0 2A3.5 3.5 0 1 0 15.5 13 3.5 3.5 0 0 0 12 9.5zM18 6.2a1 1 0 1 1-1-1 1 1 0 0 1 1 1z"/></svg>
              </a>
            </li>
          </ul>
        </nav>
      </header>
    `;
  }

  init() {
    // Replace header placeholder or insert at the beginning of body
    const placeholder = document.querySelector('[data-header-placeholder]');
    if (placeholder) {
      placeholder.outerHTML = this.generateHeader();
    } else {
      // Insert after opening body tag
      const body = document.querySelector('body');
      if (body && body.firstElementChild) {
        body.insertAdjacentHTML('afterbegin', this.generateHeader());
      }
    }

    // Initialize menu toggle functionality
    this.initMenuToggle();
  }

  initMenuToggle() {
    const toggle = document.querySelector('.nav-toggle');
    const menu = document.querySelector('#menu');
    
    if (toggle && menu) {
      toggle.addEventListener('click', () => {
        const expanded = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', !expanded);
        menu.classList.toggle('active');
      });
    }
  }
}

// Auto-initialize when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new HeaderManager().init();
  });
} else {
  new HeaderManager().init();
}