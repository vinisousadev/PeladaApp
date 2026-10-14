begin;
-- Preserve current members. Only subsequent registrations start pending.
alter table public.profiles add column access_status text not null default 'approved' check(access_status in ('pending','approved','rejected'));
alter table public.profiles alter column access_status set default 'pending';
alter table public.profiles add column invited_by uuid references public.profiles(id);
alter table public.profiles add column invitation_reviewed_by uuid references public.profiles(id);
alter table public.profiles add column invitation_reviewed_at timestamptz;
alter table public.profiles add constraint invitation_not_self check(invited_by is distinct from id);
create index profiles_invited_by on public.profiles(invited_by) where invited_by is not null;

create or replace function public.is_member() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=auth.uid() and access_status='approved');
$$;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=auth.uid() and role='admin' and access_status='approved');
$$;
drop policy profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated
 using(id=auth.uid() or public.is_admin() or (access_status='approved' and public.is_member()));
drop policy profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles for update to authenticated
 using(id=auth.uid() and public.is_member()) with check(id=auth.uid() and public.is_member());

create function public.signup_inviters(p_search text) returns table(id uuid,display_name text,"position" text)
language sql stable security definer set search_path='' as $$
 select p.id,p.display_name,p.position from public.profiles p
 where p.access_status='approved' and char_length(trim(p_search)) between 2 and 64
 and strpos(lower(p.display_name),lower(trim(p_search)))>0
 order by p.display_name,p.id limit 30;
$$;

create or replace function public.register_player() returns trigger
language plpgsql security definer set search_path='' as $$
declare player_name text; inviter uuid;
begin
 begin inviter:=nullif(new.raw_user_meta_data->>'invited_by','')::uuid;
 exception when invalid_text_representation then raise exception 'Selecione quem convidou você.'; end;
 if inviter is null or inviter=new.id then raise exception 'Selecione quem convidou você.'; end if;
 perform 1 from public.profiles where id=inviter and access_status='approved' for share;
 if not found then raise exception 'O responsável pelo convite não tem acesso aprovado.'; end if;
 player_name:=trim(new.raw_user_meta_data->>'display_name');
 if player_name is null or char_length(player_name)<2 then raise exception 'Informe seu nome na carta.'; end if;
 insert into public.profiles(id,display_name,role,membership,access_status,invited_by)
 values(new.id,left(player_name,32),'player','guest','pending',inviter);
 return new;
end $$;

create function public.registration_invitations()
returns table(player_id uuid,player_name text,inviter_id uuid,inviter_name text,status text,requested_at timestamptz,reviewed_by_name text,reviewed_at timestamptz)
language sql stable security definer set search_path='' as $$
 select p.id,p.display_name,p.invited_by,i.display_name,p.access_status,p.created_at,r.display_name,p.invitation_reviewed_at
 from public.profiles p join public.profiles i on i.id=p.invited_by
 left join public.profiles r on r.id=p.invitation_reviewed_by
 where auth.uid() is not null and (p.id=auth.uid() or public.is_admin() or (public.is_member() and p.invited_by=auth.uid()))
 order by (p.access_status='pending') desc,p.created_at desc,p.id;
$$;

create function public.review_registration(p_player_id uuid,p_approve boolean,p_expected_status text)
returns void language plpgsql security definer set search_path='' as $$
declare target public.profiles;
begin
 if not public.is_member() or p_approve is null then raise exception 'Acesso não autorizado.'; end if;
 select * into target from public.profiles where id=p_player_id for update;
 if not found or target.invited_by is null then raise exception 'Convite não encontrado.'; end if;
 if target.id=auth.uid() or (target.invited_by<>auth.uid() and not public.is_admin()) then raise exception 'Só quem convidou ou o administrador pode confirmar este cadastro.'; end if;
 if target.access_status is distinct from p_expected_status then raise exception 'Este convite já foi analisado. Atualize a lista.'; end if;
 if target.access_status='approved' or (target.access_status='rejected' and not public.is_admin()) then raise exception 'Este convite já foi analisado.'; end if;
 update public.profiles set access_status=case when p_approve then 'approved' else 'rejected' end,
 invitation_reviewed_by=auth.uid(),invitation_reviewed_at=clock_timestamp() where id=target.id;
end $$;

-- Defense in depth: pending accounts may only read their own profile/status.
do $$ declare tab text; begin
 foreach tab in array array['sessions','attendances','performances','payments','roster_slots','audit_log','review_rounds','review_participants','player_reviews','review_corrections'] loop
  execute format('create policy approved_access on public.%I as restrictive for all to authenticated using(public.is_member()) with check(public.is_member())',tab);
 end loop;
end $$;
create policy approved_storage_access on storage.objects as restrictive for all to authenticated using(public.is_member()) with check(public.is_member());

-- Admin waitlist operations cannot enroll a pending/rejected registration either.
create function public.guard_attendance_access() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.profiles where id=new.player_id and access_status='approved') then
  raise exception 'Este jogador ainda não tem o cadastro aprovado.';
 end if;
 return new;
end $$;
create trigger guard_attendance_access before insert or update on public.attendances for each row execute function public.guard_attendance_access();

revoke all on function public.signup_inviters(text),public.registration_invitations(),public.review_registration(uuid,boolean,text),public.guard_attendance_access(),public.register_player() from public,anon,authenticated;
grant execute on function public.signup_inviters(text) to anon,authenticated;
grant execute on function public.registration_invitations(),public.review_registration(uuid,boolean,text) to authenticated;
notify pgrst,'reload schema';
commit;
