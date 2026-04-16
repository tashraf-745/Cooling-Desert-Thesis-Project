// Five Typologies - Scrollytelling sticky panel

(function () {
  'use strict';

  // ── Cluster data ───────────────────────────────────────────
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
      summary: 'The highest concentration of heat-dangerous neighborhoods. Predominantly Black neighborhoods run measurably hotter, a pattern that reflects decades of racial segregation and disinvestment, not just income differences.',
      policy: 'Environmental justice investment, required cooling retrofits for older buildings, and green infrastructure in the most at-risk zones.',
      pct_desert: '46.4%', mean_cdi: '53.7', renters: '922K',
      radar: [1.00, 0.69, 0.68, 1.00, 0.06, 0.28]
    },
    {
      id: 5, color: '#D55E00',
      name: 'Multiple Compounding Barriers',
      sub: 'Everything at once',
      summary: 'Every risk factor hits at the same time: the most dangerous heat levels, the lowest incomes, the highest disability rates, and the fewest cooling options. These neighborhoods need comprehensive support, not a single fix.',
      policy: 'Free AC installation, expanded public cooling sites, emergency rent relief, and removal of public housing AC fees.',
      pct_desert: '58.6%', mean_cdi: '54.1', renters: '1.16M',
      radar: [0.93, 1.00, 1.00, 0.46, 0.56, 1.00]
    }
  ];

  const RADAR_LABELS = ['Heat Danger', 'Rent Cost', 'Income', 'Race', 'Language', 'Disability'];

  const AXIS_TIPS = {
    'Heat Danger':  'How dangerous this neighborhood is during a heat wave, scored 1 (safest) to 5 (most dangerous) by NYC\'s Health Department.',
    'Rent Cost':    'How much of residents\' income goes to rent. A higher score means less money left over for electricity to run an air conditioner.',
    'Income':       'How low average household income is. Lower income means fewer financial options to cool the home or afford an AC unit.',
    'Race':         'Share of Black residents. Race is an independent driver of heat risk, reflecting decades of racial segregation and disinvestment in certain neighborhoods.',
    'Language':     'Share of residents with limited English. Language barriers reduce access to emergency cooling information and assistance programs.',
    'Disability':   'Share of residents with a disability. Disabled residents may face greater barriers to reaching public cooling spaces during a heat emergency.',
  };


  // Shared radar tooltip
  const radarTip = Object.assign(document.createElement('div'), { className: 'd3-tip' });
  document.body.appendChild(radarTip);

  let currentId = null;
  let fadeTimer = null;

  // ── Build left-column triggers ─────────────────────────────
  function buildTriggers() {
    const container = document.getElementById('typo-triggers');
    if (!container) return;

    CLUSTERS.forEach(function (c) {
      const div = document.createElement('div');
      div.className = 'typo-trigger';
      div.dataset.cluster = c.id;
      div.innerHTML =
        '<span class="typo-trigger-num" style="color:' + c.color + '">0' + c.id + '</span>' +
        '<p class="typo-trigger-name">' + c.name + '</p>' +
        '<p class="typo-trigger-sub">' + c.sub + '</p>';
      container.appendChild(div);
    });
  }

  // ── Build sticky panel shell ───────────────────────────────
  function buildPanel() {
    const panel = document.getElementById('typo-panel');
    if (!panel) return;

    panel.innerHTML =
      '<div class="typo-panel-overlay"></div>' +
      '<div class="typo-panel-content" id="typo-panel-content"></div>';
  }

  // ── Build sun SVG (white text - dark panel background) ─────
  function sunSVG(c) {
    return '<svg class="show-map-sun" width="100" height="100"' +
        ' viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<circle cx="26" cy="26" r="22" fill="' + c.color + '" fill-opacity="0.06"/>' +
      '<line x1="26" y1="3"  x2="26" y2="10"  stroke="' + c.color + '" stroke-width="2.5" stroke-linecap="round"/>' +
      '<line x1="26" y1="42" x2="26" y2="49"  stroke="' + c.color + '" stroke-width="2.5" stroke-linecap="round"/>' +
      '<line x1="3"  y1="26" x2="10" y2="26"  stroke="' + c.color + '" stroke-width="2.5" stroke-linecap="round"/>' +
      '<line x1="42" y1="26" x2="49" y2="26"  stroke="' + c.color + '" stroke-width="2.5" stroke-linecap="round"/>' +
      '<line x1="9"  y1="9"  x2="14" y2="14"  stroke="' + c.color + '" stroke-width="2.5" stroke-linecap="round"/>' +
      '<line x1="38" y1="38" x2="43" y2="43"  stroke="' + c.color + '" stroke-width="2.5" stroke-linecap="round"/>' +
      '<line x1="9"  y1="43" x2="14" y2="38"  stroke="' + c.color + '" stroke-width="2.5" stroke-linecap="round"/>' +
      '<line x1="38" y1="14" x2="43" y2="9"   stroke="' + c.color + '" stroke-width="2.5" stroke-linecap="round"/>' +
      '<circle cx="26" cy="26" r="13" fill="' + c.color + '" fill-opacity="0.22" stroke="' + c.color + '" stroke-width="1.5"/>' +
      '<text x="26" y="21.5" text-anchor="middle" dominant-baseline="middle"' +
        ' font-size="4.2" font-family="Bree Serif, serif" font-weight="700" fill="#ffffff">GO TO</text>' +
      '<text x="26" y="27" text-anchor="middle" dominant-baseline="middle"' +
        ' font-size="4.2" font-family="Bree Serif, serif" font-weight="700" fill="#ffffff">MAP</text>' +
      '<polyline points="23,34 26,29.5 29,34" stroke="#ffffff" stroke-width="1.8"' +
        ' fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
    '</svg>';
  }

  // ── Show cluster in sticky panel ───────────────────────────
  function showCluster(c) {
    if (currentId === c.id) return;
    currentId = c.id;

    const content = document.getElementById('typo-panel-content');
    if (!content) return;

    // Cancel any pending timer from a rapid scroll
    if (fadeTimer) clearTimeout(fadeTimer);

    content.classList.add('fade-out');

    fadeTimer = setTimeout(function () {
      content.innerHTML =
        '<div class="typo-panel-header">' +
          '<span class="typo-panel-num" style="background:' + c.color + '">0' + c.id + '</span>' +
          '<h3 class="typo-panel-name">' + c.name + '</h3>' +
        '</div>' +
        '<p class="typo-panel-sub">' + c.sub + '</p>' +
        '<div class="typo-panel-body">' +
          '<div class="typo-panel-left">' +
            '<p class="typo-panel-summary">' + c.summary + '</p>' +
            '<div class="typo-panel-kpis">' +
              '<div class="kpi"><b>' + c.pct_desert + '</b><span>in a cooling desert</span></div>' +
              '<div class="kpi"><b>' + c.mean_cdi + '</b><span>avg. risk score</span></div>' +
              '<div class="kpi"><b>' + c.renters + '</b><span>renters</span></div>' +
            '</div>' +
            '<p class="typo-panel-policy">' + c.policy + '</p>' +
            '<button class="typo-show-map" data-cluster="' + c.id + '"' +
              ' aria-label="See this neighborhood type on the map" title="See on map">' +
              sunSVG(c) +
            '</button>' +
          '</div>' +
          '<div class="typo-panel-right">' +
            '<svg id="typo-radar" class="typo-radar-svg" viewBox="-15 -15 230 230" aria-hidden="true"></svg>' +
          '</div>' +
        '</div>';

      // Draw radar with light colors for dark background
      drawRadar('typo-radar', c.radar, c.color);

      // Bind GO TO MAP button
      var btn = content.querySelector('.typo-show-map');
      if (btn) {
        btn.addEventListener('click', function () {
          document.dispatchEvent(new CustomEvent('filterCluster', { detail: +this.dataset.cluster }));
          var mapEl = document.getElementById('map');
          if (mapEl) mapEl.scrollIntoView({ behavior: 'smooth' });
        });
      }

      // Fade back in
      content.classList.remove('fade-out');
      fadeTimer = null;
    }, 220);
  }

  // ── Radar chart for dark background ───────────────────────
  function drawRadar(svgId, values, color) {
    if (typeof d3 === 'undefined') return;
    const svg = d3.select('#' + svgId);
    if (svg.empty()) return;

    const cx = 100, cy = 100, r = 80;
    const n = values.length;
    const angle = function (i) { return (Math.PI * 2 * i / n) - Math.PI / 2; };

    // Grid rings
    [0.25, 0.5, 0.75, 1].forEach(function (t) {
      svg.append('circle')
        .attr('cx', cx).attr('cy', cy).attr('r', r * t)
        .attr('fill', 'none')
        .attr('stroke', 'rgba(255,255,255,0.22)')
        .attr('stroke-width', 1);
    });

    // Axes + labels
    RADAR_LABELS.forEach(function (label, i) {
      var a = angle(i);
      svg.append('line')
        .attr('x1', cx).attr('y1', cy)
        .attr('x2', cx + r * Math.cos(a)).attr('y2', cy + r * Math.sin(a))
        .attr('stroke', 'rgba(255,255,255,0.22)')
        .attr('stroke-width', 1);

      svg.append('text')
        .attr('x', cx + (r + 20) * Math.cos(a))
        .attr('y', cy + (r + 20) * Math.sin(a))
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
        .attr('font-size', '12').attr('font-weight', '600')
        .attr('fill', 'rgba(255,255,255,0.88)')
        .style('cursor', 'help')
        .text(label)
        .on('mouseover', function (event) {
          radarTip.innerHTML = '<b>' + label + '</b><br>' + (AXIS_TIPS[label] || '');
          radarTip.style.display = 'block';
          radarTip.style.left = (event.pageX + 14) + 'px';
          radarTip.style.top  = (event.pageY - 10) + 'px';
        })
        .on('mouseout', function () { radarTip.style.display = 'none'; });
    });

    // Data polygon
    var pts = values.map(function (v, i) {
      var a = angle(i);
      return (cx + r * v * Math.cos(a)) + ',' + (cy + r * v * Math.sin(a));
    }).join(' ');

    svg.append('polygon')
      .attr('points', pts)
      .attr('fill', color).attr('fill-opacity', 0.35)
      .attr('stroke', color).attr('stroke-width', 2.5);
  }

  // ── IntersectionObserver drives the panel ─────────────────
  function initObserver() {
    var triggers = document.querySelectorAll('.typo-trigger');
    if (!triggers.length) return;

    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = +entry.target.dataset.cluster;
        triggers.forEach(function (t) { t.classList.remove('is-active'); });
        entry.target.classList.add('is-active');
        var c = CLUSTERS.find(function (x) { return x.id === id; });
        if (c) showCluster(c);
      });
    }, { rootMargin: '-30% 0px -30% 0px', threshold: 0 });

    triggers.forEach(function (t) { obs.observe(t); });
  }

  // ── Init ──────────────────────────────────────────────────
  function init() {
    buildTriggers();
    buildPanel();
    // Show first cluster immediately (no observer fired yet)
    showCluster(CLUSTERS[0]);
    // Mark first trigger active
    var first = document.querySelector('.typo-trigger');
    if (first) first.classList.add('is-active');
    initObserver();
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();

}());
