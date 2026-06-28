create or replace function public.can_create_room_for_campaign(target_campaign_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.campaigns c
    where c.id = target_campaign_id
      and (c.master_id = (select auth.uid()) or public.is_superadmin())
  );
$$;

revoke execute on function public.can_create_room_for_campaign(uuid) from public;
revoke execute on function public.can_create_room_for_campaign(uuid) from anon;
grant execute on function public.can_create_room_for_campaign(uuid) to authenticated;

drop policy if exists "masters insert rooms" on public.rooms;
create policy "masters insert rooms" on public.rooms
for insert to authenticated
with check (public.can_create_room_for_campaign(campaign_id));
