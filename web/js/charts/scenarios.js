// Step 7: Scenario Simulator — Map + Counters + Impact Bar

(function () {
  'use strict';

  const TOTAL_DESERTS = 557;

  // ── Scenario definitions ───────────────────────────────────
  const SCENARIOS = [
    {
      id: 'S1', field: 's1_newly_covered', checkFn: p => p.s1_newly_covered === true,
      exitsDesert: false,
      label: 'New Cooling Sites',
      desc: 'Add Cool It! sites to all uncovered cooling desert tracts'
    },
    {
      id: 'S2', field: 's2_improved_quintile', checkFn: p => p.s2_improved_quintile === 1,
      exitsDesert: false,
      label: 'AC Retrofit & Greening',
      desc: 'Lift HVI rank 5→4 via AC retrofits and urban tree cover expansion'
    },
    {
      id: 'S3', field: 's3_exits_liheap', checkFn: p => p.s3_exits_liheap === 1,
      exitsDesert: true,
      label: 'NYCHA Energy Assist',
      desc: 'Remove AC surcharge and expand LIHEAP eligibility in NYCHA buildings'
    },
    {
      id: 'S4', field: 's4_exits_10pp', checkFn: p => p.s4_exits_10pp === 1,
      exitsDesert: true,
      label: 'Rent Burden Relief',
      desc: '10pp rent stabilization reducing severe burden for lowest-income renters'
    }
  ];

  const SCEN_MAP = Object.fromEntries(SCENARIOS.map(s => [s.id, s]));

  // ── State ──────────────────────────────────────────────────
  const selected  = new Set();
  let tractFeatures = [];
  let map, desertBaseLayer, scenLayer;

  // ── Map init ───────────────────────────────────────────────
  function initMap() {
    map = L.map('scenario-map', { scrollWheelZoom: false, zoomControl: true })
      .setView([40.72, -73.97], 10);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com/attributions">CartoDB</a>',
      subdomains: 'abcd', maxZoom: 19
    }).addTo(map);
  }

  // ── Load data ──────────────────────────────────────────────
  function loadData() {
    fetch('data/scenario_tract_flags.geojson')
      .then(r => r.json())
      .then(data => {
        tractFeatures = data.features;

        // Base desert layer — muted red background
        desertBaseLayer = L.geoJSON(data, {
          filter: ft => ft.properties.is_cooling_desert === 1,
          style:  { fillColor: '#922B21', fillOpacity: 0.25, color: 'transparent', weight: 0 }
        }).addTo(map);

        // Scenario layer — starts empty
        scenLayer = L.geoJSON(null, {
          style: { fillColor: '#1ABC9C', fillOpacity: 0.85, color: '#fff', weight: 0.4 }
        }).addTo(map);

        refresh();
      })
      .catch(err => console.error('[Scenarios] Load failed:', err));
  }

  // ── Toggle a scenario ──────────────────────────────────────
  function toggle(id) {
    selected.has(id) ? selected.delete(id) : selected.add(id);
    document.querySelectorAll('.scen-btn').forEach(btn => {
      btn.classList.toggle('is-active', selected.has(btn.dataset.scenario));
    });
    refresh();
  }

  // ── Compute impact ─────────────────────────────────────────
  function computeImpact() {
    if (!selected.size) return { helped: 0, renters: 0, exits: 0, remaining: TOTAL_DESERTS };

    const helpedSet = new Set();
    const exitSet   = new Set();
    let renters = 0;

    for (const ft of tractFeatures) {
      const p = ft.properties;
      if (p.is_cooling_desert !== 1) continue;

      for (const id of selected) {
        const s = SCEN_MAP[id];
        if (s.checkFn(p)) {
          if (!helpedSet.has(p.GEOID)) {
            helpedSet.add(p.GEOID);
            renters += p.renter_population || 0;
          }
          if (s.exitsDesert) exitSet.add(p.GEOID);
        }
      }
    }

    return {
      helped:    helpedSet.size,
      renters:   renters,
      exits:     exitSet.size,
      remaining: TOTAL_DESERTS - exitSet.size
    };
  }

  // ── Update scenario map layer ──────────────────────────────
  function updateMap() {
    if (!scenLayer) return;
    scenLayer.clearLayers();
    if (!selected.size) return;

    const matching = tractFeatures.filter(ft => {
      const p = ft.properties;
      if (p.is_cooling_desert !== 1) return false;
      return Array.from(selected).some(id => SCEN_MAP[id].checkFn(p));
    });

    if (matching.length) {
      scenLayer.addData({ type: 'FeatureCollection', features: matching });
    }
  }

  // ── Animate a counter ──────────────────────────────────────
  function animateCount(el, target, fmt) {
    const duration = 700;
    const start    = performance.now();
    const tick = now => {
      const t = Math.min((now - start) / duration, 1);
      const v = Math.round((1 - Math.pow(1 - t, 3)) * target);
      el.textContent = fmt(v);
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function fmtNum(v) {
    if (v >= 1e6)  return (v / 1e6).toFixed(2) + 'M';
    if (v >= 1000) return Math.round(v / 1000) + 'K';
    return String(v);
  }

  // ── Update the impact bar ──────────────────────────────────
  function updateBar(exits, remaining) {
    const exPct = (exits    / TOTAL_DESERTS * 100).toFixed(1);
    const rmPct = (remaining / TOTAL_DESERTS * 100).toFixed(1);
    document.getElementById('impact-exits').style.width = exPct + '%';
    document.getElementById('impact-left').style.width  = rmPct + '%';
  }

  // ── Refresh all UI ─────────────────────────────────────────
  function refresh() {
    const { helped, renters, exits, remaining } = computeImpact();
    updateMap();
    animateCount(document.getElementById('count-helped'),    helped,    v => v.toLocaleString());
    animateCount(document.getElementById('count-renters'),   renters,   fmtNum);
    animateCount(document.getElementById('count-remaining'), remaining, v => v.toLocaleString());
    updateBar(exits, remaining);
  }

  // ── Wire toggle buttons ────────────────────────────────────
  function wireToggles() {
    document.querySelectorAll('.scen-btn').forEach(btn => {
      btn.addEventListener('click', () => toggle(btn.dataset.scenario));
    });
  }

  // ── Init ──────────────────────────────────────────────────
  function init() {
    initMap();
    loadData();
    wireToggles();
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();

}());
