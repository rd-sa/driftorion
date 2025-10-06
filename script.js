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


// ==== STARFIELD (singleton, mobile-safe, smart resize, time-based motion) ====
(() => {
  if (window.__starfield?.inited) return;

  const bg = document.querySelector('.starfield-bg');
  if (!bg) return;

  // Config
  const isMobile = matchMedia('(max-width: 767px)').matches;
  const BASE_DENSITY   = isMobile ? 0.00018 : 0.00025;
  const STAR_SIZE_MIN  = 0.6;
  const STAR_SIZE_MAX  = 1.8;
  const SPEED_MIN      = 0.02;
  const SPEED_MAX      = 0.35;
  const TWINKLE_AMPL   = 0.35;
  const TWINKLE_SPEED  = 0.015;

  const MIN_REBUILD_DELTA = 80;

  // Canvas
  let canvas = bg.querySelector('canvas.starfield-canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.className = 'starfield-canvas';
    Object.assign(canvas.style, {
      position: 'absolute', inset: '0', zIndex: '2', pointerEvents: 'none'
    });
    bg.appendChild(canvas);
  }
  const ctx = canvas.getContext('2d', { alpha: true });

  // State
  let dpr = Math.max(1, window.devicePixelRatio || 1);
  let width  = document.documentElement.clientWidth;
  let height = document.documentElement.clientHeight;
  let lastW = width, lastH = height, lastDpr = dpr;

  let stars = [];
  let phaseTick = 0;
  let rafId = null;

  // pause/interaction
  let halted   = false;
  let dragging = false;

  // Time-based animation
  let lastTime = 0;
  const BASE_FRAME_MS = 1000 / 60;
  const MAX_DT_SCALE  = 2.5;
  const MIN_DT_SCALE  = 0.5;

  // Mobile throttle
  let lastFrameForThrottle = 0;
  const mobileFrameInterval = 1000 / 30;

  const rand = (a, b) => a + Math.random() * (b - a);

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

  function rebuildCanvasAndStars() {
    dpr    = Math.max(1, window.devicePixelRatio || 1);
    width  = document.documentElement.clientWidth;
    height = document.documentElement.clientHeight;

    canvas.width  = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width  = width + 'px';
    canvas.style.height = height + 'px';

    buildStars();

    lastW = width; lastH = height; lastDpr = dpr;
  }

  function relayoutOnly() {
    const w = document.documentElement.clientWidth;
    const h = document.documentElement.clientHeight;
    canvas.style.width  = w + 'px';
    canvas.style.height = h + 'px';
    width = w; height = h;
  }

  function smartResize() {
    const newDpr = Math.max(1, window.devicePixelRatio || 1);
    const w = document.documentElement.clientWidth;
    const h = document.documentElement.clientHeight;
    const dW = Math.abs(w - lastW);
    const dH = Math.abs(h - lastH);
    const dDpr = Math.abs(newDpr - lastDpr);

    if (dDpr > 0.001 || dW >= MIN_REBUILD_DELTA || dH >= MIN_REBUILD_DELTA) {
      rebuildCanvasAndStars();
    } else {
      relayoutOnly();
    }
  }

  function draw(now) {
    if (!lastTime) lastTime = now;
    let dt = now - lastTime;
    lastTime = now;

    if (isMobile) {
      if (!lastFrameForThrottle) lastFrameForThrottle = now;
      const since = now - lastFrameForThrottle;
      if (since < mobileFrameInterval) {
        rafId = requestAnimationFrame(draw);
        return;
      }
      lastFrameForThrottle = now;
    }

    if (halted || (dragging && window.scrollY <= 0)) {
      rafId = requestAnimationFrame(draw);
      return;
    }

    let dtScale = dt / BASE_FRAME_MS;
    dtScale = Math.max(MIN_DT_SCALE, Math.min(MAX_DT_SCALE, dtScale));

    phaseTick += dtScale;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(dpr, dpr);

    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];

      s.y -= s.v * dtScale;
      if (s.y < -2) s.y = height + 2;

      s.x += Math.sin((phaseTick + i) * 0.001) * 0.05 * dtScale;
      if (s.x < -2) s.x = width + 2;
      if (s.x > width + 2) s.x = -2;

      const alpha = 1 - TWINKLE_AMPL * (0.5 + 0.5 * Math.sin(s.phase + phaseTick * TWINKLE_SPEED));

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
    lastTime = 0;
    rafId = requestAnimationFrame(draw);
  }
  function stop() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  // Listeners
  let resizeRaf;
  const onResize = () => {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(smartResize);
  };
  window.addEventListener('resize', onResize, { passive: true });

  const dprMQ = matchMedia?.(`(resolution: ${window.devicePixelRatio}dppx)`);
  dprMQ?.addEventListener?.('change', onResize);

  window.addEventListener('pageshow', (e) => {
    if (e.persisted) onResize();
  }, { passive: true });

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
      relayoutOnly();
    }, { passive: true });
  }

  const onVis = () => { halted = document.hidden; if (!halted) start(); };
  document.addEventListener('visibilitychange', onVis);

  const onTouchStart = () => { dragging = true; };
  const onTouchEnd   = () => { dragging = false; };
  window.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('touchend',   onTouchEnd,   { passive: true });
  window.addEventListener('touchcancel',onTouchEnd,   { passive: true });

  // Boot
  rebuildCanvasAndStars();
  start();

  window.__starfield = {
    inited: true,
    start, stop,
    rebuild: rebuildCanvasAndStars,
    relayout: relayoutOnly,
    setPaused(p) { halted = !!p; if (!halted) start(); },
  };
})();


// ===== Analytics embed controls =====
(() => {
  const frame = document.getElementById('analyticsFrame');
  const wrapper = document.getElementById('analyticsEmbedWrapper');
  const btnRefresh = document.getElementById('refreshBtn');
  const btnFullscreen = document.getElementById('fullscreenBtn');

  if (!frame || !wrapper || !btnRefresh || !btnFullscreen) return;

  const doRefresh = () => {
    const src = frame.getAttribute('src');
    if (!src) return;
    btnRefresh.classList.add('btn--spinning');
    const bust = src.includes('?') ? '&' : '?';
    frame.src = src + bust + 't=' + Date.now();
    frame.addEventListener('load', () => {
      btnRefresh.classList.remove('btn--spinning');
    }, { once: true });
  };

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

  document.addEventListener('keydown', (e) => {
    if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
    if (e.key === 'r' || e.key === 'R') doRefresh();
    if (e.key === 'f' || e.key === 'F') toggleFullscreen();
  });

  updateFsUi();
})();
