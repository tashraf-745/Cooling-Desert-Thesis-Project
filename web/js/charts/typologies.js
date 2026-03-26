// Step 5: Five Typologies — Cluster Profile Cards + D3 Radar Charts

(function () {
  'use strict';

  // ── Cluster data (stats from analysis) ────────────────────
  const CLUSTERS = [
    {
      id: 1, color: '#56B4E9',
      name: 'Low Risk',
      sub: 'Affluent & Low Exposure',
      summary: 'Affluent tracts with low heat exposure and strong adaptive capacity. High AC ownership, green space, and income buffer heat risk.',
      policy: 'Monitor for climate displacement pressure as housing costs rise.',
      pct_desert: '0%', mean_cdi: '15.7', renters: '759K',
      radar: [0.00, 0.00, 0.00, 0.00, 0.00, 0.00]
    },
    {
      id: 2, color: '#F0E442',
      name: 'Financially Strained',
      sub: 'Moderate Risk',
      summary: 'Moderate heat exposure where high rent burden limits AC use. 21% of renters with AC do not use it due to electricity cost.',
      policy: 'Expand LIHEAP eligibility and enact utility disconnect protections during heat emergencies.',
      pct_desert: '4.6%', mean_cdi: '31.6', renters: '1.27M',
      radar: [0.30, 0.69, 0.59, 0.04, 0.31, 0.25]
    },
    {
      id: 3, color: '#E69F00',
      name: 'Immigrant Heat Burden',
      sub: 'High Risk',
      summary: 'Elevated LEP populations face language barriers to emergency communications, cooling program enrollment, and tenant rights enforcement.',
      policy: 'Multilingual outreach, language-accessible cooling site signage, and community health worker programs.',
      pct_desert: '27.0%', mean_cdi: '42.9', renters: '1.14M',
      radar: [0.62, 0.94, 0.79, 0.02, 1.00, 0.16]
    },
    {
      id: 4, color: '#CC79A7',
      name: 'Racial Heat Burden',
      sub: 'High Risk',
      summary: 'Highest HVI concentration. Race predicts surface temperature independently of income — +0.43°F per 1% increase in Black residents.',
      policy: 'Environmental justice investment, mandatory cooling retrofits, and green infrastructure in high-HVI zones.',
      pct_desert: '46.4%', mean_cdi: '53.7', renters: '922K',
      radar: [1.00, 0.69, 0.68, 1.00, 0.06, 0.28]
    },
    {
      id: 5, color: '#D55E00',
      name: 'Compound Deprivation',
      sub: 'Extreme Risk',
      summary: 'All risk factors elevated simultaneously — highest CDI, lowest incomes, highest disability rates, and concentrated spatial clustering.',
      policy: 'Comprehensive intervention: free AC installation, expanded cooling sites, emergency rent relief, and NYCHA surcharge removal.',
      pct_desert: '58.6%', mean_cdi: '54.1', renters: '1.16M',
      radar: [0.93, 1.00, 1.00, 0.46, 0.56, 1.00]
    }
  ];

  const RADAR_LABELS = ['HVI', 'Rent', 'Income', 'Race', 'LEP', 'Disab.'];

  // ── Build card DOM ─────────────────────────────────────────
  function buildCards() {
    const track = document.getElementById('cards-track');
    if (!track) return;

    CLUSTERS.forEach(c => {
      const card = document.createElement('article');
      card.className = 'cluster-card';
      card.dataset.cluster = c.id;
      card.innerHTML = `
        <div class="card-stripe" style="background:${c.color}"></div>
        <div class="card-inner">
          <div class="card-top">
            <span class="card-num" style="background:${c.color}">0${c.id}</span>
            <h3 class="card-name">${c.name}</h3>
            <p class="card-sub">${c.sub}</p>
          </div>
          <p class="card-summary">${c.summary}</p>
          <svg id="radar-${c.id}" class="radar-svg" viewBox="0 0 200 200" aria-hidden="true"></svg>
          <div class="card-kpis">
            <div class="kpi"><b>${c.pct_desert}</b><span>cooling deserts</span></div>
            <div class="kpi"><b>${c.mean_cdi}</b><span>mean CDI</span></div>
            <div class="kpi"><b>${c.renters}</b><span>renters</span></div>
          </div>
          <p class="card-policy">${c.policy}</p>
          <button class="show-map-btn" data-cluster="${c.id}">Show on map ↗</button>
        </div>`;
      track.appendChild(card);
    });
  }

  // ── Draw radar chart ───────────────────────────────────────
  function drawRadar(id, values, color) {
    const svg = d3.select('#' + id);
    if (svg.empty()) return;

    const cx = 100, cy = 100, r = 60;
    const n = values.length;
    const angle = i => (Math.PI * 2 * i / n) - Math.PI / 2;

    // Grid rings
    [0.25, 0.5, 0.75, 1].forEach(t => {
      svg.append('circle')
        .attr('cx', cx).attr('cy', cy).attr('r', r * t)
        .attr('fill', 'none').attr('stroke', '#DEE2E6').attr('stroke-width', 0.5);
    });

    // Axes and labels
    RADAR_LABELS.forEach((label, i) => {
      const a = angle(i);
      svg.append('line')
        .attr('x1', cx).attr('y1', cy)
        .attr('x2', cx + r * Math.cos(a)).attr('y2', cy + r * Math.sin(a))
        .attr('stroke', '#DEE2E6').attr('stroke-width', 0.5);
      svg.append('text')
        .attr('x', cx + (r + 15) * Math.cos(a))
        .attr('y', cy + (r + 15) * Math.sin(a))
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
        .attr('font-size', '9').attr('fill', '#9BA3AE')
        .text(label);
    });

    // Data polygon
    const pts = values.map((v, i) => {
      const a = angle(i);
      return (cx + r * v * Math.cos(a)) + ',' + (cy + r * v * Math.sin(a));
    }).join(' ');

    svg.append('polygon')
      .attr('points', pts)
      .attr('fill', color).attr('fill-opacity', 0.28)
      .attr('stroke', color).attr('stroke-width', 2);
  }

  // ── Show on map ────────────────────────────────────────────
  function bindButtons() {
    document.querySelectorAll('.show-map-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        document.dispatchEvent(new CustomEvent('filterCluster', { detail: +this.dataset.cluster }));
        document.getElementById('map').scrollIntoView({ behavior: 'smooth' });
      });
    });
  }

  // ── Init ──────────────────────────────────────────────────
  function init() {
    buildCards();
    CLUSTERS.forEach(c => drawRadar('radar-' + c.id, c.radar, c.color));
    bindButtons();
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();

}());
