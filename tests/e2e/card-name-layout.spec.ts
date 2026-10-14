import {test,expect} from '@playwright/test';
for(const width of [1280,390])test(`card names keep equal height at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto('/');await page.getByRole('button',{name:'Explorar demonstração'}).click();await page.getByRole('button',{name:/^Elenco/}).click();
 const card=page.locator('.roster-grid .football-card').first();await expect(card).toBeVisible();await page.evaluate(()=>document.fonts.ready);
 // Change only the name to isolate layout from differences in cards and tiers.
 const measure=async()=>card.evaluate(el=>{const box=el.getBoundingClientRect(),stats=el.querySelector('.card-stats')!.getBoundingClientRect(),name=el.querySelector('h3')!.getBoundingClientRect();return {height:box.height,stats:stats.top-box.top,nameHeight:name.height};});
 await card.locator('.card-identity h3>span').evaluate(el=>el.textContent='VINI');const short=await measure();
 await card.locator('.card-identity h3>span').evaluate(el=>el.textContent='MATHEUS HENRIQUE');const long=await measure();expect(long.height).toBeCloseTo(short.height,1);expect(long.stats).toBeCloseTo(short.stats,1);
 const text=await card.locator('.card-identity h3>span').evaluate(el=>({height:el.getBoundingClientRect().height,line:parseFloat(getComputedStyle(el).lineHeight)}));expect(text.height).toBeGreaterThan(text.line*1.5);
 await page.screenshot({path:`../../work/card-name-${width}.png`,fullPage:false});
 await card.locator('.card-identity h3>span').evaluate(el=>el.textContent='NOMEMUITOCOMPRIDOSEMNENHUMESPACO');expect((await measure()).height).toBeCloseTo(short.height,1);
});
