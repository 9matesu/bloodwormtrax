/* bloodworm trax — camada de interação
   cursor próprio, luz de ponteiro, paralaxe do mapa e revelação no scroll. */

(function () {
  'use strict';

  var root = document.documentElement;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduced) return;

  /* ---------- cursor + luz ---------- */

  function initPointer() {
    var dot = document.createElement('div');
    var ring = document.createElement('div');
    dot.className = 'cursor';
    ring.className = 'cursor-ring';
    dot.setAttribute('aria-hidden', 'true');
    ring.setAttribute('aria-hidden', 'true');
    document.body.appendChild(dot);
    document.body.appendChild(ring);

    var tx = window.innerWidth / 2;
    var ty = window.innerHeight / 2;
    var rx = tx;
    var ry = ty;
    var shown = false;

    function move(e) {
      if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
      tx = e.clientX;
      ty = e.clientY;
      root.style.setProperty('--mx', tx.toFixed(1) + 'px');
      root.style.setProperty('--my', ty.toFixed(1) + 'px');
      if (!shown) {
        shown = true;
        root.classList.add('has-pointer', 'has-cursor');
      }
    }

    function frame() {
      rx += (tx - rx) * 0.18;
      ry += (ty - ry) * 0.18;
      dot.style.transform = 'translate3d(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px,0)';
      ring.style.transform = 'translate3d(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px,0)';
      requestAnimationFrame(frame);
    }

    var hoverSelector = 'a, button, input, select, textarea, summary, label, [role="button"], .gnode, .rel-cover, .node';

    document.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerover', function (e) {
      if (!e.target || !e.target.closest) return;
      ring.classList.toggle('is-hover', !!e.target.closest(hoverSelector));
    }, true);
    document.addEventListener('pointerdown', function () { ring.classList.add('is-down'); }, true);
    document.addEventListener('pointerup', function () { ring.classList.remove('is-down'); }, true);
    window.addEventListener('blur', function () {
      root.classList.remove('has-pointer');
      ring.classList.remove('is-hover', 'is-down');
    });
    window.addEventListener('focus', function () {
      if (shown) root.classList.add('has-pointer');
    });

    frame();
  }

  /* ---------- paralaxe do mapa ---------- */

  function initParallax() {
    var host = document.getElementById('graphHost');
    if (!host) return;
    var scene = host.querySelector('.graph-scene');
    if (!scene) return;

    function set(x, y) {
      scene.style.setProperty('--gx', x.toFixed(1) + 'px');
      scene.style.setProperty('--gy', y.toFixed(1) + 'px');
      scene.style.setProperty('--gr', (x / 42).toFixed(2) + 'deg');
    }

    host.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
      var rect = host.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      var nx = (e.clientX - rect.left) / rect.width - 0.5;
      var ny = (e.clientY - rect.top) / rect.height - 0.5;
      set(nx * 14, ny * 11);
    }, { passive: true });

    host.addEventListener('pointerleave', function () { set(0, 0); });
  }

  /* ---------- revelação no scroll ---------- */

  function initReveal() {
    var revealSelector = '.rel-card, .row-item, .search-group, .detail > *';
    var observer = null;

    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-in');
          observer.unobserve(entry.target);
        });
      }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    }

    function reveal(el, index) {
      if (!el || el.classList.contains('fx-reveal') || el.classList.contains('is-in')) return;
      el.classList.add('fx-reveal');
      el.style.setProperty('--rd', ((index % 6) * 45) + 'ms');
      if (observer) observer.observe(el);
      else el.classList.add('is-in');
    }

    function scan() {
      document.querySelectorAll(revealSelector).forEach(function (el, index) {
        reveal(el, index);
      });
    }

    scan();

    if (!('MutationObserver' in window)) return;
    var pending = 0;
    var mo = new MutationObserver(function () {
      if (pending) return;
      pending = requestAnimationFrame(function () {
        pending = 0;
        scan();
      });
    });

    ['stage', 'indexView', 'searchView', 'detailOverlayBody'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) mo.observe(el, { childList: true, subtree: true });
    });
  }

  if (fine) {
    initPointer();
    initParallax();
  }

  initReveal();
})();
