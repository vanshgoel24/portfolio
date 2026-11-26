import sys, os, glob, json
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
slugs = {'01-seller-payouts':'seller-payouts','02-commission-returns':'commission-returns','03-ai-image-workflow':'ai-image-workflow','04-prepaud-onboarding':'prepaud-onboarding'}
meta = {}
for folder, slug in slugs.items():
    od = os.path.join(out, slug); os.makedirs(od, exist_ok=True)
    for f in sorted(glob.glob(os.path.join(src, folder, 'images', '*'))):
        name = os.path.splitext(os.path.basename(f))[0]
        im = Image.open(f).convert('RGB')
        tall = im.height / im.width > 1.6
        sizes = {}
        for w in ([700, 1200] if tall else [800, 1600]):
            w2 = min(w, im.width)
            h2 = round(im.height * w2 / im.width)
            p = os.path.join(od, f'{name}-{w}.webp')
            im.resize((w2, h2), Image.LANCZOS).save(p, 'WEBP', quality=82, method=6)
            sizes[w] = (w2, h2)
        meta[f'{slug}/{name}'] = {'w': im.width, 'h': im.height, 'tall': tall, 'sizes': list(sizes)}
json.dump(meta, open(os.path.join(out, 'meta.json'), 'w'), indent=1)
print(len(meta), 'images')
