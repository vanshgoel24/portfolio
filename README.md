# vanshgoel.com

Static site. No framework and no build step needed to deploy.

## Deploy
1. Push this folder to a GitHub repo (e.g. `vanshgoel24/portfolio`).
2. In Vercel: **Add New → Project →** import the repo. Framework preset: **Other**. Leave build command empty, output directory = root.
3. Add the domain `vanshgoel.com` in Vercel → Project → Settings → Domains.

`vercel.json` turns on clean URLs (`/work/seller-payouts`). `.vercelignore` keeps `content/` and `scripts/` out of the deployed site.

## What's where
```
index.html                    home
work/*.html                   the four case studies (generated, see below)
assets/site.css, case.css     styles
assets/site.js                nav, reveal, toasts, chalk cube, page transition,
                              section balls, player card tilt, case-study progress + lightbox
assets/table.js               the playable snooker table (rules, referee, sounds)
assets/fonts/                 Barlow Condensed + Inter (SIL Open Font License)
assets/img/<slug>/            optimised WebP images, card.webp, hero-crop-*.webp
assets/og*.jpg                link-preview images for LinkedIn / X / WhatsApp
content/                      source text + original images for each case study (edit here)
scripts/                      build helpers (Python 3 + Pillow)
```

## Settings (top of `assets/site.js`)
- `RESUME_URL`: your Google Drive resume link. Keep the file shared as "Anyone with the link".
- `EMAIL`: vanshgoel24@gmail.com

## Your photo
Save a portrait as `assets/img/vansh.jpg` (4:5, ~1200px tall). It replaces the illustration on the player card automatically.

## Editing a case study
1. Edit `content/<NN-frame>/content.md`.
2. New or changed images: `python3 scripts/images.py content assets/img`
3. Rebuild the pages: `python3 scripts/build.py .`
4. (Optional) refresh link-preview images with a local server running on port 8765: `python3 scripts/og.py` (needs Playwright + Chrome).

Markdown the builder understands: `## NN. Title` sections, `### N. Title` (gets a Decision/Rule/Step chip), tables, `> **How might we** ...` callout, `> **"quote"**` pull quote, `- **107%** label` lists inside Impact/Results sections become number tiles, a bare YouTube link becomes a video card. Lines with 📷 are skipped until the image exists (see `content/todo.md`).

## Home page copy
Edit `index.html` directly: hero, "At a glance" stats, project cards, player profile, cue rack, approach, contact.
