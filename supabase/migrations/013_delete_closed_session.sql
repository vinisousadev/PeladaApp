begin;

-- Permanent deletion is only available through this administrator-only RPC.
-- The session lock serializes deletion with attendance and performance writes.
create or replace function public.delete_closed_session(p_session_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare game public.sessions;
begin
  if not public.is_admin() then raise exception 'Apenas o administrador pode excluir peladas.'; end if;
  select * into game from public.sessions where id=p_session_id for update;
  if not found then raise exception 'Pelada não encontrada. Atualize a lista.'; end if;
  if game.status<>'closed' then raise exception 'Somente peladas encerradas podem ser excluídas.'; end if;

  delete from public.audit_log where performance_id in
    (select id from public.performances where session_id=game.id);
  delete from public.performances where session_id=game.id;
  delete from public.attendances where session_id=game.id;
  delete from public.sessions where id=game.id;
end $$;
revoke all on function public.delete_closed_session(uuid) from public,anon;
grant execute on function public.delete_closed_session(uuid) to authenticated;
commit;
