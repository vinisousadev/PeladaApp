begin;
alter table public.profiles add column requires_registration_photo boolean not null default false;
alter table public.profiles alter column requires_registration_photo set default true;

-- Pending accounts may upload only their own fixed onboarding photo.
create function public.can_upload_registration_photo(object_bucket text,object_name text) returns boolean
language sql stable security definer set search_path='' as $$
 select object_bucket='player-photos' and object_name=auth.uid()::text||'/registration.webp'
 and exists(select 1 from public.profiles where id=auth.uid() and access_status in ('pending','rejected') and requires_registration_photo);
$$;
drop policy approved_storage_access on storage.objects;
create policy approved_storage_access on storage.objects as restrictive for all to authenticated
 using(public.is_member() or public.can_upload_registration_photo(bucket_id,name))
 with check(public.is_member() or public.can_upload_registration_photo(bucket_id,name));
create policy registration_photo_read on storage.objects for select to authenticated using(public.can_upload_registration_photo(bucket_id,name));
create policy registration_photo_insert on storage.objects for insert to authenticated with check(public.can_upload_registration_photo(bucket_id,name));
create policy registration_photo_update on storage.objects for update to authenticated using(public.can_upload_registration_photo(bucket_id,name)) with check(public.can_upload_registration_photo(bucket_id,name));

create function public.save_registration_photo() returns void language plpgsql security definer set search_path='' as $$
declare path text:=auth.uid()::text||'/registration.webp';
begin
 perform 1 from public.profiles where id=auth.uid() and access_status in ('pending','rejected') and requires_registration_photo for update;
 if not found then raise exception 'Cadastro não está aguardando foto.'; end if;
 if not exists(select 1 from storage.objects where bucket_id='player-photos' and name=path) then raise exception 'Envie sua foto antes de continuar.'; end if;
 update public.profiles set photo_path=path where id=auth.uid();
end $$;
create function public.require_registration_photo() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.requires_registration_photo and new.access_status='approved' and not exists(select 1 from storage.objects where bucket_id='player-photos' and name=new.photo_path and (storage.foldername(name))[1]=new.id::text) then
 raise exception 'O jogador precisa enviar sua foto antes de ter o cadastro aprovado.';
 end if;
 return new;
end $$;
create trigger require_registration_photo before insert or update of access_status,photo_path on public.profiles for each row execute function public.require_registration_photo();
revoke all on function public.can_upload_registration_photo(text,text),public.save_registration_photo(),public.require_registration_photo() from public,anon,authenticated;
grant execute on function public.can_upload_registration_photo(text,text),public.save_registration_photo() to authenticated;
drop function public.registration_invitations();
create function public.registration_invitations()
returns table(player_id uuid,player_name text,inviter_id uuid,inviter_name text,status text,requested_at timestamptz,reviewed_by_name text,reviewed_at timestamptz,photo_required boolean,has_photo boolean)
language sql stable security definer set search_path='' as $$
 select p.id,p.display_name,p.invited_by,i.display_name,p.access_status,p.created_at,r.display_name,p.invitation_reviewed_at,p.requires_registration_photo,p.photo_path is not null
 from public.profiles p join public.profiles i on i.id=p.invited_by
 left join public.profiles r on r.id=p.invitation_reviewed_by
 where auth.uid() is not null and (p.id=auth.uid() or public.is_admin() or (public.is_member() and p.invited_by=auth.uid()))
 order by (p.access_status in ('pending','rejected')) desc,p.created_at desc,p.id;
$$;

revoke all on function public.registration_invitations() from public,anon;
grant execute on function public.registration_invitations() to authenticated;
notify pgrst,'reload schema';
commit;
