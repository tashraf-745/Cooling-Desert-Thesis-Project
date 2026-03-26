// Step 5: Five Typologies — Cluster Profile Cards + D3 Radar Charts

(function () {
  'use strict';

  // ── Cluster data (stats from analysis) ────────────────────
  const CLUSTERS = [
    {
      id: 1, color: '#56B4E9',
      name: 'Low Risk',
      sub: 'Well-resourced neighborhoods',
      summary: 'Higher-income neighborhoods with more green space, better air conditioning access, and enough financial cushion to stay cool during a heat wave.',
      policy: 'Monitor for housing cost increases that could displace lower-income renters into higher-risk areas.',
      pct_desert: '0%', mean_cdi: '15.7', renters: '759K',
      radar: [0.00, 0.00, 0.00, 0.00, 0.00, 0.00]
    },
    {
      id: 2, color: '#F0E442',
      name: 'Financially Stretched',
      sub: 'Rent costs blocking cooling',
      summary: 'Moderate heat danger, but high rent leaves almost nothing for electricity. 1 in 5 renters here owns an air conditioner they cannot afford to run.',
      policy: 'Expand energy assistance programs and ban utility shutoffs during heat emergencies.',
      pct_desert: '4.6%', mean_cdi: '31.6', renters: '1.27M',
      radar: [0.30, 0.69, 0.59, 0.04, 0.31, 0.25]
    },
    {
      id: 3, color: '#E69F00',
      name: 'Language & Heat Barriers',
      sub: 'Immigrant communities at risk',
      summary: 'High heat danger combined with language barriers that make it harder to access emergency cooling information, sign up for assistance programs, or report housing violations.',
      policy: 'Multilingual outreach, cooling site signage in multiple languages, and community health workers in high-risk neighborhoods.',
      pct_desert: '27.0%', mean_cdi: '42.9', renters: '1.14M',
      radar: [0.62, 0.94, 0.79, 0.02, 1.00, 0.16]
    },
    {
      id: 4, color: '#CC79A7',
      name: 'Racial Heat Burden',
      sub: 'Segregation shapes the heat',
      summary: 'The highest concentration of heat-dangerous neighborhoods. Predominantly Black neighborhoods run measurably hotter — a pattern that reflects decades of racial segregation and disinvestment, not just income differences.',
      policy: 'Environmental justice investment, required cooling retrofits for older buildings, and green infrastructure in the most at-risk zones.',
      pct_desert: '46.4%', mean_cdi: '53.7', renters: '922K',
      radar: [1.00, 0.69, 0.68, 1.00, 0.06, 0.28]
    },
    {
      id: 5, color: '#D55E00',
      name: 'Multiple Compounding Barriers',
      sub: 'Everything at once',
      summary: 'Every risk factor hits at the same time — the most dangerous heat levels, the lowest incomes, the highest disability rates, and the fewest cooling options. These neighborhoods need comprehensive support, not a single fix.',
      policy: 'Free AC installation, expanded public cooling sites, emergency rent relief, and removal of public housing AC fees.',
      pct_desert: '58.6%', mean_cdi: '54.1', renters: '1.16M',
      radar: [0.93, 1.00, 1.00, 0.46, 0.56, 1.00]
    }
  ];

  const RADAR_LABELS = ['Heat Danger', 'Rent Cost', 'Income', 'Race', 'Language', 'Disability'];

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
            <div class="kpi"><b>${c.pct_desert}</b><span>in a cooling desert</span></div>
            <div class="kpi"><b>${c.mean_cdi}</b><span>avg. risk score</span></div>
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
