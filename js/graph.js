/* bloodworm trax — mapa do catálogo
   Um único canva: seções, artistas e lançamentos conectados por crédito. */

(function () {
  'use strict';

  var host = document.getElementById('graphHost');
  if (!host || typeof BTX === 'undefined') return;

  var EDGES = [
    { from: 'dj-aurous', to: 'btx001-lagerhaus-i' },
    { from: 'dj-cybershot', to: 'btx001-lagerhaus-i' },
    { from: 'kiddo', to: 'btx002-simpatia' },
    { from: 'kiddo', to: 'btx003-antologia', shared: true },
    { from: 'matesu', to: 'btx003-antologia' },
    { from: 'matesu', to: 'btx002-simpatia', shared: true },
    { from: 'rafao', to: 'btx003-antologia' },
    { from: 'huricane-pablo', to: 'btx003-antologia' }
  ];

  var SECTIONS = [
    { key: 'catalogo', title: 'trabalhos', count: BTX.releases.length },
    { key: 'artistas', title: 'artistas', count: BTX.artists.length },
    { key: 'selo', title: 'selo', count: BTX.pages.length },
    { key: 'arquivo', title: 'arquivo', count: BTX.archive.length },
    { key: 'links', title: 'links', count: BTX.links.length }
  ];

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var railMarkup = SECTIONS.map(function (section) {
    return '<a class="crail" href="#/' + section.key + '" data-path="' + section.key + '">' +
      '<span class="crail-name">' + esc(section.title) + '</span>' +
      '<span class="crail-count">' + section.count + '</span>' +
    '</a>';
  }).join('') +
    '<a class="crail crail-index" href="#/indice"><span class="crail-name">índice</span><span class="crail-count">→</span></a>';

  var artistMarkup = BTX.artists.map(function (artist, index) {
    return '<a class="gnode gnode-artist" href="#/artistas/' + esc(artist.id) + '" ' +
      'data-id="' + esc(artist.id) + '" data-overlay="artistas/' + esc(artist.id) + '" ' +
      'style="--i:' + index + '" aria-label="' + esc(artist.name) + ', ' + esc(artist.meta) + '">' +
      '<span class="gnode-name">' + esc(artist.name) + '</span>' +
    '</a>';
  }).join('');

  var releaseMarkup = BTX.releases.map(function (r, i) {
    return '<a class="gnode gnode-release" href="#/catalogo/' + r.year + '/' + esc(r.id) + '" ' +
      'data-id="' + esc(r.id) + '" data-overlay="catalogo/' + r.year + '/' + esc(r.id) + '" ' +
      'style="--i:' + (BTX.artists.length + i) + '" ' +
      'aria-label="' + esc(r.cat) + ' ' + esc(r.title) + ', ' + esc(r.artist) + ', ' + r.year + '">' +
      '<span class="gnode-frame"><img src="' + esc(r.thumb) + '" alt="" loading="lazy"></span>' +
      '<span class="gnode-label">' +
        '<b>' + esc(r.title) + '</b>' +
        '<span>' + esc(r.artist) + ' · ' + r.year + '</span>' +
      '</span>' +
    '</a>';
  }).join('');

  host.innerHTML =
    '<nav class="canvas-rail" aria-label="seções do acervo">' + railMarkup + '</nav>' +
    '<div class="graph-scene">' +
      '<svg class="graph-edges" aria-hidden="true" focusable="false">' +
        '<defs>' +
          '<filter id="edgeGlow" x="-60%" y="-60%" width="220%" height="220%" color-interpolation-filters="sRGB">' +
            '<feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="blur"/>' +
            '<feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>' +
          '</filter>' +
        '</defs>' +
        '<g class="edge-layer"></g>' +
      '</svg>' +
      '<div class="graph-nodes">' + artistMarkup + releaseMarkup + '</div>' +
    '</div>' +
    '<p class="canvas-key" aria-hidden="true">' +
      '<span class="key-group"><i class="key key-solid"></i>crédito</span>' +
      '<span class="key-group"><i class="key key-dash"></i>participação</span>' +
    '</p>';

  var svg = host.querySelector('.graph-edges');
  var layer = host.querySelector('.edge-layer');
  var nodes = Array.prototype.slice.call(host.querySelectorAll('.gnode'));
  var byId = {};
  nodes.forEach(function (node) { byId[node.dataset.id] = node; });

  var edges = EDGES.map(function (spec, index) {
    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('class', 'edge' + (spec.shared ? ' is-shared' : ''));
    path.setAttribute('pathLength', '1');
    path.style.transitionDelay = (280 + index * 55) + 'ms';
    layer.appendChild(path);
    return { from: spec.from, to: spec.to, el: path };
  });

  function box(node, part) {
    var el = part ? node.querySelector(part) : node;
    if (!el) return null;
    return {
      x: node.offsetLeft - node.offsetWidth / 2 + el.offsetLeft,
      y: node.offsetTop - node.offsetHeight / 2 + el.offsetTop,
      w: el.offsetWidth,
      h: el.offsetHeight
    };
  }

  function draw() {
    if (!host.offsetWidth) return;

    edges.forEach(function (edge) {
      var a = byId[edge.from];
      var b = byId[edge.to];
      if (!a || !b) return;

      var boxA = box(a, '.gnode-name');
      var boxB = box(b, '.gnode-frame');
      if (!boxA || !boxB) return;

      var p1 = { x: boxA.x + boxA.w / 2, y: boxA.y + boxA.h };
      var p2 = { x: boxB.x + boxB.w / 2, y: boxB.y };

      edge.el.setAttribute('d',
        'M' + p1.x.toFixed(1) + ' ' + p1.y.toFixed(1) +
        ' L' + p2.x.toFixed(1) + ' ' + p2.y.toFixed(1));
      edge.el.classList.add('is-drawn');
    });
  }

  var frame = 0;
  function scheduleDraw() {
    if (frame) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(function () {
      frame = 0;
      draw();
    });
  }

  /* ---------- realce ---------- */

  function highlight(id) {
    var keep = {};
    keep[id] = true;

    edges.forEach(function (edge) {
      var on = edge.from === id || edge.to === id;
      edge.el.classList.toggle('is-on', on);
      edge.el.classList.toggle('is-off', !on);
      if (on) {
        keep[edge.from] = true;
        keep[edge.to] = true;
      }
    });

    nodes.forEach(function (node) {
      var linked = !!keep[node.dataset.id];
      node.classList.toggle('is-linked', linked);
      node.classList.toggle('is-dim', !linked);
    });
  }

  function clearHighlight() {
    edges.forEach(function (edge) { edge.el.classList.remove('is-on', 'is-off'); });
    nodes.forEach(function (node) {
      node.classList.remove('is-linked', 'is-dim');
    });
  }

  nodes.forEach(function (node) {
    var id = node.dataset.id;
    node.addEventListener('pointerenter', function () { highlight(id); });
    node.addEventListener('pointerleave', clearHighlight);
    node.addEventListener('focus', function () { highlight(id); });
    node.addEventListener('blur', clearHighlight);
  });

  function setActive(path) {
    var id = '';
    var section = (path && path[0]) || '';
    if (path && path[0] === 'catalogo') id = path[2] || '';
    if (path && path[0] === 'artistas') id = path[1] || '';
    nodes.forEach(function (node) {
      node.classList.toggle('is-active', node.dataset.id === id);
    });
    Array.prototype.forEach.call(host.querySelectorAll('.crail[data-path]'), function (link) {
      link.classList.toggle('is-active', link.dataset.path === section);
    });
  }

  document.addEventListener('btx:path', function (e) {
    var path = (e.detail && e.detail.path) || [];
    setActive(path);
    scheduleDraw();
  });

  window.addEventListener('resize', scheduleDraw);

  if ('ResizeObserver' in window) {
    new ResizeObserver(scheduleDraw).observe(host);
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(scheduleDraw).catch(function () {});
  }

  scheduleDraw();

  window.BTXGraph = { draw: scheduleDraw, setActive: setActive };
})();
