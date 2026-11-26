/* Vansh Goel portfolio — shared behaviour. No dependencies. */
{
  // ---- Edit these two lines when you have them ----
  const RESUME_URL = 'https://drive.google.com/file/d/135j7qGTYbuSfMFbu8cdgDCerpUAgKzid/view?usp=drive_link'; // full URL, or a path like 'assets/resume.pdf'
  const EMAIL = 'vanshgoel24@gmail.com';

  const root = document.documentElement;
  root.classList.remove('no-js');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Resume links
  document.querySelectorAll('[data-resume]').forEach(a => {
    if (RESUME_URL) { a.href = /^https?:/.test(RESUME_URL) ? RESUME_URL : (a.dataset.resume || '') + RESUME_URL; a.hidden = false; }
    else a.hidden = true;
  });
  document.querySelectorAll('[data-email]').forEach(el => { el.textContent = EMAIL; });

  // ---- Toasts ----
  let box = null;
  const toast = (html, ms = 4200) => {
    if (!box) { box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite'); document.body.append(box); }
    const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = html; box.append(t);
    while (box.children.length > 2) box.firstChild.remove();
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 320); }, ms);
  };
  window.siteToast = toast;

  // ---- Nav ----
  const nav = document.querySelector('.nav');
  const onScroll = () => nav && nav.classList.toggle('scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const menuBtn = document.querySelector('.menu-btn');
  if (menuBtn) {
    const close = () => { document.body.classList.remove('menu-open'); menuBtn.setAttribute('aria-expanded', 'false'); };
    menuBtn.addEventListener('click', () => {
      const open = document.body.classList.toggle('menu-open');
      menuBtn.setAttribute('aria-expanded', String(open));
    });
    document.querySelectorAll('.nav-links a').forEach(a => a.addEventListener('click', close));
    addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    addEventListener('resize', () => { if (innerWidth > 860) close(); });
  }

  // ---- Reveal on scroll ----
  const rvs = document.querySelectorAll('.rv');
  if ('IntersectionObserver' in window && !reduce) {
    const rvObs = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); rvObs.unobserve(e.target); }
    }), { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    rvs.forEach(el => rvObs.observe(el));
  } else rvs.forEach(el => el.classList.add('in'));

  // ---- Count up ----
  const counters = document.querySelectorAll('[data-count]');
  const run = el => {
    const end = +el.dataset.count, pre = el.dataset.pre || '', suf = el.dataset.suf || '';
    if (reduce) { el.textContent = pre + end + suf; return; }
    const t0 = performance.now(), dur = 1400;
    const tick = t => {
      const p = Math.min(1, (t - t0) / dur), v = Math.round(end * (1 - Math.pow(1 - p, 3)));
      el.textContent = pre + v + suf; if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if ('IntersectionObserver' in window) {
    const cObs = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { run(e.target); cObs.unobserve(e.target); }
    }), { threshold: .6 });
    counters.forEach(el => cObs.observe(el));
  }

  // ---- Chalk cube: copy email ----
  document.querySelectorAll('.chalk').forEach(btn => btn.addEventListener('click', async () => {
    let ok = false;
    try { await navigator.clipboard.writeText(EMAIL); ok = true; } catch (e) { ok = false; }
    btn.classList.remove('done'); void btn.offsetWidth; btn.classList.add('done');
    const label = btn.querySelector('.txt b');
    if (ok) { label.textContent = 'Chalked! Email copied'; toast(`<span class="ball" data-c="blue" aria-hidden="true"></span><span>${EMAIL} is on your clipboard.</span>`); }
    else { label.textContent = EMAIL; toast(`<span class="ball" data-c="blue" aria-hidden="true"></span><span>Couldn't copy here. My email is ${EMAIL}</span>`); }
    setTimeout(() => { label.textContent = 'Chalk up: copy my email'; }, 3000);
    if (!reduce) for (let i = 0; i < 14; i++) {
      const d = document.createElement('i'); d.className = 'dust'; btn.append(d);
      const a = Math.random() * Math.PI * 2, r = 30 + Math.random() * 50;
      d.animate([{ transform: 'translate(-50%,-50%) scale(1)', opacity: .9 }, { transform: `translate(${Math.cos(a) * r - 3}px,${Math.sin(a) * r - 3}px) scale(.2)`, opacity: 0 }], { duration: 700 + Math.random() * 400, easing: 'cubic-bezier(.2,.8,.2,1)' }).onfinish = () => d.remove();
    }
  }));

  // ---- Cue rack: tap to lift on touch ----
  document.querySelectorAll('.slot:not(.empty)').forEach(s => s.addEventListener('click', () => {
    document.querySelectorAll('.slot.lift').forEach(o => o !== s && o.classList.remove('lift'));
    s.classList.toggle('lift');
  }));

  // ---- Player card tilt ----
  const pc = document.querySelector('.pcard');
  if (pc && !reduce && matchMedia('(hover: hover)').matches) {
    const inner = pc.querySelector('.pcard-in');
    pc.addEventListener('pointermove', e => {
      const r = inner.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      pc.classList.add('tilting');
      inner.style.setProperty('--ry', ((x - .5) * 10).toFixed(2) + 'deg');
      inner.style.setProperty('--rx', ((.5 - y) * 10).toFixed(2) + 'deg');
      inner.style.setProperty('--gx', (x * 100).toFixed(1) + '%'); inner.style.setProperty('--gy', (y * 100).toFixed(1) + '%');
    });
    pc.addEventListener('pointerleave', () => { pc.classList.remove('tilting'); inner.style.setProperty('--rx', '0deg'); inner.style.setProperty('--ry', '0deg'); });
  }

  // ---- Portrait: use photo if present, else keep illustration ----
  const ph = document.querySelector('.pcard img[data-photo]');
  if (ph) {
    const test = new Image();
    test.onload = () => { ph.src = test.src; ph.hidden = false; const ill = document.querySelector('.pcard svg'); if (ill) ill.remove(); };
    test.src = ph.dataset.photo;
  }

  // ---- Page transition ----
  if (root.classList.contains('pt-enter')) requestAnimationFrame(() => requestAnimationFrame(() => {
    root.classList.add('pt-out'); setTimeout(() => root.classList.remove('pt-enter', 'pt-out'), 600);
  }));
  addEventListener('pageshow', e => { if (e.persisted) root.classList.remove('pt-go', 'pt-enter', 'pt-out'); });
  if (!reduce) document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === '_blank' || a.hasAttribute('download')) return;
    const url = new URL(a.getAttribute('href'), location.href);
    if (url.origin !== location.origin || (url.pathname === location.pathname && url.search === location.search)) return;
    e.preventDefault();
    try { sessionStorage.setItem('vg-pt', '1'); } catch (err) { /* storage off */ }
    root.classList.add('pt-go');
    setTimeout(() => { location.href = url.href; }, 430);
  });

  // ---- Section balls (home, desktop) ----
  const bn = [...document.querySelectorAll('.balls-nav a')];
  if (bn.length) {
    const targets = bn.map(a => document.querySelector(a.getAttribute('href')));
    const mark = () => {
      let cur = 0;
      targets.forEach((t, i) => { if (t && t.getBoundingClientRect().top < innerHeight * .45) cur = i; });
      bn.forEach((a, i) => a.toggleAttribute('aria-current', i === cur));
    };
    addEventListener('scroll', mark, { passive: true }); mark();
  }

  // ---------------- Case study only ----------------
  const cs = document.querySelector('.cs');
  if (cs) {
    // Cue progress
    const bar = document.querySelector('.cue-progress');
    const secs = [...document.querySelectorAll('.cs-sec')];
    const links = [...document.querySelectorAll('.toc a')];
    const curLabel = document.querySelector('.toc-btn .cur');
    const tocWrap = document.querySelector('.toc-wrap'), head = document.querySelector('.cs-head');
    const upd = () => {
      const h = document.documentElement.scrollHeight - innerHeight;
      const p = h > 0 ? Math.min(1, Math.max(0, scrollY / h)) : 0;
      if (bar) bar.style.setProperty('--p', p.toFixed(4));
      let cur = -1;
      secs.forEach((s, i) => { if (s.getBoundingClientRect().top < innerHeight * .35) cur = i; });
      links.forEach((a, i) => a.toggleAttribute('aria-current', i === cur));
      if (curLabel) curLabel.textContent = cur >= 0 ? secs[cur].dataset.short : 'Contents';
      if (tocWrap && head) tocWrap.classList.toggle('away', head.getBoundingClientRect().bottom > 80);
    };
    addEventListener('scroll', upd, { passive: true }); addEventListener('resize', upd); upd();

    // Sections panel
    const tocBtn = document.querySelector('.toc-btn'), toc = document.querySelector('.toc');
    if (tocBtn && toc) {
      const setOpen = o => { toc.classList.toggle('open', o); tocBtn.setAttribute('aria-expanded', String(o)); };
      tocBtn.addEventListener('click', e => { e.stopPropagation(); setOpen(!toc.classList.contains('open')); });
      toc.addEventListener('click', e => { if (e.target.closest('a')) setOpen(false); });
      document.addEventListener('click', e => { if (!toc.contains(e.target)) setOpen(false); });
      addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });
    }

    // Lightbox
    const lb = document.createElement('div'); lb.className = 'lb'; lb.hidden = true;
    lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Image viewer');
    lb.innerHTML = '<button class="lb-x" aria-label="Close image">×</button><div class="lb-scroll"><img alt=""></div><p class="lb-cap"></p>';
    document.body.append(lb);
    const lbImg = lb.querySelector('img'), lbCap = lb.querySelector('.lb-cap'); let lastFocus = null;
    const closeLb = () => { lb.hidden = true; document.body.style.overflow = ''; if (lastFocus) lastFocus.focus(); };
    document.querySelectorAll('.zoom').forEach(b => b.addEventListener('click', () => {
      const img = b.querySelector('img'); lastFocus = b;
      lbImg.src = b.dataset.full; lbImg.alt = img.alt; lbCap.textContent = b.dataset.cap || '';
      lb.classList.toggle('tall', b.classList.contains('tall'));
      lb.hidden = false; document.body.style.overflow = 'hidden'; lb.querySelector('.lb-x').focus();
    }));
    lb.addEventListener('click', e => { if (e.target === lb || e.target.classList.contains('lb-x') || e.target.classList.contains('lb-scroll')) closeLb(); });
    addEventListener('keydown', e => { if (e.key === 'Escape' && !lb.hidden) closeLb(); });

    // Video facade: embed on the real site, link out elsewhere (sandboxed previews block embeds)
    document.querySelectorAll('.video[data-yt]').forEach(v => v.addEventListener('click', e => {
      const host = location.hostname;
      const canEmbed = /vanshgoel\.com$|vercel\.app$|^localhost$|^127\./.test(host);
      if (!canEmbed) return; // plain link opens YouTube
      e.preventDefault();
      const f = document.createElement('iframe');
      f.src = `https://www.youtube-nocookie.com/embed/${v.dataset.yt}?autoplay=1&rel=0`;
      f.title = 'PrepAud onboarding walkthrough'; f.allow = 'autoplay; encrypted-media; picture-in-picture'; f.allowFullscreen = true;
      v.replaceWith(Object.assign(document.createElement('div'), { className: 'video-frame' })); document.querySelector('.video-frame').append(f);
    }));
  }
}
