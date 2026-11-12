import {test,expect} from '@playwright/test';

test('team search, accent matching, capacity, duplicates, clear and persist draft',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const me='00000000-0000-0000-0000-000000000001';
 const profiles=['Vini','João','Pedro','GG','Renan','Cauan','Matheus','Convidado esperando'].map((display_name,i)=>({id:i===0?me:`player-${i}`,display_name,role:i===0?'admin':'player',position:'MEI',photo_path:null,photo_y:50}));
 await page.addInitScript(me=>localStorage.setItem('sb-nczbfnuwqrqmeprjuqtt-auth-token',JSON.stringify({access_token:'test.payload.signature',refresh_token:'test',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user:{id:me,aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{}}})),me);
 let teams:any[]=[],saved:any=null,revision:any=null;
 await page.route('**/*.supabase.co/**',async route=>{
  const resource=new URL(route.request().url()).pathname.split('/').pop();let body:unknown=[];
  if(resource==='profiles')body=profiles;
  if(resource==='sessions')body=[{id:'match',name:'Pelada',played_on:'2026-11-04',status:'open',created_by:me}];
  if(resource==='attendances')body=profiles.map((p,i)=>({player_id:p.id,session_id:'match',status:i===7?'waiting':'confirmed'}));
  if(resource==='manage_tournament'){const req=route.request().postDataJSON();expect(req.p_action).toBe('teams');saved=req.p_payload;teams=saved.teams;revision=1;}
  if(resource==='get_tournament'||resource==='manage_tournament')body={revision,teams,games:[],standings:[]};
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
 });
 await page.goto('/');await page.getByRole('button',{name:/^Campeonato/}).click();
 const first=page.getByRole('region',{name:'Montar time 1'}),second=page.getByRole('region',{name:'Montar time 2'});
 await first.getByLabel('Nome do time 1').fill('Amarelo');
 await first.getByRole('searchbox').fill('joao');
 await expect(first.getByRole('button',{name:'Adicionar João ao time 1',exact:true})).toBeVisible();
 await first.getByRole('searchbox').press('Enter');expect(saved).toBeNull();
 await first.getByRole('button',{name:'Adicionar João ao time 1',exact:true}).click();
 await expect(first.getByRole('searchbox')).toHaveValue('');
 await expect(second.getByRole('button',{name:'Adicionar João ao time 2',exact:true})).toBeDisabled();
 await expect(first.getByRole('button',{name:/Adicionar Convidado esperando/})).toHaveCount(0);
 for(const name of ['Vini','Pedro','GG','Renan','Cauan'])await first.getByRole('button',{name:`Adicionar ${name} ao time 1`,exact:true}).click();
 await expect(first.getByText('Jogadores · 6/6')).toBeVisible();await expect(first.getByRole('searchbox')).toBeDisabled();
 await first.getByRole('button',{name:'Remover João do time 1',exact:true}).click();
 await second.getByRole('button',{name:'Adicionar João ao time 2',exact:true}).click();
 await first.getByRole('button',{name:'Limpar time',exact:true}).click();
 await expect(first.getByText('Jogadores · 0/6')).toBeVisible();await expect(first.getByLabel('Nome do time 1')).toHaveValue('Amarelo');
 await first.getByRole('searchbox').fill('inexistente');await expect(first.getByText('Nenhum jogador encontrado.')).toBeVisible();
 await first.getByRole('searchbox').fill('pedro');await first.getByRole('button',{name:'Adicionar Pedro ao time 1',exact:true}).click();
 expect(saved).toBeNull();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.screenshot({path:'../../work/team-search-mobile.png',fullPage:true});
 await page.getByRole('button',{name:'Salvar times e tabela de jogos'}).click();
 await expect(page.getByRole('button',{name:'Corrigir jogadores dos times'})).toBeVisible();
 expect(saved.teams[0]).toMatchObject({name:'Amarelo',players:['player-2']});expect(saved.teams[1].players).toEqual(['player-1']);
 await page.getByRole('button',{name:'Corrigir jogadores dos times'}).click();await first.getByRole('button',{name:'Limpar time',exact:true}).click();
 await page.getByRole('button',{name:'Cancelar edição'}).click();
 await page.getByRole('button',{name:'Corrigir jogadores dos times'}).click();await expect(first.getByRole('button',{name:'Remover Pedro do time 1',exact:true})).toBeVisible();
 await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'../../work/team-search-desktop.png',fullPage:true});
});
