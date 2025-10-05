document.addEventListener('DOMContentLoaded', function() {
  // Get current page filename
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  
  // Update active nav link
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    const linkPage = link.getAttribute('href');
    if (linkPage === currentPage) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
});

// Smooth scroll for anchor links (if needed in future)
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const href = this.getAttribute('href');
    if (href !== '#') {
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    }
  });
});


// ==== STARFIELD (robust singleton, mobile-safe) ====
(() => {
  // If we've already set up the starfield, bail.
  if (window.__starfield?.inited) return;

  const bg = document.querySelector('.starfield-bg');
  if (!bg) return;

  // Config
  const isMobile = matchMedia('(max-width: 767px)').matches;
  const BASE_DENSITY = isMobile ? 0.00018 : 0.00025; // fewer stars on mobile
  const STAR_SIZE_MIN = 0.6;
  const STAR_SIZE_MAX = 1.8;
  const SPEED_MIN = 0.02;
  const SPEED_MAX = 0.35;
  const TWINKLE_AMPL = 0.35;
  const TWINKLE_SPEED = 0.015;

  // Create (or reuse) canvas inside .starfield-bg so it sits over bg-image + gradient
  let canvas = bg.querySelector('canvas.starfield-canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.className = 'starfield-canvas';
    canvas.style.position = 'absolute';
    canvas.style.inset = '0';
    canvas.style.zIndex = '2';
    canvas.style.pointerEvents = 'none';
    bg.appendChild(canvas);
  }
  const ctx = canvas.getContext('2d');

  // State
  let dpr = Math.max(1, window.devicePixelRatio || 1);
  let width = 0, height = 0;
  let stars = [];
  let tick = 0;
  let rafId = null;
  let halted = false;     // pause flag (visibility / P2R)
  let dragging = false;   // user is touching (potential pull-to-refresh)
  let lastFrame = 0;
  const mobileFrameInterval = 1000 / 30; // ~30fps on mobile

  const rand = (a,b) => a + Math.random() * (b - a);

  function buildStars() {
    const target = Math.floor(width * height * BASE_DENSITY);
    stars = new Array(target).fill(0).map(() => {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const rCss = rand(STAR_SIZE_MIN, STAR_SIZE_MAX);
      const r = rCss * dpr;
      const v = rand(SPEED_MIN, SPEED_MAX);
      const phase = Math.random() * Math.PI * 2;
      const tint = Math.random();
      const color = tint < 0.2 ? '#cfe8ff' : (tint > 0.85 ? '#fff7e6' : '#ffffff');
      return { x, y, r, v, phase, color };
    });
  }

  function resize() {
    dpr = Math.max(1, window.devicePixelRatio || 1);
    width  = Math.max(document.documentElement.clientWidth,  window.innerWidth  || 0);
    height = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    buildStars();
  }

  function draw(now) {
    // Mobile throttle
    if (isMobile) {
      if (!lastFrame) lastFrame = now;
      const dt = now - lastFrame;
      if (dt < mobileFrameInterval) {
        rafId = requestAnimationFrame(draw);
        return;
      }
      lastFrame = now;
    }

    // Pause when hidden or while user is dragging at top (pull-to-refresh)
    if (halted || (dragging && window.scrollY <= 0)) {
      rafId = requestAnimationFrame(draw);
      return;
    }

    tick += 1;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(dpr, dpr);

    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];

      // upward drift
      s.y -= s.v;
      if (s.y < -2) s.y = height + 2;

      // subtle horizontal sway
      s.x += Math.sin((tick + i) * 0.001) * 0.05;
      if (s.x < -2) s.x = width + 2;
      if (s.x > width + 2) s.x = -2;

      const alpha = 1 - TWINKLE_AMPL * (0.5 + 0.5 * Math.sin(s.phase + tick * TWINKLE_SPEED));

      ctx.globalAlpha = alpha;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r / dpr, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = alpha * 0.25;
      ctx.beginPath();
      ctx.arc(s.x, s.y, (s.r * 2.2) / dpr, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
    rafId = requestAnimationFrame(draw);
  }

  function start() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(draw);
  }
  function stop() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  // Listeners (registered once)
  const onResize = () => {
    if (window.__starfield?.resizeQueued) return;
    window.__starfield.resizeQueued = true;
    requestAnimationFrame(() => {
      window.__starfield.resizeQueued = false;
      resize();
    });
  };

  const onVis = () => {
    halted = document.hidden;
    if (!halted) start();
  };

  const onTouchStart = () => { dragging = true; };
  const onTouchEnd = () => { dragging = false; };

  window.addEventListener('resize', onResize, { passive: true });
  matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
    .addEventListener?.('change', onResize);

  document.addEventListener('visibilitychange', onVis);
  // pull-to-refresh guard
  window.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('touchend', onTouchEnd, { passive: true });
  window.addEventListener('touchcancel', onTouchEnd, { passive: true });

  // Boot
  resize();
  start();

  // Expose singleton (optional debugging)
  window.__starfield = {
    inited: true,
    start, stop, resize,
    setPaused(p) { halted = !!p; if (!halted) start(); },
  };
})();


// ===== Analytics embed controls (unchanged) =====
(() => {
  const frame = document.getElementById('analyticsFrame');
  const wrapper = document.getElementById('analyticsEmbedWrapper');
  const btnRefresh = document.getElementById('refreshBtn');
  const btnFullscreen = document.getElementById('fullscreenBtn');

  if (!frame || !wrapper || !btnRefresh || !btnFullscreen) return;

  // Refresh: reload iframe src
  const doRefresh = () => {
    const src = frame.getAttribute('src');
    if (!src) return;
    btnRefresh.classList.add('btn--spinning');
    // force reload with cache-bust
    const bust = src.includes('?') ? '&' : '?';
    frame.src = src + bust + 't=' + Date.now();
    // stop spin when the iframe finishes loading (best-effort)
    frame.addEventListener('load', () => {
      btnRefresh.classList.remove('btn--spinning');
    }, { once: true });
  };

  // Fullscreen: wrapper element (safe for cross-origin iframes)
  const isFs = () => document.fullscreenElement === wrapper;
  const updateFsUi = () => {
    btnFullscreen.textContent = isFs() ? '⤢ Exit Fullscreen' : '⤢ Fullscreen';
    btnFullscreen.title = isFs() ? 'Exit Fullscreen (F)' : 'Fullscreen (F)';
  };

  const toggleFullscreen = async () => {
    try {
      if (isFs()) {
        await document.exitFullscreen();
      } else {
        await wrapper.requestFullscreen();
      }
      updateFsUi();
    } catch (e) {
      console.warn('Fullscreen failed:', e);
    }
  };

  btnRefresh.addEventListener('click', doRefresh);
  btnFullscreen.addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', updateFsUi);

  // Keyboard shortcuts: R = refresh, F = fullscreen
  document.addEventListener('keydown', (e) => {
    if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
    if (e.key === 'r' || e.key === 'R') doRefresh();
    if (e.key === 'f' || e.key === 'F') toggleFullscreen();
  });

  // initial label
  updateFsUi();
})();
