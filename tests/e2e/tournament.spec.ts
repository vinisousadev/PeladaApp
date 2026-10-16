import {test,expect} from '@playwright/test';

for(const role of ['admin','player'])test(`tournament ${role}: mobile controls, clock persistence and shared results`,async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const me='00000000-0000-0000-0000-000000000001';
 const teams=['Amarelo','Branco','Laranja','Azul'].map((name,i)=>({slot:i+1,name,players:[]}));
 const games=[[1,2],[3,4],[1,3],[2,4],[1,4],[2,3]].map(([home,away],i)=>({number:i+1,stage:'group',home,away,home_score:0,away_score:0,finished:false,winner:null as number|null,remaining_seconds:480,timer_started_at:null as string|null}));
 let revision=1;
 const standings=teams.map(t=>({...t,played:0,wins:0,draws:0,losses:0,gf:0,ga:0,points:0}));
 const requests:{p_action:string;p_payload:Record<string,any>}[]=[];
 await page.addInitScript(me=>localStorage.setItem('sb-nczbfnuwqrqmeprjuqtt-auth-token',JSON.stringify({access_token:'test.payload.signature',refresh_token:'test',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user:{id:me,aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{}}})),me);
 await page.route('**/*.supabase.co/**',async route=>{
 const resource=new URL(route.request().url()).pathname.split('/').pop();let body:unknown=[];
 if(resource==='profiles')body=[{id:me,display_name:'Vini',position:'MEI',role,photo_path:null,photo_y:50}];
 if(resource==='sessions')body=[{id:'match',name:'Pelada de quinta',played_on:'2026-10-16',status:'open',created_by:me}];
 if(resource==='manage_tournament'){
 const request=route.request().postDataJSON();requests.push(request);revision++;
 if(request.p_action==='start')games[0].timer_started_at=new Date(Date.now()-61000).toISOString();
 if(request.p_action==='pause'){games[0].remaining_seconds=418;games[0].timer_started_at=null;}
 if(request.p_action==='score'){games[0].home_score=request.p_payload.home_score;games[0].away_score=request.p_payload.away_score;}
 }
 if(resource==='get_tournament'||resource==='manage_tournament')body={revision,teams,games,standings,server_time:new Date().toISOString()};
 await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
 });
 await page.goto('/');await page.getByRole('button',{name:/^Campeonato/}).click();
 await expect(page.getByRole('heading',{name:'Campeonato da pelada'})).toBeVisible();
 await expect(page.locator('.tournament-game')).toHaveCount(6);
 const first=page.getByRole('article',{name:'Jogo 1',exact:true});
 if(role==='admin'){
 await first.getByRole('button',{name:'Iniciar',exact:true}).click();await expect(first.locator('time')).toHaveText(/06:5[0-9]/);
 await page.reload();await page.getByRole('button',{name:/^Campeonato/}).click();await expect(first.locator('time')).toHaveText(/06:5[0-9]/);
 await first.getByRole('button',{name:'Pausar'}).click();await expect(first.locator('time')).toHaveText('06:58');
 await first.getByRole('spinbutton',{name:/Gols de Amarelo/}).fill('2');await first.getByRole('button',{name:'Salvar placar'}).click();
 expect(requests.at(-1)).toMatchObject({p_action:'score',p_payload:{number:1,home_score:2,away_score:0}});
 await expect(page.getByRole('button',{name:/Gerar semifinais/})).toBeDisabled();
 }else{await expect(first.getByRole('button',{name:'Iniciar',exact:true})).toHaveCount(0);await expect(first.getByRole('spinbutton').first()).toBeDisabled();}
 // Another administrator finishes a game; all viewers receive the new table via the lightweight poll.
 games[0].finished=true;games[0].home_score=2;games[0].winner=1;revision++;
 Object.assign(standings[0],{played:1,wins:1,gf:2,points:3});Object.assign(standings[1],{played:1,losses:1,ga:2});
 await expect(first).toContainText('FINALIZADO',{timeout:9000});
 await expect(page.locator('.tournament-table tbody tr').first().locator('td strong')).toHaveText('3');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.screenshot({path:`../../work/tournament-${role}-mobile.png`,fullPage:true});
 if(role==='admin'){await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'../../work/tournament-desktop.png',fullPage:true});}
});

test('second semifinal requires a penalty winner before finishing a draw',async({page})=>{
 const me='00000000-0000-0000-0000-000000000001';let sent:any=null;
 await page.addInitScript(me=>localStorage.setItem('sb-nczbfnuwqrqmeprjuqtt-auth-token',JSON.stringify({access_token:'test.payload.signature',refresh_token:'test',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user:{id:me,aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{}}})),me);
 const snapshot={revision:2,server_time:new Date().toISOString(),teams:[1,2,3,4].map(slot=>({slot,name:'Time '+slot,players:[]})),standings:[],games:[{number:8,stage:'semi',home:3,away:2,home_score:0,away_score:0,finished:false,winner:null,remaining_seconds:480,timer_started_at:null}]};
 await page.route('**/*.supabase.co/**',async route=>{const resource=new URL(route.request().url()).pathname.split('/').pop();let body:unknown=[];if(resource==='profiles')body=[{id:me,display_name:'Vini',role:'admin',position:'MEI',photo_path:null,photo_y:50}];if(resource==='sessions')body=[{id:'match',name:'Pelada',played_on:'2026-10-16',status:'open',created_by:me}];if(resource==='get_tournament'||resource==='manage_tournament')body=snapshot;if(resource==='manage_tournament')sent=route.request().postDataJSON();await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});});
 await page.goto('/');await page.getByRole('button',{name:/^Campeonato/}).click();
 const game=page.getByRole('article',{name:'Jogo 8'});await expect(game.getByRole('button',{name:'Finalizar jogo'})).toBeDisabled();
 await game.getByLabel(/quem venceu nos pênaltis/).selectOption('2');await game.getByRole('button',{name:'Finalizar jogo'}).click();
 expect(sent).toMatchObject({p_action:'finish',p_payload:{number:8,home_score:0,away_score:0,winner:2}});
});
