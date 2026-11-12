begin;
-- Called only by the locked, revision-checked administrative tournament RPC.
create function public.correct_tournament_rosters(p_session_id uuid,p_teams jsonb) returns void
language plpgsql security invoker set search_path='' as $$
declare team jsonb; n integer; used uuid[]='{}'; roster uuid[]; before_teams jsonb; modern boolean;
begin
 if jsonb_typeof(p_teams) is distinct from 'array' or jsonb_array_length(p_teams)<>4 then raise exception 'Informe os quatro times.'; end if;
 if (select count(*) from public.tournament_teams where session_id=p_session_id)<>4 then raise exception 'Cadastre os quatro times primeiro.'; end if;
 select jsonb_agg(to_jsonb(t) order by slot) into before_teams from public.tournament_teams t where session_id=p_session_id;
 select played_on>='2026-11-01' into modern from public.sessions where id=p_session_id;
 for team,n in select value,ordinality::integer from jsonb_array_elements(p_teams) with ordinality loop
  if (team->>'slot')::integer is distinct from n then raise exception 'Mantenha a ordem dos quatro times.'; end if;
  if jsonb_typeof(team->'players') is distinct from 'array' then raise exception 'Informe os jogadores de cada time.'; end if;
  select coalesce(array_agg(value::uuid),'{}') into roster from jsonb_array_elements_text(team->'players');
  if cardinality(roster)>6 or cardinality(roster)<>(select count(distinct id) from unnest(roster) id) or roster && used then raise exception 'Cada jogador só pode estar em um time, com até seis jogadores por time.'; end if;
  if exists(select 1 from unnest(roster) id where not exists(select 1 from public.attendances a where a.session_id=p_session_id and a.player_id=id and a.status='confirmed')) then raise exception 'Escolha apenas jogadores confirmados nesta pelada.'; end if;
  used:=used||roster;
  -- Names and slots are part of standings/tiebreaks: only correct the roster.
  update public.tournament_teams set players=roster where session_id=p_session_id and slot=n;
 end loop;
 delete from public.tournament_participants p where p.session_id=p_session_id and not exists(
  select 1 from public.tournament_teams t where t.session_id=p.session_id and t.slot=p.team_slot and p.player_id=any(t.players));
 if modern then
  insert into public.session_positions(session_id,player_id,position)
  select p_session_id,p.id,p.position from public.profiles p where p.id=any(used) on conflict do nothing;
  -- Initialize new roster members only. Existing players' manual exclusions survive.
  insert into public.tournament_participants(session_id,game_number,player_id,team_slot)
  select g.session_id,g.number,member.id,t.slot
  from public.tournament_games g join public.tournament_teams t on t.session_id=g.session_id and t.slot in(g.home,g.away)
  cross join lateral unnest(t.players) member(id)
  where g.session_id=p_session_id and not exists(
   select 1 from jsonb_array_elements(before_teams) old where (old->>'slot')::integer=t.slot and (old->'players') ? member.id::text)
  on conflict do nothing;
 end if;
end $$;
revoke all on function public.correct_tournament_rosters(uuid,jsonb) from public,anon,authenticated;
create or replace function public.manage_tournament(p_session_id uuid,p_revision integer,p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare game public.tournament_games; session public.sessions; current_revision integer; ids uuid[]; pid uuid; slot integer; losers integer[];
begin
 if not public.is_admin() then raise exception 'Somente o administrador pode editar o campeonato.'; end if;
 select * into session from public.sessions where id=p_session_id for update;
 if not found or session.status='cancelled' then raise exception 'Pelada indisponível ou cancelada.'; end if;
 select revision into current_revision from public.tournaments where session_id=p_session_id for update;
 if current_revision is distinct from p_revision then raise exception 'O campeonato foi atualizado por outro administrador. Atualize e tente novamente.'; end if;
 if p_action='correct_rosters' then
  perform public.correct_tournament_rosters(p_session_id,p_payload->'teams');
  update public.tournaments set revision=revision+1,updated_at=now() where session_id=p_session_id;
  return public.get_tournament(p_session_id);
 end if;
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
