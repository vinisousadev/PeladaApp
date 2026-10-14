begin;
-- Keep the no-argument function for compatibility with already open clients.
create function public.save_registration_photo(p_photo_x integer,p_photo_y integer,p_photo_zoom numeric)
returns void language plpgsql security definer set search_path='' as $$
begin
 if p_photo_x is null or p_photo_x not between 0 and 100 or p_photo_y is null or p_photo_y not between 0 and 100 or p_photo_zoom is null or p_photo_zoom not between 1 and 3 then
  raise exception 'Enquadramento inválido. Use posições entre 0 e 100 e zoom entre 1 e 3.';
 end if;
 -- Existing function locks the caller profile and verifies their uploaded file.
 perform public.save_registration_photo();
 update public.profiles set photo_x=p_photo_x,photo_y=p_photo_y,photo_zoom=p_photo_zoom where id=auth.uid();
end $$;
revoke all on function public.save_registration_photo(integer,integer,numeric) from public,anon,authenticated;
grant execute on function public.save_registration_photo(integer,integer,numeric) to authenticated;
notify pgrst,'reload schema';
commit;
