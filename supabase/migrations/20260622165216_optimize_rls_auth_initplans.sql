drop policy if exists "users create their profile" on public.users;
create policy "users create their profile" on public.users for insert to authenticated with check (id = (select auth.uid()));
drop policy if exists "users update their profile" on public.users;
create policy "users update their profile" on public.users for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists "masters manage their campaigns" on public.campaigns;
create policy "masters manage their campaigns" on public.campaigns for all to authenticated
  using (master_id = (select auth.uid()) or public.is_superadmin())
  with check (master_id = (select auth.uid()) or public.is_superadmin());
drop policy if exists "players read joined campaigns" on public.campaigns;
create policy "players read joined campaigns" on public.campaigns for select to authenticated using (
  exists (select 1 from public.rooms r join public.player_characters pc on pc.room_id = r.id
    where r.campaign_id = campaigns.id and pc.user_id = (select auth.uid()))
);

drop policy if exists "masters insert rooms" on public.rooms;
create policy "masters insert rooms" on public.rooms for insert to authenticated with check (
  exists (select 1 from public.campaigns c where c.id = rooms.campaign_id and c.master_id = (select auth.uid()))
);

drop policy if exists "room members read scenes" on public.scenes;
create policy "room members read scenes" on public.scenes for select to authenticated using (
  public.is_room_master(room_id)
  or (public.is_room_player(room_id) and (visibility = 'public' or (select auth.uid()) = any(visible_user_ids)))
);

drop policy if exists "members upsert own presence" on public.room_presence;
create policy "members upsert own presence" on public.room_presence for insert to authenticated with check (
  user_id = (select auth.uid()) and (public.is_room_master(room_id) or public.is_room_player(room_id))
);
drop policy if exists "members update own presence" on public.room_presence;
create policy "members update own presence" on public.room_presence for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "members delete own presence" on public.room_presence;
create policy "members delete own presence" on public.room_presence for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists "members upsert own typing" on public.room_typing;
create policy "members upsert own typing" on public.room_typing for insert to authenticated with check (
  user_id = (select auth.uid()) and (public.is_room_master(room_id) or public.is_room_player(room_id))
);
drop policy if exists "members update own typing" on public.room_typing;
create policy "members update own typing" on public.room_typing for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "members delete own typing" on public.room_typing;
create policy "members delete own typing" on public.room_typing for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists "inventory visible when allowed" on public.inventory_items;
create policy "inventory visible when allowed" on public.inventory_items for select to authenticated using (
  exists (select 1 from public.player_characters pc where pc.id = inventory_items.character_id
    and (public.is_room_master(pc.room_id) or pc.user_id = (select auth.uid()) or inventory_items.is_public))
);
drop policy if exists "players update own inventory notes" on public.inventory_items;
create policy "players update own inventory notes" on public.inventory_items for update to authenticated using (
  exists (select 1 from public.player_characters pc where pc.id = inventory_items.character_id and pc.user_id = (select auth.uid()))
) with check (
  exists (select 1 from public.player_characters pc where pc.id = inventory_items.character_id and pc.user_id = (select auth.uid()))
);

drop policy if exists "players read own notes" on public.player_notes;
create policy "players read own notes" on public.player_notes for select to authenticated using (
  exists (select 1 from public.player_characters pc where pc.id = player_notes.character_id and pc.user_id = (select auth.uid()))
);
drop policy if exists "players manage own notes" on public.player_notes;
create policy "players manage own notes" on public.player_notes for all to authenticated using (
  exists (select 1 from public.player_characters pc where pc.id = player_notes.character_id and pc.user_id = (select auth.uid()))
) with check (
  exists (select 1 from public.player_characters pc where pc.id = player_notes.character_id and pc.user_id = (select auth.uid()))
);
