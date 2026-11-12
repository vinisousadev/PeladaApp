import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

test('Roster corrections preserve results, replace bonuses, retain exclusions and permit performance entry',async()=>{
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
 await db.exec(`insert into auth.users values('${admin}','admin@example.com','{"display_name":"Admin"}'),('${player}','player@example.com','{"display_name":"Player"}'),('00000000-0000-0000-0000-000000000003','sub@example.com','{"display_name":"Substitute"}');update public.profiles set role='admin' where id='${admin}';`);
 for(const file of readdirSync(dir).filter(f=>f.endsWith('.sql')&&f>='019'&&f<'024').sort())await db.exec(readFileSync(new URL(file,dir),'utf8'));
 await db.exec(`insert into storage.objects(bucket_id,name) select 'player-photos',id::text||'/registration.webp' from public.profiles;update public.profiles set photo_path=id::text||'/registration.webp';insert into public.sessions(id,name,played_on,starts_at,created_by) values('${session}','Tournament',current_date,now(),'${admin}');insert into public.attendances(session_id,player_id,status) values('${session}','${player}','confirmed');`);
 await db.exec(readFileSync(new URL('024_tournaments.sql',dir),'utf8'));
 await db.exec(readFileSync(new URL('025_disable_player_reviews.sql',dir),'utf8'));
 await db.exec(`update public.sessions set played_on='2026-10-28' where id='${session}'`);
 await db.exec(readFileSync(new URL('026_november_scoring.sql',dir),'utf8'));
 await db.exec(readFileSync(new URL('027_default_game_participants.sql',dir),'utf8'));
 await db.exec(`update public.sessions set played_on='2026-11-04' where id='${session}'; update public.profiles set position='DEF' where id='${player}';update public.profiles set position='MEI' where id='${admin}';update public.attendances set status='confirmed' where session_id='${session}';insert into public.attendances(session_id,player_id,status) values('${session}','${admin}','confirmed');`);
 async function asUser(id:string,sql:string,params:unknown[]=[]){await db.exec(`begin;set local role authenticated;set local "request.jwt.claim.sub"='${id}';`);try{const result=await db.query<any>(sql,params);await db.exec('commit');return result;}catch(e){await db.exec('rollback');throw e;}}

 await db.exec(readFileSync(new URL('028_final_placements.sql',dir),'utf8'));
 let snapshot:any={revision:null};
 const call=async(action:string,payload:unknown={},id=admin,revision=snapshot.revision)=>{const result=await asUser(id,'select public.manage_tournament($1,$2,$3,$4) result',[session,revision,action,JSON.stringify(payload)]);snapshot=result.rows[0].result;return snapshot;};
 const score=async(id=player)=>(await asUser(player,'select * from public.session_scores where player_id=$1',[id])).rows[0];


 await db.exec(readFileSync(new URL('030_correct_tournament_rosters.sql',dir),'utf8'));
 const sub='00000000-0000-0000-0000-000000000003';
 await db.exec(`update profiles set position='DEF' where id='${sub}';insert into attendances(session_id,player_id,status) values('${session}','${sub}','confirmed')`);
 const teams=['Amarelo','Branco','Laranja','Azul'].map((name,i)=>({name,players:i===0?[player,admin]:[]}));
 await call('teams',{teams});
 await call('participants',{number:1,players:[player]});
 for(const [number,home_score,away_score] of [[1,2,0],[2,1,0],[3,3,0],[4,2,0],[5,1,0],[6,1,1]])await call('finish',{number,home_score,away_score});
 await call('semis');await call('finish',{number:7,home_score:0,away_score:0});await call('finish',{number:8,home_score:1,away_score:1,winner:3});await call('final');await call('finish',{number:9,home_score:2,away_score:0});
 await asUser(admin,`insert into public.performances(session_id,player_id,goals,assists) values('${session}','${admin}',2,1)`);
 const games=structuredClone(snapshot.games),standings=structuredClone(snapshot.standings),placements=structuredClone(snapshot.placements);
 const corrected=snapshot.teams.map((t:any)=>({...t,players:t.slot===1?[sub,admin]:t.players}));
 await assert.rejects(call('correct_rosters',{teams:corrected},player),/administrador/);
 await assert.rejects(asUser(player,'select public.correct_tournament_rosters($1,$2)',[session,JSON.stringify(corrected)]),/permission denied/);
 await assert.rejects(call('correct_rosters',{teams:corrected},admin,snapshot.revision-1),/outro administrador/);
 await assert.rejects(call('correct_rosters',{teams:corrected.slice(0,3)}),/quatro times/);
 const duplicate=structuredClone(corrected);duplicate[1].players=[sub];await assert.rejects(call('correct_rosters',{teams:duplicate}),/só pode estar em um time/);
 await db.exec(`update attendances set status='waiting' where session_id='${session}' and player_id='${sub}'`);
 await assert.rejects(call('correct_rosters',{teams:corrected}),/confirmados/);
 await db.exec(`update attendances set status='confirmed' where session_id='${session}' and player_id='${sub}';delete from attendances where session_id='${session}' and player_id='${player}'`);
 await call('correct_rosters',{teams:corrected});
 assert.deepEqual(snapshot.games,games);assert.deepEqual(snapshot.standings,standings);assert.deepEqual(snapshot.placements,placements);
 assert.equal(snapshot.participants.filter((p:any)=>p.player_id===player).length,0);assert.equal(await score(player),undefined);
 assert.equal(snapshot.participants.filter((p:any)=>p.player_id===sub).length,5);
 assert.equal(snapshot.participants.filter((p:any)=>p.player_id===admin&&p.game_number===1).length,0);
 assert.equal((await score(sub)).defense_points,15);assert.equal((await score(sub)).placement_points,4);
 assert.equal((await score(admin)).goal_points,6);assert.equal((await score(admin)).assist_points,3);
 await call('participants',{number:3,players:[admin]});await call('correct_rosters',{teams:corrected});assert.equal((await score(sub)).defense_points,12);
 await db.exec(`update sessions set status='closed' where id='${session}'`);
 await call('correct_rosters',{teams:corrected});
 await asUser(admin,`insert into public.performances(session_id,player_id,goals,assists) values('${session}','${sub}',1,2)`);
 assert.equal((await score(sub)).goal_points,3);assert.equal((await score(sub)).assist_points,4);
 assert.deepEqual(snapshot.games,games);
 await asUser(admin,`update sessions set starts_at=now()+interval '1 day',status='open' where id='${session}'`);
 await asUser(admin,`update sessions set status='cancelled' where id='${session}'`);
 await assert.rejects(call('correct_rosters',{teams:corrected}),/cancelada/);
 }finally{await db.close();}
});
