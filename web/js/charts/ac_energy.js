// AC Access & Energy Burden — Redesigned Interactive Charts
// Data: DOE LEAD Tool + NYCHVS 2021

(function () {
  'use strict';

  const DATA_URL = 'data/ac_energy_data.json';

  // ── Shared tooltip ─────────────────────────────────────────────
  const tip = Object.assign(document.createElement('div'), { className: 'd3-tip' });
  document.body.appendChild(tip);
  function showTip(e, html) {
    tip.innerHTML = html;
    tip.style.display = 'block';
    tip.style.left = (e.pageX + 16) + 'px';
    tip.style.top  = (e.pageY - 12) + 'px';
  }
  function moveTip(e) {
    tip.style.left = (e.pageX + 16) + 'px';
    tip.style.top  = (e.pageY - 12) + 'px';
  }
  function hideTip() { tip.style.display = 'none'; }

  function initCounters(data) {
    const h = data.headline;
    const el1 = document.querySelector('#ac-stat-1');
    const el2 = document.querySelector('#ac-stat-2');
    const el3 = document.querySelector('#ac-stat-3');
    if (el1) el1.textContent = h.pct_renters_cant_afford_ac + '%';
    if (el2) el2.textContent = h.nyc_mean_eb_very_low_income + '%';
    if (el3) el3.textContent = h.double_burden_tracts.toLocaleString();
  }


  // ══════════════════════════════════════════════════════════════
  // CHART A — Energy Cost Danger Zones
  // Background spectrum: Safe → High → Severe burden
  // Each rent-burden category as a bar with animated marker
  // ══════════════════════════════════════════════════════════════
  function drawEnergyBurdenChart(data) {
    const wrap = document.getElementById('chart-energy-burden');
    if (!wrap) return;

    const rows   = data.eb_by_burden;
    const W      = Math.min(wrap.clientWidth || 760, 760);
    const margin = { top: 60, right: 30, bottom: 50, left: 220 };
    const w      = W - margin.left - margin.right;
    const rowH   = 62;
    const H      = rows.length * rowH + margin.top + margin.bottom;

    wrap.innerHTML = '';
    const svg = d3.select(wrap).append('svg')
      .attr('width', W).attr('height', H)
      .attr('viewBox', `0 0 ${W} ${H}`)
      .attr('role', 'img')
      .attr('aria-label', 'Energy burden by rent burden category');

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const xMax = 13;
    const x = d3.scaleLinear().domain([0, xMax]).range([0, w]);
    const y = d3.scaleBand()
      .domain(rows.map(d => d.label))
      .range([0, rows.length * rowH])
      .paddingInner(0.38).paddingOuter(0.1);

    // ── Zone backgrounds ─────────────────────────────────────────
    const zones = [
      { x1: 0,    x2: 6,    label: 'SAFE',   fill: '#E8F8EF', textFill: '#27AE60' },
      { x1: 6,    x2: 10,   label: 'HIGH',   fill: '#FFF4E0', textFill: '#D68910' },
      { x1: 10,   x2: xMax, label: 'SEVERE', fill: '#FDECEA', textFill: '#C0392B' },
    ];
    zones.forEach(z => {
      g.append('rect')
        .attr('x', x(z.x1)).attr('width', x(z.x2) - x(z.x1))
        .attr('y', -10).attr('height', rows.length * rowH + 10)
        .attr('fill', z.fill).attr('rx', 2);
      g.append('text')
        .attr('x', (x(z.x1) + x(z.x2)) / 2).attr('y', -16)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px').attr('font-weight', '700')
        .attr('letter-spacing', '0.08em')
        .attr('fill', z.textFill)
        .text(z.label + ' ZONE');
    });

    // Zone divider lines
    [6, 10].forEach(v => {
      g.append('line')
        .attr('x1', x(v)).attr('x2', x(v))
        .attr('y1', -10).attr('y2', rows.length * rowH + 5)
        .attr('stroke', '#CBD5E0').attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '5,3');
    });

    // ── X axis ───────────────────────────────────────────────────
    g.append('g').attr('transform', `translate(0,${rows.length * rowH + 8})`)
      .call(d3.axisBottom(x).tickValues([0, 2, 4, 6, 8, 10, 12]).tickFormat(d => d + '%'))
      .call(ax => ax.select('.domain').remove())
      .call(ax => ax.selectAll('.tick line').attr('stroke', '#CBD5E0'))
      .selectAll('text').attr('font-size', '11px').attr('fill', '#6B7280');

    g.append('text')
      .attr('x', w / 2).attr('y', rows.length * rowH + 44)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px').attr('fill', '#6B7280')
      .text('Energy costs as % of household income');

    // ── Y axis labels ─────────────────────────────────────────────
    rows.forEach(d => {
      const cy = y(d.label) + y.bandwidth() / 2;
      // Color swatch
      g.append('rect')
        .attr('x', -210).attr('y', cy - 8)
        .attr('width', 10).attr('height', 16)
        .attr('rx', 2).attr('fill', d.color);
      // Label text (two lines for long labels)
      const parts = d.label.split(' (');
      g.append('text')
        .attr('x', -195).attr('y', parts[1] ? cy - 3 : cy + 4)
        .attr('text-anchor', 'start')
        .attr('font-size', '12.5px').attr('font-weight', '600')
        .attr('fill', '#1A252F')
        .text(parts[0]);
      if (parts[1]) {
        g.append('text')
          .attr('x', -195).attr('y', cy + 12)
          .attr('text-anchor', 'start')
          .attr('font-size', '10.5px').attr('fill', '#6B7280')
          .text('(' + parts[1]);
      }
    });

    // ── Track lines ───────────────────────────────────────────────
    rows.forEach(d => {
      g.append('line')
        .attr('x1', 0).attr('x2', w)
        .attr('y1', y(d.label) + y.bandwidth() / 2)
        .attr('y2', y(d.label) + y.bandwidth() / 2)
        .attr('stroke', '#E2E8F0').attr('stroke-width', 2);
    });

    // ── Bars ──────────────────────────────────────────────────────
    const bars = g.selectAll('.eb-bar')
      .data(rows).enter().append('rect')
      .attr('class', 'eb-bar')
      .attr('x', 0)
      .attr('y', d => y(d.label) + y.bandwidth() * 0.2)
      .attr('height', y.bandwidth() * 0.6)
      .attr('rx', 4)
      .attr('fill', d => d.color)
      .attr('width', 0)
      .style('cursor', 'pointer')
      .on('mouseover', function (e, d) {
        d3.select(this).attr('opacity', 0.9);
        showTip(e, `
          <div style="font-weight:700;font-size:13px;margin-bottom:6px">${d.label}</div>
          <div>⚡ Energy burden: <b>${d.mean_pct}%</b> of income</div>
          <div>☀️ Summer utility bill: <b>$${d.summer_util}/mo</b></div>
          <hr style="border:none;border-top:1px solid rgba(255,255,255,0.25);margin:6px 0">
          <div style="font-size:11px">${d.pct_above_10}% of households<br>in this group exceed the severe threshold</div>
        `);
      })
      .on('mousemove', moveTip)
      .on('mouseout', function () { d3.select(this).attr('opacity', 1); hideTip(); });

    bars.transition().duration(900).delay((_, i) => i * 130)
      .attr('width', d => x(d.mean_pct));

    // ── Endpoint circles (animated) ───────────────────────────────
    const circles = g.selectAll('.eb-circle')
      .data(rows).enter().append('circle')
      .attr('class', 'eb-circle')
      .attr('cy', d => y(d.label) + y.bandwidth() / 2)
      .attr('r', 16)
      .attr('fill', d => d.color)
      .attr('cx', 0)
      .style('cursor', 'pointer')
      .on('mouseover', function (e, d) {
        d3.select(this).attr('r', 18);
        showTip(e, `
          <div style="font-weight:700;font-size:13px;margin-bottom:6px">${d.label}</div>
          <div>⚡ Energy burden: <b>${d.mean_pct}%</b> of income</div>
          <div>☀️ Summer utility bill: <b>$${d.summer_util}/mo</b></div>
          <hr style="border:none;border-top:1px solid rgba(255,255,255,0.25);margin:6px 0">
          <div style="font-size:11px">${d.pct_above_10}% of households<br>in this group exceed the severe threshold</div>
        `);
      })
      .on('mousemove', moveTip)
      .on('mouseout', function () { d3.select(this).attr('r', 16); hideTip(); });

    circles.transition().duration(900).delay((_, i) => i * 130)
      .attr('cx', d => x(d.mean_pct));

    // Value text inside circles
    const valText = g.selectAll('.eb-val')
      .data(rows).enter().append('text')
      .attr('class', 'eb-val')
      .attr('cy', d => y(d.label) + y.bandwidth() / 2)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', '11px').attr('font-weight', '700')
      .attr('fill', '#fff')
      .attr('x', 0)
      .attr('y', d => y(d.label) + y.bandwidth() / 2)
      .text(d => d.mean_pct + '%')
      .style('pointer-events', 'none');

    valText.transition().duration(900).delay((_, i) => i * 130)
      .attr('x', d => x(d.mean_pct));

    // ── DOE threshold labels at top ───────────────────────────────
    svg.append('text')
      .attr('x', margin.left + x(6) - 4).attr('y', margin.top - 36)
      .attr('text-anchor', 'end').attr('font-size', '9.5px').attr('fill', '#D68910')
      .text('DOE 6% threshold →');
    svg.append('text')
      .attr('x', margin.left + x(10) - 4).attr('y', margin.top - 36)
      .attr('text-anchor', 'end').attr('font-size', '9.5px').attr('fill', '#C0392B')
      .text('DOE 10% severe →');
  }


  // ══════════════════════════════════════════════════════════════
  // CHART B — "Your Dollar" Budget Waffle
  // 100 squares = 100¢ of every dollar earned
  // Toggle between 4 rent-burden scenarios
  // ══════════════════════════════════════════════════════════════
  function drawBudgetWaffle() {
    const container = document.getElementById('chart-budget-waffle');
    if (!container) return;

    const SCENARIOS = [
      {
        key:       'severely_burdened',
        label:     'Severely Rent-Burdened',
        sublabel:  '>50% of income on rent',
        income:    20000,
        rent_pct:  55,
        util_pct:  10.3,
        color:     '#922B21',
        note:      'After rent and energy, under $580/month is left for food, transit, childcare, and everything else.'
      },
      {
        key:      'means_tested',
        label:    'NYCHA / Voucher Holder',
        sublabel: 'Subsidized rent — still energy insecure',
        income:   22000,
        rent_pct: 30,
        util_pct: 8.1,
        color:    '#7D3C98',
        note:     '1 in 3 NYCHA residents say the monthly AC surcharge is a real barrier to staying cool.'
      },
      {
        key:      'moderately_burdened',
        label:    'Moderately Rent-Burdened',
        sublabel: '30–50% of income on rent',
        income:   45000,
        rent_pct: 38,
        util_pct: 4.5,
        color:    '#E07B39',
        note:     'Rent and energy together consume over 40% of income — running AC through August means real trade-offs.'
      },
      {
        key:      'not_burdened',
        label:    'Not Rent-Burdened',
        sublabel: '≤30% of income on rent',
        income:   85000,
        rent_pct: 22,
        util_pct: 2.4,
        color:    '#27AE60',
        note:     'Energy is a small fraction of income. Running the AC on a hot day is a non-decision.'
      },
    ];

    let activeIdx = 0;

    // ── Build scenario card buttons ───────────────────────────────
    const btnRow = container.querySelector('.waffle-btns');
    SCENARIOS.forEach((s, i) => {
      const btn = document.createElement('button');
      btn.className = 'waffle-btn' + (i === 0 ? ' active' : '');
      btn.style.setProperty('--btn-color', s.color);
      btn.innerHTML = `
        <span class="wb-swatch" style="background:${s.color}"></span>
        <span class="wb-text">
          <span class="wb-label">${s.label}</span>
          <span class="wb-sub">${s.sublabel}</span>
        </span>
      `;
      btn.addEventListener('click', () => {
        if (activeIdx === i) return;
        activeIdx = i;
        btnRow.querySelectorAll('.waffle-btn').forEach((b, j) => b.classList.toggle('active', j === i));
        updateWaffle(SCENARIOS[i]);
      });
      btnRow.appendChild(btn);
    });

    // ── Build waffle grid ─────────────────────────────────────────
    const wrapEl  = container.querySelector('.waffle-grid');
    const noteEl  = container.querySelector('.waffle-note');
    const statsEl = container.querySelector('.waffle-stats');

    const CELL_SIZE = 34;

    // Legend row above the grid
    const legend = document.createElement('div');
    legend.className = 'waffle-legend';
    legend.innerHTML = `
      <span class="wl-item"><span class="wl-sq wl-sq--rent"></span>Rent</span>
      <span class="wl-item"><span class="wl-sq" style="background:#F5C26B"></span>Energy</span>
      <span class="wl-item"><span class="wl-sq" style="background:#E2E8F0"></span>Everything else</span>
      <span class="wl-note">Each square = 1% of your annual income</span>
    `;
    wrapEl.parentNode.insertBefore(legend, wrapEl);

    const cells = Array.from({ length: 100 }, (_, i) => {
      const cell = document.createElement('div');
      cell.className = 'waffle-cell';
      cell.style.width  = CELL_SIZE + 'px';
      cell.style.height = CELL_SIZE + 'px';
      cell.title = `Cell ${i + 1}/100 — represents 1¢ of every dollar earned`;
      wrapEl.appendChild(cell);
      return cell;
    });

    // ── Update waffle on scenario change ─────────────────────────
    function updateWaffle(s) {
      const rentEnd = Math.round(s.rent_pct);
      const utilEnd = rentEnd + Math.round(s.util_pct);
      const remaining = (s.income * (1 - s.rent_pct / 100 - s.util_pct / 100) / 12);

      cells.forEach((cell, i) => {
        cell.classList.remove('w-rent', 'w-util', 'w-free');
        cell.style.removeProperty('--cell-rent-color');
        const delay = i * 5;
        setTimeout(() => {
          if (i < rentEnd) {
            cell.classList.add('w-rent');
            cell.style.setProperty('--cell-rent-color', s.color);
            cell.title = `Rent — this is cent ${i + 1} of every dollar you earn`;
          } else if (i < utilEnd) {
            cell.classList.add('w-util');
            cell.title = `Energy — this is cent ${i + 1} of every dollar you earn`;
          } else {
            cell.classList.add('w-free');
            cell.title = `Available — this is cent ${i + 1} of every dollar you earn`;
          }
        }, delay);
      });

      noteEl.textContent = s.note;

      statsEl.innerHTML = `
        <div class="wstat" style="border-color:${s.color}">
          <div class="wstat-label">Rent</div>
          <div class="wstat-value" style="color:${s.color}">${s.rent_pct}%</div>
          <div class="wstat-sub">$${(s.income * s.rent_pct / 100 / 12).toFixed(0)}/month</div>
        </div>
        <div class="wstat" style="border-color:#D68910">
          <div class="wstat-label">Energy</div>
          <div class="wstat-value" style="color:#D68910">${Math.round(s.util_pct)}%</div>
          <div class="wstat-sub">$${(s.income * s.util_pct / 100 / 12).toFixed(0)}/month</div>
        </div>
        <div class="wstat" style="border-color:#4A5568">
          <div class="wstat-label">Left for everything else</div>
          <div class="wstat-value">${Math.round(100 - s.rent_pct - s.util_pct)}%</div>
          <div class="wstat-sub">$${remaining.toFixed(0)}/month</div>
        </div>
        <div class="wstat-income">Annual income: <b>$${s.income.toLocaleString()}</b></div>
      `;

      // Update color variable on container so legend swatch also updates
      container.style.setProperty('--active-color', s.color);
      wrapEl.style.setProperty('--active-color', s.color);
    }

    updateWaffle(SCENARIOS[0]);
  }


  // ══════════════════════════════════════════════════════════════
  // CHART C — Effective Cooling Access (stacked)
  // Three segments per HVI rank:
  //   ① Has AC + can afford to run it  (effective access)
  //   ② Has AC but CAN'T afford to run it  (stranded)
  //   ③ No AC at all
  // ══════════════════════════════════════════════════════════════
  function drawACOwnershipChart(data) {
    const wrap = document.getElementById('chart-ac-ownership');
    if (!wrap) return;

    const PCT_CANT_RUN = 21; // 21% of AC owners can't afford to run it (NYC Comptroller 2022)

    const rows = data.hvi_ac_by_rank.map(d => {
      const hasAC      = d.mean_ac_pct;
      const stranded   = +(hasAC * PCT_CANT_RUN / 100).toFixed(1);
      const effective  = +(hasAC - stranded).toFixed(1);
      const noAC       = +(100 - hasAC).toFixed(1);
      return { ...d, effective, stranded, noAC };
    });

    const labels = {
      1: 'Safest (HVI 1)',
      2: 'Low Risk (HVI 2)',
      3: 'Moderate (HVI 3)',
      4: 'High Risk (HVI 4)',
      5: 'Most at Risk (HVI 5)',
    };
    const hviColors = ['#2471A3','#7FB3D3','#F5C26B','#E07B39','#922B21'];

    const margin = { top: 28, right: 24, bottom: 50, left: 155 };
    const W = Math.min(wrap.clientWidth || 760, 760);
    const rowH = 58;
    const H = rows.length * rowH + margin.top + margin.bottom;
    const w = W - margin.left - margin.right;
    const h = rows.length * rowH;

    wrap.innerHTML = '';
    const svg = d3.select(wrap).append('svg')
      .attr('width', W).attr('height', H)
      .attr('viewBox', `0 0 ${W} ${H}`)
      .attr('role', 'img')
      .attr('aria-label', 'AC cooling access by heat vulnerability rank');

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([0, 100]).range([0, w]);
    const y = d3.scaleBand()
      .domain(rows.map(d => d.hvi_rank))
      .range([0, h]).paddingInner(0.32).paddingOuter(0.1);

    // ── Y axis labels ─────────────────────────────────────────────
    rows.forEach((d, i) => {
      const cy = y(d.hvi_rank) + y.bandwidth() / 2;
      g.append('circle').attr('cx', -120).attr('cy', cy).attr('r', 7)
        .attr('fill', hviColors[i]);
      g.append('text')
        .attr('x', -108).attr('y', cy + 4.5)
        .attr('font-size', '12px').attr('font-weight', '600')
        .attr('fill', '#1A252F')
        .text(labels[d.hvi_rank]);
    });

    // ── Grid lines ─────────────────────────────────────────────────
    [25, 50, 75, 100].forEach(v => {
      g.append('line')
        .attr('x1', x(v)).attr('x2', x(v))
        .attr('y1', 0).attr('y2', h)
        .attr('stroke', '#E2E8F0').attr('stroke-width', 1);
    });

    // ── Stacked bars ───────────────────────────────────────────────
    // Segment 1: effective access (has AC + can use)
    g.selectAll('.ac-eff')
      .data(rows).enter().append('rect')
      .attr('class', 'ac-eff')
      .attr('y', d => y(d.hvi_rank)).attr('height', y.bandwidth()).attr('rx', 3)
      .attr('fill', (_, i) => hviColors[i]).attr('x', 0).attr('width', 0)
      .style('cursor', 'pointer')
      .on('mouseover', (e, d) => showTip(e,
        `<b>${labels[d.hvi_rank]}</b><br>
         <span style="color:#A3D9B5">✓</span> Effective cooling access: <b>${d.effective}%</b><br>
         Has AC and can afford to run it`))
      .on('mousemove', moveTip).on('mouseout', hideTip)
      .transition().duration(800).delay((_, i) => i * 90)
      .attr('width', d => x(d.effective));

    // Segment 2: stranded (has AC but can't run)
    g.selectAll('.ac-strand')
      .data(rows).enter().append('rect')
      .attr('class', 'ac-strand')
      .attr('y', d => y(d.hvi_rank)).attr('height', y.bandwidth())
      .attr('fill', '#F5C26B')
      .attr('x', d => x(d.effective)).attr('width', 0)
      .style('cursor', 'pointer')
      .on('mouseover', (e, d) => showTip(e,
        `<b>${labels[d.hvi_rank]}</b><br>
         ⚡ Has AC — but <b>can't afford to run it: ${d.stranded}%</b><br>
         21% of all AC owners face this barrier`))
      .on('mousemove', moveTip).on('mouseout', hideTip)
      .transition().duration(800).delay((_, i) => i * 90 + 200)
      .attr('width', d => x(d.stranded));

    // Diagonal hatch on stranded segment
    const defs = svg.append('defs');
    defs.append('pattern')
      .attr('id', 'hatch').attr('width', 6).attr('height', 6)
      .attr('patternUnits', 'userSpaceOnUse').attr('patternTransform', 'rotate(45)')
      .append('line')
      .attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', 6)
      .attr('stroke', 'rgba(255,255,255,0.5)').attr('stroke-width', 2.5);

    g.selectAll('.ac-strand-hatch')
      .data(rows).enter().append('rect')
      .attr('class', 'ac-strand-hatch')
      .attr('y', d => y(d.hvi_rank)).attr('height', y.bandwidth())
      .attr('fill', 'url(#hatch)')
      .attr('x', d => x(d.effective)).attr('width', 0)
      .style('pointer-events', 'none')
      .transition().duration(800).delay((_, i) => i * 90 + 200)
      .attr('width', d => x(d.stranded));

    // Segment 3: no AC
    g.selectAll('.ac-none')
      .data(rows).enter().append('rect')
      .attr('class', 'ac-none')
      .attr('y', d => y(d.hvi_rank)).attr('height', y.bandwidth())
      .attr('rx', 3).attr('fill', '#E2E8F0')
      .attr('x', d => x(d.effective + d.stranded)).attr('width', 0)
      .style('cursor', 'pointer')
      .on('mouseover', (e, d) => showTip(e,
        `<b>${labels[d.hvi_rank]}</b><br>
         ✗ No AC at all: <b>${d.noAC}%</b> of households<br>
         These residents have no mechanical cooling`))
      .on('mousemove', moveTip).on('mouseout', hideTip)
      .transition().duration(800).delay((_, i) => i * 90 + 400)
      .attr('width', d => x(d.noAC));

    // ── Value labels ───────────────────────────────────────────────
    rows.forEach((d, i) => {
      const cy = y(d.hvi_rank) + y.bandwidth() / 2 + 4.5;
      // Effective pct label
      if (d.effective > 8) {
        g.append('text')
          .attr('x', x(d.effective / 2)).attr('y', cy)
          .attr('text-anchor', 'middle')
          .attr('font-size', '11px').attr('font-weight', '700').attr('fill', '#fff')
          .style('pointer-events', 'none')
          .text(d.effective + '%')
          .attr('opacity', 0)
          .transition().delay(i * 90 + 600).duration(400).attr('opacity', 1);
      }
      // No-AC label
      if (d.noAC > 5) {
        g.append('text')
          .attr('x', x(d.effective + d.stranded + d.noAC / 2)).attr('y', cy)
          .attr('text-anchor', 'middle')
          .attr('font-size', '10px').attr('fill', '#6B7280')
          .style('pointer-events', 'none')
          .text('No AC')
          .attr('opacity', 0)
          .transition().delay(i * 90 + 800).duration(400).attr('opacity', 1);
      }
    });

    // ── Legend ─────────────────────────────────────────────────────
    const leg = g.append('g').attr('transform', `translate(0, ${h + 18})`);
    const legData = [
      { fill: '#7FB3D3', label: 'Has AC — can afford to run it' },
      { fill: '#F5C26B', label: 'Has AC — but can\'t afford it (21% of owners)', hatch: true },
      { fill: '#E2E8F0', label: 'No AC at all' },
    ];
    let legX = 0;
    legData.forEach(item => {
      leg.append('rect').attr('x', legX).attr('y', 0)
        .attr('width', 12).attr('height', 12).attr('rx', 2)
        .attr('fill', item.fill);
      if (item.hatch) {
        leg.append('rect').attr('x', legX).attr('y', 0)
          .attr('width', 12).attr('height', 12).attr('rx', 2)
          .attr('fill', 'url(#hatch)');
      }
      leg.append('text').attr('x', legX + 16).attr('y', 9.5)
        .attr('font-size', '11px').attr('fill', '#4A5568')
        .text(item.label);
      legX += leg.select('text').node().getBBox().width + 28;
    });
  }


  // ── Main init ──────────────────────────────────────────────────
  fetch(DATA_URL)
    .then(r => r.json())
    .then(data => {
      initCounters(data);
      drawEnergyBurdenChart(data);
      drawBudgetWaffle(data);
      drawACOwnershipChart(data);
    })
    .catch(err => console.error('[ac_energy.js] fetch error:', err));

}());
