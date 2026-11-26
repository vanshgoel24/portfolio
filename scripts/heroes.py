import json
from PIL import Image
c = 'content'
jobs = {
 'seller-payouts': (c+'/01-seller-payouts/images/00-hero-payout-dashboard.webp', (0.44,0.04,1.0,0.66)),
 'commission-returns': (c+'/02-commission-returns/images/00-hero-commission-dashboard.webp', (0.44,0.04,1.0,0.66)),
 'ai-image-workflow': (c+'/03-ai-image-workflow/images/02-dashboard.png', (0,0,1,1)),
}
meta = json.load(open('assets/img/meta.json'))
for slug,(f,(a,b,cc,d)) in jobs.items():
    im = Image.open(f).convert('RGB'); W,H = im.size
    cr = im.crop((int(a*W),int(b*H),int(cc*W),int(d*H)))
    w,h = cr.size
    for tw in (800,1600):
        t = min(tw,w); cr.resize((t, round(h*t/w)), Image.LANCZOS).save(f'assets/img/{slug}/hero-crop-{tw}.webp','WEBP',quality=86,method=6)
    meta[f'{slug}/hero-crop'] = {'w': w, 'h': h, 'tall': False, 'sizes': [800,1600]}
    print(slug, w, h)
json.dump(meta, open('assets/img/meta.json','w'), indent=1)
