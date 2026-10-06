begin;

-- No historical backfill: only rosters explicitly checked by the administrator.
create table public.review_rounds (
 session_id uuid primary key references public.sessions(id) on delete cascade,
 opened_at timestamptz not null default now(),
 closed_at timestamptz,
 created_by uuid not null references public.profiles(id)
);
create table public.review_participants (
 session_id uuid not null references public.review_rounds(session_id) on delete cascade,
 player_id uuid not null references public.profiles(id),
 waived_at timestamptz,
 waived_by uuid references public.profiles(id),
 help_requested boolean not null default false,
 primary key(session_id,player_id)
);
create table public.player_reviews (
 session_id uuid not null,
 reviewer_id uuid not null,
 player_id uuid not null,
 -- NULL means explicitly skipped; no row means not yet answered.
 attack smallint check(attack between 1 and 5),
 defense smallint check(defense between 1 and 5),
 updated_at timestamptz not null default now(),
 primary key(session_id,reviewer_id,player_id),
 foreign key(session_id,reviewer_id) references public.review_participants(session_id,player_id) on delete cascade,
 foreign key(session_id,player_id) references public.review_participants(session_id,player_id) on delete cascade,
 check(reviewer_id<>player_id)
);
alter table public.review_rounds enable row level security;
alter table public.review_participants enable row level security;
alter table public.player_reviews enable row level security;
revoke all on public.review_rounds,public.review_participants,public.player_reviews from public,anon,authenticated;
grant select on public.review_rounds,public.review_participants,public.player_reviews to authenticated;
create policy rounds_read on public.review_rounds for select to authenticated using(public.is_member());
create policy participants_read on public.review_participants for select to authenticated using(player_id=auth.uid() or public.is_admin());
create policy own_reviews_read on public.player_reviews for select to authenticated using(reviewer_id=auth.uid());

create function public.has_pending_reviews(p_player uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.review_participants p
 join public.review_rounds r using(session_id) join public.sessions s on s.id=r.session_id
 where p.player_id=p_player and p.waived_at is null and r.closed_at is null and s.status='closed'
 and exists(select 1 from public.review_participants target where target.session_id=p.session_id and target.player_id<>p_player
 and not exists(select 1 from public.player_reviews v where v.session_id=p.session_id and v.reviewer_id=p_player and v.player_id=target.player_id)))
$$;

create function public.finish_review_round(p_session_id uuid) returns void
language sql security definer set search_path='' as $$
 update public.review_rounds r set closed_at=clock_timestamp() where r.session_id=p_session_id and r.closed_at is null
 and not exists(select 1 from public.review_participants p where p.session_id=r.session_id and p.waived_at is null
 and exists(select 1 from public.review_participants t where t.session_id=r.session_id and t.player_id<>p.player_id
 and not exists(select 1 from public.player_reviews v where v.session_id=r.session_id and v.reviewer_id=p.player_id and v.player_id=t.player_id)));
$$;

create function public.start_player_reviews(p_session_id uuid,p_players uuid[]) returns void
language plpgsql security definer set search_path='' as $$
declare game public.sessions;
begin
 if not coalesce(public.is_admin(),false) then raise exception 'Somente o administrador pode abrir avaliações.'; end if;
 select * into game from public.sessions where id=p_session_id for update;
 if not found or game.status='cancelled' or game.starts_at is null or game.starts_at>clock_timestamp() then raise exception 'A pelada precisa ter começado e não pode estar cancelada.'; end if;
 if exists(select 1 from public.review_rounds where session_id=game.id) then raise exception 'As avaliações desta pelada já foram abertas.'; end if;
 if coalesce(cardinality(p_players),0)<2 or cardinality(p_players)>24 or exists(select 1 from unnest(p_players) p where p is null)
 or (select count(distinct p) from unnest(p_players) p)<>cardinality(p_players) then raise exception 'Selecione de 2 a 24 participantes distintos.'; end if;
 if exists(select 1 from unnest(p_players) p where not exists(select 1 from public.attendances a where a.session_id=game.id and a.player_id=p and a.status='confirmed')) then raise exception 'Selecione somente jogadores da lista de confirmados.'; end if;
 update public.sessions set status='closed' where id=game.id;
 insert into public.review_rounds(session_id,created_by) values(game.id,auth.uid());
 insert into public.review_participants(session_id,player_id) select game.id,p from unnest(p_players) p;
end $$;

create function public.pending_player_reviews() returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('session_id',r.session_id,'name',s.name,'played_on',s.played_on,
 'help_requested',p.help_requested,'total',(select count(*)-1 from public.review_participants where session_id=r.session_id),
 'targets',(select coalesce(jsonb_agg(jsonb_build_object('id',t.player_id,'name',f.display_name) order by f.display_name,t.player_id),'[]'::jsonb)
 from public.review_participants t join public.profiles f on f.id=t.player_id where t.session_id=r.session_id and t.player_id<>auth.uid()
 and not exists(select 1 from public.player_reviews v where v.session_id=r.session_id and v.reviewer_id=auth.uid() and v.player_id=t.player_id))) order by r.opened_at,r.session_id),'[]'::jsonb)
 from public.review_participants p join public.review_rounds r using(session_id) join public.sessions s on s.id=r.session_id
 where p.player_id=auth.uid() and p.waived_at is null and r.closed_at is null and s.status='closed'
 and exists(select 1 from public.review_participants t where t.session_id=r.session_id and t.player_id<>auth.uid()
 and not exists(select 1 from public.player_reviews v where v.session_id=r.session_id and v.reviewer_id=auth.uid() and v.player_id=t.player_id));
$$;

create function public.submit_player_review(p_session_id uuid,p_player_id uuid,p_attack integer,p_defense integer) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.sessions where id=p_session_id and status='closed' for update;
 if not found then raise exception 'A pelada não está encerrada.'; end if;
 perform 1 from public.review_rounds where session_id=p_session_id and closed_at is null for update;
 if not found then raise exception 'Esta votação já foi encerrada. Atualize a página.'; end if;
 if auth.uid() is null or p_player_id=auth.uid() or not exists(select 1 from public.review_participants where session_id=p_session_id and player_id=auth.uid() and waived_at is null)
 or not exists(select 1 from public.review_participants where session_id=p_session_id and player_id=p_player_id) then raise exception 'Avaliação não permitida para este jogador.'; end if;
 if (p_attack is not null and p_attack not between 1 and 5) or (p_defense is not null and p_defense not between 1 and 5) then raise exception 'As notas devem estar entre 1 e 5.'; end if;
 insert into public.player_reviews(session_id,reviewer_id,player_id,attack,defense) values(p_session_id,auth.uid(),p_player_id,p_attack,p_defense)
 on conflict(session_id,reviewer_id,player_id) do update set attack=excluded.attack,defense=excluded.defense,updated_at=clock_timestamp();
 perform public.finish_review_round(p_session_id);
end $$;

create function public.manage_player_reviews(p_session_id uuid,p_action text,p_player_id uuid default null) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.sessions where id=p_session_id for update;
 perform 1 from public.review_rounds where session_id=p_session_id and closed_at is null for update;
 if not found then raise exception 'A votação já está encerrada.'; end if;
 if p_action='help' then
  update public.review_participants set help_requested=true where session_id=p_session_id and player_id=auth.uid() and waived_at is null;
  if not found then raise exception 'Você não participa desta votação.'; end if;
 else
  if not coalesce(public.is_admin(),false) then raise exception 'Somente o administrador pode dispensar avaliações.'; end if;
  if p_action='waive' then
   update public.review_participants set waived_at=clock_timestamp(),waived_by=auth.uid() where session_id=p_session_id and player_id=p_player_id;
   if not found then raise exception 'Participante não encontrado.'; end if;
   perform public.finish_review_round(p_session_id);
  elsif p_action='close' then
   update public.review_rounds set closed_at=clock_timestamp() where session_id=p_session_id;
  else raise exception 'Ação inválida.';
  end if;
 end if;
end $$;

create function public.player_review_results(p_session_id uuid) returns table(player_id uuid,attack numeric,attack_count bigint,defense numeric,defense_count bigint)
language sql stable security definer set search_path='' as $$
 select p.player_id,round(avg(v.attack),1),count(v.attack),round(avg(v.defense),1),count(v.defense)
 from public.review_participants p join public.review_rounds r using(session_id)
 left join public.player_reviews v on v.session_id=p.session_id and v.player_id=p.player_id
 where p.session_id=p_session_id and r.closed_at is not null and public.is_member()
 group by p.player_id;
$$;

create function public.guard_attendance_reviews() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if (tg_op='INSERT' or new.status is distinct from old.status) and public.has_pending_reviews(new.player_id) then
  raise exception 'Conclua a avaliação da última pelada antes de confirmar uma nova presença.';
 end if;
 return new;
end $$;
create trigger guard_attendance_reviews before insert or update on public.attendances for each row execute function public.guard_attendance_reviews();

revoke all on function public.has_pending_reviews(uuid),public.finish_review_round(uuid),public.guard_attendance_reviews() from public,anon,authenticated;
revoke all on function public.start_player_reviews(uuid,uuid[]),public.pending_player_reviews(),public.submit_player_review(uuid,uuid,integer,integer),public.manage_player_reviews(uuid,text,uuid),public.player_review_results(uuid) from public,anon,authenticated;
grant execute on function public.start_player_reviews(uuid,uuid[]),public.pending_player_reviews(),public.submit_player_review(uuid,uuid,integer,integer),public.manage_player_reviews(uuid,text,uuid),public.player_review_results(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
