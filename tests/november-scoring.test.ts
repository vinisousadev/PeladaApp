import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

test('November scoring: frozen positions, confirmed participation, group placement, corrections and historical exclusion',async()=>{
 const db=new PGlite();
 try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;
 create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth,public,storage to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
 alter table storage.objects enable row level security;grant select,insert,update,delete on storage.objects to authenticated;
 create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;`);
 const dir=new URL('../supabase/migrations/',import.meta.url);
 for(const file of readdirSync(dir).filter(f=>f.endsWith('.sql')&&f<'019').sort())await db.exec(readFileSync(new URL(file,dir),'utf8'));
 const admin='00000000-0000-0000-0000-000000000001',player='00000000-0000-0000-0000-000000000002',session='00000000-0000-0000-0000-000000000010';
 await db.exec(`insert into auth.users values('${admin}','admin@example.com','{"display_name":"Admin"}'),('${player}','player@example.com','{"display_name":"Player"}');update public.profiles set role='admin' where id='${admin}';`);
 for(const file of readdirSync(dir).filter(f=>f.endsWith('.sql')&&f>='019'&&f<'024').sort())await db.exec(readFileSync(new URL(file,dir),'utf8'));
 await db.exec(`insert into storage.objects(bucket_id,name) select 'player-photos',id::text||'/registration.webp' from public.profiles;update public.profiles set photo_path=id::text||'/registration.webp';insert into public.sessions(id,name,played_on,starts_at,created_by) values('${session}','Tournament',current_date,now(),'${admin}');insert into public.attendances(session_id,player_id,status) values('${session}','${player}','confirmed');`);
 await db.exec(readFileSync(new URL('024_tournaments.sql',dir),'utf8'));
 await db.exec(readFileSync(new URL('025_disable_player_reviews.sql',dir),'utf8'));
 await db.exec(readFileSync(new URL('026_november_scoring.sql',dir),'utf8'));
 await db.exec(readFileSync(new URL('027_default_game_participants.sql',dir),'utf8'));
 await db.exec(`update public.sessions set played_on='2026-11-04' where id='${session}'; update public.profiles set position='DEF' where id='${player}';update public.profiles set position='MEI' where id='${admin}';update public.attendances set status='confirmed' where session_id='${session}';insert into public.attendances(session_id,player_id,status) values('${session}','${admin}','confirmed');`);
 async function asUser(id:string,sql:string,params:unknown[]=[]){await db.exec(`begin;set local role authenticated;set local "request.jwt.claim.sub"='${id}';`);try{const result=await db.query<any>(sql,params);await db.exec('commit');return result;}catch(e){await db.exec('rollback');throw e;}}

 let snapshot:any={revision:null};
 const call=async(action:string,payload:unknown={},id=admin,revision=snapshot.revision)=>{const result=await asUser(id,'select public.manage_tournament($1,$2,$3,$4) result',[session,revision,action,JSON.stringify(payload)]);snapshot=result.rows[0].result;return snapshot;};
 const score=async(id=player)=>(await asUser(player,'select * from public.session_scores where player_id=$1',[id])).rows[0];
 const teams=['Amarelo','Branco','Laranja','Azul'].map((name,i)=>({name,players:i===0?[player]:i===1?[admin]:[]}));
 await call('teams',{teams});
 assert.equal(snapshot.participants.length,6);
 assert.equal(snapshot.participants.filter((p:any)=>p.player_id===player).length,3);
 await call('participants',{number:1,players:[]});
 await call('score',{number:1,home_score:0,away_score:0});
 assert.equal(snapshot.participants.filter((p:any)=>p.game_number===1).length,0);
 // Explicit exclusions in other matches must survive subsequent phase generation.
 await call('participants',{number:4,players:[]});await call('participants',{number:6,players:[]});
 assert.equal(snapshot.positions.find((p:any)=>p.player_id===player).position,'DEF');
 await asUser(player,`update public.profiles set position='ATA' where id='${player}'`);
 await db.exec(`insert into public.performances(session_id,player_id,goals,assists) values('${session}','${player}',5,2),('${session}','${admin}',1,2)`);
 assert.equal((await score()).goal_points,15);assert.equal((await score()).assist_points,4);
 assert.equal((await score(admin)).assist_points,6);
 await assert.rejects(asUser(player,`update public.session_positions set position='MEI'`),/permission denied/);
 await assert.rejects(asUser(player,`insert into public.tournament_participants values('${session}',1,'${player}',1)`),/permission denied/);
 await assert.rejects(asUser(player,'select public.manage_tournament_legacy($1,null,$2,$3)',[session,'teams',JSON.stringify({teams})]),/permission denied/);
 await assert.rejects(call('participants',{number:1,players:[player]},player),/administrador/);
 await assert.rejects(call('participants',{number:2,players:[player]}),/integrantes/);
 await call('participants',{number:1,players:[player,admin]});
 await call('score',{number:1,home_score:2,away_score:0});assert.equal((await score()).defense_points,0);
 await call('finish',{number:1,home_score:2,away_score:0});assert.equal((await score()).defense_points,3);
 await call('participants',{number:1,players:[player,admin]});assert.equal((await score()).defense_points,3);
 await assert.rejects(call('participants',{number:1,players:[]},admin,snapshot.revision-1),/outro administrador/);
 await call('reopen',{number:1});assert.equal((await score()).defense_points,0);
 await call('finish',{number:1,home_score:2,away_score:1});assert.equal((await score()).defense_points,0);
 await call('reopen',{number:1});await call('finish',{number:1,home_score:2,away_score:0});
 for(const [number,home_score,away_score] of [[2,1,0],[3,3,0],[4,2,0],[5,1,0]])await call('finish',{number,home_score,away_score});
 await call('participants',{number:3,players:[player]});await call('participants',{number:5,players:[player]});
 assert.equal((await score()).defense_points,9);assert.equal((await score()).placement_points,0);
 await call('finish',{number:6,home_score:1,away_score:1});
 assert.deepEqual(snapshot.standings.map((s:any)=>s.slot),[1,2,3,4]);
 assert.equal((await score()).placement_points,4);assert.equal((await score(admin)).placement_points,3);
 await call('semis');assert.ok(snapshot.participants.some((p:any)=>p.game_number===7&&p.player_id===player));assert.equal(snapshot.participants.filter((p:any)=>p.game_number===4).length,0);await call('participants',{number:7,players:[player]});await call('finish',{number:7,home_score:0,away_score:0});
 assert.equal((await score()).defense_points,12); // no per-session defensive cap
 await call('finish',{number:8,home_score:1,away_score:1,winner:3});await call('final');
 await call('finish',{number:9,home_score:0,away_score:1}); // group leader loses final
 assert.equal((await score()).placement_points,4);
 await call('participants',{number:1,players:[]});assert.equal((await score(admin)).placement_points,0);
 await call('reset_bracket');assert.equal((await score()).defense_points,6);
 await call('reopen',{number:6});assert.equal((await score()).placement_points,0);
 await call('finish',{number:6,home_score:1,away_score:1});assert.equal((await score()).placement_points,4);
 // Date-based rule version leaves September/October entirely out of the new view.
 await db.exec(`update public.sessions set played_on='2026-10-28' where id='${session}'`);
 assert.equal((await db.query('select * from public.session_scores')).rows.length,0);
 await assert.rejects(call('participants',{number:1,players:[player]}),/novembro/);
 await db.exec(`update public.sessions set starts_at=now()+interval '1 day' where id='${session}';update public.sessions set played_on='2026-11-04' where id='${session}'`);
 await asUser(admin,`update public.sessions set status='cancelled' where id='${session}'`);
 assert.equal((await db.query('select * from public.session_scores')).rows.length,0);
 await assert.rejects(call('participants',{number:1,players:[player]}),/cancelada/);
 }finally{await db.close();}
});
