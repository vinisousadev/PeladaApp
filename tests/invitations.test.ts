import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

test('invited registrations enforce approval, privacy, provenance and reviewer authorization',async()=>{
 const db=new PGlite();
 try {
 await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;
 create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth,public,storage to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
 alter table storage.objects enable row level security;grant select,insert,update,delete on storage.objects to authenticated;
 create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;`);
 const dir=new URL('../supabase/migrations/',import.meta.url);
 for(const file of readdirSync(dir).filter(f=>f.endsWith('.sql')&&f<'019').sort()) await db.exec(readFileSync(new URL(file,dir),'utf8'));
 const [admin,a,b,c,outsider]=[1,2,3,4,5].map(n=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`);
 for(const [i,id] of [admin,a,b,c,outsider].entries())await db.exec(`insert into auth.users values('${id}','test${i}@example.com','{"display_name":"Player ${i}"}');`);
 await db.exec(`update public.profiles set role='admin' where id='${admin}';update public.profiles set membership='monthly';`);
 await db.exec(readFileSync(new URL('019_inviter_approval.sql',dir),'utf8'));

 const newcomer='00000000-0000-0000-0000-000000000020';
 async function asUser(id:string,sql:string){await db.exec(`begin;set local role authenticated;set local "request.jwt.claim.sub"='${id}';`);try{const result=await db.query<Record<string,unknown>>(sql);await db.exec('commit');return result;}catch(e){await db.exec('rollback');throw e;}}
 assert.equal((await db.query<Record<string,unknown>>("select count(*)::int n from profiles where access_status='approved'")).rows[0].n,5);
 await assert.rejects(db.exec(`insert into auth.users values('${newcomer}','new@example.com','{"display_name":"New Player"}')`),/Selecione/);
 await db.exec(`insert into auth.users values('${newcomer}','new@example.com','{"display_name":"New Player","invited_by":"${a}","role":"admin","access_status":"approved"}')`);
 const profile=(await asUser(newcomer,'select * from profiles')).rows;
 assert.equal(profile.length,1);assert.equal(profile[0].access_status,'pending');assert.equal(profile[0].role,'player');assert.equal(profile[0].invited_by,a);
 await assert.rejects(asUser(newcomer,`update profiles set access_status='approved' where id='${newcomer}'`),/permission denied/);
 await assert.rejects(asUser(a,`update profiles set invited_by='${b}' where id='${a}'`),/permission denied/);
 const game='00000000-0000-0000-0000-000000000030';
 await db.exec(`insert into sessions(id,name,played_on,starts_at,created_by) values('${game}','Upcoming',current_date,now()+interval '3 days','${admin}');insert into storage.objects(bucket_id,name) values('player-photos','${a}/photo.webp');`);
 assert.equal((await asUser(newcomer,'select * from sessions')).rows.length,0);
 assert.equal((await asUser(newcomer,'select * from storage.objects')).rows.length,0);
 await assert.rejects(asUser(newcomer,`select set_attendance_manual('${game}',true)`));
 await assert.rejects(db.exec(`insert into attendances(session_id,player_id,status) values('${game}','${newcomer}','confirmed')`),/aprovado/);
 assert.equal((await asUser(a,'select * from registration_invitations()')).rows.length,1);
 assert.equal((await asUser(b,'select * from registration_invitations()')).rows.length,0);
 assert.equal((await asUser(admin,'select * from registration_invitations()')).rows[0].inviter_id,a);
 assert.equal((await asUser(newcomer,'select * from registration_invitations()')).rows[0].inviter_id,a);
 await assert.rejects(asUser(newcomer,`select review_registration('${newcomer}',true,'pending')`),/autorizado/);
 await assert.rejects(asUser(b,`select review_registration('${newcomer}',true,'pending')`),/administrador/);
 await assert.rejects(db.exec(`insert into auth.users values('00000000-0000-0000-0000-000000000021','other@example.com','{"display_name":"Other Player","invited_by":"${newcomer}"}')`),/aprovado/);
 await asUser(a,`select review_registration('${newcomer}',false,'pending')`);
 await assert.rejects(asUser(a,`select review_registration('${newcomer}',true,'rejected')`),/analisado/);
 await assert.rejects(asUser(admin,`select review_registration('${newcomer}',true,'pending')`),/Atualize/);
 await asUser(admin,`select review_registration('${newcomer}',true,'rejected')`);
 const approved=(await asUser(admin,'select * from registration_invitations()')).rows[0];assert.equal(approved.status,'approved');assert.equal(approved.reviewed_by_name,'Player 0');assert.ok(approved.reviewed_at);
 assert.equal((await asUser(newcomer,'select * from sessions')).rows.length,1);
 await asUser(newcomer,`select set_attendance_manual('${game}',true)`);
 await db.exec(`update auth.users set raw_user_meta_data='{"invited_by":"${b}"}' where id='${newcomer}'`);
 assert.equal((await asUser(newcomer,`select invited_by from profiles where id='${newcomer}'`)).rows[0].invited_by,a);
 await db.exec(`insert into auth.users values('00000000-0000-0000-0000-000000000021','other@example.com','{"display_name":"Other Player","invited_by":"${newcomer}"}')`);
 await asUser(newcomer,"select review_registration('00000000-0000-0000-0000-000000000021',true,'pending')");
 await db.exec('begin;set local role anon;');
 assert.equal((await db.query<Record<string,unknown>>("select * from signup_inviters('Player')")).rows.length,7);
 assert.equal((await db.query<Record<string,unknown>>("select * from signup_inviters('P')")).rows.length,0);
 await db.exec('rollback');
 }finally{await db.close();}
});
