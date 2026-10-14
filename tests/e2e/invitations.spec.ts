import {test,expect,type Page} from '@playwright/test';
const inviter='00000000-0000-0000-0000-000000000001',newcomer='00000000-0000-0000-0000-000000000002';
async function login(page:Page,id:string){await page.addInitScript(id=>localStorage.setItem('sb-nczbfnuwqrqmeprjuqtt-auth-token',JSON.stringify({access_token:'test.payload.signature',refresh_token:'test',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user:{id,aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-10-13T12:00:00Z'}})),id);}
async function framePhoto(page:Page){
 await expect(page.getByRole('slider',{name:'Enquadramento horizontal'})).toHaveValue('50');
 await page.getByRole('slider',{name:'Enquadramento horizontal'}).press('End');
 await page.getByRole('button',{name:'Redefinir enquadramento'}).click();
 await expect(page.getByRole('slider',{name:'Enquadramento horizontal'})).toHaveValue('50');
 await page.getByRole('slider',{name:'Enquadramento horizontal'}).press('End');
 await page.getByRole('slider',{name:'Enquadramento vertical'}).press('Home');
 await page.getByRole('slider',{name:'Zoom da foto'}).press('End');
 await expect(page.getByAltText('Prévia da sua foto')).toHaveCSS('object-position','100% 0%');
 await expect(page.getByAltText('Prévia da sua foto')).toHaveCSS('transform','matrix(3, 0, 0, 3, 0, 0)');
}
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
test('new player must upload a valid photo and can retry after a network failure',async({page})=>{
 let saved=false,attempts=0;await login(page,newcomer);
 await page.route('**/*.supabase.co/**',async route=>{const path=new URL(route.request().url()).pathname;const resource=path.split('/').pop();let body:unknown=[];
 if(resource==='profiles')body=[{id:newcomer,display_name:'Novo jogador',role:'player',position:'MEI',access_status:'pending',requires_registration_photo:true,photo_path:saved?newcomer+'/registration.webp':null}];
 if(resource==='registration_invitations')body=[{...invitation,photo_required:true,has_photo:saved}];
 if(path.includes('/storage/v1/object/')&&route.request().method()==='POST'&&!path.includes('/sign/')){attempts++;if(attempts===1){await route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({message:'Falha de rede',error:'Falha de rede'})});return;}body={Key:'player-photos/'+newcomer+'/registration.webp'};}
 if(path.includes('/object/sign/'))body=[{path:newcomer+'/registration.webp',signedURL:'/object/sign/player-photos/'+newcomer+'/registration.webp?token=test'}];
 if(resource==='save_registration_photo'){expect(route.request().postDataJSON()).toEqual({p_photo_x:100,p_photo_y:0,p_photo_zoom:3});saved=true;body=null;}
 await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});});
 await page.goto('/');await expect(page.getByRole('heading',{name:'Novo jogador, falta sua foto!'})).toBeVisible();await expect(page.getByRole('button',{name:'Salvar foto e continuar'})).toBeDisabled();
 await page.getByLabel('Foto obrigatória').setInputFiles({name:'bad.txt',mimeType:'text/plain',buffer:Buffer.from('invalid')});await expect(page.locator('.registration-photo').getByRole('alert')).toContainText('JPG, PNG ou WebP');
 const buffer=Buffer.from(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=40;c.height=40;c.getContext('2d')!.fillRect(0,0,40,40);return c.toDataURL('image/png').split(',')[1];}),'base64');
 await page.getByLabel('Foto obrigatória').setInputFiles({name:'photo.png',mimeType:'image/png',buffer});await expect(page.getByAltText('Prévia da sua foto')).toBeVisible();await framePhoto(page);await page.getByRole('button',{name:'Salvar foto e continuar'}).click();await expect(page.locator('.registration-photo').getByRole('alert')).toBeVisible();
 await page.getByRole('button',{name:'Salvar foto e continuar'}).click();await expect(page.getByRole('heading',{name:'Só falta confirmar seu convite.'})).toBeVisible();expect(saved).toBe(true);expect(attempts).toBe(2);
});
test('existing member without photo gets a persistent modal without an exit',async({page})=>{
 let saved=false;await login(page,inviter);
 await page.route('**/*.supabase.co/**',async route=>{const path=new URL(route.request().url()).pathname,resource=path.split('/').pop();let body:unknown=[];
 if(resource==='profiles')body=[{id:inviter,display_name:'Vini',role:'admin',position:'MEI',access_status:'approved',requires_registration_photo:true,photo_path:saved?inviter+'/registration.webp':null}];
 if(path.includes('/object/sign/'))body=[{path:inviter+'/registration.webp',signedURL:'/object/sign/player-photos/'+inviter+'/registration.webp?token=test'}];
 if(resource==='save_registration_photo'){expect(route.request().postDataJSON()).toEqual({p_photo_x:100,p_photo_y:0,p_photo_zoom:3});saved=true;body=null;}
 if(path.includes('/object/player-photos/'))body={Key:'player-photos/'+inviter+'/registration.webp'};
 await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});});
 await page.goto('/');const modal=page.getByRole('dialog',{name:'Vini, falta sua foto!'});await expect(modal).toBeVisible();await expect(page.getByRole('button',{name:/Sair|Fechar|Depois|Cancelar/})).toHaveCount(0);
 await page.keyboard.press('Escape');await expect(modal).toBeVisible();await page.mouse.click(2,2);await expect(modal).toBeVisible();await page.reload();await expect(modal).toBeVisible();await expect(page.getByRole('button',{name:'Peladas',exact:true})).toHaveCount(0);
 await page.setViewportSize({width:390,height:844});await expect(page.locator('body')).toHaveJSProperty('scrollWidth',390);
 const buffer=Buffer.from(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=40;c.height=40;return c.toDataURL('image/png').split(',')[1];}),'base64');
 await page.getByLabel('Foto obrigatória').setInputFiles({name:'photo.png',mimeType:'image/png',buffer});await framePhoto(page);await page.getByRole('button',{name:'Salvar foto e continuar'}).click();await expect(modal).toHaveCount(0);await expect(page.getByRole('button',{name:'Peladas',exact:true})).toBeVisible();await page.reload();await expect(modal).toHaveCount(0);expect(saved).toBe(true);
});
