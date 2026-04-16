// Conclusion visualization - waffle chart of all 2,231 NYC census tracts

(function () {
  'use strict';

  const CLUSTER_COLORS = {
    2: '#F0E442',  // Financially Stretched
    3: '#E69F00',  // Language & Heat Barriers
    4: '#CC79A7',  // Racial Heat Burden
    5: '#D55E00',  // Multiple Compounding Barriers
  };

  const CLUSTER_NAMES = {
    0: 'Not a cooling desert',
    1: 'Low Risk',
    2: 'Financially Stretched',
    3: 'Language & Heat Barriers',
    4: 'Racial Heat Burden',
    5: 'Multiple Compounding Barriers',
  };

  const SAFE_COLOR = '#C8D6E8';

  // Wait for DOM + D3 to be ready
  document.addEventListener('DOMContentLoaded', function () {
    const el = document.getElementById('conclusion-chart');
    if (!el) return;

    // Use IntersectionObserver to lazy-load on first scroll into view
    const sentinel = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      sentinel.disconnect();
      loadAndDraw(el);
    }, { rootMargin: '200px' });

    sentinel.observe(el);
  });

  function loadAndDraw(el) {
    if (typeof d3 === 'undefined') return;

    fetch('data/tract_map_data.geojson')
      .then(function (r) { return r.json(); })
      .then(function (geojson) {
        var props = geojson.features.map(function (f) { return f.properties; });
        buildWaffle(el, props);
      })
      .catch(function (err) { console.error('[Conclusion] Data load failed:', err); });
  }

  function buildWaffle(el, tracts) {
    // Sort: non-deserts first (light), then deserts by cluster ascending
    var sorted = tracts.slice().sort(function (a, b) {
      var da = a.is_cooling_desert === 1 ? 1 : 0;
      var db = b.is_cooling_desert === 1 ? 1 : 0;
      if (da !== db) return da - db;
      return (a.cluster || 1) - (b.cluster || 1);
    });

    var SQ   = 7;   // square size in px (SVG units)
    var GAP  = 2;   // gap between squares
    var STEP = SQ + GAP;

    // Measure container width
    var containerW = el.getBoundingClientRect().width || 500;
    var cols = Math.max(1, Math.floor(containerW / STEP));
    var rows = Math.ceil(sorted.length / cols);

    var svgW = cols * STEP;
    var svgH = rows * STEP;

    // Tooltip
    var tip = document.createElement('div');
    tip.className = 'd3-tip';
    document.body.appendChild(tip);

    var svg = d3.select(el)
      .append('svg')
      .attr('viewBox', '0 0 ' + svgW + ' ' + svgH)
      .style('width', '100%')
      .style('height', 'auto')
      .attr('aria-label', 'Grid of 2,231 NYC census tracts colored by cooling desert status and neighborhood type');

    svg.selectAll('rect')
      .data(sorted)
      .join('rect')
      .attr('x', function (_, i) { return (i % cols) * STEP; })
      .attr('y', function (_, i) { return Math.floor(i / cols) * STEP; })
      .attr('width', SQ)
      .attr('height', SQ)
      .attr('rx', 1)
      .attr('fill', function (d) {
        if (d.is_cooling_desert !== 1) return SAFE_COLOR;
        return CLUSTER_COLORS[d.cluster] || '#E07B39';
      })
      .attr('fill-opacity', function (d) {
        return d.is_cooling_desert === 1 ? 0.92 : 0.45;
      })
      .on('mousemove', function (event, d) {
        var isDesert = d.is_cooling_desert === 1;
        var clusterName = CLUSTER_NAMES[isDesert ? (d.cluster || 1) : 0];
        tip.style.display = 'block';
        tip.style.left = (event.pageX + 14) + 'px';
        tip.style.top  = (event.pageY - 40) + 'px';
        tip.innerHTML  =
          '<b>' + (isDesert ? '● Cooling Desert' : '○ Not a Cooling Desert') + '</b><br>' +
          '<i>' + clusterName + '</i><br>' +
          (d.borough || '');
      })
      .on('mouseleave', function () { tip.style.display = 'none'; });
  }

}());
