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
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        }
    });
});

(() => {
  // ===== Initialize-once guard (prevents re-creating on iOS pull-to-refresh, bfcache, etc.) =====
  if (window.__STARFIELD_INIT__) return;
  window.__STARFIELD_INIT__ = true;

  // Disable any potential parallax logic on coarse pointers (mobile) if you add any later
  const isCoarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  if (isCoarse) window.__DISABLE_STARFIELD_PARALLAX__ = true;

  // ----- Config you can tweak -----
  const STAR_DENSITY = 0.00025; // stars per px^2 (increase for more stars)
  const STAR_SIZE_MIN = 0.6;    // in CSS pixels (before DPR scaling)
  const STAR_SIZE_MAX = 1.8;
  const SPEED_MIN = 0.02;       // px per frame (base drift)
  const SPEED_MAX = 0.35;       // parallax-ish variation
  const TWINKLE_AMPL = 0.35;    // 0..1 (alpha oscillation amplitude)
  const TWINKLE_SPEED = 0.015;  // twinkle rate

  // Find the background wrapper from your pages
  const bg = document.querySelector('.starfield-bg');
  if (!bg) return;

  // Create/inject canvas (re-use if it already exists)
  let canvas = bg.querySelector('canvas.starfield-canvas') || document.querySelector('.starfield-canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.className = 'starfield-canvas';
    // Append inside the starfield container so it sits under content
    bg.appendChild(canvas);
  }
  const ctx = canvas.getContext('2d', { alpha: true });

  // Sizing helpers
  let dpr = Math.max(1, window.devicePixelRatio || 1);
  let width = 0, height = 0;

  let stars = [];
  let tick = 0;

  function rand(a, b) { return a + Math.random() * (b - a); }

  function resize() {
    dpr = Math.max(1, window.devicePixelRatio || 1);
    width = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    height = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    // Recreate stars based on viewport area (CSS px)
    const targetCount = Math.floor(width * height * STAR_DENSITY);
    stars = new Array(targetCount).fill(0).map(() => {
      // position in CSS px
      const x = Math.random() * width;
      const y = Math.random() * height;

      // radius in CSS px, then scale to device pixels for crispness
      const rCss = rand(STAR_SIZE_MIN, STAR_SIZE_MAX);
      const r = rCss * dpr;

      // depth-ish speed
      const v = rand(SPEED_MIN, SPEED_MAX);

      // twinkle phase
      const phase = Math.random() * Math.PI * 2;

      // slightly blue-white variance
      const tint = Math.random();
      // light blue to warm white
      const color = tint < 0.2 ? '#cfe8ff' : (tint > 0.85 ? '#fff7e6' : '#ffffff');

      return { x, y, r, v, phase, color };
    });
  }

  function draw() {
    tick += 1;

    // Clear with transparent so any page gradient shows through
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw stars
    ctx.save();
    ctx.scale(dpr, dpr); // from here, use CSS pixel coords
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];

      // drift upward (like your original CSS animation)
      s.y -= s.v;
      if (s.y < -2) s.y = height + 2; // wrap to bottom

      // slight horizontal drift for a natural feel
      s.x += Math.sin((tick + i) * 0.001) * 0.05;
      if (s.x < -2) s.x = width + 2;
      if (s.x > width + 2) s.x = -2;

      // twinkle alpha between (1 - TWINKLE_AMPL) and 1
      const alpha = 1 - TWINKLE_AMPL * (0.5 + 0.5 * Math.sin(s.phase + tick * TWINKLE_SPEED));

      // draw
      ctx.globalAlpha = alpha;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      // draw a circle; r is already scaled to device pixels, but we scaled the ctx,
      // so we need to convert back to CSS px for radius
      ctx.arc(s.x, s.y, s.r / dpr, 0, Math.PI * 2);
      ctx.fill();

      // subtle glow
      ctx.globalAlpha = alpha * 0.25;
      ctx.beginPath();
      ctx.arc(s.x, s.y, (s.r * 2.2) / dpr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    requestAnimationFrame(draw);
  }

  // Handle resize/DPR changes
  let resizeRaf;
  const onResize = () => {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => {
      resize();
    });
  };
  window.addEventListener('resize', onResize);
  // Some browsers fire on zoom/DPR change via this media query
  if (window.matchMedia) {
    const mq = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    mq.addEventListener?.('change', onResize);
  }
  // On iOS/Safari bfcache restores, refresh sizes without re-initting
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) onResize();
  });

  // Kick off
  resize();
  draw();
})();

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
