import {test,expect} from '@playwright/test';

test('admin promotes a waiting guest after kickoff, fills vacancy and cannot exceed capacity',async({page})=>{
 const me='00000000-0000-0000-0000-000000000001';
 const profiles=Array.from({length:25},(_,i)=>({id:i===0?me:`p-${i}`,display_name:`Jogador ${i}`,role:i===0?'admin':'player',membership:'guest',position:'MEI',photo_path:null,photo_y:50}));
 const attendances=profiles.map((p,i)=>({session_id:'match',player_id:p.id,status:i<23?'confirmed':'waiting',queue_order:i}));let sent:any=null;
 await page.addInitScript(me=>localStorage.setItem('sb-nczbfnuwqrqmeprjuqtt-auth-token',JSON.stringify({access_token:'test.payload.signature',refresh_token:'test',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user:{id:me,aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{}}})),me);
 await page.route('**/*.supabase.co/**',async route=>{
  const resource=new URL(route.request().url()).pathname.split('/').pop();let body:unknown=[];
  if(resource==='profiles')body=profiles;
  if(resource==='sessions')body=[{id:'match',name:'Pelada anterior',played_on:'2026-11-11',starts_at:'2026-11-11T22:30:00Z',status:'open',created_by:me}];
  if(resource==='attendances')body=attendances;
  if(resource==='manage_waitlist'){sent=route.request().postDataJSON();attendances.find(a=>a.player_id===sent.p_player_id)!.status='confirmed';body=null;}
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
 });
 await page.goto('/');await page.getByRole('button',{name:'Peladas',exact:true}).click();
 await page.getByRole('button',{name:/Ver peladas anteriores/}).click();
 const promote=page.getByRole('button',{name:'Mover para confirmados'});
 await expect(promote).toHaveCount(2);await expect(promote.first()).toBeEnabled();
 await promote.first().click();
 await expect(promote).toHaveCount(1);await expect(promote).toBeDisabled();
 expect(sent).toMatchObject({p_session_id:'match',p_player_id:'p-23',p_action:'promote'});
 await expect(page.getByText('24/24 confirmados',{exact:false})).toBeVisible();
});
