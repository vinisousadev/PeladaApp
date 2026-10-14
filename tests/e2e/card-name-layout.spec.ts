import {test,expect} from '@playwright/test';
for(const width of [1280,390])test(`abbreviated card names stay aligned at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});
 const me='00000000-0000-0000-0000-000000000001';
 await page.addInitScript(me=>localStorage.setItem('sb-nczbfnuwqrqmeprjuqtt-auth-token',JSON.stringify({access_token:'test.payload.signature',refresh_token:'test',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user:{id:me,aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{}}})),me);
 await page.route('**/*.supabase.co/**',async route=>{let body:unknown=[];if(new URL(route.request().url()).pathname.endsWith('/profiles'))body=['Vini','Matheus Henrique','NomeExtremamenteCompridoSemEspacos'].map((display_name,i)=>({id:i===0?me:'player-'+i,display_name,position:'MEI',role:'player',photo_path:null,photo_y:25,favorite_club_id:'819'}));await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});});
 await page.goto('/');await page.getByRole('button',{name:/^Elenco/}).click();await page.evaluate(()=>document.fonts.ready);
 const cards=page.locator('.roster-grid .football-card');await expect(cards).toHaveCount(3);await expect(cards.locator('.card-club-crest')).toHaveCount(3);
 const matheus=cards.filter({has:page.locator('h3[title="Matheus Henrique"]')});await expect(matheus.locator('h3')).toHaveText('Matheus H.');
 const sizes=await cards.evaluateAll(els=>els.map(el=>{const box=el.getBoundingClientRect(),stats=el.querySelector('.card-stats')!.getBoundingClientRect(),name=el.querySelector('h3')!.getBoundingClientRect(),crest=el.querySelector('.card-club-crest')?.getBoundingClientRect();return{height:box.height,stats:stats.top-box.top,nameHeight:name.height,line:parseFloat(getComputedStyle(el.querySelector('h3')!).lineHeight),nameTop:name.top,crestBottom:crest?.bottom};}));
 for(const size of sizes){expect(size.height).toBeCloseTo(sizes[0].height,1);expect(size.stats).toBeCloseTo(sizes[0].stats,1);expect(size.nameHeight).toBeCloseTo(size.line,1);if(size.crestBottom)expect(size.nameTop).toBeGreaterThanOrEqual(size.crestBottom);}
 await matheus.scrollIntoViewIfNeeded();await page.screenshot({path:`../../work/card-abbreviation-${width}.png`});
});
