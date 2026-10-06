begin;
-- Administrators can inspect partial results without exposing vote authors.
create function public.admin_player_review_results(p_session_id uuid)
returns table(player_id uuid,attack numeric,attack_count bigint,defense numeric,defense_count bigint,overall numeric,attack_notes smallint[],defense_notes smallint[])
language plpgsql stable security definer set search_path='' as $$
begin
 if not coalesce(public.is_admin(),false) then raise exception 'Somente o administrador pode consultar este painel.'; end if;
 return query
 select p.player_id,round(avg(v.attack),2),count(v.attack),round(avg(v.defense),2),count(v.defense),
 round((coalesce(sum(v.attack),0)+coalesce(sum(v.defense),0))::numeric/nullif(count(v.attack)+count(v.defense),0),2),
 coalesce(array_agg(v.attack order by v.attack) filter(where v.attack is not null),'{}'::smallint[]),
 coalesce(array_agg(v.defense order by v.defense) filter(where v.defense is not null),'{}'::smallint[])
 from public.review_participants p left join public.player_reviews v on v.session_id=p.session_id and v.player_id=p.player_id
 where p.session_id=p_session_id group by p.player_id;
end $$;
revoke all on function public.admin_player_review_results(uuid) from public,anon,authenticated;
grant execute on function public.admin_player_review_results(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
