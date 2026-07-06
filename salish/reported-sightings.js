/* Reported sightings (iNaturalist) for the Salish Sea orca map.
 *
 * Real, recent citizen-science observations dropped on top of the modeled
 * forage web as ground truth. iNaturalist's public API needs no key and sends
 * Access-Control-Allow-Origin:*, so the published page fetches it directly.
 *
 * LIVE: while the layer is on and the tab is visible, it auto-refreshes every
 * 5 minutes, detects observations that are new since the last poll and pulses
 * them, and shows how fresh the data is ("updated 2m ago · next 3m"). It pauses
 * when the tab is hidden and catches up on return, so a backgrounded tab never
 * polls. Whale reports arrive on a scale of minutes, not seconds; 5 min is live
 * enough and keeps the request rate trivial.
 *
 * BANDWIDTH GUARD (the important part): a self-imposed rate limiter keeps this
 * page a polite API citizen and un-blockable. Ceiling is 20 requests per rolling
 * 60s (well under iNat's ~60/min and the 30/min target), with a hard 2.5s min
 * gap, a response cache tuned just under the refresh cadence, in-flight
 * de-duplication, and 429 handling that honours Retry-After, backs off
 * exponentially, and trips a circuit breaker after repeated failures. In
 * practice the page makes ~1 request per active species per 5 minutes; the
 * limiter only matters if something misbehaves. Its live counter is shown in the
 * panel so the guard is auditable, not just asserted.
 *
 * Exposes window.ReportedSightings.mount({ map, config }).
 */
(function (global) {
  'use strict';

  // ---- rate limiter ------------------------------------------------------
  function createLimiter(opts) {
    opts = opts || {};
    var maxPerWindow = opts.maxPerWindow || 20;   // ceiling per rolling window (< 30/min target)
    var windowMs = opts.windowMs || 60000;
    var minGapMs = opts.minGapMs || 2500;         // >= 2.5s between calls => <= 24/min anyway
    var cacheTtl = opts.cacheTtl || 600000;       // 10 min
    var maxFailures = opts.maxFailures || 3;
    var breakerMs = opts.breakerMs || 300000;     // 5 min cool-down once tripped

    var scheduled = [];    // ascending fire times already reserved (incl. future)
    var inflight = {};     // url -> Promise (de-dupe identical concurrent calls)
    var mem = {};          // url -> { t, data }
    var failures = 0;
    var blockedUntil = 0;

    function now() { return Date.now(); }          // browser context: Date is fine

    function stats() {
      var t = now();
      var inWindow = 0;
      for (var i = 0; i < scheduled.length; i++) if (scheduled[i] <= t && scheduled[i] > t - windowMs) inWindow++;
      return {
        inWindow: inWindow,
        max: maxPerWindow,
        blocked: t < blockedUntil,
        blockedForMs: Math.max(0, blockedUntil - t)
      };
    }

    // Reserve the next legal fire time SYNCHRONOUSLY, so a burst of concurrent
    // calls serialises instead of all reading an empty window at once. Enforces
    // the min gap, the rolling-window ceiling, and any active cool-down.
    function reserve() {
      var t = now();
      var byGap = scheduled.length ? scheduled[scheduled.length - 1] + minGapMs : t;
      var byWindow = scheduled.length >= maxPerWindow
        ? scheduled[scheduled.length - maxPerWindow] + windowMs : 0;
      var fire = Math.max(t, byGap, byWindow, blockedUntil);
      scheduled.push(fire);
      while (scheduled.length > maxPerWindow * 3) scheduled.shift();
      return fire;
    }

    function getCache(url) {
      if (mem[url] && now() - mem[url].t < cacheTtl) return mem[url].data;
      try {
        var raw = localStorage.getItem('inat:' + url);
        if (raw) { var o = JSON.parse(raw); if (now() - o.t < cacheTtl) { mem[url] = o; return o.data; } }
      } catch (e) { /* private mode / quota: fall through */ }
      return null;
    }
    function setCache(url, data) {
      var rec = { t: now(), data: data };
      mem[url] = rec;
      try { localStorage.setItem('inat:' + url, JSON.stringify(rec)); } catch (e) { /* ignore */ }
    }

    // Resolves { data, cached }. Rejects on HTTP/network/breaker error.
    function fetchJson(url) {
      var cached = getCache(url);
      if (cached) return Promise.resolve({ data: cached, cached: true });
      if (inflight[url]) return inflight[url];

      var fire = reserve();               // reserve a legal slot synchronously
      var delay = Math.max(0, fire - now());
      var p = new Promise(function (resolve, reject) {
        setTimeout(function () {
          global.fetch(url, { headers: { Accept: 'application/json' } })
            .then(function (r) {
              if (r.status === 429) {
                failures++;
                var ra = parseInt(r.headers.get('Retry-After') || '0', 10);
                blockedUntil = now() + (ra > 0 ? ra * 1000 : Math.min(breakerMs, 5000 * Math.pow(2, failures)));
                throw new Error('rate-limited by iNaturalist (429)');
              }
              if (!r.ok) throw new Error('HTTP ' + r.status);
              return r.json();
            })
            .then(function (j) { failures = 0; setCache(url, j); resolve({ data: j, cached: false }); })
            .catch(function (e) {
              if (failures >= maxFailures) blockedUntil = Math.max(blockedUntil, now() + breakerMs);
              reject(e);
            })
            .then(function () { delete inflight[url]; });
        }, delay);
      });
      inflight[url] = p;
      return p;
    }

    return { fetchJson: fetchJson, stats: stats, reserve: reserve };
  }

  // ---- sources -----------------------------------------------------------
  // Acartia is the primary, whale-specific feed: the Salish Sea data cooperative
  // that aggregates Orca Network, Ocean Wise WhaleReport, the Whale Museum and
  // more. Public, keyless, CORS-open. iNaturalist stays as a secondary source
  // (broader species, photo-rich) selectable in the panel.
  var ACARTIA_API = 'https://acartia.io/api/v1/sightings/current';  // all sightings, past 7 days
  var ACARTIA_MAX = 60;      // cap markers drawn from Acartia
  var INAT_API = 'https://api.inaturalist.org/v1/observations';
  var INAT_SPECIES = [
    { key: 'orca',   label: 'Orca',            taxon: 41521, color: '#e0a24d', ecotype: true },
    { key: 'seal',   label: 'Harbor seal',     taxon: 41708, color: '#a58f63' },
    { key: 'steller', label: 'Steller sea lion', taxon: 41755, color: '#b5653a' },
    { key: 'chinook', label: 'Chinook salmon', taxon: 54191, color: '#c85a2c' }
  ];
  var PER_PAGE = 10;         // iNaturalist "last 10" per the brief
  var REFRESH_MS = 300000;   // auto-refresh cadence while on + tab visible (5 min)

  // Orca ecotype from the observed iNaturalist taxon name.
  function orcaTint(name) {
    if (!name) return '#e0a24d';
    if (name.indexOf('rectipinnus') >= 0) return '#8a5cb8';  // Bigg's / transient (purple, matches model)
    if (name.indexOf('ater') >= 0) return '#3f8f86';         // Southern Resident (teal, matches model)
    return '#e0a24d';                                        // ecotype not recorded (amber)
  }
  function orcaEcotypeLabel(name) {
    if (!name) return '';
    if (name.indexOf('rectipinnus') >= 0) return "Bigg's / transient";
    if (name.indexOf('ater') >= 0) return 'Southern Resident';
    return 'ecotype not recorded';
  }
  // Acartia reports a plain species string ("Orca", "Humpback", ...); colour by it.
  function acartiaColor(type) {
    var t = (type || '').toLowerCase();
    if (t.indexOf('orca') >= 0 || t.indexOf('killer') >= 0) return '#e0a24d';
    if (t.indexOf('humpback') >= 0) return '#3f6f9d';
    if (t.indexOf('gray') >= 0 || t.indexOf('grey') >= 0) return '#8a8f7a';
    if (t.indexOf('minke') >= 0) return '#6f9f8a';
    if (t.indexOf('fin') >= 0) return '#7a6f9d';
    if (t.indexOf('porpoise') >= 0 || t.indexOf('dolphin') >= 0) return '#5aa0b5';
    return '#b5653a';
  }

  // ---- state -------------------------------------------------------------
  var _map, _cfg, limiter;
  var layer;                 // L.layerGroup of markers
  var activeSource = 'acartia';   // 'acartia' (primary) | 'inaturalist'
  var active = 'orca';            // iNaturalist active species
  var on = false;
  var statusEl, latestEl, noteEl, creditEl, speciesRow;
  var lastLoadedAt = 0;      // ms of the last successful load (0 = never / off)
  var seenByKey = {};        // source(+species) -> { id: true } shown last poll

  function bbox() {
    return (_cfg && _cfg.context_bounds) || { north: 50.3, south: 46.9, east: -122.0, west: -126.5 };
  }
  function inWater(lat, lng) {
    var b = bbox();
    return lat >= b.south && lat <= b.north && lng >= b.west && lng <= b.east;
  }
  function inatUrl(sp) {
    var b = bbox();
    return INAT_API + '?taxon_id=' + sp.taxon +
      '&nelat=' + b.north + '&nelng=' + b.east + '&swlat=' + b.south + '&swlng=' + b.west +
      '&order_by=observed_on&order=desc&per_page=' + PER_PAGE + '&geo=true';
  }
  function activeINat() { return INAT_SPECIES.filter(function (s) { return s.key === active; })[0]; }
  function sourceKey() { return activeSource === 'inaturalist' ? 'inat:' + active : 'acartia'; }

  // ---- normalize each source into one marker shape -----------------------
  // { id, lat, lng, color, eco, title, dateStr, ts, photo, link, linkLabel,
  //   byline, obscured }
  function photoSmall(o) {
    var p = (o.photos || [])[0];
    return p && p.url ? p.url.replace('square', 'small') : null;
  }
  function mapINat(o) {
    var g = o.geojson;
    if (!g || !g.coordinates) return null;
    var sp = activeINat();
    var name = (o.taxon || {}).name;
    var date = o.observed_on || (o.time_observed_at || '').slice(0, 10) || '?';
    return {
      id: o.id, lat: g.coordinates[1], lng: g.coordinates[0],
      color: sp.ecotype ? orcaTint(name) : sp.color,
      eco: sp.ecotype ? orcaEcotypeLabel(name) : '',
      title: ((o.taxon || {}).preferred_common_name) || sp.label,
      dateStr: date, ts: Date.parse(o.time_observed_at || o.observed_on || 0) || 0,
      photo: photoSmall(o),
      link: o.uri || ('https://www.inaturalist.org/observations/' + (o.id || '')),
      linkLabel: 'Open on iNaturalist',
      byline: 'by ' + (((o.user || {}).login) || 'observer'),
      obscured: !!o.obscured
    };
  }
  function mapAcartia(o) {
    var lat = parseFloat(o.latitude), lng = parseFloat(o.longitude);
    if (isNaN(lat) || isNaN(lng) || !inWater(lat, lng)) return null;
    var count = parseInt(o.no_sighted, 10);
    var trusted = o.trusted === true || o.trusted === 'true';
    return {
      id: o.ssemmi_id || o.entry_id, lat: lat, lng: lng,
      color: acartiaColor(o.type),
      eco: '',
      title: (o.type || 'Marine mammal') + (count > 1 ? ' ×' + count : ''),
      dateStr: (o.created || '').slice(0, 10) || '?',
      ts: Date.parse((o.created || '').replace(' ', 'T')) || 0,
      photo: o.photo_url || null,
      link: 'https://acartia.io',
      linkLabel: 'Acartia',
      byline: (o.data_source_name || 'reporter') + (trusted ? ' · verified' : ''),
      obscured: false
    };
  }

  // ---- render (source-agnostic) -----------------------------------------
  function render(list, newIds) {
    newIds = newIds || {};
    if (layer) { _map.removeLayer(layer); layer = null; }
    layer = global.L.layerGroup();
    var n = list.length;

    list.forEach(function (o, i) {
      var recency = n > 1 ? 1 - (i / (n - 1)) : 1;          // newest = 1
      var fill = 0.45 + 0.5 * recency;                       // fade older reports
      var isNew = !!(o.id != null && newIds[o.id]);          // arrived since last poll

      if (o.obscured) {
        // iNaturalist randomises location ~0.2deg for sensitive taxa: draw an
        // uncertainty ring, never a precise dot.
        global.L.circle([o.lat, o.lng], {
          radius: 9000, color: o.color, weight: 1, opacity: 0.55,
          dashArray: '4,4', fillColor: o.color, fillOpacity: 0.06, interactive: false
        }).addTo(layer);
      }
      var m = global.L.circleMarker([o.lat, o.lng], {
        radius: o.obscured ? 4.5 : 6, fillColor: o.color, color: '#f7f4ee',
        weight: 1.5, fillOpacity: fill, opacity: 0.9,
        className: isNew ? 'sighting-new' : ''             // CSS pulse on fresh reports
      });
      m.bindPopup(
        '<div style="font:13px/1.4 \'DM Sans\',sans-serif;max-width:210px">' +
        '<a href="' + o.link + '" target="_blank" rel="noopener" style="color:inherit;text-decoration:none">' +
        '<strong>' + o.title + '</strong></a>' +
        (o.eco ? '<br><span style="color:' + o.color + '">' + o.eco + '</span>' : '') +
        '<br>' + o.dateStr + ' &middot; #' + (i + 1) + ' most recent' +
        (o.obscured ? '<br><small style="opacity:.7">location approximate (privacy)</small>' : '') +
        (o.photo ? '<br><a href="' + o.link + '" target="_blank" rel="noopener">' +
          '<img src="' + o.photo + '" style="width:100%;border-radius:6px;margin-top:5px" alt="sighting photo"></a>' : '') +
        '<br><small style="opacity:.7">' + o.byline + '</small>' +
        '<br><a href="' + o.link + '" target="_blank" rel="noopener" ' +
        'style="display:inline-block;margin-top:6px;font-size:12px;font-weight:600;color:#2d6a8f">' +
        o.linkLabel + ' &#8599;</a></div>',
        { className: 'sighting-pop' });
      m.bindTooltip(o.dateStr + (o.eco ? ' &middot; ' + o.eco : ' &middot; ' + o.title),
        { direction: 'top', offset: [0, -4] });
      m.addTo(layer);
    });

    layer.addTo(_map);
    var latest = list.length ? list[0].dateStr : null;
    var freshCount = 0;
    for (var k in newIds) if (newIds[k]) freshCount++;
    if (latestEl) latestEl.textContent = list.length
      ? (freshCount ? freshCount + ' new · ' : '') +
        list.length + ' reports · ' + latest + ' latest'
      : 'no recent reports in view';
    updateStatus();
  }

  function fmtAgo(ms) {
    var s = Math.round(ms / 1000);
    if (s < 60) return s + 's';
    return Math.round(s / 60) + 'm';
  }

  function updateStatus(msg) {
    if (!statusEl) return;
    var s = limiter.stats();
    var parts = [];
    if (on && lastLoadedAt) {
      var age = Date.now() - lastLoadedAt;
      parts.push('updated ' + fmtAgo(age) + ' ago');
      parts.push(global.document.hidden ? 'paused' : 'next ' + fmtAgo(Math.max(0, REFRESH_MS - age)));
    }
    parts.push('req ' + s.inWindow + '/' + s.max);
    if (s.blocked) parts.unshift('cooling ' + Math.ceil(s.blockedForMs / 1000) + 's');
    statusEl.textContent = (msg ? msg + ' · ' : '') + parts.join(' · ');
  }

  // Diff against what was shown last poll (per source), mark the new ones, render.
  function diffAndRender(key, list) {
    var prev = seenByKey[key];                           // undefined on first load
    var newIds = {}, seen = {};
    list.forEach(function (m) {
      if (m.id == null) return;
      seen[m.id] = true;
      if (prev && !prev[m.id]) newIds[m.id] = true;      // first load marks nothing new
    });
    seenByKey[key] = seen;
    render(list, newIds);
  }
  function loadError(key, e) {
    if (sourceKey() !== key) return;                     // source switched mid-flight
    if (latestEl) latestEl.textContent = 'could not load: ' + e.message;
    updateStatus();
  }

  function loadAcartia(isRefresh) {
    var key = 'acartia';
    updateStatus((isRefresh ? 'refreshing ' : 'loading ') + 'Acartia…');
    limiter.fetchJson(ACARTIA_API).then(function (res) {
      if (sourceKey() !== key) return;
      var list = [];
      (res.data || []).forEach(function (o) { var m = mapAcartia(o); if (m) list.push(m); });
      list.sort(function (a, b) { return b.ts - a.ts; });   // newest first
      list = list.slice(0, ACARTIA_MAX);
      diffAndRender(key, list);
      lastLoadedAt = Date.now();
      if (res.cached) updateStatus('cached');
    }).catch(function (e) { loadError(key, e); });
  }

  function loadINat(isRefresh) {
    var sp = activeINat(), key = 'inat:' + sp.key;
    updateStatus((isRefresh ? 'refreshing ' : 'loading ') + sp.label + '…');
    limiter.fetchJson(inatUrl(sp)).then(function (res) {
      if (sourceKey() !== key) return;                   // species/source switched mid-flight
      var list = [];
      ((res.data && res.data.results) || []).forEach(function (o) { var m = mapINat(o); if (m) list.push(m); });
      diffAndRender(key, list);
      lastLoadedAt = Date.now();
      if (res.cached) updateStatus('cached');
    }).catch(function (e) { loadError(key, e); });
  }

  function load(isRefresh) {
    if (activeSource === 'acartia') loadAcartia(isRefresh);
    else loadINat(isRefresh);
  }

  // ---- controls ----------------------------------------------------------
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  // Per-source panel copy (note + credit line).
  function refreshCopy() {
    if (noteEl) noteEl.innerHTML = activeSource === 'acartia'
      ? 'Live whale sightings from the <b>Acartia</b> cooperative (Orca Network, Ocean Wise, ' +
        'the Whale Museum and more), newest first. Auto-refreshes every 5 min; new reports pulse.'
      : 'Recent reports from <b>iNaturalist</b>, newest first. Auto-refreshes every 5 min; ' +
        'new reports pulse. Dashed ring = privacy-obscured location.';
    if (creditEl) creditEl.innerHTML = activeSource === 'acartia'
      ? 'Sightings: <a href="https://acartia.io" target="_blank" rel="noopener">Acartia</a> data cooperative'
      : 'Sightings: <a href="https://www.inaturalist.org" target="_blank" rel="noopener">iNaturalist</a> (CC, per observer)';
  }

  function buildControls() {
    var host = document.querySelector('.forage-panel');   // dock inside the forage panel if present
    var box = el('div', 'reported-box');
    box.appendChild(el('div', 'reported-head', 'Reported sightings <small>live</small>'));
    noteEl = el('div', 'reported-note');
    box.appendChild(noteEl);

    var row = el('label', 'reported-toggle');
    row.innerHTML = '<input type="checkbox"><span>Show recent sightings on the map</span>';
    row.querySelector('input').addEventListener('change', function (e) {
      on = e.target.checked;
      sourceRow.style.display = on ? 'flex' : 'none';
      speciesRow.style.display = (on && activeSource === 'inaturalist') ? 'flex' : 'none';
      statusRow.style.display = on ? 'block' : 'none';
      if (on) load();
      else {
        lastLoadedAt = 0;
        if (layer) { _map.removeLayer(layer); layer = null; }
        if (latestEl) latestEl.textContent = '';
        updateStatus();
      }
    });
    box.appendChild(row);

    // Source selector: Acartia (primary) | iNaturalist.
    var sourceRow = el('div', 'reported-species reported-sources');
    sourceRow.style.display = 'none';
    [{ k: 'acartia', label: 'Acartia' }, { k: 'inaturalist', label: 'iNaturalist' }].forEach(function (s) {
      var b = el('button', 'reported-sp-btn' + (s.k === activeSource ? ' on' : ''), s.label);
      b.addEventListener('click', function () {
        if (s.k === activeSource) return;
        activeSource = s.k;
        sourceRow.querySelectorAll('button').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        speciesRow.style.display = (on && activeSource === 'inaturalist') ? 'flex' : 'none';
        refreshCopy();
        if (on) load();
      });
      sourceRow.appendChild(b);
    });
    box.appendChild(sourceRow);

    // iNaturalist species picker (only visible when that source is active).
    speciesRow = el('div', 'reported-species');
    speciesRow.style.display = 'none';
    INAT_SPECIES.forEach(function (s) {
      var b = el('button', 'reported-sp-btn' + (s.key === active ? ' on' : ''),
        '<span class="reported-dot" style="background:' + s.color + '"></span>' + s.label);
      b.addEventListener('click', function () {
        if (s.key === active) return;
        active = s.key;
        speciesRow.querySelectorAll('button').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        if (on) load();
      });
      speciesRow.appendChild(b);
    });
    box.appendChild(speciesRow);

    var statusRow = el('div', 'reported-status');
    statusRow.style.display = 'none';
    latestEl = el('div', 'reported-latest', '');
    statusEl = el('div', 'reported-rate', '');
    statusRow.appendChild(latestEl);
    statusRow.appendChild(statusEl);
    box.appendChild(statusRow);

    creditEl = el('div', 'reported-credit');
    box.appendChild(creditEl);
    refreshCopy();

    if (host) host.appendChild(box); else { box.classList.add('reported-standalone'); document.body.appendChild(box); }
  }

  function injectCss() {
    if (document.getElementById('reported-css')) return;
    var s = el('style'); s.id = 'reported-css';
    s.textContent = [
      '.reported-box{margin-top:10px;padding-top:10px;border-top:1px solid rgba(10,37,64,0.12);}',
      ':root[data-theme="dark"] .reported-box{border-top-color:rgba(94,162,230,0.18);}',
      '.reported-standalone{position:absolute;top:64px;right:12px;z-index:1200;width:236px;',
      'background:rgba(247,244,238,0.96);border:1px solid rgba(10,37,64,0.15);border-radius:12px;',
      'padding:12px 13px;font-family:"DM Sans",sans-serif;color:#0a2540;box-shadow:0 6px 24px rgba(10,37,64,0.16);}',
      '.reported-head{font-family:"Fraunces",Georgia,serif;font-size:14px;font-weight:600;}',
      '.reported-head small{font-family:"JetBrains Mono",monospace;font-size:9px;font-weight:500;text-transform:uppercase;',
      'letter-spacing:.08em;color:#c8553a;margin-left:5px;}',
      '.reported-note{font-size:10.5px;line-height:1.35;opacity:.62;margin:3px 0 8px;}',
      '.reported-toggle{display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;}',
      '.reported-toggle input{cursor:pointer;}',
      '.reported-species{display:flex;flex-wrap:wrap;gap:4px;margin-top:8px;}',
      '.reported-sp-btn{display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:2px 7px;border-radius:20px;',
      'border:1px solid rgba(10,37,64,0.2);background:transparent;color:inherit;cursor:pointer;font-family:inherit;}',
      '.reported-sp-btn.on{background:#0a2540;color:#f7f4ee;border-color:#0a2540;}',
      ':root[data-theme="dark"] .reported-sp-btn.on{background:#5ea2e6;color:#0a1a24;border-color:#5ea2e6;}',
      '.reported-dot{width:8px;height:8px;border-radius:50%;display:inline-block;border:1px solid rgba(255,255,255,0.6);}',
      '.reported-status{margin-top:8px;font-family:"JetBrains Mono",monospace;font-size:10px;line-height:1.5;opacity:.75;}',
      '.reported-rate{opacity:.6;}',
      '.reported-credit{margin-top:8px;font-size:9.5px;opacity:.55;}',
      '.reported-credit a{color:inherit;}',
      '.sighting-pop .leaflet-popup-content{margin:10px 12px;}',
      '.reported-head small::before{content:"";display:inline-block;width:6px;height:6px;border-radius:50%;',
      'background:#c8553a;margin-right:4px;vertical-align:middle;animation:reportedblink 2s ease-in-out infinite;}',
      '@keyframes reportedblink{0%,100%{opacity:1;}50%{opacity:.25;}}',
      '.sighting-new{animation:sightingpulse 1.4s ease-out 3;}',
      '@keyframes sightingpulse{0%{stroke-width:1.5;}45%{stroke-width:6;}100%{stroke-width:1.5;}}'
    ].join('');
    document.head.appendChild(s);
  }

  // ---- mount -------------------------------------------------------------
  function mount(opts) {
    _map = opts.map;
    _cfg = opts.config;
    if (!_map || !global.L) return;
    // Cache TTL sits just under the refresh cadence so a scheduled poll always
    // re-fetches (cache just expired) while manual re-clicks inside the window
    // stay cached. Ceiling of 20 req / rolling 60s keeps us well under 30/min.
    limiter = createLimiter(opts.limiter || { cacheTtl: REFRESH_MS - 30000 });
    injectCss();
    buildControls();
    // One 1s heartbeat: drive the auto-refresh when due (on, visible, past the
    // cadence) and keep the freshness + cool-down counters ticking.
    setInterval(function () {
      if (!on) return;
      if (!global.document.hidden && lastLoadedAt &&
          Date.now() - lastLoadedAt >= REFRESH_MS) {
        load(true);
      }
      updateStatus();
    }, 1000);
    // Snap back to fresh data the moment a backgrounded tab returns.
    global.document.addEventListener('visibilitychange', function () {
      if (on && !global.document.hidden && lastLoadedAt &&
          Date.now() - lastLoadedAt >= REFRESH_MS) {
        load(true);
      }
    });
  }

  global.ReportedSightings = { mount: mount, _createLimiter: createLimiter };
})(window);
