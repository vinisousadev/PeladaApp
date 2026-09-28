begin;

-- Serialize membership changes and lock each session just like set_attendance.
create or replace function public.set_membership_and_attendance(p_player_id uuid,p_membership text) returns void
language plpgsql security definer set search_path='' as $$
declare previous_membership text; game public.sessions; next_player uuid;
begin
  if not public.is_admin() then raise exception 'Apenas o administrador pode alterar mensalistas.'; end if;
  if p_membership is null or p_membership not in ('monthly','guest') then raise exception 'Tipo de jogador inválido.'; end if;
  perform pg_advisory_xact_lock(240927);
  select membership into previous_membership from public.profiles where id=p_player_id;
  if not found then raise exception 'Jogador não encontrado.'; end if;
  if p_membership='monthly' and previous_membership<>'monthly'
    and (select count(*) from public.profiles where membership='monthly')>=24 then
    raise exception 'O clube já tem 24 mensalistas. Altere um deles para convidado primeiro.';
  end if;
  update public.profiles set membership=p_membership where id=p_player_id;
  -- Repeated saves must not undo a player's cancellation.
  if p_membership<>'monthly' or previous_membership='monthly' then return; end if;
  for game in select * from public.sessions where status='open' and starts_at>clock_timestamp() order by id for update loop
    if game.status<>'open' or game.starts_at<=clock_timestamp() then continue; end if;
    insert into public.attendances(session_id,player_id,status)
      values(game.id,p_player_id,'waiting') on conflict(session_id,player_id) do nothing;
    -- Keep existing confirmations and FIFO order, including an existing waitlist entry.
    while (select count(*) from public.attendances where session_id=game.id and status='confirmed')<24 loop
      select player_id into next_player from public.attendances
        where session_id=game.id and status='waiting' order by queue_order limit 1;
      exit when not found;
      update public.attendances set status='confirmed',confirmed_at=clock_timestamp()
        where session_id=game.id and player_id=next_player;
    end loop;
  end loop;
end $$;
revoke all on function public.set_membership_and_attendance(uuid,text) from public,anon;
grant execute on function public.set_membership_and_attendance(uuid,text) to authenticated;

-- Older clients get the same behavior after the database update.
create or replace function public.set_membership(p_player_id uuid,p_membership text) returns void
language sql security invoker set search_path='' as $$
  select public.set_membership_and_attendance(p_player_id,p_membership);
$$;
revoke all on function public.set_membership(uuid,text) from public,anon;
grant execute on function public.set_membership(uuid,text) to authenticated;
commit;
