begin;

-- Horários antigos ficam pendentes, sem inventar o início de uma pelada.
alter table public.sessions add column starts_at timestamptz;
grant update(starts_at) on public.sessions to authenticated;

create function public.session_schedule() returns trigger language plpgsql set search_path='' as $$
begin
  if new.starts_at is null then
    raise exception 'Informe a data e o horário da pelada.';
  end if;
  new.played_on := (new.starts_at at time zone 'America/Sao_Paulo')::date;
  return new;
end $$;
create trigger session_schedule before insert or update of starts_at on public.sessions
  for each row execute function public.session_schedule();
revoke all on function public.session_schedule() from public;

create table public.attendances (
  session_id uuid not null references public.sessions(id),
  player_id uuid not null references public.profiles(id),
  confirmed_at timestamptz not null default now(),
  primary key(session_id,player_id)
);
-- Quem já lançou desempenho mantém a participação.
insert into public.attendances(session_id,player_id)
  select session_id,player_id from public.performances;
alter table public.attendances enable row level security;
revoke all on public.attendances from anon,authenticated;
grant select on public.attendances to authenticated;
create policy attendance_member_read on public.attendances for select to authenticated
  using(public.is_member());

-- Escritas somente por esta função; o cliente não escolhe outro jogador nem o relógio.
create function public.set_attendance(p_session_id uuid,p_confirm boolean) returns void
language plpgsql security definer set search_path='' as $$
declare game public.sessions; player uuid := auth.uid(); current_time_at_lock timestamptz;
begin
  if player is null or not public.is_member() then raise exception 'Acesso não autorizado.'; end if;
  if p_confirm is null then raise exception 'Informe a confirmação.'; end if;
  select * into game from public.sessions where id=p_session_id for update;
  current_time_at_lock := clock_timestamp();
  if game.id is null then raise exception 'Pelada não encontrada.'; end if;
  if p_confirm and exists(select 1 from public.attendances where session_id=game.id and player_id=player) then return; end if;
  if not p_confirm and not exists(select 1 from public.attendances where session_id=game.id and player_id=player) then return; end if;
  if game.status<>'open' then raise exception 'Esta pelada foi encerrada.'; end if;
  if game.starts_at is null then raise exception 'O organizador precisa definir o horário.'; end if;
  if p_confirm then
    if current_time_at_lock>=game.starts_at then raise exception 'As confirmações encerraram no início da pelada.'; end if;
    if (select count(*) from public.attendances where session_id=game.id)>=24 then raise exception 'Esta pelada já tem 24 participantes confirmados.'; end if;
    insert into public.attendances(session_id,player_id) values(game.id,player);
  else
    if current_time_at_lock>game.starts_at-interval '1 hour' then raise exception 'O cancelamento encerrou uma hora antes da pelada.'; end if;
    if exists(select 1 from public.performances where session_id=game.id and player_id=player) then raise exception 'Já existe desempenho registrado para esta presença.'; end if;
    delete from public.attendances where session_id=game.id and player_id=player;
  end if;
end $$;
revoke all on function public.set_attendance(uuid,boolean) from public,anon;
grant execute on function public.set_attendance(uuid,boolean) to authenticated;

create or replace function public.protect_performance() returns trigger language plpgsql security definer set search_path='' as $$
declare game public.sessions;
begin
  if tg_op='UPDATE' and (new.id<>old.id or new.player_id<>old.player_id or new.session_id<>old.session_id) then
    raise exception 'Não é permitido transferir um registro para outra pelada ou jogador.';
  end if;
  select * into game from public.sessions where id=new.session_id for update;
  if game.id is null then raise exception 'Pelada não encontrada.'; end if;
  if not exists(select 1 from public.attendances where session_id=new.session_id and player_id=new.player_id) then
    raise exception 'Confirme sua presença antes de registrar o desempenho.';
  end if;
  if not public.is_admin() and (game.status<>'open' or
    (game.starts_at is not null and clock_timestamp()<game.starts_at) or
    (game.starts_at is null and game.played_on>(now() at time zone 'America/Sao_Paulo')::date)) then
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
