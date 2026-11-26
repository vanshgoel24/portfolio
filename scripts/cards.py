import sys
from PIL import Image
c = 'content'
jobs = {
 'seller-payouts': (c+'/01-seller-payouts/images/00-hero-payout-dashboard.webp', (0.44,0.04,1.0,0.66)),
 'commission-returns': (c+'/02-commission-returns/images/00-hero-commission-dashboard.webp', (0.44,0.04,1.0,0.66)),
 'ai-image-workflow': (c+'/03-ai-image-workflow/images/02-dashboard.png', (0.04,0.07,0.62,0.63)),
 'prepaud-onboarding': (c+'/04-prepaud-onboarding/images/00-hero.webp', (0.16,0.36,0.84,1.0)),
}
for slug,(f,(a,b,cc,d)) in jobs.items():
    im = Image.open(f).convert('RGB'); W,H = im.size
    cr = im.crop((int(a*W),int(b*H),int(cc*W),int(d*H)))
    # force 16:10
    w,h = cr.size; tw = w; th = int(w*10/16)
    if th > h: th = h; tw = int(h*16/10)
    l = (w-tw)//2; t = 0
    cr = cr.crop((l,t,l+tw,t+th)).resize((960,600), Image.LANCZOS)
    cr.save(f'assets/img/{slug}/card.webp','WEBP',quality=82,method=6)
    cr.save(f'/home/claude/preview/card-{slug}.jpg',quality=70)
