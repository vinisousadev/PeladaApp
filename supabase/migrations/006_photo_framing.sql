begin;
alter table public.profiles
  add column photo_x integer not null default 50 check(photo_x between 0 and 100),
  add column photo_zoom numeric(3,2) not null default 1 check(photo_zoom between 1 and 3);
grant update(photo_x,photo_zoom) on public.profiles to authenticated;
-- A política profiles_self_update continua restringindo alterações ao próprio perfil.
commit;
