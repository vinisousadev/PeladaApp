import {test,expect} from '@playwright/test';

test('correct a finished tournament roster and retain results with an absent player removed from attendance',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const me='00000000-0000-0000-0000-000000000001';
 const profiles=[{id:me,display_name:'Vini',role:'admin',position:'MEI'},{id:'gg',display_name:'GG',role:'player',position:'DEF'},{id:'sub',display_name:'Substituto',role:'player',position:'DEF'}];
 const teams=[1,2,3,4].map(slot=>({slot,name:'Time '+slot,players:slot===1?['gg']:[]}));
 const games=[{number:9,stage:'final',home:1,away:3,home_score:2,away_score:0,winner:1,finished:true}];
 let saved:any=null,revision=5;
 await page.addInitScript(me=>localStorage.setItem('sb-nczbfnuwqrqmeprjuqtt-auth-token',JSON.stringify({access_token:'test.payload.signature',refresh_token:'test',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user:{id:me,aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{}}})),me);
 await page.route('**/*.supabase.co/**',async route=>{
  const resource=new URL(route.request().url()).pathname.split('/').pop();let body:unknown=[];
  if(resource==='profiles')body=profiles;
  if(resource==='sessions')body=[{id:'match',name:'Pelada anterior',played_on:'2026-11-11',starts_at:'2026-11-11T22:30:00Z',status:'closed',created_by:me}];
  if(resource==='attendances')body=[{session_id:'match',player_id:'sub',status:'confirmed'}];
  if(resource==='manage_tournament'){saved=route.request().postDataJSON();expect(saved.p_action).toBe('correct_rosters');teams[0].players=saved.p_payload.teams[0].players;revision++;}
  if(resource==='get_tournament'||resource==='manage_tournament')body={revision,teams,games,standings:[],participants:[{game_number:9,player_id:teams[0].players[0],team_slot:1}],positions:[{player_id:'sub',position:'DEF'}]};
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
 });
 await page.goto('/');await page.getByRole('button',{name:'Campeonato',exact:true}).click();
 await page.getByRole('button',{name:'Corrigir jogadores dos times'}).click();
 const first=page.getByRole('region',{name:'Montar time 1'});
 await expect(first.getByLabel('Nome do time 1')).toHaveAttribute('readonly','');
 await first.getByRole('button',{name:'Remover GG do time 1',exact:true}).click();
 await first.getByRole('searchbox').fill('sub');await first.getByRole('button',{name:'Adicionar Substituto ao time 1',exact:true}).click();
 await page.getByRole('button',{name:'Salvar correção dos times'}).click();
 await expect(page.getByRole('button',{name:'Corrigir jogadores dos times'})).toBeVisible();
 expect(saved.p_payload.teams[0].players).toEqual(['sub']);expect(saved.p_revision).toBe(5);
 const final=page.getByRole('article',{name:'Jogo 9',exact:true});await expect(final).toContainText('FINALIZADO');
 await expect(final.getByRole('spinbutton').first()).toHaveValue('2');
 await final.getByText('Quem jogou · 1 confirmados',{exact:false}).click();
 await expect(final.getByRole('checkbox',{name:/Substituto · DEF/})).toBeChecked();
 await expect(final.getByRole('checkbox',{name:/GG/})).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
