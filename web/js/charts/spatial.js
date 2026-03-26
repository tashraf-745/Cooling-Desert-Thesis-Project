// Step 8: Spatial Story — Moran Scatterplot + LISA Map

(function () {
  'use strict';

  const LISA_COLORS = {
    HH: '#C0392B', LL: '#2471A3', HL: '#F39C12', LH: '#A569BD', NS: '#D5D8DC'
  };

  // ── Moran Scatterplot ──────────────────────────────────────
  function drawMoran() {
    const container = document.getElementById('moran-scatter');
    if (!container) return;

    fetch('data/moran_scatter.json')
      .then(r => r.json())
      .then(data => renderScatter(container, data))
      .catch(err => console.error('[Spatial] Moran data failed:', err));
  }

  function renderScatter(container, data) {
    const m  = { top: 20, right: 40, bottom: 50, left: 55 };
    const W  = 680, H = 400;
    const iw = W - m.left - m.right;
    const ih = H - m.top - m.bottom;

    const svg = d3.select(container).append('svg')
      .attr('viewBox', `0 0 ${W} ${H}`)
      .attr('width', '100%')
      .append('g').attr('transform', `translate(${m.left},${m.top})`);

    const x = d3.scaleLinear().domain([-2.9, 2.7]).range([0, iw]);
    const y = d3.scaleLinear().domain([-2.7, 2.5]).range([ih, 0]);

    // Quadrant backgrounds
    [
      { x1: x(0), y1: 0,    x2: iw,  y2: y(0), fill: '#FEF3F2', label: 'HH', lx: iw - 8, ly: 14, anchor: 'end'   },
      { x1: 0,    y1: 0,    x2: x(0),y2: y(0), fill: '#F5EEF8', label: 'LH', lx: 8,      ly: 14, anchor: 'start' },
      { x1: 0,    y1: y(0), x2: x(0),y2: ih,   fill: '#EBF5FB', label: 'LL', lx: 8,      ly: ih - 8, anchor: 'start' },
      { x1: x(0), y1: y(0), x2: iw,  y2: ih,   fill: '#FEF9E7', label: 'HL', lx: iw - 8, ly: ih - 8, anchor: 'end'   },
    ].forEach(q => {
      svg.append('rect').attr('x', q.x1).attr('y', q.y1)
        .attr('width', q.x2 - q.x1).attr('height', q.y2 - q.y1).attr('fill', q.fill);
      svg.append('text').attr('x', q.lx).attr('y', q.ly)
        .attr('text-anchor', q.anchor).attr('font-size', 11)
        .attr('font-family', 'Satoshi, sans-serif').attr('fill', '#C8CDD4').attr('font-weight', 'bold')
        .text(q.label);
    });

    // Zero axes
    svg.append('line').attr('x1', x(0)).attr('x2', x(0)).attr('y1', 0).attr('y2', ih)
      .attr('stroke', '#DEE2E6').attr('stroke-width', 1);
    svg.append('line').attr('x1', 0).attr('x2', iw).attr('y1', y(0)).attr('y2', y(0))
      .attr('stroke', '#DEE2E6').attr('stroke-width', 1);

    // OLS reference line (slope = Moran's I = 0.867)
    svg.append('line')
      .attr('x1', x(-2.9)).attr('y1', y(-2.9 * 0.867))
      .attr('x2', x(2.7)).attr('y2', y(2.7 * 0.867))
      .attr('stroke', '#1A252F').attr('stroke-width', 1.2).attr('stroke-dasharray', '5,3');

    // Dots — NS behind, clusters on top
    ['NS', 'LL', 'HL', 'LH', 'HH'].forEach(cl => {
      svg.selectAll(`.dot-${cl}`).data(data.filter(d => d.cluster === cl)).join('circle')
        .attr('class', `dot-${cl}`)
        .attr('cx', d => x(d.z)).attr('cy', d => y(d.wz))
        .attr('r', cl === 'NS' ? 2 : 2.5)
        .attr('fill', LISA_COLORS[cl])
        .attr('fill-opacity', cl === 'NS' ? 0.3 : 0.78)
        .attr('stroke', 'none');
    });

    // Moran's I annotation
    svg.append('text').attr('x', iw - 6).attr('y', 14).attr('text-anchor', 'end')
      .attr('font-size', 11).attr('font-family', 'Satoshi, sans-serif').attr('fill', '#4A5568')
      .text("Moran's I = 0.867 · p < 0.001");

    // Axes
    svg.append('g').attr('transform', `translate(0,${ih})`)
      .call(d3.axisBottom(x).ticks(6).tickSize(3))
      .call(g => g.select('.domain').attr('stroke', '#DEE2E6'))
      .call(g => g.selectAll('line').attr('stroke', '#DEE2E6'))
      .call(g => g.selectAll('text').attr('font-size', 10).attr('font-family', 'Satoshi, sans-serif').attr('fill', '#9BA3AE'));

    svg.append('g').call(d3.axisLeft(y).ticks(6).tickSize(3))
      .call(g => g.select('.domain').attr('stroke', '#DEE2E6'))
      .call(g => g.selectAll('line').attr('stroke', '#DEE2E6'))
      .call(g => g.selectAll('text').attr('font-size', 10).attr('font-family', 'Satoshi, sans-serif').attr('fill', '#9BA3AE'));

    svg.append('text').attr('x', iw / 2).attr('y', ih + 42)
      .attr('text-anchor', 'middle').attr('font-size', 11)
      .attr('font-family', 'Satoshi, sans-serif').attr('fill', '#4A5568')
      .text('Standardized CDI (z-score)');

    svg.append('text').attr('transform', 'rotate(-90)').attr('x', -ih / 2).attr('y', -44)
      .attr('text-anchor', 'middle').attr('font-size', 11)
      .attr('font-family', 'Satoshi, sans-serif').attr('fill', '#4A5568')
      .text('Spatial lag (Wz)');

    // Hover tooltip
    const tip = d3.select(container).append('div').attr('class', 'spatial-tooltip');

    svg.selectAll('circle')
      .on('mouseover', function (event, d) {
        const [px, py] = d3.pointer(event, container);
        tip.style('display', 'block').style('left', (px + 14) + 'px').style('top', (py - 10) + 'px')
          .html(`<b>${d.borough}</b><br>CDI: ${d.cdi} · ${d.cluster}`);
      })
      .on('mouseout', () => tip.style('display', 'none'));
  }

  // ── LISA Map ───────────────────────────────────────────────
  function drawLisaMap() {
    if (!document.getElementById('lisa-map')) return;

    const map = L.map('lisa-map', { scrollWheelZoom: false, zoomControl: true })
      .setView([40.72, -73.97], 10);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com/attributions">CartoDB</a>',
      subdomains: 'abcd', maxZoom: 19
    }).addTo(map);

    fetch('data/tract_map_data.geojson')
      .then(r => r.json())
      .then(data => {
        // Base grey
        L.geoJSON(data, {
          style: { fillColor: '#F0F2F5', fillOpacity: 0.5, color: '#DEE2E6', weight: 0.3 }
        }).addTo(map);

        // LISA clusters
        L.geoJSON(data, {
          filter: ft => +ft.properties.lisa_p < 0.05 && ft.properties.lisa_cluster !== 'NS',
          style: ft => ({
            fillColor: LISA_COLORS[ft.properties.lisa_cluster] || '#D5D8DC',
            fillOpacity: 0.82, color: 'transparent', weight: 0
          })
        }).addTo(map);

        // Legend
        const legend = L.control({ position: 'bottomright' });
        legend.onAdd = () => {
          const div = L.DomUtil.create('div', 'leaflet-legend');
          [['HH — Hot-spot', '#C0392B'], ['LL — Cold-spot', '#2471A3'],
           ['HL — Isolated high', '#F39C12'], ['Not significant', '#D5D8DC']]
            .forEach(([label, color]) => {
              div.innerHTML += `<div class="legend-item"><span class="legend-swatch" style="background:${color}"></span><span class="legend-label">${label}</span></div>`;
            });
          return div;
        };
        legend.addTo(map);
      })
      .catch(err => console.error('[Spatial] LISA map failed:', err));
  }

  // ── Init ──────────────────────────────────────────────────
  function init() { drawMoran(); drawLisaMap(); }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();

}());
