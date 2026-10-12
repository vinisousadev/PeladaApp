begin;
create table public.review_corrections (
 id bigint generated always as identity primary key,
 session_id uuid not null,
 reviewer_id uuid not null,
 player_id uuid not null,
 actor_id uuid not null references public.profiles(id),
 old_attack smallint, old_defense smallint,
 new_attack smallint, new_defense smallint,
 reason text not null check(char_length(reason) between 3 and 500),
 created_at timestamptz not null default clock_timestamp(),
 foreign key(session_id,reviewer_id,player_id) references public.player_reviews(session_id,reviewer_id,player_id) on delete cascade
);
alter table public.review_corrections enable row level security;
revoke all on public.review_corrections from public,anon,authenticated;
revoke all on sequence public.review_corrections_id_seq from public,anon,authenticated;
grant select on public.review_corrections to authenticated;
create policy corrections_admin_read on public.review_corrections for select to authenticated using(public.is_admin());

create function public.admin_review_votes(p_session_id uuid,p_player_id uuid)
returns table(reviewer_id uuid,reviewer_name text,attack smallint,defense smallint,updated_at timestamptz)
language plpgsql stable security definer set search_path='' as $$
begin
 if not coalesce(public.is_admin(),false) then raise exception 'Somente o administrador pode consultar os autores das notas.'; end if;
 return query select v.reviewer_id,p.display_name,v.attack,v.defense,v.updated_at
 from public.player_reviews v join public.profiles p on p.id=v.reviewer_id
 where v.session_id=p_session_id and v.player_id=p_player_id order by p.display_name,v.reviewer_id;
end $$;

create function public.admin_correct_review(p_session_id uuid,p_reviewer_id uuid,p_player_id uuid,p_attack integer,p_defense integer,p_expected_updated_at timestamptz,p_reason text)
returns void language plpgsql security definer set search_path='' as $$
declare previous public.player_reviews;
begin
 if not coalesce(public.is_admin(),false) then raise exception 'Somente o administrador pode corrigir as notas.'; end if;
 if (p_attack is not null and p_attack not between 1 and 5) or (p_defense is not null and p_defense not between 1 and 5) then raise exception 'As notas devem estar entre 1 e 5.'; end if;
 if p_reason is null or char_length(trim(p_reason)) not between 3 and 500 then raise exception 'Informe o motivo da correção (3 a 500 caracteres).'; end if;
 -- Same lock order as submitting a ballot and deleting a match.
 perform 1 from public.sessions where id=p_session_id for update;
 select * into previous from public.player_reviews where session_id=p_session_id and reviewer_id=p_reviewer_id and player_id=p_player_id for update;
 if not found then raise exception 'Esta avaliação não existe. Atualize a lista.'; end if;
 if p_expected_updated_at is distinct from previous.updated_at then raise exception 'A nota foi alterada por outra pessoa. Atualize a lista antes de corrigir.'; end if;
 if previous.attack is not distinct from p_attack and previous.defense is not distinct from p_defense then return; end if;
 insert into public.review_corrections(session_id,reviewer_id,player_id,actor_id,old_attack,old_defense,new_attack,new_defense,reason)
 values(p_session_id,p_reviewer_id,p_player_id,auth.uid(),previous.attack,previous.defense,p_attack,p_defense,trim(p_reason));
 update public.player_reviews set attack=p_attack,defense=p_defense,updated_at=clock_timestamp()
 where session_id=p_session_id and reviewer_id=p_reviewer_id and player_id=p_player_id;
end $$;
revoke all on function public.admin_review_votes(uuid,uuid),public.admin_correct_review(uuid,uuid,uuid,integer,integer,timestamptz,text) from public,anon,authenticated;
grant execute on function public.admin_review_votes(uuid,uuid),public.admin_correct_review(uuid,uuid,uuid,integer,integer,timestamptz,text) to authenticated;
notify pgrst,'reload schema';
commit;
