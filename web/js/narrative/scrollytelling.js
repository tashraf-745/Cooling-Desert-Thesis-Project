// Step 3: Scrollytelling Narrative
// Sticky Leaflet map driven by 7 scroll panels via IntersectionObserver

(function () {
  'use strict';

  // ── Tooltip helpers ───────────────────────────────────────
  const TT_OPTS = { sticky: true, className: 'map-tooltip', offset: [12, 0] };

  // Panel 0, 3: general overview tooltip
  function tractTooltip(p) {
    const desert = p.is_cooling_desert === 1;
    const pct = v => v != null ? v.toFixed(1) + '%' : 'n/a';
    return '<b class="tt-' + (desert ? 'desert' : 'safe') + '">' + (desert ? '● Cooling Desert' : '○ Not a Cooling Desert') + '</b>' +
      '<div class="tt-loc">' + (p.borough || '') + '</div>' +
      '<div class="tt-rows">' +
        '<span>Heat risk score</span><span>' + (p.CDI != null ? p.CDI.toFixed(1) : 'n/a') + '</span>' +
        '<span>Heat danger level</span><span>' + (Math.round(p.HVI_RANK) || 'n/a') + ' / 5</span>' +
        '<span>Paying 50%+ on rent</span><span>' + pct(p.pct_rent_burden_50_plus) + '</span>' +
      '</div>';
  }

  // Panel 1: heat danger level tooltip
  function ntaTooltip(p) {
    return '<b class="tt-loc">' + (p.ntaname || p.boroname || '') + '</b>' +
      '<div class="tt-rows">' +
        '<span>Heat danger level</span><span>' + (Math.round(p.HVI_RANK) || 'n/a') + ' / 5</span>' +
        '<span>Avg. summer temp</span><span>' + (p.SURFACE_TEMP != null ? p.SURFACE_TEMP.toFixed(1) + '\u00b0F' : 'n/a') + '</span>' +
      '</div>';
  }

  // Panel 2: rent burden + AC affordability tooltip
  function rentBurdenTooltip(p) {
    const desert = p.is_cooling_desert === 1;
    const pct  = v => v != null ? v.toFixed(1) + '%' : 'n/a';
    const money = v => v != null ? '$' + Math.round(v).toLocaleString() : 'n/a';
    const burden = p.pct_rent_burden_50_plus;
    // Estimate: 21% of renters with AC can't afford to run it (citywide avg)
    // Higher burden = higher likelihood of non-use
    const acNote = burden != null
      ? (burden > 25 ? 'High likelihood AC is unaffordable to run'
       : burden > 12 ? 'Moderate financial barrier to running AC'
       : 'Lower financial barrier to running AC')
      : '';
    return '<b class="tt-' + (desert ? 'desert' : 'safe') + '">' + (desert ? '● Cooling Desert' : '○ Not a Cooling Desert') + '</b>' +
      '<div class="tt-loc">' + (p.borough || '') + '</div>' +
      '<div class="tt-rows">' +
        '<span>Paying 50%+ on rent</span><span>' + pct(burden) + '</span>' +
        '<span>Median income</span><span>' + money(p.median_household_income) + '</span>' +
        '<span>Heat danger level</span><span>' + (Math.round(p.HVI_RANK) || 'n/a') + ' / 5</span>' +
      '</div>' +
      (acNote ? '<div class="tt-note">' + acNote + '</div>' : '');
  }

  // Panel 4: racial composition + temperature tooltip
  function raceHeatTooltip(p) {
    const desert = p.is_cooling_desert === 1;
    const pct   = v => v != null ? v.toFixed(1) + '%' : 'n/a';
    const temp  = p.baseline_temp_f;
    const black = p.pct_black;
    return '<b class="tt-' + (desert ? 'desert' : 'safe') + '">' + (desert ? '● Cooling Desert' : '○ Not a Cooling Desert') + '</b>' +
      '<div class="tt-loc">' + (p.borough || '') + '</div>' +
      '<div class="tt-rows">' +
        '<span>Black residents</span><span>' + pct(black) + '</span>' +
        '<span>Avg. summer temp</span><span>' + (temp != null ? temp.toFixed(1) + '\u00b0F' : 'n/a') + '</span>' +
        '<span>Heat danger level</span><span>' + (Math.round(p.HVI_RANK) || 'n/a') + ' / 5</span>' +
        '<span>Heat risk score</span><span>' + (p.CDI != null ? p.CDI.toFixed(1) : 'n/a') + '</span>' +
      '</div>';
  }

  function siteTooltip(p) {
    return '<b class="tt-site">Public Cooling Spot</b>' +
      '<div class="tt-loc">' + (p.property_name || '') + '</div>' +
      '<div class="tt-loc">' + (p.feature_type || '') + ' · ' + (p.borough || '') + '</div>';
  }

  // ── Color constants ────────────────────────────────────────
  const SEQ = ['#EAF2FB', '#7FB3D3', '#F5C26B', '#E07B39', '#922B21'];

  // ── Legend config per step ─────────────────────────────────
  const STEP_LEGENDS = [
    null,
    { title: 'Heat Danger Level', items: [['1 Lowest', SEQ[0]], ['2', SEQ[1]], ['3', SEQ[2]], ['4', SEQ[3]], ['5 Highest', SEQ[4]]] },
    { title: 'Renters Paying 50%+ on Rent', items: [['Under 10%', SEQ[0]], ['10 to 20%', SEQ[1]], ['20 to 30%', SEQ[2]], ['30 to 40%', SEQ[3]], ['Over 40%', SEQ[4]]] },
    { title: 'Cooling Desert Status', items: [['Cooling Desert', '#922B21'], ['Not a Cooling Desert', '#DEE2E6']] },
    { title: 'Share of Black Residents', items: [['Under 10%', SEQ[0]], ['10 to 25%', SEQ[1]], ['25 to 40%', SEQ[2]], ['40 to 60%', SEQ[3]], ['Over 60%', SEQ[4]]] },
    { title: 'Heat Risk Clustering', items: [['High-risk cluster', '#C0392B'], ['Low-risk cluster', '#2471A3'], ['Isolated high-risk area', '#F39C12'], ['Low-risk island', '#A569BD'], ['No pattern', '#D5D8DC']] },
    { title: 'Cooling Infrastructure', items: [['Cooling Desert', '#922B21'], ['Not a Cooling Desert', '#DEE2E6'], ['Public Cooling Spot', '#27AE60']] },
  ];
  const LISA_COLOR = {
    HH: '#C0392B', LL: '#2471A3', HL: '#F39C12', LH: '#A569BD'
  };
  const BASE_STYLE  = { fillColor: '#F0F2F5', fillOpacity: 0.7,  color: '#C8CDD4', weight: 0.5 };
  const GHOST_STYLE = { fillColor: '#F0F2F5', fillOpacity: 0.28, color: '#C8CDD4', weight: 0.3 };

  // ── Map init ───────────────────────────────────────────────
  const NYC_BOUNDS = [[40.49, -74.27], [40.93, -73.68]];
  const map = L.map('narrative-map', {
    zoomControl:       false,
    scrollWheelZoom:   false,
    dragging:          false,
    doubleClickZoom:   false,
    boxZoom:           false,
    keyboard:          false,
    attributionControl: true
  });
  map.fitBounds(NYC_BOUNDS, { animate: false, padding: [10, 10] });

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
    fetch('data/cool_it_sites.geojson').then(r => r.json()),
    fetch('data/nyc_boundary.geojson').then(r => r.json())
  ]).then(([tracts, ntas, sites, boundary]) => {
    buildLayers(tracts, ntas, sites, boundary);
    initObserver();
  }).catch(err => console.error('[Narrative] Data load failed:', err));

  // ── Build layers once ──────────────────────────────────────
  function buildLayers(tracts, ntas, sites, boundary) {

    const onTract = (f, l) => l.bindTooltip(tractTooltip(f.properties), TT_OPTS);

    // NYC outline — shown on panel 0 to orient the viewer
    L_.nycBorder = L.geoJSON(boundary, {
      style: { fillColor: 'transparent', color: '#1A252F', weight: 2.5, opacity: 0.7 }
    });

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

    // Panel 2 — rent burden choropleth by tract (AC affordability tooltip)
    L_.rentBurden = L.geoJSON(tracts, {
      style: f => ({
        fillColor: seqColor(f.properties.pct_rent_burden_50_plus, [10, 20, 30, 40]),
        fillOpacity: 0.78,
        color: '#fff',
        weight: 0.3
      }),
      onEachFeature: (f, l) => l.bindTooltip(rentBurdenTooltip(f.properties), TT_OPTS)
    });

    // Panel 3 & 6 — cooling desert tracts only (is_cooling_desert is int 0/1)
    L_.deserts = L.geoJSON(tracts, {
      filter: f => f.properties.is_cooling_desert === 1,
      style: { fillColor: '#922B21', fillOpacity: 0.82, color: 'transparent', weight: 0 },
      onEachFeature: onTract
    });

    // Panel 4 — % Black choropleth (race + temperature tooltip)
    L_.black = L.geoJSON(tracts, {
      style: f => ({
        fillColor: seqColor(f.properties.pct_black, [10, 25, 40, 60]),
        fillOpacity: 0.78,
        color: 'transparent',
        weight: 0
      }),
      onEachFeature: (f, l) => l.bindTooltip(raceHeatTooltip(f.properties), TT_OPTS)
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

  // ── Legend renderer ────────────────────────────────────────
  function renderNarrativeLegend(step) {
    const el = document.getElementById('narrative-legend');
    if (!el) return;
    const cfg = STEP_LEGENDS[step];
    if (!cfg) { el.innerHTML = ''; return; }
    el.innerHTML = `<p class="narr-legend-title">${cfg.title}</p>` +
      cfg.items.map(([label, color]) =>
        `<div class="narr-legend-item">
          <span class="narr-legend-swatch" style="background:${color}"></span>
          <span class="narr-legend-label">${label}</span>
        </div>`
      ).join('');
  }

  // ── Step renderer ──────────────────────────────────────────
  function showStep(step) {
    Object.values(L_).forEach(l => map.hasLayer(l) && map.removeLayer(l));
    renderNarrativeLegend(step);

    switch (step) {
      case 0:
        L_.base.setStyle(BASE_STYLE);
        L_.base.addTo(map);
        L_.nycBorder.addTo(map);
        map.flyToBounds(NYC_BOUNDS, { duration: 0.8, padding: [10, 10] });
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
        map.flyToBounds(NYC_BOUNDS, { duration: 0.8, padding: [10, 10] });
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
