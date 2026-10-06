import {expect,test} from '@playwright/test';

test('mandatory review modal saves attack and defense independently, resumes, and survives a failed save',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const me='00000000-0000-0000-0000-000000000001';
 const profiles=[{id:me,display_name:'Teste',position:'MEI',role:'player',membership:'monthly',photo_path:null,photo_y:50},
 {id:'b',display_name:'Bruno',position:'ATA',role:'player',photo_path:null,photo_y:50},
 {id:'c',display_name:'Carlos',position:'DEF',role:'player',photo_path:null,photo_y:50}];
 const saved:Record<string,unknown>[]=[];let fail=true;
 await page.addInitScript(({me})=>localStorage.setItem('sb-nczbfnuwqrqmeprjuqtt-auth-token',JSON.stringify({access_token:'test.payload.signature',refresh_token:'test',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user:{id:me,email:'test@example.com',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-10-06T12:00:00Z'}})),{me});
 await page.route('**/*.supabase.co/**',async route=>{
  const url=new URL(route.request().url());const resource=url.pathname.split('/').pop();
  let body:unknown=[];
  if(resource==='profiles')body=profiles;
  if(resource==='pending_player_reviews')body=saved.length<2?[{session_id:'match',name:'Pelada de teste',played_on:'2026-10-06',help_requested:false,total:2,targets:profiles.slice(1).filter(p=>!saved.some(s=>s.p_player_id===p.id)).map(p=>({id:p.id,name:p.display_name}))}]:[];
  if(resource==='submit_player_review'){
   if(fail){fail=false;await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Falha de conexão para teste'})});return;}
   saved.push(route.request().postDataJSON());body=null;
  }
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
 });
 await page.goto('/');
 const modal=page.getByRole('dialog',{name:'Avaliação da pelada'});
 await expect(modal).toBeVisible();await expect(modal.getByRole('heading',{name:'Bruno'})).toBeVisible();
 await page.keyboard.press('Escape');await expect(modal).toBeVisible();
 await page.mouse.click(2,2);await expect(modal).toBeVisible();
 const save=modal.getByRole('button',{name:'Salvar e continuar'});
 await expect(save).toBeDisabled();
 await modal.getByRole('radio',{name:'4 estrelas em ataque',exact:true}).check();await expect(save).toBeDisabled();
 await modal.getByRole('group',{name:'Defesa',exact:true}).getByText('Não consegui avaliar').click();
 await save.click();await expect(modal.getByRole('alert')).toContainText('Falha de conexão');
 await expect(modal.getByRole('heading',{name:'Bruno'})).toBeVisible();await save.click();
 await expect(modal.getByRole('heading',{name:'Carlos'})).toBeVisible();
 expect(saved[0]).toMatchObject({p_attack:4,p_defense:null,p_player_id:'b'});
 await page.reload();await expect(modal.getByRole('heading',{name:'Carlos'})).toBeVisible();
 await expect(modal).toContainText('1 de 2 jogadores avaliados');
 await modal.getByRole('group',{name:'Ataque',exact:true}).getByText('Não consegui avaliar').click();
 await modal.getByRole('radio',{name:'5 estrelas em defesa',exact:true}).check();
 await page.screenshot({path:'test-results/player-review-mobile.png'});
 await modal.getByRole('button',{name:'Concluir avaliação'}).click();await expect(modal).not.toBeVisible();
 expect(saved[1]).toMatchObject({p_attack:null,p_defense:5,p_player_id:'c'});
});
