begin;
-- Club membership is unrestricted. Capacity applies independently to each game.
drop trigger roster_capacity on public.roster_slots;
drop function public.limit_roster();

create or replace function public.protect_performance() returns trigger language plpgsql security definer set search_path='' as $$
declare match public.sessions;
begin
  if tg_op='UPDATE' and (new.id<>old.id or new.player_id<>old.player_id or new.session_id<>old.session_id) then
    raise exception 'Não é permitido transferir um registro para outra pelada ou jogador.';
  end if;
  -- Serialize registrations and closure of this game, including concurrent requests.
  select * into match from public.sessions where id=new.session_id for update;
  if match.id is null then raise exception 'Pelada não encontrada.'; end if;
  if not public.is_admin() and (match.status<>'open' or match.played_on>(now() at time zone 'America/Sao_Paulo')::date) then
    raise exception 'Esta pelada não está aberta para registros.';
  end if;
  if tg_op='INSERT'
    and not exists(select 1 from public.performances where session_id=new.session_id and player_id=new.player_id)
    and (select count(*) from public.performances where session_id=new.session_id)>=24 then
    raise exception 'Esta pelada já tem 24 participantes registrados.';
  end if;
  new.revision:=case when tg_op='UPDATE' then old.revision+1 else 1 end;
  new.updated_at:=now();
  return new;
end $$;
commit;
