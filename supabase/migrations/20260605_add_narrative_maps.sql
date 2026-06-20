create table if not exists public.maps (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.campaigns(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  parent_map_id uuid references public.maps(id) on delete set null,
  title text not null,
  description text not null default '',
  image_url text not null default '',
  level_type text not null default 'custom',
  is_active boolean not null default false,
  is_visible_to_players boolean not null default true,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.map_hotspots (
  id uuid primary key default gen_random_uuid(),
  map_id uuid not null references public.maps(id) on delete cascade,
  title text not null,
  description text not null default '',
  type text not null default 'text',
  icon text not null default 'Crosshair',
  color text not null default '#f59e0b',
  x numeric not null default 50,
  y numeric not null default 50,
  target_map_id uuid references public.maps(id) on delete set null,
  target_scene_id uuid references public.scenes(id) on delete set null,
  target_audio_id uuid references public.audio_tracks(id) on delete set null,
  target_event_id uuid,
  is_visible_to_players boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.map_character_positions (
  id uuid primary key default gen_random_uuid(),
  map_id uuid not null references public.maps(id) on delete cascade,
  character_id uuid not null references public.player_characters(id) on delete cascade,
  x numeric not null default 50,
  y numeric not null default 50,
  narrative_location text not null default '',
  is_visible_to_players boolean not null default true,
  is_locked boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (map_id, character_id)
);

create table if not exists public.map_npc_markers (
  id uuid primary key default gen_random_uuid(),
  map_id uuid not null references public.maps(id) on delete cascade,
  npc_id uuid not null references public.npcs(id) on delete cascade,
  x numeric not null default 50,
  y numeric not null default 50,
  is_visible_to_players boolean not null default false,
  status text not null default 'nascosto',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (map_id, npc_id)
);

create table if not exists public.map_custom_markers (
  id uuid primary key default gen_random_uuid(),
  map_id uuid not null references public.maps(id) on delete cascade,
  title text not null,
  description text not null default '',
  type text not null default 'custom',
  icon text not null default 'MapPinned',
  color text not null default '#c8a35d',
  x numeric not null default 50,
  y numeric not null default 50,
  is_visible_to_players boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.map_fog_areas (
  id uuid primary key default gen_random_uuid(),
  map_id uuid not null references public.maps(id) on delete cascade,
  shape_type text not null default 'rect',
  shape_data jsonb not null default '{}'::jsonb,
  is_revealed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.map_events (
  id uuid primary key default gen_random_uuid(),
  map_id uuid not null references public.maps(id) on delete cascade,
  title text not null,
  description text not null default '',
  type text not null default 'manual',
  trigger_type text not null default 'manual',
  target_scene_id uuid references public.scenes(id) on delete set null,
  target_audio_id uuid references public.audio_tracks(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  is_visible_to_players boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.maps enable row level security;
alter table public.map_hotspots enable row level security;
alter table public.map_character_positions enable row level security;
alter table public.map_npc_markers enable row level security;
alter table public.map_custom_markers enable row level security;
alter table public.map_fog_areas enable row level security;
alter table public.map_events enable row level security;

create index if not exists idx_maps_room_active_updated on public.maps(room_id, is_active, updated_at desc);
create index if not exists idx_maps_parent on public.maps(parent_map_id);
create index if not exists idx_map_hotspots_map on public.map_hotspots(map_id, created_at asc);
create index if not exists idx_map_character_positions_map on public.map_character_positions(map_id, updated_at desc);
create index if not exists idx_map_character_positions_character on public.map_character_positions(character_id);
create index if not exists idx_map_npc_markers_map on public.map_npc_markers(map_id, updated_at desc);
create index if not exists idx_map_custom_markers_map on public.map_custom_markers(map_id, created_at asc);
create index if not exists idx_map_fog_areas_map on public.map_fog_areas(map_id);
create index if not exists idx_map_events_map on public.map_events(map_id, created_at asc);

drop policy if exists "room members read maps" on public.maps;
drop policy if exists "masters manage maps" on public.maps;
create policy "room members read maps" on public.maps for select to authenticated using (
  public.is_room_master(room_id)
  or public.is_superadmin()
  or (is_visible_to_players and public.is_room_player(room_id))
);
create policy "masters manage maps" on public.maps for all to authenticated
  using (public.is_room_master(room_id) or public.is_superadmin())
  with check (public.is_room_master(room_id) or public.is_superadmin());

drop policy if exists "room members read map hotspots" on public.map_hotspots;
drop policy if exists "masters manage map hotspots" on public.map_hotspots;
create policy "room members read map hotspots" on public.map_hotspots for select to authenticated using (
  exists (
    select 1 from public.maps m
    where m.id = map_hotspots.map_id
      and (public.is_room_master(m.room_id) or public.is_superadmin() or (map_hotspots.is_visible_to_players and m.is_visible_to_players and public.is_room_player(m.room_id)))
  )
);
create policy "masters manage map hotspots" on public.map_hotspots for all to authenticated
  using (exists (select 1 from public.maps m where m.id = map_hotspots.map_id and (public.is_room_master(m.room_id) or public.is_superadmin())))
  with check (exists (select 1 from public.maps m where m.id = map_hotspots.map_id and (public.is_room_master(m.room_id) or public.is_superadmin())));

drop policy if exists "room members read map character positions" on public.map_character_positions;
drop policy if exists "masters manage map character positions" on public.map_character_positions;
create policy "room members read map character positions" on public.map_character_positions for select to authenticated using (
  exists (
    select 1 from public.maps m
    where m.id = map_character_positions.map_id
      and (public.is_room_master(m.room_id) or public.is_superadmin() or (map_character_positions.is_visible_to_players and m.is_visible_to_players and public.is_room_player(m.room_id)))
  )
);
create policy "masters manage map character positions" on public.map_character_positions for all to authenticated
  using (exists (select 1 from public.maps m where m.id = map_character_positions.map_id and (public.is_room_master(m.room_id) or public.is_superadmin())))
  with check (exists (select 1 from public.maps m where m.id = map_character_positions.map_id and (public.is_room_master(m.room_id) or public.is_superadmin())));

drop policy if exists "room members read map npc markers" on public.map_npc_markers;
drop policy if exists "masters manage map npc markers" on public.map_npc_markers;
create policy "room members read map npc markers" on public.map_npc_markers for select to authenticated using (
  exists (
    select 1 from public.maps m
    where m.id = map_npc_markers.map_id
      and (public.is_room_master(m.room_id) or public.is_superadmin() or (map_npc_markers.is_visible_to_players and m.is_visible_to_players and public.is_room_player(m.room_id)))
  )
);
create policy "masters manage map npc markers" on public.map_npc_markers for all to authenticated
  using (exists (select 1 from public.maps m where m.id = map_npc_markers.map_id and (public.is_room_master(m.room_id) or public.is_superadmin())))
  with check (exists (select 1 from public.maps m where m.id = map_npc_markers.map_id and (public.is_room_master(m.room_id) or public.is_superadmin())));

drop policy if exists "room members read map custom markers" on public.map_custom_markers;
drop policy if exists "masters manage map custom markers" on public.map_custom_markers;
create policy "room members read map custom markers" on public.map_custom_markers for select to authenticated using (
  exists (
    select 1 from public.maps m
    where m.id = map_custom_markers.map_id
      and (public.is_room_master(m.room_id) or public.is_superadmin() or (map_custom_markers.is_visible_to_players and m.is_visible_to_players and public.is_room_player(m.room_id)))
  )
);
create policy "masters manage map custom markers" on public.map_custom_markers for all to authenticated
  using (exists (select 1 from public.maps m where m.id = map_custom_markers.map_id and (public.is_room_master(m.room_id) or public.is_superadmin())))
  with check (exists (select 1 from public.maps m where m.id = map_custom_markers.map_id and (public.is_room_master(m.room_id) or public.is_superadmin())));

drop policy if exists "masters read map fog areas" on public.map_fog_areas;
drop policy if exists "room members read map fog areas" on public.map_fog_areas;
drop policy if exists "masters manage map fog areas" on public.map_fog_areas;
create policy "room members read map fog areas" on public.map_fog_areas for select to authenticated using (
  exists (
    select 1 from public.maps m
    where m.id = map_fog_areas.map_id
      and (public.is_room_master(m.room_id) or public.is_superadmin() or (m.is_visible_to_players and public.is_room_player(m.room_id)))
  )
);
create policy "masters manage map fog areas" on public.map_fog_areas for all to authenticated
  using (exists (select 1 from public.maps m where m.id = map_fog_areas.map_id and (public.is_room_master(m.room_id) or public.is_superadmin())))
  with check (exists (select 1 from public.maps m where m.id = map_fog_areas.map_id and (public.is_room_master(m.room_id) or public.is_superadmin())));

drop policy if exists "room members read visible map events" on public.map_events;
drop policy if exists "masters manage map events" on public.map_events;
create policy "room members read visible map events" on public.map_events for select to authenticated using (
  exists (
    select 1 from public.maps m
    where m.id = map_events.map_id
      and (public.is_room_master(m.room_id) or public.is_superadmin() or (map_events.is_visible_to_players and m.is_visible_to_players and public.is_room_player(m.room_id)))
  )
);
create policy "masters manage map events" on public.map_events for all to authenticated
  using (exists (select 1 from public.maps m where m.id = map_events.map_id and (public.is_room_master(m.room_id) or public.is_superadmin())))
  with check (exists (select 1 from public.maps m where m.id = map_events.map_id and (public.is_room_master(m.room_id) or public.is_superadmin())));
