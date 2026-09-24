begin;
alter table public.sessions drop constraint sessions_status_check;
alter table public.sessions add constraint sessions_status_check check(status in ('open','closed','cancelled'));

-- Enforce the deadline on the server, including direct API updates.
create function public.guard_session_cancellation() returns trigger
language plpgsql set search_path='' as $$
begin
  if tg_op='INSERT' then
    if new.status='cancelled' then raise exception 'Crie a pelada antes de cancelar.'; end if;
    return new;
  end if;
  if old.status='cancelled' then
    raise exception 'Esta pelada foi cancelada. Crie uma nova pelada para jogar novamente.';
  end if;
  if new.status='cancelled' then
    if not public.is_admin() then raise exception 'Apenas o administrador pode cancelar a pelada.'; end if;
    if old.starts_at is null or clock_timestamp()>=old.starts_at then
      raise exception 'Só é possível cancelar a pelada antes do início. Confira o horário.';
    end if;
    if new.starts_at is distinct from old.starts_at then
      raise exception 'Não altere o horário junto com o cancelamento.';
    end if;
  end if;
  return new;
end $$;
create trigger guard_session_cancellation before insert or update on public.sessions
for each row execute function public.guard_session_cancellation();
revoke all on function public.guard_session_cancellation() from public;

create function public.guard_cancelled_performance() returns trigger
language plpgsql security definer set search_path='' as $$
declare game public.sessions;
begin
  select * into game from public.sessions where id=new.session_id for update;
  if game.status='cancelled' then raise exception 'Esta pelada foi cancelada.'; end if;
  return new;
end $$;
create trigger guard_cancelled_performance before insert or update on public.performances
for each row execute function public.guard_cancelled_performance();
revoke all on function public.guard_cancelled_performance() from public;
commit;
