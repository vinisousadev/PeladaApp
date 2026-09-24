begin;
alter table public.profiles add column membership text not null default 'guest'
  check(membership in ('monthly','guest'));
alter table public.attendances
  add column status text not null default 'confirmed' check(status in ('confirmed','waiting')),
  add column queue_order bigint generated always as identity;
create index attendance_queue on public.attendances(session_id,status,queue_order);

-- Classificação administrativa: jogadores não podem se promover a mensalistas.
create function public.set_membership(p_player_id uuid,p_membership text) returns void
language plpgsql security definer set search_path='' as $$
begin
  if not public.is_admin() then raise exception 'Apenas o administrador pode alterar mensalistas.'; end if;
  if p_membership is null or p_membership not in ('monthly','guest') then raise exception 'Tipo de jogador inválido.'; end if;
  perform pg_advisory_xact_lock(240927);
  if not exists(select 1 from public.profiles where id=p_player_id) then raise exception 'Jogador não encontrado.'; end if;
  if p_membership='monthly' and exists(select 1 from public.profiles where id=p_player_id and membership<>'monthly')
    and (select count(*) from public.profiles where membership='monthly')>=24 then
    raise exception 'O clube já tem 24 mensalistas. Altere um deles para convidado primeiro.';
  end if;
  update public.profiles set membership=p_membership where id=p_player_id;
end $$;
revoke all on function public.set_membership(uuid,text) from public,anon;
grant execute on function public.set_membership(uuid,text) to authenticated;

create function public.confirm_monthly_players() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  perform pg_advisory_xact_lock(240927);
  if (select count(*) from public.profiles where membership='monthly')>24 then
    raise exception 'Há mais de 24 mensalistas. Ajuste a lista antes de criar a pelada.';
  end if;
  insert into public.attendances(session_id,player_id,status)
    select new.id,p.id,'confirmed' from public.profiles p where p.membership='monthly' order by p.created_at,p.id;
  return new;
end $$;
revoke all on function public.confirm_monthly_players() from public;
create trigger confirm_monthly_players after insert on public.sessions
  for each row execute function public.confirm_monthly_players();

create or replace function public.set_attendance(p_session_id uuid,p_confirm boolean) returns void
language plpgsql security definer set search_path='' as $$
declare game public.sessions; player uuid:=auth.uid(); time_at_lock timestamptz; next_player uuid;
begin
  if player is null or not public.is_member() then raise exception 'Acesso não autorizado.'; end if;
  if p_confirm is null then raise exception 'Informe a confirmação.'; end if;
  select * into game from public.sessions where id=p_session_id for update;
  time_at_lock:=clock_timestamp();
  if game.id is null then raise exception 'Pelada não encontrada.'; end if;
  if p_confirm and exists(select 1 from public.attendances where session_id=game.id and player_id=player) then return; end if;
  if not p_confirm and not exists(select 1 from public.attendances where session_id=game.id and player_id=player) then return; end if;
  if game.status<>'open' then raise exception 'Esta pelada foi encerrada.'; end if;
  if game.starts_at is null then raise exception 'O organizador precisa definir o horário.'; end if;
  if p_confirm then
    if time_at_lock>=game.starts_at then raise exception 'As confirmações encerraram no início da pelada.'; end if;
    -- Toda reinscrição vai ao fim da fila, inclusive de mensalista que cancelou.
    insert into public.attendances(session_id,player_id,status) values(game.id,player,'waiting');
  else
    if time_at_lock>game.starts_at-interval '1 hour' then raise exception 'O cancelamento encerrou uma hora antes da pelada.'; end if;
    if exists(select 1 from public.performances where session_id=game.id and player_id=player) then raise exception 'Já existe desempenho registrado para esta presença.'; end if;
    delete from public.attendances where session_id=game.id and player_id=player;
  end if;
  -- Mesmo bloqueio da pelada protege capacidade e promoção FIFO contra concorrência.
  while (select count(*) from public.attendances where session_id=game.id and status='confirmed')<24 loop
    select player_id into next_player from public.attendances
      where session_id=game.id and status='waiting' order by queue_order limit 1;
    exit when not found;
    update public.attendances set status='confirmed',confirmed_at=clock_timestamp()
      where session_id=game.id and player_id=next_player;
  end loop;
end $$;

-- Espera não conta como participação e não permite lançar gols ou assistências.
create or replace function public.protect_performance() returns trigger language plpgsql security definer set search_path='' as $$
declare game public.sessions;
begin
  if tg_op='UPDATE' and (new.id<>old.id or new.player_id<>old.player_id or new.session_id<>old.session_id) then
    raise exception 'Não é permitido transferir um registro para outra pelada ou jogador.';
  end if;
  select * into game from public.sessions where id=new.session_id for update;
  if game.id is null then raise exception 'Pelada não encontrada.'; end if;
  if not exists(select 1 from public.attendances where session_id=new.session_id and player_id=new.player_id and status='confirmed') then
    raise exception 'Sua presença precisa estar confirmada, fora da lista de espera, para registrar o desempenho.';
  end if;
  if not public.is_admin() and (game.status<>'open' or
    (game.starts_at is not null and clock_timestamp()<game.starts_at) or
    (game.starts_at is null and game.played_on>(now() at time zone 'America/Fortaleza')::date)) then
    raise exception 'Esta pelada não está aberta para registros.';
  end if;
  if tg_op='INSERT' and (game.starts_at is null or clock_timestamp()<game.starts_at) then
    raise exception 'O desempenho só pode ser registrado após o início da pelada.';
  end if;
  new.revision:=case when tg_op='UPDATE' then old.revision+1 else 1 end;
  new.updated_at:=now();
  return new;
end $$;
commit;
