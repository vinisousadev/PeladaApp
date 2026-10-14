begin;
-- Existing profiles also need a photo, without changing their approval or history.
update public.profiles set requires_registration_photo=true;
create or replace function public.is_member() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=auth.uid() and access_status='approved' and nullif(photo_path,'') is not null);
$$;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=auth.uid() and role='admin' and access_status='approved' and nullif(photo_path,'') is not null);
$$;
-- This narrowly scoped exception lets blocked members complete their own photo.
create or replace function public.can_upload_registration_photo(object_bucket text,object_name text) returns boolean
language sql stable security definer set search_path='' as $$
 select object_bucket='player-photos' and object_name=auth.uid()::text||'/registration.webp'
 and exists(select 1 from public.profiles where id=auth.uid() and (access_status in ('pending','rejected') or nullif(photo_path,'') is null));
$$;
create or replace function public.save_registration_photo() returns void language plpgsql security definer set search_path='' as $$
declare path text:=auth.uid()::text||'/registration.webp';
begin
 perform 1 from public.profiles where id=auth.uid() and (access_status in ('pending','rejected') or nullif(photo_path,'') is null) for update;
 if not found then raise exception 'Este perfil já tem uma foto. Atualize a página.'; end if;
 if not exists(select 1 from storage.objects where bucket_id='player-photos' and name=path) then raise exception 'Envie sua foto antes de continuar.'; end if;
 update public.profiles set photo_path=path where id=auth.uid();
end $$;
notify pgrst,'reload schema';
commit;
