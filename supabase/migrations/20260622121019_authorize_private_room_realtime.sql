create or replace function public.can_access_realtime_room_topic(requested_topic text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.rooms r
    join public.campaigns c on c.id = r.campaign_id
    where requested_topic = 'room-' || r.id::text
      and (
        c.master_id = (select auth.uid())
        or exists (
          select 1
          from public.player_characters pc
          where pc.room_id = r.id
            and pc.user_id = (select auth.uid())
        )
        or public.is_superadmin()
      )
  );
$$;

revoke execute on function public.can_access_realtime_room_topic(text) from public;
revoke execute on function public.can_access_realtime_room_topic(text) from anon;
grant execute on function public.can_access_realtime_room_topic(text) to authenticated;

alter table realtime.messages enable row level security;

drop policy if exists "room members receive private broadcasts" on realtime.messages;
drop policy if exists "room members send private broadcasts" on realtime.messages;

create policy "room members receive private broadcasts"
on realtime.messages
for select
to authenticated
using (
  realtime.messages.extension = 'broadcast'
  and public.can_access_realtime_room_topic((select realtime.topic()))
);

create policy "room members send private broadcasts"
on realtime.messages
for insert
to authenticated
with check (
  realtime.messages.extension = 'broadcast'
  and public.can_access_realtime_room_topic((select realtime.topic()))
);
