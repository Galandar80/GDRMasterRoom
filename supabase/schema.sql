create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  username text not null,
  role text not null default 'player' check (role in ('master', 'player')),
  created_at timestamptz not null default now()
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  master_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  genre text not null default '',
  cover_image_url text not null default '',
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  created_at timestamptz not null default now()
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  name text not null,
  invite_code text not null unique,
  max_players integer not null default 4 check (max_players between 1 and 12),
  current_scene_id uuid,
  current_audio_id uuid,
  chat_enabled boolean not null default true,
  muted_user_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.rooms add column if not exists chat_enabled boolean not null default true;
alter table public.rooms add column if not exists muted_user_ids uuid[] not null default '{}';
alter table public.rooms add column if not exists max_players integer not null default 4;
alter table public.rooms add column if not exists spotlight_visibility text not null default 'off' check (spotlight_visibility in ('off', 'public', 'private'));
alter table public.rooms add column if not exists spotlight_user_ids uuid[] not null default '{}';
alter table public.rooms add column if not exists current_sound_effect_id uuid;
alter table public.rooms add column if not exists sound_effect_started_at timestamptz;
alter table public.rooms add column if not exists turn_enabled boolean not null default false;
alter table public.rooms add column if not exists turn_order uuid[] not null default '{}';
alter table public.rooms add column if not exists current_turn_index integer not null default 0;
alter table public.rooms add column if not exists audio_status text not null default 'playing';
alter table public.rooms add column if not exists audio_volume integer not null default 55;

create table if not exists public.player_characters (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  character_name text not null,
  character_surname text not null default '',
  portrait_url text not null default '',
  color text not null default '#f59e0b',
  hp integer not null default 10,
  mental_state text not null default 'stabile',
  public_background text not null default '',
  visible_status text not null default 'stabile',
  conditions text[] not null default '{}',
  is_setup_complete boolean not null default false,
  created_at timestamptz not null default now(),
  unique (room_id, user_id)
);

alter table public.player_characters add column if not exists is_setup_complete boolean not null default false;
alter table public.player_characters add column if not exists conditions text[] not null default '{}';

create table if not exists public.scenes (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  title text not null,
  description text not null default '',
  image_url text not null default '',
  media_type text not null default 'image' check (media_type in ('image', 'video')),
  video_url text,
  loop_video boolean not null default true,
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  visible_user_ids uuid[] not null default '{}',
  linked_audio_id uuid,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.scenes add column if not exists media_type text not null default 'image';
alter table public.scenes add column if not exists video_url text;
alter table public.scenes add column if not exists loop_video boolean not null default true;
alter table public.scenes add column if not exists visibility text not null default 'public';
alter table public.scenes add column if not exists visible_user_ids uuid[] not null default '{}';
alter table public.scenes add column if not exists linked_audio_id uuid;

create table if not exists public.npcs (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  name text not null,
  portrait_url text,
  color text not null default '#84cc16',
  description text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.audio_tracks (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  title text not null,
  audio_url text not null default '',
  loop boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.sound_effects (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  title text not null,
  audio_url text not null default '',
  loop boolean not null default false,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_attribute where attrelid = 'public.rooms'::regclass and attname = 'spotlight_npc_id') then
    alter table public.rooms add column spotlight_npc_id uuid references public.npcs(id) on delete set null;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'rooms_current_scene_id_fkey') then
    alter table public.rooms
      add constraint rooms_current_scene_id_fkey foreign key (current_scene_id) references public.scenes(id) on delete set null;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'rooms_current_audio_id_fkey') then
    alter table public.rooms
      add constraint rooms_current_audio_id_fkey foreign key (current_audio_id) references public.audio_tracks(id) on delete set null;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'rooms_current_sound_effect_id_fkey') then
    alter table public.rooms
      add constraint rooms_current_sound_effect_id_fkey foreign key (current_sound_effect_id) references public.sound_effects(id) on delete set null;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'scenes_linked_audio_id_fkey') then
    alter table public.scenes
      add constraint scenes_linked_audio_id_fkey foreign key (linked_audio_id) references public.audio_tracks(id) on delete set null;
  end if;
end $$;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  sender_user_id uuid references public.users(id) on delete set null,
  sender_type text not null check (sender_type in ('master', 'player', 'npc', 'system')),
  sender_display_name text not null,
  sender_color text not null default '#ffffff',
  npc_id uuid references public.npcs(id) on delete set null,
  content text not null,
  is_private boolean not null default false,
  channel text not null default 'gdr' check (channel in ('gdr', 'off')),
  is_pinned boolean not null default false,
  edited_at timestamptz,
  recipient_user_id uuid references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.messages add column if not exists channel text not null default 'gdr';
alter table public.messages add column if not exists is_pinned boolean not null default false;
alter table public.messages add column if not exists edited_at timestamptz;

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  title text not null,
  asset_type text not null default 'image' check (asset_type in ('image', 'video', 'audio', 'sound', 'portrait', 'object', 'map')),
  url text not null default '',
  tags text[] not null default '{}',
  created_by uuid references public.users(id) on delete set null,
  owner_id uuid references public.users(id) on delete set null,
  visibility text not null default 'room' check (visibility in ('private', 'room', 'shared', 'global')),
  approval_status text not null default 'none' check (approval_status in ('none', 'pending', 'approved', 'rejected')),
  file_size bigint not null default 0,
  mime_type text,
  storage_bucket text,
  storage_path text,
  description text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.room_presence (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  display_name text not null default '',
  role text not null default 'player' check (role in ('master', 'player')),
  last_seen_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table if not exists public.room_typing (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  display_name text not null default '',
  channel text not null default 'gdr' check (channel in ('gdr', 'off', 'private')),
  recipient_user_id uuid references public.users(id) on delete cascade,
  updated_at timestamptz not null default now(),
  primary key (room_id, user_id, channel)
);

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.player_characters(id) on delete cascade,
  name text not null,
  description text not null default '',
  quantity integer not null default 1,
  image_url text,
  is_public boolean not null default false,
  master_notes text,
  player_notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.dice_requests (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  requested_by uuid references public.users(id) on delete set null,
  target_user_id uuid references public.users(id) on delete cascade,
  dice_sides integer not null check (dice_sides >= 2 and dice_sides <= 1000),
  reason text not null default '',
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  status text not null default 'pending' check (status in ('pending', 'rolled')),
  result integer,
  created_at timestamptz not null default now(),
  rolled_at timestamptz
);

create table if not exists public.player_notes (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.player_characters(id) on delete cascade,
  title text not null,
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists player_notes_set_updated_at on public.player_notes;
create trigger player_notes_set_updated_at
before update on public.player_notes
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, username, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'username', split_part(coalesce(new.email, ''), '@', 1), 'Giocatore'),
    'player'
  )
  on conflict (id) do update
    set email = excluded.email,
        username = coalesce(nullif(public.users.username, ''), excluded.username);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_room_master(target_room_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from rooms r
    join campaigns c on c.id = r.campaign_id
    where r.id = target_room_id and c.master_id = auth.uid()
  );
$$;

create or replace function public.is_room_player(target_room_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from player_characters pc
    where pc.room_id = target_room_id and pc.user_id = auth.uid()
  );
$$;

create or replace function public.is_superadmin()
returns boolean
language sql
stable
set search_path = public
as $$
  select
    coalesce((auth.jwt()->'app_metadata'->>'role') = 'superadmin', false)
    or coalesce((auth.jwt()->'app_metadata'->'roles') ? 'superadmin', false)
    or coalesce(auth.jwt()->'app_metadata'->>'is_superadmin' = 'true', false);
$$;

create or replace function public.lookup_room_by_invite_code(lookup_code text)
returns table (
  id uuid,
  campaign_id uuid,
  name text,
  invite_code text,
  max_players integer,
  current_scene_id uuid,
  current_audio_id uuid,
  chat_enabled boolean,
  muted_user_ids uuid[],
  created_at timestamptz,
  spotlight_visibility text,
  spotlight_user_ids uuid[],
  current_sound_effect_id uuid,
  sound_effect_started_at timestamptz,
  turn_enabled boolean,
  turn_order uuid[],
  current_turn_index integer,
  audio_status text,
  audio_volume integer,
  spotlight_npc_id uuid,
  campaign_master_id uuid,
  player_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    r.id,
    r.campaign_id,
    r.name,
    r.invite_code,
    r.max_players,
    r.current_scene_id,
    r.current_audio_id,
    r.chat_enabled,
    r.muted_user_ids,
    r.created_at,
    r.spotlight_visibility,
    r.spotlight_user_ids,
    r.current_sound_effect_id,
    r.sound_effect_started_at,
    r.turn_enabled,
    r.turn_order,
    r.current_turn_index,
    r.audio_status,
    r.audio_volume,
    r.spotlight_npc_id,
    c.master_id as campaign_master_id,
    count(pc.id) as player_count
  from public.rooms r
  join public.campaigns c on c.id = r.campaign_id
  left join public.player_characters pc on pc.room_id = r.id
  where r.invite_code = upper(trim(lookup_code))
  group by r.id, c.master_id;
$$;

alter table public.users enable row level security;
alter table public.campaigns enable row level security;
alter table public.rooms enable row level security;
alter table public.player_characters enable row level security;
alter table public.scenes enable row level security;
alter table public.npcs enable row level security;
alter table public.audio_tracks enable row level security;
alter table public.sound_effects enable row level security;
alter table public.messages enable row level security;
alter table public.media_assets enable row level security;
alter table public.room_presence enable row level security;
alter table public.room_typing enable row level security;
alter table public.dice_requests enable row level security;
alter table public.inventory_items enable row level security;
alter table public.player_notes enable row level security;

create index if not exists idx_campaigns_master_created on public.campaigns(master_id, created_at desc);
create index if not exists idx_rooms_campaign_created on public.rooms(campaign_id, created_at desc);
create index if not exists idx_rooms_invite_code on public.rooms(invite_code);
create index if not exists idx_scenes_room_created on public.scenes(room_id, created_at desc);
create index if not exists idx_scenes_linked_audio on public.scenes(linked_audio_id);
create index if not exists idx_player_characters_room_created on public.player_characters(room_id, created_at asc);
create index if not exists idx_player_characters_user_room on public.player_characters(user_id, room_id);
create index if not exists idx_messages_room_created on public.messages(room_id, created_at desc);
create index if not exists idx_messages_room_private_recipient_created on public.messages(room_id, is_private, recipient_user_id, created_at desc);
create index if not exists idx_audio_tracks_room_created on public.audio_tracks(room_id, created_at asc);
create index if not exists idx_sound_effects_room_created on public.sound_effects(room_id, created_at asc);
create index if not exists idx_npcs_room_created on public.npcs(room_id, created_at asc);
create index if not exists idx_inventory_items_character_created on public.inventory_items(character_id, created_at asc);
create index if not exists idx_player_notes_character_updated on public.player_notes(character_id, updated_at desc);
create index if not exists idx_dice_requests_room_created on public.dice_requests(room_id, created_at desc);
create index if not exists idx_media_assets_room_created on public.media_assets(room_id, created_at desc);
create index if not exists media_assets_owner_created_idx on public.media_assets(owner_id, created_at desc);
create index if not exists media_assets_visibility_idx on public.media_assets(visibility, approval_status, asset_type);
create index if not exists media_assets_room_type_idx on public.media_assets(room_id, asset_type, created_at desc);
create index if not exists idx_room_presence_room_seen on public.room_presence(room_id, last_seen_at desc);

drop policy if exists "profiles are visible to authenticated users" on public.users;
drop policy if exists "users create their profile" on public.users;
drop policy if exists "users update their profile" on public.users;
create policy "profiles are visible to authenticated users" on public.users for select to authenticated using (true);
create policy "users create their profile" on public.users for insert to authenticated with check (id = auth.uid());
create policy "users update their profile" on public.users for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "masters manage their campaigns" on public.campaigns;
drop policy if exists "players read joined campaigns" on public.campaigns;
create policy "masters manage their campaigns" on public.campaigns for all to authenticated
  using (master_id = auth.uid() or public.is_superadmin())
  with check (master_id = auth.uid() or public.is_superadmin());
create policy "players read joined campaigns" on public.campaigns for select to authenticated using (
  exists (
    select 1
    from rooms r
    join player_characters pc on pc.room_id = r.id
    where r.campaign_id = campaigns.id and pc.user_id = auth.uid()
  )
);

drop policy if exists "authenticated users can find rooms by invite code" on public.rooms;
drop policy if exists "room members read rooms" on public.rooms;
drop policy if exists "masters insert rooms" on public.rooms;
drop policy if exists "masters update rooms" on public.rooms;
drop policy if exists "masters delete rooms" on public.rooms;
drop policy if exists "masters manage rooms" on public.rooms;
create policy "room members read rooms" on public.rooms for select to authenticated using (
  public.is_superadmin()
  or public.is_room_master(id)
  or public.is_room_player(id)
);
create policy "masters insert rooms" on public.rooms for insert to authenticated with check (
  exists (select 1 from campaigns c where c.id = rooms.campaign_id and c.master_id = auth.uid())
);
create policy "masters update rooms" on public.rooms for update to authenticated
  using (public.is_room_master(id) or public.is_superadmin())
  with check (public.is_room_master(id) or public.is_superadmin());
create policy "masters delete rooms" on public.rooms for delete to authenticated
  using (public.is_room_master(id) or public.is_superadmin());

drop policy if exists "room members read characters" on public.player_characters;
drop policy if exists "masters manage characters" on public.player_characters;
drop policy if exists "players create own character" on public.player_characters;
drop policy if exists "players update own character notes fields" on public.player_characters;
create policy "room members read characters" on public.player_characters for select to authenticated using (
  public.is_room_master(room_id) or public.is_room_player(room_id) or public.is_superadmin()
);
create policy "masters manage characters" on public.player_characters for all to authenticated
  using (public.is_room_master(room_id))
  with check (public.is_room_master(room_id));
create policy "players create own character" on public.player_characters for insert to authenticated with check (
  user_id = auth.uid()
);
create policy "players update own character notes fields" on public.player_characters for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "room members read scenes" on public.scenes;
drop policy if exists "masters manage scenes" on public.scenes;
create policy "room members read scenes" on public.scenes for select to authenticated using (
  public.is_superadmin()
  or public.is_room_master(room_id)
  or (
    public.is_room_player(room_id)
    and (
      visibility = 'public'
      or auth.uid() = any(visible_user_ids)
    )
  )
);
create policy "masters manage scenes" on public.scenes for all to authenticated
  using (public.is_room_master(room_id) or public.is_superadmin())
  with check (public.is_room_master(room_id) or public.is_superadmin());

drop policy if exists "room members read npcs" on public.npcs;
drop policy if exists "masters manage npcs" on public.npcs;
create policy "room members read npcs" on public.npcs for select to authenticated using (
  public.is_room_master(room_id) or public.is_room_player(room_id)
);
create policy "masters manage npcs" on public.npcs for all to authenticated
  using (public.is_room_master(room_id))
  with check (public.is_room_master(room_id));

drop policy if exists "room members read audio" on public.audio_tracks;
drop policy if exists "masters manage audio" on public.audio_tracks;
create policy "room members read audio" on public.audio_tracks for select to authenticated using (
  public.is_room_master(room_id) or public.is_room_player(room_id) or public.is_superadmin()
);
create policy "masters manage audio" on public.audio_tracks for all to authenticated
  using (public.is_room_master(room_id) or public.is_superadmin())
  with check (public.is_room_master(room_id) or public.is_superadmin());

drop policy if exists "room members read sound effects" on public.sound_effects;
drop policy if exists "masters manage sound effects" on public.sound_effects;
create policy "room members read sound effects" on public.sound_effects for select to authenticated using (
  public.is_room_master(room_id) or public.is_room_player(room_id) or public.is_superadmin()
);
create policy "masters manage sound effects" on public.sound_effects for all to authenticated
  using (public.is_room_master(room_id) or public.is_superadmin())
  with check (public.is_room_master(room_id) or public.is_superadmin());

drop policy if exists "read public messages and own private messages" on public.messages;
drop policy if exists "members create messages" on public.messages;
drop policy if exists "masters delete messages" on public.messages;
create policy "read public messages and own private messages" on public.messages for select to authenticated using (
  public.is_room_master(room_id)
  or (not is_private and public.is_room_player(room_id))
  or (is_private and (sender_user_id = auth.uid() or recipient_user_id = auth.uid()))
);
create policy "members create messages" on public.messages for insert to authenticated with check (
  public.is_room_master(room_id)
  or (public.is_room_player(room_id) and sender_user_id = auth.uid() and sender_type = 'player')
);
create policy "masters delete messages" on public.messages for delete to authenticated using (
  public.is_room_master(room_id) or sender_user_id = auth.uid()
);
drop policy if exists "senders update own messages and masters pin" on public.messages;
create policy "senders update own messages and masters pin" on public.messages for update to authenticated
  using (public.is_room_master(room_id) or sender_user_id = auth.uid())
  with check (public.is_room_master(room_id) or sender_user_id = auth.uid());

drop policy if exists "room members read media assets" on public.media_assets;
drop policy if exists "masters manage media assets" on public.media_assets;
drop policy if exists "members read reusable media assets" on public.media_assets;
drop policy if exists "members create reusable media assets" on public.media_assets;
drop policy if exists "owners masters and superadmins update media assets" on public.media_assets;
drop policy if exists "owners masters and superadmins delete media assets" on public.media_assets;
create policy "members read reusable media assets" on public.media_assets for select to authenticated using (
  public.is_superadmin()
  or owner_id = auth.uid()
  or public.is_room_master(room_id)
  or public.is_room_player(room_id)
  or visibility = 'shared'
  or (visibility = 'global' and approval_status = 'approved')
);
create policy "members create reusable media assets" on public.media_assets for insert to authenticated with check (
  created_by = auth.uid()
  and coalesce(owner_id, created_by) = auth.uid()
  and (public.is_room_master(room_id) or public.is_room_player(room_id) or public.is_superadmin())
);
create policy "owners masters and superadmins update media assets" on public.media_assets for update to authenticated
  using (
    public.is_superadmin()
    or owner_id = auth.uid()
    or created_by = auth.uid()
    or public.is_room_master(room_id)
  )
  with check (
    public.is_superadmin()
    or owner_id = auth.uid()
    or created_by = auth.uid()
    or public.is_room_master(room_id)
  );
create policy "owners masters and superadmins delete media assets" on public.media_assets for delete to authenticated using (
  public.is_superadmin()
  or owner_id = auth.uid()
  or created_by = auth.uid()
  or public.is_room_master(room_id)
);

drop policy if exists "room members read presence" on public.room_presence;
drop policy if exists "members upsert own presence" on public.room_presence;
drop policy if exists "members update own presence" on public.room_presence;
drop policy if exists "members delete own presence" on public.room_presence;
create policy "room members read presence" on public.room_presence for select to authenticated using (
  public.is_room_master(room_id) or public.is_room_player(room_id)
);
create policy "members upsert own presence" on public.room_presence for insert to authenticated with check (
  user_id = auth.uid() and (public.is_room_master(room_id) or public.is_room_player(room_id))
);
create policy "members update own presence" on public.room_presence for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy "members delete own presence" on public.room_presence for delete to authenticated using (user_id = auth.uid());

drop policy if exists "room members read typing" on public.room_typing;
drop policy if exists "members upsert own typing" on public.room_typing;
drop policy if exists "members update own typing" on public.room_typing;
drop policy if exists "members delete own typing" on public.room_typing;
create policy "room members read typing" on public.room_typing for select to authenticated using (
  public.is_room_master(room_id) or public.is_room_player(room_id)
);
create policy "members upsert own typing" on public.room_typing for insert to authenticated with check (
  user_id = auth.uid() and (public.is_room_master(room_id) or public.is_room_player(room_id))
);
create policy "members update own typing" on public.room_typing for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy "members delete own typing" on public.room_typing for delete to authenticated using (user_id = auth.uid());

drop policy if exists "members read dice requests" on public.dice_requests;
drop policy if exists "masters create dice requests" on public.dice_requests;
drop policy if exists "targets roll dice requests" on public.dice_requests;
create policy "members read dice requests" on public.dice_requests for select to authenticated using (
  public.is_room_master(room_id)
  or (public.is_room_player(room_id) and (target_user_id is null or target_user_id = auth.uid()))
);
create policy "masters create dice requests" on public.dice_requests for insert to authenticated with check (
  public.is_room_master(room_id)
);
create policy "targets roll dice requests" on public.dice_requests for update to authenticated using (
  status = 'pending' and public.is_room_player(room_id) and (target_user_id is null or target_user_id = auth.uid())
) with check (
  public.is_room_player(room_id) and (target_user_id is null or target_user_id = auth.uid())
);

drop policy if exists "inventory visible when allowed" on public.inventory_items;
drop policy if exists "masters manage inventory" on public.inventory_items;
drop policy if exists "players update own inventory notes" on public.inventory_items;
create policy "inventory visible when allowed" on public.inventory_items for select to authenticated using (
  exists (
    select 1 from player_characters pc
    where pc.id = inventory_items.character_id
    and (public.is_room_master(pc.room_id) or pc.user_id = auth.uid() or inventory_items.is_public)
  )
);
create policy "masters manage inventory" on public.inventory_items for all to authenticated using (
  exists (select 1 from player_characters pc where pc.id = inventory_items.character_id and public.is_room_master(pc.room_id))
) with check (
  exists (select 1 from player_characters pc where pc.id = inventory_items.character_id and public.is_room_master(pc.room_id))
);
create policy "players update own inventory notes" on public.inventory_items for update to authenticated using (
  exists (select 1 from player_characters pc where pc.id = inventory_items.character_id and pc.user_id = auth.uid())
) with check (
  exists (select 1 from player_characters pc where pc.id = inventory_items.character_id and pc.user_id = auth.uid())
);

drop policy if exists "players read own notes" on public.player_notes;
drop policy if exists "players manage own notes" on public.player_notes;
create policy "players read own notes" on public.player_notes for select to authenticated using (
  exists (select 1 from player_characters pc where pc.id = player_notes.character_id and pc.user_id = auth.uid())
);
create policy "players manage own notes" on public.player_notes for all to authenticated using (
  exists (select 1 from player_characters pc where pc.id = player_notes.character_id and pc.user_id = auth.uid())
) with check (
  exists (select 1 from player_characters pc where pc.id = player_notes.character_id and pc.user_id = auth.uid())
);

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
create index if not exists idx_dice_requests_requested_by on public.dice_requests(requested_by);
create index if not exists idx_dice_requests_target_user_id on public.dice_requests(target_user_id);
create index if not exists idx_media_assets_created_by on public.media_assets(created_by);
create index if not exists idx_messages_npc_id on public.messages(npc_id);
create index if not exists idx_messages_recipient_user_id on public.messages(recipient_user_id);
create index if not exists idx_messages_sender_user_id on public.messages(sender_user_id);
create index if not exists idx_room_presence_user_id on public.room_presence(user_id);
create index if not exists idx_room_typing_recipient_user_id on public.room_typing(recipient_user_id);
create index if not exists idx_room_typing_user_id on public.room_typing(user_id);
create index if not exists idx_rooms_current_audio_id on public.rooms(current_audio_id);
create index if not exists idx_rooms_current_scene_id on public.rooms(current_scene_id);
create index if not exists idx_rooms_current_sound_effect_id on public.rooms(current_sound_effect_id);
create index if not exists idx_rooms_spotlight_npc_id on public.rooms(spotlight_npc_id);
create index if not exists idx_scenes_created_by on public.scenes(created_by);
create index if not exists idx_maps_campaign_id on public.maps(campaign_id);
create index if not exists idx_maps_created_by on public.maps(created_by);
create index if not exists idx_map_hotspots_target_map_id on public.map_hotspots(target_map_id);
create index if not exists idx_map_hotspots_target_scene_id on public.map_hotspots(target_scene_id);
create index if not exists idx_map_hotspots_target_audio_id on public.map_hotspots(target_audio_id);
create index if not exists idx_map_npc_markers_npc_id on public.map_npc_markers(npc_id);
create index if not exists idx_map_events_target_scene_id on public.map_events(target_scene_id);
create index if not exists idx_map_events_target_audio_id on public.map_events(target_audio_id);

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

insert into storage.buckets (id, name, public)
values
  ('scene-images', 'scene-images', true),
  ('portraits', 'portraits', true),
  ('audio-tracks', 'audio-tracks', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "public can read app storage" on storage.objects;
drop policy if exists "authenticated users upload app storage" on storage.objects;
drop policy if exists "authenticated users update app storage" on storage.objects;
drop policy if exists "authenticated users delete app storage" on storage.objects;
drop policy if exists "members upload app storage" on storage.objects;
drop policy if exists "members update app storage" on storage.objects;
drop policy if exists "members delete app storage" on storage.objects;
create policy "public can read app storage" on storage.objects for select using (
  bucket_id in ('scene-images', 'portraits', 'audio-tracks')
);
create policy "members upload app storage" on storage.objects for insert to authenticated with check (
  bucket_id in ('scene-images', 'portraits', 'audio-tracks')
  and (
    (
      (storage.foldername(name))[1] = 'rooms'
      and exists (
        select 1 from public.rooms r
        where r.id::text = (storage.foldername(name))[2]
          and (public.is_room_master(r.id) or public.is_room_player(r.id) or public.is_superadmin())
      )
    )
    or ((storage.foldername(name))[1] in ('campaign-covers', 'initial-scenes') and (storage.foldername(name))[2] = auth.uid()::text)
  )
);
create policy "members update app storage" on storage.objects for update to authenticated using (
  bucket_id in ('scene-images', 'portraits', 'audio-tracks')
  and (
    (
      (storage.foldername(name))[1] = 'rooms'
      and exists (
        select 1 from public.rooms r
        where r.id::text = (storage.foldername(name))[2]
          and (public.is_room_master(r.id) or public.is_superadmin())
      )
    )
    or ((storage.foldername(name))[1] in ('campaign-covers', 'initial-scenes') and (storage.foldername(name))[2] = auth.uid()::text)
  )
) with check (
  bucket_id in ('scene-images', 'portraits', 'audio-tracks')
  and (
    (
      (storage.foldername(name))[1] = 'rooms'
      and exists (
        select 1 from public.rooms r
        where r.id::text = (storage.foldername(name))[2]
          and (public.is_room_master(r.id) or public.is_superadmin())
      )
    )
    or ((storage.foldername(name))[1] in ('campaign-covers', 'initial-scenes') and (storage.foldername(name))[2] = auth.uid()::text)
  )
);
create policy "members delete app storage" on storage.objects for delete to authenticated using (
  bucket_id in ('scene-images', 'portraits', 'audio-tracks')
  and (
    (
      (storage.foldername(name))[1] = 'rooms'
      and exists (
        select 1 from public.rooms r
        where r.id::text = (storage.foldername(name))[2]
          and (public.is_room_master(r.id) or public.is_superadmin())
      )
    )
    or ((storage.foldername(name))[1] in ('campaign-covers', 'initial-scenes') and (storage.foldername(name))[2] = auth.uid()::text)
  )
);

revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;
revoke execute on function public.is_room_master(uuid) from public;
revoke execute on function public.is_room_master(uuid) from anon;
grant execute on function public.is_room_master(uuid) to authenticated;
revoke execute on function public.is_room_player(uuid) from public;
revoke execute on function public.is_room_player(uuid) from anon;
grant execute on function public.is_room_player(uuid) to authenticated;
revoke execute on function public.lookup_room_by_invite_code(text) from public;
revoke execute on function public.lookup_room_by_invite_code(text) from anon;
grant execute on function public.lookup_room_by_invite_code(text) to authenticated;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rooms') then
    alter publication supabase_realtime add table public.rooms;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'player_characters') then
    alter publication supabase_realtime add table public.player_characters;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'scenes') then
    alter publication supabase_realtime add table public.scenes;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages') then
    alter publication supabase_realtime add table public.messages;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'audio_tracks') then
    alter publication supabase_realtime add table public.audio_tracks;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'sound_effects') then
    alter publication supabase_realtime add table public.sound_effects;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'dice_requests') then
    alter publication supabase_realtime add table public.dice_requests;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'media_assets') then
    alter publication supabase_realtime add table public.media_assets;
  end if;
  if exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'room_presence') then
    alter publication supabase_realtime drop table public.room_presence;
  end if;
  if exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'room_typing') then
    alter publication supabase_realtime drop table public.room_typing;
  end if;
  if exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'inventory_items') then
    alter publication supabase_realtime drop table public.inventory_items;
  end if;
  if exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'maps') then
    alter publication supabase_realtime drop table public.maps;
  end if;
  if exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'map_character_positions') then
    alter publication supabase_realtime drop table public.map_character_positions;
  end if;
  if exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'map_hotspots') then
    alter publication supabase_realtime drop table public.map_hotspots;
  end if;
  if exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'map_npc_markers') then
    alter publication supabase_realtime drop table public.map_npc_markers;
  end if;
  if exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'map_custom_markers') then
    alter publication supabase_realtime drop table public.map_custom_markers;
  end if;
end $$;
