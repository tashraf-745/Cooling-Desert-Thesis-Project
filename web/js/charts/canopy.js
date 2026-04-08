// Tree Canopy & Shade Equity — Three D3 Charts
// Data source: NYC 2010/2017 Tree Canopy Assessment + CDI analysis

(function () {
  'use strict';

  const DATA_URL = 'data/canopy_data.json';

  // ── Shared tooltip ─────────────────────────────────────────────
  const tip = Object.assign(document.createElement('div'), { className: 'd3-tip canopy-tip' });
  document.body.appendChild(tip);

  function showTip(e, html) {
    tip.innerHTML = html;
    tip.style.display = 'block';
    tip.style.left = (e.pageX + 14) + 'px';
    tip.style.top  = (e.pageY - 10) + 'px';
  }
  function hideTip() { tip.style.display = 'none'; }

  function initCanopyCounters(data) {
    const h = data.headline;
    const el1 = document.querySelector('#can-stat-1');
    const el2 = document.querySelector('#can-stat-2');
    const el3 = document.querySelector('#can-stat-3');
    if (el1) el1.textContent = h.shade_gap.toFixed(1) + '%';
    if (el2) el2.textContent = h.pct_cd_gaining.toFixed(1) + '%';
    if (el3) el3.textContent = h.citywide_mean_2017.toFixed(1) + '%';
  }

  // ── Quintile colors ────────────────────────────────────────────
  const Q_COLORS = ['#EAF2FB','#7FB3D3','#F5C26B','#E07B39','#922B21'];
  const Q_TEXT   = ['#1A252F','#1A252F','#1A252F','#fff','#fff'];

  // ── CHART A: Canopy % by CDI Quintile (horizontal bars + growth dot) ───
  function drawShadeDeficitChart(data) {
    const wrap = document.getElementById('chart-canopy-quintile');
    if (!wrap) return;

    const rows   = data.by_quintile;
    const margin = { top: 30, right: 140, bottom: 50, left: 120 };
    const W      = Math.min(wrap.clientWidth || 700, 750);
    const H      = rows.length * 68 + margin.top + margin.bottom;
    const w      = W - margin.left - margin.right;
    const h      = H - margin.top  - margin.bottom;

    wrap.innerHTML = '';
    const svg = d3.select(wrap).append('svg')
      .attr('width',  W)
      .attr('height', H)
      .attr('viewBox', `0 0 ${W} ${H}`)
      .attr('role', 'img')
      .attr('aria-label', 'Bar chart: tree canopy coverage by heat risk level');

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const xMax = 28;
    const x  = d3.scaleLinear().domain([0, xMax]).range([0, w]);
    const y  = d3.scaleBand().domain(rows.map(d => d.q)).range([0, h]).padding(0.32);

    // Citywide average reference line
    const cityAvg = data.headline.citywide_mean_2017;
    g.append('line')
      .attr('x1', x(cityAvg)).attr('x2', x(cityAvg))
      .attr('y1', -10).attr('y2', h + 10)
      .attr('stroke', '#6B7280').attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '5,4');
    g.append('text')
      .attr('x', x(cityAvg) + 5).attr('y', -14)
      .attr('font-size', '11px').attr('fill', '#6B7280')
      .text(`NYC avg: ${cityAvg}%`);

    // X axis
    g.append('g').attr('transform', `translate(0,${h})`)
      .call(d3.axisBottom(x).tickValues([0,5,10,15,20,25]).tickFormat(d => d + '%'))
      .call(ax => ax.select('.domain').remove())
      .call(ax => ax.selectAll('.tick line').attr('stroke', '#DEE2E6'));

    g.append('text')
      .attr('x', w / 2).attr('y', h + 42)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px').attr('fill', '#6B7280')
      .text('Mean tree canopy coverage (2017)');

    // Y axis labels
    g.append('g').call(d3.axisLeft(y).tickSize(0))
      .call(ax => ax.select('.domain').remove())
      .selectAll('text')
      .attr('font-size', '13px').attr('fill', '#1A252F').attr('dx', '-6');

    // Bars
    g.selectAll('.canopy-bar')
      .data(rows).enter().append('rect')
      .attr('class', 'canopy-bar')
      .attr('x', 0)
      .attr('y',  d => y(d.q))
      .attr('height', y.bandwidth())
      .attr('rx', 4)
      .attr('width', 0)
      .attr('fill', (d, i) => Q_COLORS[i])
      .attr('stroke', (d, i) => i === 0 ? '#C8DFF2' : 'none')
      .on('mouseover', function (event, d) {
        d3.select(this).attr('opacity', 0.85);
        showTip(event,
          `<strong>${d.q}</strong><br/>
           Canopy: <b>${d.mean_canopy_2017.toFixed(1)}%</b><br/>
           Tree growth: <b>+${d.mean_net_change.toFixed(2)}%</b> since 2010<br/>
           Tracts: ${d.n}`
        );
      })
      .on('mousemove', (e) => { tip.style.left = (e.pageX+14)+'px'; tip.style.top = (e.pageY-10)+'px'; })
      .on('mouseout',  function () { d3.select(this).attr('opacity', 1); hideTip(); })
      .transition().duration(800).delay((d, i) => i * 110)
      .attr('width', d => x(d.mean_canopy_2017));

    // Value labels inside bars
    g.selectAll('.bar-label')
      .data(rows).enter().append('text')
      .attr('class', 'bar-label')
      .attr('y', d => y(d.q) + y.bandwidth() / 2 + 4.5)
      .attr('font-size', '12px').attr('font-weight', '600')
      .attr('fill', (d, i) => Q_TEXT[i])
      .attr('opacity', 0)
      .text(d => d.mean_canopy_2017.toFixed(1) + '%')
      .transition().duration(800).delay((d, i) => i * 110 + 400)
      .attr('x', d => Math.max(x(d.mean_canopy_2017) - 38, 4))
      .attr('opacity', 1);

    // Growth dots (right side)
    const dotX = d => w + 28 + (d.mean_net_change / 3.5) * 80;

    g.append('text')
      .attr('x', w + 28).attr('y', -12)
      .attr('font-size', '11px').attr('fill', '#27AE60')
      .attr('font-weight', '600')
      .text('Tree growth →');

    g.selectAll('.growth-dot')
      .data(rows).enter().append('circle')
      .attr('class', 'growth-dot')
      .attr('cx', d => dotX(d))
      .attr('cy', d => y(d.q) + y.bandwidth() / 2)
      .attr('r',  0)
      .attr('fill', '#27AE60')
      .attr('opacity', 0.85)
      .on('mouseover', (event, d) => {
        showTip(event,
          `<strong>${d.q}</strong><br/>
           Growth since 2010: <b>+${d.mean_net_change.toFixed(2)}%</b>`
        );
      })
      .on('mousemove', (e) => { tip.style.left = (e.pageX+14)+'px'; tip.style.top = (e.pageY-10)+'px'; })
      .on('mouseout', hideTip)
      .transition().duration(600).delay((d, i) => i * 110 + 500)
      .attr('r', d => 4 + d.mean_net_change * 2.5);

    g.selectAll('.growth-label')
      .data(rows).enter().append('text')
      .attr('class', 'growth-label')
      .attr('x', d => dotX(d) + 12)
      .attr('y', d => y(d.q) + y.bandwidth() / 2 + 4.5)
      .attr('font-size', '11px').attr('fill', '#1A6B3A')
      .attr('opacity', 0)
      .text(d => '+' + d.mean_net_change.toFixed(2) + '%')
      .transition().duration(600).delay((d, i) => i * 110 + 700)
      .attr('opacity', 1);
  }

  // ── CHART B: Scatter — CDI vs Canopy Coverage ─────────────────
  function drawCanopyScatter(data) {
    const wrap = document.getElementById('chart-canopy-scatter');
    if (!wrap) return;

    const pts    = data.scatter;
    const margin = { top: 30, right: 30, bottom: 60, left: 60 };
    const W      = Math.min(wrap.clientWidth || 700, 720);
    const H      = 380;
    const w      = W - margin.left - margin.right;
    const h      = H - margin.top  - margin.bottom;

    wrap.innerHTML = '';
    const svg = d3.select(wrap).append('svg')
      .attr('width', W).attr('height', H)
      .attr('viewBox', `0 0 ${W} ${H}`)
      .attr('role', 'img')
      .attr('aria-label', 'Scatter plot: CDI score vs tree canopy coverage');

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([0, d3.max(pts, d => d.c) * 1.05]).range([0, w]);
    const y = d3.scaleLinear().domain([0, d3.max(pts, d => d.t) * 1.1]).range([h, 0]);

    // Grid
    g.append('g').attr('class', 'grid')
      .call(d3.axisLeft(y).tickSize(-w).tickFormat(''))
      .call(ax => ax.select('.domain').remove())
      .selectAll('line').attr('stroke', '#F0F2F4');

    // Axes
    g.append('g').attr('transform', `translate(0,${h})`)
      .call(d3.axisBottom(x).ticks(6))
      .call(ax => ax.select('.domain').attr('stroke', '#DEE2E6'))
      .selectAll('text').attr('font-size', '11px');

    g.append('g').call(d3.axisLeft(y).ticks(6).tickFormat(d => d + '%'))
      .call(ax => ax.select('.domain').attr('stroke', '#DEE2E6'))
      .selectAll('text').attr('font-size', '11px');

    // Axis labels
    g.append('text')
      .attr('x', w / 2).attr('y', h + 48)
      .attr('text-anchor', 'middle').attr('font-size', '12px').attr('fill', '#6B7280')
      .text('Cooling Desert Index (CDI) — higher = more vulnerable');

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -h / 2).attr('y', -46)
      .attr('text-anchor', 'middle').attr('font-size', '12px').attr('fill', '#6B7280')
      .text('Tree canopy coverage (2017)');

    // Trend line (simple linear regression)
    const n   = pts.length;
    const mx  = d3.mean(pts, d => d.c);
    const my  = d3.mean(pts, d => d.t);
    const num = d3.sum(pts, d => (d.c - mx) * (d.t - my));
    const den = d3.sum(pts, d => (d.c - mx) ** 2);
    const slope = num / den;
    const inter = my - slope * mx;
    const xExt  = d3.extent(pts, d => d.c);
    g.append('line')
      .attr('x1', x(xExt[0])).attr('y1', y(inter + slope * xExt[0]))
      .attr('x2', x(xExt[1])).attr('y2', y(inter + slope * xExt[1]))
      .attr('stroke', '#6B7280').attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4,3').attr('opacity', 0.6);

    // Color: cooling desert vs not
    const colorCD  = '#922B21';
    const colorOK  = '#7FB3D3';

    // Dots — deserts below, non-deserts above so deserts show on top
    const sorted = [...pts].sort((a, b) => a.d - b.d);
    g.selectAll('.scatter-dot')
      .data(sorted).enter().append('circle')
      .attr('class', 'scatter-dot')
      .attr('cx', d => x(d.c))
      .attr('cy', d => y(d.t))
      .attr('r',  3.5)
      .attr('fill',    d => d.d ? colorCD : colorOK)
      .attr('opacity', d => d.d ? 0.75 : 0.45)
      .attr('stroke',  d => d.d ? '#6B1A14' : 'none')
      .attr('stroke-width', 0.5)
      .style('cursor', 'pointer')
      .on('mouseover', function (event, d) {
        d3.select(this).attr('r', 6).attr('opacity', 1);
        showTip(event,
          `<strong>${d.b}</strong><br/>
           CDI: <b>${d.c.toFixed(1)}</b><br/>
           Canopy: <b>${d.t.toFixed(1)}%</b><br/>
           Growth: <b>+${d.n.toFixed(2)}%</b><br/>
           ${d.d ? '<span style="color:#C0392B">⬤ Cooling desert</span>' : '<span style="color:#2471A3">⬤ Not a cooling desert</span>'}`
        );
      })
      .on('mousemove', (e) => { tip.style.left = (e.pageX+14)+'px'; tip.style.top = (e.pageY-10)+'px'; })
      .on('mouseout',  function (event, d) {
        d3.select(this).attr('r', 3.5).attr('opacity', d.d ? 0.75 : 0.45);
        hideTip();
      });

    // Legend
    const leg = g.append('g').attr('transform', `translate(${w - 160}, 10)`);
    [[colorCD, 'Cooling desert'], [colorOK, 'Not a cooling desert']].forEach(([col, label], i) => {
      const row = leg.append('g').attr('transform', `translate(0,${i * 22})`);
      row.append('circle').attr('r', 5).attr('fill', col).attr('cy', 0).attr('cx', 0);
      row.append('text').attr('x', 10).attr('y', 4.5)
        .attr('font-size', '12px').attr('fill', '#1A252F')
        .text(label);
    });
  }

  // ── CHART C: Borough bars — canopy + desert share ─────────────
  function drawBoroughCanopyChart(data) {
    const wrap = document.getElementById('chart-canopy-borough');
    if (!wrap) return;

    const rows   = data.by_borough;
    const margin = { top: 20, right: 40, bottom: 60, left: 110 };
    const W      = Math.min(wrap.clientWidth || 700, 720);
    const H      = rows.length * 62 + margin.top + margin.bottom;
    const w      = W - margin.left - margin.right;
    const h      = H - margin.top  - margin.bottom;

    wrap.innerHTML = '';
    const svg = d3.select(wrap).append('svg')
      .attr('width',  W).attr('height', H)
      .attr('viewBox', `0 0 ${W} ${H}`)
      .attr('role', 'img')
      .attr('aria-label', 'Grouped bar chart: tree canopy and cooling desert share by borough');

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const boroughs = rows.map(d => d.borough);
    const subgroups = ['mean_canopy_2017', 'pct_desert'];
    const labels    = { mean_canopy_2017: 'Tree canopy', pct_desert: 'Cooling desert share' };
    const colors    = { mean_canopy_2017: '#27AE60', pct_desert: '#E07B39' };

    const xMax = Math.max(
      d3.max(rows, d => d.mean_canopy_2017),
      d3.max(rows, d => d.pct_desert)
    ) * 1.2;

    const x  = d3.scaleLinear().domain([0, xMax]).range([0, w]);
    const y0 = d3.scaleBand().domain(boroughs).range([0, h]).paddingInner(0.28).paddingOuter(0.1);
    const y1 = d3.scaleBand().domain(subgroups).range([0, y0.bandwidth()]).padding(0.1);

    // X axis
    g.append('g').attr('transform', `translate(0,${h})`)
      .call(d3.axisBottom(x).ticks(6).tickFormat(d => d + '%'))
      .call(ax => ax.select('.domain').remove())
      .selectAll('text').attr('font-size', '11px');

    g.append('text')
      .attr('x', w / 2).attr('y', h + 50)
      .attr('text-anchor', 'middle').attr('font-size', '12px').attr('fill', '#6B7280')
      .text('Percentage');

    // Y axis
    g.append('g').call(d3.axisLeft(y0).tickSize(0))
      .call(ax => ax.select('.domain').remove())
      .selectAll('text').attr('font-size', '13px').attr('fill', '#1A252F').attr('dx', '-6');

    // Gridlines
    g.append('g').attr('class', 'grid')
      .call(d3.axisBottom(x).tickSize(h).tickFormat('').ticks(6))
      .attr('transform', 'translate(0,0)')
      .call(ax => ax.select('.domain').remove())
      .selectAll('line').attr('stroke', '#F0F2F4').attr('y1', 0).attr('y2', h);

    // Borough groups
    const borough_g = g.selectAll('.borough-group')
      .data(rows).enter().append('g')
      .attr('class', 'borough-group')
      .attr('transform', d => `translate(0,${y0(d.borough)})`);

    borough_g.selectAll('.sub-bar')
      .data(d => subgroups.map(key => ({ key, value: d[key], borough: d.borough })))
      .enter().append('rect')
      .attr('class', 'sub-bar')
      .attr('y', d => y1(d.key))
      .attr('height', y1.bandwidth())
      .attr('rx', 3)
      .attr('x', 0)
      .attr('width', 0)
      .attr('fill', d => colors[d.key])
      .attr('opacity', 0.88)
      .on('mouseover', function (event, d) {
        d3.select(this).attr('opacity', 1);
        showTip(event,
          `<strong>${d.borough}</strong><br/>
           ${labels[d.key]}: <b>${d.value.toFixed(1)}%</b>`
        );
      })
      .on('mousemove', (e) => { tip.style.left = (e.pageX+14)+'px'; tip.style.top = (e.pageY-10)+'px'; })
      .on('mouseout',  function () { d3.select(this).attr('opacity', 0.88); hideTip(); })
      .transition().duration(700).delay((d, i) => Math.floor(i / 2) * 90 + (i % 2) * 45)
      .attr('width', d => x(d.value));

    // Value labels
    borough_g.selectAll('.sub-label')
      .data(d => subgroups.map(key => ({ key, value: d[key] })))
      .enter().append('text')
      .attr('class', 'sub-label')
      .attr('y', d => y1(d.key) + y1.bandwidth() / 2 + 4)
      .attr('font-size', '11px').attr('fill', '#fff').attr('font-weight', '600')
      .attr('opacity', 0)
      .text(d => d.value.toFixed(1) + '%')
      .transition().duration(700).delay((d, i) => Math.floor(i / 2) * 90 + 300)
      .attr('x', d => Math.max(x(d.value) - 36, 4))
      .attr('opacity', 1);

    // Legend
    const leg = g.append('g').attr('transform', `translate(${w - 200}, -5)`);
    subgroups.forEach((key, i) => {
      const row = leg.append('g').attr('transform', `translate(0,${i * 20})`);
      row.append('rect').attr('width', 12).attr('height', 12).attr('rx', 2).attr('fill', colors[key]);
      row.append('text').attr('x', 16).attr('y', 10)
        .attr('font-size', '11px').attr('fill', '#1A252F')
        .text(labels[key]);
    });
  }

  // ── MAIN ───────────────────────────────────────────────────────
  fetch(DATA_URL)
    .then(r => r.json())
    .then(data => {
      drawShadeDeficitChart(data);
      drawCanopyScatter(data);
      drawBoroughCanopyChart(data);
      initCanopyCounters(data);
    })
    .catch(err => console.error('[canopy.js] fetch error:', err));

}());
