begin;

create table public.tournaments (
 session_id uuid primary key references public.sessions(id) on delete cascade,
 revision integer not null default 0,
 updated_at timestamptz not null default now()
);
create table public.tournament_teams (
 session_id uuid references public.tournaments(session_id) on delete cascade,
 slot integer check(slot between 1 and 4),
 name text not null check(length(trim(name)) between 1 and 40),
 players uuid[] not null default '{}',
 primary key(session_id,slot)
);
create table public.tournament_games (
 session_id uuid references public.tournaments(session_id) on delete cascade,
 number integer check(number between 1 and 9),
 stage text not null check(stage in ('group','semi','final')),
 home integer not null,
 away integer not null,
 home_score integer not null default 0 check(home_score between 0 and 99),
 away_score integer not null default 0 check(away_score between 0 and 99),
 finished boolean not null default false,
 winner integer,
 remaining_seconds integer not null default 480 check(remaining_seconds between 0 and 480),
 timer_started_at timestamptz,
 primary key(session_id,number),
 foreign key(session_id,home) references public.tournament_teams(session_id,slot),
 foreign key(session_id,away) references public.tournament_teams(session_id,slot),
 check(home<>away),check(winner is null or winner=home or winner=away)
);
alter table public.tournaments enable row level security;
alter table public.tournament_teams enable row level security;
alter table public.tournament_games enable row level security;
revoke all on public.tournaments,public.tournament_teams,public.tournament_games from public,anon,authenticated;
grant select on public.tournaments,public.tournament_teams,public.tournament_games to authenticated;
create policy tournaments_read on public.tournaments for select to authenticated using(public.is_member());
create policy tournament_teams_read on public.tournament_teams for select to authenticated using(public.is_member());
create policy tournament_games_read on public.tournament_games for select to authenticated using(public.is_member());

create function public.tournament_standings(p_session_id uuid)
returns table(slot integer,name text,played bigint,wins bigint,draws bigint,losses bigint,gf bigint,ga bigint,points bigint)
language sql stable security invoker set search_path='' as $$
 with results as (
 select g.home as team,g.home_score as scored,g.away_score as conceded from public.tournament_games g where g.session_id=p_session_id and g.stage='group' and g.finished
 union all
 select g.away,g.away_score,g.home_score from public.tournament_games g where g.session_id=p_session_id and g.stage='group' and g.finished
 ), totals as (
 select t.slot,t.name,count(r.team) played,count(*) filter(where r.scored>r.conceded) wins,
 count(*) filter(where r.scored=r.conceded) draws,count(*) filter(where r.scored<r.conceded) losses,
 coalesce(sum(r.scored),0) gf,coalesce(sum(r.conceded),0) ga,
 coalesce(sum(case when r.scored>r.conceded then 3 when r.scored=r.conceded then 1 else 0 end),0) points
 from public.tournament_teams t left join results r on r.team=t.slot where t.session_id=p_session_id group by t.slot,t.name
 ) select * from totals order by points desc,wins desc,(gf-ga) desc,gf desc,lower(name),slot
$$;

-- One snapshot gives clients a consistent revision and a server clock reference.
create function public.get_tournament(p_session_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.is_member() then raise exception 'Acesso não autorizado.'; end if;
 return jsonb_build_object('revision',(select revision from public.tournaments where session_id=p_session_id),
 'server_time',now(),'teams',coalesce((select jsonb_agg(t order by slot) from public.tournament_teams t where session_id=p_session_id),'[]'),
 'games',coalesce((select jsonb_agg(g order by number) from public.tournament_games g where session_id=p_session_id),'[]'),
 'standings',coalesce((select jsonb_agg(s) from public.tournament_standings(p_session_id) s),'[]'));
end $$;

create function public.manage_tournament(p_session_id uuid,p_revision integer,p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare current_revision integer; team jsonb; n integer; g public.tournament_games; seeds integer[]; chosen integer; used uuid[]='{}'; roster uuid[]; session_status text;
begin
 if not public.is_admin() then raise exception 'Somente o administrador pode editar o campeonato.'; end if;
 select status into session_status from public.sessions where id=p_session_id for update;
 if not found or session_status='cancelled' then raise exception 'Pelada indisponível ou cancelada.'; end if;
 select revision into current_revision from public.tournaments where session_id=p_session_id for update;
 if current_revision is distinct from p_revision then raise exception 'O campeonato foi atualizado por outro administrador. Atualize e tente novamente.'; end if;
 if p_action='teams' then
  if exists(select 1 from public.tournament_games where session_id=p_session_id and (finished or timer_started_at is not null or remaining_seconds<>480 or home_score<>0 or away_score<>0)) then raise exception 'Os times só podem ser alterados antes de iniciar os jogos.'; end if;
  if jsonb_typeof(p_payload->'teams') is distinct from 'array' or jsonb_array_length(p_payload->'teams')<>4 then raise exception 'Informe os quatro times.'; end if;
  if (select count(distinct lower(trim(value->>'name'))) from jsonb_array_elements(p_payload->'teams'))<>4 then raise exception 'Use nomes diferentes para os quatro times.'; end if;
  insert into public.tournaments(session_id) values(p_session_id) on conflict do nothing;
  for team,n in select value,ordinality::integer from jsonb_array_elements(p_payload->'teams') with ordinality loop
   if coalesce(length(trim(team->>'name')),0) not between 1 and 40 then raise exception 'Cada time precisa de um nome de até 40 caracteres.'; end if;
   select coalesce(array_agg(value::uuid),'{}') into roster from jsonb_array_elements_text(coalesce(team->'players','[]'));
   if cardinality(roster)>6 or cardinality(roster)<>(select count(distinct id) from unnest(roster) id) or roster && used then raise exception 'Cada jogador só pode estar em um time, com até seis jogadores por time.'; end if;
   if exists(select 1 from unnest(roster) id where not exists(select 1 from public.attendances a where a.session_id=p_session_id and a.player_id=id and a.status='confirmed')) then raise exception 'Escolha apenas jogadores confirmados nesta pelada.'; end if;
   used:=used||roster;
   insert into public.tournament_teams(session_id,slot,name,players) values(p_session_id,n,trim(team->>'name'),roster)
   on conflict(session_id,slot) do update set name=excluded.name,players=excluded.players;
  end loop;
  insert into public.tournament_games(session_id,number,stage,home,away)
   select p_session_id,v.n,'group',v.h,v.a from (values(1,1,2),(2,3,4),(3,1,3),(4,2,4),(5,1,4),(6,2,3)) v(n,h,a) on conflict do nothing;
 elsif current_revision is null then raise exception 'Cadastre os quatro times primeiro.';
 elsif p_action='semis' then
  if (select count(*) from public.tournament_games where session_id=p_session_id and stage='group' and finished)<>6 then raise exception 'Finalize os seis jogos da fase de pontos.'; end if;
  if exists(select 1 from public.tournament_games where session_id=p_session_id and stage<>'group') then raise exception 'Semifinais já geradas.'; end if;
  select array_agg(s.slot) into seeds from public.tournament_standings(p_session_id) s;
  insert into public.tournament_games(session_id,number,stage,home,away) values(p_session_id,7,'semi',seeds[1],seeds[4]),(p_session_id,8,'semi',seeds[3],seeds[2]);
 elsif p_action='final' then
  if (select count(*) from public.tournament_games where session_id=p_session_id and stage='semi' and finished)<>2 then raise exception 'Finalize as duas semifinais.'; end if;
  if exists(select 1 from public.tournament_games where session_id=p_session_id and stage='final') then raise exception 'Final já gerada.'; end if;
  select array_agg(winner order by number) into seeds from public.tournament_games where session_id=p_session_id and stage='semi';
  insert into public.tournament_games(session_id,number,stage,home,away) values(p_session_id,9,'final',seeds[1],seeds[2]);
 elsif p_action='reset_bracket' then
  -- Explicit administrative correction: retain the group results, discard knockout results/timers.
  delete from public.tournament_games where session_id=p_session_id and stage<>'group';
 elsif p_action in ('score','finish','reopen','start','pause','reset_timer') then
  select * into g from public.tournament_games where session_id=p_session_id and number=(p_payload->>'number')::integer for update;
  if not found then raise exception 'Jogo não encontrado.'; end if;
  if g.stage='group' and exists(select 1 from public.tournament_games where session_id=p_session_id and stage='semi') or g.stage='semi' and exists(select 1 from public.tournament_games where session_id=p_session_id and stage='final') then raise exception 'Desfaça o mata-mata antes de corrigir uma fase anterior.'; end if;
  if g.finished and p_action<>'reopen' then raise exception 'Reabra o jogo antes de editar.'; end if;
  if p_action in ('score','finish') then
   g.home_score:=(p_payload->>'home_score')::integer;g.away_score:=(p_payload->>'away_score')::integer;
   if g.home_score is null or g.away_score is null or g.home_score not between 0 and 99 or g.away_score not between 0 and 99 then raise exception 'Informe placares entre 0 e 99.'; end if;
   g.winner:=null;
   if p_action='finish' then
    if g.home_score>g.away_score then g.winner:=g.home;
    elsif g.away_score>g.home_score then g.winner:=g.away;
    elsif g.number=7 then g.winner:=g.home;
    elsif g.stage<>'group' then
     chosen:=(p_payload->>'winner')::integer;
     if chosen is null or chosen not in(g.home,g.away) then raise exception 'Informe o vencedor dos pênaltis.'; end if;
     g.winner:=chosen;
    end if;
    g.finished:=true;
   end if;
  elsif p_action='reopen' then g.finished:=false;g.winner:=null;
  elsif p_action='start' then
   if g.timer_started_at is not null then raise exception 'Cronômetro já iniciado.'; end if;
   if exists(select 1 from public.tournament_games where session_id=p_session_id and timer_started_at is not null and number<>g.number) then raise exception 'Pause o cronômetro do outro jogo primeiro.'; end if;
   if g.remaining_seconds=0 then raise exception 'Reinicie o cronômetro antes de iniciar.'; end if;
   g.timer_started_at:=now();
  elsif p_action='reset_timer' then g.remaining_seconds:=480;g.timer_started_at:=null;
  end if;
  if (p_action in ('pause','finish') and g.timer_started_at is not null) then
   g.remaining_seconds:=greatest(0,g.remaining_seconds-floor(extract(epoch from(now()-g.timer_started_at)))::integer);g.timer_started_at:=null;
  end if;
  update public.tournament_games set home_score=g.home_score,away_score=g.away_score,finished=g.finished,winner=g.winner,remaining_seconds=g.remaining_seconds,timer_started_at=g.timer_started_at where session_id=p_session_id and number=g.number;
 else raise exception 'Ação inválida.';
 end if;
 update public.tournaments set revision=revision+1,updated_at=now() where session_id=p_session_id;
 return public.get_tournament(p_session_id);
end $$;
revoke all on function public.tournament_standings(uuid),public.get_tournament(uuid),public.manage_tournament(uuid,integer,text,jsonb) from public,anon;
grant execute on function public.tournament_standings(uuid),public.get_tournament(uuid),public.manage_tournament(uuid,integer,text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
