begin;
alter table public.sessions add column star_player_id uuid references public.profiles(id);
grant update(star_player_id) on public.sessions to authenticated;
create function public.guard_match_star() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.status='cancelled' then new.star_player_id:=null; return new; end if;
  if new.star_player_id is null then return new; end if;
  if not public.is_admin() then raise exception 'Só o administrador pode escolher o craque.'; end if;
  if tg_op='INSERT' or (new.starts_at is not null and clock_timestamp()<new.starts_at)
    or (new.starts_at is null and new.played_on>(now() at time zone 'America/Fortaleza')::date) then
    raise exception 'Escolha o craque após o início da pelada.';
  end if;
  if not exists(select 1 from public.attendances where session_id=new.id and player_id=new.star_player_id and status='confirmed') then
    raise exception 'O craque precisa ser um participante confirmado.';
  end if;
  return new;
end $$;
create trigger guard_match_star before insert or update on public.sessions
for each row execute function public.guard_match_star();
revoke all on function public.guard_match_star() from public;
commit;
