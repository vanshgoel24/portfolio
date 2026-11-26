import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = await b.new_page(viewport={'width':1200,'height':630}, device_scale_factor=1)
        await pg.emulate_media(reduced_motion='reduce')
        hide = "document.querySelectorAll('.balls-nav,.toc-wrap,.nav-cta,.nav-links,.menu-btn').forEach(e=>e.style.display='none');document.querySelectorAll('.rv').forEach(e=>e.classList.add('in'))"
        await pg.goto('http://127.0.0.1:8765/index.html', wait_until='networkidle'); await pg.evaluate(hide); await pg.wait_for_timeout(400)
        await pg.screenshot(path='/home/claude/site/assets/og.jpg', type='jpeg', quality=86)
        for slug in ['seller-payouts','commission-returns','ai-image-workflow','prepaud-onboarding']:
            await pg.goto(f'http://127.0.0.1:8765/work/{slug}.html', wait_until='networkidle'); await pg.evaluate(hide)
            await pg.evaluate("document.querySelector('.back').style.display='none';document.querySelector('.cs-head .lede').style.display='none';document.querySelector('.facts').style.display='none';document.querySelector('.nav').style.display='none';const h=document.querySelector('.cs-head');h.style.minHeight='630px';h.style.display='flex';h.style.alignItems='center';h.style.padding='0 80px';document.querySelector('.cs-head h1').style.fontSize='84px';document.querySelector('.cs-head h1').style.maxWidth='20ch';document.querySelector('.cs-head h1').style.fontSize='80px';document.querySelector('.cs-hero').style.display='none';document.querySelector('.cs').style.display='none'"); await pg.wait_for_timeout(300)
            await pg.screenshot(path=f'/home/claude/site/assets/og-{slug}.jpg', type='jpeg', quality=86)
        await b.close()
asyncio.run(main())
