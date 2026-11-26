# Vansh Goel — Portfolio Content Pack

Everything for vanshgoel.com in one place: copy, case studies and images, organised so the website can be built (or rebuilt) from it.

Source of truth for the text: Notion page **"portoflio content"** (copied 26 Nov 2026).
Images: from the three zips you shared (`img.zip`, `prepaud.zip`, `Content_Gen.zip`), renamed by case study and section.

## Folder structure

```
vansh-portfolio-content/
├── README.md                  ← you are here
├── site-plan.md               ← pages, sections, design system, image map
├── todo.md                    ← what's still missing (placeholders to fill)
├── 00-home/
│   └── home.md                ← home page copy (hero, about, off the table, contact)
├── 01-seller-payouts/
│   ├── content.md             ← full case study, image slots in order
│   └── images/                ← 00-hero … 08-final-design (original files)
├── 02-commission-returns/
│   ├── content.md
│   └── images/                ← 00-hero … 07-future-scope
├── 03-ai-image-workflow/
│   ├── content.md
│   └── images/                ← 00-cover … 08-publish-bells
└── 04-prepaud-onboarding/
    ├── content.md
    └── images/                ← 00-hero … 06-user-info-screens
```

## Naming rules (keep using these)

- **Folders:** `NN-case-study-name` — the number is the frame order on the site.
- **Images:** `NN-what-it-shows.ext` — the number is the order it appears on the page. `00` is always the hero/cover, which is also used on the home page card.
- **Adding an image:** give it the next free number, or slot it between with a letter (e.g. `04b-pay-now-screen.webp`), and add its line to `content.md` where it should appear.
- These are the **original** files. The website uses compressed copies (max 1600px wide, WebP) generated from these at build time.

## How the pieces connect

- `content.md` in each folder = exactly what's on that case study page, in order. Lines like `![…](images/…)` show where each image sits. Lines starting with 📷 are images you still need to export.
- Edit text here or in Notion, then ask Claude to update the site from it.

## Getting it live (Vercel)

1. Finish content on the design canvas (or in these files).
2. Claude converts the canvas to a static site and pushes it to GitHub (`vanshgoel24/portfolio`).
3. In Vercel: Add New → Project → import `portfolio` → Deploy.
4. Vercel project → Settings → Domains → add `vanshgoel.com`, then add the DNS records it shows at your domain registrar.
