/* Astraeus shared coastal geometry.
 *
 * ONE source of truth for turning a project's monitoring zones into a hex
 * tessellation, so every app (Tessera, Proteus, Augur, ...) paints the SAME
 * cells over the SAME coast even though their PURPOSE differs: Tessera places
 * and names zones, Proteus paints per-cell uncertainty, Augur ranks them.
 *
 * Apps may legitimately choose different resolutions, disk radii, or clipping
 * (a quick prototype can run coarse; a deliverable can run fine). The shared
 * piece is the zone -> hex derivation and the synthetic bathymetry, not a fixed
 * size. Pass options to vary it per app.
 *
 * Requires h3-js (global `h3`). Plain browser global, no build step:
 *   <script src="https://cdn.jsdelivr.net/npm/h3-js@4.1.0/dist/h3-js.umd.js"></script>
 *   <script src="/apps/_shared/coastal-geometry.js"></script>
 * then use window.AstraeusGeo.
 */
(function (global) {
  'use strict';

  var DEFAULTS = { resolution: 7, radius: 4 };

  function hash(i, j) {
    var x = Math.sin((i + 1) * 12.9898 + (j + 1) * 78.233) * 43758.5453;
    return x - Math.floor(x);
  }

  /* Project -> monitoring zones. Named zones if the project declares them
     (operator-placed in Tessera, saved to projects/<id>.json `zones`), else a
     COLS x ROWS grid of derived zones across the bbox. Same fallback Tessera
     uses, so the two apps agree cell-for-cell. */
  function deriveZones(p, id, opts) {
    opts = opts || {};
    if (p && Array.isArray(p.zones) && p.zones.length) {
      return p.zones.map(function (z, i) {
        return { id: z.id || ('nz' + i), name: z.name || ('Zone ' + (i + 1)),
                 lat: +z.lat, lng: +z.lng, named: true };
      });
    }
    var b = (p && p.bounds) || { west: 14.95, south: 40.08, east: 15.13, north: 40.24 };
    var COLS = opts.cols || 3, ROWS = opts.rows || 3, zones = [], n = 0;
    for (var j = 0; j < ROWS; j++) for (var i = 0; i < COLS; i++) {
      var lat = b.north - (j + 0.5) * (b.north - b.south) / ROWS;
      var lng = b.west + (i + 0.5) * (b.east - b.west) / COLS;
      n++;
      zones.push({ id: 'z' + i + '_' + j, name: ((p && p.name) || 'Zone') + ' · zone ' + n,
                   lat: +lat.toFixed(4), lng: +lng.toFixed(4), named: false });
    }
    return zones;
  }

  /* Zones -> hex cells (union of H3 disks around each zone center). Optionally
     clip to the project bbox so the tessellation stays inside the declared
     extent. Returns [{h3, lat, lng, boundary, zone}]. boundary is the
     [[lat,lng],...] ring Leaflet's L.polygon takes directly. */
  function buildHexCells(zones, opts) {
    opts = opts || {};
    if (!global.h3) throw new Error('coastal-geometry: h3-js not loaded');
    var res = opts.resolution || DEFAULTS.resolution;
    var radius = (opts.radius != null) ? opts.radius : DEFAULTS.radius;
    var clip = opts.clipToBounds || null;
    var set = new Set();
    zones.forEach(function (z) {
      try {
        var c = global.h3.latLngToCell(z.lat, z.lng, res);
        global.h3.gridDisk(c, radius).forEach(function (x) { set.add(x); });
      } catch (e) { /* skip a bad zone, keep the rest */ }
    });
    var cells = [];
    set.forEach(function (cell) {
      var ll = global.h3.cellToLatLng(cell); // [lat, lng]
      if (clip && !(ll[1] >= clip.west && ll[1] <= clip.east &&
                    ll[0] >= clip.south && ll[0] <= clip.north)) return;
      cells.push({ h3: cell, lat: ll[0], lng: ll[1],
                   boundary: global.h3.cellToBoundary(cell),
                   zone: nearestZone(ll[0], ll[1], zones) });
    });
    return cells;
  }

  /* Fill a bbox with a gap-free H3 hex tiling (every cell whose center falls in
     the box). Cleaner for a continuous field (Proteus) than the union-of-disks;
     an app painting near named zones (Tessera) may prefer buildHexCells. Apps
     pick the resolution: a prototype can run coarse (res 7), a deliverable fine
     (res 8+). Returns [{h3, lat, lng, boundary}]. */
  function hexFillBounds(bounds, opts) {
    opts = opts || {};
    if (!global.h3) throw new Error('coastal-geometry: h3-js not loaded');
    var res = opts.resolution || DEFAULTS.resolution;
    var b = bounds;
    var ring = [[b.north, b.west], [b.north, b.east], [b.south, b.east], [b.south, b.west]];
    return global.h3.polygonToCells(ring, res).map(function (cell) {
      var ll = global.h3.cellToLatLng(cell);
      return { h3: cell, lat: ll[0], lng: ll[1], boundary: global.h3.cellToBoundary(cell) };
    });
  }

  /* Open-water hex grid: fill a bbox at a coarse resolution and keep only the
     cells whose center the landmask classifies as sea. This is the pelagic /
     migration grid (salmon corridors, orca, sightings) for a large region like
     the lower Salish Sea, where the nearshore-band grid does not reach the open
     mid-channel water the animals actually travel. Config-driven: pass the
     project's `context_bounds` and `grid.open_water.h3_res`. No mask -> every
     in-bbox cell is kept (isWater is permissive), so the caller still gets a
     grid, just an unmasked one. Returns [{h3, lat, lng, boundary}] like
     hexFillBounds. */
  function openWaterGrid(bounds, mask, opts) {
    opts = opts || {};
    return hexFillBounds(bounds, opts).filter(function (c) {
      return isWater(c.lat, c.lng, mask);
    });
  }

  /* Synthetic bathymetry stand-in: depth from position in the bbox, shallow at
     the north shore and deeper offshore, with stable per-location jitter. Spans
     roughly 1-35 m, the real Posidonia depth band (Telesca 2015), so the
     painted gradient is plausible. Labeled placeholder; real bathymetry
     (EMODnet) replaces it at v1. The same function feeds Proteus's depth ->
     uncertainty lookup, so a cell's painted uncertainty matches its depth. */
  function depthAt(lat, lng, bounds) {
    var b = bounds || { north: 40.24, south: 40.08 };
    var fy = (b.north - lat) / ((b.north - b.south) || 1);
    fy = Math.max(0, Math.min(1, fy));
    var jit = hash(Math.round(lat * 1000), Math.round(lng * 1000));
    return Math.max(1, Math.round(1 + fy * 33 + jit * 3));
  }

  /* Land/sea test against a precomputed mask (apps/_shared/build_landmask.py:
     {bounds, cols, rows, sea:[rowStrings]}, '1' = sea, row 0 north, col 0 west).
     Lets every app drop its land cells at any resolution. No mask -> everything
     passes (do not silently hide cells when the mask is missing). */
  function _maskCell(lat, lng, mask) {
    var b = mask.bounds;
    var fx = (lng - b.west) / ((b.east - b.west) || 1);
    var fy = (b.north - lat) / ((b.north - b.south) || 1);
    if (fx < 0 || fx > 1 || fy < 0 || fy > 1) return null; // outside the mask extent
    var ci = Math.min(mask.cols - 1, Math.max(0, Math.floor(fx * mask.cols)));
    var ri = Math.min(mask.rows - 1, Math.max(0, Math.floor(fy * mask.rows)));
    var row = mask.sea[ri];
    return row ? row.charAt(ci) : null;
  }
  function isWater(lat, lng, mask) {
    if (!mask || !mask.sea) return true;        // no mask -> do not hide anything
    return _maskCell(lat, lng, mask) === '1';
  }
  /* True only for points the mask KNOWS are land (inside extent and classified
     land). Points outside the mask extent are unknown, not land, so they are
     kept: filter `keep if !isLand` drops only confirmed land, never a sea or
     unclassified cell. Right for a zone-disk app (Tessera) whose cells can fall
     outside the project bbox the mask covers. */
  function isLand(lat, lng, mask) {
    if (!mask || !mask.sea) return false;
    return _maskCell(lat, lng, mask) === '0';
  }

  /* Depth from distance to the coastline, using the land/sea mask: shallow at
     the shore, deeper offshore. Far more honest than a bbox-edge gradient once
     land is masked (the bbox edge may be land; the real shallows hug the coast).
     Still a stand-in for real bathymetry (EMODnet), but a geographically
     plausible one. Brute-force nearest-land over the mask grid (cheap: a few
     hundred sea cells x a few hundred mask cells). */
  function depthFromCoast(lat, lng, mask, opts) {
    opts = opts || {};
    var maxDepth = opts.maxDepth || 35, perKm = opts.perKm || 3.0;
    if (!mask || !mask.sea) return null;
    var b = mask.bounds, cols = mask.cols, rows = mask.rows;
    var fx = (lng - b.west) / ((b.east - b.west) || 1);
    var fy = (b.north - lat) / ((b.north - b.south) || 1);
    var ci = Math.min(cols - 1, Math.max(0, Math.floor(fx * cols)));
    var ri = Math.min(rows - 1, Math.max(0, Math.floor(fy * rows)));
    var kmLat = 111.0, kmLng = 111.0 * Math.cos(lat * Math.PI / 180);
    var cellX = ((b.east - b.west) / cols) * kmLng;
    var cellY = ((b.north - b.south) / rows) * kmLat;
    var best = Infinity;
    for (var r = 0; r < rows; r++) {
      var row = mask.sea[r];
      for (var c = 0; c < cols; c++) {
        if (row.charAt(c) === '0') {            // land cell
          var dx = (c - ci) * cellX, dy = (r - ri) * cellY, d = dx * dx + dy * dy;
          if (d < best) best = d;
        }
      }
    }
    if (best === Infinity) return maxDepth;     // no land in view -> open water
    var distKm = Math.sqrt(best);
    return Math.max(1, Math.min(maxDepth, Math.round(1 + distKm * perKm)));
  }

  function nearestZone(lat, lng, zones) {
    if (!zones || !zones.length) return null;
    var best = zones[0], bd = Infinity;
    zones.forEach(function (z) {
      var d = (lat - z.lat) * (lat - z.lat) + (lng - z.lng) * (lng - z.lng);
      if (d < bd) { bd = d; best = z; }
    });
    return best;
  }

  global.AstraeusGeo = {
    DEFAULTS: DEFAULTS,
    deriveZones: deriveZones,
    buildHexCells: buildHexCells,
    hexFillBounds: hexFillBounds,
    openWaterGrid: openWaterGrid,
    depthAt: depthAt,
    depthFromCoast: depthFromCoast,
    isWater: isWater,
    isLand: isLand,
    nearestZone: nearestZone,
    hash: hash
  };
})(typeof window !== 'undefined' ? window : this);
