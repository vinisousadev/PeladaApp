begin;
alter table public.tournament_games drop constraint tournament_games_number_check;
alter table public.tournament_games add constraint tournament_games_number_check check(number between 1 and 10);
alter table public.tournament_games drop constraint tournament_games_stage_check;
alter table public.tournament_games add constraint tournament_games_stage_check check(stage in ('group','semi','final','third'));

-- Final placements exist only once the final is finished. An unfinished optional
-- third-place match leaves places 3/4 pending instead of granting provisional points.
create function public.tournament_placements(p_session_id uuid)
returns table(slot integer,place integer)
language sql stable security invoker set search_path='' as $$
 with final as (select * from public.tournament_games where session_id=p_session_id and stage='final' and finished),
 third as (select * from public.tournament_games where session_id=p_session_id and stage='third'),
 losers as (select case when winner=home then away else home end slot from public.tournament_games where session_id=p_session_id and stage='semi' and finished),
 ranked_losers as (
 select s.slot,2+(row_number() over(order by s.points desc,s.wins desc,(s.gf-s.ga) desc,s.gf desc,lower(s.name),s.slot))::integer place
 from public.tournament_standings(p_session_id) s join losers l on l.slot=s.slot
 ), results as (
 select winner slot,1 place from final
 union all select case when winner=home then away else home end,2 from final
 union all select winner,3 from third where finished
 union all select case when winner=home then away else home end,4 from third where finished
 union all select * from ranked_losers where not exists(select 1 from third)
 ) select * from results where exists(select 1 from final) order by place
$$;
revoke all on function public.tournament_placements(uuid) from public,anon;
grant execute on function public.tournament_placements(uuid) to authenticated;

create or replace view public.session_scores with (security_invoker=true) as
with final_ranks as (
 select t.session_id,p.slot,p.place from public.tournaments t
 cross join lateral public.tournament_placements(t.session_id) p
), participation as (
 select tp.session_id,tp.player_id,
 count(*) filter(where g.finished and ((tp.team_slot=g.home and g.away_score=0) or (tp.team_slot=g.away and g.home_score=0)))::integer clean_sheets,
 coalesce(max(5-r.place) filter(where g.finished),0)::integer placement_points,
 count(*) filter(where g.finished)::integer games_played
 from public.tournament_participants tp join public.tournament_games g on g.session_id=tp.session_id and g.number=tp.game_number
 left join final_ranks r on r.session_id=tp.session_id and r.slot=tp.team_slot
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
 'placements',coalesce((select jsonb_agg(p order by place) from public.tournament_placements(p_session_id) p),'[]'),
 'participants',coalesce((select jsonb_agg(p) from public.tournament_participants p where session_id=p_session_id),'[]'),
 'positions',coalesce((select jsonb_agg(p) from public.session_positions p where session_id=p_session_id),'[]'),
 'scores',coalesce((select jsonb_agg(p) from public.session_scores p where session_id=p_session_id),'[]'));
end $$;

create or replace function public.manage_tournament(p_session_id uuid,p_revision integer,p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare game public.tournament_games; session public.sessions; current_revision integer; ids uuid[]; pid uuid; slot integer; losers integer[];
begin
 if not public.is_admin() then raise exception 'Somente o administrador pode editar o campeonato.'; end if;
 select * into session from public.sessions where id=p_session_id for update;
 if not found or session.status='cancelled' then raise exception 'Pelada indisponível ou cancelada.'; end if;
 select revision into current_revision from public.tournaments where session_id=p_session_id for update;
 if current_revision is distinct from p_revision then raise exception 'O campeonato foi atualizado por outro administrador. Atualize e tente novamente.'; end if;
 if p_action in ('third','remove_third') then
  if current_revision is null then raise exception 'Cadastre os quatro times primeiro.'; end if;
  if p_action='third' then
   if (select count(*) from public.tournament_games where session_id=p_session_id and stage='semi' and finished)<>2 then raise exception 'Finalize as duas semifinais.'; end if;
   if exists(select 1 from public.tournament_games where session_id=p_session_id and stage='third') then raise exception 'Disputa de terceiro lugar já gerada.'; end if;
   select array_agg(case when winner=home then away else home end order by number) into losers from public.tournament_games where session_id=p_session_id and stage='semi';
   insert into public.tournament_games(session_id,number,stage,home,away) values(p_session_id,10,'third',losers[1],losers[2]);
   if session.played_on>='2026-11-01' then
    insert into public.tournament_participants(session_id,game_number,player_id,team_slot)
    select p_session_id,10,roster.id,t.slot from public.tournament_teams t
    cross join lateral unnest(t.players) roster(id)
    join public.session_positions sp on sp.session_id=p_session_id and sp.player_id=roster.id
    where t.session_id=p_session_id and t.slot=any(losers);
   end if;
  else
   delete from public.tournament_games where session_id=p_session_id and stage='third';
  end if;
  update public.tournaments set revision=revision+1,updated_at=now() where session_id=p_session_id;
  return public.get_tournament(p_session_id);
 end if;
 if p_action in ('score','finish','reopen','start','pause','reset_timer') and
  exists(select 1 from public.tournament_games where session_id=p_session_id and number=(p_payload->>'number')::integer and stage='semi') and
  exists(select 1 from public.tournament_games where session_id=p_session_id and stage='third') then
  raise exception 'Desfaça o mata-mata antes de corrigir uma fase anterior.';
 end if;
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
  perform public.manage_tournament_legacy(p_session_id,p_revision,p_action,p_payload);
  if session.played_on>='2026-11-01' and p_action in ('teams','semis','final') then
   -- Only initialize the newly created phase; never re-check a player the ADM removed.
   insert into public.tournament_participants(session_id,game_number,player_id,team_slot)
   select g.session_id,g.number,roster.id,t.slot
   from public.tournament_games g join public.tournament_teams t on t.session_id=g.session_id and t.slot in(g.home,g.away)
   cross join lateral unnest(t.players) roster(id)
   join public.session_positions sp on sp.session_id=g.session_id and sp.player_id=roster.id
   where g.session_id=p_session_id and g.stage=case p_action when 'teams' then 'group' when 'semis' then 'semi' else 'final' end
   on conflict do nothing;
  end if;
  return public.get_tournament(p_session_id);
 end if;
end $$;
revoke all on function public.manage_tournament(uuid,integer,text,jsonb) from public,anon;
grant execute on function public.manage_tournament(uuid,integer,text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
