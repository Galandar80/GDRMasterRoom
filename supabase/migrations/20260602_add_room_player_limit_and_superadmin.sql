alter table public.rooms add column if not exists max_players integer not null default 4;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'rooms_max_players_check') then
    alter table public.rooms add constraint rooms_max_players_check check (max_players between 1 and 12);
  end if;
end $$;

create or replace function public.is_superadmin()
returns boolean
language sql
stable
as $$
  select
    coalesce((auth.jwt()->'app_metadata'->>'role') = 'superadmin', false)
    or coalesce((auth.jwt()->'app_metadata'->'roles') ? 'superadmin', false)
    or coalesce(auth.jwt()->'app_metadata'->>'is_superadmin' = 'true', false);
$$;

drop policy if exists "masters manage their campaigns" on public.campaigns;
create policy "masters manage their campaigns" on public.campaigns for all to authenticated
  using (master_id = auth.uid() or public.is_superadmin())
  with check (master_id = auth.uid() or public.is_superadmin());

drop policy if exists "masters update rooms" on public.rooms;
drop policy if exists "masters delete rooms" on public.rooms;
create policy "masters update rooms" on public.rooms for update to authenticated
  using (public.is_room_master(id) or public.is_superadmin())
  with check (public.is_room_master(id) or public.is_superadmin());
create policy "masters delete rooms" on public.rooms for delete to authenticated
  using (public.is_room_master(id) or public.is_superadmin());

drop policy if exists "room members read characters" on public.player_characters;
create policy "room members read characters" on public.player_characters for select to authenticated using (
  public.is_room_master(room_id) or public.is_room_player(room_id) or public.is_superadmin()
);
