/* ==========================================================
   ui-core — componentes compartilhados leves
   bell, faq, progress, toast
   Usado por index.html e opcoda.html; sistema.html usa rare.js.
   Sem dependências.
   ========================================================== */
(function () {
  "use strict";

  var reduceMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
  var REDUCE = reduceMQ.matches;
  if (reduceMQ.addEventListener) reduceMQ.addEventListener("change", function (e) { REDUCE = e.matches; });

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var uid = (function () { var i = 0; return function (p) { return (p || "ui") + "-" + (++i); }; })();

  function iconSVG(kind) {
    var icons = {
      check: '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4.5 10.5l3.4 3.4 7.6-8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      close: '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
      error: '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 6v5M10 14.2v.1" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>',
      info: '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="1.6"/><path d="M10 9v4M10 6.6v.1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
      spinner: '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 3a7 7 0 107 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
    };
    return icons[kind] || "";
  }

  /* ---------- toast ---------- */

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
      closed = true;
      clearTimeout(timer);
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

  /* ---------- notification bell ---------- */

  function initBell(root) {
    var btn = $(".ru-bell__btn", root);
    var badge = $(".ru-bell__badge", root);
    var panel = $(".ru-bell__panel", root);
    if (!btn || !panel) return;
    var unread = badge ? parseInt(badge.textContent, 10) || 0 : 0;
    btn.setAttribute("aria-expanded", "false");

    function close() {
      root.classList.remove("is-open");
      btn.setAttribute("aria-expanded", "false");
    }
    function ring() {
      root.classList.remove("is-ringing");
      void root.offsetWidth;
      root.classList.add("is-ringing");
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
      if (b.__uiPing) return;
      b.__uiPing = true;
      b.addEventListener("click", function () {
        if (badge) {
          unread += 1;
          badge.textContent = unread > 9 ? "9+" : String(unread);
          badge.hidden = false;
          badge.classList.remove("is-pop");
          void badge.offsetWidth;
          badge.classList.add("is-pop");
        }
        ring();
      });
    });

    if (badge) {
      badge.hidden = unread === 0;
      var clear = $(".ru-bell__clear", root);
      if (clear) clear.addEventListener("click", function () {
        unread = 0;
        badge.hidden = true;
      });
    }
    return close;
  }

  /* ---------- faq ---------- */

  function initFAQ(root) {
    var items = $$(".ru-faq__item", root);
    var single = root.getAttribute("data-single") !== "false";
    items.forEach(function (item) {
      var q = $(".ru-faq__q", item);
      var wrap = $(".ru-faq__a-wrap", item);
      if (!q || !wrap) return;
      q.setAttribute("aria-expanded", item.classList.contains("is-open") ? "true" : "false");
      wrap.id = wrap.id || uid("ui-faq");
      q.setAttribute("aria-controls", wrap.id);
      wrap.setAttribute("role", "region");
      q.addEventListener("click", function () {
        var open = !item.classList.contains("is-open");
        if (single) items.forEach(function (x) {
          x.classList.remove("is-open");
          var qq = $(".ru-faq__q", x);
          if (qq) qq.setAttribute("aria-expanded", "false");
        });
        item.classList.toggle("is-open", open);
        q.setAttribute("aria-expanded", open ? "true" : "false");
      });
    });
  }

  /* ---------- scroll progress ---------- */

  function initProgress(root) {
    var btn = $(".ru-progress__btn", root);
    var pctEl = $(".ru-progress__pct", root);
    var ring = $(".ru-progress__ring", root);
    var items = $$(".ru-progress__item", root);
    if (!btn) return;

    var CIRC = 2 * Math.PI * 17;
    if (ring) ring.style.strokeDasharray = CIRC;

    function targetEl() {
      var id = root.getAttribute("data-scroll-target");
      return id ? $(id) : null;
    }
    function metrics() {
      var el = targetEl();
      var top, height, view;
      if (el && el !== document.documentElement) {
        top = el.scrollTop;
        height = el.scrollHeight - el.clientHeight;
        view = el.clientHeight;
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
          if (t.getBoundingClientRect().top - 120 <= 0) best = i;
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
      if (!root.contains(e.target)) {
        root.classList.remove("is-open");
        btn.setAttribute("aria-expanded", "false");
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") root.classList.remove("is-open");
    });
    items.forEach(function (it) {
      it.addEventListener("click", function () {
        var t = $(it.getAttribute("data-target"));
        if (t) t.scrollIntoView({ behavior: REDUCE ? "auto" : "smooth", block: "start" });
        root.classList.remove("is-open");
      });
    });

    var scrollEl = targetEl();
    var scrollHost = scrollEl && scrollEl !== document.documentElement ? scrollEl : window;
    scrollHost.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();

    return function () {
      scrollHost.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }

  /* ---------- boot ---------- */

  var INIT = {
    bell: initBell,
    faq: initFAQ,
    progress: initProgress
  };

  function init(root) {
    root = root || document;
    $$("[data-ru]", root).forEach(function (el) {
      if (el.__uiInit) return;
      var fn = INIT[el.getAttribute("data-ru")];
      if (!fn) return;
      try {
        el.__uiInit = fn(el) || true;
        el.__ruInit = el.__uiInit;
      } catch (err) {
        if (window.console && console.error) console.error("[ui-core]", el.getAttribute("data-ru"), err);
      }
    });

    $$("[data-ru-toast]", root).forEach(function (el) {
      if (el.__uiToast) return;
      el.__uiToast = true;
      el.addEventListener("click", function () {
        var type = el.getAttribute("data-ru-toast") || "info";
        var map = {
          success: ["Licença ativada", "O VST3 já pode ser aberto no seu DAW.", "success"],
          error: ["Falha ao salvar", "Verifique o espaço em disco e tente de novo.", "error"],
          info: ["Tema atualizado", "A preferência ficou salva neste navegador.", "info"],
          loading: ["Processando", "Isso leva só um instante.", "loading"]
        };
        var m = map[type] || map.info;
        toast({
          title: el.getAttribute("data-title") || m[0],
          description: el.getAttribute("data-desc") || m[1],
          type: m[2],
          duration: 3600
        });
      });
    });
  }

  function setTheme(name) {
    document.documentElement.setAttribute("data-theme", name);
    try {
      var raw = localStorage.getItem("btx.settings");
      var s = raw ? JSON.parse(raw) : {};
      s.theme = name;
      localStorage.setItem("btx.settings", JSON.stringify(s));
    } catch (e) {}
    $$("[data-theme-option], [data-theme-value]").forEach(function (b) {
      var value = b.getAttribute("data-theme-option") || b.getAttribute("data-theme-value");
      b.setAttribute("aria-pressed", value === name ? "true" : "false");
    });
    window.dispatchEvent(new CustomEvent("ru:theme", { detail: { name: name } }));
  }

  window.BTXUI = {
    init: init,
    toast: toast,
    reduce: function () { return REDUCE; },
    theme: setTheme
  };

  init(document);
})();