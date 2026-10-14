import {test,expect,type Page} from '@playwright/test';
const inviter='00000000-0000-0000-0000-000000000001',newcomer='00000000-0000-0000-0000-000000000002';
async function login(page:Page,id:string){await page.addInitScript(id=>localStorage.setItem('sb-nczbfnuwqrqmeprjuqtt-auth-token',JSON.stringify({access_token:'test.payload.signature',refresh_token:'test',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user:{id,aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-10-13T12:00:00Z'}})),id);}
const invitation={player_id:newcomer,player_name:'Novo jogador',inviter_id:inviter,inviter_name:'Vini',status:'pending',requested_at:'2026-10-13T12:00:00Z',reviewed_by_name:null,reviewed_at:null};
test('signup requires a selected inviter and records it in registration',async({page})=>{
 let submitted=false;
 await page.route('**/*.supabase.co/**',async route=>{const resource=new URL(route.request().url()).pathname.split('/').pop();let body:unknown=[];
 if(resource==='signup_inviters')body=[{id:inviter,display_name:'Vini',position:'MEI'}];
 if(resource==='signup'){expect(route.request().postDataJSON().data).toEqual({display_name:'Novo jogador',invited_by:inviter});submitted=true;body={id:newcomer,email:'new@example.com',identities:[]};}
 await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});});
 await page.goto('/');await page.getByRole('button',{name:'Criar conta',exact:true}).click();
 await page.getByLabel('Nome na carta').fill('Novo jogador');await page.getByLabel('E-mail',{exact:true}).fill('new@example.com');await page.getByLabel('Senha',{exact:true}).fill('Test-password-123');
 await expect(page.getByRole('button',{name:'Criar minha conta'})).toBeDisabled();
 await page.getByLabel('Quem convidou você?').fill('Vini');await page.getByRole('combobox',{name:'Selecione quem convidou'}).selectOption(inviter);
 await page.getByRole('button',{name:'Criar minha conta'}).click();await expect.poll(()=>submitted).toBe(true);
});
test('pending account sees only the waiting screen until approved',async({page})=>{
 let approved=false;await login(page,newcomer);
 await page.route('**/*.supabase.co/**',async route=>{const resource=new URL(route.request().url()).pathname.split('/').pop();let body:unknown=[];
 if(resource==='profiles')body=[{id:newcomer,display_name:'Novo jogador',role:'player',position:'MEI',access_status:approved?'approved':'pending',invited_by:inviter}];
 if(resource==='registration_invitations')body=[{...invitation,status:approved?'approved':'pending'}];
 await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});});
 await page.goto('/');await expect(page.getByText('Só falta confirmar seu convite.')).toBeVisible();await expect(page.getByText('Você informou que foi convidado por Vini.')).toBeVisible();await expect(page.getByRole('button',{name:'Peladas',exact:true})).toHaveCount(0);
 approved=true;await page.getByRole('button',{name:'Verificar confirmação'}).click();await expect(page.getByRole('button',{name:'Peladas',exact:true})).toBeVisible();
});
test('inviter sees pending invitation and approves it',async({page})=>{
 let approved=false;await login(page,inviter);page.on('dialog',dialog=>dialog.accept());
 await page.route('**/*.supabase.co/**',async route=>{const resource=new URL(route.request().url()).pathname.split('/').pop();let body:unknown=[];
 if(resource==='profiles')body=[{id:inviter,display_name:'Vini',role:'player',position:'MEI',access_status:'approved'}];
 if(resource==='registration_invitations')body=[{...invitation,status:approved?'approved':'pending',reviewed_by_name:approved?'Vini':null,reviewed_at:approved?'2026-10-13T13:00:00Z':null}];
 if(resource==='review_registration'){expect(route.request().postDataJSON()).toEqual({p_player_id:newcomer,p_approve:true,p_expected_status:'pending'});approved=true;body=null;}
 await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});});
 await page.goto('/');await page.getByRole('button',{name:'Convites (1)',exact:true}).click();await expect(page.getByRole('heading',{name:'Meus convidados'})).toBeVisible();await page.getByRole('button',{name:'Confirmar convidado'}).click();await expect(page.getByText('Acesso liberado',{exact:true})).toBeVisible();await expect(page.getByText(/Confirmado por Vini/)).toBeVisible();expect(approved).toBe(true);
 await page.setViewportSize({width:390,height:844});await expect(page.locator('body')).toHaveJSProperty('scrollWidth',390);
});
