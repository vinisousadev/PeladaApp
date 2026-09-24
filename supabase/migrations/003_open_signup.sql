begin;

-- Cadastros novos sempre são jogadores. Administradores existentes permanecem iguais.
create or replace function public.register_player() returns trigger
language plpgsql security definer set search_path='' as $$
declare player_name text;
begin
  player_name := trim(new.raw_user_meta_data ->> 'display_name');
  if player_name is null or char_length(player_name) < 2 then
    select display_name into player_name from public.roster_slots
      where email=lower(trim(new.email));
  end if;
  if player_name is null or char_length(trim(player_name)) < 2 then
    player_name := 'Jogador';
  end if;
  insert into public.profiles(id,display_name,role)
    values(new.id,left(trim(player_name),32),'player');
  return new;
end $$;
revoke all on function public.register_player() from public;

commit;
