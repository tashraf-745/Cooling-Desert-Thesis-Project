// Step 6: Demographic Evidence — Three Linked D3 Charts

(function () {
  'use strict';

  // ── Chart A data: standardized β from Model 3 (OLS on HVI rank) ──
  const REGRESSION = [
    { label: '% Black residents',    beta:  0.726, sig: true  },
    { label: 'Income (negative)',     beta: -0.321, sig: true  },
    { label: '% Limited English',    beta:  0.110, sig: true  },
    { label: '% Elderly 65+',        beta: -0.109, sig: true  },
    { label: '% Overcrowded renter', beta:  0.098, sig: true  },
    { label: '% Rent burden ≥50%',   beta:  0.070, sig: true  },
    { label: '% Hispanic',           beta:  0.027, sig: false },
    { label: '% Disability',         beta: -0.012, sig: false },
  ];

  // ── Chart B data: borough comparison ─────────────────────────────
  const BOROUGHS = [
    { borough: 'Bronx',         pct_desert: 53.8, mean_cdi: 52.1, income_k: 50  },
    { borough: 'Brooklyn',      pct_desert: 28.7, mean_cdi: 42.1, income_k: 80  },
    { borough: 'Queens',        pct_desert: 16.3, mean_cdi: 38.0, income_k: 89  },
    { borough: 'Staten Island', pct_desert:  7.4, mean_cdi: 28.1, income_k: 99  },
    { borough: 'Manhattan',     pct_desert:  9.3, mean_cdi: 25.9, income_k: 122 },
  ];

  // ── Chart C data: demographics across CDI quintiles ───────────────
  const QUINTILES = [
    { q: 'Q1', black:  4.5, hispanic: 13.8, lep:  4.1, disability:  8.5 },
    { q: 'Q2', black:  7.0, hispanic: 27.0, lep: 12.5, disability: 10.7 },
    { q: 'Q3', black: 13.7, hispanic: 33.4, lep: 18.6, disability: 11.0 },
    { q: 'Q4', black: 34.1, hispanic: 29.4, lep: 13.7, disability: 12.1 },
    { q: 'Q5', black: 54.1, hispanic: 33.0, lep: 10.7, disability: 15.1 },
  ];

  const DEMO_SERIES = [
    { key: 'black',      label: '% Black',    color: '#CC79A7' },
    { key: 'hispanic',   label: '% Hispanic', color: '#E69F00' },
    { key: 'lep',        label: '% Limited English', color: '#56B4E9' },
    { key: 'disability', label: '% Disability', color: '#D55E00' },
  ];

  // ── Chart A: Regression beta weights ─────────────────────────────
  function drawRegression() {
    const el = document.getElementById('chart-regression');
    if (!el) return;

    const m = { top: 10, right: 70, bottom: 30, left: 175 };
    const W = 680, H = REGRESSION.length * 36 + m.top + m.bottom;
    const iw = W - m.left - m.right;
    const ih = H - m.top - m.bottom;

    const svg = d3.select(el).append('svg')
      .attr('viewBox', `0 0 ${W} ${H}`)
      .attr('width', '100%')
      .append('g').attr('transform', `translate(${m.left},${m.top})`);

    const x = d3.scaleLinear().domain([-0.85, 0.85]).range([0, iw]);
    const y = d3.scaleBand().domain(REGRESSION.map(d => d.label)).range([0, ih]).padding(0.35);

    // Grid lines at x-axis ticks
    [-0.75, -0.5, -0.25, 0.25, 0.5, 0.75].forEach(v => {
      svg.append('line')
        .attr('x1', x(v)).attr('x2', x(v)).attr('y1', 0).attr('y2', ih)
        .attr('stroke', '#DEE2E6').attr('stroke-width', 0.5).attr('stroke-dasharray', '3,3');
    });

    // Zero line
    svg.append('line')
      .attr('x1', x(0)).attr('x2', x(0)).attr('y1', 0).attr('y2', ih)
      .attr('stroke', '#1A252F').attr('stroke-width', 1);

    // Bars
    svg.selectAll('rect.bar').data(REGRESSION).join('rect')
      .attr('class', 'bar')
      .attr('x', d => d.beta >= 0 ? x(0) : x(d.beta))
      .attr('y', d => y(d.label))
      .attr('width', d => Math.abs(x(d.beta) - x(0)))
      .attr('height', y.bandwidth())
      .attr('fill', d => !d.sig ? '#D5D8DC' : d.beta > 0 ? '#E07B39' : '#7FB3D3')
      .attr('rx', 2);

    // Value labels
    svg.selectAll('text.val').data(REGRESSION).join('text')
      .attr('class', 'val')
      .attr('x', d => d.beta >= 0 ? x(d.beta) + 5 : x(d.beta) - 5)
      .attr('y', d => y(d.label) + y.bandwidth() / 2)
      .attr('text-anchor', d => d.beta >= 0 ? 'start' : 'end')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', 11).attr('font-family', 'Satoshi, sans-serif')
      .attr('fill', d => d.sig ? '#1A252F' : '#9BA3AE')
      .text(d => (d.beta > 0 ? '+' : '') + d.beta.toFixed(3) + (d.sig ? '' : ' ns'));

    // Y axis
    svg.append('g').call(d3.axisLeft(y).tickSize(0))
      .call(g => g.select('.domain').remove())
      .selectAll('text')
      .attr('font-size', 12).attr('font-family', 'Satoshi, sans-serif')
      .attr('fill', d => { const i = REGRESSION.find(r => r.label === d); return i && !i.sig ? '#9BA3AE' : '#1A252F'; })
      .attr('font-weight', d => d === '% Black residents' ? 'bold' : 'normal');

    // X axis
    svg.append('g').attr('transform', `translate(0,${ih})`)
      .call(d3.axisBottom(x).tickValues([-0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75]).tickSize(3))
      .call(g => g.select('.domain').remove())
      .call(g => g.selectAll('line').attr('stroke', '#DEE2E6'))
      .call(g => g.selectAll('text').attr('font-size', 10).attr('font-family', 'Satoshi, sans-serif').attr('fill', '#9BA3AE'));
  }

  // ── Chart B: Borough comparison (3 linked panels) ─────────────────
  function drawBorough() {
    const el = document.getElementById('chart-borough');
    if (!el) return;

    const panels = [
      { key: 'pct_desert', title: '% in a Cooling Desert', color: '#922B21', fmt: d => d + '%',   max: 60  },
      { key: 'mean_cdi',   title: 'Avg. Heat Risk Score',  color: '#E07B39', fmt: d => d,          max: 60  },
      { key: 'income_k',   title: 'Median Income ($K)',    color: '#7FB3D3', fmt: d => '$' + d + 'K', max: 140 },
    ];

    el.className = 'chart-borough-wrap';

    function highlightBorough(b) {
      d3.selectAll('.b-bar').attr('opacity', d => !b || d.borough === b ? 1 : 0.25);
    }

    panels.forEach(panel => {
      const wrap = document.createElement('div');
      wrap.className = 'chart-b-panel';
      wrap.innerHTML = `<p class="chart-b-title">${panel.title}</p>`;
      el.appendChild(wrap);

      const m = { top: 10, right: 10, bottom: 60, left: 35 };
      const W = 200, H = 220;
      const iw = W - m.left - m.right, ih = H - m.top - m.bottom;

      const svg = d3.select(wrap).append('svg')
        .attr('viewBox', `0 0 ${W} ${H}`)
        .attr('width', '100%')
        .append('g').attr('transform', `translate(${m.left},${m.top})`);

      const x = d3.scaleBand().domain(BOROUGHS.map(d => d.borough)).range([0, iw]).padding(0.25);
      const y = d3.scaleLinear().domain([0, panel.max]).range([ih, 0]);

      // Bars
      svg.selectAll('rect').data(BOROUGHS).join('rect')
        .attr('class', 'b-bar')
        .attr('x', d => x(d.borough))
        .attr('y', d => y(d[panel.key]))
        .attr('width', x.bandwidth())
        .attr('height', d => ih - y(d[panel.key]))
        .attr('fill', panel.color).attr('rx', 2)
        .on('mouseover', (_, d) => highlightBorough(d.borough))
        .on('mouseout', () => highlightBorough(null));

      // Value labels on bars
      svg.selectAll('text.bval').data(BOROUGHS).join('text')
        .attr('class', 'bval')
        .attr('x', d => x(d.borough) + x.bandwidth() / 2)
        .attr('y', d => y(d[panel.key]) - 3)
        .attr('text-anchor', 'middle')
        .attr('font-size', 9).attr('font-family', 'Satoshi, sans-serif').attr('fill', '#1A252F')
        .text(d => panel.fmt(d[panel.key]));

      // X axis labels (rotated)
      svg.append('g').attr('transform', `translate(0,${ih})`)
        .call(d3.axisBottom(x).tickSize(0))
        .call(g => g.select('.domain').attr('stroke', '#DEE2E6'))
        .selectAll('text')
        .attr('font-size', 9).attr('font-family', 'Satoshi, sans-serif').attr('fill', '#4A5568')
        .attr('transform', 'rotate(-35)').attr('text-anchor', 'end').attr('dx', '-4').attr('dy', '4');

      // Y axis (minimal)
      svg.append('g').call(d3.axisLeft(y).ticks(4).tickSize(3))
        .call(g => g.select('.domain').remove())
        .call(g => g.selectAll('line').attr('stroke', '#DEE2E6'))
        .call(g => g.selectAll('text').attr('font-size', 9).attr('font-family', 'Satoshi, sans-serif').attr('fill', '#9BA3AE'));
    });
  }

  // ── Chart C: Demographics across CDI quintiles ────────────────────
  function drawQuintile() {
    const el = document.getElementById('chart-quintile');
    if (!el) return;

    const m = { top: 10, right: 20, bottom: 50, left: 45 };
    const W = 680, H = 280;
    const iw = W - m.left - m.right, ih = H - m.top - m.bottom;

    const svg = d3.select(el).append('svg')
      .attr('viewBox', `0 0 ${W} ${H}`)
      .attr('width', '100%')
      .append('g').attr('transform', `translate(${m.left},${m.top})`);

    const x0 = d3.scaleBand().domain(QUINTILES.map(d => d.q)).range([0, iw]).padding(0.2);
    const x1 = d3.scaleBand().domain(DEMO_SERIES.map(s => s.key)).range([0, x0.bandwidth()]).padding(0.08);
    const y  = d3.scaleLinear().domain([0, 60]).range([ih, 0]);

    // Grid lines
    y.ticks(5).forEach(v => {
      svg.append('line')
        .attr('x1', 0).attr('x2', iw).attr('y1', y(v)).attr('y2', y(v))
        .attr('stroke', '#DEE2E6').attr('stroke-width', 0.5);
    });

    // Bars per quintile per series
    QUINTILES.forEach(qd => {
      const qx = x0(qd.q);
      DEMO_SERIES.forEach(s => {
        svg.append('rect')
          .attr('x', qx + x1(s.key))
          .attr('y', y(qd[s.key]))
          .attr('width', x1.bandwidth())
          .attr('height', ih - y(qd[s.key]))
          .attr('fill', s.color).attr('rx', 2);
      });
    });

    // X axis
    svg.append('g').attr('transform', `translate(0,${ih})`)
      .call(d3.axisBottom(x0).tickSize(0))
      .call(g => g.select('.domain').attr('stroke', '#DEE2E6'))
      .selectAll('text')
      .attr('font-size', 11).attr('font-family', 'Satoshi, sans-serif').attr('fill', '#1A252F').attr('font-weight', 'bold');

    // Y axis
    svg.append('g').call(d3.axisLeft(y).ticks(5).tickFormat(d => d + '%').tickSize(3))
      .call(g => g.select('.domain').remove())
      .call(g => g.selectAll('line').attr('stroke', '#DEE2E6'))
      .call(g => g.selectAll('text').attr('font-size', 10).attr('font-family', 'Satoshi, sans-serif').attr('fill', '#9BA3AE'));

    // Legend
    const legendX = iw / 2 - (DEMO_SERIES.length * 110) / 2;
    DEMO_SERIES.forEach((s, i) => {
      const lx = legendX + i * 110;
      svg.append('rect').attr('x', lx).attr('y', ih + 32).attr('width', 12).attr('height', 12).attr('fill', s.color).attr('rx', 2);
      svg.append('text').attr('x', lx + 16).attr('y', ih + 42)
        .attr('font-size', 11).attr('font-family', 'Satoshi, sans-serif').attr('fill', '#4A5568')
        .text(s.label);
    });
  }

  // ── Init ──────────────────────────────────────────────────────────
  function init() {
    drawRegression();
    drawBorough();
    drawQuintile();
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();

}());
