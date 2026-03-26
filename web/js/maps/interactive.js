// Step 4: Interactive Map
// Layer switcher, overlays, borough filter, tract click info panel

(function () {
  'use strict';

  // ── Tooltip options ───────────────────────────────────────
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

  function siteTooltip(p) {
    return '<b class="tt-site">Cool It! Site</b>' +
      '<div class="tt-loc">' + (p.property_name || '') + '</div>' +
      '<div class="tt-loc">' + (p.feature_type || '') + ' · ' + (p.borough || '') + '</div>';
  }

  function nychaTooltip(p) {
    const rent = p.avg_monthly_rent_usd ? '$' + Math.round(p.avg_monthly_rent_usd) : '—';
    return '<b class="tt-nycha">NYCHA Development</b>' +
      '<div class="tt-loc">' + (p.name || '') + '</div>' +
      '<div class="tt-rows">' +
        '<span>HVI</span><span>' + (p.hvi_score_zcta || '—') + ' / 5</span>' +
        '<span>Avg rent</span><span>' + rent + '/mo</span>' +
      '</div>';
  }

  // ── Color constants ────────────────────────────────────────
  const SEQ = ['#EAF2FB', '#7FB3D3', '#F5C26B', '#E07B39', '#922B21'];
  const CLUSTER_COLORS = { 1: '#56B4E9', 2: '#F0E442', 3: '#E69F00', 4: '#CC79A7', 5: '#D55E00' };
  const LISA_COLORS    = { HH: '#C0392B', LL: '#2471A3', HL: '#F39C12', LH: '#A569BD' };

  const BOROUGH_BOUNDS = {
    'Bronx':         [[40.785, -73.933], [40.915, -73.765]],
    'Brooklyn':      [[40.551, -74.042], [40.739, -73.834]],
    'Manhattan':     [[40.679, -74.020], [40.882, -73.907]],
    'Queens':        [[40.542, -73.962], [40.812, -73.700]],
    'Staten Island': [[40.477, -74.259], [40.651, -74.034]]
  };

  const LEGEND_CFG = {
    cdi:     { title: 'CDI Quintile',          items: [['Q1 — Lowest risk','#EAF2FB'],['Q2','#7FB3D3'],['Q3','#F5C26B'],['Q4','#E07B39'],['Q5 — Highest risk','#922B21']] },
    binary:  { title: 'Cooling Desert',        items: [['Cooling Desert','#922B21'],['Not a Desert','#EAF2FB']] },
    lisa:    { title: 'LISA Cluster',          items: [['HH — Hot-spot','#C0392B'],['LL — Cold-spot','#2471A3'],['HL — Isolated high','#F39C12'],['LH — Protected','#A569BD'],['Not significant','#D5D8DC']] },
    cluster: { title: 'Risk Typology',         items: [['Low Risk','#56B4E9'],['Financially Strained','#F0E442'],['Immigrant Heat Burden','#E69F00'],['Racial Heat Burden','#CC79A7'],['Compound Deprivation','#D55E00']] },
    hvi:     { title: 'HVI Rank',              items: [['Rank 1 — Lowest','#EAF2FB'],['Rank 2','#7FB3D3'],['Rank 3','#F5C26B'],['Rank 4','#E07B39'],['Rank 5 — Highest','#922B21']] },
    temp:    { title: 'Baseline Temp (°F)',    items: [['Coolest','#EAF2FB'],['','#7FB3D3'],['','#F5C26B'],['','#E07B39'],['Hottest','#922B21']] }
  };

  // ── Map init ───────────────────────────────────────────────
  const map = L.map('interactive-map', { zoomControl: true })
    .setView([40.72, -73.97], 10);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://carto.com/attributions">CartoDB</a>',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(map);

  // ── State ──────────────────────────────────────────────────
  let activeLayer   = 'cdi';
  let activeCluster = 0;     // 0 = no filter; 1-5 = highlight that cluster
  let tractData     = null;
  let tempBreaks  = [];
  let boroughStats = {};
  let scenarioLookup = new Map();
  let mainLayer, coolItLayer, nychaLayer;

  // ── Load data ──────────────────────────────────────────────
  Promise.all([
    fetch('data/tract_map_data.geojson').then(r => r.json()),
    fetch('data/scenario_tract_flags.geojson').then(r => r.json()),
    fetch('data/cool_it_sites.geojson').then(r => r.json()),
    fetch('data/nycha_developments.geojson').then(r => r.json())
  ]).then(([tracts, scenarios, sites, nycha]) => {

    // Scenario lookup by GEOID
    scenarios.features.forEach(ft => scenarioLookup.set(ft.properties.GEOID, ft.properties));

    // Quantile breaks for temperature
    const temps = tracts.features
      .map(ft => ft.properties.baseline_temp_f)
      .filter(v => v != null)
      .sort((a, b) => a - b);
    tempBreaks = [0.2, 0.4, 0.6, 0.8].map(q => temps[Math.floor(q * temps.length)]);

    // Borough stats
    ['Bronx', 'Brooklyn', 'Manhattan', 'Queens', 'Staten Island'].forEach(b => {
      const bt = tracts.features.filter(ft => ft.properties.borough === b);
      const ds = bt.filter(ft => ft.properties.is_cooling_desert === 1);
      const cdis = bt.map(ft => ft.properties.CDI).filter(v => v != null);
      boroughStats[b] = {
        total:   bt.length,
        deserts: ds.length,
        pct:     bt.length ? (ds.length / bt.length * 100).toFixed(1) : 0,
        meanCDI: cdis.length ? (cdis.reduce((a, b) => a + b, 0) / cdis.length).toFixed(1) : '—'
      };
    });

    tractData = tracts;

    mainLayer = L.geoJSON(tracts, {
      style: tractStyle,
      onEachFeature: bindFeature
    }).addTo(map);

    coolItLayer = L.geoJSON(sites, {
      pointToLayer: (f, ll) => L.circleMarker(ll, {
        radius: 5, fillColor: '#27AE60', color: '#fff', weight: 1, fillOpacity: 0.9
      }),
      onEachFeature: (f, l) => l.bindTooltip(siteTooltip(f.properties), TT_OPTS)
    });

    nychaLayer = L.geoJSON(nycha, {
      style: { fillColor: '#7D3C98', fillOpacity: 0.55, color: '#7D3C98', weight: 0.5 },
      onEachFeature: (f, l) => l.bindTooltip(nychaTooltip(f.properties), TT_OPTS)
    });

    renderLegend();
    updateBoroughStats('all');

  }).catch(err => console.error('[Map] Data load failed:', err));

  // ── Style function ─────────────────────────────────────────
  function tractStyle(feature) {
    const p = feature.properties;
    switch (activeLayer) {
      case 'cdi': {
        const idx = Math.round(p.CDI_quintile || 1) - 1;
        return { fillColor: SEQ[Math.max(0, Math.min(idx, 4))], fillOpacity: 0.78, color: '#fff', weight: 0.3 };
      }
      case 'binary':
        return p.is_cooling_desert === 1
          ? { fillColor: '#922B21', fillOpacity: 0.82, color: 'transparent', weight: 0 }
          : { fillColor: '#EAF2FB', fillOpacity: 0.5,  color: '#DEE2E6',     weight: 0.3 };
      case 'lisa': {
        const sig = p.lisa_cluster && p.lisa_cluster !== 'NS' && +p.lisa_p < 0.05;
        return {
          fillColor:   sig ? (LISA_COLORS[p.lisa_cluster] || '#D5D8DC') : '#D5D8DC',
          fillOpacity: sig ? 0.82 : 0.25,
          color: 'transparent', weight: 0
        };
      }
      case 'cluster': {
        const c = Math.round(p.cluster || 1);
        if (activeCluster > 0 && c !== activeCluster) {
          return { fillColor: '#D5D8DC', fillOpacity: 0.2, color: 'transparent', weight: 0 };
        }
        return { fillColor: CLUSTER_COLORS[c] || '#D5D8DC', fillOpacity: 0.78, color: 'transparent', weight: 0 };
      }
      case 'hvi': {
        const idx = Math.round(p.HVI_RANK || 1) - 1;
        return { fillColor: SEQ[Math.max(0, Math.min(idx, 4))], fillOpacity: 0.78, color: '#fff', weight: 0.3 };
      }
      case 'temp':
        return { fillColor: seqColor(p.baseline_temp_f, tempBreaks), fillOpacity: 0.78, color: 'transparent', weight: 0 };
      default:
        return { fillColor: '#F0F2F5', fillOpacity: 0.5, color: '#DEE2E6', weight: 0.3 };
    }
  }

  function seqColor(val, breaks) {
    if (val == null) return '#F0F2F5';
    for (let i = 0; i < breaks.length; i++) if (val < breaks[i]) return SEQ[i];
    return SEQ[4];
  }

  // ── Feature interaction ────────────────────────────────────
  function bindFeature(feature, layer) {
    layer.bindTooltip(tractTooltip(feature.properties), TT_OPTS);
    layer.on('click',     () => showInfo(feature.properties));
    layer.on('mouseover', function () { this.setStyle({ weight: 1.5, color: '#1A252F' }); });
    layer.on('mouseout',  function () { mainLayer.resetStyle(this); });
  }

  // ── Info panel ─────────────────────────────────────────────
  function showInfo(p) {
    const sc = scenarioLookup.get(p.GEOID) || {};
    const helps = [];
    if (sc.s1_newly_covered === true) helps.push('S1: New cooling site');
    if (sc.s2_improved_quintile === 1) helps.push('S2: AC retrofit');
    if (sc.s4_exits_10pp === 1)        helps.push('S4: Rent relief');

    const desert = p.is_cooling_desert === 1;
    document.getElementById('map-info').innerHTML = `
      <div class="info-header">
        <code class="info-geoid">${p.GEOID}</code>
        <span class="info-borough">${p.borough || ''}</span>
      </div>
      <span class="info-badge ${desert ? 'badge-desert' : 'badge-safe'}">
        ${desert ? 'Cooling Desert' : 'Not a Desert'}
      </span>
      <dl class="info-grid">
        <dt>CDI Score</dt>        <dd>${p.CDI != null ? p.CDI.toFixed(1) : '—'} <span class="muted">(Q${Math.round(p.CDI_quintile) || '—'})</span></dd>
        <dt>Cluster</dt>          <dd>${p.cluster_name || '—'}</dd>
        <dt>HVI Rank</dt>         <dd>${Math.round(p.HVI_RANK) || '—'} / 5</dd>
        <dt>Rent burden 50%+</dt> <dd>${fmtPct(p.pct_rent_burden_50_plus)}</dd>
        <dt>Median income</dt>    <dd>${fmtMoney(p.median_household_income)}</dd>
        <dt>% Black</dt>          <dd>${fmtPct(p.pct_black)}</dd>
        <dt>% Hispanic</dt>       <dd>${fmtPct(p.pct_hispanic)}</dd>
      </dl>
      ${helps.length ? `<div class="info-scenarios">
        <span class="info-scen-label">Policy scenarios that help:</span>
        ${helps.map(h => `<span class="info-scen-tag">${h}</span>`).join('')}
      </div>` : ''}
    `;
  }

  function fmtPct(v)   { return v != null ? v.toFixed(1) + '%' : '—'; }
  function fmtMoney(v) { return v != null ? '$' + Math.round(v).toLocaleString() : '—'; }

  // ── Legend ─────────────────────────────────────────────────
  function renderLegend() {
    const cfg = LEGEND_CFG[activeLayer];
    document.getElementById('map-legend').innerHTML =
      `<p class="ctrl-label">${cfg.title}</p>` +
      cfg.items.map(([label, color]) =>
        `<div class="legend-item">
           <span class="legend-swatch" style="background:${color}"></span>
           <span class="legend-label">${label}</span>
         </div>`
      ).join('');
  }

  // ── Borough stats ──────────────────────────────────────────
  function updateBoroughStats(borough) {
    const el = document.getElementById('borough-stats');
    if (!tractData) { el.innerHTML = ''; return; }
    if (borough === 'all') {
      const total   = tractData.features.length;
      const deserts = tractData.features.filter(ft => ft.properties.is_cooling_desert === 1).length;
      el.innerHTML  = `<span>${deserts} cooling deserts of ${total} tracts (${(deserts / total * 100).toFixed(1)}%)</span>`;
    } else {
      const s = boroughStats[borough];
      el.innerHTML  = `<span>${s.deserts} of ${s.total} tracts are cooling deserts (${s.pct}%)</span>
                       <span>Mean CDI: ${s.meanCDI}</span>`;
    }
  }

  // ── Control event listeners ────────────────────────────────
  document.querySelectorAll('input[name="map-layer"]').forEach(radio => {
    radio.addEventListener('change', function () {
      if (!mainLayer) return;
      activeLayer = this.value;
      if (activeLayer !== 'cluster') activeCluster = 0;
      mainLayer.setStyle(tractStyle);
      renderLegend();
    });
  });

  document.addEventListener('filterCluster', e => {
    if (!mainLayer) return;
    activeCluster = e.detail;
    activeLayer   = 'cluster';
    document.querySelector('input[value="cluster"]').checked = true;
    mainLayer.setStyle(tractStyle);
    renderLegend();
  });

  document.getElementById('overlay-coolit').addEventListener('change', function () {
    if (!coolItLayer) return;
    this.checked ? coolItLayer.addTo(map) : map.removeLayer(coolItLayer);
  });

  document.getElementById('overlay-nycha').addEventListener('change', function () {
    if (!nychaLayer) return;
    this.checked ? nychaLayer.addTo(map) : map.removeLayer(nychaLayer);
  });

  document.querySelectorAll('.borough-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.borough-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      const b = this.dataset.borough;
      updateBoroughStats(b);
      if (b === 'all') {
        map.flyTo([40.72, -73.97], 10, { duration: 0.8 });
      } else {
        map.flyToBounds(BOROUGH_BOUNDS[b], { padding: [20, 20], duration: 0.8 });
      }
    });
  });

}());
