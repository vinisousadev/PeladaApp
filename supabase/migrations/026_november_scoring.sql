begin;

-- Frozen card position per session: players cannot retroactively change weights.
create table public.session_positions (
 session_id uuid references public.sessions(id) on delete cascade,
 player_id uuid references public.profiles(id) on delete cascade,
 position text not null check(position in ('ATA','MEI','DEF','GOL')),
 primary key(session_id,player_id)
);
create table public.tournament_participants (
 session_id uuid not null,
 game_number integer not null,
 player_id uuid not null references public.profiles(id) on delete cascade,
 team_slot integer not null,
 primary key(session_id,game_number,player_id),
 foreign key(session_id,game_number) references public.tournament_games(session_id,number) on delete cascade,
 foreign key(session_id,team_slot) references public.tournament_teams(session_id,slot) on delete cascade
);
alter table public.session_positions enable row level security;
alter table public.tournament_participants enable row level security;
revoke all on public.session_positions,public.tournament_participants from public,anon,authenticated;
grant select on public.session_positions,public.tournament_participants to authenticated;
create policy positions_read on public.session_positions for select to authenticated using(public.is_member());
create policy participants_read on public.tournament_participants for select to authenticated using(public.is_member());

create function public.snapshot_session_position() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.status='confirmed' and exists(select 1 from public.sessions where id=new.session_id and played_on>='2026-11-01') then
  insert into public.session_positions(session_id,player_id,position)
  select new.session_id,id,position from public.profiles where id=new.player_id
  on conflict do nothing;
 end if;
 return new;
end $$;
revoke all on function public.snapshot_session_position() from public,anon,authenticated;
create trigger snapshot_position after insert or update of status on public.attendances
for each row execute function public.snapshot_session_position();
insert into public.session_positions(session_id,player_id,position)
select a.session_id,a.player_id,p.position from public.attendances a
join public.sessions s on s.id=a.session_id join public.profiles p on p.id=a.player_id
where a.status='confirmed' and s.played_on>='2026-11-01' on conflict do nothing;

-- Covers an existing confirmation when a session is rescheduled across the cutoff.
create function public.ensure_performance_position() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.sessions where id=new.session_id and played_on>='2026-11-01') then
  insert into public.session_positions(session_id,player_id,position)
  select new.session_id,id,position from public.profiles where id=new.player_id on conflict do nothing;
 end if;
 return new;
end $$;
revoke all on function public.ensure_performance_position() from public,anon,authenticated;
create trigger ensure_performance_position after insert on public.performances
for each row execute function public.ensure_performance_position();

-- Derived values, never an incrementing counter. Reopening/removing a game
-- immediately removes its bonuses; cancelling a session removes all its scores.
create view public.session_scores with (security_invoker=true) as
with group_ranks as (
 select t.session_id,st.slot,(row_number() over(partition by t.session_id order by st.points desc,st.wins desc,(st.gf-st.ga) desc,st.gf desc,lower(st.name),st.slot))::integer place
 from public.tournaments t cross join lateral public.tournament_standings(t.session_id) st
 where (select count(*) from public.tournament_games g where g.session_id=t.session_id and g.stage='group' and g.finished)=6
), participation as (
 select tp.session_id,tp.player_id,
 count(*) filter(where g.finished and ((tp.team_slot=g.home and g.away_score=0) or (tp.team_slot=g.away and g.home_score=0)))::integer clean_sheets,
 coalesce(max(5-r.place) filter(where g.finished and g.stage='group'),0)::integer placement_points,
 count(*) filter(where g.finished)::integer games_played
 from public.tournament_participants tp join public.tournament_games g on g.session_id=tp.session_id and g.number=tp.game_number
 left join group_ranks r on r.session_id=tp.session_id and r.slot=tp.team_slot
 group by tp.session_id,tp.player_id
), entries as (
 select session_id,player_id from public.performances
 union select session_id,player_id from participation where games_played>0
)
select e.session_id,e.player_id,sp.position,
 coalesce(p.goals,0)*3 as goal_points,
 coalesce(p.assists,0)*case when sp.position='MEI' then 3 else 2 end as assist_points,
 case when sp.position='DEF' then coalesce(b.clean_sheets,0)*3 else 0 end as defense_points,
 coalesce(b.placement_points,0) as placement_points,
 case when sp.position='DEF' then coalesce(b.clean_sheets,0) else 0 end as clean_sheets
from entries e join public.sessions s on s.id=e.session_id
join public.session_positions sp on sp.session_id=e.session_id and sp.player_id=e.player_id
left join public.performances p on p.session_id=e.session_id and p.player_id=e.player_id
left join participation b on b.session_id=e.session_id and b.player_id=e.player_id
where s.played_on>='2026-11-01' and s.status<>'cancelled';
revoke all on public.session_scores from public,anon,authenticated;
grant select on public.session_scores to authenticated;

create or replace function public.get_tournament(p_session_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.is_member() then raise exception 'Acesso não autorizado.'; end if;
 return jsonb_build_object('revision',(select revision from public.tournaments where session_id=p_session_id),
 'server_time',now(),'teams',coalesce((select jsonb_agg(t order by slot) from public.tournament_teams t where session_id=p_session_id),'[]'),
 'games',coalesce((select jsonb_agg(g order by number) from public.tournament_games g where session_id=p_session_id),'[]'),
 'standings',coalesce((select jsonb_agg(s) from public.tournament_standings(p_session_id) s),'[]'),
 'participants',coalesce((select jsonb_agg(p) from public.tournament_participants p where session_id=p_session_id),'[]'),
 'positions',coalesce((select jsonb_agg(p) from public.session_positions p where session_id=p_session_id),'[]'),
 'scores',coalesce((select jsonb_agg(p) from public.session_scores p where session_id=p_session_id),'[]'));
end $$;

alter function public.manage_tournament(uuid,integer,text,jsonb) rename to manage_tournament_legacy;
revoke all on function public.manage_tournament_legacy(uuid,integer,text,jsonb) from public,anon,authenticated;
create function public.manage_tournament(p_session_id uuid,p_revision integer,p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare game public.tournament_games; session public.sessions; current_revision integer; ids uuid[]; pid uuid; slot integer;
begin
 if not public.is_admin() then raise exception 'Somente o administrador pode editar o campeonato.'; end if;
 select * into session from public.sessions where id=p_session_id for update;
 if not found or session.status='cancelled' then raise exception 'Pelada indisponível ou cancelada.'; end if;
 select revision into current_revision from public.tournaments where session_id=p_session_id for update;
 if current_revision is distinct from p_revision then raise exception 'O campeonato foi atualizado por outro administrador. Atualize e tente novamente.'; end if;
 if p_action='participants' then
  if session.played_on<'2026-11-01' then raise exception 'A nova pontuação começa em novembro de 2026.'; end if;
  select * into game from public.tournament_games where session_id=p_session_id and number=(p_payload->>'number')::integer;
  if not found then raise exception 'Jogo não encontrado.'; end if;
  if jsonb_typeof(p_payload->'players') is distinct from 'array' then raise exception 'Informe quem participou do jogo.'; end if;
  select coalesce(array_agg(value::uuid),'{}') into ids from jsonb_array_elements_text(p_payload->'players');
  if cardinality(ids)<>(select count(distinct x) from unnest(ids) x) then raise exception 'Jogadores repetidos.'; end if;
  foreach pid in array ids loop
   select t.slot into slot from public.tournament_teams t where t.session_id=p_session_id and t.slot in(game.home,game.away) and pid=any(t.players);
   if slot is null or not exists(select 1 from public.session_positions where session_id=p_session_id and player_id=pid) then raise exception 'Selecione apenas integrantes dos dois times com presença confirmada.'; end if;
  end loop;
  delete from public.tournament_participants where session_id=p_session_id and game_number=game.number;
  insert into public.tournament_participants(session_id,game_number,player_id,team_slot)
  select p_session_id,game.number,chosen.id,t.slot from unnest(ids) chosen(id) join public.tournament_teams t on t.session_id=p_session_id and chosen.id=any(t.players);
  update public.tournaments set revision=revision+1,updated_at=now() where session_id=p_session_id;
  return public.get_tournament(p_session_id);
 else
  if p_action='teams' and session.played_on>='2026-11-01' then
   insert into public.session_positions(session_id,player_id,position)
   select a.session_id,a.player_id,p.position from public.attendances a join public.profiles p on p.id=a.player_id
   where a.session_id=p_session_id and a.status='confirmed' on conflict do nothing;
  end if;
  -- Replacing teams is allowed only before games start by the original RPC.
  -- Discard any draft participant confirmations so they cannot follow a new team.
  if p_action='teams' then delete from public.tournament_participants where session_id=p_session_id; end if;
  return public.manage_tournament_legacy(p_session_id,p_revision,p_action,p_payload);
 end if;
end $$;
revoke all on function public.manage_tournament(uuid,integer,text,jsonb) from public,anon;
grant execute on function public.manage_tournament(uuid,integer,text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
