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
      { x1: x(0), y1: 0,    x2: iw,  y2: y(0), fill: '#FEF3F2', label: 'High–High', lx: iw - 8, ly: 14, anchor: 'end'   },
      { x1: 0,    y1: 0,    x2: x(0),y2: y(0), fill: '#F5EEF8', label: 'Low–High',  lx: 8,      ly: 14, anchor: 'start' },
      { x1: 0,    y1: y(0), x2: x(0),y2: ih,   fill: '#EBF5FB', label: 'Low–Low',   lx: 8,      ly: ih - 8, anchor: 'start' },
      { x1: x(0), y1: y(0), x2: iw,  y2: ih,   fill: '#FEF9E7', label: 'High–Low',  lx: iw - 8, ly: ih - 8, anchor: 'end'   },
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

    // Clustering strength annotation
    svg.append('text').attr('x', iw - 6).attr('y', 30).attr('text-anchor', 'end')
      .attr('font-size', 11).attr('font-family', 'Satoshi, sans-serif').attr('fill', '#4A5568')
      .text('Clustering strength: 0.87 out of 1.0 (very strong)');

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
      .text('Neighborhood heat risk score');

    svg.append('text').attr('transform', 'rotate(-90)').attr('x', -ih / 2).attr('y', -44)
      .attr('text-anchor', 'middle').attr('font-size', 11)
      .attr('font-family', 'Satoshi, sans-serif').attr('fill', '#4A5568')
      .text('Avg. risk of surrounding neighborhoods');

    // Hover tooltip
    const tip = d3.select(container).append('div').attr('class', 'spatial-tooltip');

    const CLUSTER_LABEL = {
      HH: 'Surrounded by other high-risk neighborhoods',
      LL: 'Surrounded by other low-risk neighborhoods',
      HL: 'High-risk area surrounded by low-risk neighbors',
      LH: 'Low-risk area surrounded by high-risk neighbors',
      NS: 'No strong clustering pattern'
    };

    svg.selectAll('circle')
      .on('mouseover', function (event, d) {
        const [px, py] = d3.pointer(event, container);
        tip.style('display', 'block').style('left', (px + 14) + 'px').style('top', (py - 10) + 'px')
          .html(`<b>${d.borough}</b><br>Heat risk score: ${d.cdi}<br>${CLUSTER_LABEL[d.cluster] || ''}`);
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

    // Borough-level context for HH clusters
    const BOROUGH_HH_CONTEXT = {
      'Bronx':    'Part of a connected high-risk zone covering 66% of the Bronx, the highest concentration of any borough.',
      'Brooklyn': 'Part of a high-risk cluster covering 29% of Brooklyn neighborhoods.',
      'Manhattan':'Part of a high-risk cluster covering 12% of Manhattan neighborhoods.',
      'Queens':   'Part of a high-risk cluster covering 14% of Queens neighborhoods.',
    };

    const CLUSTER_DETAIL = {
      HH: (p) => {
        const ctx = BOROUGH_HH_CONTEXT[p.borough] || '';
        return `<b class="tt-desert">High-Risk Cluster</b>` +
          `<div class="tt-loc">${p.borough || ''}</div>` +
          `<div style="font-size:11px;color:rgba(255,255,255,0.85);margin-bottom:4px">` +
          `This neighborhood is dangerous during heat waves, and so are all the neighborhoods surrounding it. There is no safer nearby area within walking distance.</div>` +
          (ctx ? `<div style="font-size:11px;color:rgba(255,255,255,0.6)">${ctx}</div>` : '') +
          (p.CDI != null ? `<div class="tt-rows"><span>Heat risk score</span><span>${p.CDI.toFixed(0)} / 72</span></div>` : '');
      },
      LL: (p) =>
        `<b class="tt-safe">Low-Risk Cluster</b>` +
        `<div class="tt-loc">${p.borough || ''}</div>` +
        `<div style="font-size:11px;color:rgba(255,255,255,0.85)">This neighborhood and its neighbors are relatively protected from heat risk.</div>` +
        (p.CDI != null ? `<div class="tt-rows" style="margin-top:4px"><span>Heat risk score</span><span>${p.CDI.toFixed(0)} / 72</span></div>` : ''),
      HL: (p) =>
        `<b style="display:block;font-size:11px;font-weight:700;color:#F39C12;margin-bottom:2px">Isolated High-Risk Area</b>` +
        `<div class="tt-loc">${p.borough || ''}</div>` +
        `<div style="font-size:11px;color:rgba(255,255,255,0.85)">High heat danger here, but lower-risk neighborhoods nearby.</div>`,
      LH: (p) =>
        `<b style="display:block;font-size:11px;font-weight:700;color:#A569BD;margin-bottom:2px">Protected Low-Risk Island</b>` +
        `<div class="tt-loc">${p.borough || ''}</div>` +
        `<div style="font-size:11px;color:rgba(255,255,255,0.85)">Lower heat risk here, but surrounded by higher-risk neighborhoods.</div>`,
    };

    const TT = { sticky: true, className: 'map-tooltip', offset: [10, 0] };

    fetch('data/tract_map_data.geojson')
      .then(r => r.json())
      .then(data => {
        // Base grey — tooltip for non-clustered tracts
        L.geoJSON(data, {
          style: { fillColor: '#F0F2F5', fillOpacity: 0.5, color: '#DEE2E6', weight: 0.3 },
          onEachFeature: (ft, layer) => {
            const p = ft.properties;
            if (!p.lisa_cluster || p.lisa_cluster === 'NS') {
              layer.bindTooltip(
                `<div class="tt-loc">${p.borough || ''}</div>` +
                `<div style="font-size:11px;color:rgba(255,255,255,0.75)">No strong clustering pattern in this area.</div>` +
                (p.CDI != null ? `<div class="tt-rows" style="margin-top:4px"><span>Heat risk score</span><span>${p.CDI.toFixed(0)} / 72</span></div>` : ''),
                TT
              );
            }
          }
        }).addTo(map);

        // LISA clusters — rich contextual tooltip
        L.geoJSON(data, {
          filter: ft => +ft.properties.lisa_p < 0.05 && ft.properties.lisa_cluster !== 'NS',
          style: ft => ({
            fillColor: LISA_COLORS[ft.properties.lisa_cluster] || '#D5D8DC',
            fillOpacity: 0.82, color: 'transparent', weight: 0
          }),
          onEachFeature: (ft, layer) => {
            const p = ft.properties;
            const fn = CLUSTER_DETAIL[p.lisa_cluster];
            if (fn) layer.bindTooltip(fn(p), TT);
          }
        }).addTo(map);

        // Legend
        const legend = L.control({ position: 'bottomright' });
        legend.onAdd = () => {
          const div = L.DomUtil.create('div', 'leaflet-legend');
          [['High-risk cluster', '#C0392B'], ['Low-risk cluster', '#2471A3'],
           ['Isolated high-risk area', '#F39C12'], ['No clear pattern', '#D5D8DC']]
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
