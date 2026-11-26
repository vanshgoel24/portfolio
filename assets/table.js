/* Playable snooker table for the hero, played to the rules.
   Red, then a colour, then red... once the reds are gone, the colours in order.
   Fouls: missing every ball, hitting the wrong ball first, potting the wrong ball, potting the white.
   Legally potting a frame ball (black, pink, blue, brown) offers a link to that case study. */
{
  const cv = document.getElementById('table');
  if (cv && cv.getContext) {
    const ctx = cv.getContext('2d');
    const M = 34, W = 1000, H = 500, TW = W + M * 2, TH = H + M * 2, SUB = 16;
    const BAULK = 207, DR = 82;
    let R = 13;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const $ = id => document.getElementById(id);
    const breakEl = $('break'), bestEl = $('best'), msgEl = $('hud-msg'), onBall = $('on-ball'), onLabel = $('on-label');
    const toast = (h, ms) => window.siteToast && window.siteToast(h, ms);

    // ---------- sound (synthesised, off by default) ----------
    let actx = null, noise = null, soundOn = false, lastClick = 0;
    try { soundOn = localStorage.getItem('vg-sound') === '1'; } catch (e) { soundOn = false; }
    const sndBtn = document.getElementById('sound');
    const audio = () => {
      if (actx) return actx;
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
      actx = new AC();
      noise = actx.createBuffer(1, actx.sampleRate * .3, actx.sampleRate);
      const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      return actx;
    };
    const env = (node, vol, dur, t) => {
      const g = actx.createGain(); g.gain.setValueAtTime(Math.max(.0001, vol), t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      node.connect(g); g.connect(actx.destination); return g;
    };
    const burst = (freq, q, vol, dur, t) => {
      const src = actx.createBufferSource(); src.buffer = noise;
      const f = actx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
      src.connect(f); env(f, vol, dur, t); src.start(t); src.stop(t + dur + .02);
    };
    const tone = (f0, f1, vol, dur, t) => {
      const o = actx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      env(o, vol, dur, t); o.start(t); o.stop(t + dur + .02);
    };
    const sfx = (type, v = 1) => {
      if (!soundOn || !actx || actx.state !== 'running') return;
      const t = actx.currentTime;
      if (type === 'ball') { if (t - lastClick < .03) return; lastClick = t; const vol = Math.min(.9, v / 18); if (vol < .04) return; burst(3200, 1.4, vol, .045, t); tone(1900, 1400, vol * .25, .04, t); }
      if (type === 'rail') { const vol = Math.min(.5, v / 30); if (vol < .05) return; tone(140, 70, vol, .12, t); burst(500, .8, vol * .5, .08, t); }
      if (type === 'pot') { tone(110, 45, .45, .32, t); burst(900, 2, .25, .05, t + .05); burst(700, 2, .18, .05, t + .13); }
      if (type === 'cue') { burst(1600, 1.2, .25 + v * .4, .035, t); }
    };
    const setSound = on => {
      soundOn = on; try { localStorage.setItem('vg-sound', on ? '1' : '0'); } catch (e) { /* storage off */ }
      if (sndBtn) { sndBtn.setAttribute('aria-pressed', String(on)); sndBtn.setAttribute('aria-label', on ? 'Sound on' : 'Sound off'); sndBtn.title = on ? 'Sound on' : 'Sound off'; }
      if (on) { const a = audio(); if (a && a.state === 'suspended') a.resume(); }
    };
    if (sndBtn) { setSound(soundOn); sndBtn.addEventListener('click', () => { setSound(!soundOn); if (soundOn) { audio(); sfx('ball', 12); } }); }

    const COL = { red: '#C21F2E', yellow: '#F2C531', green: '#1C9A55', brown: '#7a4826', blue: '#1D57C4', pink: '#E77FAE', black: '#1b1b1b', cue: '#F6F3EA' };
    const VAL = { red: 1, yellow: 2, green: 3, brown: 4, blue: 5, pink: 6, black: 7, cue: 0 };
    const ORDER = ['yellow', 'green', 'brown', 'blue', 'pink', 'black'];
    const SPOTS = { yellow: [BAULK, H / 2 + DR], green: [BAULK, H / 2 - DR], brown: [BAULK, H / 2], blue: [W / 2, H / 2], pink: [W * .75, H / 2], black: [W * .925, H / 2] };
    const LINKS = {
      black: ['Frame 01', 'Paying sellers a week sooner', 'work/seller-payouts.html'],
      pink: ['Frame 02', 'Commission changes without engineering', 'work/commission-returns.html'],
      blue: ['Frame 03', 'An AI pipeline that filled the feed', 'work/ai-image-workflow.html'],
      brown: ['Frame 04', 'Onboarding that doubled new users', 'work/prepaud-onboarding.html'],
    };
    const POCKETS = [[-4, -4, 30], [W / 2, -12, 27], [W + 4, -4, 30], [-4, H + 4, 30], [W / 2, H + 12, 27], [W + 4, H + 4, 30]];
    const CUE_START = [BAULK - 46, H / 2 - 40];
    const cap = s => s[0].toUpperCase() + s.slice(1);

    let balls = [], brk = 0, best = 0, on = 'red', shot = null, ballInHand = false, placing = false;
    let aiming = false, aimPt = null, kbAngle = 0, kbPower = .55, kbActive = false, interacted = false;
    let running = false, last = 0, pulse = 0, visible = true;
    try { best = +localStorage.getItem('vg-best-break') || 0; } catch (e) { best = 0; }

    // ---------- state & HUD ----------
    const live = c => balls.filter(b => b.c === c && !b.potted);
    const redsLeft = () => live('red').length;
    const cue = () => balls[0];
    const moving = () => balls.some(b => !b.potted && (b.vx || b.vy));
    const fading = () => balls.some(b => b.potted && b.fade < 1);
    const say = t => { if (msgEl) msgEl.textContent = t; };
    const bump = el => { if (!el || reduce) return; const p = el.parentElement; p.classList.remove('bump'); void p.offsetWidth; p.classList.add('bump'); };
    const hud = () => {
      if (breakEl) breakEl.textContent = brk;
      if (bestEl) bestEl.textContent = best;
      if (onBall) onBall.dataset.c = on === 'done' ? 'cue' : on;
      if (onLabel) onLabel.textContent = on === 'colour' ? 'Any colour' : on === 'done' ? 'Frame over' : cap(on);
    };
    const endBreak = () => {
      if (brk > best) { best = brk; try { localStorage.setItem('vg-best-break', String(best)); } catch (e) { /* storage off */ } bump(bestEl); }
      brk = 0;
    };

    const rack = () => {
      R = cv.getBoundingClientRect().width < 560 ? 17 : 13;
      balls = [];
      const add = (c, x, y) => balls.push({ c, x, y, vx: 0, vy: 0, potted: false, fade: 1, px: 0, py: 0 });
      add('cue', ...CUE_START);
      ORDER.forEach(c => add(c, ...SPOTS[c]));
      const ax = W * .75 + 2 * R + 3, dx = 2 * R * .87 + .6;
      for (let row = 0; row < 4; row++) for (let k = 0; k <= row; k++)
        add('red', ax + row * dx, H / 2 + (k - row / 2) * (2 * R + .6));
      brk = 0; on = 'red'; shot = null; ballInHand = false;
      kbAngle = Math.atan2(H / 2 - CUE_START[1], W * .75 - CUE_START[0]);
      hud(); say('A red is on. Pull back from the white and let go.');
      draw();
    };

    const free = (x, y, self) => balls.every(b => b === self || b.potted || Math.hypot(b.x - x, b.y - y) >= 2 * R + 1);
    const respot = c => {
      const b = balls.find(x => x.c === c); let [x, y] = SPOTS[c];
      if (!free(x, y, b)) {
        const open = [...ORDER].reverse().find(k => free(...SPOTS[k], b));
        if (open) [x, y] = SPOTS[open];
        else { let t = x; while (t < W - R && !free(t, y, b)) t++; if (t >= W - R) { t = x; while (t > R && !free(t, y, b)) t--; } x = t; }
      }
      Object.assign(b, { x, y, vx: 0, vy: 0, potted: false, fade: 1 });
    };
    const inD = (x, y) => x <= BAULK && Math.hypot(x - BAULK, y - H / 2) <= DR;
    const clampD = (x, y) => {
      x = Math.min(x, BAULK); const dx = x - BAULK, dy = y - H / 2, d = Math.hypot(dx, dy);
      if (d > DR - 1) { x = BAULK + dx / d * (DR - 1); y = H / 2 + dy / d * (DR - 1); }
      return [Math.max(R, x), Math.min(H - R, Math.max(R, y))];
    };
    const placeCue = (x, y) => {
      const c = cue();
      if (!x) { [x, y] = CUE_START; let n = 0; while (!free(x, y, c) && n++ < 30) y += R; }
      if (free(x, y, c)) Object.assign(c, { x, y, vx: 0, vy: 0, potted: false, fade: 1 });
    };

    // ---------- referee ----------
    const linkToast = c => {
      const L = LINKS[c]; if (!L) return;
      toast(`<span class="ball" data-c="${c}" aria-hidden="true"></span><span><b>${cap(c)} potted · case study unlocked</b><br>${L[0]}: ${L[1]}</span><a href="${L[2]}">Read →</a>`, 6500);
    };
    const referee = () => {
      const s = shot; shot = null;
      const potCols = s.pots.filter(c => ORDER.includes(c)), potReds = s.pots.filter(c => c === 'red').length;
      const inOff = s.pots.includes('cue'), first = s.first;
      let foul = '', lesson = '';
      const onName = on === 'red' ? 'a red' : on === 'colour' ? 'a colour' : `the ${on}`;
      if (!first) { lesson = 'No contact, no insight.'; foul = 'The white missed every ball'; }
      else if (!legalFirst(first)) { lesson = 'Solved the wrong problem first.'; foul = `You hit ${first === 'red' ? 'a red' : 'the ' + first} first, but ${onName} was on`; }
      else if (on === 'red' && potCols.length) { lesson = 'Right output, wrong outcome.'; foul = `The ${potCols[0]} went in while a red was on`; }
      else if (on === 'colour' && potReds) { lesson = 'Right output, wrong outcome.'; foul = 'A red went in while a colour was on'; }
      else if (on === 'colour' && potCols.some(c => c !== first)) { lesson = 'Scope creep.'; foul = `The ${potCols.find(c => c !== first)} went in too, but you played the ${first}`; }
      else if (ORDER.includes(on) && (potReds || potCols.some(c => c !== on))) { lesson = 'Right output, wrong outcome.'; foul = `The wrong ball went in. The ${on} was on`; }
      if (inOff) { if (!lesson) lesson = 'Lost the user at step one.'; foul = foul ? `${foul}, and the white went in` : 'The white went in'; }

      if (foul) {
        const onVal = on === 'red' ? 1 : on === 'colour' ? 4 : VAL[on];
        const pen = Math.max(4, onVal, ...[first, ...s.pots].filter(c => c && c !== 'cue').map(c => VAL[c]));
        potCols.forEach(respot);
        const was = brk; endBreak();
        on = redsLeft() ? 'red' : (ORDER.find(c => live(c).length) || 'done');
        if (inOff) { ballInHand = true; placeCue(); }
        toast(`<span class="ball" data-c="cue" aria-hidden="true"></span><span><b>${lesson}</b><br>${foul}. Foul, ${pen} away.${was ? ` Break ends on ${was}.` : ''}</span>`, 5600);
        say(ballInHand ? 'Back to discovery: tap inside the D to place the white.' : `${lesson} ${on === 'red' ? 'A red' : 'The ' + on} is on.`);
      } else if (s.pots.length) {
        brk += potReds + potCols.reduce((a, c) => a + VAL[c], 0); bump(breakEl);
        potCols.forEach(linkToast);
        if (on === 'red') { on = 'colour'; say(potReds > 1 ? `${potReds} reds down. Shipped in one release. Now any colour.` : 'Red down. Quick win shipped. Now any colour.'); }
        else if (on === 'colour') {
          potCols.forEach(respot);
          on = redsLeft() ? 'red' : 'yellow';
          say(on === 'red' ? `${cap(potCols[0])} down, ${VAL[potCols[0]]} points. Feature shipped, back to the backlog: a red is on.` : 'Backlog cleared. Now the roadmap, in order: the yellow is on.');
        } else {
          on = ORDER[ORDER.indexOf(on) + 1] || 'done';
          say(on === 'done' ? 'Shipped. Frame over.' : `${cap(potCols[0])} down. Next on the roadmap: the ${on}.`);
        }
        if (on === 'done') {
          const total = brk; endBreak();
          setTimeout(() => toast(`<span class="ball" data-c="black" aria-hidden="true"></span><span><b>${total === 147 ? '147. Pixel-perfect.' : `Discovery to launch, break of ${total}.`}</b><br>Frame over. Re-rack to play again.</span>`, 7000), 500);
        }
      } else {
        const was = brk; endBreak();
        if (on === 'colour') on = redsLeft() ? 'red' : 'yellow';
        say(was ? `No pot. Every iteration teaches something. Break ends on ${was}.` : `No pot. Every iteration teaches something. ${on === 'red' ? 'A red' : 'The ' + on} is still on.`);
      }
      hud();
    };

    // ---------- physics ----------
    const pot = (b, px, py) => {
      b.potted = true; b.px = px; b.py = py; b.vx = b.vy = 0; b.fade = 0;
      sfx('pot');
      if (shot) shot.pots.push(b.c);
    };
    const step = n => {
      const act = balls.filter(b => !b.potted);
      for (let s = 0; s < n; s++) {
        for (const b of act) if (!b.potted) { b.x += b.vx / SUB; b.y += b.vy / SUB; }
        for (let i = 0; i < act.length; i++) for (let j = i + 1; j < act.length; j++) {
          const a = act[i], b = act[j]; if (a.potted || b.potted) continue;
          const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy;
          if (d2 < 4 * R * R && d2 > 0) {
            if (shot && !shot.first && (a.c === 'cue' || b.c === 'cue')) shot.first = a.c === 'cue' ? b.c : a.c;
            const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, ov = 2 * R - d;
            a.x -= nx * ov / 2; a.y -= ny * ov / 2; b.x += nx * ov / 2; b.y += ny * ov / 2;
            const rv = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
            if (rv > 0) { const imp = rv * .97; a.vx -= imp * nx; a.vy -= imp * ny; b.vx += imp * nx; b.vy += imp * ny; sfx('ball', rv); }
          }
        }
        for (const b of act) {
          if (b.potted) continue;
          let near = false;
          for (const [px, py, pr] of POCKETS) {
            const d = Math.hypot(b.x - px, b.y - py);
            if (d < pr + (R - 13)) { pot(b, px, py); break; }
            if (d < pr + 22) near = true;
          }
          if (b.potted) continue;
          const lim = near ? -R * .6 : R;
          if (b.x < lim) { b.x = lim; sfx('rail', Math.abs(b.vx)); b.vx = Math.abs(b.vx) * .78; }
          if (b.x > W - lim) { b.x = W - lim; sfx('rail', Math.abs(b.vx)); b.vx = -Math.abs(b.vx) * .78; }
          if (b.y < lim) { b.y = lim; sfx('rail', Math.abs(b.vy)); b.vy = Math.abs(b.vy) * .78; }
          if (b.y > H - lim) { b.y = H - lim; sfx('rail', Math.abs(b.vy)); b.vy = -Math.abs(b.vy) * .78; }
        }
      }
      for (const b of act) {
        if (b.potted) continue;
        const sp = Math.hypot(b.vx, b.vy), ns = Math.max(0, sp * Math.pow(.987, n / SUB) - .012 * n / SUB);
        if (ns < .05) b.vx = b.vy = 0; else { const k = ns / sp; b.vx *= k; b.vy *= k; }
      }
    };

    // ---------- drawing ----------
    const mix = (a, b, t) => {
      const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
      const A = p(a), B = p(b);
      return 'rgb(' + A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',') + ')';
    };
    const sphere = (x, y, r, col, alpha = 1) => {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(0,0,0,.32)';
      ctx.beginPath(); ctx.ellipse(x + r * .28, y + r * .42, r * .95, r * .72, 0, 0, 7); ctx.fill();
      const g = ctx.createRadialGradient(x - r * .35, y - r * .4, r * .1, x, y, r * 1.05);
      g.addColorStop(0, col === COL.cue ? '#ffffff' : mix(col, '#ffffff', .35));
      g.addColorStop(.45, col); g.addColorStop(1, mix(col, '#000000', .55));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      ctx.beginPath(); ctx.ellipse(x - r * .38, y - r * .42, r * .26, r * .17, -.6, 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
    };
    const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); };
    const poly = pts => { ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill(); };

    const drawTable = () => {
      const wood = ctx.createLinearGradient(0, 0, 0, TH);
      wood.addColorStop(0, '#6a4226'); wood.addColorStop(.5, '#4A2E1B'); wood.addColorStop(1, '#2f1d11');
      ctx.fillStyle = wood; rr(0, 0, TW, TH, 26); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 2; rr(1, 1, TW - 2, TH - 2, 25); ctx.stroke();
      ctx.fillStyle = '#e9dcc0';
      for (let i = 1; i < 8; i++) { if (i === 4) continue; const x = M + W * i / 8; [M / 2, TH - M / 2].forEach(y => { ctx.beginPath(); ctx.arc(x, y, 2.6, 0, 7); ctx.fill(); }); }
      for (let i = 1; i < 4; i++) { const y = M + H * i / 4; [M / 2, TW - M / 2].forEach(x => { ctx.beginPath(); ctx.arc(x, y, 2.6, 0, 7); ctx.fill(); }); }
      ctx.fillStyle = '#0d6a40'; rr(M - 10, M - 10, W + 20, H + 20, 8); ctx.fill();
      const cl = ctx.createRadialGradient(M + W * .5, M + H * .45, 40, M + W * .5, M + H * .5, W * .62);
      cl.addColorStop(0, '#1a9a5f'); cl.addColorStop(1, '#0f6e43');
      ctx.fillStyle = cl; ctx.fillRect(M, M, W, H);
      ctx.save(); ctx.translate(M, M);
      if (ballInHand) { ctx.fillStyle = `rgba(232,197,71,${.12 + .06 * Math.sin(pulse * 4)})`; ctx.beginPath(); ctx.moveTo(BAULK, H / 2 - DR); ctx.arc(BAULK, H / 2, DR, -Math.PI / 2, Math.PI / 2, true); ctx.closePath(); ctx.fill(); }
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(BAULK, 0); ctx.lineTo(BAULK, H); ctx.stroke();
      ctx.beginPath(); ctx.arc(BAULK, H / 2, DR, Math.PI / 2, Math.PI * 1.5); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.6)';
      Object.values(SPOTS).forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 2, 0, 7); ctx.fill(); });
      for (const [px, py, pr] of POCKETS) {
        ctx.fillStyle = '#0b0805'; ctx.beginPath(); ctx.arc(px, py, pr - 9, 0, 7); ctx.fill();
        ctx.strokeStyle = 'rgba(232,197,71,.25)'; ctx.lineWidth = 2; ctx.stroke();
      }
      ctx.restore();
    };

    const rayHit = (ox, oy, dx, dy) => {
      let best2 = 900, hit = null;
      for (const b of balls) {
        if (b.potted || b.c === 'cue') continue;
        const fx = ox - b.x, fy = oy - b.y, bb = fx * dx + fy * dy, c = fx * fx + fy * fy - 4 * R * R, disc = bb * bb - c;
        if (disc >= 0) { const t = -bb - Math.sqrt(disc); if (t > 0 && t < best2) { best2 = t; hit = b; } }
      }
      const tx = dx > 0 ? (W - R - ox) / dx : dx < 0 ? (R - ox) / dx : 1e9;
      const ty = dy > 0 ? (H - R - oy) / dy : dy < 0 ? (R - oy) / dy : 1e9;
      if (Math.min(tx, ty) < best2) { best2 = Math.min(tx, ty); hit = null; }
      return [best2, hit];
    };
    const legalFirst = c => on === 'red' ? c === 'red' : on === 'colour' ? c !== 'red' : c === on;

    const aimState = () => {
      const c = cue(); if (c.potted || moving() || placing) return null;
      if (aiming && aimPt) {
        const dx = c.x - aimPt[0], dy = c.y - aimPt[1], d = Math.hypot(dx, dy);
        if (d < 1) return null;
        return { dx: dx / d, dy: dy / d, power: Math.max(0, Math.min(1, (d - R * 1.4) / 230)) };
      }
      if (kbActive) return { dx: Math.cos(kbAngle), dy: Math.sin(kbAngle), power: kbPower };
      if (!interacted) return { dx: Math.cos(kbAngle), dy: Math.sin(kbAngle), power: .1 + .06 * Math.sin(pulse * 2.2), idle: true };
      return null;
    };

    const draw = () => {
      const k = cv.width / TW;
      ctx.setTransform(k, 0, 0, k, 0, 0);
      ctx.clearRect(0, 0, TW, TH);
      drawTable();
      ctx.save(); ctx.translate(M, M);
      for (const b of balls) if (b.potted && b.fade < 1) sphere(b.px, b.py, R * (1 - b.fade * .6), COL[b.c], 1 - b.fade);
      for (const b of balls) if (!b.potted) sphere(b.x, b.y, R, COL[b.c]);
      const a = aimState(), c = cue();
      if (a) {
        if (!a.idle) {
          const [t, hb] = rayHit(c.x, c.y, a.dx, a.dy);
          const ok = !hb || legalFirst(hb.c);
          ctx.setLineDash([6, 8]); ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(c.x + a.dx * R, c.y + a.dy * R); ctx.lineTo(c.x + a.dx * t, c.y + a.dy * t); ctx.stroke(); ctx.setLineDash([]);
          ctx.strokeStyle = ok ? 'rgba(255,255,255,.7)' : 'rgba(231,127,174,.95)';
          ctx.beginPath(); ctx.arc(c.x + a.dx * t, c.y + a.dy * t, R, 0, 7); ctx.stroke();
          if (hb) {
            const gx = c.x + a.dx * t, gy = c.y + a.dy * t, nx = (hb.x - gx) / (2 * R), ny = (hb.y - gy) / (2 * R);
            ctx.strokeStyle = ok ? 'rgba(232,197,71,.85)' : 'rgba(231,127,174,.85)';
            ctx.beginPath(); ctx.moveTo(hb.x + nx * R, hb.y + ny * R); ctx.lineTo(hb.x + nx * 70, hb.y + ny * 70); ctx.stroke();
          }
        }
        const back = R + 8 + a.power * 70, len = 470;
        const sx = c.x - a.dx * back, sy = c.y - a.dy * back, ex = c.x - a.dx * (back + len), ey = c.y - a.dy * (back + len);
        const px = -a.dy, py = a.dx;
        ctx.fillStyle = 'rgba(0,0,0,.25)';
        poly([[sx + px * 3 + 8, sy + py * 3 + 10], [ex + px * 7 + 8, ey + py * 7 + 10], [ex - px * 7 + 8, ey - py * 7 + 10], [sx - px * 3 + 8, sy - py * 3 + 10]]);
        const g = ctx.createLinearGradient(sx, sy, ex, ey);
        g.addColorStop(0, '#f1e6c8'); g.addColorStop(.02, '#d9b47a'); g.addColorStop(.6, '#b07a3e'); g.addColorStop(.62, '#1d1d1d'); g.addColorStop(1, '#111');
        ctx.fillStyle = g;
        poly([[sx + px * 3, sy + py * 3], [ex + px * 7, ey + py * 7], [ex - px * 7, ey - py * 7], [sx - px * 3, sy - py * 3]]);
        ctx.fillStyle = '#4A7BD0'; poly([[sx + px * 3, sy + py * 3], [sx - px * 3, sy - py * 3], [sx - px * 3 - a.dx * 4, sy - py * 3 - a.dy * 4], [sx + px * 3 - a.dx * 4, sy + py * 3 - a.dy * 4]]);
        if (!a.idle && a.power > 0) {
          ctx.fillStyle = 'rgba(0,0,0,.45)'; rr(W - 150, H - 30, 134, 14, 7); ctx.fill();
          ctx.fillStyle = a.power > .8 ? '#E77FAE' : '#E8C547'; rr(W - 148, H - 28, 130 * a.power, 10, 5); ctx.fill();
        }
      }
      if (!interacted && !c.potted) {
        const ph = (pulse % 1.4) / 1.4;
        ctx.strokeStyle = `rgba(232,197,71,${.55 - .45 * ph})`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(c.x, c.y, R + 4 + 16 * ph, 0, 7); ctx.stroke();
      }
      ctx.restore();
    };

    // ---------- loop ----------
    const needLoop = () => moving() || fading() || aiming || placing || ((!interacted || ballInHand) && visible && !reduce);
    const loop = t => {
      const dt = Math.min(3, (t - last) / 16.67 || 1); last = t;
      pulse += dt / 60;
      if (moving()) step(Math.max(1, Math.round(SUB * dt)));
      for (const b of balls) if (b.potted && b.fade < 1) b.fade = Math.min(1, b.fade + .08 * dt);
      if (shot && !moving()) referee();
      draw();
      if (needLoop()) requestAnimationFrame(loop); else { running = false; draw(); }
    };
    const kick = () => { if (!running) { running = true; last = performance.now(); requestAnimationFrame(loop); } };

    const size = () => {
      const r = cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
      cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.width * dpr * TH / TW);
      draw();
    };
    const sizeObs = new ResizeObserver(size); sizeObs.observe(cv);
    const visObs = new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) kick(); });
    visObs.observe(cv);

    // ---------- input ----------
    const toLocal = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * TW - M, (e.clientY - r.top) / r.height * TH - M]; };
    const busy = () => moving() || shot || on === 'done';
    const shoot = (dx, dy, power) => {
      if (power < .04 || busy()) return;
      const c = cue(), v = 6 + power * 30;
      c.vx = dx * v; c.vy = dy * v; ballInHand = false; sfx('cue', power);
      shot = { first: null, pots: [] };
      if (!interacted) interacted = true;
      say('…');
      kick();
    };
    cv.addEventListener('pointerdown', e => {
      if (busy()) { if (on === 'done') say('Frame over. Re-rack to play again.'); return; }
      if (soundOn) { const a = audio(); if (a && a.state === 'suspended') a.resume(); }
      const p = toLocal(e), c = cue();
      cv.setPointerCapture(e.pointerId); kbActive = false;
      if (ballInHand && Math.hypot(p[0] - c.x, p[1] - c.y) > 2.2 * R && (inD(p[0], p[1]) || p[0] < BAULK)) {
        placing = true; placeCue(...clampD(...p));
      } else { aiming = true; aimPt = p; }
      kick();
    });
    cv.addEventListener('pointermove', e => {
      if (placing) { placeCue(...clampD(...toLocal(e))); kick(); }
      else if (aiming) { aimPt = toLocal(e); kick(); }
    });
    cv.addEventListener('pointerup', () => {
      if (placing) { placing = false; say('Problem reframed. Take your shot.'); kick(); return; }
      if (!aiming) return;
      const a = aimState(); aiming = false; aimPt = null;
      if (a && !a.idle) shoot(a.dx, a.dy, a.power);
      kick();
    });
    cv.addEventListener('pointercancel', () => { aiming = placing = false; aimPt = null; kick(); });
    cv.addEventListener('keydown', e => {
      const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Enter'];
      if (!keys.includes(e.key)) return;
      e.preventDefault(); if (busy()) return;
      kbActive = true;
      const fine = e.shiftKey ? .01 : .05;
      if (e.key === 'ArrowLeft') kbAngle -= fine;
      if (e.key === 'ArrowRight') kbAngle += fine;
      if (e.key === 'ArrowUp') kbPower = Math.min(1, kbPower + .08);
      if (e.key === 'ArrowDown') kbPower = Math.max(.1, kbPower - .08);
      if (e.key === ' ' || e.key === 'Enter') { kbActive = false; shoot(Math.cos(kbAngle), Math.sin(kbAngle), kbPower); }
      draw(); kick();
    });
    cv.addEventListener('blur', () => { kbActive = false; draw(); });
    const rackBtn = $('rerack');
    if (rackBtn) rackBtn.addEventListener('click', () => { if (brk) endBreak(); rack(); hud(); kick(); });

    rack(); size(); kick();
  }
}
