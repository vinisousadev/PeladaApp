begin;
create or replace function public.admin_remove_attendance(p_session_id uuid, p_player_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare game public.sessions;
begin
  if not public.is_admin() then
    raise exception 'Somente o administrador pode retirar jogadores dos confirmados.';
  end if;
  select * into game from public.sessions where id=p_session_id for update;
  if not found then raise exception 'Pelada não encontrada.'; end if;
  if game.status <> 'open' then
    raise exception 'Só é possível retirar confirmados de uma pelada aberta.';
  end if;
  if not exists(select 1 from public.attendances where session_id=game.id and player_id=p_player_id and status='confirmed') then return; end if;
  if exists(select 1 from public.performances where session_id=game.id and player_id=p_player_id) then
    raise exception 'Este jogador já tem desempenho registrado nesta pelada. Corrija os números pela Administração; a presença deve ser preservada.';
  end if;
  if game.star_player_id=p_player_id then
    raise exception 'Este jogador é o craque da pelada. Remova ou altere o craque antes de retirar a presença.';
  end if;
  delete from public.attendances where session_id=game.id and player_id=p_player_id and status='confirmed';
  -- The administrator approves waitlist promotions separately. Do not move anyone automatically.
end $$;
revoke all on function public.admin_remove_attendance(uuid,uuid) from public,anon;
grant execute on function public.admin_remove_attendance(uuid,uuid) to authenticated;
commit;
