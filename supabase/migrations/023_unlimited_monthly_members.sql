begin;
-- Membership counts are independent of each match's 24 confirmed places.
create or replace function public.set_membership_and_attendance(p_player_id uuid,p_membership text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Apenas o administrador pode alterar mensalistas.'; end if;
 if p_membership is null or p_membership not in ('monthly','guest') then raise exception 'Tipo de jogador inválido.'; end if;
 perform pg_advisory_xact_lock(240927);
 if not exists(select 1 from public.profiles where id=p_player_id) then raise exception 'Jogador não encontrado.'; end if;
 update public.profiles set membership=p_membership where id=p_player_id;
end $$;

notify pgrst,'reload schema';
commit;
