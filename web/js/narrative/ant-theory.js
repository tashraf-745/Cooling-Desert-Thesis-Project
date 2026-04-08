// ANT Theory Path — Path Switcher + D3 Network + Scrollytelling + Translation Chain
// Actor-Network Theory applied to NYC heat equity & cooling deserts

(function () {
  'use strict';

  // ══════════════════════════════════════════════════════════════
  // PATH SWITCHING
  // ══════════════════════════════════════════════════════════════
  const DATA_SECS   = () => document.querySelectorAll('[data-path="data"]');
  const THEORY_SECS = () => document.querySelectorAll('[data-path="theory"]');
  const pathSwitcher = document.getElementById('path-switcher');
  let theoryReady = false;

  function switchPath(path) {
    DATA_SECS().forEach(s => { s.hidden = (path !== 'data'); });
    THEORY_SECS().forEach(s => { s.hidden = (path !== 'theory'); });

    if (pathSwitcher) {
      pathSwitcher.hidden = false;
      pathSwitcher.querySelectorAll('.ps-btn').forEach(b => {
        b.classList.toggle('ps-active', b.dataset.switch === path);
      });
    }

    history.replaceState(null, '', location.pathname + '#' + path);

    const target = path === 'data'
      ? document.getElementById('narrative')
      : document.getElementById('ant-intro');
    if (target) setTimeout(() => target.scrollIntoView({ behavior: 'smooth' }), 60);

    if (path === 'theory' && !theoryReady) {
      theoryReady = true;
      setTimeout(initTheory, 350);
    }
  }

  // Button wiring
  const btnData   = document.getElementById('btn-path-data');
  const btnTheory = document.getElementById('btn-path-theory');
  const btnBack   = document.getElementById('btn-theory-to-data');

  // Support both old card IDs and new pc-choice IDs
  [btnData, document.querySelector('.pc-choice--data')].forEach(b => {
    if (b) b.addEventListener('click', () => switchPath('data'));
  });
  [btnTheory, document.querySelector('.pc-choice--theory')].forEach(b => {
    if (b) b.addEventListener('click', () => switchPath('theory'));
  });
  if (btnBack) btnBack.addEventListener('click', () => switchPath('data'));

  if (pathSwitcher) {
    pathSwitcher.querySelectorAll('.ps-btn').forEach(btn => {
      btn.addEventListener('click', () => switchPath(btn.dataset.switch));
    });
  }

  // Concept chips → scroll to target sections
  document.querySelectorAll('.ant-concept-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const id = chip.dataset.target;
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    });
  });

  // Policy card links → switch to data + scroll
  document.querySelectorAll('.apc-link[data-goto]').forEach(el => {
    el.style.cursor = 'pointer';
    el.addEventListener('click', () => {
      switchPath('data');
      setTimeout(() => {
        const target = document.getElementById(el.dataset.goto);
        if (target) target.scrollIntoView({ behavior: 'smooth' });
      }, 500);
    });
  });

  // Handle hash on load
  window.addEventListener('DOMContentLoaded', () => {
    const hash = location.hash.replace('#', '');
    if (hash === 'theory') {
      switchPath('theory');
    } else if (hash === 'data') {
      switchPath('data');
    }
    // Default: no path chosen — path chooser section is visible, both path sections hidden
  });


  // ══════════════════════════════════════════════════════════════
  // ANT SCENE BUILDER — Scrollytelling Introduction
  // ══════════════════════════════════════════════════════════════
  function initSceneBuilder() {
    const panels  = document.querySelectorAll('.ant-scene-panel');
    const linesG  = document.getElementById('ant-svg-lines');
    const nodesG  = document.getElementById('ant-svg-nodes');
    const labelG  = document.getElementById('ant-svg-label');

    if (!nodesG || !panels.length) return;

    // ── Node geometry — viewBox 0 0 480 460 ──────────────────────
    // Large circles; labels rendered inside each circle
    const NODE_DEFS = {
      maria:    { cx: 240, cy: 228, r: 50,
                  fill: '#1A252F', stroke: 'none', strokeW: 0,
                  label: 'Maria', sublabel: 'Renter',
                  labelColor: '#fff', subColor: 'rgba(255,255,255,0.60)' },
      heat:     { cx: 240, cy:  60, r: 36,
                  fill: '#922B21', stroke: 'none', strokeW: 0,
                  label: 'Heat', sublabel: '94°F',
                  labelColor: '#fff', subColor: 'rgba(255,255,255,0.65)' },
      bill:     { cx: 412, cy: 258, r: 36,
                  fill: '#C96A28', stroke: 'none', strokeW: 0,
                  label: 'Electric', sublabel: 'bill',
                  labelColor: '#fff', subColor: 'rgba(255,255,255,0.65)' },
      building: { cx: 240, cy: 396, r: 36,
                  fill: '#6B5744', stroke: 'none', strokeW: 0,
                  label: 'Pre-1938', sublabel: 'building',
                  labelColor: '#fff', subColor: 'rgba(255,255,255,0.65)' },
      hvi:      { cx:  68, cy: 258, r: 36,
                  fill: '#1F6999', stroke: 'none', strokeW: 0,
                  label: 'City heat', sublabel: 'risk index',
                  labelColor: '#fff', subColor: 'rgba(255,255,255,0.65)' },
    };

    // ── Line definitions ─────────────────────────────────────────
    const LINE_DEFS = {
      heat_to_maria:     { from: 'heat',     to: 'maria', stroke: '#922B21',
                           dash: '',    strokeW: 3,   marker: 'url(#ant-arr-red)' },
      bill_to_maria:     { from: 'bill',     to: 'maria', stroke: '#C96A28',
                           dash: '7,5', strokeW: 2,   marker: 'url(#ant-arr-org)' },
      building_to_maria: { from: 'building', to: 'maria', stroke: '#6B5744',
                           dash: '7,5', strokeW: 2,   marker: 'url(#ant-arr-tan)' },
      hvi_redirect:      { from: 'hvi', to: null,          stroke: '#1F6999',
                           dash: '4,6', strokeW: 2,   marker: 'url(#ant-arr-blu)',
                           toX: 18, toY: 52 },
    };

    // ── Which nodes/lines each scroll step reveals ────────────────
    const STEP_MAP = [
      { nodes: ['maria'],    lines: [],                 reveal: false },
      { nodes: ['heat'],     lines: ['heat_to_maria'],  reveal: false },
      { nodes: ['bill'],     lines: ['bill_to_maria'],  reveal: false },
      { nodes: ['building'], lines: ['building_to_maria'], reveal: false },
      { nodes: ['hvi'],      lines: ['hvi_redirect'],   reveal: false },
      { nodes: [],           lines: [],                 reveal: true  },
    ];

    const drawnNodes = new Set();
    const drawnLines = new Set();

    // ── SVG helper ────────────────────────────────────────────────
    function svgEl(tag, attrs) {
      const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, String(v)));
      return el;
    }

    // ── Draw a node ───────────────────────────────────────────────
    function drawNode(id) {
      const d = NODE_DEFS[id];
      if (!d || drawnNodes.has(id)) return;
      drawnNodes.add(id);

      const g = svgEl('g', { class: 'ant-svg-node',
        transform: `translate(${d.cx},${d.cy})` });

      g.appendChild(svgEl('circle', {
        r: d.r, fill: d.fill,
        ...(d.strokeW ? { stroke: d.stroke, 'stroke-width': d.strokeW } : {}),
      }));

      // Main label
      g.appendChild(svgEl('text', {
        'text-anchor': 'middle', dy: '-0.25em',
        'font-family': "'Satoshi', sans-serif",
        'font-size': id === 'maria' ? '14' : '11',
        'font-weight': '700',
        fill: d.labelColor,
        'pointer-events': 'none',
      })).textContent = d.label;

      // Sub-label
      g.appendChild(svgEl('text', {
        'text-anchor': 'middle', dy: '1.1em',
        'font-family': "'Satoshi', sans-serif",
        'font-size': id === 'maria' ? '10' : '9',
        'font-weight': '400',
        fill: d.subColor,
        'pointer-events': 'none',
      })).textContent = d.sublabel;

      nodesG.appendChild(g);
      requestAnimationFrame(() => g.classList.add('is-visible'));
    }

    // ── Draw a line ───────────────────────────────────────────────
    function drawLine(id) {
      const d = LINE_DEFS[id];
      if (!d || drawnLines.has(id)) return;
      drawnLines.add(id);

      const from = NODE_DEFS[d.from];

      if (d.to) {
        const to   = NODE_DEFS[d.to];
        const dx   = to.cx - from.cx;
        const dy   = to.cy - from.cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const gap  = 7;
        const x1 = from.cx + (dx / dist) * (from.r + gap);
        const y1 = from.cy + (dy / dist) * (from.r + gap);
        const x2 = to.cx   - (dx / dist) * (to.r   + gap);
        const y2 = to.cy   - (dy / dist) * (to.r   + gap);

        const line = svgEl('line', {
          class: 'ant-svg-line',
          x1, y1, x2, y2,
          stroke: d.stroke, 'stroke-width': d.strokeW,
          'stroke-linecap': 'round',
          'marker-end': d.marker,
          ...(d.dash ? { 'stroke-dasharray': d.dash } : {}),
        });
        linesG.appendChild(line);
        requestAnimationFrame(() => line.classList.add('is-visible'));

      } else {
        // HVI redirect — dashed line pointing away toward "Resources"
        const dx   = d.toX - from.cx;
        const dy   = d.toY - from.cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const x1   = from.cx + (dx / dist) * (from.r + 7);
        const y1   = from.cy + (dy / dist) * (from.r + 7);

        const line = svgEl('line', {
          class: 'ant-svg-line',
          x1, y1, x2: d.toX, y2: d.toY,
          stroke: d.stroke, 'stroke-width': d.strokeW,
          'stroke-dasharray': d.dash, 'stroke-linecap': 'round',
          'marker-end': d.marker,
        });
        linesG.appendChild(line);
        requestAnimationFrame(() => line.classList.add('is-visible'));

        // "Resources go elsewhere" text at line end
        const grp = svgEl('g', { class: 'ant-svg-reveal-label' });
        const t1  = svgEl('text', {
          x: d.toX, y: d.toY - 10, 'text-anchor': 'middle',
          'font-family': "'Satoshi', sans-serif",
          'font-size': '10', 'font-weight': '600', fill: '#1F6999',
        });
        t1.textContent = 'Resources';
        const t2 = svgEl('text', {
          x: d.toX, y: d.toY + 2, 'text-anchor': 'middle',
          'font-family': "'Satoshi', sans-serif",
          'font-size': '10', 'font-weight': '400', fill: '#1F6999',
        });
        t2.textContent = 'go elsewhere';
        grp.appendChild(t1);
        grp.appendChild(t2);
        linesG.appendChild(grp);
        requestAnimationFrame(() => grp.classList.add('is-visible'));
      }
    }

    // ── Final reveal: dashed bounding box labeled "COOLING DESERT"
    function drawReveal() {
      const rect = svgEl('rect', {
        class: 'ant-svg-reveal-label',
        x: 14, y: 12, width: 452, height: 436, rx: 12,
        fill: 'none', stroke: '#922B21',
        'stroke-width': '1.5', 'stroke-dasharray': '9,6',
      });
      labelG.appendChild(rect);

      const lbl = svgEl('text', {
        class: 'ant-svg-reveal-label',
        x: 240, y: 10, 'text-anchor': 'middle',
        'font-family': "'Satoshi', sans-serif",
        'font-size': '11', 'font-weight': '700',
        'letter-spacing': '0.12em', fill: '#922B21',
      });
      lbl.textContent = 'COOLING DESERT';
      labelG.appendChild(lbl);

      requestAnimationFrame(() => {
        rect.classList.add('is-visible');
        lbl.classList.add('is-visible');
      });
    }

    // ── Activate a step (draw its nodes/lines) ────────────────────
    function activateStep(idx) {
      const map = STEP_MAP[idx];
      if (!map) return;
      map.nodes.forEach(drawNode);
      map.lines.forEach(drawLine);
      if (map.reveal) drawReveal();
    }

    // ── IntersectionObserver: advance when panel is 40% visible ──
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-active');
          const step = Number(entry.target.dataset.step);
          activateStep(step);
        } else {
          entry.target.classList.remove('is-active');
        }
      });
    }, { threshold: 0.4 });

    panels.forEach(panel => observer.observe(panel));

    // Activate step 0 immediately (Maria appears without scrolling)
    activateStep(0);
    if (panels[0]) panels[0].classList.add('is-active');
  }


  // ══════════════════════════════════════════════════════════════
  // FIVE QUESTIONS — Progressive Network Scrollytelling
  // ══════════════════════════════════════════════════════════════
  function buildFiveQuestions() {
    const svg     = document.getElementById('aq-network-svg');
    const linksG  = document.getElementById('aq-links');
    const nodesG  = document.getElementById('aq-nodes');
    const labelEl = document.getElementById('aq-viz-label');
    const panels  = document.querySelectorAll('#aq-panels .aq-panel');
    if (!svg || !panels.length) return;

    // ── Node definitions ─────────────────────────────────────
    // Fixed positions in 460×420 viewBox
    const AQ_NODES = {
      maria:    { cx: 230, cy: 210, r: 46, fill: '#1A252F', label: 'Maria', sub: 'Renter' },
      heat:     { cx: 230, cy:  52, r: 28, fill: '#922B21', label: 'Heat', sub: '94°F' },
      bill:     { cx: 370, cy: 145, r: 25, fill: '#C96A28', label: 'Electric', sub: 'bill' },
      building: { cx: 340, cy: 330, r: 25, fill: '#6B5744', label: 'Pre-1938', sub: 'building' },
      hvi:      { cx:  90, cy: 145, r: 25, fill: '#1F6999', label: 'City HVI', sub: 'score' },
      rent:     { cx:  90, cy: 330, r: 25, fill: '#A93226', label: 'Rent', sub: 'burden' },
      // Q1 extras: what HVI misses (shown as dashed ghost nodes)
      ac_cost:  { cx: 400, cy: 260, r: 20, fill: 'none', stroke: '#C0392B', dash: true,
                  label: 'AC cost?', sub: null },
      lang:     { cx: 230, cy: 385, r: 20, fill: 'none', stroke: '#C0392B', dash: true,
                  label: 'Language?', sub: null },
      // Q4: cooling centers (broken link)
      centers:  { cx: 400, cy:  52, r: 22, fill: '#27AE60', label: 'Cooling', sub: 'Centers' },
      // Q5: intervention nodes
      int_hvi:  { cx:  28, cy:  75, r: 18, fill: '#27AE60', label: 'Fix HVI', sub: null },
      int_bill: { cx: 432, cy:  75, r: 18, fill: '#27AE60', label: 'Energy', sub: 'assist' },
      int_bldg: { cx: 432, cy: 355, r: 18, fill: '#27AE60', label: 'Retrofit', sub: null },
      int_rent: { cx:  28, cy: 355, r: 18, fill: '#27AE60', label: 'Rent', sub: 'relief' },
    };

    const AQ_LINKS = {
      heat_maria:     { from:'heat',     to:'maria',    stroke:'#922B21', dash:'',    w:2.5, marker:'url(#aq-arr-red)' },
      bill_maria:     { from:'bill',     to:'maria',    stroke:'#C96A28', dash:'7,5', w:2,   marker:'url(#aq-arr-org)' },
      building_maria: { from:'building', to:'maria',    stroke:'#6B5744', dash:'7,5', w:2,   marker:'url(#aq-arr-org)' },
      hvi_away:       { from:'hvi',      to:null,       stroke:'#1F6999', dash:'4,6', w:2,   marker:'url(#aq-arr-blue)',
                        toX: 15, toY: 45 },
      rent_bill:      { from:'rent',     to:'bill',     stroke:'#A93226', dash:'5,4', w:2,   marker:'url(#aq-arr-red)' },
      rent_maria:     { from:'rent',     to:'maria',    stroke:'#A93226', dash:'7,5', w:2,   marker:'url(#aq-arr-red)' },
      centers_broken: { from:'centers',  to:'maria',    stroke:'#27AE60', dash:'8,6', w:1.5, marker:'url(#aq-arr-grn)' },
      int_hvi_hvi:    { from:'int_hvi',  to:'hvi',      stroke:'#27AE60', dash:'',    w:2,   marker:'url(#aq-arr-grn)' },
      int_bill_bill:  { from:'int_bill', to:'bill',     stroke:'#27AE60', dash:'',    w:2,   marker:'url(#aq-arr-grn)' },
      int_bldg_bldg:  { from:'int_bldg', to:'building', stroke:'#27AE60', dash:'',    w:2,   marker:'url(#aq-arr-grn)' },
      int_rent_rent:  { from:'int_rent', to:'rent',     stroke:'#27AE60', dash:'',    w:2,   marker:'url(#aq-arr-grn)' },
    };

    // Which nodes/links appear at each question state
    const Q_STATES = [
      {
        nodes: ['maria','heat','hvi'],
        links: ['heat_maria','hvi_away'],
        ghosts: ['ac_cost','lang'],
        label: 'The city\'s Heat Vulnerability Index (blue) defines which neighborhoods get resources. But watch what it leaves unmeasured.',
      },
      {
        nodes: ['maria','heat','hvi','building'],
        links: ['heat_maria','hvi_away','building_maria'],
        ghosts: [],
        label: 'The pre-1938 building (brown) blocks cooling access independently of the household\'s finances. The building itself is an actor.',
      },
      {
        nodes: ['maria','heat','hvi','building','bill','rent'],
        links: ['heat_maria','hvi_away','building_maria','bill_maria','rent_bill','rent_maria'],
        ghosts: [],
        label: 'Rent burden (dark red) drives the electric bill, which blocks the AC switch. A financial chain the HVI never traces.',
      },
      {
        nodes: ['maria','heat','hvi','building','bill','rent','centers'],
        links: ['heat_maria','hvi_away','building_maria','bill_maria','rent_bill','rent_maria','centers_broken'],
        ghosts: [],
        label: 'Cooling centers (green) exist — but their script doesn\'t match reality. Closed Sundays, age-restricted, too far away.',
      },
      {
        nodes: ['maria','heat','hvi','building','bill','rent','centers','int_hvi','int_bill','int_bldg','int_rent'],
        links: ['heat_maria','hvi_away','building_maria','bill_maria','rent_bill','rent_maria',
                'int_hvi_hvi','int_bill_bill','int_bldg_bldg','int_rent_rent'],
        ghosts: [],
        label: '67% reduction in cooling deserts when all four interventions combine. Single-point fixes leave the other constraints intact.',
      },
    ];

    function svgNS(tag, attrs) {
      const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, String(v)));
      return el;
    }

    const drawnNodes = new Set(), drawnLinks = new Set(), drawnGhosts = new Set();

    function drawNode(id) {
      if (drawnNodes.has(id)) return;
      drawnNodes.add(id);
      const d = AQ_NODES[id];
      const g = svgNS('g', { class: 'aq-node', opacity: '0',
        transform: `translate(${d.cx},${d.cy})`, style: 'transition: opacity 0.5s ease' });

      if (d.dash) {
        g.appendChild(svgNS('circle', { r: d.r, fill: 'none',
          stroke: d.stroke, 'stroke-width': '2', 'stroke-dasharray': '6,4' }));
      } else {
        g.appendChild(svgNS('circle', { r: d.r, fill: d.fill }));
      }

      const lc = d.dash ? (d.stroke || '#C0392B') : '#fff';
      const lt = svgNS('text', { 'text-anchor': 'middle',
        'font-family': "'Satoshi',sans-serif", 'font-size': id === 'maria' ? '12' : '9',
        'font-weight': '700', fill: lc, dy: d.sub ? '-0.25em' : '0.35em',
        'pointer-events': 'none' });
      lt.textContent = d.label;
      g.appendChild(lt);
      if (d.sub) {
        const ls = svgNS('text', { 'text-anchor': 'middle',
          'font-family': "'Satoshi',sans-serif", 'font-size': '8', 'font-weight': '400',
          fill: d.dash ? lc : 'rgba(255,255,255,0.65)', dy: '1.1em',
          'pointer-events': 'none' });
        ls.textContent = d.sub;
        g.appendChild(ls);
      }
      nodesG.appendChild(g);
      requestAnimationFrame(() => { g.style.opacity = '1'; });
    }

    function drawGhost(id) {
      if (drawnGhosts.has(id)) return;
      drawnGhosts.add(id);
      const d = AQ_NODES[id];
      const g = svgNS('g', { class: 'aq-ghost', opacity: '0',
        transform: `translate(${d.cx},${d.cy})`, style: 'transition: opacity 0.6s ease' });
      g.appendChild(svgNS('circle', { r: d.r, fill: 'rgba(192,57,43,0.08)',
        stroke: '#C0392B', 'stroke-width': '2', 'stroke-dasharray': '5,4' }));
      const lt = svgNS('text', { 'text-anchor': 'middle',
        'font-family': "'Satoshi',sans-serif", 'font-size': '9', 'font-weight': '700',
        fill: '#C0392B', dy: '0.35em', 'pointer-events': 'none' });
      lt.textContent = d.label;
      g.appendChild(lt);
      nodesG.appendChild(g);
      requestAnimationFrame(() => { g.style.opacity = '1'; });
    }

    function drawLink(id) {
      if (drawnLinks.has(id)) return;
      drawnLinks.add(id);
      const d = AQ_LINKS[id];
      const from = AQ_NODES[d.from];
      let line;
      if (d.to) {
        const to = AQ_NODES[d.to];
        const dx = to.cx - from.cx, dy = to.cy - from.cy;
        const dist = Math.sqrt(dx*dx + dy*dy), gap = 6;
        const x1 = from.cx + (dx/dist)*(from.r+gap), y1 = from.cy + (dy/dist)*(from.r+gap);
        const x2 = to.cx   - (dx/dist)*(to.r+gap),   y2 = to.cy   - (dy/dist)*(to.r+gap);
        line = svgNS('line', { x1, y1, x2, y2, stroke: d.stroke,
          'stroke-width': d.w, 'stroke-linecap': 'round',
          'marker-end': d.marker, opacity: '0',
          style: 'transition: opacity 0.5s ease',
          ...(d.dash ? { 'stroke-dasharray': d.dash } : {}) });
      } else {
        const dx = d.toX - from.cx, dy = d.toY - from.cy;
        const dist = Math.sqrt(dx*dx + dy*dy), gap = 6;
        const x1 = from.cx + (dx/dist)*(from.r+gap), y1 = from.cy + (dy/dist)*(from.r+gap);
        line = svgNS('line', { x1, y1, x2: d.toX, y2: d.toY, stroke: d.stroke,
          'stroke-width': d.w, 'stroke-dasharray': d.dash, 'stroke-linecap': 'round',
          'marker-end': d.marker, opacity: '0',
          style: 'transition: opacity 0.5s ease' });
      }
      linksG.appendChild(line);
      requestAnimationFrame(() => { line.setAttribute('opacity', '1'); });
    }

    Q_STATES.forEach((s, i) => { s._idx = i; });

    function applyQStateFull(idx) {
      const s = Q_STATES[idx];
      if (!s) return;
      if (labelEl) {
        labelEl.style.opacity = '0';
        setTimeout(() => { labelEl.textContent = s.label; labelEl.style.opacity = '1'; }, 200);
      }
      s.nodes.forEach(id => {
        if (!drawnNodes.has(id)) {
          drawNode(id);
          const last = nodesG.lastElementChild;
          if (last && !last.dataset.nid) last.dataset.nid = id;
        }
      });
      s.links.forEach(drawLink);
      s.ghosts.forEach(drawGhost);

      // Dim nodes not in active set
      nodesG.querySelectorAll('[data-nid]').forEach(g => {
        g.style.opacity = s.nodes.includes(g.dataset.nid) ? '1' : '0.18';
      });
      // Dim links similarly
      linksG.children && Array.from(linksG.children).forEach((line, i) => {
        const drawn = Array.from(drawnLinks);
        const linkId = drawn[i];
        if (linkId) line.setAttribute('opacity', s.links.includes(linkId) ? '1' : '0.15');
      });
    }

    // Draw initial state immediately
    applyQStateFull(0);
    // Tag initial nodes
    nodesG.querySelectorAll('.aq-node').forEach((g, i) => {
      const keys = Object.keys(AQ_NODES);
      if (!g.dataset.nid && i < keys.length) g.dataset.nid = keys[i];
    });

    // IntersectionObserver for scroll
    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-active');
        panels.forEach(p => { if (p !== entry.target) p.classList.remove('is-active'); });
        const q = parseInt(entry.target.dataset.q || '0', 10);
        applyQStateFull(q);
      });
    }, { rootMargin: '-20% 0px -20% 0px', threshold: 0.2 });

    panels.forEach(p => obs.observe(p));
    if (panels[0]) panels[0].classList.add('is-active');
  }


  // ══════════════════════════════════════════════════════════════
  // ACTOR-NETWORK DATA
  // ══════════════════════════════════════════════════════════════
  const NODES = [
    { id: 'renters',   label: 'Renters',        type: 'human',
      detail: 'Bear the full cost of heat without owning their building. Face financial barriers to cooling. Cannot modify infrastructure.' },
    { id: 'landlords', label: 'Landlords',       type: 'human',
      detail: 'Control building infrastructure. Decide whether to invest in cooling upgrades. Extract rent regardless of building conditions.' },
    { id: 'city',      label: 'City Agencies',   type: 'human',
      detail: 'DOHMH defines heat risk via the HVI. Deploys cooling centers and outreach based on HVI rankings. Controls the translation chain.' },
    { id: 'nycha',     label: 'NYCHA',           type: 'human',
      detail: 'Manages 178,000 public housing units. Charges a monthly AC surcharge cited by 1 in 3 residents as a barrier to cooling.' },
    { id: 'policy',    label: 'Policymakers',    type: 'human',
      detail: 'Allocate budgets and design programs. Constrained by what data systems show them. The HVI is the primary input to their heat response.' },

    { id: 'heat',      label: 'Heat',            type: 'nonhuman',
      detail: 'Not a passive backdrop — an actor. Kills more New Yorkers each year than hurricanes, floods, and blizzards combined. Acts differently across neighborhoods.' },
    { id: 'hvi',       label: 'HVI Index',       type: 'nonhuman',
      detail: 'An "inscription device" (Latour). Translates complex conditions into a single number that drives resource allocation. Counts AC ownership, not AC use.' },
    { id: 'building',  label: 'Pre-1940 Bldg',   type: 'nonhuman',
      detail: 'Lacks wiring capacity for modern AC. Encodes 1930s infrastructure policy into today\'s heat emergency. Negative correlation with AC ownership (r = −0.31).' },
    { id: 'bill',      label: 'Electric Bill',   type: 'nonhuman',
      detail: '21% of renter AC owners cannot afford to run it. For severely rent-burdened households, energy = 10.3% of income — 4× the non-burdened rate.' },
    { id: 'rent',      label: 'Rent Check',      type: 'nonhuman',
      detail: 'Extracts 50%+ of income from severely burdened households — leaving nothing for electricity. The most powerful financial constraint in the network.' },
    { id: 'trees',     label: 'Tree Canopy',     type: 'nonhuman',
      detail: 'Cooling deserts average 2.1% less canopy than safer neighborhoods. Trees reduce surface temperatures and are infrastructure, not decoration.' },
    { id: 'ac',        label: 'Air Conditioner', type: 'nonhuman',
      detail: 'Technically present in 84–95% of households across HVI ranks. Effectively accessible to far fewer — blocked by bills, buildings, and surcharges.' },
    { id: 'alert',     label: 'Emergency Alert', type: 'nonhuman',
      detail: 'English-only alert system excludes 10.5% of NYC renters who are limited English proficient. A communication infrastructure that participates in exclusion.' },
    { id: 'surcharge', label: 'NYCHA Surcharge', type: 'nonhuman',
      detail: 'A policy artifact that rations cooling access in public housing. 1 in 3 NYCHA residents cite it as a barrier. Removes itself from housing cost calculations.' },

    { id: 'desert',    label: 'Cooling Desert',  type: 'outcome',
      detail: '557 neighborhoods. 1.47M renters. Not a fixed place — a stable network configuration that produces structural vulnerability to heat.' },
  ];

  const LINKS = [
    { source: 'heat',      target: 'hvi',      type: 'translation' },
    { source: 'hvi',       target: 'city',     type: 'translation' },
    { source: 'city',      target: 'policy',   type: 'translation' },
    { source: 'heat',      target: 'renters',  type: 'constraint'  },
    { source: 'renters',   target: 'ac',       type: 'resource'    },
    { source: 'bill',      target: 'ac',       type: 'constraint'  },
    { source: 'rent',      target: 'bill',     type: 'constraint'  },
    { source: 'building',  target: 'ac',       type: 'constraint'  },
    { source: 'landlords', target: 'building', type: 'resource'    },
    { source: 'landlords', target: 'renters',  type: 'constraint'  },
    { source: 'alert',     target: 'renters',  type: 'constraint'  },
    { source: 'surcharge', target: 'nycha',    type: 'constraint'  },
    { source: 'nycha',     target: 'renters',  type: 'resource'    },
    { source: 'trees',     target: 'heat',     type: 'resource'    },
    { source: 'hvi',       target: 'desert',   type: 'constraint'  },
    { source: 'bill',      target: 'desert',   type: 'constraint'  },
    { source: 'building',  target: 'desert',   type: 'constraint'  },
    { source: 'rent',      target: 'desert',   type: 'constraint'  },
    { source: 'alert',     target: 'desert',   type: 'constraint'  },
    { source: 'policy',    target: 'desert',   type: 'resource'    },
  ];

  // Scroll states for the network
  const STATES = [
    {
      hl: null, links: null, dim: false,
      label: 'Every shape is an actor. Circles = human actors. Diamonds = non-human actors. Hover any node to see its role in producing or preventing cooling deserts.'
    },
    {
      hl: ['renters','landlords','city','nycha','policy'], links: null, dim: true,
      label: 'Human actors — they make decisions, but each one is constrained by the broader network they are enrolled in.'
    },
    {
      hl: ['heat','hvi','building','bill','rent','trees','ac','alert','surcharge'], links: null, dim: true,
      label: 'Non-human actors — they participate, constrain, and shape outcomes without making decisions in any conventional sense.'
    },
    {
      hl: ['heat','hvi','city','policy'],
      links: ['heat→hvi','hvi→city','city→policy'], dim: true,
      label: 'The translation chain: heat → measurement → policy. This is how risk becomes response — but affordability never enters this path.'
    },
    {
      hl: ['rent','bill','building','alert','renters','ac'],
      links: ['rent→bill','bill→ac','building→ac','renters→ac','alert→renters'], dim: true,
      label: 'The constraint network: non-human actors that together prevent households from accessing cooling even when AC exists.'
    },
    {
      hl: ['desert','bill','building','rent','alert','hvi'],
      links: ['bill→desert','building→desert','rent→desert','alert→desert','hvi→desert'], dim: false,
      label: '557 neighborhoods. The cooling desert is not a place. It is what this network produces — and it persists because the network is stable.'
    },
  ];


  // ══════════════════════════════════════════════════════════════
  // MAIN INIT (called once theory path first activated)
  // ══════════════════════════════════════════════════════════════
  function initTheory() {
    initSceneBuilder();
    buildFiveQuestions();
    buildNetwork();
    buildActorViz();
    buildTranslationFlow();
    buildPolicyViz();
    initActorTabs();
    initScrollytelling();
  }


  // ══════════════════════════════════════════════════════════════
  // D3 FORCE NETWORK
  // ══════════════════════════════════════════════════════════════
  function buildNetwork() {
    const wrap = document.getElementById('ant-network-svg');
    if (!wrap || typeof d3 === 'undefined') return;

    const W = wrap.clientWidth  || 500;
    const H = wrap.clientHeight || 440;

    const svg = d3.select(wrap).append('svg')
      .attr('width', '100%').attr('height', '100%')
      .attr('viewBox', `0 0 ${W} ${H}`)
      .style('overflow', 'visible');

    // Arrow markers
    const defs = svg.append('defs');
    const markerDefs = [
      { id: 'arr-translation', color: '#F5A623' },
      { id: 'arr-constraint',  color: '#C0392B' },
      { id: 'arr-resource',    color: '#27AE60' },
    ];
    markerDefs.forEach(m => {
      defs.append('marker')
        .attr('id', m.id)
        .attr('viewBox', '0 -4 8 8').attr('refX', 16).attr('refY', 0)
        .attr('markerWidth', 5).attr('markerHeight', 5).attr('orient', 'auto')
        .append('path').attr('d', 'M0,-4L8,0L0,4').attr('fill', m.color);
    });

    const nodes = NODES.map(n => ({ ...n }));
    const links = LINKS.map(l => ({ ...l }));

    const sim = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(85).strength(0.5))
      .force('charge', d3.forceManyBody().strength(-240))
      .force('center', d3.forceCenter(W / 2, H / 2))
      .force('collision', d3.forceCollide(36));

    // Shared tooltip (reuse existing or create)
    let tipEl = document.querySelector('.d3-tip.ant-tip');
    if (!tipEl) {
      tipEl = Object.assign(document.createElement('div'), { className: 'd3-tip ant-tip' });
      document.body.appendChild(tipEl);
    }

    // Links
    const linkG   = svg.append('g').attr('class', 'ant-links');
    const linkSels = linkG.selectAll('line').data(links).enter().append('line')
      .attr('class', d => 'ant-edge edge-' + d.type)
      .attr('stroke', d => d.type === 'translation' ? '#F5A623' : d.type === 'constraint' ? '#C0392B' : '#27AE60')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', d => d.type === 'constraint' ? '5,3' : 'none')
      .attr('opacity', 0.3)
      .attr('marker-end', d => `url(#arr-${d.type})`);

    // Nodes
    const nodeG   = svg.append('g').attr('class', 'ant-nodes');
    const nodeSels = nodeG.selectAll('g').data(nodes).enter().append('g')
      .attr('class', d => 'ant-node node-' + d.type)
      .style('cursor', 'pointer')
      .call(d3.drag()
        .on('start', (ev, d) => { if (!ev.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag',  (ev, d) => { d.fx = ev.x; d.fy = ev.y; })
        .on('end',   (ev, d) => { if (!ev.active) sim.alphaTarget(0); d.fx = null; d.fy = null; })
      )
      .on('mouseover', function (ev, d) {
        tipEl.innerHTML = `<strong style="font-size:13px">${d.label}</strong><br><span style="font-size:11px;opacity:0.85;line-height:1.4">${d.detail}</span>`;
        tipEl.style.display = 'block';
        tipEl.style.left = (ev.pageX + 14) + 'px';
        tipEl.style.top  = (ev.pageY - 12) + 'px';
        d3.select(this).select('.node-shape').attr('stroke-width', 3.5);
      })
      .on('mousemove', ev => { tipEl.style.left = (ev.pageX+14)+'px'; tipEl.style.top=(ev.pageY-12)+'px'; })
      .on('mouseout',  function () {
        tipEl.style.display = 'none';
        d3.select(this).select('.node-shape').attr('stroke-width', 2);
      });

    // Outcome: large filled circle
    nodeSels.filter(d => d.type === 'outcome').append('circle')
      .attr('class', 'node-shape')
      .attr('r', 26).attr('fill', '#922B21').attr('stroke', '#5D1A14').attr('stroke-width', 2).attr('opacity', 0.95);

    // Human actors: medium circle
    nodeSels.filter(d => d.type === 'human').append('circle')
      .attr('class', 'node-shape')
      .attr('r', 18).attr('fill', '#7FB3D3').attr('stroke', '#2471A3').attr('stroke-width', 2).attr('opacity', 0.9);

    // Non-human: diamond (rotated rect)
    nodeSels.filter(d => d.type === 'nonhuman').append('rect')
      .attr('class', 'node-shape')
      .attr('width', 28).attr('height', 28).attr('x', -14).attr('y', -14)
      .attr('transform', 'rotate(45)')
      .attr('fill', '#F5C26B').attr('stroke', '#B7770D').attr('stroke-width', 2).attr('opacity', 0.9);

    // Labels
    nodeSels.append('text')
      .attr('class', 'node-label')
      .attr('text-anchor', 'middle')
      .attr('y', d => d.type === 'outcome' ? 4 : 36)
      .attr('font-size', d => d.type === 'outcome' ? '9.5px' : '9px')
      .attr('font-weight', '600')
      .attr('fill', d => d.type === 'outcome' ? '#fff' : '#1A252F')
      .attr('pointer-events', 'none')
      .text(d => {
        if (d.type === 'outcome') return d.label;
        return d.label.length > 13 ? d.label.slice(0, 12) + '…' : d.label;
      });

    sim.on('tick', () => {
      linkSels
        .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
      nodeSels.attr('transform', d => `translate(${Math.max(20, Math.min(W-20, d.x))},${Math.max(20, Math.min(H-20, d.y))})`);
    });

    // Store for scrollytelling state changes
    window._antViz = { nodeSels, linkSels, nodes, links };
  }


  // ══════════════════════════════════════════════════════════════
  // APPLY SCROLL STATE TO NETWORK
  // ══════════════════════════════════════════════════════════════
  function applyState(idx) {
    if (!window._antViz) return;
    const { nodeSels, linkSels } = window._antViz;
    const s = STATES[idx] || STATES[0];

    const labelEl = document.getElementById('ant-viz-label');
    if (labelEl) {
      labelEl.style.opacity = '0';
      setTimeout(() => { labelEl.textContent = s.label; labelEl.style.opacity = '1'; }, 200);
    }

    nodeSels.select('.node-shape').transition().duration(380)
      .attr('opacity', d => (!s.hl || !s.dim) ? 0.9 : (s.hl.includes(d.id) ? 1 : 0.12))
      .attr('stroke-width', d => (s.hl && s.hl.includes(d.id)) ? 3.5 : 2);

    nodeSels.select('.node-label').transition().duration(380)
      .attr('opacity', d => (!s.hl || !s.dim) ? 1 : (s.hl.includes(d.id) ? 1 : 0.18));

    linkSels.transition().duration(380)
      .attr('opacity', d => {
        if (!s.links) return 0.3;
        return s.links.includes(d.source.id + '→' + d.target.id) ? 0.9 : 0.08;
      })
      .attr('stroke-width', d => {
        if (!s.links) return 1.5;
        return s.links.includes(d.source.id + '→' + d.target.id) ? 3 : 1;
      });
  }


  // ══════════════════════════════════════════════════════════════
  // SCROLLYTELLING — panels drive network state
  // ══════════════════════════════════════════════════════════════
  function initScrollytelling() {
    const panels = document.querySelectorAll('#ant-panels .ant-panel');
    if (!panels.length) return;

    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('ant-panel-active');
        panels.forEach(p => { if (p !== entry.target) p.classList.remove('ant-panel-active'); });
        applyState(parseInt(entry.target.dataset.state || '0', 10));
      });
    }, { rootMargin: '-15% 0px -15% 0px', threshold: 0.15 });

    panels.forEach(p => obs.observe(p));
  }


  // ══════════════════════════════════════════════════════════════
  // ACTOR TABS — tab switching
  // ══════════════════════════════════════════════════════════════
  function initActorTabs() {
    const btns   = document.querySelectorAll('.aat-btn');
    const panels = document.querySelectorAll('.aat-panel');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.actor;
        btns.forEach(b => b.classList.toggle('aat-btn--active', b.dataset.actor === key));
        panels.forEach(p => p.classList.toggle('aat-panel--active', p.id === 'aat-panel-' + key));
      });
    });
  }


  // ══════════════════════════════════════════════════════════════
  // ACTOR VISUALIZATIONS
  // ══════════════════════════════════════════════════════════════
  function buildActorViz() {
    buildBillPeople();
    buildBuildingEras();
    buildHviLens();
  }

  // ── Viz 1: 10×10 person grid — 79 green, 21 red ────────────
  function buildBillPeople() {
    const wrap = document.getElementById('viz-bill-people');
    if (!wrap || typeof d3 === 'undefined') return;

    const TOTAL = 100, CANT = 21;
    const COLS = 10, SIZE = 28, GAP = 5;
    const W = COLS * (SIZE + GAP) - GAP;
    const ROWS = Math.ceil(TOTAL / COLS);
    const H = ROWS * (SIZE + GAP) - GAP;

    const svg = d3.select(wrap).append('svg')
      .attr('viewBox', `0 0 ${W} ${H}`)
      .attr('width', W).attr('height', H);

    const data = d3.range(TOTAL).map(i => ({ i, cant: i < CANT }));

    const tip = document.querySelector('.d3-tip') || (() => {
      const t = Object.assign(document.createElement('div'), { className: 'd3-tip' });
      document.body.appendChild(t); return t;
    })();

    svg.selectAll('.person')
      .data(data).enter().append('g')
      .attr('class', 'person')
      .attr('transform', d => {
        const col = d.i % COLS, row = Math.floor(d.i / COLS);
        return `translate(${col * (SIZE + GAP)},${row * (SIZE + GAP)})`;
      })
      .each(function (d) {
        // Head circle
        d3.select(this).append('circle')
          .attr('cx', SIZE / 2).attr('cy', SIZE * 0.28).attr('r', SIZE * 0.22)
          .attr('fill', d.cant ? '#922B21' : '#27AE60')
          .attr('opacity', d.cant ? 1 : 0.72);
        // Body arc (trapezoid via path)
        const bw = SIZE * 0.42, bh = SIZE * 0.38, cx = SIZE / 2, cy = SIZE * 0.58;
        d3.select(this).append('path')
          .attr('d', `M${cx - bw * 0.6},${cy + bh} Q${cx - bw * 0.8},${cy} ${cx},${cy - bh * 0.05} Q${cx + bw * 0.8},${cy} ${cx + bw * 0.6},${cy + bh}Z`)
          .attr('fill', d.cant ? '#922B21' : '#27AE60')
          .attr('opacity', d.cant ? 1 : 0.72);
      })
      .style('cursor', 'pointer')
      .on('mouseover', function (ev, d) {
        tip.innerHTML = d.cant
          ? '<b>Can\'t afford to run AC</b><br>Owns an air conditioner — but the monthly electric bill during summer is unaffordable.'
          : '<b>Can run AC when needed</b><br>Has both the appliance and enough income left after rent to use it.';
        tip.style.display = 'block';
        tip.style.left = (ev.pageX + 12) + 'px';
        tip.style.top  = (ev.pageY - 10) + 'px';
      })
      .on('mousemove', ev => { tip.style.left = (ev.pageX + 12) + 'px'; tip.style.top = (ev.pageY - 10) + 'px'; })
      .on('mouseout',  () => { tip.style.display = 'none'; });

    // Animate in: red figures appear last
    svg.selectAll('.person').attr('opacity', 0)
      .transition().duration(400).delay(d => d.cant ? 700 + (d.i - (TOTAL - CANT)) * 30 : d.i * 8)
      .attr('opacity', 1);
  }

  // ── Viz 2: Building era columns with cooling capacity dots ──
  function buildBuildingEras() {
    const wrap = document.getElementById('viz-building-eras');
    if (!wrap || typeof d3 === 'undefined') return;

    const eras = [
      { label: 'Before 1940', share: 28, acCapacity: 15, color: '#922B21',
        note: 'Knob-and-tube wiring common. Most cannot support a window AC unit safely.' },
      { label: '1940–1969',   share: 44, acCapacity: 48, color: '#E07B39',
        note: 'Mixed wiring standards. Some units upgraded but many still inadequate for modern AC loads.' },
      { label: '1970–1999',   share: 18, acCapacity: 78, color: '#F5C26B',
        note: 'Modern circuits becoming standard. Most units can support window AC.' },
      { label: '2000–present',share: 10, acCapacity: 97, color: '#27AE60',
        note: 'Built for air conditioning. Essentially all units have adequate electrical capacity.' },
    ];

    const W = Math.min(wrap.clientWidth || 480, 480);
    const BAR_H = 200, LABEL_H = 60, margin = { top: 20, right: 20, bottom: LABEL_H, left: 50 };
    const w = W - margin.left - margin.right;
    const h = BAR_H;
    const H = BAR_H + margin.top + margin.bottom;

    const svg = d3.select(wrap).append('svg')
      .attr('viewBox', `0 0 ${W} ${H}`)
      .attr('width', W).attr('height', H);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand().domain(eras.map(e => e.label)).range([0, w]).padding(0.25);
    const y = d3.scaleLinear().domain([0, 100]).range([h, 0]);

    // Y axis (% can support AC)
    g.append('g').call(d3.axisLeft(y).tickValues([0,25,50,75,100]).tickFormat(d => d + '%'))
      .call(ax => ax.select('.domain').remove())
      .selectAll('text').attr('font-size', '11px').attr('fill', '#6B7280');

    g.append('text').attr('x', -h / 2).attr('y', -38)
      .attr('transform', 'rotate(-90)').attr('text-anchor', 'middle')
      .attr('font-size', '11px').attr('fill', '#6B7280')
      .text('% of units that can support AC');

    // Grid lines
    [25, 50, 75, 100].forEach(v => {
      g.append('line').attr('x1', 0).attr('x2', w)
        .attr('y1', y(v)).attr('y2', y(v))
        .attr('stroke', '#E2E8F0').attr('stroke-width', 1);
    });

    const tip = document.querySelector('.d3-tip') || document.querySelector('.ant-tip') || (() => {
      const t = Object.assign(document.createElement('div'), { className: 'd3-tip' });
      document.body.appendChild(t); return t;
    })();

    // Background share bars (total stock in era)
    g.selectAll('.era-bg')
      .data(eras).enter().append('rect')
      .attr('class', 'era-bg')
      .attr('x', d => x(d.label)).attr('width', x.bandwidth())
      .attr('y', 0).attr('height', h)
      .attr('fill', '#F0F4F8').attr('rx', 4);

    // Capacity bars
    const bars = g.selectAll('.era-bar')
      .data(eras).enter().append('rect')
      .attr('class', 'era-bar')
      .attr('x', d => x(d.label)).attr('width', x.bandwidth())
      .attr('y', h).attr('height', 0)
      .attr('fill', d => d.color).attr('rx', 4)
      .style('cursor', 'pointer')
      .on('mouseover', (ev, d) => {
        tip.innerHTML = `<b>${d.label}</b><br><b>${d.acCapacity}%</b> of units can support AC<br><span style="font-size:11px;opacity:0.85">${d.note}</span>`;
        tip.style.display = 'block';
        tip.style.left = (ev.pageX + 12) + 'px';
        tip.style.top  = (ev.pageY - 10) + 'px';
      })
      .on('mousemove', ev => { tip.style.left = (ev.pageX + 12) + 'px'; tip.style.top = (ev.pageY - 10) + 'px'; })
      .on('mouseout', () => { tip.style.display = 'none'; });

    bars.transition().duration(700).delay((_, i) => i * 120)
      .attr('y', d => y(d.acCapacity))
      .attr('height', d => h - y(d.acCapacity));

    // Percentage labels
    g.selectAll('.era-val')
      .data(eras).enter().append('text')
      .attr('class', 'era-val')
      .attr('x', d => x(d.label) + x.bandwidth() / 2)
      .attr('y', d => y(d.acCapacity) - 6)
      .attr('text-anchor', 'middle').attr('font-size', '12px').attr('font-weight', '700')
      .attr('fill', d => d.color).attr('opacity', 0)
      .text(d => d.acCapacity + '%')
      .transition().duration(400).delay((_, i) => i * 120 + 500)
      .attr('opacity', 1);

    // X axis labels
    g.selectAll('.era-label')
      .data(eras).enter().append('text')
      .attr('class', 'era-label')
      .attr('x', d => x(d.label) + x.bandwidth() / 2)
      .attr('y', h + 18).attr('text-anchor', 'middle')
      .attr('font-size', '11px').attr('fill', '#374151')
      .text(d => d.label);
  }

  // ── Viz 3: HVI "lens" — two columns what's IN vs MISSING ───
  function buildHviLens() {
    const wrap = document.getElementById('viz-hvi-lens');
    if (!wrap) return;

    const PIECES = [
      // included — green filled
      { id: 'surface_temp',   label: 'Surface Temperature',    type: 'in',
        detail: 'Satellite-measured land surface temperature. Hot pavement and rooftops vs. green, shaded streets.' },
      { id: 'greenspace',     label: 'Green Space Coverage',   type: 'in',
        detail: 'Tree canopy and parks per neighborhood. Cooling deserts average 2.1% less canopy than safer areas.' },
      { id: 'ac_own',         label: 'AC Ownership Rate',      type: 'in',
        detail: 'Share of households with an air conditioner. Does not measure whether it can actually be used.' },
      { id: 'income',         label: 'Household Income',       type: 'in',
        detail: 'Median income per neighborhood — a rough proxy for adaptive capacity, not a direct measure.' },
      { id: 'social_vuln',    label: 'Social Vulnerability',   type: 'in',
        detail: 'A composite of poverty, age, and isolation. Included, but calculated before rent burden data existed.' },

      // missing — red dashed outlines
      { id: 'ac_use',         label: 'AC Affordability',       type: 'out',
        detail: '21% of renter AC owners cannot afford to run it. This is not counted. The HVI sees the machine, not the bill.' },
      { id: 'bldg_wiring',    label: 'Building Wiring Age',    type: 'out',
        detail: '47% of NYC housing stock is pre-1980. Older wiring cannot safely run AC overnight — a physical barrier the index ignores.' },
      { id: 'rent_burden',    label: 'Rent Burden',            type: 'out',
        detail: 'Severely rent-burdened households spend 50%+ of income on rent — nothing left for electricity. Not in the formula.' },
      { id: 'lang_access',    label: 'Language Access',        type: 'out',
        detail: '10.5% of NYC renters are limited English proficient. Emergency alerts are English-only. Invisible to the HVI.' },
      { id: 'nycha_surcharge',label: 'NYCHA AC Surcharge',     type: 'out',
        detail: 'A $25/month public housing fee that deters 1 in 3 NYCHA residents from running AC. Not counted anywhere in the index.' },
    ];

    // Layout: 2 rows × 5 cols, pieces sized ~88px × 80px with puzzle connector tabs
    const COLS = 5, ROWS = 2;
    const PW = 88, PH = 76, GAP = 10, PAD = 16;
    const SVG_W = COLS * PW + (COLS - 1) * GAP + PAD * 2;
    const SVG_H = ROWS * PH + (ROWS - 1) * GAP + PAD * 2 + 52; // 52 for legend

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${SVG_W} ${SVG_H}`);
    svg.setAttribute('width', '100%');
    svg.setAttribute('class', 'puzzle-svg');
    svg.style.maxWidth = SVG_W + 'px';
    svg.style.overflow = 'visible';

    // Tooltip div
    const tip = document.createElement('div');
    tip.className = 'puzzle-tip';
    tip.style.cssText = 'position:absolute;display:none;max-width:220px;background:#1A252F;color:#F5F0E6;font-size:12px;line-height:1.5;padding:10px 13px;border-radius:6px;pointer-events:none;z-index:100;box-shadow:0 4px 16px rgba(0,0,0,0.35)';
    wrap.style.position = 'relative';
    wrap.appendChild(tip);

    // Build a puzzle-tab path for each piece.
    // Each piece can have tab protrusions/indentations on edges to suggest interlocking.
    // Simple approach: use rounded rect with a small circular tab on the right or bottom.
    function puzzlePath(x, y, w, h, tabSize) {
      const t = tabSize;
      const r = 6; // corner radius
      // Slightly irregular via a small tab protrusion on the right side midpoint
      return [
        `M ${x + r} ${y}`,
        `H ${x + w / 2 - t}`,
        `q ${t} -${t * 0.6} ${t * 2} 0`,  // top tab bump (subtle)
        `H ${x + w - r}`,
        `Q ${x + w} ${y} ${x + w} ${y + r}`,
        `V ${y + h / 2 - t}`,
        `q ${t * 0.6} ${t} 0 ${t * 2}`,    // right tab bump
        `V ${y + h - r}`,
        `Q ${x + w} ${y + h} ${x + w - r} ${y + h}`,
        `H ${x + w / 2 + t}`,
        `q -${t} ${t * 0.6} -${t * 2} 0`, // bottom tab indent
        `H ${x + r}`,
        `Q ${x} ${y + h} ${x} ${y + h - r}`,
        `V ${y + h / 2 + t}`,
        `q -${t * 0.6} -${t} 0 -${t * 2}`, // left tab indent
        `V ${y + r}`,
        `Q ${x} ${y} ${x + r} ${y}`,
        'Z'
      ].join(' ');
    }

    PIECES.forEach((piece, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const x = PAD + col * (PW + GAP);
      const y = PAD + row * (PH + GAP);

      const isIn  = piece.type === 'in';
      const tabSz = 6 + (i % 3); // slight variation per piece

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'puzzle-piece puzzle-piece--' + piece.type);
      g.setAttribute('data-id', piece.id);
      g.style.cursor = 'pointer';

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', puzzlePath(x, y, PW, PH, tabSz));
      if (isIn) {
        path.setAttribute('fill', '#D1FAE5');
        path.setAttribute('stroke', '#34D399');
        path.setAttribute('stroke-width', '2');
      } else {
        path.setAttribute('fill', 'rgba(192,57,43,0.06)');
        path.setAttribute('stroke', '#C0392B');
        path.setAttribute('stroke-width', '2');
        path.setAttribute('stroke-dasharray', '6,4');
      }
      path.setAttribute('opacity', '0');
      path.style.transition = 'opacity 0.4s ease, transform 0.4s ease';

      // Label text (two lines max)
      const words = piece.label.split(' ');
      const line1 = words.slice(0, 2).join(' ');
      const line2 = words.slice(2).join(' ');

      const text1 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text1.setAttribute('x', x + PW / 2);
      text1.setAttribute('y', y + (line2 ? PH / 2 - 6 : PH / 2 + 4));
      text1.setAttribute('text-anchor', 'middle');
      text1.setAttribute('font-size', '10.5');
      text1.setAttribute('font-weight', '600');
      text1.setAttribute('fill', isIn ? '#065F46' : '#C0392B');
      text1.setAttribute('pointer-events', 'none');
      text1.setAttribute('opacity', '0');
      text1.textContent = line1;

      g.appendChild(path);
      g.appendChild(text1);

      if (line2) {
        const text2 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text2.setAttribute('x', x + PW / 2);
        text2.setAttribute('y', y + PH / 2 + 9);
        text2.setAttribute('text-anchor', 'middle');
        text2.setAttribute('font-size', '10.5');
        text2.setAttribute('font-weight', '600');
        text2.setAttribute('fill', isIn ? '#065F46' : '#C0392B');
        text2.setAttribute('pointer-events', 'none');
        text2.setAttribute('opacity', '0');
        text2.textContent = line2;
        g.appendChild(text2);
      }

      // Hover tooltip
      g.addEventListener('mouseenter', (ev) => {
        tip.textContent = piece.detail;
        tip.style.display = 'block';
        const wr = wrap.getBoundingClientRect();
        const relX = ev.clientX - wr.left + 10;
        const relY = ev.clientY - wr.top - 12;
        tip.style.left = Math.min(relX, wr.width - 235) + 'px';
        tip.style.top = relY + 'px';
        path.setAttribute('opacity', '1');
        if (isIn) path.setAttribute('fill', '#A7F3D0');
        else path.setAttribute('fill', 'rgba(192,57,43,0.14)');
      });

      g.addEventListener('mousemove', (ev) => {
        const wr = wrap.getBoundingClientRect();
        tip.style.left = Math.min(ev.clientX - wr.left + 10, wr.width - 235) + 'px';
        tip.style.top = (ev.clientY - wr.top - 12) + 'px';
      });

      g.addEventListener('mouseleave', () => {
        tip.style.display = 'none';
        if (isIn) path.setAttribute('fill', '#D1FAE5');
        else path.setAttribute('fill', 'rgba(192,57,43,0.06)');
      });

      svg.appendChild(g);

      // Stagger-animate in
      const delay = isIn ? i * 60 : 300 + (i - 5) * 80;
      setTimeout(() => {
        path.setAttribute('opacity', '1');
        text1.setAttribute('opacity', '1');
        const t2 = g.querySelectorAll('text')[1];
        if (t2) t2.setAttribute('opacity', '1');
      }, delay);
    });

    // Legend
    const legY = PAD + ROWS * PH + (ROWS - 1) * GAP + 18;
    function legDot(x, y, fill, stroke, dash, label) {
      const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      r.setAttribute('x', x); r.setAttribute('y', y);
      r.setAttribute('width', '16'); r.setAttribute('height', '12');
      r.setAttribute('rx', '3'); r.setAttribute('fill', fill);
      r.setAttribute('stroke', stroke); r.setAttribute('stroke-width', '2');
      if (dash) r.setAttribute('stroke-dasharray', '4,3');
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.setAttribute('x', x + 22); t.setAttribute('y', y + 10);
      t.setAttribute('font-size', '11'); t.setAttribute('fill', '#4A5568');
      t.textContent = label;
      svg.appendChild(r); svg.appendChild(t);
    }
    legDot(PAD, legY, '#D1FAE5', '#34D399', false, 'What the HVI counts');
    legDot(PAD + 180, legY, 'rgba(192,57,43,0.06)', '#C0392B', true, 'What it leaves out — data that exists but was excluded');

    // Caption
    const cap = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    cap.setAttribute('x', PAD);
    cap.setAttribute('y', legY + 28);
    cap.setAttribute('font-size', '10.5');
    cap.setAttribute('fill', '#718096');
    cap.setAttribute('font-style', 'italic');
    cap.textContent = 'Hover each piece to see what it measures and what it costs to omit.';
    svg.appendChild(cap);

    wrap.insertBefore(svg, tip);
  }


  // ══════════════════════════════════════════════════════════════
  // TRANSLATION FLOW — Sankey diagram (what flows vs what gets dropped)
  // ══════════════════════════════════════════════════════════════
  function buildTranslationFlow() {
    const wrap = document.getElementById('sankey-viz');
    if (!wrap || typeof d3 === 'undefined') return;
    // d3-sankey may not be loaded — fall back gracefully
    if (typeof d3.sankey === 'undefined') {
      console.warn('d3-sankey not available; skipping Sankey render');
      return;
    }

    // Sankey data: nodes are pipeline stages; links show volume that flows vs drops.
    // "drop" links go to a shared "Lost Data" sink node at the bottom.
    const nodes = [
      { id: 'heat',   label: 'Heat Event',          color: '#922B21' },
      { id: 'data',   label: 'Data Collection',     color: '#C0392B' },
      { id: 'hvi',    label: 'HVI Score',            color: '#E07B39' },
      { id: 'policy', label: 'City Response',        color: '#D68910' },
      { id: 'action', label: 'On the Ground',        color: '#7FB3D3' },
      { id: 'drop',   label: 'Left Out',             color: '#B03030' }, // sink
    ];

    // Values represent relative importance (out of 100 entering the pipeline).
    // Flow links carry what moves forward; drop links carry what gets excluded.
    const links = [
      // stage transitions — forward flow
      { source: 0, target: 1, value: 100, drop: false },
      { source: 1, target: 2, value: 60,  drop: false },
      { source: 2, target: 3, value: 48,  drop: false },
      { source: 3, target: 4, value: 34,  drop: false },
      // drop streams — what each stage excludes
      { source: 1, target: 5, value: 40,  drop: true,
        label: 'Rent burden, building age, language access excluded from measurement' },
      { source: 2, target: 5, value: 12,  drop: true,
        label: '21% of AC owners cannot afford to run it — invisible to the score' },
      { source: 3, target: 5, value: 14,  drop: true,
        label: 'Households too constrained to travel to cooling centers' },
      { source: 4, target: 5, value: 34,  drop: true,
        label: '83% of cooling centers closed Sundays; 47% age-restricted; alerts English-only' },
    ];

    const margin = { top: 20, right: 24, bottom: 20, left: 24 };
    const wrapW = Math.min(wrap.clientWidth || 560, 680);
    const wrapH = 340;
    const W = wrapW - margin.left - margin.right;
    const H = wrapH - margin.top - margin.bottom;

    const svg = d3.select(wrap).append('svg')
      .attr('viewBox', `0 0 ${wrapW} ${wrapH}`)
      .attr('width', '100%')
      .style('max-width', wrapW + 'px');

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const sankey = d3.sankey()
      .nodeId(d => d.id)
      .nodeWidth(16)
      .nodePadding(20)
      .extent([[0, 0], [W, H]]);

    const graph = sankey({
      nodes: nodes.map((d, i) => Object.assign({ index: i }, d)),
      links: links.map(d => Object.assign({}, d)),
    });

    // Tooltip
    const tip = document.createElement('div');
    tip.className = 'sankey-tip';
    tip.style.cssText = 'position:absolute;display:none;max-width:230px;background:#1A252F;color:#F5F0E6;font-size:12px;line-height:1.5;padding:10px 13px;border-radius:6px;pointer-events:none;z-index:100;box-shadow:0 4px 16px rgba(0,0,0,0.35)';
    wrap.style.position = 'relative';
    wrap.appendChild(tip);

    function showTip(ev, text) {
      tip.textContent = text;
      tip.style.display = 'block';
      const wr = wrap.getBoundingClientRect();
      tip.style.left = Math.min(ev.clientX - wr.left + 12, wr.width - 245) + 'px';
      tip.style.top = (ev.clientY - wr.top - 10) + 'px';
    }
    function moveTip(ev) {
      const wr = wrap.getBoundingClientRect();
      tip.style.left = Math.min(ev.clientX - wr.left + 12, wr.width - 245) + 'px';
      tip.style.top = (ev.clientY - wr.top - 10) + 'px';
    }
    function hideTip() { tip.style.display = 'none'; }

    // Stage descriptions
    const stageDesc = {
      heat:   'A heat wave arrives. Extreme temperatures, humidity, and urban heat island effect across the city.',
      data:   'City agencies measure surface temperature, AC ownership, greenspace, and income.',
      hvi:    'Variables are compressed into a single score from 1–5 for each of 188 neighborhoods.',
      policy: 'Agencies use the HVI to place cooling centers and direct emergency communications.',
      action: 'Cooling centers open. Alerts go out. Physical spaces are made available — to those who can reach them.',
      drop:   'Information and people that did not make it through the pipeline.',
    };

    // Links
    g.append('g').selectAll('path')
      .data(graph.links)
      .join('path')
        .attr('class', d => d.drop ? 'sankey-link sankey-link--drop' : 'sankey-link')
        .attr('d', d3.sankeyLinkHorizontal())
        .attr('stroke-width', d => Math.max(1, d.width))
        .attr('stroke', d => d.drop ? 'rgba(176,48,48,0.55)' : 'rgba(127,179,211,0.45)')
        .attr('fill', 'none')
        .attr('stroke-dasharray', d => d.drop ? '6,3' : 'none')
        .on('mouseenter', (ev, d) => {
          const txt = d.label
            ? d.label
            : `${d.source.label} → ${d.target.label}`;
          showTip(ev, txt);
          d3.select(ev.currentTarget)
            .attr('stroke', d.drop ? 'rgba(176,48,48,0.9)' : 'rgba(127,179,211,0.85)');
        })
        .on('mousemove', moveTip)
        .on('mouseleave', (ev, d) => {
          hideTip();
          d3.select(ev.currentTarget)
            .attr('stroke', d.drop ? 'rgba(176,48,48,0.55)' : 'rgba(127,179,211,0.45)');
        });

    // Nodes
    const nodeG = g.append('g').selectAll('g')
      .data(graph.nodes)
      .join('g')
        .attr('class', 'sankey-node')
        .style('cursor', 'default');

    nodeG.append('rect')
      .attr('x', d => d.x0)
      .attr('y', d => d.y0)
      .attr('height', d => Math.max(1, d.y1 - d.y0))
      .attr('width', d => d.x1 - d.x0)
      .attr('fill', d => d.color)
      .attr('rx', 3)
      .on('mouseenter', (ev, d) => showTip(ev, stageDesc[d.id] || d.label))
      .on('mousemove', moveTip)
      .on('mouseleave', hideTip);

    // Node labels — left nodes get label on left, right/sink nodes on right
    nodeG.append('text')
      .attr('x', d => (d.x0 < W / 2) ? d.x1 + 7 : d.x0 - 7)
      .attr('y', d => (d.y0 + d.y1) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', d => (d.x0 < W / 2) ? 'start' : 'end')
      .attr('font-size', '11')
      .attr('font-weight', '600')
      .attr('fill', '#2D3748')
      .text(d => d.label);

    // Annotate drop stream percentages
    const dropPcts = ['40%', '12%', '14%'];
    g.selectAll('.sankey-link--drop').each(function(_d, i) {
      if (i > 2) return; // only annotate first 3 drop links
      const totalLen = this.getTotalLength ? this.getTotalLength() : 0;
      if (totalLen > 0) {
        const mid = this.getPointAtLength(totalLen / 2);
        g.append('text')
          .attr('x', mid.x)
          .attr('y', mid.y - 6)
          .attr('text-anchor', 'middle')
          .attr('font-size', '9.5')
          .attr('fill', '#C0392B')
          .attr('font-weight', '700')
          .text(dropPcts[i] || '');
      }
    });
  }


  // ══════════════════════════════════════════════════════════════
  // POLICY VISUALIZATION — Interlocking Bars + Layered Bands toggle
  // ══════════════════════════════════════════════════════════════
  function buildPolicyViz() {
    const svgEl = document.getElementById('ibar-chart');
    const legendEl = document.getElementById('ibar-legend');
    if (!svgEl || typeof d3 === 'undefined') return;

    // Scenarios: each bar is one policy scenario.
    // Each scenario has segments (constraint types it addresses).
    // "reduction" = % reduction in cooling desert tracts (out of 557 tracts).
    const CONSTRAINTS = [
      { id: 'hvi',      label: 'Fix the risk index',   color: '#2471A3' },
      { id: 'energy',   label: 'Energy cost relief',   color: '#E07B39' },
      { id: 'building', label: 'Building upgrades',    color: '#8B6914' },
      { id: 'infra',    label: 'Cooling infrastructure', color: '#7FB3D3' },
    ];

    const SCENARIOS = [
      {
        id: 's1', label: 'S1 — Cooling Centers', total: 12,
        note: 'Adding outdoor cooling sites within half a mile of every high-HVI tract reduces cooling deserts by 12%.',
        segments: [{ id: 'infra', share: 1.0 }],
      },
      {
        id: 's2', label: 'S2 — AC Retrofit', total: 18,
        note: 'Universal AC installation in pre-1980 buildings reduces cooling deserts by 18% — but without energy cost relief, 21% of owners still can\'t afford to run them.',
        segments: [{ id: 'building', share: 0.75 }, { id: 'energy', share: 0.25 }],
      },
      {
        id: 's3', label: 'S3 — Energy Subsidy', total: 23,
        note: 'Capping electricity costs for severely rent-burdened households at 3% of income reduces cooling deserts by 23%. The strongest single lever.',
        segments: [{ id: 'energy', share: 0.8 }, { id: 'hvi', share: 0.2 }],
      },
      {
        id: 's4', label: 'S4 — HVI Reform', total: 15,
        note: 'Reweighting the HVI to include rent burden and AC affordability reallocates resources to 214 currently underserved tracts. Impact is 15% alone.',
        segments: [{ id: 'hvi', share: 1.0 }],
      },
      {
        id: 'combined', label: 'All Four Together', total: 67,
        note: 'Combining all four interventions produces a 67% reduction — far greater than any single scenario. The cooling desert is a network problem; it requires a network solution.',
        segments: [
          { id: 'hvi',      share: 0.20 },
          { id: 'energy',   share: 0.30 },
          { id: 'building', share: 0.25 },
          { id: 'infra',    share: 0.25 },
        ],
      },
    ];

    const margin = { top: 28, right: 40, bottom: 52, left: 168 };
    const wrapW = svgEl.closest('.ibar-wrap')
      ? svgEl.closest('.ibar-wrap').clientWidth || 560
      : 560;
    const totalH = 320;
    const W = Math.max(wrapW - margin.left - margin.right, 200);
    const H = totalH - margin.top - margin.bottom;

    const barH = Math.min(32, Math.floor((H - (SCENARIOS.length - 1) * 8) / SCENARIOS.length));
    const barGap = (H - barH * SCENARIOS.length) / (SCENARIOS.length - 1);

    svgEl.setAttribute('viewBox', `0 0 ${wrapW} ${totalH}`);
    svgEl.setAttribute('width', '100%');
    svgEl.style.maxWidth = wrapW + 'px';
    svgEl.style.height = totalH + 'px';

    const svg = d3.select(svgEl);
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleLinear().domain([0, 75]).range([0, W]);

    // Tooltip
    const tip = document.createElement('div');
    tip.className = 'ibar-tip';
    tip.style.cssText = 'position:fixed;display:none;max-width:260px;background:#1A252F;color:#F5F0E6;font-size:12.5px;line-height:1.55;padding:11px 14px;border-radius:7px;pointer-events:none;z-index:200;box-shadow:0 4px 18px rgba(0,0,0,0.35)';
    document.body.appendChild(tip);

    function showTip(ev, text) {
      tip.textContent = text;
      tip.style.display = 'block';
      tip.style.left = Math.min(ev.clientX + 14, window.innerWidth - 280) + 'px';
      tip.style.top = (ev.clientY - 14) + 'px';
    }
    function moveTip(ev) {
      tip.style.left = Math.min(ev.clientX + 14, window.innerWidth - 280) + 'px';
      tip.style.top = (ev.clientY - 14) + 'px';
    }
    function hideTip() { tip.style.display = 'none'; }

    // X-axis gridlines
    xScale.ticks(5).forEach(t => {
      g.append('line')
        .attr('x1', xScale(t)).attr('x2', xScale(t))
        .attr('y1', -8).attr('y2', H + 8)
        .attr('stroke', '#E0D9CC').attr('stroke-width', 1);
      g.append('text')
        .attr('x', xScale(t)).attr('y', H + 22)
        .attr('text-anchor', 'middle')
        .attr('font-size', '11').attr('fill', '#718096')
        .text(t + '%');
    });

    // X-axis label
    g.append('text')
      .attr('x', W / 2).attr('y', H + 44)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11').attr('fill', '#4A5568').attr('font-weight', '600')
      .text('Reduction in cooling desert tracts (%)');

    // Bars group — toggled by view
    const barsG = g.append('g').attr('class', 'ibar-bars-view');
    const bandsG = g.append('g').attr('class', 'ibar-bands-view').attr('display', 'none');

    // ── BARS VIEW ──
    SCENARIOS.forEach((sc, i) => {
      const y = i * (barH + barGap);
      const rowG = barsG.append('g').attr('class', 'ibar-row ibar-row--' + sc.id);

      // Background track
      rowG.append('rect')
        .attr('x', 0).attr('y', y)
        .attr('width', W).attr('height', barH)
        .attr('fill', '#F3EFE6').attr('rx', 3);

      // Segmented bar
      let xOff = 0;
      sc.segments.forEach(seg => {
        const segW = xScale(sc.total * seg.share);
        const col = CONSTRAINTS.find(c => c.id === seg.id);
        rowG.append('rect')
          .attr('x', xOff).attr('y', y)
          .attr('width', 0).attr('height', barH)
          .attr('fill', col ? col.color : '#999').attr('rx', 3)
          .attr('opacity', sc.id === 'combined' ? 1 : 0.82)
          .transition().duration(700).delay(i * 120)
          .attr('width', segW);
        xOff += segW;
      });

      // Total % label at end of bar
      rowG.append('text')
        .attr('x', xScale(sc.total) + 6).attr('y', y + barH / 2 + 4)
        .attr('font-size', '12').attr('font-weight', '700')
        .attr('fill', sc.id === 'combined' ? '#922B21' : '#2D3748')
        .text(sc.total + '%');

      // Scenario label (left)
      rowG.append('text')
        .attr('x', -8).attr('y', y + barH / 2 + 4)
        .attr('text-anchor', 'end')
        .attr('font-size', sc.id === 'combined' ? '12' : '11')
        .attr('font-weight', sc.id === 'combined' ? '700' : '500')
        .attr('fill', sc.id === 'combined' ? '#922B21' : '#2D3748')
        .text(sc.label);

      // Hover for tooltip
      rowG.on('mouseenter', ev => showTip(ev, sc.note))
         .on('mousemove', moveTip)
         .on('mouseleave', hideTip)
         .style('cursor', 'default');
    });

    // ── BANDS VIEW ──
    // Each constraint type shown as a horizontal band across all scenarios
    const bandH = Math.floor(H / CONSTRAINTS.length) - 6;
    CONSTRAINTS.forEach((con, ci) => {
      const bandY = ci * (bandH + 6);
      const bandG = bandsG.append('g').attr('class', 'ibar-band');

      // Band label
      bandG.append('text')
        .attr('x', -8).attr('y', bandY + bandH / 2 + 4)
        .attr('text-anchor', 'end')
        .attr('font-size', '11').attr('font-weight', '600')
        .attr('fill', con.color)
        .text(con.label);

      // Background
      bandG.append('rect')
        .attr('x', 0).attr('y', bandY)
        .attr('width', W).attr('height', bandH)
        .attr('fill', '#F3EFE6').attr('rx', 3);

      // One segment per scenario that includes this constraint
      let cumX = 0;
      SCENARIOS.forEach(sc => {
        const seg = sc.segments.find(s => s.id === con.id);
        if (!seg) { cumX += xScale(sc.total / SCENARIOS.length); return; }
        const segW = xScale(sc.total * seg.share / SCENARIOS.length * 2);
        bandG.append('rect')
          .attr('x', cumX).attr('y', bandY)
          .attr('width', 0).attr('height', bandH)
          .attr('fill', con.color).attr('rx', 2).attr('opacity', 0.75)
          .transition().duration(600).delay(ci * 100)
          .attr('width', segW);
        cumX += segW + 4;
      });
    });

    // ── TOGGLE LOGIC ──
    document.querySelectorAll('.ibar-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.ibar-toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const view = btn.dataset.view;
        barsG.attr('display', view === 'bars' ? null : 'none');
        bandsG.attr('display', view === 'bands' ? null : 'none');
      });
    });

    // ── LEGEND ──
    if (legendEl) {
      legendEl.innerHTML = CONSTRAINTS.map(c => `
        <span class="ibar-legend-item">
          <span class="ibar-legend-swatch" style="background:${c.color}"></span>
          ${c.label}
        </span>
      `).join('');
    }

    // Policy link → switch to data path
    document.querySelectorAll('.apc-link[data-goto]').forEach(el => {
      el.style.cursor = 'pointer';
      el.addEventListener('click', ev => {
        ev.stopPropagation();
        switchPath('data');
        setTimeout(() => {
          const t = document.getElementById(el.dataset.goto);
          if (t) t.scrollIntoView({ behavior: 'smooth' });
        }, 500);
      });
    });
  }

}());
