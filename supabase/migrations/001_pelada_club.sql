begin;

create table public.roster_slots (
  email text primary key check (email = lower(trim(email)) and email ~ '^[^ @]+@[^ @]+\.[^ @]+$'),
  display_name text not null check (char_length(trim(display_name)) between 2 and 32),
  role text not null default 'player' check (role in ('player','admin')),
  created_at timestamptz not null default now()
);
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 2 and 32),
  position text not null default 'MEI' check(position in ('GOL','DEF','MEI','ATA')),
  role text not null default 'player' check(role in ('player','admin')),
  photo_path text check(photo_path is null or photo_path like id::text || '/%'),
  photo_y integer not null default 25 check(photo_y between 0 and 100),
  created_at timestamptz not null default now()
);
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  name text not null check(char_length(trim(name)) between 2 and 80),
  played_on date not null,
  status text not null default 'open' check(status in ('open','closed')),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create table public.performances (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id),
  player_id uuid not null references public.profiles(id),
  goals integer not null default 0 check(goals between 0 and 99),
  assists integer not null default 0 check(assists between 0 and 99),
  revision integer not null default 1,
  updated_at timestamptz not null default now(),
  unique(session_id,player_id)
);
create table public.audit_log (
  id bigint generated always as identity primary key,
  performance_id uuid not null references public.performances(id),
  actor_id uuid references public.profiles(id),
  action text not null,
  old_values jsonb,
  new_values jsonb not null,
  created_at timestamptz not null default now()
);
create index performances_player on public.performances(player_id);
create index sessions_month on public.sessions(played_on);
create index audit_recent on public.audit_log(created_at desc);

create function public.is_member() returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.profiles where id=auth.uid());
$$;
create function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.profiles where id=auth.uid() and role='admin');
$$;
revoke all on function public.is_member() from public;
revoke all on function public.is_admin() from public;
grant execute on function public.is_member(),public.is_admin() to authenticated;

create function public.limit_roster() returns trigger language plpgsql security definer set search_path='' as $$
begin
  perform pg_advisory_xact_lock(240926);
  if (select count(*) from public.roster_slots)>=24 then raise exception 'O elenco já possui 24 vagas.'; end if;
  return new;
end $$;
create trigger roster_capacity before insert on public.roster_slots for each row execute function public.limit_roster();

create function public.register_player() returns trigger language plpgsql security definer set search_path='' as $$
declare slot public.roster_slots;
begin
  select * into slot from public.roster_slots where email=lower(trim(new.email));
  if slot.email is null then raise exception 'Cadastro restrito aos jogadores autorizados.'; end if;
  insert into public.profiles(id,display_name,role) values(new.id,slot.display_name,slot.role);
  return new;
end $$;
create trigger pelada_register_player after insert on auth.users for each row execute function public.register_player();

create function public.protect_performance() returns trigger language plpgsql security definer set search_path='' as $$
declare match public.sessions;
begin
  if tg_op='UPDATE' and (new.id<>old.id or new.player_id<>old.player_id or new.session_id<>old.session_id) then
    raise exception 'Não é permitido transferir um registro para outra pelada ou jogador.';
  end if;
  select * into match from public.sessions where id=new.session_id for share;
  if match.id is null then raise exception 'Pelada não encontrada.'; end if;
  if not public.is_admin() and (match.status<>'open' or match.played_on>(now() at time zone 'America/Sao_Paulo')::date) then
    raise exception 'Esta pelada não está aberta para registros.';
  end if;
  new.revision:=case when tg_op='UPDATE' then old.revision+1 else 1 end;
  new.updated_at:=now();
  return new;
end $$;
create trigger protect_performance before insert or update on public.performances for each row execute function public.protect_performance();

create function public.audit_performance() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.audit_log(performance_id,actor_id,action,old_values,new_values)
  values(new.id,auth.uid(),tg_op,case when tg_op='UPDATE' then to_jsonb(old) else null end,to_jsonb(new));
  return new;
end $$;
create trigger audit_performance after insert or update on public.performances for each row execute function public.audit_performance();
revoke all on function public.limit_roster(),public.register_player(),public.protect_performance(),public.audit_performance() from public;

alter table public.profiles enable row level security;
alter table public.roster_slots enable row level security;
alter table public.sessions enable row level security;
alter table public.performances enable row level security;
alter table public.audit_log enable row level security;
revoke all on public.profiles,public.roster_slots,public.sessions,public.performances,public.audit_log from anon,authenticated;
grant select on public.profiles,public.sessions,public.performances to authenticated;
grant update(display_name,position,photo_path,photo_y) on public.profiles to authenticated;
grant select,insert on public.roster_slots to authenticated;
grant insert on public.sessions to authenticated;
grant update(status) on public.sessions to authenticated;
grant insert(session_id,player_id,goals,assists),update(goals,assists) on public.performances to authenticated;
grant select on public.audit_log to authenticated;

create policy profiles_read on public.profiles for select to authenticated using(public.is_member());
create policy profiles_self_update on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy roster_admin_read on public.roster_slots for select to authenticated using(public.is_admin());
create policy roster_admin_insert on public.roster_slots for insert to authenticated with check(public.is_admin() and role='player');
create policy sessions_read on public.sessions for select to authenticated using(public.is_member());
create policy sessions_admin_insert on public.sessions for insert to authenticated with check(public.is_admin() and created_by=auth.uid());
create policy sessions_admin_update on public.sessions for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy performances_read on public.performances for select to authenticated using(public.is_member());
create policy performances_insert on public.performances for insert to authenticated with check(public.is_member() and (player_id=auth.uid() or public.is_admin()));
create policy performances_update on public.performances for update to authenticated using(player_id=auth.uid() or public.is_admin()) with check(player_id=auth.uid() or public.is_admin());
create policy audit_admin_read on public.audit_log for select to authenticated using(public.is_admin());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('player-photos','player-photos',false,5242880,array['image/jpeg','image/png','image/webp']);
create policy photo_member_read on storage.objects for select to authenticated using(bucket_id='player-photos' and public.is_member());
create policy photo_self_insert on storage.objects for insert to authenticated with check(bucket_id='player-photos' and public.is_member() and (storage.foldername(name))[1]=auth.uid()::text);
create policy photo_self_update on storage.objects for update to authenticated using(bucket_id='player-photos' and public.is_member() and (storage.foldername(name))[1]=auth.uid()::text) with check(bucket_id='player-photos' and (storage.foldername(name))[1]=auth.uid()::text);
create policy photo_self_delete on storage.objects for delete to authenticated using(bucket_id='player-photos' and public.is_member() and (storage.foldername(name))[1]=auth.uid()::text);
commit;
