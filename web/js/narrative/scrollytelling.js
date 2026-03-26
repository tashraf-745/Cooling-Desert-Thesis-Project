// Step 3: Scrollytelling Narrative
// Sticky Leaflet map driven by 7 scroll panels via IntersectionObserver

(function () {
  'use strict';

  // ── Tooltip helpers ───────────────────────────────────────
  const TT_OPTS = { sticky: true, className: 'map-tooltip', offset: [12, 0] };

  function tractTooltip(p) {
    const desert = p.is_cooling_desert === 1;
    const pct = v => v != null ? v.toFixed(1) + '%' : '—';
    return '<b class="tt-' + (desert ? 'desert' : 'safe') + '">' + (desert ? '● Cooling Desert' : '○ Not a Desert') + '</b>' +
      '<div class="tt-loc">' + (p.borough || '') + '</div>' +
      '<div class="tt-rows">' +
        '<span>CDI</span><span>' + (p.CDI != null ? p.CDI.toFixed(1) : '—') + ' (Q' + (Math.round(p.CDI_quintile) || '—') + ')</span>' +
        '<span>HVI</span><span>' + (Math.round(p.HVI_RANK) || '—') + ' / 5</span>' +
        '<span>Rent ≥50%</span><span>' + pct(p.pct_rent_burden_50_plus) + '</span>' +
      '</div>';
  }

  function ntaTooltip(p) {
    return '<b class="tt-loc">' + (p.ntaname || p.boroname || '') + '</b>' +
      '<div class="tt-rows">' +
        '<span>HVI Rank</span><span>' + (Math.round(p.HVI_RANK) || '—') + ' / 5</span>' +
        '<span>Surface temp</span><span>' + (p.SURFACE_TEMP != null ? p.SURFACE_TEMP.toFixed(1) + '°F' : '—') + '</span>' +
      '</div>';
  }

  function siteTooltip(p) {
    return '<b class="tt-site">Cool It! Site</b>' +
      '<div class="tt-loc">' + (p.property_name || '') + '</div>' +
      '<div class="tt-loc">' + (p.feature_type || '') + ' · ' + (p.borough || '') + '</div>';
  }

  // ── Color constants ────────────────────────────────────────
  const SEQ = ['#EAF2FB', '#7FB3D3', '#F5C26B', '#E07B39', '#922B21'];
  const LISA_COLOR = {
    HH: '#C0392B', LL: '#2471A3', HL: '#F39C12', LH: '#A569BD'
  };
  const BASE_STYLE  = { fillColor: '#F0F2F5', fillOpacity: 0.7,  color: '#C8CDD4', weight: 0.5 };
  const GHOST_STYLE = { fillColor: '#F0F2F5', fillOpacity: 0.28, color: '#C8CDD4', weight: 0.3 };

  // ── Map init ───────────────────────────────────────────────
  const map = L.map('narrative-map', {
    zoomControl:       false,
    scrollWheelZoom:   false,
    dragging:          false,
    doubleClickZoom:   false,
    boxZoom:           false,
    keyboard:          false,
    attributionControl: true
  }).setView([40.72, -73.97], 10);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://carto.com/attributions">CartoDB</a>',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(map);

  // ── Layer registry ─────────────────────────────────────────
  const L_ = {};

  // ── Load data ──────────────────────────────────────────────
  Promise.all([
    fetch('data/tract_map_data.geojson').then(r => r.json()),
    fetch('data/nta_hvi_layer.geojson').then(r => r.json()),
    fetch('data/cool_it_sites.geojson').then(r => r.json())
  ]).then(([tracts, ntas, sites]) => {
    buildLayers(tracts, ntas, sites);
    initObserver();
  }).catch(err => console.error('[Narrative] Data load failed:', err));

  // ── Build layers once ──────────────────────────────────────
  function buildLayers(tracts, ntas, sites) {

    const onTract = (f, l) => l.bindTooltip(tractTooltip(f.properties), TT_OPTS);

    // Panel 0 — base grey tracts
    L_.base = L.geoJSON(tracts, { style: BASE_STYLE, onEachFeature: onTract });

    // Panel 1 — HVI choropleth by NTA
    L_.hvi = L.geoJSON(ntas, {
      style: f => ({
        fillColor: SEQ[Math.round(f.properties.HVI_RANK || 1) - 1] || SEQ[0],
        fillOpacity: 0.78,
        color: '#fff',
        weight: 0.5
      }),
      onEachFeature: (f, l) => l.bindTooltip(ntaTooltip(f.properties), TT_OPTS)
    });

    // Panel 2 — rent burden choropleth by tract
    L_.rentBurden = L.geoJSON(tracts, {
      style: f => ({
        fillColor: seqColor(f.properties.pct_rent_burden_50_plus, [5, 10, 20, 30]),
        fillOpacity: 0.78,
        color: '#fff',
        weight: 0.3
      }),
      onEachFeature: onTract
    });

    // Panel 3 & 6 — cooling desert tracts only (is_cooling_desert is int 0/1)
    L_.deserts = L.geoJSON(tracts, {
      filter: f => f.properties.is_cooling_desert === 1,
      style: { fillColor: '#922B21', fillOpacity: 0.82, color: 'transparent', weight: 0 },
      onEachFeature: onTract
    });

    // Panel 4 — % Black choropleth
    L_.black = L.geoJSON(tracts, {
      style: f => ({
        fillColor: seqColor(f.properties.pct_black, [10, 25, 40, 60]),
        fillOpacity: 0.78,
        color: 'transparent',
        weight: 0
      }),
      onEachFeature: onTract
    });

    // Panel 5 — significant LISA clusters
    L_.lisa = L.geoJSON(tracts, {
      filter: f => f.properties.lisa_cluster && f.properties.lisa_cluster !== 'NS' && +f.properties.lisa_p < 0.05,
      style: f => ({
        fillColor: LISA_COLOR[f.properties.lisa_cluster] || '#D5D8DC',
        fillOpacity: 0.85,
        color: 'transparent',
        weight: 0
      }),
      onEachFeature: onTract
    });

    // Panel 6 — Cool It! point layer
    L_.coolIt = L.geoJSON(sites, {
      pointToLayer: (_, ll) => L.circleMarker(ll, {
        radius: 5,
        fillColor: '#27AE60',
        color: '#fff',
        weight: 1,
        fillOpacity: 0.9
      }),
      onEachFeature: (f, l) => l.bindTooltip(siteTooltip(f.properties), TT_OPTS)
    });

    showStep(0);
  }

  // ── Sequential color helper ────────────────────────────────
  function seqColor(val, breaks) {
    if (val == null) return '#F0F2F5';
    for (let i = 0; i < breaks.length; i++) {
      if (val < breaks[i]) return SEQ[i];
    }
    return SEQ[4];
  }

  // ── Step renderer ──────────────────────────────────────────
  function showStep(step) {
    Object.values(L_).forEach(l => map.hasLayer(l) && map.removeLayer(l));

    switch (step) {
      case 0:
        L_.base.setStyle(BASE_STYLE);
        L_.base.addTo(map);
        map.flyTo([40.72, -73.97], 10, { duration: 0.8 });
        break;
      case 1:
        L_.base.setStyle(BASE_STYLE);
        L_.base.addTo(map);
        L_.hvi.addTo(map);
        break;
      case 2:
        L_.rentBurden.addTo(map);
        break;
      case 3:
        L_.base.setStyle(GHOST_STYLE);
        L_.base.addTo(map);
        L_.deserts.addTo(map);
        break;
      case 4:
        L_.black.addTo(map);
        break;
      case 5:
        L_.base.setStyle(GHOST_STYLE);
        L_.base.addTo(map);
        L_.lisa.addTo(map);
        map.flyTo([40.837, -73.865], 11, { duration: 1 });
        break;
      case 6:
        L_.base.setStyle(GHOST_STYLE);
        L_.base.addTo(map);
        L_.deserts.addTo(map);
        L_.coolIt.addTo(map);
        map.flyTo([40.72, -73.97], 10, { duration: 0.8 });
        break;
    }
  }

  // ── Intersection Observer ──────────────────────────────────
  function initObserver() {
    const panels = document.querySelectorAll('.narrative-panel');

    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const step = +entry.target.dataset.step;
        panels.forEach(p => p.classList.remove('is-active'));
        entry.target.classList.add('is-active');
        showStep(step);
      });
    }, { rootMargin: '-35% 0px -35% 0px', threshold: 0 });

    panels.forEach(p => obs.observe(p));
  }

}());
