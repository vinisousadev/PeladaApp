begin;
create or replace function public.manage_waitlist(p_session_id uuid,p_player_id uuid,p_action text) returns void
language plpgsql security definer set search_path='' as $$
declare game public.sessions; kind text; attendance_status text;
begin
 if not public.is_admin() then raise exception 'Apenas o administrador pode gerenciar a lista de espera.'; end if;
 if p_action is null or p_action not in ('add','promote') then raise exception 'Ação da lista de espera inválida.'; end if;
 select * into game from public.sessions where id=p_session_id for update;
 if not found then raise exception 'Pelada não encontrada.'; end if;
 if game.status<>'open' then raise exception 'A pelada precisa estar aberta para gerenciar a lista de espera.'; end if;
 -- Administrators can correct an existing waitlist after kickoff, until records close.
 if p_action='add' and (game.starts_at is null or clock_timestamp()>=game.starts_at) then raise exception 'Gerencie a fila somente em peladas abertas antes do início.'; end if;
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
notify pgrst,'reload schema';
commit;
