begin;
-- Keep existing rosters intact; all newly created sessions start empty.
drop trigger if exists confirm_monthly_players on public.sessions;

create or replace function public.set_membership_and_attendance(p_player_id uuid,p_membership text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Apenas o administrador pode alterar mensalistas.'; end if;
 if p_membership is null or p_membership not in ('monthly','guest') then raise exception 'Tipo de jogador inválido.'; end if;
 perform pg_advisory_xact_lock(240927);
 if not exists(select 1 from public.profiles where id=p_player_id) then raise exception 'Jogador não encontrado.'; end if;
 if p_membership='monthly' and exists(select 1 from public.profiles where id=p_player_id and membership<>'monthly') and (select count(*) from public.profiles where membership='monthly')>=24 then
  raise exception 'O clube já tem 24 mensalistas. Altere um deles para convidado primeiro.';
 end if;
 update public.profiles set membership=p_membership where id=p_player_id;
end $$;

create or replace function public.set_attendance_manual(p_session_id uuid,p_confirm boolean) returns void
language plpgsql security definer set search_path='' as $$
declare game public.sessions; player uuid:=auth.uid(); kind text; next_status text;
begin
 if player is null or not public.is_member() then raise exception 'Acesso não autorizado.'; end if;
 if p_confirm is null then raise exception 'Informe a confirmação.'; end if;
 select * into game from public.sessions where id=p_session_id for update;
 if not found then raise exception 'Pelada não encontrada.'; end if;
 if game.status<>'open' or game.starts_at is null then raise exception 'A pelada precisa estar aberta e com horário definido.'; end if;
 if p_confirm then
  if clock_timestamp()>=game.starts_at then raise exception 'As confirmações encerraram no início da pelada.'; end if;
  if exists(select 1 from public.attendances where session_id=game.id and player_id=player) then return; end if;
  select membership into kind from public.profiles where id=player for share;
  next_status:=case when kind='monthly' and (select count(*) from public.attendances where session_id=game.id and status='confirmed')<24 then 'confirmed' else 'waiting' end;
  insert into public.attendances(session_id,player_id,status) values(game.id,player,next_status);
 else
  if not exists(select 1 from public.attendances where session_id=game.id and player_id=player) then return; end if;
  if clock_timestamp()>game.starts_at-interval '1 hour' then raise exception 'O cancelamento encerrou uma hora antes da pelada.'; end if;
  if exists(select 1 from public.performances where session_id=game.id and player_id=player) then raise exception 'Já existe desempenho registrado para esta presença.'; end if;
  delete from public.attendances where session_id=game.id and player_id=player;
 end if;
 -- No automatic promotion, including when someone cancels.
end $$;
revoke all on function public.set_attendance_manual(uuid,boolean) from public,anon;
grant execute on function public.set_attendance_manual(uuid,boolean) to authenticated;
create or replace function public.set_attendance(p_session_id uuid,p_confirm boolean) returns void
language sql security invoker set search_path='' as $$select public.set_attendance_manual(p_session_id,p_confirm);$$;

create or replace function public.manage_waitlist(p_session_id uuid,p_player_id uuid,p_action text) returns void
language plpgsql security definer set search_path='' as $$
declare game public.sessions; kind text; attendance_status text;
begin
 if not public.is_admin() then raise exception 'Apenas o administrador pode gerenciar a lista de espera.'; end if;
 if p_action is null or p_action not in ('add','promote') then raise exception 'Ação da lista de espera inválida.'; end if;
 select * into game from public.sessions where id=p_session_id for update;
 if not found then raise exception 'Pelada não encontrada.'; end if;
 if game.status<>'open' or game.starts_at is null or clock_timestamp()>=game.starts_at then raise exception 'Gerencie a fila somente em peladas abertas antes do início.'; end if;
 select membership into kind from public.profiles where id=p_player_id for share;
 if not found then raise exception 'Jogador não encontrado.'; end if;
 select status into attendance_status from public.attendances where session_id=game.id and player_id=p_player_id;
 if p_action='add' then
  if kind<>'guest' then raise exception 'Adicione apenas convidados à lista de espera. Mensalistas confirmam a própria presença.'; end if;
  if attendance_status is not null then return; end if;
  insert into public.attendances(session_id,player_id,status) values(game.id,p_player_id,'waiting');
 else
  if attendance_status='confirmed' then return; end if;
  if attendance_status is distinct from 'waiting' then raise exception 'O jogador precisa estar na lista de espera.'; end if;
  if (select count(*) from public.attendances where session_id=game.id and status='confirmed')>=24 then raise exception 'A lista principal já tem 24 confirmados.'; end if;
  update public.attendances set status='confirmed',confirmed_at=clock_timestamp() where session_id=game.id and player_id=p_player_id;
 end if;
end $$;
revoke all on function public.manage_waitlist(uuid,uuid,text) from public,anon;
grant execute on function public.manage_waitlist(uuid,uuid,text) to authenticated;
create or replace function public.create_manual_session(p_name text,p_starts_at timestamptz) returns uuid
language plpgsql security definer set search_path='' as $$
declare game_id uuid;
begin
 if not public.is_admin() then raise exception 'Apenas o administrador pode criar peladas.'; end if;
 insert into public.sessions(name,played_on,starts_at,created_by)
 values(trim(p_name),(p_starts_at at time zone 'America/Fortaleza')::date,p_starts_at,auth.uid()) returning id into game_id;
 return game_id;
end $$;
revoke all on function public.create_manual_session(text,timestamptz) from public,anon;
grant execute on function public.create_manual_session(text,timestamptz) to authenticated;
commit;
