alter table public.media_assets add column if not exists owner_id uuid references public.users(id) on delete set null;
alter table public.media_assets add column if not exists visibility text not null default 'room';
alter table public.media_assets add column if not exists approval_status text not null default 'none';
alter table public.media_assets add column if not exists file_size bigint not null default 0;
alter table public.media_assets add column if not exists mime_type text;
alter table public.media_assets add column if not exists storage_bucket text;
alter table public.media_assets add column if not exists storage_path text;
alter table public.media_assets add column if not exists description text not null default '';

alter table public.media_assets
  drop constraint if exists media_assets_visibility_check,
  add constraint media_assets_visibility_check check (visibility in ('private', 'room', 'shared', 'global'));

alter table public.media_assets
  drop constraint if exists media_assets_approval_status_check,
  add constraint media_assets_approval_status_check check (approval_status in ('none', 'pending', 'approved', 'rejected'));

update public.media_assets
set owner_id = coalesce(owner_id, created_by),
    visibility = coalesce(nullif(visibility, ''), 'room'),
    approval_status = coalesce(nullif(approval_status, ''), 'none')
where owner_id is null
   or visibility is null
   or approval_status is null;

create index if not exists media_assets_owner_created_idx on public.media_assets(owner_id, created_at desc);
create index if not exists media_assets_visibility_idx on public.media_assets(visibility, approval_status, asset_type);
create index if not exists media_assets_room_type_idx on public.media_assets(room_id, asset_type, created_at desc);

drop policy if exists "room members read media assets" on public.media_assets;
drop policy if exists "masters manage media assets" on public.media_assets;
drop policy if exists "members read reusable media assets" on public.media_assets;
drop policy if exists "members create reusable media assets" on public.media_assets;
drop policy if exists "owners masters and superadmins update media assets" on public.media_assets;
drop policy if exists "owners masters and superadmins delete media assets" on public.media_assets;

create policy "members read reusable media assets" on public.media_assets for select to authenticated using (
  public.is_superadmin()
  or owner_id = (select auth.uid())
  or public.is_room_master(room_id)
  or public.is_room_player(room_id)
  or visibility = 'shared'
  or (visibility = 'global' and approval_status = 'approved')
);

create policy "members create reusable media assets" on public.media_assets for insert to authenticated with check (
  created_by = (select auth.uid())
  and coalesce(owner_id, created_by) = (select auth.uid())
  and (public.is_room_master(room_id) or public.is_room_player(room_id) or public.is_superadmin())
);

create policy "owners masters and superadmins update media assets" on public.media_assets for update to authenticated
  using (
    public.is_superadmin()
    or owner_id = (select auth.uid())
    or created_by = (select auth.uid())
    or public.is_room_master(room_id)
  )
  with check (
    public.is_superadmin()
    or owner_id = (select auth.uid())
    or created_by = (select auth.uid())
    or public.is_room_master(room_id)
  );

create policy "owners masters and superadmins delete media assets" on public.media_assets for delete to authenticated using (
  public.is_superadmin()
  or owner_id = (select auth.uid())
  or created_by = (select auth.uid())
  or public.is_room_master(room_id)
);
