/* Salish Sea forage-web model.
 *
 * Deterministic, self-contained (no network). Turns the open-water hex grid into
 * the map's thesis: WHY the orcas are where they are. Every forage species is a
 * modeled seasonal field = seasonal calendar (week -> weight) x spatial prior
 * (per-hex weight from named runs, spawn grounds, haul-outs). The two orca
 * ecotypes are DERIVED from their prey field, so the coupling is literal:
 * Southern Residents track Chinook, Bigg's track harbor seal.
 *
 * All layers are explicitly synthetic: a calendar x prior, parameterized from
 * run-timing / spawn / haul-out knowledge, not a live feed. Reported sightings
 * (Acartia) are a separate, live track and are not modeled here.
 *
 * Exposes window.ForageModel.mount({ map, cells, config, isLight }).
 */
(function (global) {
  'use strict';

  var WEEKS = 52;

  // ---- geometry ----------------------------------------------------------
  function haversineKm(aLat, aLng, bLat, bLng) {
    var R = 6371;
    var dLat = (bLat - aLat) * Math.PI / 180;
    var dLng = (bLng - aLng) * Math.PI / 180;
    var la = aLat * Math.PI / 180, lb = bLat * Math.PI / 180;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(la) * Math.cos(lb) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  // Gaussian mixture over named hotspots, capped at 1. Each hotspot is
  // { lat, lng, km (1-sigma radius), w (peak weight) }.
  function priorAt(lat, lng, hotspots) {
    var v = 0;
    for (var i = 0; i < hotspots.length; i++) {
      var h = hotspots[i];
      var d = haversineKm(lat, lng, h.lat, h.lng);
      v += h.w * Math.exp(-(d * d) / (2 * h.km * h.km));
    }
    return Math.min(1, v);
  }

  // ---- seasonal calendar -------------------------------------------------
  // Circular Gaussian bump over the 52-week year, on a baseline floor.
  function bump(center, width, baseline) {
    return function (week) {
      var d = Math.abs(week - center);
      d = Math.min(d, WEEKS - d);               // wrap around the year
      var g = Math.exp(-(d * d) / (2 * width * width));
      return baseline + (1 - baseline) * g;
    };
  }
  // Two-peak calendar (e.g. Chinook spring + summer runs).
  function bump2(c1, w1, c2, w2, baseline) {
    var b1 = bump(c1, w1, 0), b2 = bump(c2, w2, 0);
    return function (week) {
      return baseline + (1 - baseline) * Math.max(b1(week), b2(week));
    };
  }

  // ---- named geography (lower Salish Sea) --------------------------------
  // Chinook migrate mid-channel: Juan de Fuca -> Haro/Rosario -> Fraser/rivers.
  var CHINOOK = [
    { lat: 48.25, lng: -124.20, km: 16, w: 0.7 },  // outer Juan de Fuca approach
    { lat: 48.28, lng: -123.55, km: 16, w: 0.8 },  // eastern Juan de Fuca
    { lat: 48.50, lng: -123.15, km: 14, w: 1.0 },  // Haro Strait (SRKW core)
    { lat: 48.52, lng: -122.78, km: 12, w: 0.7 },  // Rosario Strait
    { lat: 49.05, lng: -123.25, km: 16, w: 1.0 },  // Fraser River approach
    { lat: 48.32, lng: -122.50, km: 10, w: 0.6 },  // Skagit Bay river mouth
    { lat: 48.12, lng: -122.72, km: 10, w: 0.5 }   // Admiralty Inlet
  ];
  // Sockeye: overwhelmingly Fraser-bound, through Haro/Rosario in summer.
  var SOCKEYE = [
    { lat: 49.05, lng: -123.25, km: 18, w: 1.0 },  // Fraser approach
    { lat: 48.55, lng: -123.10, km: 14, w: 0.8 },  // Haro Strait
    { lat: 48.55, lng: -122.80, km: 12, w: 0.7 }   // Rosario Strait
  ];
  var COHO = [
    { lat: 48.30, lng: -123.40, km: 18, w: 0.7 },  // Juan de Fuca
    { lat: 48.45, lng: -122.90, km: 16, w: 0.7 },  // San Juans / Rosario
    { lat: 48.20, lng: -122.60, km: 12, w: 0.6 }   // Whidbey / south sound
  ];
  var CHUM = [
    { lat: 48.32, lng: -122.50, km: 12, w: 0.9 },  // Skagit
    { lat: 48.12, lng: -122.70, km: 12, w: 0.7 },  // Admiralty / Hood approach
    { lat: 48.60, lng: -122.85, km: 10, w: 0.5 }   // Bellingham approach
  ];
  var PINK = [
    { lat: 48.45, lng: -122.85, km: 16, w: 0.8 },  // Rosario / San Juans
    { lat: 48.30, lng: -122.55, km: 12, w: 0.7 }   // Skagit
  ];
  // Herring spawn on nearshore eelgrass/kelp: tight, coast-hugging.
  var HERRING = [
    { lat: 48.86, lng: -122.76, km: 7, w: 1.0 },   // Cherry Point (major stock)
    { lat: 48.60, lng: -123.05, km: 8, w: 0.7 },   // San Juan / Gulf shorelines
    { lat: 48.40, lng: -122.60, km: 7, w: 0.6 },   // Skagit / Fidalgo
    { lat: 48.10, lng: -122.75, km: 6, w: 0.5 }    // Port Susan / Holmes Harbor
  ];
  // Harbor-seal haul-outs: reefs, spits, small islands. Nearshore, year-round.
  var SEAL = [
    { lat: 48.62, lng: -123.00, km: 8, w: 1.0 },   // San Juan Islands reefs
    { lat: 48.75, lng: -122.92, km: 7, w: 0.7 },   // Sucia / Patos
    { lat: 48.32, lng: -122.84, km: 7, w: 0.8 },   // Smith / Minor Island
    { lat: 48.28, lng: -123.55, km: 8, w: 0.6 },   // Juan de Fuca haul-outs
    { lat: 48.13, lng: -122.70, km: 7, w: 0.7 }    // Admiralty / Whidbey
  ];
  // Geographic boosts used to shape the two orca ecotypes from their prey.
  var SANJUAN_CORE = [                             // SRKW summer core
    { lat: 48.50, lng: -123.15, km: 14, w: 1.0 },  // Haro Strait
    { lat: 48.58, lng: -123.05, km: 12, w: 0.8 }   // west-side San Juan Island
  ];
  var INLAND = [                                   // Bigg's inland-waters range
    { lat: 48.55, lng: -122.85, km: 18, w: 1.0 },  // Rosario / San Juans
    { lat: 48.20, lng: -122.65, km: 16, w: 0.9 },  // Whidbey / Admiralty / south
    { lat: 48.70, lng: -122.75, km: 12, w: 0.7 }   // Bellingham / Georgia approach
  ];
  // Baleen whales, modeled as seasonal presence fields (not derived from a prey
  // layer). Priors reflect where each is actually seen in the Salish Sea.
  // Humpback: the big comeback story. Feed spring-fall widely, concentrating at
  // the west entrance, Boundary Pass / San Juans, and the Strait of Georgia.
  var HUMPBACK = [
    { lat: 48.30, lng: -124.60, km: 20, w: 0.9 },  // Swiftsure / outer Juan de Fuca
    { lat: 48.28, lng: -123.70, km: 18, w: 0.8 },  // eastern Juan de Fuca
    { lat: 48.72, lng: -123.05, km: 16, w: 1.0 },  // Boundary Pass / San Juans
    { lat: 49.20, lng: -123.70, km: 20, w: 0.8 }   // Strait of Georgia
  ];
  // Gray whale: the North Puget Sound "Sounders" detour off the migration to
  // feed on ghost shrimp Mar-May; plus the outer-coast migration corridor.
  var GRAY = [
    { lat: 48.05, lng: -122.35, km: 12, w: 1.0 },  // Saratoga Passage / Possession Sound
    { lat: 48.18, lng: -122.55, km: 10, w: 0.8 },  // Whidbey / Camano flats
    { lat: 48.28, lng: -124.40, km: 18, w: 0.5 }   // outer Juan de Fuca migration
  ];
  // Minke: summer regulars over the tide-rip banks around the San Juans.
  var MINKE = [
    { lat: 48.40, lng: -123.05, km: 12, w: 1.0 },  // Salmon Bank / San Juan banks
    { lat: 48.34, lng: -123.20, km: 10, w: 0.8 },  // Hein Bank
    { lat: 48.30, lng: -123.55, km: 12, w: 0.6 }   // eastern Juan de Fuca
  ];

  // week 0 = first week of January. Peaks below reflect Salish run/spawn timing.
  var SPECIES = {
    salmon: {   // Chinook is the primary; toggles are other species' calendars
      label: 'Salmon (Chinook)', grid: 'open_water', kind: 'model',
      ramp: ['#f6e2b3', '#c85a2c', '#8a2f1e'],
      hotspots: CHINOOK, season: bump2(16, 4, 30, 6, 0.18)  // spring + big summer run
    },
    herring: {
      label: 'Pacific herring', grid: 'nearshore', kind: 'model',
      ramp: ['#dbe7ee', '#6f9fc0', '#2f6f9d'],
      hotspots: HERRING, season: bump(10, 5, 0.12)          // late-winter/spring spawn
    },
    seal: {
      label: 'Harbor seal', grid: 'nearshore', kind: 'model',
      ramp: ['#e7ddca', '#a58f63', '#6b5636'],
      hotspots: SEAL, season: bump(28, 8, 0.55)             // resident, pupping bump Jul-Aug
    },
    orca_srkw: {
      label: "Orca (Southern Resident)", grid: 'open_water', kind: 'derived',
      ramp: ['#bfe3d8', '#3f8f86', '#0a2540'],
      derived: true
    },
    orca_biggs: {
      label: "Orca (Bigg's / transient)", grid: 'open_water', kind: 'derived',
      ramp: ['#e6d3ef', '#8a5cb8', '#3a2258'],
      derived: true
    },
    humpback: {
      label: 'Humpback whale', grid: 'open_water', kind: 'model',
      ramp: ['#cfdbe6', '#5a7f9e', '#243b52'],
      hotspots: HUMPBACK, season: bump(38, 9, 0.05)        // spring-fall, peak late Sep
    },
    gray: {
      label: 'Gray whale', grid: 'open_water', kind: 'model',
      ramp: ['#dcdcc8', '#8a8f6f', '#494d33'],
      hotspots: GRAY, season: bump(16, 4, 0.02)            // Mar-May Sounders detour
    },
    minke: {
      label: 'Minke whale', grid: 'open_water', kind: 'model',
      ramp: ['#cfe6df', '#5aa08a', '#20493d'],
      hotspots: MINKE, season: bump(31, 9, 0.08)           // summer over the banks
    }
  };
  // Secondary Chinook-family calendars, surfaced as sub-toggles on the salmon layer.
  var SALMON_RUNS = {
    Chinook: { hotspots: CHINOOK, season: bump2(16, 4, 30, 6, 0.18) },
    Coho:    { hotspots: COHO,    season: bump(40, 4, 0.05) },   // fall
    Sockeye: { hotspots: SOCKEYE, season: bump(30, 3, 0.02) },   // Fraser summer
    Chum:    { hotspots: CHUM,    season: bump(44, 4, 0.03) },   // late fall
    Pink:    { hotspots: PINK,    season: bump(34, 3, 0.02) }    // odd-year, late summer
  };

  // ---- color -------------------------------------------------------------
  function hex2rgb(h) {
    h = h.replace('#', '');
    return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)];
  }
  function mix(a, b, t) { return Math.round(a + (b - a) * t); }
  // 3-stop ramp lo -> mid -> hi.
  function rampColor(ramp, v) {
    v = Math.max(0, Math.min(1, v));
    var lo = hex2rgb(ramp[0]), mid = hex2rgb(ramp[1]), hi = hex2rgb(ramp[2]);
    var c1, c2, t;
    if (v < 0.5) { c1 = lo; c2 = mid; t = v / 0.5; }
    else { c1 = mid; c2 = hi; t = (v - 0.5) / 0.5; }
    return 'rgb(' + mix(c1[0], c2[0], t) + ',' + mix(c1[1], c2[1], t) + ',' + mix(c1[2], c2[2], t) + ')';
  }

  // ---- week -> label -----------------------------------------------------
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MONTH_START_WK = [0, 4.3, 8.6, 13, 17.3, 21.6, 26, 30.3, 34.6, 39, 43.3, 47.6];
  function weekLabel(week) {
    var m = 0;
    for (var i = 0; i < 12; i++) if (week >= MONTH_START_WK[i]) m = i;
    var dayInto = Math.round((week - MONTH_START_WK[m]) * 7) + 1;
    return MONTHS[m] + ' ' + dayInto;
  }
  // Week index [0,51] for today's date, so the scrubber opens on now.
  function todayWeek() {
    var d = new Date();
    var doy = Math.floor((d - new Date(d.getFullYear(), 0, 1)) / 86400000);
    return Math.max(0, Math.min(51, Math.floor(doy / 7)));
  }

  // ---- state -------------------------------------------------------------
  var _map, _cells, _isLight;
  var layerGroups = {};       // key -> L.layerGroup
  var layerOn = {};           // key -> bool
  var salmonRun = 'Chinook';  // active salmon calendar
  var TODAY_WK = todayWeek(); // fixed reference for the "today" marker
  var week = TODAY_WK;        // scrubber opens on today

  // Per-cell static priors, computed once. cell._fp = { salmon, herring, seal, srkw, biggs }
  function precompute() {
    _cells.forEach(function (c) {
      var srkwSpatial = Math.min(1, priorAt(c.lat, c.lng, CHINOOK) * 0.6 +
                                    priorAt(c.lat, c.lng, SANJUAN_CORE) * 0.7);
      var biggsSpatial = Math.min(1, priorAt(c.lat, c.lng, SEAL) * 0.5 +
                                     priorAt(c.lat, c.lng, INLAND) * 0.6);
      c._fp = {
        salmon:  priorAt(c.lat, c.lng, SALMON_RUNS[salmonRun].hotspots),
        herring: priorAt(c.lat, c.lng, HERRING),
        seal:    priorAt(c.lat, c.lng, SEAL),
        srkw:    srkwSpatial,
        biggs:   biggsSpatial,
        humpback: priorAt(c.lat, c.lng, HUMPBACK),
        gray:     priorAt(c.lat, c.lng, GRAY),
        minke:    priorAt(c.lat, c.lng, MINKE)
      };
    });
  }
  function recomputeSalmonPrior() {
    _cells.forEach(function (c) {
      c._fp.salmon = priorAt(c.lat, c.lng, SALMON_RUNS[salmonRun].hotspots);
      c._fp.srkw = Math.min(1, c._fp.salmon * 0.6 + priorAt(c.lat, c.lng, SANJUAN_CORE) * 0.7);
    });
  }

  // Value in [0,1] for a cell + key at the current week.
  function valueFor(c, key) {
    var p = c._fp;
    if (key === 'salmon')  return p.salmon  * SALMON_RUNS[salmonRun].season(week);
    if (key === 'herring') return p.herring * SPECIES.herring.season(week);
    if (key === 'seal')    return p.seal    * SPECIES.seal.season(week);
    if (key === 'orca_srkw') {
      // Southern Residents track Chinook: prey field, summer-gated on the core.
      var chinook = p.salmon * SALMON_RUNS[salmonRun].season(week);
      var summer = bump(30, 7, 0.15)(week);
      return Math.pow(Math.min(1, chinook * 0.7 + p.srkw * 0.5), 0.85) * summer;
    }
    if (key === 'orca_biggs') {
      // Bigg's track harbor seal: prey field, year-round, inland-weighted.
      var sealF = p.seal * SPECIES.seal.season(week);
      return Math.pow(Math.min(1, sealF * 0.6 + p.biggs * 0.6), 0.9);
    }
    // Baleen whales: seasonal presence = spatial prior x seasonal calendar.
    if (key === 'humpback') return p.humpback * SPECIES.humpback.season(week);
    if (key === 'gray')     return p.gray     * SPECIES.gray.season(week);
    if (key === 'minke')    return p.minke    * SPECIES.minke.season(week);
    return 0;
  }

  // ---- rendering ---------------------------------------------------------
  function paintLayer(key) {
    var grp = layerGroups[key];
    if (!grp) return;
    var ramp = SPECIES[key].ramp;
    grp.eachLayer(function (poly) {
      var v = valueFor(poly._cell, key);
      // Floor: every water cell in the grid gets painted, so unmodeled / near-zero
      // cells still read as the ramp's 0.00 color instead of dropping out to bare
      // basemap. The modeled field then rises out of a continuous low-end wash.
      if (v < 0.06) {
        // Floor: paint every water cell at the ramp's 0.00 colour so the day map
        // reads as a continuous field. That colour is light (tuned for the cream
        // basemap); on the near-black night basemap it glares white as a tint
        // across every hex, so skip the floor at night and let the dark base grid
        // carry the water. Only actual modeled signal paints in dark mode.
        poly.setStyle({
          fillColor: rampColor(ramp, 0), fillOpacity: _isLight ? 0.28 : 0,
          color: rampColor(ramp, 0), weight: 0, opacity: 0
        });
        return;
      }
      poly.setStyle({
        fillColor: rampColor(ramp, v),
        fillOpacity: 0.15 + 0.75 * v,
        color: rampColor(ramp, Math.min(1, v + 0.2)),
        weight: 0.4, opacity: 0.5
      });
    });
  }
  function paintAll() { Object.keys(layerGroups).forEach(function (k) { if (layerOn[k]) paintLayer(k); }); }

  function buildLayer(key) {
    var grp = global.L.layerGroup();
    var renderer = global.L.canvas({ padding: 0.5 });
    _cells.forEach(function (c) {
      var poly = global.L.polygon(c.boundary, {
        renderer: renderer, weight: 0, opacity: 0, fillOpacity: 0, interactive: true,
        bubblingMouseEvents: false
      });
      poly._cell = c;
      poly.bindTooltip(function () {
        var v = valueFor(c, key);
        return '<strong>' + SPECIES[key].label + '</strong><br>' + weekLabel(week) +
               '<br>modeled intensity <b>' + v.toFixed(2) + '</b>' +
               '<br><small style="opacity:.7">' +
               (SPECIES[key].kind === 'derived' ? 'derived from prey' : 'seasonal model, synthetic') +
               '</small>';
      }, { sticky: true, className: 'forage-tip', direction: 'top' });
      grp.addLayer(poly);
    });
    return grp;
  }

  function setLayer(key, on) {
    layerOn[key] = on;
    if (on) {
      if (!layerGroups[key]) layerGroups[key] = buildLayer(key);
      layerGroups[key].addTo(_map);
      paintLayer(key);
    } else if (layerGroups[key]) {
      _map.removeLayer(layerGroups[key]);
    }
    updateLegend();
  }

  // ---- controls UI -------------------------------------------------------
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  function buildControls() {
    var panel = el('div', 'forage-panel');
    panel.innerHTML =
      '<div class="forage-head"><span>Forage web <small>modeled</small></span>' +
      '<button class="forage-collapse" aria-label="Collapse panel">&minus;</button></div>' +
      '<div class="forage-note">Deterministic seasonal models (calendar &times; place). ' +
      'Synthetic, not live. Orcas are derived from their prey.</div>';

    var list = el('div', 'forage-list');
    var order = ['salmon', 'herring', 'seal', 'orca_srkw', 'orca_biggs', 'humpback', 'gray', 'minke'];
    order.forEach(function (key) {
      var row = el('label', 'forage-row');
      var swatch = 'linear-gradient(90deg,' + SPECIES[key].ramp[0] + ',' + SPECIES[key].ramp[2] + ')';
      row.innerHTML =
        '<input type="checkbox" data-key="' + key + '">' +
        '<span class="forage-sw" style="background:' + swatch + '"></span>' +
        '<span class="forage-lbl">' + SPECIES[key].label +
        (SPECIES[key].kind === 'derived' ? ' <em>derived</em>' : '') + '</span>';
      row.querySelector('input').addEventListener('change', function (e) {
        setLayer(key, e.target.checked);
        if (key === 'salmon') runRow.style.display = e.target.checked ? 'flex' : 'none';
      });
      list.appendChild(row);
    });
    panel.appendChild(list);

    // Salmon run sub-selector (Chinook default; other runs re-time + re-place the layer).
    var runRow = el('div', 'forage-runs');
    runRow.style.display = 'none';
    runRow.appendChild(el('span', 'forage-runs-lbl', 'run:'));
    Object.keys(SALMON_RUNS).forEach(function (run) {
      var b = el('button', 'forage-run-btn' + (run === salmonRun ? ' on' : ''), run);
      b.addEventListener('click', function () {
        salmonRun = run;
        recomputeSalmonPrior();
        runRow.querySelectorAll('button').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        if (layerOn.salmon) paintLayer('salmon');
        if (layerOn.orca_srkw) paintLayer('orca_srkw');
      });
      runRow.appendChild(b);
    });
    panel.appendChild(runRow);

    document.body.appendChild(panel);

    // Collapse toggle: on a phone the panel would cover the map, so start
    // collapsed on narrow screens and let a tap on the header expand it.
    var collapseBtn = panel.querySelector('.forage-collapse');
    function setCollapsed(c) {
      panel.classList.toggle('collapsed', c);
      collapseBtn.innerHTML = c ? '&#43;' : '&minus;';
      collapseBtn.setAttribute('aria-label', c ? 'Expand panel' : 'Collapse panel');
    }
    collapseBtn.addEventListener('click', function (e) { e.stopPropagation(); setCollapsed(!panel.classList.contains('collapsed')); });
    panel.querySelector('.forage-head').addEventListener('click', function () {
      if (panel.classList.contains('collapsed')) setCollapsed(false);
    });
    if (window.innerWidth <= 640) setCollapsed(true);

    // Week scrubber (bottom).
    var bar = el('div', 'forage-scrub');
    var todayPct = (TODAY_WK / 51) * 100;
    bar.innerHTML =
      '<button class="forage-play" id="foragePlay" aria-label="Play">&#9654;</button>' +
      '<div class="forage-date" id="forageDate">' + weekLabel(week) + '</div>' +
      '<div class="forage-slider-wrap">' +
        '<input type="range" class="forage-slider" id="forageSlider" min="0" max="51" value="' + week + '" step="1">' +
        '<span class="forage-today" style="left:' + todayPct.toFixed(1) + '%" title="today"></span>' +
        '<span class="forage-today-lbl" style="left:' + todayPct.toFixed(1) + '%">today</span>' +
      '</div>' +
      '<button class="forage-today-btn" id="forageTodayBtn" title="Jump to today">today</button>';
    document.body.appendChild(bar);

    var slider = bar.querySelector('#forageSlider');
    var dateEl = bar.querySelector('#forageDate');
    slider.addEventListener('input', function () {
      week = parseInt(slider.value, 10);
      dateEl.textContent = weekLabel(week);
      paintAll();
      updateLegend();
    });

    bar.querySelector('#forageTodayBtn').addEventListener('click', function () {
      week = TODAY_WK;
      slider.value = week;
      dateEl.textContent = weekLabel(week);
      paintAll();
      updateLegend();
    });

    var playing = null;
    bar.querySelector('#foragePlay').addEventListener('click', function () {
      var btn = this;
      if (playing) { clearInterval(playing); playing = null; btn.innerHTML = '&#9654;'; return; }
      btn.innerHTML = '&#10073;&#10073;';
      playing = setInterval(function () {
        week = (week + 1) % 52;
        slider.value = week;
        dateEl.textContent = weekLabel(week);
        paintAll();
        updateLegend();
      }, 550);
    });

    buildLegendPanel();
  }

  // ---- legend ------------------------------------------------------------
  var legendEl;
  function buildLegendPanel() {
    legendEl = el('div', 'forage-legend');
    legendEl.style.display = 'none';
    document.body.appendChild(legendEl);
  }
  function updateLegend() {
    if (!legendEl) return;
    var on = Object.keys(layerOn).filter(function (k) { return layerOn[k]; });
    if (!on.length) { legendEl.style.display = 'none'; return; }
    legendEl.style.display = 'block';
    var html = '<div class="forage-legend-wk">' + weekLabel(week) + '</div>';
    on.forEach(function (k) {
      html += '<div class="forage-legend-row">' +
        '<span class="forage-legend-bar" style="background:linear-gradient(90deg,' +
        SPECIES[k].ramp[0] + ',' + SPECIES[k].ramp[1] + ',' + SPECIES[k].ramp[2] + ')"></span>' +
        SPECIES[k].label + '</div>';
    });
    html += '<div class="forage-legend-scale"><span>low</span><span>high</span></div>';
    legendEl.innerHTML = html;
  }

  // ---- CSS ---------------------------------------------------------------
  function injectCss() {
    if (document.getElementById('forage-css')) return;
    var s = el('style'); s.id = 'forage-css';
    s.textContent = [
      '.forage-panel{position:absolute;top:64px;right:12px;z-index:1200;width:236px;',
      'max-height:calc(100vh - 84px);overflow-y:auto;-webkit-overflow-scrolling:touch;',
      'background:rgba(247,244,238,0.96);border:1px solid rgba(10,37,64,0.15);border-radius:12px;',
      'padding:12px 13px;font-family:"DM Sans",system-ui,sans-serif;color:#0a2540;',
      'box-shadow:0 6px 24px rgba(10,37,64,0.16);backdrop-filter:blur(6px);}',
      ':root[data-theme="dark"] .forage-panel{background:rgba(14,26,36,0.94);color:#e6eef5;border-color:rgba(94,162,230,0.2);}',
      '.forage-head{display:flex;align-items:center;justify-content:space-between;gap:8px;',
      'font-family:"Fraunces",Georgia,serif;font-size:15px;font-weight:600;margin-bottom:4px;cursor:pointer;}',
      '.forage-head small{font-family:"JetBrains Mono",monospace;font-size:9px;font-weight:500;text-transform:uppercase;',
      'letter-spacing:.08em;opacity:.55;margin-left:5px;}',
      '.forage-collapse{flex:none;width:24px;height:24px;border-radius:50%;border:1px solid rgba(10,37,64,0.2);',
      'background:transparent;color:inherit;font-size:15px;line-height:1;cursor:pointer;font-family:inherit;}',
      ':root[data-theme="dark"] .forage-collapse{border-color:rgba(94,162,230,0.25);}',
      '.forage-panel.collapsed{width:auto;overflow:visible;}',
      '.forage-panel.collapsed>*:not(.forage-head){display:none !important;}',   // beat inline display:flex on run/species rows
      '.forage-panel.collapsed .forage-head{margin-bottom:0;}',
      '.forage-note{font-size:10.5px;line-height:1.35;opacity:.62;margin-bottom:10px;}',
      '.forage-row{display:flex;align-items:center;gap:8px;padding:4px 0;cursor:pointer;font-size:13px;}',
      '.forage-row input{cursor:pointer;}',
      '.forage-sw{width:26px;height:11px;border-radius:3px;flex:none;border:1px solid rgba(10,37,64,0.2);}',
      '.forage-lbl em{font-style:normal;font-size:9px;font-family:"JetBrains Mono",monospace;opacity:.5;',
      'text-transform:uppercase;letter-spacing:.05em;margin-left:3px;}',
      '.forage-runs{display:flex;flex-wrap:wrap;gap:4px;align-items:center;margin:6px 0 2px;padding-top:8px;',
      'border-top:1px solid rgba(10,37,64,0.1);}',
      '.forage-runs-lbl{font-size:10px;opacity:.55;font-family:"JetBrains Mono",monospace;margin-right:2px;}',
      '.forage-run-btn{font-size:11px;padding:2px 7px;border-radius:20px;border:1px solid rgba(10,37,64,0.2);',
      'background:transparent;color:inherit;cursor:pointer;font-family:inherit;}',
      '.forage-run-btn.on{background:#0a2540;color:#f7f4ee;border-color:#0a2540;}',
      ':root[data-theme="dark"] .forage-run-btn.on{background:#5ea2e6;color:#0a1a24;border-color:#5ea2e6;}',
      '.forage-scrub{position:absolute;left:50%;transform:translateX(-50%);bottom:18px;z-index:1200;',
      'display:flex;align-items:center;gap:12px;width:min(560px,86vw);',
      'background:rgba(247,244,238,0.96);border:1px solid rgba(10,37,64,0.15);border-radius:30px;',
      'padding:8px 18px;box-shadow:0 6px 24px rgba(10,37,64,0.18);backdrop-filter:blur(6px);}',
      ':root[data-theme="dark"] .forage-scrub{background:rgba(14,26,36,0.94);border-color:rgba(94,162,230,0.2);}',
      '.forage-play{flex:none;width:30px;height:30px;border-radius:50%;border:none;cursor:pointer;',
      'background:#0a2540;color:#f7f4ee;font-size:12px;line-height:1;}',
      ':root[data-theme="dark"] .forage-play{background:#5ea2e6;color:#0a1a24;}',
      '.forage-date{flex:none;width:66px;font-family:"JetBrains Mono",monospace;font-size:13px;font-weight:500;',
      'color:#0a2540;}:root[data-theme="dark"] .forage-date{color:#e6eef5;}',
      '.forage-slider-wrap{position:relative;flex:1;display:flex;align-items:center;}',
      '.forage-slider{width:100%;accent-color:#2d6a8f;position:relative;z-index:2;}',
      '.forage-today{position:absolute;top:-3px;bottom:-3px;width:2px;background:#c8553a;',
      'transform:translateX(-1px);pointer-events:none;z-index:1;border-radius:1px;opacity:.85;}',
      '.forage-today-lbl{position:absolute;top:-15px;transform:translateX(-50%);font-size:9px;',
      'font-family:"JetBrains Mono",monospace;color:#c8553a;pointer-events:none;letter-spacing:.03em;}',
      '.forage-today-btn{flex:none;font-size:11px;padding:3px 9px;border-radius:20px;cursor:pointer;',
      'border:1px solid #c8553a;background:transparent;color:#c8553a;font-family:inherit;font-weight:600;}',
      '.forage-today-btn:hover{background:#c8553a;color:#f7f4ee;}',
      '.forage-legend{position:absolute;left:12px;bottom:18px;z-index:1200;',
      'background:rgba(247,244,238,0.96);border:1px solid rgba(10,37,64,0.15);border-radius:10px;padding:9px 11px;',
      'font-family:"DM Sans",sans-serif;font-size:11.5px;color:#0a2540;box-shadow:0 4px 16px rgba(10,37,64,0.14);',
      'max-width:190px;}:root[data-theme="dark"] .forage-legend{background:rgba(14,26,36,0.94);color:#e6eef5;',
      'border-color:rgba(94,162,230,0.2);}',
      '.forage-legend-wk{font-family:"JetBrains Mono",monospace;font-size:10px;opacity:.6;margin-bottom:5px;}',
      '.forage-legend-row{display:flex;align-items:center;gap:6px;padding:2px 0;}',
      '.forage-legend-bar{width:34px;height:9px;border-radius:2px;flex:none;}',
      '.forage-legend-scale{display:flex;justify-content:space-between;font-size:9px;opacity:.5;margin-top:4px;',
      'font-family:"JetBrains Mono",monospace;}',
      '.forage-tip{font-family:"DM Sans",sans-serif !important;}',
      '@media(max-width:640px){',
      // Wider, taller expanded panel so labels stop wrapping and every control is
      // a comfortable tap; it is collapsible, so covering the map when open is fine.
      '.forage-panel{width:min(88vw,320px);top:52px;right:8px;max-height:calc(100vh - 150px);font-size:14px;}',
      '.forage-panel.collapsed{width:auto;}',
      '.forage-collapse{width:32px;height:32px;font-size:18px;}',       // bigger open/close tap target
      '.forage-legend{display:none !important;}',                       // beat inline display:block; collides with scrubber on phones
      '.forage-scrub{width:calc(100vw - 16px);bottom:12px;gap:10px;padding:9px 14px;}',
      '.forage-date{width:58px;font-size:13px;}',
      '.forage-play{width:42px;height:42px;}',                          // bigger tap target
      '.forage-slider{height:26px;}',                                   // fatter touch strip
      '.forage-today-btn{padding:7px 12px;font-size:12px;}',
      '.forage-row{padding:9px 0;}',                                    // roomier taps
      '.forage-row input{width:20px;height:20px;}',                     // bigger checkboxes
      '.forage-lbl{font-size:14px;}',
      '.forage-run-btn{padding:6px 12px;font-size:12px;}',
      '.reported-toggle{font-size:14px;}',
      '.reported-sp-btn{padding:6px 12px;font-size:12px;}',             // bigger source/species taps
      '.reported-note,.reported-latest,.reported-rate{font-size:12px;}',
      '}'
    ].join('');
    document.head.appendChild(s);
  }

  // ---- mount -------------------------------------------------------------
  function mount(opts) {
    _map = opts.map;
    _cells = opts.cells || [];
    _isLight = opts.isLight;
    if (!_map || !global.L || !_cells.length) return;
    injectCss();
    precompute();
    buildControls();
    // Start with the thesis layers on: Chinook + Southern Residents.
    document.querySelectorAll('.forage-row input').forEach(function (input) {
      var k = input.getAttribute('data-key');
      if (k === 'salmon' || k === 'orca_srkw') { input.checked = true; setLayer(k, true); }
    });
    var runRow = document.querySelector('.forage-runs');
    if (runRow && layerOn.salmon) runRow.style.display = 'flex';
    updateLegend();
  }

  // Swap the underlying hex grid in place (e.g. a finer resolution on zoom-in)
  // without rebuilding the panel/scrubber. Tears down the built species layers,
  // recomputes priors on the new cells, and re-paints whatever is toggled on.
  function setCells(cells) {
    if (!cells || !cells.length) return;
    Object.keys(layerGroups).forEach(function (k) {
      if (layerGroups[k]) _map.removeLayer(layerGroups[k]);
    });
    layerGroups = {};
    _cells = cells;
    precompute();
    Object.keys(layerOn).forEach(function (k) {
      if (!layerOn[k]) return;
      layerGroups[k] = buildLayer(k);
      layerGroups[k].addTo(_map);
      paintLayer(k);
    });
  }

  global.ForageModel = { mount: mount, setCells: setCells };
})(window);
