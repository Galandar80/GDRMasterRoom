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

revoke execute on function public.lookup_room_by_invite_code(text) from public;
revoke execute on function public.lookup_room_by_invite_code(text) from anon;
grant execute on function public.lookup_room_by_invite_code(text) to authenticated;

drop policy if exists "authenticated users can find rooms by invite code" on public.rooms;
drop policy if exists "room members read rooms" on public.rooms;
create policy "room members read rooms" on public.rooms for select to authenticated using (
  public.is_superadmin()
  or public.is_room_master(id)
  or public.is_room_player(id)
);

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
        select 1
        from public.rooms r
        where r.id::text = (storage.foldername(name))[2]
          and (public.is_room_master(r.id) or public.is_room_player(r.id) or public.is_superadmin())
      )
    )
    or (
      (storage.foldername(name))[1] in ('campaign-covers', 'initial-scenes')
      and (storage.foldername(name))[2] = auth.uid()::text
    )
  )
);

create policy "members update app storage" on storage.objects for update to authenticated using (
  bucket_id in ('scene-images', 'portraits', 'audio-tracks')
  and (
    (
      (storage.foldername(name))[1] = 'rooms'
      and exists (
        select 1
        from public.rooms r
        where r.id::text = (storage.foldername(name))[2]
          and (public.is_room_master(r.id) or public.is_superadmin())
      )
    )
    or (
      (storage.foldername(name))[1] in ('campaign-covers', 'initial-scenes')
      and (storage.foldername(name))[2] = auth.uid()::text
    )
  )
) with check (
  bucket_id in ('scene-images', 'portraits', 'audio-tracks')
  and (
    (
      (storage.foldername(name))[1] = 'rooms'
      and exists (
        select 1
        from public.rooms r
        where r.id::text = (storage.foldername(name))[2]
          and (public.is_room_master(r.id) or public.is_superadmin())
      )
    )
    or (
      (storage.foldername(name))[1] in ('campaign-covers', 'initial-scenes')
      and (storage.foldername(name))[2] = auth.uid()::text
    )
  )
);

create policy "members delete app storage" on storage.objects for delete to authenticated using (
  bucket_id in ('scene-images', 'portraits', 'audio-tracks')
  and (
    (
      (storage.foldername(name))[1] = 'rooms'
      and exists (
        select 1
        from public.rooms r
        where r.id::text = (storage.foldername(name))[2]
          and (public.is_room_master(r.id) or public.is_superadmin())
      )
    )
    or (
      (storage.foldername(name))[1] in ('campaign-covers', 'initial-scenes')
      and (storage.foldername(name))[2] = auth.uid()::text
    )
  )
);
