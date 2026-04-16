// ANT Theory Path - Path Switcher + D3 Network + Scrollytelling + Translation Chain
// Actor-Network Theory applied to NYC heat equity & cooling deserts

(function () {
  'use strict';

  // PATH SWITCHING
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
    // Default: no path chosen - path chooser section is visible, both path sections hidden
  });


  // ANT SCENE BUILDER - Scrollytelling Introduction
  function initSceneBuilder() {
    const panels = document.querySelectorAll('.ant-scene-panel');
    const linesG = document.getElementById('ant-svg-lines');
    const nodesG = document.getElementById('ant-svg-nodes');
    const labelG = document.getElementById('ant-svg-label');

    if (!nodesG || !panels.length) return;

    const NODE_DEFS = {
      maria:    { cx: 240, cy: 232, r: 58,
                  fill: '#1E2F3C', stroke: '#3A556A', strokeW: 2, strokeDash: '',
                  label: 'Maria', sublabel: 'South Bronx Renter',
                  labelSz: '15', subSz: '10',
                  labelColor: '#fff', subColor: 'rgba(255,255,255,0.55)' },
      heat:     { cx: 240, cy:  60, r: 44,
                  fill: '#922B21', stroke: '', strokeW: 0, strokeDash: '',
                  label: 'Heat', sublabel: '94°F tonight',
                  labelSz: '13', subSz: '10',
                  labelColor: '#fff', subColor: 'rgba(255,255,255,0.7)' },
      bill:     { cx: 416, cy: 232, r: 44,
                  fill: '#C96A28', stroke: '', strokeW: 0, strokeDash: '',
                  label: 'Electric', sublabel: 'bill +$80',
                  labelSz: '13', subSz: '10',
                  labelColor: '#fff', subColor: 'rgba(255,255,255,0.7)' },
      building: { cx: 240, cy: 404, r: 44,
                  fill: '#6B5744', stroke: '', strokeW: 0, strokeDash: '',
                  label: 'Pre-1938', sublabel: 'building wiring',
                  labelSz: '12', subSz: '10',
                  labelColor: '#fff', subColor: 'rgba(255,255,255,0.7)' },
      hvi:      { cx:  64, cy: 232, r: 44,
                  fill: '#132B3D', stroke: '#1F6999', strokeW: 2, strokeDash: '6,4',
                  label: 'City HVI', sublabel: 'scores 3 / 5',
                  labelSz: '12', subSz: '10',
                  labelColor: '#7FB3D3', subColor: 'rgba(127,179,211,0.6)',
                  badge: 'resources elsewhere' },
    };

    // ── Line definitions ─────────────────────────────────────────
    const LINE_DEFS = {
      heat_to_maria:     { from: 'heat',     to: 'maria',
                           stroke: '#922B21', dash: '',    strokeW: 3.5,
                           marker: 'url(#ant-arr-red)' },
      bill_to_maria:     { from: 'bill',     to: 'maria',
                           stroke: '#C96A28', dash: '9,6', strokeW: 2.5,
                           marker: 'url(#ant-arr-org)' },
      building_to_maria: { from: 'building', to: 'maria',
                           stroke: '#6B5744', dash: '9,6', strokeW: 2.5,
                           marker: 'url(#ant-arr-tan)' },
      hvi_note:          { from: 'hvi',      to: 'maria',
                           stroke: '#1F6999', dash: '4,8', strokeW: 1.5,
                           marker: 'url(#ant-arr-blu)', weak: true },
    };

    // ── Which nodes/lines each scroll step reveals ────────────────
    const STEP_MAP = [
      { nodes: ['maria'],    lines: [] },
      { nodes: ['heat'],     lines: ['heat_to_maria'] },
      { nodes: ['bill'],     lines: ['bill_to_maria'] },
      { nodes: ['building'], lines: ['building_to_maria'] },
      { nodes: ['hvi'],      lines: ['hvi_note'] },
      { nodes: [],           lines: [], reveal: true },
    ];

    const drawnNodes = new Set();
    const drawnLines = new Set();
    let revealDrawn  = false;

    // ── SVG helper ────────────────────────────────────────────────
    function svgEl(tag, attrs) {
      const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, String(v)));
      return el;
    }

    function fadeIn(el, delay) {
      el.style.opacity = '0';
      el.style.transition = 'opacity 0.55s ease ' + (delay || 0) + 'ms';
      // Append first, then trigger fade on next paint
      requestAnimationFrame(() => requestAnimationFrame(() => { el.style.opacity = '1'; }));
    }

    // ── Draw a node ───────────────────────────────────────────────
    function drawNode(id) {
      const d = NODE_DEFS[id];
      if (!d || drawnNodes.has(id)) return;
      drawnNodes.add(id);

      const g = svgEl('g', { transform: `translate(${d.cx},${d.cy})` });

      // Circle
      const circleAttrs = { r: d.r, fill: d.fill };
      if (d.strokeW) {
        circleAttrs.stroke          = d.stroke;
        circleAttrs['stroke-width'] = d.strokeW;
        if (d.strokeDash) circleAttrs['stroke-dasharray'] = d.strokeDash;
      }
      g.appendChild(svgEl('circle', circleAttrs));

      // Main label
      const lt = svgEl('text', {
        'text-anchor': 'middle',
        'font-family': "'Bree Serif', serif",
        'font-size':   d.labelSz,
        'font-weight': '700',
        fill:          d.labelColor,
        dy:            d.sublabel ? '-0.3em' : '0.35em',
        'pointer-events': 'none',
      });
      lt.textContent = d.label;
      g.appendChild(lt);

      // Sub-label
      if (d.sublabel) {
        const ls = svgEl('text', {
          'text-anchor': 'middle',
          'font-family': "'Bree Serif', serif",
          'font-size':   d.subSz,
          'font-weight': '400',
          fill:          d.subColor,
          dy:            '1.0em',
          'pointer-events': 'none',
        });
        ls.textContent = d.sublabel;
        g.appendChild(ls);
      }

      // Badge text below circle (x=0 y=r+16 in group-local coords)
      if (d.badge) {
        const bg = svgEl('text', {
          x:             '0',
          y:             String(d.r + 16),
          'text-anchor': 'middle',
          'font-family': "'Bree Serif', serif",
          'font-size':   '9',
          'font-weight': '400',
          fill:          'rgba(127,179,211,0.45)',
          'pointer-events': 'none',
        });
        bg.textContent = d.badge;
        g.appendChild(bg);
      }

      nodesG.appendChild(g);
      fadeIn(g, 0);
    }

    // ── Draw a line ───────────────────────────────────────────────
    function drawLine(id) {
      const d = LINE_DEFS[id];
      if (!d || drawnLines.has(id)) return;
      drawnLines.add(id);

      const from = NODE_DEFS[d.from];
      const to   = NODE_DEFS[d.to];
      const dx   = to.cx - from.cx;
      const dy   = to.cy - from.cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const gap  = 8;
      const x1   = from.cx + (dx / dist) * (from.r + gap);
      const y1   = from.cy + (dy / dist) * (from.r + gap);
      const x2   = to.cx   - (dx / dist) * (to.r   + gap);
      const y2   = to.cy   - (dy / dist) * (to.r   + gap);

      const attrs = {
        x1, y1, x2, y2,
        stroke:           d.stroke,
        'stroke-width':   d.strokeW,
        'stroke-linecap': 'round',
        'marker-end':     d.marker,
      };
      if (d.dash)  attrs['stroke-dasharray'] = d.dash;
      if (d.weak)  attrs.opacity = '0.5'; // keep weak line subtle even when "visible"

      const line = svgEl('line', attrs);
      linesG.appendChild(line);
      fadeIn(line, 80);
    }

    // ── Final reveal: dashed bounding box + label ─────────────────
    function drawReveal() {
      if (revealDrawn) return;
      revealDrawn = true;

      // Ensure every node and line from previous steps is visible
      STEP_MAP.forEach(m => {
        m.nodes.forEach(drawNode);
        m.lines.forEach(drawLine);
      });

      // Full bounding box around all nodes
      const rect = svgEl('rect', {
        x: 10, y: 10, width: 460, height: 440, rx: 12,
        fill: 'none', stroke: '#922B21',
        'stroke-width': '2', 'stroke-dasharray': '10,7',
      });
      labelG.appendChild(rect);
      fadeIn(rect, 0);

      // Label placed in the clear gap between Heat (bottom y≈104) and Maria (top y≈174)
      // Background pill so it's readable regardless of what's behind it
      const lblBg = svgEl('rect', {
        x: '128', y: '122', width: '224', height: '28', rx: '5',
        fill: '#FAF8F3',
      });
      labelG.appendChild(lblBg);
      fadeIn(lblBg, 80);

      const lbl = svgEl('text', {
        x: '240', y: '142', 'text-anchor': 'middle',
        'font-family': "'Bree Serif', serif",
        'font-size': '13', 'font-weight': '700',
        'letter-spacing': '0.16em', fill: '#922B21',
      });
      lbl.textContent = 'COOLING DESERT';
      labelG.appendChild(lbl);
      fadeIn(lbl, 120);
    }

    // ── Activate a step ───────────────────────────────────────────
    function activateStep(idx) {
      const map = STEP_MAP[idx];
      if (!map) return;
      map.nodes.forEach(drawNode);
      map.lines.forEach(drawLine);
      if (map.reveal) drawReveal();
    }

    // ── IntersectionObserver ──────────────────────────────────────
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-active');
          activateStep(Number(entry.target.dataset.step));
        } else {
          entry.target.classList.remove('is-active');
        }
      });
    }, { threshold: 0.35 });

    panels.forEach(p => observer.observe(p));
    activateStep(0);
    if (panels[0]) panels[0].classList.add('is-active');
  }


  // FIVE QUESTIONS - Per-question SVG illustrations
  function buildFiveQuestions() {
    const container = document.getElementById('aq-viz-container');
    const labelEl   = document.getElementById('aq-viz-label');
    const panels    = document.querySelectorAll('#aq-panels .aq-panel');
    if (!container || !panels.length) return;

    // ── SVG helper ────────────────────────────────────────────
    function ns(tag, attrs, txt) {
      const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, String(v)));
      if (txt !== undefined) el.textContent = txt;
      return el;
    }
    function makeSVG(vb) {
      return ns('svg', {
        viewBox: vb || '0 0 440 360',
        xmlns: 'http://www.w3.org/2000/svg',
        'aria-hidden': 'true',
      });
    }
    function txt(svg, attrs, content) {
      const f = { 'font-family': "'Bree Serif',serif", ...attrs };
      svg.appendChild(ns('text', f, content));
    }

    // ── Q1: What the HVI counts vs. misses ───────────────────
    function buildQ1() {
      const svg = makeSVG();

      txt(svg, { x:'220', y:'28', 'text-anchor':'middle', 'font-size':'10',
        'font-weight':'700', 'letter-spacing':'0.12em',
        fill:'rgba(26,37,47,0.5)' }, 'WHAT THE HVI ACTUALLY MEASURES');

      // Bar total background
      svg.appendChild(ns('rect', { x:'24', y:'46', width:'392', height:'72',
        rx:'6', fill:'rgba(26,37,47,0.06)' }));

      // 79% - AC owned (counted)
      svg.appendChild(ns('rect', { x:'24', y:'46', width:'310', height:'72',
        rx:'6', fill:'#1F6999' }));
      txt(svg, { x:'179', y:'78', 'text-anchor':'middle', 'font-size':'26',
        'font-weight':'700', fill:'#fff' }, '79%');
      txt(svg, { x:'179', y:'103', 'text-anchor':'middle', 'font-size':'11',
        fill:'rgba(255,255,255,0.75)' }, 'own an air conditioner');

      // 21% - owns AC but can't run it (invisible to HVI)
      svg.appendChild(ns('rect', { x:'334', y:'46', width:'82', height:'72',
        rx:'6', fill:'rgba(192,57,43,0.1)', stroke:'#C0392B',
        'stroke-width':'2', 'stroke-dasharray':'6,4' }));
      txt(svg, { x:'375', y:'78', 'text-anchor':'middle', 'font-size':'22',
        'font-weight':'700', fill:'#C0392B' }, '21%');
      txt(svg, { x:'375', y:'103', 'text-anchor':'middle', 'font-size':'10',
        fill:'rgba(192,57,43,0.85)' }, "can't run it");

      // Captions below bar
      txt(svg, { x:'179', y:'140', 'text-anchor':'middle', 'font-size':'10',
        fill:'rgba(26,37,47,0.45)' }, 'HVI counts this');
      txt(svg, { x:'375', y:'140', 'text-anchor':'middle', 'font-size':'10',
        fill:'#C0392B' }, 'HVI misses this');

      // Divider
      svg.appendChild(ns('line', { x1:'24', y1:'162', x2:'416', y2:'162',
        stroke:'rgba(26,37,47,0.1)', 'stroke-width':'1' }));

      // Big stat: 214 tracts
      txt(svg, { x:'220', y:'236', 'text-anchor':'middle', 'font-size':'84',
        'font-weight':'700', fill:'#1A252F' }, '214');
      txt(svg, { x:'220', y:'264', 'text-anchor':'middle', 'font-size':'13',
        fill:'rgba(26,37,47,0.6)' }, 'census tracts scored "moderate" by the HVI');
      txt(svg, { x:'220', y:'284', 'text-anchor':'middle', 'font-size':'13',
        fill:'rgba(26,37,47,0.6)' }, 'where renters cannot afford to cool their homes');

      // Invisible-to-policy badge
      svg.appendChild(ns('rect', { x:'110', y:'308', width:'220', height:'34',
        rx:'5', fill:'rgba(192,57,43,0.1)', stroke:'#C0392B', 'stroke-width':'1' }));
      txt(svg, { x:'220', y:'330', 'text-anchor':'middle', 'font-size':'11',
        'font-weight':'700', 'letter-spacing':'0.08em', fill:'#C0392B' },
        'INVISIBLE TO POLICY');

      return svg;
    }

    // ── Q2: Building age ──────────────────────────────────────
    function buildQ2() {
      const svg = makeSVG();

      txt(svg, { x:'220', y:'94', 'text-anchor':'middle', 'font-size':'86',
        'font-weight':'700', fill:'#8B7355' }, '47%');
      txt(svg, { x:'220', y:'126', 'text-anchor':'middle', 'font-size':'14',
        fill:'rgba(26,37,47,0.65)' }, 'of NYC housing built before 1980');

      svg.appendChild(ns('line', { x1:'60', y1:'150', x2:'380', y2:'150',
        stroke:'rgba(26,37,47,0.1)', 'stroke-width':'1' }));

      // Pre-1940 box
      svg.appendChild(ns('rect', { x:'24', y:'168', width:'184', height:'142',
        rx:'8', fill:'rgba(107,87,68,0.18)', stroke:'#8B7355', 'stroke-width':'1.5' }));
      txt(svg, { x:'116', y:'196', 'text-anchor':'middle', 'font-size':'10',
        'font-weight':'700', 'letter-spacing':'0.08em', fill:'#8B7355' }, 'PRE-1940 WIRING');
      txt(svg, { x:'116', y:'224', 'text-anchor':'middle', 'font-size':'24',
        'font-weight':'700', fill:'rgba(26,37,47,0.65)' }, '15–20A');
      txt(svg, { x:'116', y:'252', 'text-anchor':'middle', 'font-size':'11',
        fill:'rgba(26,37,47,0.6)' }, 'Electrical panels');
      txt(svg, { x:'116', y:'268', 'text-anchor':'middle', 'font-size':'11',
        fill:'rgba(26,37,47,0.6)' }, 'not designed for AC');
      txt(svg, { x:'116', y:'294', 'text-anchor':'middle', 'font-size':'11',
        fill:'rgba(192,57,43,0.7)' }, 'Circuit overload risk');

      // Modern box
      svg.appendChild(ns('rect', { x:'232', y:'168', width:'184', height:'142',
        rx:'8', fill:'rgba(26,37,47,0.04)', stroke:'rgba(26,37,47,0.15)',
        'stroke-width':'1' }));
      txt(svg, { x:'324', y:'196', 'text-anchor':'middle', 'font-size':'10',
        'font-weight':'700', 'letter-spacing':'0.08em',
        fill:'rgba(26,37,47,0.5)' }, 'MODERN WIRING');
      txt(svg, { x:'324', y:'224', 'text-anchor':'middle', 'font-size':'24',
        'font-weight':'700', fill:'rgba(26,37,47,0.65)' }, '200A');
      txt(svg, { x:'324', y:'252', 'text-anchor':'middle', 'font-size':'11',
        fill:'rgba(26,37,47,0.6)' }, 'Designed to');
      txt(svg, { x:'324', y:'268', 'text-anchor':'middle', 'font-size':'11',
        fill:'rgba(26,37,47,0.6)' }, 'support AC');

      txt(svg, { x:'220', y:'340', 'text-anchor':'middle', 'font-size':'11',
        fill:'rgba(26,37,47,0.5)' },
        'Building age predicts AC access independently of income (p < 0.001)');

      return svg;
    }

    // ── Q3: Rent as heat weapon ───────────────────────────────
    function buildQ3() {
      const svg = makeSVG();

      txt(svg, { x:'28', y:'28', 'font-size':'10', 'letter-spacing':'0.1em',
        fill:'rgba(26,37,47,0.5)' }, 'MONTHLY INCOME: $2,850');

      // Total income bar background
      svg.appendChild(ns('rect', { x:'28', y:'44', width:'384', height:'58',
        rx:'5', fill:'rgba(26,37,47,0.05)' }));

      // Rent: 58% = 223px
      svg.appendChild(ns('rect', { x:'28', y:'44', width:'223', height:'58',
        rx:'5', fill:'#A93226' }));
      txt(svg, { x:'140', y:'68', 'text-anchor':'middle', 'font-size':'14',
        'font-weight':'700', fill:'#fff' }, 'RENT  $1,650');
      txt(svg, { x:'140', y:'88', 'text-anchor':'middle', 'font-size':'11',
        fill:'rgba(255,255,255,0.75)' }, '58 cents of every dollar');

      // Remaining: $237
      txt(svg, { x:'328', y:'68', 'text-anchor':'middle', 'font-size':'13',
        'font-weight':'700', fill:'rgba(26,37,47,0.55)' }, '$237');
      txt(svg, { x:'328', y:'88', 'text-anchor':'middle', 'font-size':'10',
        fill:'rgba(26,37,47,0.5)' }, 'left for everything');

      // Arrow down to electric bill
      svg.appendChild(ns('line', { x1:'328', y1:'108', x2:'328', y2:'140',
        stroke:'#C96A28', 'stroke-width':'2' }));
      svg.appendChild(ns('polygon', { points:'321,136 335,136 328,150',
        fill:'#C96A28' }));

      // Electric bill box
      svg.appendChild(ns('rect', { x:'252', y:'154', width:'152', height:'54',
        rx:'5', fill:'rgba(201,106,40,0.12)', stroke:'#C96A28', 'stroke-width':'1.5' }));
      txt(svg, { x:'328', y:'178', 'text-anchor':'middle', 'font-size':'15',
        'font-weight':'700', fill:'#C96A28' }, '+$80 / month');
      txt(svg, { x:'328', y:'197', 'text-anchor':'middle', 'font-size':'11',
        fill:'rgba(26,37,47,0.55)' }, 'to run AC overnight');

      txt(svg, { x:'328', y:'232', 'text-anchor':'middle', 'font-size':'11',
        fill:'rgba(26,37,47,0.5)' }, 'There is no $80 here.');

      svg.appendChild(ns('line', { x1:'28', y1:'256', x2:'412', y2:'256',
        stroke:'rgba(26,37,47,0.08)', 'stroke-width':'1' }));

      txt(svg, { x:'220', y:'304', 'text-anchor':'middle', 'font-size':'44',
        'font-weight':'700', fill:'#C96A28' }, '1 in 5');
      txt(svg, { x:'220', y:'334', 'text-anchor':'middle', 'font-size':'13',
        fill:'rgba(26,37,47,0.65)' }, 'NYC renters with AC cannot afford to run it');

      return svg;
    }

    // ── Q4: Cooling centers ───────────────────────────────────
    function buildQ4() {
      const svg = makeSVG();

      txt(svg, { x:'220', y:'26', 'text-anchor':'middle', 'font-size':'10',
        'font-weight':'700', 'letter-spacing':'0.1em',
        fill:'rgba(26,37,47,0.5)' }, 'EMERGENCY COOLING CENTER SCHEDULE');

      // 7-day row  (Mon = idx 0 … Sun = idx 6)
      const DAY_ABBR  = ['M','T','W','T','F','S','S'];
      const DAY_NAMES = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
      const CX_START  = 36, CX_STEP = 58;

      DAY_ABBR.forEach((d, i) => {
        const cx     = CX_START + i * CX_STEP;
        const isSun  = i === 6;
        const r      = isSun ? 36 : 26;
        const cy     = 84;

        svg.appendChild(ns('circle', { cx, cy, r,
          fill:           isSun ? 'rgba(146,43,33,0.18)' : 'rgba(26,37,47,0.07)',
          stroke:         isSun ? '#922B21' : 'rgba(26,37,47,0.15)',
          'stroke-width': isSun ? '2' : '1' }));

        txt(svg, { x: cx, y: cy + 5, 'text-anchor':'middle',
          'font-size': isSun ? '15' : '12', 'font-weight':'700',
          fill: isSun ? '#922B21' : 'rgba(26,37,47,0.5)' }, d);

        txt(svg, { x: cx, y: cy + r + 14, 'text-anchor':'middle',
          'font-size':'9',
          fill: isSun ? 'rgba(146,43,33,0.75)' : 'rgba(26,37,47,0.4)' },
          DAY_NAMES[i]);

        if (isSun) {
          txt(svg, { x: cx, y: cy + r + 28, 'text-anchor':'middle',
            'font-size':'9', 'font-weight':'700', fill:'#922B21' }, 'CLOSED');
        }
      });

      txt(svg, { x:'220', y:'190', 'text-anchor':'middle', 'font-size':'76',
        'font-weight':'700', fill:'#1A252F' }, '83%');
      txt(svg, { x:'220', y:'222', 'text-anchor':'middle', 'font-size':'13',
        fill:'rgba(26,37,47,0.65)' }, 'of emergency cooling centers closed Sundays');
      txt(svg, { x:'220', y:'242', 'text-anchor':'middle', 'font-size':'12',
        fill:'rgba(26,37,47,0.5)' }, 'the day heat-related deaths peak in NYC');

      svg.appendChild(ns('line', { x1:'28', y1:'264', x2:'412', y2:'264',
        stroke:'rgba(26,37,47,0.08)', 'stroke-width':'1' }));

      // Two secondary stats
      txt(svg, { x:'130', y:'300', 'text-anchor':'middle', 'font-size':'30',
        'font-weight':'700', fill:'rgba(26,37,47,0.65)' }, '47%');
      txt(svg, { x:'130', y:'322', 'text-anchor':'middle', 'font-size':'11',
        fill:'rgba(26,37,47,0.55)' }, 'age-restricted');
      txt(svg, { x:'130', y:'337', 'text-anchor':'middle', 'font-size':'11',
        fill:'rgba(26,37,47,0.55)' }, '(seniors only)');

      txt(svg, { x:'310', y:'300', 'text-anchor':'middle', 'font-size':'30',
        'font-weight':'700', fill:'rgba(26,37,47,0.65)' }, '38%');
      txt(svg, { x:'310', y:'322', 'text-anchor':'middle', 'font-size':'11',
        fill:'rgba(26,37,47,0.55)' }, 'of high-risk tracts have');
      txt(svg, { x:'310', y:'337', 'text-anchor':'middle', 'font-size':'11',
        fill:'rgba(26,37,47,0.55)' }, 'no cooling within walking distance');

      return svg;
    }

    // ── Q5: What it takes to break a cooling desert ──────────
    function buildQ5() {
      const svg = makeSVG('0 0 440 390');

      txt(svg, { x:'220', y:'26', 'text-anchor':'middle', 'font-size':'10',
        'font-weight':'700', 'letter-spacing':'0.1em',
        fill:'rgba(26,37,47,0.5)' }, 'COOLING DESERT REDUCTION - BY INTERVENTION');

      const SCENARIOS = [
        { label:'Add cooling sites',  sub:'outdoor access gap',      pct:12, color:'rgba(26,37,47,0.2)' },
        { label:'AC retrofits',       sub:'+ urban greening',        pct:17, color:'rgba(26,37,47,0.2)' },
        { label:'Energy assistance',  sub:'NYCHA surcharge removed',  pct:21, color:'rgba(26,37,47,0.2)' },
        { label:'Rent relief',        sub:'broadest constraint',      pct:23, color:'rgba(26,37,47,0.2)' },
        { label:'All four combined',  sub:null,                       pct:67, color:'#27AE60', highlight:true },
      ];

      // Bars area: label col 0–150, bar col 150–390, pct col 396+
      const LABEL_W = 150, BAR_START = 154, BAR_MAX = 232, BAR_H = 28, GAP = 12;
      let y = 46;

      SCENARIOS.forEach((s, i) => {
        if (i === 4) {
          svg.appendChild(ns('line', { x1:'28', y1: y - 6, x2:'412', y2: y - 6,
            stroke:'rgba(26,37,47,0.12)', 'stroke-width':'1' }));
        }

        const barW = (s.pct / 100) * BAR_MAX;
        const rowH  = s.highlight ? 44 : BAR_H;

        // Bar track
        svg.appendChild(ns('rect', { x: BAR_START, y, width: BAR_MAX, height: rowH,
          rx:'4', fill: s.highlight ? 'rgba(39,174,96,0.08)' : 'rgba(26,37,47,0.06)' }));

        // Bar fill
        svg.appendChild(ns('rect', { x: BAR_START, y, width: barW, height: rowH,
          rx:'4', fill: s.color }));

        // Label (left column, right-aligned)
        txt(svg, { x: LABEL_W, y: y + rowH / 2 + 5, 'text-anchor':'end',
          'font-size': s.highlight ? '14' : '12',
          'font-weight': s.highlight ? '700' : '400',
          fill: s.highlight ? '#1A252F' : 'rgba(26,37,47,0.6)' }, s.label);

        // Sub-label below for non-highlight
        if (s.sub && !s.highlight) {
          txt(svg, { x: LABEL_W, y: y + rowH / 2 + 18, 'text-anchor':'end',
            'font-size':'9', fill:'rgba(26,37,47,0.45)' }, s.sub);
        }

        // Percentage (right of bar)
        txt(svg, { x: BAR_START + BAR_MAX + 14, y: y + rowH / 2 + 5,
          'font-size': s.highlight ? '26' : '14', 'font-weight':'700',
          fill: s.highlight ? '#27AE60' : 'rgba(26,37,47,0.55)' }, s.pct + '%');

        y += rowH + GAP + (s.sub && !s.highlight ? 10 : 0);
      });

      // Prominent note - styled as a callout, not a footnote
      svg.appendChild(ns('rect', { x:'28', y: y + 8, width:'384', height:'48',
        rx:'6', fill:'rgba(39,174,96,0.08)', stroke:'rgba(39,174,96,0.2)',
        'stroke-width':'1' }));
      txt(svg, { x:'220', y: y + 28, 'text-anchor':'middle', 'font-size':'12',
        'font-weight':'700', fill:'rgba(39,174,96,0.85)' },
        '257 neighborhoods still remain after all four interventions.');
      txt(svg, { x:'220', y: y + 45, 'text-anchor':'middle', 'font-size':'11',
        fill:'rgba(26,37,47,0.55)' },
        'Structural exclusion requires structural - not single-point - repair.');

      return svg;
    }

    // ── Per-question captions ─────────────────────────────────
    const Q_CAPTIONS = [
      'The measurement tool decides where every dollar goes - but it counts AC ownership, not whether households can afford to run it.',
      'Old buildings encode old decisions. A 1938 electrical panel is still making choices about who gets to cool their home in 2025.',
      'The rent check and the electricity bill are the same constraint, just arriving in two different envelopes.',
      'A cooling center that is closed when you need it, age-restricted, or two miles away is not a cooling center.',
      'Fix one constraint: 12–23% improvement. Fix all four together: 67%. The network resists single-point repairs.',
    ];

    const Q_BUILDERS = [buildQ1, buildQ2, buildQ3, buildQ4, buildQ5];

    // ── Show a question ───────────────────────────────────────
    function showQ(idx) {
      // Build new SVG
      const newSVG = Q_BUILDERS[idx]();
      newSVG.style.opacity = '0';
      newSVG.style.transition = 'opacity 0.4s ease';

      container.innerHTML = '';
      container.appendChild(newSVG);

      // Trigger fade-in on next paint
      requestAnimationFrame(() => requestAnimationFrame(() => { newSVG.style.opacity = '1'; }));

      if (labelEl) {
        labelEl.style.opacity = '0';
        labelEl.style.transition = 'opacity 0.3s ease';
        setTimeout(() => {
          labelEl.textContent = Q_CAPTIONS[idx];
          labelEl.style.opacity = '1';
        }, 180);
      }
    }

    // ── IntersectionObserver ──────────────────────────────────
    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        panels.forEach(p => p.classList.remove('is-active'));
        entry.target.classList.add('is-active');
        showQ(parseInt(entry.target.dataset.q || '0', 10));
      });
    }, { rootMargin: '-20% 0px -20% 0px', threshold: 0.2 });

    panels.forEach(p => obs.observe(p));
    showQ(0);
    if (panels[0]) panels[0].classList.add('is-active');
  }


  // ACTOR-NETWORK DATA
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
      detail: 'Not a passive backdrop - an actor. Kills more New Yorkers each year than hurricanes, floods, and blizzards combined. Acts differently across neighborhoods.' },
    { id: 'hvi',       label: 'HVI Index',       type: 'nonhuman',
      detail: 'An "inscription device" (Latour). Translates complex conditions into a single number that drives resource allocation. Counts AC ownership, not AC use.' },
    { id: 'building',  label: 'Pre-1940 Bldg',   type: 'nonhuman',
      detail: 'Lacks wiring capacity for modern AC. Encodes 1930s infrastructure policy into today\'s heat emergency. Negative correlation with AC ownership (r = −0.31).' },
    { id: 'bill',      label: 'Electric Bill',   type: 'nonhuman',
      detail: '21% of renter AC owners cannot afford to run it. For severely rent-burdened households, energy = 10.3% of income - 4× the non-burdened rate.' },
    { id: 'rent',      label: 'Rent Check',      type: 'nonhuman',
      detail: 'Extracts 50%+ of income from severely burdened households - leaving nothing for electricity. The most powerful financial constraint in the network.' },
    { id: 'trees',     label: 'Tree Canopy',     type: 'nonhuman',
      detail: 'Cooling deserts average 2.1% less canopy than safer neighborhoods. Trees reduce surface temperatures and are infrastructure, not decoration.' },
    { id: 'ac',        label: 'Air Conditioner', type: 'nonhuman',
      detail: 'Technically present in 84–95% of households across HVI ranks. Effectively accessible to far fewer - blocked by bills, buildings, and surcharges.' },
    { id: 'alert',     label: 'Emergency Alert', type: 'nonhuman',
      detail: 'English-only alert system excludes 10.5% of NYC renters who are limited English proficient. A communication infrastructure that participates in exclusion.' },
    { id: 'surcharge', label: 'NYCHA Surcharge', type: 'nonhuman',
      detail: 'A policy artifact that rations cooling access in public housing. 1 in 3 NYCHA residents cite it as a barrier. Removes itself from housing cost calculations.' },

    { id: 'desert',    label: 'Cooling Desert',  type: 'outcome',
      detail: '557 neighborhoods. 1.47M renters. Not a fixed place - a stable network configuration that produces structural vulnerability to heat.' },
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
      label: 'Human actors - they make decisions, but each one is constrained by the broader network they are enrolled in.'
    },
    {
      hl: ['heat','hvi','building','bill','rent','trees','ac','alert','surcharge'], links: null, dim: true,
      label: 'Non-human actors - they participate, constrain, and shape outcomes without making decisions in any conventional sense.'
    },
    {
      hl: ['heat','hvi','city','policy'],
      links: ['heat→hvi','hvi→city','city→policy'], dim: true,
      label: 'The translation chain: heat → measurement → policy. This is how risk becomes response - but affordability never enters this path.'
    },
    {
      hl: ['rent','bill','building','alert','renters','ac'],
      links: ['rent→bill','bill→ac','building→ac','renters→ac','alert→renters'], dim: true,
      label: 'The constraint network: non-human actors that together prevent households from accessing cooling even when AC exists.'
    },
    {
      hl: null, links: null, dim: false,
      label: '557 neighborhoods. The cooling desert is not a place. It is what this network produces - and it persists because the network is stable.'
    },
  ];


  // MAIN INIT (called once theory path first activated)
  function initTheory() {
    initSceneBuilder();
    buildFiveQuestions();
    buildNetwork();
    buildActorViz();
    buildTranslationFlow();
    buildSynthesis();
    initActorTabs();
    initScrollytelling();
  }


  // FIXED-GRID NETWORK (replaces force simulation)
  function buildNetwork() {
    const wrap = document.getElementById('ant-network-svg');
    if (!wrap || typeof d3 === 'undefined') return;

    // Fixed viewBox — scales to container via CSS
    const VW = 560, VH = 530;

    const svg = d3.select(wrap).append('svg')
      .attr('width', '100%').attr('height', '100%')
      .attr('viewBox', `0 0 ${VW} ${VH}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .style('overflow', 'visible');

    // Arrow markers — refX=10 so tip lands at edge of shape
    const defs = svg.append('defs');
    [
      { id: 'arr-translation', color: '#2980B9' },
      { id: 'arr-constraint',  color: '#C0392B' },
      { id: 'arr-resource',    color: '#1E8A52' },
    ].forEach(m => {
      defs.append('marker')
        .attr('id', m.id)
        .attr('viewBox', '0 -5 10 10').attr('refX', 10).attr('refY', 0)
        .attr('markerWidth', 7).attr('markerHeight', 7).attr('orient', 'auto')
        .append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', m.color);
    });

    // ── Fixed grid positions ───────────────────────────────────
    // Row 0: translation chain  — heat → HVI → city agencies → policymakers
    // Row 1: resource/structural — tree canopy, NYCHA, AC, rent check
    // Row 2: people + access    — landlords, renters, alert system, electric bill
    // Row 3: outcome + buildingconstraints
    const FIXED = {
      heat:      { x: 70,  y: 80  },
      hvi:       { x: 200, y: 80  },
      city:      { x: 335, y: 80  },
      policy:    { x: 470, y: 80  },
      trees:     { x: 70,  y: 210 },
      nycha:     { x: 200, y: 210 },
      ac:        { x: 335, y: 210 },
      rent:      { x: 470, y: 210 },
      landlords: { x: 70,  y: 345 },
      renters:   { x: 200, y: 345 },
      alert:     { x: 335, y: 345 },
      bill:      { x: 470, y: 345 },
      building:  { x: 70,  y: 460 },
      surcharge: { x: 200, y: 460 },
      desert:    { x: 335, y: 460 },
    };

    const nodes = NODES.map(n => ({ ...n, x: FIXED[n.id].x, y: FIXED[n.id].y }));
    const nodeById = {};
    nodes.forEach(n => { nodeById[n.id] = n; });

    const links = LINKS.map(l => ({
      ...l,
      source: nodeById[typeof l.source === 'string' ? l.source : l.source.id],
      target: nodeById[typeof l.target === 'string' ? l.target : l.target.id],
    }));

    // ── Shape radius helpers ───────────────────────────────────
    function shapeR(n) {
      if (n.type === 'outcome') return 36;
      if (n.type === 'human')   return 28;
      return 32; // diamond half-diagonal (44×44 rotated → √2×22 ≈ 31)
    }

    // Compute line endpoint on shape surface (+ gap for arrowhead)
    function edgePt(src, tgt, isSrc) {
      const dx = tgt.x - src.x, dy = tgt.y - src.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const n = isSrc ? src : tgt;
      const r = shapeR(n) + (isSrc ? 0 : 5); // arrowhead gap at target
      const sign = isSrc ? 1 : -1;
      return { x: n.x + sign * (dx / len) * r, y: n.y + sign * (dy / len) * r };
    }

    // ── Tooltip ────────────────────────────────────────────────
    let tipEl = document.querySelector('.d3-tip.ant-tip');
    if (!tipEl) {
      tipEl = Object.assign(document.createElement('div'), { className: 'd3-tip ant-tip' });
      document.body.appendChild(tipEl);
    }

    // ── Links ──────────────────────────────────────────────────
    const EDGE_COLOR = { translation: '#2980B9', constraint: '#C0392B', resource: '#1E8A52' };
    const linkG = svg.append('g').attr('class', 'ant-links');
    const linkSels = linkG.selectAll('line').data(links).enter().append('line')
      .attr('class', d => 'ant-edge edge-' + d.type)
      .attr('x1', d => edgePt(d.source, d.target, true).x)
      .attr('y1', d => edgePt(d.source, d.target, true).y)
      .attr('x2', d => edgePt(d.source, d.target, false).x)
      .attr('y2', d => edgePt(d.source, d.target, false).y)
      .attr('stroke', d => EDGE_COLOR[d.type])
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', d => d.type === 'constraint' ? '6,4' : 'none')
      .attr('opacity', 0.55)
      .attr('marker-end', d => `url(#arr-${d.type})`);

    // ── Nodes ──────────────────────────────────────────────────
    const nodeG = svg.append('g').attr('class', 'ant-nodes');
    const nodeSels = nodeG.selectAll('g').data(nodes).enter().append('g')
      .attr('class', d => 'ant-node node-' + d.type)
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .style('cursor', 'pointer')
      .on('mouseover', function (ev, d) {
        tipEl.innerHTML = `<strong style="font-size:13px">${d.label}</strong><br><span style="font-size:11px;opacity:0.85;line-height:1.4">${d.detail}</span>`;
        tipEl.style.display = 'block';
        tipEl.style.left = (ev.pageX + 14) + 'px';
        tipEl.style.top  = (ev.pageY - 12) + 'px';
        d3.select(this).select('.node-shape').attr('stroke-width', 3.5);
      })
      .on('mousemove', ev => {
        tipEl.style.left = (ev.pageX + 14) + 'px';
        tipEl.style.top  = (ev.pageY - 12) + 'px';
      })
      .on('mouseout', function () {
        tipEl.style.display = 'none';
        d3.select(this).select('.node-shape').attr('stroke-width', 2);
      });

    // Outcome: large red circle
    nodeSels.filter(d => d.type === 'outcome').append('circle')
      .attr('class', 'node-shape')
      .attr('r', 36)
      .attr('fill', '#922B21').attr('stroke', '#5D1A14').attr('stroke-width', 2).attr('opacity', 0.95);

    // Human actors: blue circle
    nodeSels.filter(d => d.type === 'human').append('circle')
      .attr('class', 'node-shape')
      .attr('r', 28)
      .attr('fill', '#1F6999').attr('stroke', '#154E73').attr('stroke-width', 2).attr('opacity', 0.9);

    // Non-human: amber diamond (44×44 rect rotated 45°)
    nodeSels.filter(d => d.type === 'nonhuman').append('rect')
      .attr('class', 'node-shape')
      .attr('width', 44).attr('height', 44).attr('x', -22).attr('y', -22)
      .attr('transform', 'rotate(45)')
      .attr('fill', '#F5C26B').attr('stroke', '#B7770D').attr('stroke-width', 2).attr('opacity', 0.9);

    // ── Labels ─────────────────────────────────────────────────
    // Two-word labels use tspan for line breaks; single words stay on one line.
    // Outcome label is centered inside its circle; all others are below their shape.
    const LABEL_LINES = {
      heat:      ['Heat',      null],
      hvi:       ['HVI',       'Index'],
      city:      ['City',      'Agencies'],
      policy:    ['Policy-',   'makers'],
      trees:     ['Tree',      'Canopy'],
      nycha:     ['NYCHA',     null],
      ac:        ['Air',       'Conditioner'],
      rent:      ['Rent',      'Check'],
      landlords: ['Landlords', null],
      renters:   ['Renters',   null],
      alert:     ['Alert',     'System'],
      bill:      ['Electric',  'Bill'],
      building:  ['Pre-1940',  'Building'],
      surcharge: ['NYCHA',     'Surcharge'],
      desert:    ['Cooling',   'Desert'],
    };

    // Outcome: label inside circle
    nodeSels.filter(d => d.type === 'outcome').append('text')
      .attr('class', 'node-label')
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('font-weight', '700')
      .attr('fill', '#fff')
      .attr('pointer-events', 'none')
      .each(function (d) {
        const [l1, l2] = LABEL_LINES[d.id] || [d.label, null];
        const el = d3.select(this);
        if (l2) {
          el.append('tspan').attr('x', 0).attr('dy', '-0.55em').text(l1);
          el.append('tspan').attr('x', 0).attr('dy', '1.25em').text(l2);
        } else {
          el.append('tspan').attr('x', 0).attr('dy', '0.35em').text(l1);
        }
      });

    // Human + nonhuman: label below shape
    nodeSels.filter(d => d.type !== 'outcome').append('text')
      .attr('class', 'node-label')
      .attr('text-anchor', 'middle')
      .attr('font-size', '10.5px')
      .attr('font-weight', '600')
      .attr('fill', '#1A252F')
      .attr('pointer-events', 'none')
      .each(function (d) {
        const [l1, l2] = LABEL_LINES[d.id] || [d.label, null];
        const el = d3.select(this);
        // Place first line below the shape (human r=28+14=42; nonhuman diag≈31+14=45)
        const baseY = d.type === 'human' ? 42 : 46;
        if (l2) {
          el.append('tspan').attr('x', 0).attr('y', baseY).text(l1);
          el.append('tspan').attr('x', 0).attr('dy', '1.3em').text(l2);
        } else {
          el.append('tspan').attr('x', 0).attr('y', baseY + 7).text(l1);
        }
      });

    // Store for scrollytelling state changes
    window._antViz = { nodeSels, linkSels, nodes, links };
  }


  // APPLY SCROLL STATE TO NETWORK
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
        if (!s.links) return s.dim ? 0.3 : 0.65;
        return s.links.includes(d.source.id + '→' + d.target.id) ? 0.9 : 0.08;
      })
      .attr('stroke-width', d => {
        if (!s.links) return s.dim ? 1.5 : 2.5;
        return s.links.includes(d.source.id + '→' + d.target.id) ? 3 : 1;
      });
  }


  // SCROLLYTELLING - panels drive network state
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


  // ACTOR TABS - tab switching
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


  // ACTOR VISUALIZATIONS
  function buildActorViz() {
    buildBillPeople();
    buildBuildingEras();
    buildHviLens();
  }

  // ── Viz 1: 10×10 person grid - 79 green, 21 red ────────────
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
          ? '<b>Can\'t afford to run AC</b><br>Owns an air conditioner - but the monthly electric bill during summer is unaffordable.'
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

  // SYNTHESIS - assembled full network closing section
  function buildSynthesis() {
    const wrap = document.getElementById('ant-synthesis-viz');
    if (!wrap) return;

    // ── Layout: viewBox 900 × 580 ─────────────────────────────
    // CY=320 gives breathing room above hvi node for external captions.
    // Constraint node captions sit OUTSIDE the circles so they're always
    // readable against the cream background (white-on-cream is invisible).
    const CX = 450, CY = 320;

    const SYN_NODES = [
      // Central outcome - two-line sub inside (large circle, text fits)
      { id: 'desert',
        label: 'Cooling Desert', sub1: '557 neighborhoods', sub2: '1.47M renters',
        cx: CX, cy: CY,
        r: 74, fill: '#922B21', stroke: '#C0392B', strokeW: 3, textFill: '#fff', labelSz: '17' },

      // Constraint nodes - NO sub inside circle; caption rendered outside
      { id: 'hvi',
        label: 'Risk Index',      caption: 'Q1 - measurement gap',
        cx: CX,       cy: CY - 200,
        r: 56, fill: '#1F6999', stroke: '#1A5276', strokeW: 2, textFill: '#fff', labelSz: '15' },
      { id: 'bill',
        label: 'Energy Cost',     caption: 'Q3 - AC unaffordable',
        cx: CX + 215, cy: CY - 85,
        r: 56, fill: '#C96A28', stroke: '#A0541F', strokeW: 2, textFill: '#fff', labelSz: '15' },
      { id: 'building',
        label: 'Old Buildings',   caption: 'Q2 - wiring limits AC',
        cx: CX + 185, cy: CY + 148,
        r: 56, fill: '#8B6914', stroke: '#5A430D', strokeW: 2, textFill: '#fff', labelSz: '15' },
      { id: 'centers',
        label: 'Cooling Centers', caption: 'Q4 - system mismatch',
        cx: CX - 185, cy: CY + 148,
        r: 56, fill: '#1F7A6E', stroke: '#145E54', strokeW: 2, textFill: '#fff', labelSz: '15' },
      { id: 'rent',
        label: 'Rent Burden',     caption: 'Q3 - income trap',
        cx: CX - 215, cy: CY - 85,
        r: 56, fill: '#A93226', stroke: '#7B1F1B', strokeW: 2, textFill: '#fff', labelSz: '15' },
    ];

    const SYN_LINKS = [
      { from: 'hvi',      to: 'desert', label: '214 tracts misscored',    stroke: '#1F6999', strokeW: 3 },
      { from: 'bill',     to: 'desert', label: "21% can't afford to run", stroke: '#C96A28', strokeW: 3 },
      { from: 'building', to: 'desert', label: '47% pre-1980 wiring',     stroke: '#8B6914', strokeW: 3 },
      { from: 'centers',  to: 'desert', label: '83% closed Sundays',      stroke: '#1F7A6E', strokeW: 3 },
      { from: 'rent',     to: 'desert', label: '50%+ income to rent',     stroke: '#A93226', strokeW: 3 },
      { from: 'rent',     to: 'bill',   label: '',  stroke: 'rgba(169,50,38,0.28)', strokeW: 1.5, dash: '5,5', secondary: true },
    ];

    const NS = 'http://www.w3.org/2000/svg';
    function el(tag, attrs) {
      const e = document.createElementNS(NS, tag);
      Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, String(v)));
      return e;
    }
    function mkTxt(attrs, content) {
      const t = el('text', { 'font-family': "'Bree Serif',serif", ...attrs });
      t.textContent = content;
      return t;
    }

    const svg = el('svg', { viewBox: '0 0 900 580', width: '100%', class: 'synthesis-svg' });
    svg.style.overflow = 'visible';

    // ── Defs: solid arrowheads, larger and clearer ────────────
    const defs = el('defs', {});
    SYN_LINKS.filter(lk => !lk.secondary).forEach(lk => {
      const mkr = el('marker', {
        id: lk.from + '_arr',
        viewBox: '0 -5 10 10', refX: '8', refY: '0',
        markerWidth: '9', markerHeight: '9', orient: 'auto',
      });
      mkr.appendChild(el('path', { d: 'M0,-5L10,0L0,5Z', fill: lk.stroke }));
      defs.appendChild(mkr);
    });
    svg.appendChild(defs);

    function sn(id) { return SYN_NODES.find(n => n.id === id); }
    function shortenLine(x1, y1, x2, y2, r1, r2) {
      const dx = x2 - x1, dy = y2 - y1;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len === 0) return { x1, y1, x2, y2 };
      const ux = dx / len, uy = dy / len;
      return { x1: x1 + ux * (r1 + 4), y1: y1 + uy * (r1 + 4),
               x2: x2 - ux * (r2 + 9), y2: y2 - uy * (r2 + 9) };
    }

    // ── Draw links ───────────────────────────────────────────
    // Lines appended first (behind nodes), labels appended last (on top of nodes)
    const linksG  = el('g', {});   // arrow lines only
    const labelsG = el('g', {});   // stat labels — appended after nodes so they're never hidden

    SYN_LINKS.forEach(lk => {
      const a = sn(lk.from), b = sn(lk.to);
      if (!a || !b) return;
      const pts = shortenLine(a.cx, a.cy, b.cx, b.cy, a.r, b.r);

      const lineAttrs = {
        x1: pts.x1, y1: pts.y1, x2: pts.x2, y2: pts.y2,
        stroke: lk.stroke, 'stroke-width': lk.strokeW,
        opacity: '0.92',
      };
      if (lk.dash) lineAttrs['stroke-dasharray'] = lk.dash;
      if (!lk.secondary) lineAttrs['marker-end'] = `url(#${lk.from}_arr)`;
      linksG.appendChild(el('line', lineAttrs));

      // Edge stat label — added to labelsG (rendered on top of all nodes)
      if (lk.label) {
        const mx = (a.cx + b.cx) / 2;
        const my = (a.cy + b.cy) / 2;
        const labelW = lk.label.length * 7 + 20;
        labelsG.appendChild(el('rect', {
          x: mx - labelW / 2, y: my - 12,
          width: labelW, height: 22, rx: '4',
          fill: 'rgba(250,248,243,0.97)',
          stroke: lk.stroke, 'stroke-width': '0.5',
        }));
        labelsG.appendChild(mkTxt({
          x: mx, y: my + 5,
          'text-anchor': 'middle',
          'font-size': '12', 'font-weight': '700',
          fill: lk.stroke, 'pointer-events': 'none',
        }, lk.label));
      }
    });
    svg.appendChild(linksG);  // lines behind nodes

    // ── Tooltip ──────────────────────────────────────────────
    const tip = document.createElement('div');
    tip.style.cssText = 'position:absolute;display:none;max-width:280px;background:#1A252F;color:#F5F0E6;font-size:13.5px;line-height:1.6;padding:12px 16px;border-radius:8px;pointer-events:none;z-index:200;box-shadow:0 6px 20px rgba(0,0,0,0.4)';
    wrap.style.position = 'relative';
    wrap.appendChild(tip);

    const NODE_DETAILS = {
      desert:   '557 cooling desert neighborhoods. 1.47M renters structurally unable to protect themselves from heat. This is what the network produces.',
      hvi:      'The Heat Vulnerability Index scores 214 tracts as "moderate" while more than half their renters cannot afford to cool their homes. The blind spot becomes the city\'s blind spot.',
      bill:     '21% of renter AC owners cannot run their unit due to cost. For severely rent-burdened households, energy consumes 10.3% of income - four times the national threshold.',
      building: '47% of NYC housing was built before 1980. These buildings were never wired for air conditioning. A 1938 electrical panel is still enforcing a 1938 decision.',
      centers:  '83% of indoor emergency cooling centers are closed on Sundays - the peak day for heat mortality. 47% are age-restricted to seniors. 38% of high-risk tracts have no outdoor cooling within walking distance.',
      rent:     'Severely rent-burdened households spend 50%+ of income on rent. Nothing remains for electricity, repairs, or emergencies. The rent check and the electric bill are the same constraint arriving twice.',
    };

    function showTip(ev, id) {
      tip.innerHTML = `<strong style="display:block;margin-bottom:6px;font-size:14px">${sn(id).label}</strong>${NODE_DETAILS[id] || ''}`;
      tip.style.display = 'block';
      const wr = wrap.getBoundingClientRect();
      tip.style.left = Math.min(ev.clientX - wr.left + 14, wr.width - 300) + 'px';
      tip.style.top  = Math.max(4, ev.clientY - wr.top - 20) + 'px';
    }

    // ── Draw nodes ───────────────────────────────────────────
    SYN_NODES.forEach((n, i) => {
      const g = el('g', { class: 'syn-node syn-node--' + n.id });
      g.style.cursor = 'pointer';
      g.style.opacity = '0';
      g.style.transition = 'opacity 0.5s ease';

      // Circle
      const circle = el('circle', {
        cx: n.cx, cy: n.cy, r: n.r,
        fill: n.fill, stroke: n.stroke, 'stroke-width': n.strokeW,
      });
      g.appendChild(circle);

      // Main label - centered inside circle
      g.appendChild(mkTxt({
        x: n.cx, y: n.sub1 ? n.cy - 8 : n.cy + 6,
        'text-anchor': 'middle', 'font-size': n.labelSz,
        'font-weight': '700', fill: n.textFill, 'pointer-events': 'none',
      }, n.label));

      // Desert two-line sub (both lines fit inside r=74 circle)
      if (n.sub1) {
        g.appendChild(mkTxt({
          x: n.cx, y: n.cy + 12,
          'text-anchor': 'middle', 'font-size': '11.5',
          'font-weight': '400', fill: 'rgba(255,255,255,0.72)', 'pointer-events': 'none',
        }, n.sub1));
        g.appendChild(mkTxt({
          x: n.cx, y: n.cy + 29,
          'text-anchor': 'middle', 'font-size': '11.5',
          'font-weight': '400', fill: 'rgba(255,255,255,0.72)', 'pointer-events': 'none',
        }, n.sub2));
      }

      // External caption for constraint nodes - sits OUTSIDE the circle in the
      // outward direction so it's always on the cream background and fully visible.
      if (n.caption) {
        const dx = n.cx - CX, dy = n.cy - CY;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const ux = dx / dist, uy = dy / dist;
        const OFFSET = n.r + 22;
        const capX = n.cx + ux * OFFSET;
        const capY = n.cy + uy * OFFSET + (uy >= 0 ? 10 : -6);
        const anchor = ux > 0.3 ? 'start' : ux < -0.3 ? 'end' : 'middle';
        g.appendChild(mkTxt({
          x: capX, y: capY,
          'text-anchor': anchor,
          'font-size': '13', 'font-weight': '600',
          fill: n.fill, 'pointer-events': 'none',
        }, n.caption));
      }

      g.addEventListener('mouseenter', ev => {
        circle.setAttribute('stroke-width', String(n.strokeW + 2));
        showTip(ev, n.id);
      });
      g.addEventListener('mousemove', ev => {
        const wr = wrap.getBoundingClientRect();
        tip.style.left = Math.min(ev.clientX - wr.left + 14, wr.width - 300) + 'px';
        tip.style.top  = Math.max(4, ev.clientY - wr.top - 20) + 'px';
      });
      g.addEventListener('mouseleave', () => {
        circle.setAttribute('stroke-width', String(n.strokeW));
        tip.style.display = 'none';
      });

      svg.appendChild(g);
      setTimeout(() => { g.style.opacity = '1'; }, 60 + i * 80);
    });

    svg.appendChild(labelsG);  // labels on top of all nodes - never hidden by circles

    wrap.insertBefore(svg, tip);

    // ── Animate links in on scroll-into-view ─────────────────
    const linkLines = linksG.querySelectorAll('line');
    linkLines.forEach(l => { l.style.opacity = '0'; l.style.transition = 'opacity 0.5s ease'; });
    const synthObs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      linkLines.forEach((l, i) => { setTimeout(() => { l.style.opacity = '0.92'; }, i * 100); });
      synthObs.disconnect();
    }, { threshold: 0.25 });
    synthObs.observe(wrap);
  }


  // ── Viz 3: HVI "lens" - two columns what's IN vs MISSING ───
  function buildHviLens() {
    const wrap = document.getElementById('viz-hvi-lens');
    if (!wrap) return;

    const PIECES = [
      // included - green filled
      { id: 'surface_temp',   label: 'Surface Temperature',    type: 'in',
        detail: 'Satellite-measured land surface temperature. Hot pavement and rooftops vs. green, shaded streets.' },
      { id: 'greenspace',     label: 'Green Space Coverage',   type: 'in',
        detail: 'Tree canopy and parks per neighborhood. Cooling deserts average 2.1% less canopy than safer areas.' },
      { id: 'ac_own',         label: 'AC Ownership Rate',      type: 'in',
        detail: 'Share of households with an air conditioner. Does not measure whether it can actually be used.' },
      { id: 'income',         label: 'Household Income',       type: 'in',
        detail: 'Median income per neighborhood - a rough proxy for adaptive capacity, not a direct measure.' },
      { id: 'social_vuln',    label: 'Social Vulnerability',   type: 'in',
        detail: 'A composite of poverty, age, and isolation. Included, but calculated before rent burden data existed.' },

      // missing - red dashed outlines
      { id: 'ac_use',         label: 'AC Affordability',       type: 'out',
        detail: '21% of renter AC owners cannot afford to run it. This is not counted. The HVI sees the machine, not the bill.' },
      { id: 'bldg_wiring',    label: 'Building Wiring Age',    type: 'out',
        detail: '47% of NYC housing stock is pre-1980. Older wiring cannot safely run AC overnight - a physical barrier the index ignores.' },
      { id: 'rent_burden',    label: 'Rent Burden',            type: 'out',
        detail: 'Severely rent-burdened households spend 50%+ of income on rent - nothing left for electricity. Not in the formula.' },
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
    legDot(PAD + 180, legY, 'rgba(192,57,43,0.06)', '#C0392B', true, 'What it leaves out - data that exists but was excluded');

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


  // TRANSLATION FLOW - Sankey diagram (what flows vs what gets dropped)
  function buildTranslationFlow() {
    const svgEl  = document.getElementById('dot-grid-svg');
    const panels = document.querySelectorAll('#dot-panels .dot-panel');
    const legEl  = document.getElementById('dot-legend');
    if (!svgEl || !panels.length) return;

    const NS = 'http://www.w3.org/2000/svg';

    // ── Grid geometry ─────────────────────────────────────────
    // 10×10 grid, viewBox 264×264
    // r=10, spacing=26 center-to-center, pad=15 on all sides
    // Dot index → outcome group:
    //   0–39:  never counted   → grey
    //  40–51:  misscored       → orange
    //  52–65:  unreachable     → dark red
    //  66–99:  reached         → green
    const DOT_R   = 10;
    const SPACING = 26;
    const PAD     = 15;

    const COLORS = {
      heat:        '#E07B39',
      inSystem:    '#1F6999',
      grey:        '#C8D3DC',
      misscored:   '#E07B39',
      unreachable: '#922B21',
      reached:     '#27AE60',
    };

    function stageColor(i, stage) {
      if (stage === 0) return COLORS.heat;
      if (stage === 1) return i < 40 ? COLORS.grey : COLORS.inSystem;
      if (stage === 2) return i < 40 ? COLORS.grey : i < 52 ? COLORS.misscored : COLORS.inSystem;
      // stage 3
      if (i < 40)  return COLORS.grey;
      if (i < 52)  return COLORS.misscored;
      if (i < 66)  return COLORS.unreachable;
      return COLORS.reached;
    }

    // ── Build 100 dots ────────────────────────────────────────
    const dots = [];
    for (let i = 0; i < 100; i++) {
      const col = i % 10;
      const row = Math.floor(i / 10);
      const cx  = PAD + DOT_R + col * SPACING;
      const cy  = PAD + DOT_R + row * SPACING;
      const c   = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', String(cx));
      c.setAttribute('cy', String(cy));
      c.setAttribute('r',  String(DOT_R));
      c.setAttribute('fill', COLORS.heat);
      c.style.transition = 'fill 0.55s ease';
      svgEl.appendChild(c);
      dots.push(c);
    }

    // ── Legend definitions per stage ──────────────────────────
    const LEGENDS = [
      [{ color: COLORS.heat,        label: 'All 100 renters exposed' }],
      [{ color: COLORS.inSystem,    label: 'Counted by agencies (60)' },
       { color: COLORS.grey,        label: 'Never counted (40)' }],
      [{ color: COLORS.inSystem,    label: 'Correctly scored (48)' },
       { color: COLORS.misscored,   label: 'Misscored by HVI (12)' },
       { color: COLORS.grey,        label: 'Never counted (40)' }],
      [{ color: COLORS.reached,     label: 'Reached (34)' },
       { color: COLORS.unreachable, label: 'Unreachable (14)' },
       { color: COLORS.misscored,   label: 'Misscored (12)' },
       { color: COLORS.grey,        label: 'Never counted (40)' }],
    ];

    function updateLegend(stage) {
      legEl.innerHTML = '';
      LEGENDS[stage].forEach(item => {
        const div  = document.createElement('div');
        div.className = 'dot-legend-item';
        const dot  = document.createElement('span');
        dot.className = 'dot-legend-dot';
        dot.style.background = item.color;
        const lbl  = document.createElement('span');
        lbl.textContent = item.label;
        div.appendChild(dot);
        div.appendChild(lbl);
        legEl.appendChild(div);
      });
    }

    // ── Activate stage ────────────────────────────────────────
    let currentStage = -1;
    function activateStage(stage) {
      if (stage === currentStage) return;
      currentStage = stage;
      dots.forEach((dot, i) => dot.setAttribute('fill', stageColor(i, stage)));
      panels.forEach(p => p.classList.toggle('is-active', Number(p.dataset.stage) === stage));
      updateLegend(stage);
    }

    // ── IntersectionObserver ──────────────────────────────────
    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) activateStage(Number(entry.target.dataset.stage));
      });
    }, { rootMargin: '-25% 0px -25% 0px', threshold: 0.15 });

    panels.forEach(p => obs.observe(p));
    activateStage(0);
    if (panels[0]) panels[0].classList.add('is-active');

  }


}());
