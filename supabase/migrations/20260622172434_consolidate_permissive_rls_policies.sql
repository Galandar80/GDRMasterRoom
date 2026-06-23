drop policy if exists "masters manage their campaigns" on public.campaigns;
drop policy if exists "players read joined campaigns" on public.campaigns;
create policy "campaign members read campaigns" on public.campaigns for select to authenticated using (
  master_id = (select auth.uid()) or public.is_superadmin()
  or exists (
    select 1 from public.rooms r
    join public.player_characters pc on pc.room_id = r.id
    where r.campaign_id = campaigns.id and pc.user_id = (select auth.uid())
  )
);
create policy "masters insert campaigns" on public.campaigns for insert to authenticated
  with check (master_id = (select auth.uid()) or public.is_superadmin());
create policy "masters update campaigns" on public.campaigns for update to authenticated
  using (master_id = (select auth.uid()) or public.is_superadmin())
  with check (master_id = (select auth.uid()) or public.is_superadmin());
create policy "masters delete campaigns" on public.campaigns for delete to authenticated
  using (master_id = (select auth.uid()) or public.is_superadmin());

do $$
declare item record;
begin
  for item in select * from (values
    ('audio_tracks','masters manage audio'),
    ('npcs','masters manage npcs'),
    ('scenes','masters manage scenes'),
    ('sound_effects','masters manage sound effects')
  ) as policies(table_name, old_policy)
  loop
    execute format('drop policy if exists %I on public.%I', item.old_policy, item.table_name);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.is_room_master(room_id))', 'masters insert ' || item.table_name, item.table_name);
    execute format('create policy %I on public.%I for update to authenticated using (public.is_room_master(room_id)) with check (public.is_room_master(room_id))', 'masters update ' || item.table_name, item.table_name);
    execute format('create policy %I on public.%I for delete to authenticated using (public.is_room_master(room_id))', 'masters delete ' || item.table_name, item.table_name);
  end loop;
end $$;

drop policy if exists "masters manage maps" on public.maps;
create policy "masters insert maps" on public.maps for insert to authenticated
  with check (public.is_room_master(room_id) or public.is_superadmin());
create policy "masters update maps" on public.maps for update to authenticated
  using (public.is_room_master(room_id) or public.is_superadmin())
  with check (public.is_room_master(room_id) or public.is_superadmin());
create policy "masters delete maps" on public.maps for delete to authenticated
  using (public.is_room_master(room_id) or public.is_superadmin());

do $$
declare item record;
begin
  for item in select * from (values
    ('map_character_positions','masters manage map character positions'),
    ('map_custom_markers','masters manage map custom markers'),
    ('map_events','masters manage map events'),
    ('map_fog_areas','masters manage map fog areas'),
    ('map_hotspots','masters manage map hotspots'),
    ('map_npc_markers','masters manage map npc markers')
  ) as policies(table_name, old_policy)
  loop
    execute format('drop policy if exists %I on public.%I', item.old_policy, item.table_name);
    execute format('create policy %I on public.%I for insert to authenticated with check (exists (select 1 from public.maps m where m.id = map_id and (public.is_room_master(m.room_id) or public.is_superadmin())))', 'masters insert ' || item.table_name, item.table_name);
    execute format('create policy %I on public.%I for update to authenticated using (exists (select 1 from public.maps m where m.id = map_id and (public.is_room_master(m.room_id) or public.is_superadmin()))) with check (exists (select 1 from public.maps m where m.id = map_id and (public.is_room_master(m.room_id) or public.is_superadmin())))', 'masters update ' || item.table_name, item.table_name);
    execute format('create policy %I on public.%I for delete to authenticated using (exists (select 1 from public.maps m where m.id = map_id and (public.is_room_master(m.room_id) or public.is_superadmin())))', 'masters delete ' || item.table_name, item.table_name);
  end loop;
end $$;

drop policy if exists "masters manage characters" on public.player_characters;
drop policy if exists "players update own character profile" on public.player_characters;
create policy "masters insert characters" on public.player_characters for insert to authenticated
  with check (public.is_room_master(room_id));
create policy "authorized users update characters" on public.player_characters for update to authenticated
  using (public.is_room_master(room_id) or (user_id = (select auth.uid()) and public.is_room_player(room_id)))
  with check (public.is_room_master(room_id) or (user_id = (select auth.uid()) and public.is_room_player(room_id)));
create policy "masters delete characters" on public.player_characters for delete to authenticated
  using (public.is_room_master(room_id));

drop policy if exists "masters manage inventory" on public.inventory_items;
drop policy if exists "players update own inventory notes" on public.inventory_items;
create policy "masters insert inventory" on public.inventory_items for insert to authenticated with check (
  exists (select 1 from public.player_characters pc where pc.id = inventory_items.character_id and public.is_room_master(pc.room_id))
);
create policy "authorized users update inventory" on public.inventory_items for update to authenticated using (
  exists (
    select 1 from public.player_characters pc
    where pc.id = inventory_items.character_id
      and (public.is_room_master(pc.room_id) or pc.user_id = (select auth.uid()))
  )
) with check (
  exists (
    select 1 from public.player_characters pc
    where pc.id = inventory_items.character_id
      and (public.is_room_master(pc.room_id) or pc.user_id = (select auth.uid()))
  )
);
create policy "masters delete inventory" on public.inventory_items for delete to authenticated using (
  exists (select 1 from public.player_characters pc where pc.id = inventory_items.character_id and public.is_room_master(pc.room_id))
);

drop policy if exists "players manage own notes" on public.player_notes;
create policy "players insert own notes" on public.player_notes for insert to authenticated with check (
  exists (select 1 from public.player_characters pc where pc.id = player_notes.character_id and pc.user_id = (select auth.uid()))
);
create policy "players update own notes" on public.player_notes for update to authenticated using (
  exists (select 1 from public.player_characters pc where pc.id = player_notes.character_id and pc.user_id = (select auth.uid()))
) with check (
  exists (select 1 from public.player_characters pc where pc.id = player_notes.character_id and pc.user_id = (select auth.uid()))
);
create policy "players delete own notes" on public.player_notes for delete to authenticated using (
  exists (select 1 from public.player_characters pc where pc.id = player_notes.character_id and pc.user_id = (select auth.uid()))
);
