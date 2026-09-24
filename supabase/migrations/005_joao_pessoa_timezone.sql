begin;

-- America/Fortaleza é a zona IANA que atende a Paraíba.
-- Os instantes e as presenças existentes não são alterados.
create or replace function public.session_schedule() returns trigger language plpgsql set search_path='' as $$
begin
  if new.starts_at is null then
    raise exception 'Informe a data e o horário da pelada.';
  end if;
  new.played_on := (new.starts_at at time zone 'America/Fortaleza')::date;
  return new;
end $$;
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
