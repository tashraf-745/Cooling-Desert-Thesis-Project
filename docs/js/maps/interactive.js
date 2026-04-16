// Step 4: Interactive Map
// Layer switcher, overlays, borough filter, tract click info panel

(function () {
  'use strict';

  // ── Tooltip options ───────────────────────────────────────
  const TT_OPTS = { sticky: true, className: 'map-tooltip', offset: [12, 0] };

  // Tooltip lookups
  const CDI_LEVEL  = ['', 'Safest group', 'Low-risk group', 'Moderate-risk group', 'High-risk group', 'Highest-risk group'];
  const HVI_DESC   = ['', 'Low danger: least at risk during heat waves.', 'Below-average heat danger.', 'Moderate heat danger.', 'High danger: serious risk during heat emergencies.', 'Extreme danger: highest risk category in the city.'];
  const LISA_TIP   = {
    HH: { label: 'High-Risk Cluster',         desc: 'Surrounded by other high-risk neighborhoods. No safer area within walking distance.' },
    LL: { label: 'Low-Risk Cluster',           desc: 'Surrounded by other lower-risk neighborhoods.' },
    HL: { label: 'Isolated High-Risk Area',    desc: 'High heat risk here, but lower-risk neighbors nearby.' },
    LH: { label: 'Protected Low-Risk Island',  desc: 'Lower risk here, but surrounded by higher-risk neighbors.' },
    NS: { label: 'No Cluster Pattern',         desc: 'No strong clustering pattern detected in this area.' },
  };
  const CLUSTER_TIP = {
    1: { name: 'Low Risk',                    desc: 'Well-resourced neighborhood with lower overall heat risk and stronger ability to stay cool.' },
    2: { name: 'Financially Stretched',       desc: 'High rent leaves little for electricity. Many residents own an AC unit they cannot afford to run.' },
    3: { name: 'Language & Heat Barriers',    desc: 'Language barriers reduce access to emergency cooling information and assistance programs.' },
    4: { name: 'Racial Heat Burden',          desc: 'Predominantly Black neighborhood running measurably hotter, reflecting decades of racial disinvestment.' },
    5: { name: 'Multiple Compounding Barriers', desc: 'Every risk factor elevated at once: highest heat, lowest incomes, highest disability rates, fewest cooling options.' },
  };

  // Layer-aware tooltip - called at hover time, reads current activeLayer
  function tractTooltip(p) {
    const pct   = v => v != null ? v.toFixed(1) + '%' : 'N/A';
    const money = v => v != null ? '$' + Math.round(v).toLocaleString() : 'N/A';
    const desert = p.is_cooling_desert === 1;
    const cdi    = p.CDI != null ? p.CDI.toFixed(1) : 'N/A';
    const hvi    = Math.round(p.HVI_RANK) || 0;
    const qrow   = (label, val) => `<span>${label}</span><span>${val}</span>`;

    switch (activeLayer) {

      case 'cdi': {
        const level = CDI_LEVEL[Math.round(p.CDI_quintile)] || '';
        return `<b class="tt-${desert ? 'desert' : 'safe'}">${desert ? '● Cooling Desert' : '○ Not a Cooling Desert'}</b>` +
          `<div class="tt-loc">${p.borough || ''}</div>` +
          `<div class="tt-rows">` +
            qrow('Heat risk score', cdi + ' / 72') +
            qrow('Risk group', level) +
            qrow('Paying 50%+ on rent', pct(p.pct_rent_burden_50_plus)) +
          `</div>`;
      }

      case 'binary': {
        const note = desert
          ? 'Heat danger is high and financial or physical barriers prevent cooling this home.'
          : 'Below the threshold that defines a cooling desert.';
        return `<b class="tt-${desert ? 'desert' : 'safe'}">${desert ? '● Cooling Desert' : '○ Not a Cooling Desert'}</b>` +
          `<div class="tt-loc">${p.borough || ''}</div>` +
          `<div style="font-size:11px;color:rgba(255,255,255,0.82);margin:3px 0">${note}</div>` +
          `<div class="tt-rows">` +
            qrow('Heat danger level', hvi + ' out of 5') +
            qrow('Median income', money(p.median_household_income)) +
          `</div>`;
      }

      case 'lisa': {
        const cl = LISA_TIP[p.lisa_cluster] || LISA_TIP.NS;
        const sig = p.lisa_p != null && +p.lisa_p < 0.05 && p.lisa_cluster !== 'NS';
        return `<b style="display:block;font-size:11px;font-weight:700;color:${sig ? LISA_COLORS[p.lisa_cluster] || '#D5D8DC' : '#D5D8DC'};margin-bottom:2px">${cl.label}</b>` +
          `<div class="tt-loc">${p.borough || ''}</div>` +
          `<div style="font-size:11px;color:rgba(255,255,255,0.82);margin:3px 0">${cl.desc}</div>` +
          `<div class="tt-rows">${qrow('Heat risk score', cdi + ' / 72')}</div>`;
      }

      case 'cluster': {
        const c = Math.round(p.cluster || 1);
        const ct = CLUSTER_TIP[c] || CLUSTER_TIP[1];
        return `<b style="display:block;font-size:11px;font-weight:700;color:${CLUSTER_COLORS[c] || '#fff'};margin-bottom:2px">${ct.name}</b>` +
          `<div class="tt-loc">${p.borough || ''}</div>` +
          `<div style="font-size:11px;color:rgba(255,255,255,0.82);margin:3px 0">${ct.desc}</div>` +
          `<div class="tt-rows">` +
            qrow('In a cooling desert', desert ? 'Yes' : 'No') +
            qrow('Heat risk score', cdi + ' / 72') +
          `</div>`;
      }

      case 'hvi': {
        const desc = HVI_DESC[hvi] || '';
        return `<b class="tt-loc">${p.borough || ''}</b>` +
          `<div style="font-size:18px;font-weight:700;color:#fff;margin:4px 0">${hvi} <span style="font-size:12px;color:rgba(255,255,255,0.6)">/ 5</span></div>` +
          `<div style="font-size:11px;color:rgba(255,255,255,0.82);margin-bottom:4px">${desc}</div>` +
          `<div class="tt-rows">${qrow('Heat risk score', cdi + ' / 72')}</div>`;
      }

      case 'temp': {
        const temp = p.baseline_temp_f;
        const ctx  = temp >= 86.5 ? 'Among the hottest areas in the city.'
                   : temp >= 86.0 ? 'Above the city average.'
                   : temp >= 85.5 ? 'Near the city average.'
                   : 'Below the city average.';
        return `<b class="tt-loc">${p.borough || ''}</b>` +
          `<div style="font-size:18px;font-weight:700;color:#fff;margin:4px 0">${temp != null ? temp.toFixed(1) : '-'}<span style="font-size:12px;color:rgba(255,255,255,0.6)">°F</span></div>` +
          `<div style="font-size:11px;color:rgba(255,255,255,0.82);margin-bottom:4px">${ctx}</div>` +
          `<div class="tt-rows">${qrow('Heat danger level', hvi + ' out of 5')}</div>`;
      }

      default:
        return `<div class="tt-loc">${p.borough || ''}</div>` +
          `<div class="tt-rows">${qrow('Heat risk score', cdi + ' / 72')}</div>`;
    }
  }

  function siteTooltip(p) {
    return '<b class="tt-site">Public Cooling Spot</b>' +
      '<div class="tt-loc">' + (p.property_name || '') + '</div>' +
      '<div class="tt-loc">' + (p.feature_type || '') + ' · ' + (p.borough || '') + '</div>';
  }

  function nychaTooltip(p) {
    const rent = p.avg_monthly_rent_usd ? '$' + Math.round(p.avg_monthly_rent_usd) : '-';
    return '<b class="tt-nycha">NYCHA Development</b>' +
      '<div class="tt-loc">' + (p.name || '') + '</div>' +
      '<div class="tt-rows">' +
        '<span>HVI</span><span>' + (p.hvi_score_zcta || '-') + ' / 5</span>' +
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
    cdi:     { title: 'Heat Risk Score',         items: [['Lowest risk','#EAF2FB'],['Low risk','#7FB3D3'],['Moderate risk','#F5C26B'],['High risk','#E07B39'],['Highest risk','#922B21']] },
    binary:  { title: 'Cooling Desert',          items: [['Cooling Desert','#922B21'],['Not a Cooling Desert','#EAF2FB']] },
    lisa:    { title: 'Neighborhood Risk Clusters', items: [['High-risk cluster (surrounded by high-risk areas)','#C0392B'],['Low-risk cluster','#2471A3'],['Isolated high-risk area','#F39C12'],['Low-risk island inside a risky zone','#A569BD'],['No clear cluster pattern','#D5D8DC']] },
    cluster: { title: 'Neighborhood Type',       items: [['Low Risk','#56B4E9'],['Financially Stretched','#F0E442'],['Language & Heat Barriers','#E69F00'],['Racial Heat Burden','#CC79A7'],['Multiple Compounding Barriers','#D55E00']] },
    hvi:     { title: 'Heat Danger Level (1 to 5)', items: [['1: Lowest danger','#EAF2FB'],['2','#7FB3D3'],['3','#F5C26B'],['4','#E07B39'],['5: Highest danger','#922B21']] },
    temp:    { title: 'Average Summer Temperature', items: [['Cooler','#EAF2FB'],['','#7FB3D3'],['','#F5C26B'],['','#E07B39'],['Hotter','#922B21']] }
  };

  // ── Map init ───────────────────────────────────────────────
  const map = L.map('interactive-map', { zoomControl: true });
  map.fitBounds([[40.49, -74.27], [40.93, -73.68]], { animate: false, padding: [5, 5] });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://carto.com/attributions">CartoDB</a>',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(map);

  // ── State ──────────────────────────────────────────────────
  let activeLayer   = 'cdi';
  let activeCluster = 0;     // 0 = no filter; 1-5 = highlight that cluster
  let activeBorough = 'all'; // 'all' or a borough name
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
        meanCDI: cdis.length ? (cdis.reduce((a, b) => a + b, 0) / cdis.length).toFixed(1) : '-'
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
    if (activeBorough !== 'all' && p.borough !== activeBorough) {
      return { fillColor: '#D8DCE0', fillOpacity: 0.18, color: '#C8CDD4', weight: 0.2 };
    }
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
    // Use function form so tooltip reads current activeLayer at hover time, not at bind time
    layer.bindTooltip(() => tractTooltip(feature.properties), TT_OPTS);
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
        ${desert ? 'Cooling Desert' : 'Not a Cooling Desert'}
      </span>
      <dl class="info-grid">
        <dt>Heat risk score</dt>       <dd>${p.CDI != null ? p.CDI.toFixed(1) : '-'}</dd>
        <dt>Neighborhood type</dt>     <dd>${(p.cluster_name || '-').split('-')[0].trim()}</dd>
        <dt>Heat danger level</dt>     <dd>${Math.round(p.HVI_RANK) || '-'} out of 5</dd>
        <dt>Paying 50%+ on rent</dt>   <dd>${fmtPct(p.pct_rent_burden_50_plus)}</dd>
        <dt>Median household income</dt><dd>${fmtMoney(p.median_household_income)}</dd>
        <dt>Black residents</dt>       <dd>${fmtPct(p.pct_black)}</dd>
        <dt>Hispanic residents</dt>    <dd>${fmtPct(p.pct_hispanic)}</dd>
      </dl>
      ${helps.length ? `<div class="info-scenarios">
        <span class="info-scen-label">Policies that could help this area:</span>
        ${helps.map(h => `<span class="info-scen-tag">${h}</span>`).join('')}
      </div>` : ''}
    `;
  }

  function fmtPct(v)   { return v != null ? v.toFixed(1) + '%' : '-'; }
  function fmtMoney(v) { return v != null ? '$' + Math.round(v).toLocaleString() : '-'; }

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
      activeBorough = b;
      if (mainLayer) mainLayer.setStyle(tractStyle);
      updateBoroughStats(b);
      if (b === 'all') {
        map.flyTo([40.72, -73.97], 10, { duration: 0.8 });
      } else {
        map.flyToBounds(BOROUGH_BOUNDS[b], { padding: [20, 20], duration: 0.8 });
      }
    });
  });

}());
