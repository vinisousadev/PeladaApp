import {test,expect} from '@playwright/test';

test('administrator inspects voters, corrects a vote and generates an averages list',async({page})=>{
 let corrected=false;
 const me='00000000-0000-0000-0000-000000000001';
 await page.addInitScript(({me})=>localStorage.setItem('sb-nczbfnuwqrqmeprjuqtt-auth-token',JSON.stringify({access_token:'test.payload.signature',refresh_token:'test',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user:{id:me,aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-10-06T12:00:00Z'}})),{me});
 await page.route('**/*.supabase.co/**',async route=>{
  const url=new URL(route.request().url());const resource=url.pathname.split('/').pop();let body:unknown=[];
  if(resource==='profiles')body=[{id:me,display_name:'Admin',role:'admin',position:'MEI',photo_path:null,photo_y:50},{id:'b',display_name:'Bruno',role:'player',position:'ATA',photo_path:null,photo_y:50}];
  if(resource==='sessions')body=[{id:'one',name:'Quinta',played_on:'2026-10-01',status:'closed',created_by:me},{id:'two',name:'Anterior',played_on:'2026-09-30',status:'closed',created_by:me}];
  if(resource==='review_rounds')body=url.searchParams.get('session_id')==='eq.one'?{closed_at:null}:null;
  if(resource==='admin_player_review_results')body=route.request().postDataJSON().p_session_id==='one'?[{player_id:'b',attack:corrected?3:4,attack_count:2,defense:5,defense_count:1,overall:corrected?3.67:4.33,attack_notes:[3,5],defense_notes:[5]}]:[];
  if(resource==='admin_review_votes')body=[{reviewer_id:me,reviewer_name:'Admin',attack:corrected?3:5,defense:5,updated_at:'2026-10-06T12:00:00Z'}];
  if(resource==='admin_correct_review'){expect(route.request().postDataJSON()).toMatchObject({p_attack:3,p_defense:5,p_reason:'Nota registrada incorretamente',p_reviewer_id:me,p_player_id:'b'});corrected=true;body=null;}
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
 });
 await page.goto('/');await page.getByRole('button',{name:'Administração',exact:true}).click();
 await page.getByRole('button',{name:'Avaliações',exact:true}).click();
 const panel=page.getByRole('region',{name:'Painel de avaliações'});
 await expect(panel).toContainText('Resultado parcial');
 const row=panel.getByRole('row').filter({hasText:'Bruno'});
 await expect(row).toContainText('4,00');await expect(row).toContainText('5,00');await expect(row).toContainText('4,33');
 await row.getByText('Ver notas recebidas').click();await expect(row).toContainText('Ataque: 3 · 5');
 await panel.getByRole('button',{name:'Gerar lista de médias'}).click();
 const list=page.getByRole('dialog',{name:'Lista de médias'});await expect(list.getByLabel('Texto da lista de médias')).toHaveValue(/Bruno[\s\S]*Geral: 4,33/);await list.getByRole('button',{name:'Fechar',exact:true}).click();
 await row.getByRole('button',{name:'Ver autores e corrigir'}).click();
 const votes=page.getByRole('region',{name:'Votos de Bruno'});await expect(votes).toContainText('Admin');await votes.getByRole('button',{name:'Corrigir',exact:true}).click();await votes.getByRole('combobox',{name:'Ataque',exact:true}).selectOption('3');await votes.getByLabel('Motivo da correção').fill('Nota registrada incorretamente');await votes.getByRole('button',{name:'Salvar correção'}).click();await expect(row).toContainText('3,67');expect(corrected).toBe(true);
 await panel.getByLabel('Pelada avaliada').selectOption('two');await expect(panel).toContainText('ainda não foi aberta');await expect(panel.getByRole('table')).toHaveCount(0);
});
