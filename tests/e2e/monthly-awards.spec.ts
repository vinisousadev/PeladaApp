import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';

test('monthly awards export all categories, exact PNG sizes, selection and historical period',async({page})=>{
 test.setTimeout(120000);
 await page.setViewportSize({width:1280,height:1000});
 const me='00000000-0000-0000-0000-000000000001';
 await page.addInitScript(me=>localStorage.setItem('sb-nczbfnuwqrqmeprjuqtt-auth-token',JSON.stringify({access_token:'test.payload.signature',refresh_token:'test',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user:{id:me,aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{}}})),me);
 const profiles=['Vini','Matheus Henrique','Cauan'].map((display_name,i)=>({id:i===0?me:'p'+i,display_name,role:i===0?'admin':'player',position:'MEI',photo_path:null,photo_y:25,favorite_club_id:'819'}));
 await page.route('**/*.supabase.co/**',async route=>{const resource=new URL(route.request().url()).pathname.split('/').pop();let body:unknown=[];
 if(resource==='profiles')body=profiles;
 if(resource==='sessions')body=[{id:'game',name:'Última pelada',played_on:'2026-10-28',status:'closed',created_by:me}];
 if(resource==='performances')body=profiles.map((p,i)=>({id:'stats'+i,session_id:'game',player_id:p.id,goals:[9,6,4][i],assists:[2,5,8][i]}));
 await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});});
 await page.goto('/');await page.getByRole('button',{name:'Premiação',exact:true}).click();await page.getByLabel('Mês do ranking').fill('2026-10');
 await expect(page.locator('.award-heading')).toContainText('setembro + outubro de 2026');
 await expect(page.locator('.award-place-1 .award-podium-base p')).toHaveText('Vini');
 for(const format of ['Feed quadrado · 1:1','Story · 9:16','Feed · 4:5']){
 await page.getByRole('button',{name:format,exact:true}).click();
 for(const category of ['Geral','Gols','Assistências','Jogador do mês']){
 await page.getByRole('button',{name:category,exact:true}).click();
 if(category==='Assistências')await expect(page.locator('.award-place-1 .award-podium-base p')).toHaveText('Cauan');
 if(category==='Jogador do mês'){await page.getByLabel('Jogador do mês nesta arte').selectOption('p1');await expect(page.locator('.award-player-summary')).toContainText('Matheus Henrique');}
 const geometry=await page.locator('.award-poster').evaluate(el=>{const header=el.querySelector('.award-heading')!.getBoundingClientRect(),footer=el.querySelector('.award-footer')!.getBoundingClientRect(),main=el.querySelector('.award-main')!.getBoundingClientRect();const cards=[...el.querySelectorAll('.football-card')].map(c=>c.getBoundingClientRect());return{header:header.bottom,footer:footer.top,main:main.bottom,cards:cards.map(c=>({top:c.top,bottom:c.bottom,left:c.left,right:c.right})),bounds:el.getBoundingClientRect().toJSON()};});
 for(const c of geometry.cards){expect(c.top).toBeGreaterThan(geometry.header);expect(c.bottom).toBeLessThan(geometry.footer);expect(c.left).toBeGreaterThanOrEqual(geometry.bounds.left);expect(c.right).toBeLessThanOrEqual(geometry.bounds.right);}
 if(category==='Jogador do mês') { const summary=await page.locator('.award-player-summary').evaluate(el=>({name:el.querySelector('strong')!.getBoundingClientRect().toJSON(),rank:el.querySelector('span')!.getBoundingClientRect().toJSON()})); expect(summary.rank.top).toBeGreaterThanOrEqual(summary.name.bottom); }
 const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'Baixar arte em HD'}).click();const file=await downloaded;
 const path=`../../work/awards-${category.replaceAll(' ','-')}-${format.includes('1:1')?'square':format.startsWith('Story')?'story':'feed'}.png`;await file.saveAs(path);
 const png=readFileSync(path);expect(png.readUInt32BE(16)).toBe(1080);expect(png.readUInt32BE(20)).toBe(format.includes('1:1')?1080:format.startsWith('Story')?1920:1350);
 await expect(page.getByRole('link',{name:'Salvar imagem gerada'})).toBeVisible();
 }
 }
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Geral',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.getByLabel('Mês do ranking').fill('2026-11');await expect(page.getByRole('button',{name:'Baixar arte em HD'})).toBeDisabled();await expect(page.locator('.award-heading')).toContainText('novembro de 2026');
});
