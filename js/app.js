/* bloodworm trax — catalog
   Columns, search, index, settings and release entries. */

(function () {
  'use strict';

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  var store = {
    get: function (key, fallback) {
      try {
        var raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) {
        return fallback;
      }
    },
    set: function (key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
    }
  };

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var narrow = window.matchMedia('(max-width: 900px)').matches;

  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function norm(value) {
    return String(value == null ? '' : value)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function fmtDate(iso) {
    if (!iso) return '';
    var parts = String(iso).split('-');
    if (parts.length !== 3) return iso;
    var day = Number(parts[2]);
    var month = MONTHS[Number(parts[1]) - 1] || parts[1];
    return (day < 10 ? '0' + day : day) + ' ' + month + ' ' + parts[0];
  }

  function plural(n, one, many) {
    return n + ' ' + (n === 1 ? one : many);
  }

  /* ---------------------------------------------------------
     tree
     --------------------------------------------------------- */

  var trackTotal = BTX.releases.reduce(function (sum, r) { return sum + r.tracks.length; }, 0);

  function releaseNode(r) {
    return {
      key: r.id,
      type: 'release',
      title: r.title,
      meta: r.cat + ' · ' + r.type + ' · ' + r.artist,
      date: r.date,
      year: r.year,
      release: r,
      children: []
    };
  }

  var years = (function () {
    var map = {};
    BTX.releases.forEach(function (r) {
      if (!map[r.year]) map[r.year] = [];
      map[r.year].push(r);
    });
    return Object.keys(map)
      .map(Number)
      .sort(function (a, b) { return b - a; })
      .map(function (year) {
        var rels = map[year].slice().sort(function (a, b) { return b.date.localeCompare(a.date); });
        return {
          key: String(year),
          type: 'year',
          title: String(year),
          meta: plural(rels.length, 'release', 'releases'),
          date: year + '-01-01',
          year: year,
          children: rels.map(releaseNode)
        };
      });
  })();

  var artistNodes = BTX.artists.map(function (a) {
    return {
      key: a.id,
      type: 'artist',
      title: a.name,
      meta: a.meta,
      date: '',
      artist: a,
      children: []
    };
  });

  var pageNodes = BTX.pages.map(function (p) {
    return {
      key: p.id,
      type: 'page',
      title: p.title,
      meta: p.meta,
      date: '',
      page: p,
      children: []
    };
  });

  var archiveNodes = BTX.archive.map(function (a) {
    return {
      key: a.id,
      type: 'archive',
      title: a.title,
      meta: a.meta,
      date: '',
      archive: a,
      children: []
    };
  });

  var softwareNodes = (BTX.software || []).map(function (s) {
    return {
      key: s.id,
      type: 'page',
      title: s.title,
      meta: s.meta,
      date: '',
      page: s,
      children: []
    };
  });

  var linkNodes = BTX.links.map(function (l) {
    return {
      key: norm(l.label).replace(/[^a-z0-9]+/g, '-'),
      type: 'link',
      title: l.label,
      meta: l.meta,
      href: l.href,
      icon: l.icon,
      children: []
    };
  });

  var latestDate = BTX.releases.reduce(function (max, r) {
    return r.date > max ? r.date : max;
  }, '0000-00-00');

  var ROOTS = [
    {
      key: 'catalogo',
      type: 'branch',
      title: 'catalog',
      meta: plural(BTX.releases.length, 'release', 'releases') + ' · ' + trackTotal + ' tracks',
      date: latestDate,
      children: years
    },
    {
      key: 'artistas',
      type: 'branch',
      title: 'artists',
      meta: plural(BTX.artists.length, 'artist', 'artists'),
      date: '',
      children: artistNodes
    },
    {
      key: 'selo',
      type: 'branch',
      title: 'label',
      meta: 'about · profile · contact',
      date: '',
      children: pageNodes
    },
    {
      key: 'arquivo',
      type: 'branch',
      title: 'archive',
      meta: 'radio · messages · package',
      date: '',
      children: archiveNodes
    },
    {
      key: 'software',
      type: 'branch',
      title: 'software',
      meta: 'Opcoda · granular synthesizer',
      date: '',
      children: softwareNodes
    },
    {
      key: 'links',
      type: 'branch',
      title: 'links',
      meta: 'bandcamp · spotify · e-mail',
      date: '',
      children: linkNodes
    }
  ];

  function findIn(list, key) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].key === key) return list[i];
    }
    return null;
  }

  function walkPath(path) {
    var list = ROOTS;
    var nodes = [];
    for (var i = 0; i < path.length; i++) {
      var found = findIn(list, path[i]);
      if (!found) break;
      nodes.push(found);
      list = found.children || [];
    }
    return nodes;
  }

  function resolveNode(path) {
    var nodes = walkPath(path);
    return nodes.length === path.length ? nodes[nodes.length - 1] : null;
  }

  function isLeaf(node) {
    return !node.children || node.children.length === 0;
  }

  function nodeMatchesFilter(node) {
    if (state.filter === 'all') return true;
    if (state.filter === 'releases') return node.type === 'release';
    if (state.filter === 'artists') return node.type === 'artist';
    if (state.filter === 'pages') return node.type === 'page' || node.type === 'archive';
    if (state.filter === 'links') return node.type === 'link';
    return true;
  }

  function visibleNodes(list) {
    if (state.filter === 'all') return list.slice();
    return list.filter(function (node) {
      if (node.type === 'branch' || node.type === 'year') {
        return visibleNodes(node.children || []).length > 0;
      }
      return nodeMatchesFilter(node);
    });
  }

  function sortedNodes(list) {
    var arr = visibleNodes(list);
    if (state.sort === 'az') {
      arr.sort(function (a, b) { return a.title.localeCompare(b.title, 'en'); });
    } else if (state.sort === 'recent') {
      arr.sort(function (a, b) { return String(b.date || '').localeCompare(String(a.date || '')); });
    }
    return arr;
  }

  function flatten() {
    var out = [];
    (function walk(list, path) {
      list.forEach(function (node) {
        var next = path.concat(node.key);
        out.push({ node: node, path: next });
        if (node.children && node.children.length) walk(node.children, next);
      });
    })(ROOTS, []);
    return out;
  }

  function searchText(node) {
    var bits = [node.title, node.meta, node.key];
    if (node.release) {
      var r = node.release;
      bits.push(r.cat, r.artist, r.type, r.year, r.about, r.note);
      if (r.tracks) bits.push(r.tracks.map(function (t) { return t.title; }).join(' '));
      if (r.lyrics) bits.push(r.lyrics);
      if (r.credits) bits.push(r.credits.map(function (c) { return c.label + ' ' + c.value; }).join(' '));
    }
    if (node.artist) bits.push(node.artist.meta, node.artist.body);
    if (node.page) bits.push(node.page.meta, node.page.body);
    if (node.archive) bits.push(node.archive.meta, node.archive.body);
    return norm(bits.filter(Boolean).join(' '));
  }

  /* ---------------------------------------------------------
     state
     --------------------------------------------------------- */

  var saved = store.get('btx.settings', null) || {};

  var MODES = { map: true, index: true };
  var LEGACY_MODES = { mapa: 'map', indice: 'index' };
  var THEMES = { mono: true, claro: true, vinho: true };
  var LEGACY_THEMES = {
    agar: 'claro',
    noturno: 'mono',
    sangue: 'vinho',
    light: 'claro',
    wine: 'vinho'
  };

  var savedMode = LEGACY_MODES[saved.mode] || saved.mode;
  var savedTheme = LEGACY_THEMES[saved.theme] || saved.theme;

  var state = {
    mode: MODES[savedMode] ? savedMode : (narrow ? 'index' : 'map'),
    path: [],
    search: '',
    filter: 'all',
    sort: 'natural',
    overlay: null
  };

  var settings = {
    theme: THEMES[savedTheme] ? savedTheme : 'mono',
    grain: typeof saved.grain === 'number' ? saved.grain : 3,
    mode: state.mode
  };

  /* ---------------------------------------------------------
     icons
     --------------------------------------------------------- */

  function icon(name) {
    var paths = {
      bandcamp: '<path d="M2.2 5.5 5.4 2.6h8.4L10.6 13H2.2z"/><path d="M5.1 5.5 6.7 3.6h5.1L9.9 11H4.7z"/>',
      spotify: '<circle cx="8" cy="8" r="6.3"/><path d="M4.7 6.4c2.1-.6 4.5-.2 6.3.9M5.1 8.4c1.7-.4 3.5-.1 5 .8M5.6 10.2c1.3-.3 2.6 0 3.7.6"/>',
      instagram: '<rect x="2.4" y="2.4" width="11.2" height="11.2" rx="3.1"/><circle cx="8" cy="8" r="2.5"/><circle cx="11.5" cy="4.5" r=".75" fill="currentColor" stroke="none"/>',
      soundcloud: '<path d="M2 10.6h9.5a2.2 2.2 0 0 0 0-4.4 3 3 0 0 0-5.6-1.2A2.4 2.4 0 0 0 3.6 7 2 2 0 0 0 2 9z"/>',
      mail: '<rect x="2" y="3.5" width="12" height="9" rx="1.4"/><path d="m2.6 4.4 5.4 4.2 5.4-4.2"/>',
      nina: '<path d="M8 2v12M2.8 5l10.4 6M13.2 5 2.8 11"/>',
      link: '<path d="M6.2 9.8 9.8 6.2M7 4h1.6a3 3 0 0 1 0 6H7M9 12H7.4a3 3 0 0 1 0-6H9"/>',
      play: '<path d="M6 4.3 11.5 8 6 11.7z" fill="currentColor" stroke="none"/>'
    };
    return '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true">' + (paths[name] || paths.link) + '</svg>';
  }

  /* ---------------------------------------------------------
     render — columns
     --------------------------------------------------------- */

  var stageEl = $('#stage');
  var indexEl = $('#indexView');
  var searchEl = $('#searchView');
  var heroEl = $('#hero');
  var stageWrapEl = $('#stageWrap');

  function nodeHTML(node, path, idx, level) {
    var current = state.path[level] === node.key;
    var branch = !isLeaf(node);

    if (node.type === 'link') {
      return '<a class="node' + (current ? ' current' : '') + '" style="--i:' + idx + '" ' +
        'href="' + esc(node.href) + '" target="_blank" rel="noopener">' +
        '<span class="node-num">' + (idx + 1) + '</span>' +
        '<span class="node-main">' +
          '<span class="node-title">' + esc(node.title) + '</span>' +
          '<span class="node-meta">' + esc(node.meta || '') + '</span>' +
        '</span>' +
        '<span class="node-icon" aria-hidden="true">' + icon(node.icon || 'link') + '</span>' +
      '</a>';
    }

    return '<button type="button" class="node' + (current ? ' current' : '') + '" style="--i:' + idx + '" ' +
      'data-path="' + esc(path.join('/')) + '">' +
      '<span class="node-num">' + (idx + 1) + '</span>' +
      '<span class="node-main">' +
        '<span class="node-title">' + esc(node.title) + '</span>' +
        '<span class="node-meta">' + esc(node.meta || '') + '</span>' +
      '</span>' +
      '<span class="node-icon" aria-hidden="true">' + (branch ? '→' : '↗') + '</span>' +
    '</button>';
  }

  function columnHTML(list, parent, level) {
    var nodes = sortedNodes(list);
    var title = parent ? parent.title : 'catalog';
    var meta = parent ? (parent.meta || '') : (BTX.releases.length + ' releases · ' + trackTotal + ' tracks');
    var items = nodes.length
      ? nodes.map(function (node, idx) {
          var path = state.path.slice(0, level).concat(node.key);
          return nodeHTML(node, path, idx, level);
        }).join('')
      : '<p class="node-empty">no items for this filter.</p>';

    return '<section class="col" data-level="' + level + '" aria-label="' + esc(title) + '">' +
      '<header class="col-head">' +
        '<div class="col-head-left">' +
          '<span class="col-num">' + level + '</span>' +
          '<span class="col-title">' + esc(title) + '</span>' +
        '</div>' +
        (level > 0
          ? '<button type="button" class="col-pop" data-pop aria-label="back one level">←</button>'
          : '<span class="col-meta">' + esc(meta) + '</span>') +
      '</header>' +
      '<div class="col-body">' + items + '</div>' +
    '</section>';
  }

  function detailColumnHTML(node, level) {
    return '<section class="col detail-col" data-level="' + level + '" aria-label="details for ' + esc(node.title) + '">' +
      '<header class="col-head">' +
        '<div class="col-head-left">' +
          '<span class="col-num">' + level + '</span>' +
          '<span class="col-title">details</span>' +
        '</div>' +
        '<button type="button" class="col-pop" data-pop aria-label="back one level">←</button>' +
      '</header>' +
      '<div class="detail">' + renderDetail(node) + '</div>' +
    '</section>';
  }

  function renderStage() {
    var html = '';
    var list = ROOTS;

    for (var i = 0; i < state.path.length; i++) {
      var node = findIn(list, state.path[i]);
      if (!node) break;
      if (node.children && node.children.length) {
        html += columnHTML(node.children, node, i + 1);
        list = node.children;
      } else {
        html += detailColumnHTML(node, i + 1);
        list = [];
        break;
      }
    }

    stageEl.innerHTML = html;

    requestAnimationFrame(function () {
      if (state.path.length && stageEl.scrollWidth > stageEl.clientWidth) {
        stageEl.scrollTo({ left: stageEl.scrollWidth, behavior: reduced ? 'auto' : 'smooth' });
      } else {
        stageEl.scrollLeft = 0;
      }
    });
  }

  /* ---------------------------------------------------------
     render — entries
     --------------------------------------------------------- */

  function paragraphs(text) {
    if (!text) return '';
    return String(text).split(/\n\n+/).map(function (p) {
      return '<p>' + esc(p).replace(/\n/g, '<br>') + '</p>';
    }).join('');
  }

  function specHTML(rows) {
    if (!rows || !rows.length) return '';
    return '<dl class="spec">' + rows.map(function (row) {
      return '<div><dt>' + esc(row.label) + '</dt><dd>' + esc(row.value) + '</dd></div>';
    }).join('') + '</dl>';
  }

  function linksHTML(links) {
    if (!links || !links.length) return '';
    return '<div class="detail-links">' + links.map(function (l) {
      return '<a href="' + esc(l.href) + '" target="_blank" rel="noopener">' +
        icon(l.icon || 'link') + esc(l.label) + '</a>';
    }).join('') + '</div>';
  }

  function coverHTML(src, alt) {
    return '<figure class="detail-cover">' +
      '<img src="' + esc(src) + '" alt="' + esc(alt) + '" width="1000" height="1000" decoding="async" loading="lazy">' +
    '</figure>';
  }

  function releaseDetail(r) {
    var rows = (r.credits || []).slice();

    var tracks = r.tracks.map(function (t) {
      return '<li>' +
        '<span class="tr-n">' + pad(t.n) + '</span>' +
        '<span class="tr-title">' + esc(t.title) + '</span>' +
        '<span class="tr-dur">' + esc(t.duration) + '</span>' +
      '</li>';
    }).join('');

    return '<article class="detail-release">' +
      '<div class="detail-grid">' +
        coverHTML(r.cover, 'cover for ' + r.title) +
        '<div class="detail-meta">' +
          '<p class="kicker">' + esc(r.cat) + ' · ' + esc(r.type) + ' · ' + r.year + '</p>' +
          '<h3 class="detail-title">' + esc(r.title) + '</h3>' +
          '<p class="detail-artist">' + esc(r.artist) + '</p>' +
          '<p class="detail-date">' + fmtDate(r.date) + '</p>' +
          '<div class="detail-actions">' +
            '<a class="btn-soft sm" href="' + esc(r.bandcamp) + '" target="_blank" rel="noopener">listen on bandcamp ' + icon('link') + '</a>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="detail-body">' + paragraphs(r.about) + '</div>' +
      '<div class="embed-slot">' +
        '<button type="button" class="embed-load" data-embed="' + esc(r.embed) + '">' +
          icon('play') + 'play' +
        '</button>' +
      '</div>' +
      specHTML(rows) +
      '<section class="tracks">' +
        '<h4>tracks <span>' + r.tracks.length + '</span></h4>' +
        '<ol class="tracklist">' + tracks + '</ol>' +
      '</section>' +
      (r.lyrics
        ? '<details class="lyrics"><summary>lyrics</summary><pre>' + esc(r.lyrics) + '</pre></details>'
        : '') +
      linksHTML(r.links) +
      '<p class="detail-foot">' + esc(r.cat) + ' · bloodworm trax · ' + r.year + '</p>' +
    '</article>';
  }

  function artistDetail(a) {
    var related = (a.related || []).map(function (id) {
      return BTX.releases.filter(function (r) { return r.id === id; })[0];
    }).filter(Boolean);

    var relatedHTML = related.length
      ? '<div class="related">' + related.map(function (r) {
          return '<button type="button" data-path="catalog/' + r.year + '/' + r.id + '">' +
            esc(r.cat) + ' ' + esc(r.title) + '</button>';
        }).join('') + '</div>'
      : '';

    return '<article class="detail-person">' +
      '<p class="kicker">artist</p>' +
      '<h3 class="detail-title">' + esc(a.name) + '</h3>' +
      '<p class="detail-artist">' + esc(a.meta) + '</p>' +
      '<div class="detail-body">' + paragraphs(a.body) + '</div>' +
      (related.length ? '<section class="tracks"><h4>in the catalogue <span>' + related.length + '</span></h4>' + relatedHTML + '</section>' : '') +
      linksHTML(a.links) +
      '<p class="detail-foot">bloodworm trax · artist profile</p>' +
    '</article>';
  }

  function pageDetail(p) {
    return '<article class="detail-page">' +
      '<p class="kicker">' + esc(p.meta || 'label') + '</p>' +
      '<h3 class="detail-title">' + esc(p.title) + '</h3>' +
      (p.body ? '<div class="detail-body">' + paragraphs(p.body) + '</div>' : '') +
      specHTML(p.spec) +
      linksHTML(p.links) +
      '<p class="detail-foot">bloodworm trax · ' + esc(p.id) + '</p>' +
    '</article>';
  }

  function archiveDetail(a) {
    var body = a.body ? '<div class="detail-body">' + paragraphs(a.body) + '</div>' : '';
    var extra = '';

    if (a.radio) {
      extra = '<div class="audio-wrap">' +
        '<audio controls preload="none" src="' + esc(a.stream) + '"></audio>' +
      '</div>';
    } else if (a.guestbook) {
      extra = '<button type="button" class="embed-load guestbook-load" data-guestbook="' + esc(a.src) + '">' +
        'open guestbook' +
      '</button>';
    } else if (a.cover) {
      extra = '<figure class="detail-cover narrow">' +
        '<img src="' + esc(a.cover) + '" alt="content package" loading="lazy">' +
      '</figure>';
    }

    return '<article class="detail-archive">' +
      '<p class="kicker">archive</p>' +
      '<h3 class="detail-title">' + esc(a.title) + '</h3>' +
      '<p class="detail-artist">' + esc(a.meta) + '</p>' +
      body + extra +
      linksHTML(a.links) +
      '<p class="detail-foot">bloodworm trax · archive</p>' +
    '</article>';
  }

  function renderDetail(node) {
    if (!node) return '';
    if (node.type === 'release') return releaseDetail(node.release);
    if (node.type === 'artist') return artistDetail(node.artist);
    if (node.type === 'page') return pageDetail(node.page);
    if (node.type === 'archive') return archiveDetail(node.archive);
    return '<p class="detail-text">' + esc(node.title) + '</p>';
  }

  /* ---------------------------------------------------------
     render — index
     --------------------------------------------------------- */

  function releaseCard(r) {
    var path = 'catalog/' + r.year + '/' + r.id;
    return '<article class="rel-card">' +
      '<a class="rel-cover" href="#/' + path + '" data-path="' + path + '">' +
        '<img src="' + esc(r.cover) + '" alt="cover for ' + esc(r.title) + '" width="1000" height="1000" decoding="async" loading="lazy">' +
      '</a>' +
      '<div class="rel-info">' +
        '<h3 class="rel-title"><a href="#/' + path + '" data-path="' + path + '">' + esc(r.title) + '</a></h3>' +
        '<p class="rel-artist">' + esc(r.artist) + '</p>' +
        '<p class="rel-meta">' + esc(r.cat) + ' · ' + plural(r.tracks.length, 'track', 'tracks') + ' · ' + fmtDate(r.date) + '</p>' +
      '</div>' +
    '</article>';
  }

  function rowItem(opts) {
    var tag = opts.href ? 'a' : 'button';
    var attrs = opts.href
      ? 'href="' + esc(opts.href) + '" target="_blank" rel="noopener"'
      : 'type="button" data-path="' + esc(opts.path) + '"';
    var lead = opts.icon
      ? '<span class="row-icon" aria-hidden="true">' + icon(opts.icon) + '</span>'
      : '';
    var trail = opts.icon
      ? ''
      : '<span class="row-arrow" aria-hidden="true">' + (opts.href ? '↗' : '→') + '</span>';
    return '<' + tag + ' class="row-item' + (opts.icon ? ' has-icon' : '') + '" ' + attrs + '>' +
      lead +
      '<span class="row-main">' +
        '<span class="row-title">' + esc(opts.title) + '</span>' +
        '<span class="row-meta">' + esc(opts.meta || '') + '</span>' +
      '</span>' +
      trail +
    '</' + tag + '>';
  }

  function sortData(list) {
    var arr = list.slice();
    if (state.sort === 'az') {
      arr.sort(function (a, b) {
        var an = a.title || a.name || a.label || '';
        var bn = b.title || b.name || b.label || '';
        return an.localeCompare(bn, 'en');
      });
    } else if (state.sort === 'recent') {
      arr.sort(function (a, b) {
        return String(b.date || b.year || '').localeCompare(String(a.date || a.year || ''));
      });
    }
    return arr;
  }

  function renderIndex() {
    var html = '';
    var show = function (key) { return state.filter === 'all' || state.filter === key; };

    if (show('releases')) {
      var rels = sortData(BTX.releases);
      html += '<section class="index-block" id="block-releases">' +
        '<header class="block-head"><h2>releases</h2><span>' + rels.length + ' releases</span></header>' +
        '<div class="index-grid">' + rels.map(releaseCard).join('') + '</div>' +
      '</section>';
    }

    if (show('artists')) {
      var artists = sortData(BTX.artists);
      html += '<section class="index-block" id="block-artists">' +
        '<header class="block-head"><h2>artists</h2><span>' + artists.length + ' artists</span></header>' +
        '<div class="row-grid">' + artists.map(function (a) {
          return rowItem({
            title: a.name,
            meta: a.meta,
            path: 'artists/' + a.id
          });
        }).join('') + '</div>' +
      '</section>';
    }

    if (show('pages')) {
      var pages = sortData(BTX.pages.concat(BTX.archive).concat(BTX.software || []));
      html += '<section class="index-block" id="block-pages">' +
        '<header class="block-head"><h2>label &amp; archive</h2><span>' + pages.length + ' pages</span></header>' +
        '<div class="row-grid">' + pages.map(function (p) {
          var base = BTX.pages.indexOf(p) > -1 ? 'label' : 'archive';
          return rowItem({
            title: p.title,
            meta: p.meta,
            path: base + '/' + p.id
          });
        }).join('') + '</div>' +
      '</section>';
    }

    if (show('links')) {
      html += '<section class="index-block" id="block-links">' +
        '<header class="block-head"><h2>links</h2><span>' + BTX.links.length + ' links</span></header>' +
        '<div class="row-grid">' + BTX.links.map(function (l) {
          return rowItem({
            title: l.label,
            meta: l.meta,
            href: l.href,
            icon: l.icon
          });
        }).join('') + '</div>' +
      '</section>';
    }

    if (!html) {
      html = '<p class="search-empty">no items for this filter.</p>';
    }

    indexEl.innerHTML = html;
  }

  /* ---------------------------------------------------------
     render — search
     --------------------------------------------------------- */

  function renderSearch() {
    var q = norm(state.search.trim());
    var query = state.search.trim();

    if (q.length < 2) {
      searchEl.innerHTML = '';
      return;
    }

    var matches = flatten().filter(function (entry) {
      if (entry.node.children && entry.node.children.length) return false;
      if (!nodeMatchesFilter(entry.node)) return false;
      return searchText(entry.node).indexOf(q) > -1;
    }).slice(0, 60);

    var groups = {};
    matches.forEach(function (m) {
      var root = m.path[0] || 'catalog';
      if (!groups[root]) groups[root] = [];
      groups[root].push(m);
    });

    var body = '';
    Object.keys(groups).forEach(function (root) {
      var rootNode = findIn(ROOTS, root);
      body += '<section class="search-group">' +
        '<h3>' + esc(rootNode ? rootNode.title : root) + '</h3>' +
        groups[root].map(function (entry) {
          var node = entry.node;
          var path = entry.path.join('/');
          if (node.type === 'link') {
            return '<a class="search-result" href="' + esc(node.href) + '" target="_blank" rel="noopener">' +
              '<span class="sr-icon" aria-hidden="true">' + icon(node.icon || 'link') + '</span>' +
              '<span class="sr-title">' + esc(node.title) + '</span>' +
            '</a>';
          }
          return '<button type="button" class="search-result" data-path="' + esc(path) + '">' +
            '<span class="sr-title">' + esc(node.title) + '</span>' +
            '<span class="sr-arrow" aria-hidden="true">→</span>' +
          '</button>';
        }).join('') +
      '</section>';
    });

    searchEl.innerHTML = '<div class="search-panel">' +
        '<div class="search-head">' +
          '<h2>search</h2>' +
          '<p>' + (matches.length ? plural(matches.length, 'result', 'results') : 'no results') + ' for “' + esc(query) + '”</p>' +
        '</div>' +
        (body || '<p class="search-empty">No catalog item matches this search.</p>') +
      '</div>';
  }

  /* ---------------------------------------------------------
     general render
     --------------------------------------------------------- */

  function currentOverlayOpen() {
    return !$('#detailOverlay').hidden;
  }

  function trapFocus(container, e) {
    if (!container) return;
    var items = $$('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])', container)
      .filter(function (el) { return el.offsetParent !== null; });
    if (!items.length) return;

    var first = items[0];
    var last = items[items.length - 1];

    if (!container.contains(document.activeElement)) {
      e.preventDefault();
      first.focus();
      return;
    }
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function render() {
    var searching = state.search.trim().length >= 2;

    document.body.dataset.mode = state.mode;
    heroEl.classList.toggle('is-section', state.mode === 'map' && !searching && state.path.length > 0);
    heroEl.hidden = searching || state.mode === 'index';
    stageWrapEl.hidden = searching || state.mode === 'index' || (state.mode === 'map' && state.path.length === 0);
    indexEl.hidden = searching || state.mode !== 'index';
    searchEl.hidden = !searching;

    if (searching) {
      renderSearch();
    } else if (state.mode === 'index') {
      renderIndex();
    } else if (state.path.length) {
      renderStage();
    } else {
      stageEl.innerHTML = '';
    }

    $$('[data-mode]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.mode === state.mode));
    });

    $$('.side-nav a').forEach(function (a) {
      a.classList.toggle('active', state.path[0] === a.dataset.key);
    });

    var node = resolveNode(state.path);
    document.title = state.mode === 'index'
      ? 'index — bloodworm trax'
      : (node ? node.title + ' — bloodworm trax' : 'catalog — bloodworm trax');

    document.dispatchEvent(new CustomEvent('btx:path', { detail: { path: state.path } }));

    if (!currentOverlayOpen()) {
      document.body.classList.remove('overlay-open');
    }
  }

  /* ---------------------------------------------------------
     navigation / hash
     --------------------------------------------------------- */

  function setHash(path, mode) {
    var hash;
    if (mode === 'index') hash = '#/index';
    else hash = path.length ? '#/' + path.join('/') : '#/';
    history.pushState(null, '', hash);
  }

  function navigate(path) {
    path = (path || []).filter(Boolean);
    var node = resolveNode(path);

    if (node && node.type === 'link') {
      window.open(node.href, '_blank', 'noopener');
      return;
    }

    state.path = path;
    state.search = '';
    var input = $('#searchInput');
    if (input) input.value = '';
    var clear = $('#searchClear');
    if (clear) clear.hidden = true;

    if (state.mode === 'index') {
      history.pushState(null, '', path.length ? '#/' + path.join('/') : '#/index');
      if (node && isLeaf(node)) openOverlay(node);
      else closeOverlay();
    } else {
      setHash(path, 'map');
      closeOverlay();
    }

    render();

    if (state.mode === 'map') {
      requestAnimationFrame(function () {
        if (path.length) scrollToStage();
        else window.scrollTo({ top: 0, behavior: 'auto' });
      });
    } else if (path.length) {
      requestAnimationFrame(function () { scrollToBlock(path[0]); });
    }
  }

  function scrollToStage() {
    if (!stageWrapEl || stageWrapEl.hidden) return;
    var topbar = document.querySelector('.topbar');
    var offset = (topbar ? topbar.offsetHeight : 58) + 12;
    var y = stageWrapEl.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: Math.max(0, y), behavior: reduced ? 'auto' : 'smooth' });
  }

  var BLOCKS = {
    catalogo: 'releases',
    artistas: 'artists',
    selo: 'pages',
    arquivo: 'pages',
    links: 'links'
  };

  function scrollToBlock(key) {
    var el = document.getElementById('block-' + (BLOCKS[key] || ''));
    if (!el) return;
    var topbar = document.querySelector('.topbar');
    var offset = (topbar ? topbar.offsetHeight : 58) + 14;
    var y = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: Math.max(0, y), behavior: reduced ? 'auto' : 'smooth' });
  }

  function setMode(mode) {
    if (mode !== 'map' && mode !== 'index') return;
    state.mode = mode;
    settings.mode = mode;
    persist();
    closeOverlay();
    if (mode === 'index') {
      state.path = [];
      setHash([], 'index');
    } else {
      setHash(state.path, 'map');
    }
    syncSettings();
    render();
    requestAnimationFrame(function () {
      window.scrollTo({ top: 0, behavior: 'auto' });
    });
  }

  var ROUTE_ALIASES = {
    catalog: 'catalogo',
    artists: 'artistas',
    label: 'selo',
    archive: 'arquivo'
  };
  var MODE_ALIASES = { indice: 'index', mapa: 'map' };

  function applyHash() {
    var raw = '';
    try {
      raw = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
    } catch (e) {
      raw = location.hash.replace(/^#\/?/, '');
    }

    var modeAlias = MODE_ALIASES[raw];
    if (modeAlias || raw === 'index' || raw === 'map') {
      state.mode = modeAlias || raw;
      state.path = [];
      closeOverlay();
      render();
      requestAnimationFrame(function () {
        window.scrollTo({ top: 0, behavior: 'auto' });
      });
      return;
    }

    if (!raw) {
      state.path = [];
      closeOverlay();
      render();
      return;
    }

    var parts = raw.split('/').filter(Boolean);
    if (parts.length) parts[0] = ROUTE_ALIASES[parts[0]] || parts[0];
    var node = resolveNode(parts);

    if (!node) {
      state.path = [];
      closeOverlay();
      render();
      return;
    }

    state.path = parts;

    if (state.mode === 'index' && isLeaf(node)) {
      openOverlay(node);
    } else {
      closeOverlay();
    }

    render();

    if (state.mode === 'map') {
      requestAnimationFrame(function () {
        if (parts.length) scrollToStage();
      });
    } else if (isLeaf(node) && currentOverlayOpen()) {
      return;
    } else if (parts.length) {
      requestAnimationFrame(function () { scrollToBlock(parts[0]); });
    }
  }

  /* ---------------------------------------------------------
     entry overlay
     --------------------------------------------------------- */

  var overlayEl = $('#detailOverlay');
  var overlayBody = $('#detailOverlayBody');
  var overlayReturn = null;

  function openOverlay(node) {
    if (!node) return;
    overlayReturn = document.activeElement;
    state.overlay = node;
    overlayBody.innerHTML = renderDetail(node);
    overlayEl.hidden = false;
    document.body.classList.add('overlay-open');
    var close = $('#detailClose');
    if (close) close.focus({ preventScroll: true });
  }

  function closeOverlay(updateHash) {
    state.overlay = null;
    if (!overlayEl.hidden) {
      overlayEl.hidden = true;
      overlayBody.innerHTML = '';
      document.body.classList.remove('overlay-open');
    }
    if (updateHash && state.mode === 'index') {
      state.path = [];
      history.replaceState(null, '', '#/index');
      render();
    }

    var target = overlayReturn;
    var targetPath = target && target.dataset ? target.dataset.path : '';
    overlayReturn = null;
    if (targetPath) {
      var replacement = document.querySelector('[data-path="' + targetPath + '"]');
      if (replacement) {
        replacement.focus({ preventScroll: true });
        return;
      }
    }
    if (target && document.contains(target)) target.focus({ preventScroll: true });
  }

  /* ---------------------------------------------------------
     player / guestbook / copy
     --------------------------------------------------------- */

  function loadEmbed(btn) {
    var src = btn.dataset.embed;
    if (!src) return;
    var slot = btn.closest('.embed-slot');
    if (!slot) return;
    var height = src.indexOf('album=') > -1 ? 350 : 120;
    slot.innerHTML = '<iframe src="' + esc(src) + '" width="100%" height="' + height + '" ' +
      'style="border:0;width:100%;height:' + height + 'px" loading="lazy" ' +
      'title="Bandcamp player" seamless></iframe>';
  }

  function loadGuestbook(btn) {
    var src = btn.dataset.guestbook;
    if (!src) return;
    var slot = btn.parentNode;
    var frame = document.createElement('iframe');
    frame.className = 'guestbook-frame';
    frame.src = src;
    frame.loading = 'lazy';
    frame.title = 'guestbook';
    if (slot) slot.replaceChild(frame, btn);
  }

  function copyLink(btn) {
    var url = location.href;
    var done = function () {
      var old = btn.textContent;
      btn.textContent = 'copied';
      setTimeout(function () { btn.textContent = old; }, 1400);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(done).catch(function () {});
    } else {
      var input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      try { document.execCommand('copy'); done(); } catch (e) {}
      document.body.removeChild(input);
    }
  }

  /* ---------------------------------------------------------
     settings
     --------------------------------------------------------- */

  var scrim = $('#scrim');

  function persist() {
    store.set('btx.settings', { theme: settings.theme, grain: settings.grain, mode: settings.mode });
  }

  function applySettings() {
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.style.setProperty('--grain-opacity', (settings.grain / 100).toFixed(3));
    var meta = document.querySelector('meta[name="theme-color"]');
    var colors = { mono: '#0a0a0a', claro: '#f2f2ef', vinho: '#12090a' };
    if (meta && colors[settings.theme]) meta.setAttribute('content', colors[settings.theme]);
  }

  function syncSettings() {
    var meta = document.querySelector('meta[name="theme-color"]');
    var colors = { mono: '#0a0a0a', claro: '#f2f2ef', vinho: '#12090a' };
    if (meta && colors[settings.theme]) meta.setAttribute('content', colors[settings.theme]);
    var btn = $('#themeBtn');
    if (btn) btn.setAttribute('aria-label', 'theme: ' + settings.theme);
  }

  function closeNav() {
    document.body.classList.remove('nav-open');
    var t = $('#navToggle');
    if (t) t.setAttribute('aria-expanded', 'false');
    scrim.hidden = true;
  }

  /* ---------------------------------------------------------
     eventos
     --------------------------------------------------------- */

  function wireEvents() {
    var app = $('#app');
    var navToggle = $('#navToggle');
    var searchInput = $('#searchInput');
    var searchClear = $('#searchClear');

    document.addEventListener('click', function (e) {
      var pop = e.target.closest('[data-pop]');
      if (pop) {
        navigate(state.path.slice(0, -1));
        return;
      }

      var embed = e.target.closest('[data-embed]');
      if (embed) {
        loadEmbed(embed);
        return;
      }

      var guest = e.target.closest('[data-guestbook]');
      if (guest) {
        loadGuestbook(guest);
        return;
      }

      var copy = e.target.closest('[data-copy]');
      if (copy) {
        copyLink(copy);
        return;
      }

      var canvasNode = e.target.closest('[data-overlay]');
      if (canvasNode) {
        e.preventDefault();
        var overlayNode = resolveNode((canvasNode.dataset.overlay || '').split('/').filter(Boolean));
        if (overlayNode) openOverlay(overlayNode);
        return;
      }

      var pathEl = e.target.closest('[data-path]');
      if (pathEl) {
        if (e.target.closest('a[target="_blank"]')) return;
        e.preventDefault();
        navigate((pathEl.dataset.path || '').split('/').filter(Boolean));
      }
    });

    $$('[data-mode]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setMode(btn.dataset.mode);
      });
    });



    if (navToggle) {
      navToggle.addEventListener('click', function () {
        var open = !document.body.classList.contains('nav-open');
        document.body.classList.toggle('nav-open', open);
        navToggle.setAttribute('aria-expanded', String(open));
        scrim.hidden = !open;
      });
    }

    $$('.sidebar a').forEach(function (a) {
      a.addEventListener('click', function () {
        closeNav();
      });
    });

    if (scrim) {
      scrim.addEventListener('click', function () {
        closeNav();
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', function () {
        state.search = searchInput.value;
        if (searchClear) searchClear.hidden = state.search.length === 0;
        render();
      });
      searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          searchInput.value = '';
          state.search = '';
          if (searchClear) searchClear.hidden = true;
          render();
          searchInput.blur();
        }
      });
    }

    if (searchClear) {
      searchClear.addEventListener('click', function () {
        if (searchInput) searchInput.value = '';
        state.search = '';
        searchClear.hidden = true;
        render();
        if (searchInput) searchInput.focus();
      });
    }

    if (overlayEl) {
      overlayEl.addEventListener('click', function (e) {
        if (e.target.closest('[data-detail-close]')) {
          closeOverlay(true);
        }
      });
      var closeBtn = $('#detailClose');
      if (closeBtn) {
        closeBtn.addEventListener('click', function () {
          closeOverlay(true);
        });
      }
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Tab') {
        if (currentOverlayOpen()) {
          trapFocus(document.querySelector('.detail-overlay-panel'), e);
          return;
        }
      }

      if (e.key !== 'Escape') return;
      if (currentOverlayOpen()) {
        closeOverlay(true);
        return;
      }
      if (document.body.classList.contains('nav-open')) {
        closeNav();
      }
    });

    var themeBtn = $('#themeBtn');
    if (themeBtn) {
      var themes = ['mono', 'claro', 'vinho'];
      themeBtn.addEventListener('click', function () {
        var i = themes.indexOf(settings.theme);
        settings.theme = themes[(i + 1) % themes.length];
        applySettings();
        syncSettings();
        persist();
        themeBtn.setAttribute('aria-label', 'theme: ' + settings.theme);
      });
    }

    window.addEventListener('hashchange', applyHash);

    if (app) {
      app.addEventListener('click', function (e) {
        var brand = e.target.closest('.brand');
        if (brand) {
          e.preventDefault();
          var collapsed = document.body.classList.toggle('nav-collapsed');
          brand.setAttribute('aria-expanded', String(!collapsed));
          brand.setAttribute('aria-label', collapsed ? 'expand sidebar' : 'collapse sidebar');
        }
      });
    }
  }

  /* ---------------------------------------------------------
     boot
     --------------------------------------------------------- */

  applySettings();
  syncSettings();
  wireEvents();
  applyHash();
  requestAnimationFrame(function () {
    if (state.mode === 'map' && state.path.length) scrollToStage();
    else window.scrollTo({ top: 0, behavior: 'auto' });
  });

})();
