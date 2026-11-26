"""Generate case study pages from content/<NN-slug>/content.md.  Usage: python3 build.py <site_dir>"""
import sys, os, re, json, html

SITE = sys.argv[1]
META = json.load(open(os.path.join(SITE, 'assets/img/meta.json')))
FRAMES = [
    ('01-seller-payouts', 'seller-payouts', 'black', 7, 'Paying sellers a week sooner, with every rupee explained'),
    ('02-commission-returns', 'commission-returns', 'pink', 6, 'Commission changes, from engineering ticket to self-serve'),
    ('03-ai-image-workflow', 'ai-image-workflow', 'blue', 5, 'An AI pipeline that filled the feed before launch'),
    ('04-prepaud-onboarding', 'prepaud-onboarding', 'brown', 4, 'An onboarding redesign that doubled new users'),
]
FC = {'black': '#2a2a2a', 'pink': '#E77FAE', 'blue': '#1D57C4', 'brown': '#6B3F22'}
esc = lambda s: html.escape(s, quote=True)


def inline(s):
    s = esc(s)
    s = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', lambda m: f'<a href="{m.group(2)}"' + (' target="_blank" rel="noopener"' if m.group(2).startswith('http') else '') + f'>{m.group(1)}</a>', s)
    s = re.sub(r'\*\*\*(.+?)\*\*\*', r'<strong><em>\1</em></strong>', s)
    s = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', s)
    s = re.sub(r'(?<![*\w])\*(?!\s)(.+?)(?<!\s)\*(?!\*)', r'<em>\1</em>', s)
    return s


def img_tag(slug, path, alt, cls='', eager=False):
    name = os.path.splitext(os.path.basename(path))[0]
    m = META[f'{slug}/{name}']
    a, b = m['sizes']
    w2 = min(b, m['w']); h2 = round(m['h'] * w2 / m['w'])
    base = f'../assets/img/{slug}/{name}'
    srcset = f'{base}-{a}.webp {min(a, m["w"])}w, {base}-{b}.webp {w2}w'
    sizes = '(max-width: 760px) 100vw, 720px' if m['tall'] else '(max-width: 1240px) 100vw, 1200px'
    load = 'fetchpriority="high"' if eager else 'loading="lazy" decoding="async"'
    return m['tall'], f'{base}-{b}.webp', f'<img src="{base}-{a}.webp" srcset="{srcset}" sizes="{sizes}" width="{w2}" height="{h2}" alt="{esc(alt)}" {load}>'


def figure(slug, path, alt, fallback, hero=False):
    cap = '' if (re.match(r'^\d\d[a-z]?-', alt) or alt == 'Hero') else alt
    alt_text = cap or fallback
    tall, full, tag = img_tag(slug, path, alt_text, eager=hero)
    cls = 'fig tall' if tall else 'fig'
    zcls = 'zoom tall' if tall else 'zoom'
    capattr = f' data-cap="{esc(cap)}"' if cap else ''
    fc = f'<figcaption>{inline(cap)}</figcaption>' if cap else ''
    return f'<figure class="{cls}"><button class="{zcls}" type="button" data-full="{full}"{capattr} aria-label="Enlarge image: {esc(alt_text)}">{tag}</button>{fc}</figure>'


def table(rows):
    cells = [[c.strip() for c in r.strip().strip('|').split('|')] for r in rows]
    head, body = cells[0], [r for r in cells[2:]]
    th = ''.join(f'<th scope="col">{inline(c)}</th>' for c in head)
    trs = ''.join('<tr>' + ''.join(f'<td data-l="{esc(re.sub(r"[*]", "", head[i]))}">{inline(c)}</td>' for i, c in enumerate(r)) + '</tr>' for r in body)
    return f'<div class="tbl"><table class="stack"><thead><tr>{th}</tr></thead><tbody>{trs}</tbody></table></div>'


def parse(folder):
    src = open(os.path.join(SITE, 'content', folder, 'content.md')).read().strip('\n').split('\n')
    doc = {'facts': [], 'sections': []}
    i = 0
    while i < len(src):
        l = src[i]
        if l.startswith('# '): doc['title'] = l[2:].strip()
        elif l.startswith('*') and l.endswith('*') and 'kicker' not in doc and not l.startswith('**'): doc['kicker'] = l.strip('*')
        elif l.startswith('- **') and not doc['sections']:
            m = re.match(r'- \*\*(.+?):\*\* (.+)', l); doc['facts'].append((m.group(1), m.group(2)))
        elif l.startswith('![') and 'hero' not in doc:
            doc['hero'] = re.match(r'!\[(.*?)\]\((.+?)\)', l).group(2)
        elif l.startswith('## '):
            m = re.match(r'## (\d+)\. (.+)', l); doc['sections'].append({'n': m.group(1), 'title': m.group(2), 'lines': []})
        elif doc['sections']: doc['sections'][-1]['lines'].append(l)
        elif l.strip() and 'summary' not in doc and not l.startswith(('#', '*', '-', '!')): doc['summary'] = l.strip()
        i += 1
    return doc


def render_section(slug, sec):
    lines, out, i = sec['lines'], [], 0
    t = sec['title'].lower()
    chipword = 'Decision' if 'decision' in t else 'Rule' if 'rule' in t else 'Step' if 'system' in t else None
    statsec = any(k in t for k in ('impact', 'result'))
    cur_h3 = sec['title']
    while i < len(lines):
        l = lines[i]
        if not l.strip(): i += 1; continue
        if l.startswith('### '):
            txt = l[4:].strip(); m = re.match(r'(\d+)\. (.+)', txt)
            if m and chipword:
                cur_h3 = m.group(2)
                out.append(f'<h3><span class="chip">{chipword} {m.group(1)}</span>{inline(m.group(2))}</h3>')
            else:
                cur_h3 = txt; out.append(f'<h3>{inline(txt)}</h3>')
            i += 1; continue
        if l.startswith('>'):
            blk = []
            while i < len(lines) and lines[i].startswith('>'): blk.append(lines[i].lstrip('> ').strip()); i += 1
            txt = ' '.join(b for b in blk if b)
            if '📷' in txt: continue
            if txt.startswith('**How might we'):
                out.append(f'<blockquote class="hmw"><p>{inline(txt)}</p></blockquote>')
            elif re.match(r'^\*\*[“"]', txt):
                out.append(f'<blockquote class="say"><p>{esc(txt.strip("*"))}</p></blockquote>')
            else:
                out.append(f'<blockquote class="note"><p>{inline(txt)}</p></blockquote>')
            continue
        if l.startswith('|'):
            rows = []
            while i < len(lines) and lines[i].startswith('|'): rows.append(lines[i]); i += 1
            out.append(table(rows)); continue
        if l.startswith('- '):
            items = []
            while i < len(lines) and lines[i].startswith('- '): items.append(lines[i][2:].strip()); i += 1
            if statsec and all(re.match(r'^\*\*[^*]{1,12}\*\* ', it) for it in items):
                lis = ''.join('<li>' + re.sub(r'^\*\*([^*]+)\*\* (.+)$', lambda m: f'<b>{esc(m.group(1))}</b>{inline(m.group(2))}', it) + '</li>' for it in items)
                out.append(f'<ul class="stats">{lis}</ul>')
            else:
                out.append('<ul>' + ''.join(f'<li>{inline(it)}</li>' for it in items) + '</ul>')
            continue
        if re.match(r'^\d+\. ', l):
            items = []
            while i < len(lines) and re.match(r'^\d+\. ', lines[i]): items.append(re.sub(r'^\d+\. ', '', lines[i])); i += 1
            out.append('<ol>' + ''.join(f'<li>{inline(it)}</li>' for it in items) + '</ol>'); continue
        if l.startswith('!['):
            m = re.match(r'!\[(.*?)\]\((.+?)\)', l)
            out.append(figure(slug, m.group(2), m.group(1), cur_h3)); i += 1; continue
        m = re.match(r'^\[(.+?)\]\((https://youtu\.be/([\w-]+))\)$', l.strip())
        if m:
            _, _, poster = img_tag(slug, 'images/00-hero.webp', 'PrepAud onboarding screens, video poster')
            out.append(f'<a class="video" href="{m.group(2)}" target="_blank" rel="noopener" data-yt="{m.group(3)}">{poster}<span class="play"><span class="ball" data-c="brown" aria-hidden="true">▶</span>Watch the walkthrough</span></a>')
            i += 1; continue
        para = [l.strip()]; i += 1
        while i < len(lines) and lines[i].strip() and not re.match(r'^(#|>|\||- |!\[|\d+\. )', lines[i]): para.append(lines[i].strip()); i += 1
        txt = ' '.join(para)
        cls = ' class="lbl-p"' if re.match(r'^\*\*(Problem|Decision|Trade-off|Next time)\.?\*\*', txt) else ''
        out.append(f'<p{cls}>{inline(txt)}</p>')
    return out


def nav(prefix):
    return f'''<header class="nav">
  <div class="nav-in">
    <a class="logo" href="{prefix}index.html" aria-label="Vansh Goel, home"><span class="ball" data-c="cue" aria-hidden="true"></span>VANSH GOEL</a>
    <ul class="nav-links" id="menu">
      <li><a href="{prefix}index.html#frames">Work</a></li>
      <li><a href="{prefix}index.html#about">About</a></li>
      <li><a href="{prefix}index.html#approach">Approach</a></li>
      <li><a href="{prefix}index.html#contact">Contact</a></li>
      <li class="m-only"><a data-resume="{prefix}" href="#" target="_blank" rel="noopener" hidden>Resume ↗</a></li>
    </ul>
    <a class="btn btn-ghost nav-cta" data-resume="{prefix}" href="#" target="_blank" rel="noopener" hidden>Resume ↗</a>
    <button class="menu-btn" aria-label="Menu" aria-expanded="false" aria-controls="menu"><span></span><span></span></button>
  </div>
  <div class="cue-progress" aria-hidden="true"><i></i></div>
</header>'''


def build(idx):
    folder, slug, color, val, short = FRAMES[idx]
    d = parse(folder)
    num = folder[:2]
    parts = [p.strip() for p in d['kicker'].split('·')]
    kicker = f'Frame {num} · {parts[0]} · {parts[1][0] + parts[1][1:].lower()}'
    words = len(re.findall(r'\w+', open(os.path.join(SITE, 'content', folder, 'content.md')).read()))
    mins = max(3, round(words / 220))
    facts = ''.join(f'<div{" class=outcome" if k == "Outcome" else ""}><dt>{esc(k)}</dt><dd>{inline(v)}</dd></div>' for k, v in d['facts'])
    secs, toc = [], []
    for s in d['sections']:
        sid = re.sub(r'[^a-z0-9]+', '-', s['title'].lower()).strip('-')
        body = '\n'.join(render_section(slug, s))
        secs.append(f'<section class="cs-sec" id="{sid}" data-short="{esc(s["title"])}"><div class="lab"><div class="n">{s["n"]}</div><h2>{inline(s["title"])}</h2></div>\n{body}\n</section>')
        toc.append(f'<li><a href="#{sid}"><span>{s["n"]}</span>{inline(s["title"])}</a></li>')
    if idx + 1 < len(FRAMES):
        nf = FRAMES[idx + 1]
        nxt = f'<a href="{nf[1]}.html"><span class="ball" data-c="{nf[2]}" aria-hidden="true">{nf[3]}</span><span><small>Next frame · {nf[0][:2]}</small><strong>{esc(nf[4])}</strong></span><span class="arr" aria-hidden="true">→</span></a>'
    else:
        nxt = '<a href="../index.html#frames"><span class="ball" data-c="cue" aria-hidden="true"></span><span><small>That\'s the last frame</small><strong>Back to the table</strong></span><span class="arr" aria-hidden="true">→</span></a>'
    hero_src = 'images/hero-crop.webp' if f'{slug}/hero-crop' in META else d['hero']
    hero_alt = {'seller-payouts': 'BellPost seller payout dashboard with total, pending and settled payouts',
                'commission-returns': 'BellPost admin screen for category commissions across categories and subcategories',
                'ai-image-workflow': 'Image generation dashboard showing successful, active and failed jobs'}.get(slug, f'{d["title"]}: cover image')
    hero = figure(slug, hero_src, 'Hero', hero_alt, hero=True)
    hw = META.get(f'{slug}/hero-crop', {}).get('w', 9999)
    if hw < 1200: hero = hero.replace('<figure class="fig"', f'<figure class="fig" style="max-width:{hw}px;margin-inline:auto"', 1)
    cover = f'../assets/img/{slug}/card.webp'
    page = f'''<!DOCTYPE html>
<html lang="en" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(d["title"])} · Vansh Goel</title>
<meta name="description" content="{esc(d["summary"])}">
<meta name="theme-color" content="#0B3D2A">
<meta property="og:title" content="{esc(d["title"])} · Vansh Goel">
<meta property="og:description" content="{esc(d["summary"])}">
<meta property="og:type" content="article">
<meta property="og:url" content="https://vanshgoel.com/work/{slug}">
<meta property="og:image" content="https://vanshgoel.com/assets/og-{slug}.jpg">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="https://vanshgoel.com/work/{slug}">
<link rel="icon" href="../assets/favicon.svg" type="image/svg+xml">
<link rel="preload" href="../assets/fonts/barlow-condensed-latin-700-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="../assets/fonts/inter-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<script>try{{if(sessionStorage.getItem("vg-pt")&&!matchMedia("(prefers-reduced-motion: reduce)").matches)document.documentElement.classList.add("pt-enter");sessionStorage.removeItem("vg-pt")}}catch(e){{}}</script>
<link rel="stylesheet" href="../assets/site.css">
<link rel="stylesheet" href="../assets/case.css">
</head>
<body class="cs-page" style="--fc:{FC[color]}">
<a class="skip" href="#main">Skip to content</a>
{nav('../')}
<main id="main">
<div class="cs-head">
  <div class="wrap">
    <a class="back" href="../index.html#frames">← All work</a>
    <p class="kicker"><span class="ball" data-c="{color}" aria-hidden="true">{val}</span>{esc(kicker)}</p>
    <h1>{esc(d["title"])}</h1>
    <p class="lede">{inline(d["summary"])}</p>
    <dl class="facts">{facts}</dl>
  </div>
</div>
<div class="cs-hero"><div class="wrap">{hero}</div>
  <p class="read-meta"><span>{mins} min read</span><span>{len(d["sections"])} sections</span><span>Tap any image to enlarge</span></p>
</div>
<article class="cs">
{chr(10).join(secs)}
</article>
<nav class="next" aria-label="Next case study">{nxt}</nav>
</main>
<div class="toc-wrap">
  <nav class="toc" id="toc" aria-label="Sections"><ol>{''.join(toc)}</ol></nav>
  <button class="toc-btn" type="button" aria-expanded="false" aria-controls="toc"><span class="ball" data-c="{color}" aria-hidden="true">{val}</span><span class="cur">Contents</span></button>
</div>
<footer class="foot">
  <div class="wrap">
    <span>© 2026 Vansh Goel · Designed between frames.</span>
    <a href="../index.html#contact">Fancy a frame? Get in touch →</a>
  </div>
</footer>
<script src="../assets/site.js"></script>
</body>
</html>
'''
    os.makedirs(os.path.join(SITE, 'work'), exist_ok=True)
    open(os.path.join(SITE, 'work', f'{slug}.html'), 'w').write(page)
    print(slug, len(d['sections']), 'sections', mins, 'min')


for k in range(len(FRAMES)): build(k)
