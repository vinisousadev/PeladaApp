import {test,expect} from '@playwright/test';
for(const count of [0,1,24])test(`close test match with ${count} participants without creating reviews`,async({page})=>{
 const me='00000000-0000-0000-0000-000000000001';let closed=false,reviews=0;
 await page.addInitScript(({me})=>localStorage.setItem('sb-nczbfnuwqrqmeprjuqtt-auth-token',JSON.stringify({access_token:'test.payload.signature',refresh_token:'test',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user:{id:me,aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-10-06T12:00:00Z'}})),{me});
 await page.route('**/*.supabase.co/**',async route=>{
 const url=new URL(route.request().url()),resource=url.pathname.split('/').pop();let body:unknown=[];
 if(resource==='profiles')body=[{id:me,display_name:'Admin',role:'admin',position:'MEI',photo_path:null,photo_y:50}];
 if(resource==='sessions'){if(route.request().method()==='PATCH'){expect(route.request().postDataJSON()).toEqual({status:'closed'});closed=true;}body=[{id:'one',name:'Teste vazio',played_on:new Date().toISOString().slice(0,10),starts_at:new Date(Date.now()-3600000).toISOString(),status:closed?'closed':'open',created_by:me}];}
 if(resource==='attendances')body=Array.from({length:count},(_,i)=>({session_id:'one',player_id:i===0?me:'player-'+i,status:'confirmed'}));
 if(resource==='review_rounds')body=null;
 if(resource?.includes('review'))reviews++;
 await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
 });
 await page.goto('/');await page.getByRole('button',{name:'Administração',exact:true}).click();
 await page.getByRole('button',{name:'Encerrar registros',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'Conferir quem jogou'})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Avaliações',exact:true})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Reabrir registros',exact:true})).toBeVisible();expect(closed).toBe(true);expect(reviews).toBe(0);
});
