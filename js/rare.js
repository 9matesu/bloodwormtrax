/* ==========================================================
   sistema de componentes
   Porte em HTML, CSS e JavaScript puro.
   MIT + Commons Clause.
   Sem React, sem Tailwind, sem bibliotecas.
   API: BTXUI.init(root), BTXUI.toast(...), BTXUI.theme(name)
   ========================================================== */
(function () {
  "use strict";

  var reduceMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
  var REDUCE = reduceMQ.matches;
  if (reduceMQ.addEventListener) reduceMQ.addEventListener("change", function (e) { REDUCE = e.matches; });

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var uid = (function () { var i = 0; return function (p) { return (p || "ru") + "-" + (++i); }; })();

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }
  function accent() { return cssVar("--ru-accent") || cssVar("--accent") || "#cd9497"; }

  /* one damped-spring integrator, shared by the whole library */
  function springTo(from, to, o) {
    o = o || {};
    var k = o.stiffness == null ? 200 : o.stiffness;
    var c = o.damping == null ? 26 : o.damping;
    var m = o.mass == null ? 1 : o.mass;
    var onUpdate = o.onUpdate || function () {};
    if (REDUCE) { onUpdate(to); if (o.onDone) o.onDone(); return function () {}; }
    var x = from, v = 0, raf = 0, last = performance.now();
    function frame(now) {
      var dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      var steps = 4, h = dt / steps;
      for (var i = 0; i < steps; i++) {
        var a = (k * (to - x) - c * v) / m;
        v += a * h; x += v * h;
      }
      onUpdate(x);
      if (Math.abs(x - to) < 0.05 && Math.abs(v) < 0.05) {
        onUpdate(to); if (o.onDone) o.onDone(); return;
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return function () { cancelAnimationFrame(raf); };
  }

  function animate(from, to, dur, ease, onUpdate, onDone) {
    if (REDUCE || !dur) { onUpdate(to); if (onDone) onDone(); return function () {}; }
    var start = performance.now(), raf = 0, done = false;
    ease = ease || function (t) { return 1 - Math.pow(1 - t, 3); };
    function frame(now) {
      var t = clamp((now - start) / dur, 0, 1);
      onUpdate(from + (to - from) * ease(t));
      if (t < 1) raf = requestAnimationFrame(frame);
      else { done = true; if (onDone) onDone(); }
    }
    raf = requestAnimationFrame(frame);
    return function () { if (!done) cancelAnimationFrame(raf); };
  }

  function roundDpr(v) { var d = Math.min(window.devicePixelRatio || 1, 3); return Math.round(v * d) / d; }

  function iconSVG(kind) {
    var icons = {
      check: '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4.5 10.5l3.4 3.4 7.6-8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      close: '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
      error: '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 6v5M10 14.2v.1" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>',
      info: '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="1.6"/><path d="M10 9v4M10 6.6v.1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
      spinner: '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 3a7 7 0 107 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
      copy: '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="7" y="7" width="9" height="9" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M13 5.5V5a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h.5" stroke="currentColor" stroke-width="1.5"/></svg>',
      chevron: '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M6 8l4 4 4-4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      play: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M7 4.8v10.4c0 .7.8 1.1 1.4.7l7.4-5.2a.8.8 0 000-1.3L8.4 4.1C7.8 3.7 7 4.1 7 4.8z"/></svg>',
      pause: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><rect x="6" y="4.5" width="3" height="11" rx="1"/><rect x="11" y="4.5" width="3" height="11" rx="1"/></svg>'
    };
    return icons[kind] || "";
  }

  /* ==========================================================
     1. theme-selector
     ========================================================== */
  function initTheme(root) {
    var thumb = $(".ru-theme__thumb", root);
    var opts = $$(".ru-theme__opt", root);
    var currentTheme = document.documentElement.getAttribute("data-theme") || "mono";
    try {
      var raw = localStorage.getItem("btx.settings");
      if (raw) {
        var s = JSON.parse(raw);
        if (s && s.theme) { currentTheme = s.theme; document.documentElement.setAttribute("data-theme", s.theme); }
      }
    } catch (e) {}
    opts.forEach(function (o) {
      o.setAttribute("aria-pressed", o.getAttribute("data-theme-value") === currentTheme ? "true" : "false");
    });
    function place(anim) {
      var active = opts.filter(function (o) { return o.getAttribute("aria-pressed") === "true"; })[0] || opts[0];
      if (!active || !thumb) return;
      if (!anim) thumb.style.transition = "none";
      thumb.style.width = active.offsetWidth + "px";
      thumb.style.transform = "translateX(" + (active.offsetLeft - 3) + "px)";
      if (!anim) { void thumb.offsetWidth; thumb.style.transition = ""; }
    }
    function pick(o) {
      opts.forEach(function (x) { x.setAttribute("aria-pressed", x === o ? "true" : "false"); });
      place(true);
      var name = o.getAttribute("data-theme-value");
      if (name) BTXUI.theme(name);
    }
    opts.forEach(function (o) {
      o.setAttribute("role", "radio");
      o.setAttribute("aria-checked", o.getAttribute("aria-pressed") === "true" ? "true" : "false");
      o.addEventListener("click", function () {
        pick(o);
        opts.forEach(function (x) { x.setAttribute("aria-checked", x === o ? "true" : "false"); });
      });
    });
    root.setAttribute("role", "radiogroup");
    place(false);
    requestAnimationFrame(function () { place(false); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { place(false); });
    var ro = new ResizeObserver(function () { place(false); });
    ro.observe(root);
    return function () { ro.disconnect(); };
  }

  /* ==========================================================
     2. bounce-sidebar
     ========================================================== */
  function initBounce(root) {
    var dot = $(".ru-bounce__dot", root);
    var rows = Array.prototype.slice.call(root.children).filter(function (el) {
      return el.tagName === "LI";
    });
    if (!dot || !rows.length) return;
    var active = 0, prevY = 0, ready = false, stop = null;
    rows.forEach(function (row, i) {
      var target = row.querySelector(".ru-bounce__item");
      if (target) target.addEventListener("click", function () { setActive(i); });
      if (row.hasAttribute("data-default") || (target && target.getAttribute("aria-current") === "true")) active = i;
    });
    function targetY(i) {
      var row = rows[i];
      return roundDpr(row.offsetTop + row.offsetHeight / 2 - 3);
    }
    function snap() {
      prevY = targetY(active);
      dot.style.transform = "translate3d(0," + prevY + "px,0)";
      if (!ready) { root.classList.add("is-ready"); ready = true; }
    }
    function setActive(i, silent) {
      if (i == null || i < 0 || i >= rows.length || i === active) return;
      var to = targetY(i), delta = to - prevY;
      active = i;
      rows.forEach(function (r, j) {
        var it = r.querySelector(".ru-bounce__item");
        if (!it) return;
        var on = j === i;
        it.setAttribute("data-active", on ? "true" : "false");
        if (it.tagName === "A") { if (on) it.setAttribute("aria-current", "page"); else it.removeAttribute("aria-current"); }
        else { if (on) it.setAttribute("aria-current", "true"); else it.removeAttribute("aria-current"); }
      });
      prevY = to;
      if (!delta) return;
      if (stop) stop();
      var from = to - delta;
      var strength = Math.min(0.8, 14 / Math.abs(delta));
      var sign = delta > 0 ? -1 : 1;
      stop = animate(0, 1, 250, function (t) { return 1 - Math.pow(1 - t, 3); }, function (p) {
        var y = from + delta * p;
        var x = sign * strength * Math.abs(delta) * Math.sin(Math.PI * p) * 0.5;
        dot.style.transform = "translate3d(" + x + "px," + y + "px,0)";
      });
      root.dispatchEvent(new CustomEvent("ru:bouncechange", { detail: { index: i }, bubbles: true }));
    }
    snap();
    requestAnimationFrame(snap);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(snap);
    var ro = new ResizeObserver(function () { snap(); });
    ro.observe(root);
    root.ruBounce = { setActive: setActive };
    return function () { ro.disconnect(); if (stop) stop(); };
  }

  /* ==========================================================
     3. hook-sidebar
     ========================================================== */
  function initHook(root) {
    var list = $(".ru-hook__list", root);
    var items = $$(".ru-hook__item", list);
    var rails = $$(".ru-hook__rail", root);
    if (!list || !items.length || rails.length < 2) return;
    var activeIdx = 0;
    items.forEach(function (it, i) { if (it.getAttribute("data-active") === "true") activeIdx = i; });

    function layout(idx, rail, visible) {
      var item = items[idx];
      if (!item || !visible) { rail.classList.remove("is-on"); return; }
      rail.classList.add("is-on");
      var y = item.offsetTop + item.offsetHeight / 2;
      var line = $(".ru-hook__line", rail);
      var hook = $(".ru-hook__hook", rail);
      var top = item.offsetTop;
      var from = 0;
      var h = Math.max(0, y - 6 - from);
      if (line) { line.style.top = from + "px"; line.style.height = h + "px"; }
      if (hook) hook.style.top = (y - 6) + "px";
    }
    function setActive(i) {
      activeIdx = i;
      items.forEach(function (it, j) {
        var on = j === i;
        it.setAttribute("data-active", on ? "true" : "false");
        if (on) it.setAttribute("aria-current", "true"); else it.removeAttribute("aria-current");
      });
      layout(i, rails[1], true);
    }
    items.forEach(function (it, i) {
      it.addEventListener("click", function () { setActive(i); });
      it.addEventListener("pointerenter", function () { layout(i, rails[0], i !== activeIdx); });
    });
    list.addEventListener("pointerleave", function () { rails[0].classList.remove("is-on"); });
    setActive(activeIdx);
    var ro = new ResizeObserver(function () { setActive(activeIdx); });
    ro.observe(list);
    root.ruHook = { setActive: setActive };
    return function () { ro.disconnect(); };
  }

  /* ==========================================================
     4. proximity-sidebar
     ========================================================== */
  function initProx(root) {
    var rail = $(".ru-prox__rail", root);
    var items = $$(".ru-prox__item", root);
    if (!rail || !items.length) return;
    var ticks = items.map(function () {
      var t = document.createElement("span");
      t.className = "ru-prox__tick";
      rail.appendChild(t);
      return t;
    });
    var active = 0;
    items.forEach(function (it, i) { if (it.getAttribute("data-active") === "true") active = i; });

    function placeTicks() {
      items.forEach(function (it, i) {
        ticks[i].style.top = (it.offsetTop + it.offsetHeight / 2) + "px";
      });
    }
    function paint(pointerY) {
      var rect = root.getBoundingClientRect();
      var local = pointerY == null ? null : pointerY - rect.top;
      items.forEach(function (it, i) {
        var cy = it.offsetTop + it.offsetHeight / 2;
        var prox = local == null ? 0 : clamp(1 - Math.abs(cy - local) / 40, 0, 1);
        var on = i === active;
        var s = on ? 1 : 0.22 + 0.7 * prox;
        ticks[i].style.transform = "scaleX(" + s + ")";
        ticks[i].style.opacity = String(on ? 1 : 0.2 + 0.8 * prox);
      });
    }
    root.addEventListener("pointermove", function (e) { paint(e.clientY); });
    root.addEventListener("pointerleave", function () { paint(null); });
    items.forEach(function (it, i) {
      it.addEventListener("click", function () {
        active = i;
        items.forEach(function (x, j) {
          x.setAttribute("data-active", j === i ? "true" : "false");
          if (j === i) x.setAttribute("aria-current", "true"); else x.removeAttribute("aria-current");
        });
        paint();
      });
    });
    placeTicks();
    paint(null);
    var ro = new ResizeObserver(function () { placeTicks(); paint(); });
    ro.observe(root);
    return function () { ro.disconnect(); };
  }

  /* ==========================================================
     5. gooey-nav
     ========================================================== */
  function initGooey(root) {
    var stage = $(".ru-gooey__stage", root);
    var blob = $(".ru-gooey__blob", root);
    var opts = $$(".ru-gooey__opt", root);
    if (!stage || !blob || !opts.length) return;
    // one shared SVG goo filter
    if (!document.getElementById("ru-goo-filter")) {
      var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("width", "0"); svg.setAttribute("height", "0");
      svg.style.position = "absolute"; svg.setAttribute("aria-hidden", "true");
      svg.innerHTML = '<defs><filter id="ru-goo-filter"><feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur"/><feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9" result="goo"/><feComposite in="SourceGraphic" in2="goo" operator="atop"/></filter></defs>';
      document.body.appendChild(svg);
    }
    var active = 0;
    function geom(i) {
      var b = opts[i];
      return { x: b.offsetLeft, w: b.offsetWidth };
    }
    function set(i, animateIt) {
      active = i;
      var g = geom(i);
      if (animateIt) {
        blob.style.transition = "left .55s cubic-bezier(.22,1,.36,1), width .55s cubic-bezier(.22,1,.36,1)";
      } else {
        blob.style.transition = "none";
      }
      // leave a goo neck mid-flight
      blob.style.left = g.x + "px";
      blob.style.width = g.w + "px";
      if (!animateIt) { void blob.offsetWidth; blob.style.transition = ""; }
      opts.forEach(function (o, j) { o.setAttribute("aria-pressed", j === i ? "true" : "false"); });
    }
    opts.forEach(function (o, i) { o.addEventListener("click", function () { set(i, true); }); });
    root.setAttribute("role", "tablist");
    set(active, false);
    requestAnimationFrame(function () { set(active, false); });
    var ro = new ResizeObserver(function () { set(active, false); });
    ro.observe(root);
    return function () { ro.disconnect(); };
  }

  /* ==========================================================
     6. scroll-progress
     ========================================================== */
  function initProgress(root) {
    var btn = $(".ru-progress__btn", root);
    var pctEl = $(".ru-progress__pct", root);
    var ring = $(".ru-progress__ring", root);
    var items = $$(".ru-progress__item", root);
    if (!btn) return;
    var CIRC = 2 * Math.PI * 17;
    if (ring) { ring.style.strokeDasharray = CIRC; }
    function targetEl() {
      var id = root.getAttribute("data-scroll-target");
      return id ? $(id) : null;
    }
    function metrics() {
      var el = targetEl();
      var top, height, view;
      if (el && el !== document.documentElement) {
        top = el.scrollTop; height = el.scrollHeight - el.clientHeight; view = el.clientHeight;
      } else {
        top = window.scrollY || document.documentElement.scrollTop;
        height = document.documentElement.scrollHeight - window.innerHeight;
        view = window.innerHeight;
      }
      return { top: top, max: Math.max(1, height), view: view, el: el };
    }
    function update() {
      var m = metrics();
      var p = clamp(m.top / m.max, 0, 1);
      if (ring) ring.style.strokeDashoffset = String(CIRC * (1 - p));
      if (pctEl) pctEl.textContent = Math.round(p * 100) + "%";
      if (items.length) {
        var best = 0;
        items.forEach(function (it, i) {
          var t = $(it.getAttribute("data-target"));
          if (!t) return;
          var r = t.getBoundingClientRect();
          if (r.top - 120 <= 0) best = i;
        });
        items.forEach(function (it, i) { it.setAttribute("data-active", i === best ? "true" : "false"); });
      }
    }
    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { update(); ticking = false; });
    }
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      root.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", root.classList.contains("is-open") ? "true" : "false");
    });
    document.addEventListener("pointerdown", function (e) {
      if (!root.contains(e.target)) { root.classList.remove("is-open"); btn.setAttribute("aria-expanded", "false"); }
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") root.classList.remove("is-open"); });
    items.forEach(function (it) {
      it.addEventListener("click", function () {
        var t = $(it.getAttribute("data-target"));
        if (t) t.scrollIntoView({ behavior: REDUCE ? "auto" : "smooth", block: "start" });
        root.classList.remove("is-open");
      });
    });
    var scrollEl = targetEl();
    (scrollEl && scrollEl !== document.documentElement ? scrollEl : window).addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
    return function () {
      (scrollEl && scrollEl !== document.documentElement ? scrollEl : window).removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }

  /* ==========================================================
     7. rail-toc
     ========================================================== */
  function initRail(root) {
    var items = $$(".ru-rail__item", root);
    var fill = $(".ru-rail__fill", root);
    if (!items.length) return;
    function update() {
      var best = 0, total = 0;
      items.forEach(function (it, i) {
        var t = $(it.getAttribute("data-target"));
        if (!t) return;
        var r = t.getBoundingClientRect();
        if (r.top - 140 <= 0) { best = i; }
      });
      items.forEach(function (it, i) { it.setAttribute("data-active", i === best ? "true" : "false"); });
      var m = document.documentElement.scrollHeight - window.innerHeight;
      total = clamp((window.scrollY || 0) / Math.max(1, m), 0, 1);
      if (fill) fill.style.height = (total * 100) + "%";
    }
    items.forEach(function (it) {
      it.addEventListener("click", function () {
        var t = $(it.getAttribute("data-target"));
        if (t) t.scrollIntoView({ behavior: REDUCE ? "auto" : "smooth", block: "start" });
      });
    });
    var tick = false;
    function onScroll() { if (!tick) { tick = true; requestAnimationFrame(function () { update(); tick = false; }); } }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
    return function () { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); };
  }

  /* ==========================================================
     8. family-drawer
     ========================================================== */
  function initFamily(root) {
    var trigger = $(".ru-family__trigger", root);
    var bar = $(".ru-family__bar", root);
    if (!trigger || !bar) return;
    trigger.setAttribute("aria-expanded", root.classList.contains("is-open") ? "true" : "false");
    bar.setAttribute("role", "menu");
    function close() { root.classList.remove("is-open"); trigger.setAttribute("aria-expanded", "false"); }
    function open() { root.classList.add("is-open"); trigger.setAttribute("aria-expanded", "true"); }
    trigger.addEventListener("click", function (e) {
      e.stopPropagation();
      root.classList.contains("is-open") ? close() : open();
    });
    $$(".ru-family__item", bar).forEach(function (it) {
      it.setAttribute("role", "menuitem");
      it.addEventListener("click", function () {
        close();
        var label = it.getAttribute("data-label") || it.textContent.trim();
        BTXUI.toast({ title: label, description: "Abrindo no espaço de trabalho.", type: "info", duration: 2400 });
      });
    });
    document.addEventListener("pointerdown", function (e) { if (!root.contains(e.target)) close(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && root.classList.contains("is-open")) { close(); trigger.focus(); } });
    return close;
  }

  /* ==========================================================
     9. otp-input
     ========================================================== */
  function initOTP(root) {
    var inputs = $$(".ru-otp__input", root);
    var row = $(".ru-otp__row", root);
    var hint = $(".ru-otp__hint", root);
    var code = root.getAttribute("data-code") || "";
    if (!inputs.length) return;
    var timers = [];
    inputs.forEach(function (inp, i) {
      inp.setAttribute("inputmode", "numeric");
      inp.setAttribute("autocomplete", "one-time-code");
      inp.setAttribute("maxlength", "1");
      inp.setAttribute("aria-label", "Dígito " + (i + 1) + " de " + inputs.length);
      var cell = inp.parentElement;
      if (!cell.querySelector(".ru-otp__ring")) {
        var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("class", "ru-otp__ring");
        svg.setAttribute("viewBox", "0 0 48 48");
        svg.setAttribute("aria-hidden", "true");
        svg.innerHTML = '<circle cx="24" cy="24" r="23"></circle>';
        cell.appendChild(svg);
      }
      if (!cell.querySelector(".ru-otp__mask")) {
        var mask = document.createElement("span");
        mask.className = "ru-otp__mask";
        mask.setAttribute("aria-hidden", "true");
        var ch = document.createElement("span");
        ch.className = "ru-otp__char";
        mask.appendChild(ch);
        cell.appendChild(mask);
      }
      inp.addEventListener("input", function () {
        var v = inp.value.replace(/\D/g, "").slice(-1);
        inp.value = v;
        cell.classList.toggle("is-filled", !!v);
        cell.querySelector(".ru-otp__char").textContent = v;
        root.classList.remove("is-error", "is-success");
        if (v && i < inputs.length - 1) inputs[i + 1].focus();
        check();
      });
      inp.addEventListener("keydown", function (e) {
        if (e.key === "Backspace" && !inp.value && i > 0) {
          inputs[i - 1].focus();
          inputs[i - 1].value = "";
          inputs[i - 1].parentElement.classList.remove("is-filled");
        } else if (e.key === "ArrowLeft" && i > 0) inputs[i - 1].focus();
        else if (e.key === "ArrowRight" && i < inputs.length - 1) inputs[i + 1].focus();
      });
      inp.addEventListener("paste", function (e) {
        e.preventDefault();
        var txt = (e.clipboardData || window.clipboardData).getData("text").replace(/\D/g, "");
        if (!txt) return;
        inputs.forEach(function (x, j) {
          var val = txt[j] || "";
          x.value = val;
          x.parentElement.classList.toggle("is-filled", !!val);
          x.parentElement.querySelector(".ru-otp__char").textContent = val;
        });
        var next = Math.min(txt.length, inputs.length - 1);
        inputs[next].focus();
        check();
      });
      inp.addEventListener("focus", function () { inp.select(); });
    });
    function check() {
      var val = inputs.map(function (x) { return x.value; }).join("");
      if (val.length !== inputs.length) return;
      timers.forEach(clearTimeout); timers = [];
      if (code && val !== code) {
        root.classList.add("is-error");
        if (hint) hint.textContent = "Código incorreto. Tente de novo.";
        timers.push(setTimeout(function () {
          root.classList.remove("is-error");
          inputs.forEach(function (x) { x.value = ""; x.parentElement.classList.remove("is-filled"); });
          inputs[0].focus();
          if (hint) hint.textContent = "Digite os " + inputs.length + " dígitos.";
        }, 1400));
        return;
      }
      root.classList.add("is-success");
      if (hint) hint.textContent = "Código confirmado.";
      timers.push(setTimeout(function () {
        root.classList.remove("is-success");
        if (hint) hint.textContent = "Digite os " + inputs.length + " dígitos.";
      }, 2600));
    }
    return function () { timers.forEach(clearTimeout); };
  }

  /* ==========================================================
     10. password-input
     ========================================================== */
  function initPassword(root) {
    var input = $(".ru-pass__input", root);
    var eye = $(".ru-pass__eye", root);
    var label = $(".ru-pass__state", root);
    if (!input) return;
    function score(v) {
      var s = 0;
      if (v.length >= 8) s++;
      if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++;
      if (/\d/.test(v)) s++;
      if (/[^A-Za-z0-9]/.test(v)) s++;
      return clamp(s, 0, 4);
    }
    function update() {
      var s = score(input.value);
      root.setAttribute("data-score", String(s));
      if (label) label.textContent = ["muito curta", "fraca", "média", "boa", "forte"][s];
    }
    if (eye) {
      eye.setAttribute("aria-label", "mostrar senha");
      eye.setAttribute("aria-pressed", "false");
      eye.addEventListener("click", function () {
        var show = input.type === "password";
        input.type = show ? "text" : "password";
        eye.classList.toggle("is-on", show);
        eye.setAttribute("aria-pressed", show ? "true" : "false");
        eye.setAttribute("aria-label", show ? "ocultar senha" : "mostrar senha");
        input.focus();
      });
    }
    input.addEventListener("input", update);
    update();
  }

  /* ==========================================================
     11. duration-picker
     ========================================================== */
  function initDuration(root) {
    var segs = $$(".ru-duration__seg", root);
    var unitBtn = $(".ru-duration__unit", root);
    if (!segs.length) return;
    var values = [9, 30];
    var unit = "min";
    function render(bump) {
      segs.forEach(function (seg, i) {
        var val = $(".ru-duration__val", seg);
        if (val) {
          val.innerHTML = values[i] + (i === 1 ? "" : "") + "";
          var small = document.createElement("small");
          small.textContent = i === 0 ? (unit === "min" ? "horas" : "min") : (unit === "min" ? "min" : "seg");
          val.appendChild(small);
          if (bump) { val.classList.remove("is-bump"); void val.offsetWidth; val.classList.add("is-bump"); }
        }
      });
      if (unitBtn) unitBtn.textContent = unit === "min" ? "min" : "h";
      root.dispatchEvent(new CustomEvent("ru:duration", { bubbles: true, detail: { hours: values[0], minutes: values[1], unit: unit } }));
    }
    segs.forEach(function (seg, i) {
      var up = $('[data-step="1"]', seg), down = $('[data-step="-1"]', seg);
      function bump(dir) {
        if (i === 0) values[0] = clamp(values[0] + dir, 0, 23);
        else values[1] = clamp(values[1] + dir, 0, 59);
        render(true);
      }
      if (up) up.addEventListener("click", function () { bump(1); });
      if (down) down.addEventListener("click", function () { bump(-1); });
    });
    if (unitBtn) {
      unitBtn.addEventListener("click", function () {
        unit = unit === "min" ? "h" : "min";
        render(false);
      });
    }
    render(false);
  }

  /* ==========================================================
     12. delete-button
     ========================================================== */
  function initDelete(root) {
    var btn = $("button", root) || root;
    var label = $(".ru-delete__label", root);
    var original = label ? label.textContent : "Excluir";
    var state = "idle", timer = 0;
    function render() {
      btn.classList.toggle("is-armed", state === "armed");
      btn.classList.toggle("is-done", state === "done");
      if (label) label.textContent = state === "armed" ? "Confirmar" : state === "done" ? "Removido" : original;
      btn.setAttribute("aria-label", state === "armed" ? "Confirmar exclusão" : state === "done" ? "Item removido" : original);
    }
    btn.addEventListener("click", function () {
      clearTimeout(timer);
      if (state === "idle") { state = "armed"; render(); timer = setTimeout(function () { state = "idle"; render(); }, 3200); }
      else if (state === "armed") {
        state = "done"; render();
        root.dispatchEvent(new CustomEvent("ru:delete", { bubbles: true }));
        BTXUI.toast({ title: "Item removido", description: "A ação pode ser desfeita.", type: "success", duration: 2600 });
        timer = setTimeout(function () { state = "idle"; render(); }, 2600);
      }
    });
    document.addEventListener("pointerdown", function (e) {
      if (state === "armed" && !root.contains(e.target)) { state = "idle"; render(); }
    });
    render();
  }

  /* ==========================================================
     13. task-list
     ========================================================== */
  function initTask(root) {
    var rows = $$(".ru-task__row", root);
    rows.forEach(function (row) {
      row.setAttribute("role", "checkbox");
      row.setAttribute("aria-checked", row.classList.contains("is-done") ? "true" : "false");
      row.addEventListener("click", function () {
        var on = !row.classList.contains("is-done");
        row.classList.toggle("is-done", on);
        row.setAttribute("aria-checked", on ? "true" : "false");
      });
      row.addEventListener("keydown", function (e) {
        if (e.key === " " || e.key === "Enter") { e.preventDefault(); row.click(); }
      });
    });
  }

  /* ==========================================================
     14. toast
     ========================================================== */
  var toastHost = null;
  function ensureToasts() {
    if (toastHost && document.body.contains(toastHost)) return toastHost;
    toastHost = $(".ru-toasts");
    if (!toastHost) {
      toastHost = document.createElement("div");
      toastHost.className = "ru-toasts";
      toastHost.setAttribute("role", "status");
      toastHost.setAttribute("aria-live", "polite");
      document.body.appendChild(toastHost);
    }
    return toastHost;
  }
  function toast(opts) {
    opts = typeof opts === "string" ? { title: opts } : (opts || {});
    var host = ensureToasts();
    var type = opts.type || "info";
    var dur = opts.duration == null ? 3600 : opts.duration;
    var el = document.createElement("div");
    el.className = "ru-toast";
    el.setAttribute("data-type", type);
    var ico = type === "success" ? "check" : type === "error" ? "error" : type === "loading" ? "spinner" : "info";
    el.innerHTML =
      '<span class="ru-toast__icon">' + iconSVG(ico) + "</span>" +
      '<div class="ru-toast__body"><div class="ru-toast__title"></div>' +
      (opts.description ? '<div class="ru-toast__desc"></div>' : "") +
      "</div>" +
      '<button type="button" class="ru-toast__close" aria-label="fechar aviso">' + iconSVG("close") + "</button>" +
      (dur ? '<span class="ru-toast__life" style="animation-duration:' + dur + 'ms"></span>' : "");
    el.querySelector(".ru-toast__title").textContent = opts.title || "Aviso";
    if (opts.description) el.querySelector(".ru-toast__desc").textContent = opts.description;
    host.appendChild(el);
    var timer = 0, closed = false;
    function close() {
      if (closed) return;
      closed = true; clearTimeout(timer);
      el.classList.add("is-leaving");
      setTimeout(function () { el.remove(); }, 380);
    }
    el.querySelector(".ru-toast__close").addEventListener("click", close);
    el.addEventListener("pointerenter", function () { clearTimeout(timer); });
    el.addEventListener("pointerleave", function () { if (dur) timer = setTimeout(close, 900); });
    if (dur) timer = setTimeout(close, dur);
    while (host.children.length > 4) host.firstElementChild.remove();
    return { close: close, el: el };
  }

  /* ==========================================================
     15. notification-bell
     ========================================================== */
  function initBell(root) {
    var btn = $(".ru-bell__btn", root);
    var badge = $(".ru-bell__badge", root);
    var panel = $(".ru-bell__panel", root);
    if (!btn || !panel) return;
    var unread = badge ? parseInt(badge.textContent, 10) || 0 : 0;
    btn.setAttribute("aria-expanded", "false");
    function close() { root.classList.remove("is-open"); btn.setAttribute("aria-expanded", "false"); }
    function ring() {
      root.classList.remove("is-ringing"); void root.offsetWidth; root.classList.add("is-ringing");
      setTimeout(function () { root.classList.remove("is-ringing"); }, 750);
    }
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = !root.classList.contains("is-open");
      root.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      if (open) ring();
    });
    document.addEventListener("pointerdown", function (e) { if (!root.contains(e.target)) close(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
    $$("[data-ru-bell-ping]", document).forEach(function (b) {
      if (b.__ruPing) return; b.__ruPing = true;
      b.addEventListener("click", function () {
        if (badge) {
          unread += 1;
          badge.textContent = unread > 9 ? "9+" : String(unread);
          badge.hidden = false;
          badge.classList.remove("is-pop"); void badge.offsetWidth; badge.classList.add("is-pop");
        }
        ring();
      });
    });
    if (badge) {
      badge.hidden = unread === 0;
      var clear = $(".ru-bell__clear", root);
      if (clear) clear.addEventListener("click", function () {
        unread = 0; badge.hidden = true;
      });
    }
    return close;
  }

  /* ==========================================================
     16. emoji-reaction
     ========================================================== */
  function initEmoji(root) {
    var btn = $(".ru-emoji__btn", root);
    var countEl = $(".ru-emoji__count", root);
    var burst = $(".ru-emoji__burst", root);
    if (!btn) return;
    var base = parseInt(root.getAttribute("data-count") || (countEl ? countEl.textContent : "0"), 10) || 0;
    var on = root.getAttribute("data-on") === "true";
    if (countEl) countEl.textContent = String(base);
    btn.classList.toggle("is-on", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    function spawn() {
      if (!burst) return;
      var colors = [accent(), "#ff9f0a", "#ff453a", "#bf5af2", "#0a84ff"];
      for (var i = 0; i < 7; i++) {
        var p = document.createElement("span");
        p.className = "ru-emoji__p";
        p.style.background = colors[i % colors.length];
        burst.appendChild(p);
        var ang = (-Math.PI / 2) + (Math.random() - 0.5) * 2.1;
        var dist = 26 + Math.random() * 34;
        var dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist;
        var size = 4 + Math.random() * 4;
        p.style.width = p.style.height = size + "px";
        p.animate([
          { transform: "translate(0,0) scale(.6)", opacity: 1 },
          { transform: "translate(" + dx + "px," + dy + "px) scale(0)", opacity: 0 }
        ], { duration: 520 + Math.random() * 260, easing: "cubic-bezier(.22,1,.36,1)", fill: "forwards" });
        setTimeout(function (el) { return function () { el.remove(); }; }(p), 820);
      }
    }
    btn.addEventListener("click", function () {
      on = !on;
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      var n = base + (on ? 1 : 0);
      if (countEl) countEl.textContent = String(n);
      if (on) spawn();
    });
  }

  /* ==========================================================
     17. faq
     ========================================================== */
  function initFAQ(root) {
    var items = $$(".ru-faq__item", root);
    var single = root.getAttribute("data-single") !== "false";
    items.forEach(function (item) {
      var q = $(".ru-faq__q", item);
      var wrap = $(".ru-faq__a-wrap", item);
      if (!q || !wrap) return;
      q.setAttribute("aria-expanded", item.classList.contains("is-open") ? "true" : "false");
      wrap.id = wrap.id || uid("ru-faq");
      q.setAttribute("aria-controls", wrap.id);
      wrap.setAttribute("role", "region");
      q.addEventListener("click", function () {
        var open = !item.classList.contains("is-open");
        if (single) items.forEach(function (x) {
          x.classList.remove("is-open");
          var qq = $(".ru-faq__q", x); if (qq) qq.setAttribute("aria-expanded", "false");
        });
        item.classList.toggle("is-open", open);
        q.setAttribute("aria-expanded", open ? "true" : "false");
      });
    });
  }

  /* ==========================================================
     18. ai-status
     ========================================================== */
  var AI_LABELS = {
    idle: "aguardando", thinking: "pensando", searching: "buscando",
    writing: "escrevendo", done: "pronto", error: "erro"
  };
  function initAI(root) {
    var label = $(".ru-ai__label b", root) || $(".ru-ai__label", root);
    var states = (root.getAttribute("data-states") || "").split(",").filter(Boolean);
    var cycle = states.length > 1;
    var i = states.indexOf(root.getAttribute("data-state"));
    if (i < 0) i = 0;
    var timer = 0;
    function set(state) {
      root.setAttribute("data-state", state);
      if (label) label.textContent = root.getAttribute("data-label-" + state) || AI_LABELS[state] || state;
    }
    function tick() {
      i = (i + 1) % states.length;
      set(states[i]);
    }
    if (cycle && !REDUCE) timer = setInterval(tick, parseInt(root.getAttribute("data-interval"), 10) || 2400);
    if (!cycle && !root.getAttribute("data-state")) set("idle");
    return function () { clearInterval(timer); };
  }

  /* ==========================================================
     19. animated-counter
     ========================================================== */
  function initCounter(root) {
    var numEl = $(".ru-counter__num", root);
    if (!numEl) return;
    var target = parseFloat(root.getAttribute("data-value") || "0") || 0;
    var decimals = parseInt(root.getAttribute("data-decimals") || "0", 10) || 0;
    var locale = root.getAttribute("data-locale") || "pt-BR";
    var prefix = root.getAttribute("data-prefix") || "";
    var suffix = root.getAttribute("data-suffix") || "";
    var done = false;
    function fmt(n) {
      return new Intl.NumberFormat(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n);
    }
    function build(value) {
      numEl.innerHTML = "";
      var str = fmt(value);
      numEl.setAttribute("aria-label", prefix + str + suffix);
      if (prefix) {
        var pre = document.createElement("span");
        pre.className = "ru-counter__affix";
        pre.setAttribute("aria-hidden", "true");
        pre.textContent = prefix;
        numEl.appendChild(pre);
      }
      Array.prototype.forEach.call(str, function (ch) {
        if (/\d/.test(ch)) {
          var d = document.createElement("span");
          d.className = "ru-counter__digit";
          d.setAttribute("aria-hidden", "true");
          var wheel = document.createElement("span");
          wheel.className = "ru-counter__wheel";
          for (var n = 0; n <= 9; n++) {
            var s = document.createElement("span");
            s.textContent = String(n);
            wheel.appendChild(s);
          }
          wheel.style.transform = "translateY(-" + (parseInt(ch, 10)) + "em)";
          d.appendChild(wheel);
          numEl.appendChild(d);
        } else {
          var sep = document.createElement("span");
          sep.className = "ru-counter__sep";
          sep.setAttribute("aria-hidden", "true");
          sep.textContent = ch;
          numEl.appendChild(sep);
        }
      });
      if (suffix) {
        var suf = document.createElement("span");
        suf.className = "ru-counter__affix";
        suf.setAttribute("aria-hidden", "true");
        suf.textContent = suffix;
        numEl.appendChild(suf);
      }
    }
    function run() {
      if (done) return; done = true;
      var from = 0, start = performance.now(), dur = parseInt(root.getAttribute("data-duration"), 10) || 1300;
      function frame(now) {
        var t = clamp((now - start) / dur, 0, 1);
        var eased = 1 - Math.pow(1 - t, 3);
        build(from + (target - from) * eased);
        if (t < 1) requestAnimationFrame(frame);
        else {
          build(target);
          numEl.style.transition = "none";
        }
      }
      if (REDUCE) build(target); else requestAnimationFrame(frame);
    }
    build(0);
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { run(); io.disconnect(); } });
      }, { threshold: 0.35 });
      io.observe(root);
    } else run();
  }

  /* ==========================================================
     20. code-block
     ========================================================== */
  function initCode(root) {
    var body = $(".ru-code__body code", root);
    var copy = $(".ru-code__copy", root);
    if (body && !body.__ruTok) {
      body.__ruTok = true;
      var src = body.textContent;
      var esc = function (s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); };
      var out = "", i = 0;
      var re = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|\b(const|let|var|function|return|if|else|new|await|async|import|from|export|class|for|of|in)\b|\b(\d+(?:\.\d+)?)\b|([A-Za-z_$][\w$]*)(?=\s*\()/g;
      var last = 0, m;
      while ((m = re.exec(src))) {
        out += esc(src.slice(last, m.index));
        if (m[1]) out += '<span class="tok-c">' + esc(m[1]) + "</span>";
        else if (m[2]) out += '<span class="tok-s">' + esc(m[2]) + "</span>";
        else if (m[3]) out += '<span class="tok-k">' + esc(m[3]) + "</span>";
        else if (m[4]) out += '<span class="tok-n">' + esc(m[4]) + "</span>";
        else if (m[5]) out += '<span class="tok-f">' + esc(m[5]) + "</span>";
        last = re.lastIndex;
      }
      out += esc(src.slice(last));
      body.innerHTML = out;
    }
    if (copy) {
      var original = copy.innerHTML;
      copy.addEventListener("click", function () {
        var text = body ? body.textContent : "";
        function ok() {
          copy.innerHTML = iconSVG("check") + " copiado";
          copy.classList.add("is-done");
          setTimeout(function () { copy.innerHTML = original; copy.classList.remove("is-done"); }, 1800);
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(ok).catch(fallback);
        } else fallback();
        function fallback() {
          var ta = document.createElement("textarea");
          ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
          document.body.appendChild(ta); ta.select();
          try { document.execCommand("copy"); ok(); } catch (e) {}
          ta.remove();
        }
      });
    }
  }

  /* ==========================================================
     21. folder-component
     ========================================================== */
  function initFolder(root) {
    var folder = $(".ru-folder", root) || root;
    if (!folder.querySelector(".ru-folder__front")) return;
    folder.setAttribute("role", "button");
    folder.setAttribute("tabindex", "0");
    folder.setAttribute("aria-expanded", "false");
    function toggle() {
      var open = folder.classList.toggle("is-open");
      folder.setAttribute("aria-expanded", open ? "true" : "false");
      var count = $(".ru-folder__count", folder);
      if (count) count.textContent = open ? "3 arquivos" : "3 itens";
    }
    folder.addEventListener("click", toggle);
    folder.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } });
  }

  /* ==========================================================
     22. github-activity
     ========================================================== */
  function initGH(root) {
    var grid = $(".ru-gh__grid", root);
    var tip = $(".ru-gh__tip", root);
    var months = $(".ru-gh__months", root);
    var totalEl = $(".ru-gh__total", root);
    if (!grid || grid.children.length) return;
    var seed = 7;
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    var weeks = 53, total = 0;
    var widths = [];
    for (var w = 0; w < weeks; w++) {
      for (var d = 0; d < 7; d++) {
        var roll = rnd();
        var active = roll > 0.42;
        var level = active ? 1 + Math.floor(rnd() * 4) : 0;
        if (rnd() > 0.86 && level < 4) level = 4;
        total += level ? level * 2 : 0;
        var c = document.createElement("span");
        c.className = "ru-gh__cell";
        c.setAttribute("data-level", String(level));
        c.setAttribute("aria-label", (level ? level * 2 : 0) + " contribuições");
        c.__count = level ? level * 2 : 0;
        c.__week = w; c.__day = d;
        grid.appendChild(c);
      }
    }
    if (totalEl) totalEl.textContent = total.toLocaleString("pt-BR");
    // month labels for 53 weeks starting ~1 year ago
    if (months) {
      months.innerHTML = "";
      var now = new Date();
      for (var i = 0; i < 12; i += 1) {
        var d2 = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
        var span = document.createElement("span");
        span.textContent = d2.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
        span.style.position = "absolute";
        span.style.left = Math.round((i / 12) * 100) + "%";
        months.appendChild(span);
      }
      months.style.position = "relative";
    }
    grid.addEventListener("pointermove", function (e) {
      var cell = e.target.closest(".ru-gh__cell");
      if (!cell || !tip) { if (tip) tip.classList.remove("is-on"); return; }
      var gr = grid.getBoundingClientRect(), rr = cell.getBoundingClientRect();
      tip.textContent = cell.__count + (cell.__count === 1 ? " contribuição" : " contribuições");
      tip.style.left = (rr.left - gr.left + rr.width / 2) + "px";
      tip.style.top = (rr.top - gr.top - 6) + "px";
      tip.classList.add("is-on");
    });
    grid.addEventListener("pointerleave", function () { if (tip) tip.classList.remove("is-on"); });
  }

  /* ==========================================================
     23. gravity-letters
     ========================================================== */
  function initGravity(root) {
    var layer = $(".ru-gravity__layer", root);
    if (!layer) return;
    var word = root.getAttribute("data-word") || "btx";
    var W = root.clientWidth || 600, H = root.clientHeight || 240;
    var COL = 8, CLEARANCE = 22, TILT = 0.45, BOUNCE = 0.22;
    var cols = Math.max(4, Math.ceil(W / COL));
    var heights = new Array(cols).fill(0);
    var letters = [];
    var raf = 0, last = performance.now();
    var pourTimer = 0, pourIdx = 0;
    var reduced = REDUCE;

    function spawn(ch, x, y, size) {
      var el = document.createElement("span");
      el.className = "ru-gravity__g";
      el.style.fontSize = size + "px";
      el.textContent = ch;
      layer.appendChild(el);
      var L = {
        el: el, ch: ch, x: x == null ? Math.random() * (W - 30) + 10 : x,
        y: y == null ? 12 : y, vy: 0, vx: 0, size: size, w: size * 0.62,
        rot: 0, vr: 0, settled: false, col: 0
      };
      el.style.transform = "translate3d(" + L.x + "px," + L.y + "px,0)";
      letters.push(L);
      return L;
    }
    function restFor(col) { return H - 18 - heights[col]; }
    function frame(now) {
      var dt = Math.min((now - last) / 1000, 0.04);
      last = now;
      if (!reduced) {
        letters.forEach(function (L) {
          if (L.settled) return;
          L.vy += 1600 * dt;
          L.x += L.vx * dt;
          L.y += L.vy * dt;
          L.rot += L.vr * dt;
          L.col = clamp(Math.floor((L.x + L.w / 2) / COL), 0, cols - 1);
          var rest = restFor(L.col);
          var ground = H - 18 - heights[L.col];
          if (L.y + L.size * 0.72 >= ground) {
            L.y = ground - L.size * 0.72;
            if (Math.abs(L.vy) > 160) {
              L.vy = -L.vy * BOUNCE;
              L.vr = (Math.random() - 0.5) * 2;
            } else {
              L.settled = true;
              L.vy = 0; L.vr = 0;
              heights[L.col] += L.size * 0.5;
              L.rot = (Math.random() - 0.5) * 8;
            }
          }
          L.el.style.transform = "translate3d(" + L.x + "px," + L.y + "px,0) rotate(" + L.rot + "deg)";
        });
        // crumble when a tower gets tall
        if (heights.some(function (h) { return h > H * 0.62; })) {
          heights = heights.map(function (h) { return Math.max(0, h - 1); });
        }
      }
      raf = requestAnimationFrame(frame);
    }
    function pour(n) {
      clearInterval(pourTimer);
      var count = 0;
      var chars = word.replace(/\s/g, "");
      pourTimer = setInterval(function () {
        var ch = chars[pourIdx % chars.length];
        pourIdx++;
        spawn(ch, W * 0.5 + (Math.random() - 0.5) * 60, 4, 16 + Math.random() * 12);
        if (++count >= (n || 8)) clearInterval(pourTimer);
      }, 70);
    }
    spawn("r", W * 0.3, 4, 22); spawn("u", W * 0.6, 4, 22);
    raf = requestAnimationFrame(frame);
    var px = 0, py = 0;
    root.addEventListener("pointermove", function (e) {
      var r = root.getBoundingClientRect();
      px = e.clientX - r.left; py = e.clientY - r.top;
      if (Math.random() > 0.7) spawn(word.replace(/\s/g, "")[Math.floor(Math.random() * word.replace(/\s/g, "").length)], px, py, 12 + Math.random() * 12);
    });
    root.addEventListener("pointerleave", function () { pour(4); });
    return function () { cancelAnimationFrame(raf); clearInterval(pourTimer); };
  }

  /* ==========================================================
     24. grid-reveal
     ========================================================== */
  function initGrid(root) {
    var canvas = $("canvas", root);
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var cell = 22, gap = 3;
    var cells = [];
    var mx = -999, my = -999, time = 0, raf = 0, reduced = REDUCE;
    var col = accent();
    function size() {
      var w = root.clientWidth, h = root.clientHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cells = [];
      for (var y = 0; y < h; y += cell + gap) {
        for (var x = 0; x < w; x += cell + gap) {
          cells.push({ x: x, y: y, r: 1 + Math.random() * 2, ph: Math.random() * 6.28 });
        }
      }
    }
    function color() { col = accent(); }
    function draw(t) {
      var w = root.clientWidth, h = root.clientHeight;
      ctx.clearRect(0, 0, w, h);
      cells.forEach(function (c) {
        var cx = c.x + cell / 2, cy = c.y + cell / 2;
        var d = Math.hypot(cx - mx, cy - my);
        var prox = clamp(1 - d / 120, 0, 1);
        var ripple = reduced ? 0 : 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * 0.0016 + c.ph - d * 0.02));
        var a = 0.06 + prox * 0.9 * ripple;
        var r = 1.6 + prox * 3.4;
        ctx.fillStyle = col;
        ctx.globalAlpha = a;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    }
    root.addEventListener("pointermove", function (e) {
      var r = root.getBoundingClientRect();
      mx = e.clientX - r.left; my = e.clientY - r.top;
    });
    root.addEventListener("pointerleave", function () { mx = my = -999; });
    size(); color();
    function loop(t) { draw(t); if (!reduced) raf = requestAnimationFrame(loop); }
    if (reduced) draw(0); else raf = requestAnimationFrame(loop);
    var ro = new ResizeObserver(function () { size(); if (reduced) draw(0); });
    ro.observe(root);
    return function () { ro.disconnect(); cancelAnimationFrame(raf); };
  }

  /* ==========================================================
     25. step-player
     ========================================================== */
  function initStep(root) {
    var src = $$(".ru-step__slide", root);
    var play = $(".ru-step__play", root);
    var title = $(".ru-step__title", root);
    var eyebrow = $(".ru-step__eyebrow", root);
    var body = $(".ru-step__body", root);
    var dotsWrap = $(".ru-step__dots", root);
    var ring = $(".ru-step__ring .fill", root);
    if (!play || !src.length) return;
    var steps = src.map(function (el) {
      return {
        title: el.getAttribute("data-title") || "Etapa",
        desc: el.textContent.trim()
      };
    });
    var idx = 0, playing = false, timer = 0, t0 = 0, dur = parseInt(root.getAttribute("data-duration"), 10) || 4200;
    var CIRC = 2 * Math.PI * 14.5;
    if (ring) ring.style.strokeDasharray = CIRC;
    var dots = [];
    if (dotsWrap) {
      dotsWrap.innerHTML = "";
      steps.forEach(function (s, i) {
        var b = document.createElement("button");
        b.type = "button";
        b.setAttribute("aria-label", "Etapa " + (i + 1));
        b.addEventListener("click", function () { go(i); });
        dotsWrap.appendChild(b);
        dots.push(b);
      });
    }
    function render() {
      var s = steps[idx];
      if (title) title.textContent = s.title;
      if (eyebrow) eyebrow.textContent = "etapa " + (idx + 1) + " de " + steps.length;
      if (body) body.innerHTML = "<p></p>";
      if (body) $("p", body).textContent = s.desc;
      dots.forEach(function (d, i) { d.setAttribute("aria-current", i === idx ? "true" : "false"); });
      if (ring) ring.style.strokeDashoffset = CIRC;
    }
    function go(i) {
      idx = (i + steps.length) % steps.length;
      render();
      if (playing) { clearTimeout(timer); startTimer(); }
    }
    function startTimer() {
      t0 = performance.now();
      tick();
      timer = setTimeout(function () {
        go(idx + 1);
        if (playing) startTimer();
      }, dur);
    }
    function tick() {
      if (ring && playing) {
        var t = clamp((performance.now() - t0) / dur, 0, 1);
        ring.style.strokeDashoffset = String(CIRC * (1 - t));
        requestAnimationFrame(tick);
      }
    }
    function setPlaying(on) {
      playing = on;
      play.innerHTML = (on ? iconSVG("pause") : iconSVG("play")) +
        '<svg class="ru-step__ring" viewBox="0 0 32 32" aria-hidden="true"><circle class="track" cx="16" cy="16" r="14.5"/><circle class="fill" cx="16" cy="16" r="14.5"/></svg>';
      ring = $(".ru-step__ring .fill", root);
      if (ring) { ring.style.strokeDasharray = CIRC; ring.style.strokeDashoffset = on ? CIRC : CIRC; }
      play.setAttribute("aria-label", on ? "pausar" : "reproduzir");
      clearTimeout(timer);
      if (on) startTimer(); else if (ring) ring.style.strokeDashoffset = CIRC;
    }
    play.addEventListener("click", function () { setPlaying(!playing); });
    $$(".ru-step__nav button", root).forEach(function (b) {
      b.addEventListener("click", function () { go(idx + (b.getAttribute("data-dir") === "next" ? 1 : -1)); });
    });
    render();
    setPlaying(false);
    root.addEventListener("pointerenter", function () { if (!playing && root.hasAttribute("data-autoplay")) setPlaying(true); });
    return function () { clearTimeout(timer); };
  }

  /* ==========================================================
     26. voice-note
     ========================================================== */
  function initVoice(root) {
    var play = $(".ru-voice__play", root);
    var wave = $(".ru-voice__wave", root);
    var timeEl = $(".ru-voice__time", root);
    var scrub = $(".ru-voice__scrub", root);
    if (!play || !wave) return;
    var bars = $$(".ru-voice__bar", wave);
    if (!bars.length) {
      var n = 34, seed = 12;
      for (var i = 0; i < n; i++) {
        seed = (seed * 16807) % 2147483647;
        var r = seed / 2147483647;
        var b = document.createElement("span");
        b.className = "ru-voice__bar";
        b.style.height = (5 + r * 22) + "px";
        wave.insertBefore(b, scrub || null);
        bars.push(b);
      }
    }
    var dur = parseFloat(root.getAttribute("data-duration") || "34");
    var pos = 0, playing = false, raf = 0, last = performance.now();
    function fmt(s) {
      var m = Math.floor(s / 60), ss = Math.floor(s % 60);
      return m + ":" + (ss < 10 ? "0" : "") + ss;
    }
    function paint() {
      var p = pos / dur;
      bars.forEach(function (b, i) { b.classList.toggle("is-past", i / bars.length <= p); });
      if (timeEl) timeEl.textContent = fmt(pos) + " de " + fmt(dur);
      if (scrub) scrub.value = String(p);
    }
    function stop() { playing = false; cancelAnimationFrame(raf); play.innerHTML = iconSVG("play"); play.setAttribute("aria-label", "reproduzir"); }
    function loop(now) {
      var dt = (now - last) / 1000; last = now;
      if (playing) {
        pos = Math.min(dur, pos + dt);
        paint();
        if (pos >= dur) { pos = 0; stop(); paint(); return; }
        raf = requestAnimationFrame(loop);
      }
    }
    play.addEventListener("click", function () {
      if (playing) { stop(); paint(); return; }
      playing = true; last = performance.now();
      play.innerHTML = iconSVG("pause"); play.setAttribute("aria-label", "pausar");
      raf = requestAnimationFrame(loop);
    });
    if (scrub) scrub.addEventListener("input", function () { pos = parseFloat(scrub.value) * dur; paint(); });
    paint();
    return stop;
  }

  /* ==========================================================
     27. web-search
     ========================================================== */
  var SEARCH_POOL = [
    ["Granular synthesis: a practical guide", "soundonsound.com", "Como o grão vira textura, do buffer ao envelope."],
    ["PE binary file format", "learn.microsoft.com", "Cabeçalhos, seções e o que sobra quando o som começa."],
    ["Opcoda and the sound of executables", "bloodwormtrax.com", "O sintetizador que lê bytes de programas."],
    ["Building a VST3 with modern C++", "github.com", "Um guia aberto de instrumentação e empacotamento."],
    ["Field recording for texture design", "archive.org", "Fontes, camadas e edição para trilha."]
  ];
  function initSearch(root) {
    var input = $(".ru-search__input", root);
    var form = $(".ru-search__field", root);
    var go = $(".ru-search__go", root);
    var panel = $(".ru-search__panel", root);
    if (!input || !panel) return;
    var results = $(".ru-search__results", panel);
    var status = $(".ru-search__status", panel);
    var timer = 0;
    function render(q) {
      if (!results || !status) return;
      status.innerHTML = '<i></i> buscando na web';
      results.innerHTML = '<div style="padding:8px 6px"><div class="ru-search__skeleton" style="width:70%"></div><div class="ru-search__skeleton" style="width:92%;margin-top:6px"></div><div class="ru-search__skeleton" style="width:54%;margin-top:6px"></div></div>';
      root.classList.add("is-open");
      clearTimeout(timer);
      timer = setTimeout(function () {
        status.innerHTML = '<i style="background:var(--ru-green)"></i> ' + SEARCH_POOL.length + " fontes encontradas";
        results.innerHTML = "";
        SEARCH_POOL.forEach(function (r) {
          var row = document.createElement("a");
          row.className = "ru-search__result";
          row.href = "#";
          row.addEventListener("click", function (e) { e.preventDefault(); });
          row.innerHTML = '<span class="ru-search__fav">' + r[1].charAt(0).toUpperCase() + "</span><span><b></b><small></small></span>";
          row.querySelector("b").textContent = r[0];
          row.querySelector("small").textContent = r[1] + " · " + r[2];
          results.appendChild(row);
        });
        var chips = document.createElement("div");
        chips.className = "ru-search__chips";
        q.split(/\s+/).filter(Boolean).slice(0, 5).forEach(function (w) {
          var s = document.createElement("span"); s.textContent = w; chips.appendChild(s);
        });
        results.appendChild(chips);
      }, REDUCE ? 0 : 700);
    }
    function run() {
      var q = input.value.trim();
      if (!q) { root.classList.remove("is-open"); return; }
      render(q);
    }
    if (go) go.addEventListener("click", run);
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); run(); } });
    input.addEventListener("input", function () {
      if (!input.value.trim()) { root.classList.remove("is-open"); clearTimeout(timer); }
    });
    document.addEventListener("pointerdown", function (e) { if (!root.contains(e.target)) root.classList.remove("is-open"); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") root.classList.remove("is-open"); });
    return function () { clearTimeout(timer); };
  }

  /* ==========================================================
     28. fluid-orb (WebGL, port exato do shader)
     ========================================================== */
  var ORB_VERT = "attribute vec2 a_pos;void main(){gl_Position=vec4(a_pos,0.0,1.0);}";
  var ORB_FRAG = [
    "#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif",
    "uniform vec2 u_resolution;uniform float u_time;uniform vec3 u_color;",
    "float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}",
    "float noise(vec2 p){vec2 i=floor(p);vec2 f=fract(p);vec2 u=f*f*(3.0-2.0*f);return mix(mix(hash(i+vec2(0.0,0.0)),hash(i+vec2(1.0,0.0)),u.x),mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),u.x),u.y);}",
    "float fbm(vec2 p){float v=0.0;float a=0.6;for(int i=0;i<3;i++){v+=a*noise(p);p*=2.0;a*=0.5;}return v;}",
    "void main(){vec2 uv=gl_FragCoord.xy/u_resolution.xy;float t=u_time*0.22;",
    "vec2 drift=vec2(sin(t)+0.6*sin(t*1.7+1.3),cos(t*0.8)+0.6*cos(t*1.3+2.1));",
    "vec2 p=vec2(uv.x*1.8,uv.y*1.0)+drift*0.7;",
    "vec2 q=vec2(fbm(p+drift),fbm(p+vec2(3.2,1.5)-drift));float f=fbm(p+1.2*q);",
    "float g=clamp(1.0-uv.y,0.0,1.0);float anchor=smoothstep(0.0,0.3,uv.y);",
    "float shade=clamp(g+(f-0.5)*0.8*anchor,0.0,1.0);",
    "vec3 white=vec3(0.99,1.0,1.0);vec3 light=mix(white,u_color,0.5);vec3 dark=u_color;",
    "vec3 col=white;col=mix(col,light,smoothstep(0.28,0.52,shade));col=mix(col,dark,smoothstep(0.58,0.88,shade));",
    "float edge=smoothstep(0.5,0.49,distance(uv,vec2(0.5)));",
    "gl_FragColor=vec4(col*edge,edge);}"
  ].join("\n");

  function initFluid(root) {
    var canvas = $("canvas", root);
    if (!canvas) return;
    var size = parseInt(root.getAttribute("data-size") || "240", 10) || 240;
    var gl = canvas.getContext("webgl", { antialias: true, alpha: true });
    if (!gl) { canvas.style.background = "radial-gradient(circle at 35% 30%, #fff, " + accent() + ")"; canvas.style.borderRadius = "50%"; return; }
    function hex(h) {
      h = h.replace("#", "").trim();
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      var n = parseInt(h, 16);
      return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
    }
    function compile(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error(gl.getShaderInfoLog(s)); return null; }
      return s;
    }
    var prog = gl.createProgram();
    var v = compile(gl.VERTEX_SHADER, ORB_VERT), f = compile(gl.FRAGMENT_SHADER, ORB_FRAG);
    if (!v || !f) return;
    gl.attachShader(prog, v); gl.attachShader(prog, f); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    var aPos = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var px = Math.round(size * dpr);
    canvas.width = px; canvas.height = px;
    gl.viewport(0, 0, px, px);
    gl.uniform2f(gl.getUniformLocation(prog, "u_resolution"), px, px);
    var col = root.getAttribute("data-color") || "#1a73f2";
    gl.uniform3f(gl.getUniformLocation(prog, "u_color"), ...hex(col));
    var uTime = gl.getUniformLocation(prog, "u_time");
    var start = performance.now(), raf = 0;
    function render(now) {
      gl.uniform1f(uTime, REDUCE ? 0 : (now - start) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      if (!REDUCE) raf = requestAnimationFrame(render);
    }
    render(start);
    return function () { cancelAnimationFrame(raf); gl.deleteProgram(prog); gl.deleteShader(v); gl.deleteShader(f); gl.deleteBuffer(buf); };
  }

  /* ==========================================================
     29. matrix-orb (canvas 2D)
     ========================================================== */
  function initMatrix(root) {
    var canvas = $("canvas", root);
    var label = $(".ru-orb__label b", root);
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    var size = parseInt(root.getAttribute("data-size") || "200", 10) || 200;
    var color = root.getAttribute("data-color") || accent();
    var dots = parseInt(root.getAttribute("data-dots") || "11", 10) || 11;
    var STATES = ["idle", "listening", "thinking"];
    var LABELS = { idle: "idle", listening: "ouvindo", thinking: "pensando" };
    var SCALE = { idle: 0.88, listening: 1, thinking: 0.92 };
    var STIFF = 180, DAMP = 26, ATTACK = 0.22, RELEASE = 0.08, BLEND = 0.16;
    var ORBITERS = [
      { radius: 0.62, speed: 2.2, phase: 0, spread: 0.42 },
      { radius: 0.4, speed: -1.7, phase: 2.1, spread: 0.36 },
      { radius: 0.8, speed: 1.15, phase: 4, spread: 0.34 }
    ];
    var state = root.getAttribute("data-state") || "idle";
    var level = root.hasAttribute("data-level") ? parseFloat(root.getAttribute("data-level")) : undefined;
    var dpr = Math.min(window.devicePixelRatio || 1, 4);
    var buffer = Math.round(size * dpr);
    canvas.width = canvas.height = buffer;
    canvas.style.width = size + "px"; canvas.style.height = size + "px";
    ctx.scale(buffer / size, buffer / size);
    ctx.fillStyle = color;
    var grid = Math.max(3, Math.round(dots));
    var half = (grid - 1) / 2;
    var spacing = (size * 0.74) / (grid - 1);
    var maxRadius = spacing * 0.6;
    var center = size / 2;
    var weights = { idle: 0, listening: 0, thinking: 0 };
    weights[state] = 1;
    function envelope(t) {
      var slow = 0.5 + 0.5 * Math.sin(t * 0.62 + 0.4);
      var fast = 0.5 + 0.5 * Math.sin(t * 1.9 + 1.1);
      return 0.22 + 0.78 * (0.45 + 0.55 * slow) * fast;
    }
    function levelAt(t) {
      var v = level;
      return v === undefined || !isFinite(v) ? envelope(t) : clamp(v, 0, 1);
    }
    function intensityOf(s, d, nx, ny, t, amp) {
      if (s === "listening") {
        var ripple = 0.5 + 0.5 * Math.sin(d * 4.2 - t * 3);
        return 0.32 + amp * (0.34 + 0.38 * ripple);
      }
      if (s === "thinking") {
        var heat = 0;
        for (var i = 0; i < ORBITERS.length; i++) {
          var o = ORBITERS[i], a = t * o.speed + o.phase;
          var dx = nx - Math.cos(a) * o.radius, dy = ny - Math.sin(a) * o.radius;
          heat += Math.exp(-(dx * dx + dy * dy) / (o.spread * o.spread));
        }
        return 0.26 + 0.8 * Math.min(1, heat);
      }
      return 0.62 + 0.12 * Math.sin(t * 1.05 - d * 2.4);
    }
    function draw(t, amp, scale) {
      ctx.clearRect(0, 0, size, size);
      for (var iy = 0; iy < grid; iy++) {
        for (var ix = 0; ix < grid; ix++) {
          var nx = (ix - half) / half, ny = (iy - half) / half;
          var d = Math.hypot(nx, ny);
          if (d > 1.12) continue;
          var blended = 0;
          for (var k = 0; k < STATES.length; k++) {
            var s = STATES[k];
            if (weights[s] < 0.001) continue;
            blended += weights[s] * intensityOf(s, d, nx, ny, t, amp);
          }
          var intensity = clamp(blended, 0, 1);
          var radius = maxRadius * Math.exp(-d * d * 1.7) * intensity * scale;
          if (radius * dpr < 0.5) continue;
          ctx.beginPath();
          ctx.arc(center + (ix - half) * spacing * scale, center + (iy - half) * spacing * scale, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    var t = 0, amp = 0, scale = SCALE[state], vel = 0, raf = 0, last = performance.now();
    function frame(now) {
      var dt = Math.min((now - last) / 1000, 0.05); last = now; t += dt;
      var target = levelAt(t);
      var rate = target > amp ? ATTACK : RELEASE;
      amp += (target - amp) * (1 - Math.pow(1 - rate, dt * 60));
      var step = 1 - Math.pow(1 - BLEND, dt * 60);
      STATES.forEach(function (s) { weights[s] += ((s === state ? 1 : 0) - weights[s]) * step; });
      vel += (-STIFF * (scale - SCALE[state]) - DAMP * vel) * dt;
      scale += vel * dt;
      draw(t, amp, scale);
      raf = requestAnimationFrame(frame);
    }
    function staticDraw() {
      STATES.forEach(function (s) { weights[s] = s === state ? 1 : 0; });
      draw(0, levelAt(0), SCALE[state]);
    }
    if (REDUCE) staticDraw(); else raf = requestAnimationFrame(frame);
    function setState(s) {
      state = s;
      root.setAttribute("data-state", s);
      if (label) label.textContent = LABELS[s] || s;
      if (REDUCE) staticDraw();
    }
    if (label) label.textContent = LABELS[state] || state;
    root.addEventListener("click", function () {
      var i = (STATES.indexOf(state) + 1) % STATES.length;
      setState(STATES[i]);
    });
    root.style.cursor = "pointer";
    root.setAttribute("role", "button");
    root.setAttribute("tabindex", "0");
    root.setAttribute("aria-label", "orb de estado, clique para alternar");
    root.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); root.click(); } });
    return function () { cancelAnimationFrame(raf); };
  }

  /* ==========================================================
     init registry
     ========================================================== */
  var INIT = {
    "theme": initTheme,
    "bounce": initBounce,
    "hook": initHook,
    "prox": initProx,
    "gooey": initGooey,
    "progress": initProgress,
    "rail": initRail,
    "family": initFamily,
    "otp": initOTP,
    "password": initPassword,
    "duration": initDuration,
    "delete": initDelete,
    "task": initTask,
    "bell": initBell,
    "emoji": initEmoji,
    "faq": initFAQ,
    "ai": initAI,
    "counter": initCounter,
    "code": initCode,
    "folder": initFolder,
    "gh": initGH,
    "gravity": initGravity,
    "grid": initGrid,
    "step": initStep,
    "voice": initVoice,
    "search": initSearch,
    "fluid": initFluid,
    "matrix": initMatrix
  };

  function init(root) {
    root = root || document;
    $$("[data-ru]", root).forEach(function (el) {
      if (el.__ruInit) return;
      var fn = INIT[el.getAttribute("data-ru")];
      if (!fn) return;
      try {
        el.__ruInit = fn(el) || true;
      } catch (err) {
        console.error("[BTXUI]", el.getAttribute("data-ru"), err);
      }
    });
    // toast triggers anywhere
    $$("[data-ru-toast]", root).forEach(function (el) {
      if (el.__ruToast) return;
      el.__ruToast = true;
      el.addEventListener("click", function () {
        var type = el.getAttribute("data-ru-toast") || "info";
        var map = {
          success: ["Licença ativada", "O VST3 já pode ser aberto no seu DAW.", "success"],
          error: ["Falha ao salvar", "Verifique o espaço em disco e tente de novo.", "error"],
          info: ["Tema atualizado", "A preferência ficou salva neste navegador.", "info"],
          loading: ["Processando", "Isso leva só um instante.", "loading"]
        };
        var m = map[type] || map.info;
        toast({ title: el.getAttribute("data-title") || m[0], description: el.getAttribute("data-desc") || m[1], type: m[2], duration: 3600 });
      });
    });
  }

  var BTXUI = {
    init: init,
    toast: toast,
    spring: springTo,
    reduce: function () { return REDUCE; },
    theme: function (name) {
      document.documentElement.setAttribute("data-theme", name);
      try {
        var raw = localStorage.getItem("btx.settings");
        var s = raw ? JSON.parse(raw) : {};
        s.theme = name;
        localStorage.setItem("btx.settings", JSON.stringify(s));
      } catch (e) {}
      $$("[data-theme-option]").forEach(function (b) {
        b.setAttribute("aria-pressed", b.getAttribute("data-theme-option") === name ? "true" : "false");
      });
      window.dispatchEvent(new CustomEvent("ru:theme", { detail: { name: name } }));
    }
  };
  window.BTXUI = BTXUI;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { init(document); });
  } else init(document);

  // SPA views re-render: re-init new subtrees
  var mo = new MutationObserver(function (records) {
    records.forEach(function (r) {
      Array.prototype.forEach.call(r.addedNodes, function (n) {
        if (n.nodeType === 1) init(n);
      });
    });
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });
})();
