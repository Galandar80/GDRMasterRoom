create or replace function public.claim_room_by_invite_code(lookup_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_room public.rooms%rowtype;
  existing_character_id uuid;
  current_player_count integer;
  profile_username text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select r.*
  into target_room
  from public.rooms r
  where r.invite_code = upper(trim(lookup_code))
  for update;

  if not found then
    return null;
  end if;

  select pc.id
  into existing_character_id
  from public.player_characters pc
  where pc.room_id = target_room.id
    and pc.user_id = (select auth.uid());

  if existing_character_id is not null then
    return target_room.id;
  end if;

  select count(*)
  into current_player_count
  from public.player_characters pc
  where pc.room_id = target_room.id;

  if current_player_count >= target_room.max_players then
    raise exception 'La stanza ha raggiunto il numero massimo di giocatori disponibili.';
  end if;

  select coalesce(nullif(u.username, ''), 'Nuovo')
  into profile_username
  from public.users u
  where u.id = (select auth.uid());

  insert into public.player_characters (
    room_id,
    user_id,
    character_name,
    character_surname,
    portrait_url,
    color,
    hp,
    mental_state,
    public_background,
    visible_status,
    is_setup_complete
  )
  values (
    target_room.id,
    (select auth.uid()),
    coalesce(profile_username, 'Nuovo'),
    'Viandante',
    '',
    '#f59e0b',
    10,
    'Stabile',
    'Personaggio appena entrato nella stanza.',
    'stabile',
    false
  );

  return target_room.id;
end;
$$;

revoke execute on function public.claim_room_by_invite_code(text) from public;
revoke execute on function public.claim_room_by_invite_code(text) from anon;
grant execute on function public.claim_room_by_invite_code(text) to authenticated;

create or replace function public.enforce_player_character_update_scope()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_room_master(old.room_id) or public.is_superadmin() then
    return new;
  end if;

  if old.user_id is distinct from (select auth.uid()) then
    raise exception 'Character update not authorized';
  end if;

  if new.room_id is distinct from old.room_id
    or new.user_id is distinct from old.user_id then
    raise exception 'Character ownership cannot be changed';
  end if;

  if old.is_setup_complete = false and new.is_setup_complete = true then
    return new;
  end if;

  if new.hp is distinct from old.hp
    or new.mental_state is distinct from old.mental_state
    or new.visible_status is distinct from old.visible_status
    or new.conditions is distinct from old.conditions
    or new.is_setup_complete is distinct from old.is_setup_complete then
    raise exception 'Only the Master can update protected character fields';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_player_character_update_scope on public.player_characters;
create trigger enforce_player_character_update_scope
before update on public.player_characters
for each row execute function public.enforce_player_character_update_scope();

revoke execute on function public.enforce_player_character_update_scope() from public;
revoke execute on function public.enforce_player_character_update_scope() from anon;
revoke execute on function public.enforce_player_character_update_scope() from authenticated;

drop policy if exists "players create own character" on public.player_characters;
drop policy if exists "players update own character notes fields" on public.player_characters;
create policy "players update own character profile" on public.player_characters
for update to authenticated
using (
  user_id = (select auth.uid())
  and public.is_room_player(room_id)
)
with check (
  user_id = (select auth.uid())
  and public.is_room_player(room_id)
);

create or replace function public.enforce_message_update_scope()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_room_master(old.room_id) then
    return new;
  end if;

  if old.sender_user_id is distinct from (select auth.uid())
    or not public.is_room_player(old.room_id) then
    raise exception 'Message update not authorized';
  end if;

  if new.room_id is distinct from old.room_id
    or new.sender_user_id is distinct from old.sender_user_id
    or new.sender_type is distinct from old.sender_type
    or new.sender_display_name is distinct from old.sender_display_name
    or new.sender_color is distinct from old.sender_color
    or new.npc_id is distinct from old.npc_id
    or new.is_private is distinct from old.is_private
    or new.channel is distinct from old.channel
    or new.is_pinned is distinct from old.is_pinned
    or new.recipient_user_id is distinct from old.recipient_user_id
    or new.created_at is distinct from old.created_at then
    raise exception 'Only message content can be edited by its sender';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_message_update_scope on public.messages;
create trigger enforce_message_update_scope
before update on public.messages
for each row execute function public.enforce_message_update_scope();

revoke execute on function public.enforce_message_update_scope() from public;
revoke execute on function public.enforce_message_update_scope() from anon;
revoke execute on function public.enforce_message_update_scope() from authenticated;

drop policy if exists "read public messages and own private messages" on public.messages;
drop policy if exists "members create messages" on public.messages;
drop policy if exists "masters delete messages" on public.messages;
drop policy if exists "senders update own messages and masters pin" on public.messages;

create policy "room members read allowed messages" on public.messages
for select to authenticated
using (
  public.is_room_master(room_id)
  or (
    public.is_room_player(room_id)
    and (
      not is_private
      or sender_user_id = (select auth.uid())
      or recipient_user_id = (select auth.uid())
    )
  )
);

create policy "room members create valid messages" on public.messages
for insert to authenticated
with check (
  sender_user_id = (select auth.uid())
  and (
    (
      public.is_room_master(room_id)
      and sender_type in ('master', 'npc', 'system')
      and (
        (sender_type = 'npc' and exists (
          select 1
          from public.npcs n
          where n.id = messages.npc_id
            and n.room_id = messages.room_id
        ))
        or (sender_type <> 'npc' and npc_id is null)
      )
    )
    or (
      public.is_room_player(room_id)
      and sender_type = 'player'
      and npc_id is null
    )
  )
  and (
    (
      is_private = false
      and recipient_user_id is null
    )
    or (
      is_private = true
      and recipient_user_id is not null
      and (
        recipient_user_id = (
          select c.master_id
          from public.rooms r
          join public.campaigns c on c.id = r.campaign_id
          where r.id = messages.room_id
        )
        or exists (
          select 1
          from public.player_characters pc
          where pc.room_id = messages.room_id
            and pc.user_id = messages.recipient_user_id
        )
      )
    )
  )
);

create policy "room members delete own messages" on public.messages
for delete to authenticated
using (
  public.is_room_master(room_id)
  or (
    public.is_room_player(room_id)
    and sender_user_id = (select auth.uid())
  )
);

create policy "room members update allowed messages" on public.messages
for update to authenticated
using (
  public.is_room_master(room_id)
  or (
    public.is_room_player(room_id)
    and sender_user_id = (select auth.uid())
  )
)
with check (
  public.is_room_master(room_id)
  or (
    public.is_room_player(room_id)
    and sender_user_id = (select auth.uid())
  )
);

create or replace function public.enforce_dice_request_update_scope()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_room_master(old.room_id) then
    return new;
  end if;

  if not public.is_room_player(old.room_id)
    or (old.target_user_id is not null and old.target_user_id is distinct from (select auth.uid())) then
    raise exception 'Dice request update not authorized';
  end if;

  if new.room_id is distinct from old.room_id
    or new.requested_by is distinct from old.requested_by
    or new.target_user_id is distinct from old.target_user_id
    or new.dice_sides is distinct from old.dice_sides
    or new.reason is distinct from old.reason
    or new.visibility is distinct from old.visibility
    or new.created_at is distinct from old.created_at then
    raise exception 'Dice request definition cannot be changed by players';
  end if;

  if old.status <> 'pending' or new.status <> 'rolled' or new.result is null then
    raise exception 'Invalid dice request state transition';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_dice_request_update_scope on public.dice_requests;
create trigger enforce_dice_request_update_scope
before update on public.dice_requests
for each row execute function public.enforce_dice_request_update_scope();

revoke execute on function public.enforce_dice_request_update_scope() from public;
revoke execute on function public.enforce_dice_request_update_scope() from anon;
revoke execute on function public.enforce_dice_request_update_scope() from authenticated;

drop policy if exists "members read dice requests" on public.dice_requests;
drop policy if exists "masters create dice requests" on public.dice_requests;
drop policy if exists "targets roll dice requests" on public.dice_requests;

create policy "members read dice requests" on public.dice_requests
for select to authenticated
using (
  public.is_room_master(room_id)
  or (
    public.is_room_player(room_id)
    and (target_user_id is null or target_user_id = (select auth.uid()))
  )
);

create policy "masters create dice requests" on public.dice_requests
for insert to authenticated
with check (
  public.is_room_master(room_id)
  and requested_by = (select auth.uid())
);

create policy "targets roll dice requests" on public.dice_requests
for update to authenticated
using (
  status = 'pending'
  and public.is_room_player(room_id)
  and (target_user_id is null or target_user_id = (select auth.uid()))
)
with check (
  status = 'rolled'
  and public.is_room_player(room_id)
  and (target_user_id is null or target_user_id = (select auth.uid()))
);

drop policy if exists "members upload app storage" on storage.objects;
drop policy if exists "members update app storage" on storage.objects;
drop policy if exists "members delete app storage" on storage.objects;

create policy "members upload app storage" on storage.objects
for insert to authenticated
with check (
  bucket_id in ('scene-images', 'portraits', 'audio-tracks')
  and (
    (
      (storage.foldername(storage.objects.name))[1] = 'rooms'
      and exists (
        select 1
        from public.rooms r
        where r.id::text = (storage.foldername(storage.objects.name))[2]
          and (
            public.is_room_master(r.id)
            or public.is_room_player(r.id)
            or public.is_superadmin()
          )
      )
    )
    or (
      (storage.foldername(storage.objects.name))[1] in ('campaign-covers', 'initial-scenes')
      and (storage.foldername(storage.objects.name))[2] = (select auth.uid())::text
    )
  )
);

create policy "members update app storage" on storage.objects
for update to authenticated
using (
  bucket_id in ('scene-images', 'portraits', 'audio-tracks')
  and (
    (
      (storage.foldername(storage.objects.name))[1] = 'rooms'
      and exists (
        select 1
        from public.rooms r
        where r.id::text = (storage.foldername(storage.objects.name))[2]
          and (public.is_room_master(r.id) or public.is_superadmin())
      )
    )
    or (
      (storage.foldername(storage.objects.name))[1] in ('campaign-covers', 'initial-scenes')
      and (storage.foldername(storage.objects.name))[2] = (select auth.uid())::text
    )
  )
)
with check (
  bucket_id in ('scene-images', 'portraits', 'audio-tracks')
  and (
    (
      (storage.foldername(storage.objects.name))[1] = 'rooms'
      and exists (
        select 1
        from public.rooms r
        where r.id::text = (storage.foldername(storage.objects.name))[2]
          and (public.is_room_master(r.id) or public.is_superadmin())
      )
    )
    or (
      (storage.foldername(storage.objects.name))[1] in ('campaign-covers', 'initial-scenes')
      and (storage.foldername(storage.objects.name))[2] = (select auth.uid())::text
    )
  )
);

create policy "members delete app storage" on storage.objects
for delete to authenticated
using (
  bucket_id in ('scene-images', 'portraits', 'audio-tracks')
  and (
    (
      (storage.foldername(storage.objects.name))[1] = 'rooms'
      and exists (
        select 1
        from public.rooms r
        where r.id::text = (storage.foldername(storage.objects.name))[2]
          and (public.is_room_master(r.id) or public.is_superadmin())
      )
    )
    or (
      (storage.foldername(storage.objects.name))[1] in ('campaign-covers', 'initial-scenes')
      and (storage.foldername(storage.objects.name))[2] = (select auth.uid())::text
    )
  )
);
