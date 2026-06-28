create or replace function public.create_owned_campaign_room(
  p_campaign_title text,
  p_genre text,
  p_description text,
  p_cover_image_url text,
  p_room_name text,
  p_invite_code text,
  p_max_players integer
)
returns table (
  campaign_id uuid,
  room_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_invite_code text := upper(trim(coalesce(p_invite_code, '')));
  safe_max_players integer := greatest(1, least(12, coalesce(p_max_players, 4)));
begin
  if current_user_id is null then
    raise exception 'Utente non autenticato.' using errcode = '28000';
  end if;

  if normalized_invite_code = '' or char_length(normalized_invite_code) > 32 then
    raise exception 'Codice invito non valido.' using errcode = '22023';
  end if;

  update public.users
  set role = 'master'
  where id = current_user_id;

  insert into public.campaigns (
    master_id,
    title,
    genre,
    description,
    cover_image_url,
    status
  )
  values (
    current_user_id,
    coalesce(nullif(trim(p_campaign_title), ''), 'Nuova campagna'),
    coalesce(trim(p_genre), ''),
    coalesce(p_description, ''),
    coalesce(p_cover_image_url, ''),
    'active'
  )
  returning id into campaign_id;

  insert into public.rooms (
    campaign_id,
    name,
    invite_code,
    max_players
  )
  values (
    campaign_id,
    coalesce(nullif(trim(p_room_name), ''), 'Stanza di gioco'),
    normalized_invite_code,
    safe_max_players
  )
  returning id into room_id;

  return next;
end;
$$;

revoke execute on function public.create_owned_campaign_room(text, text, text, text, text, text, integer) from public;
revoke execute on function public.create_owned_campaign_room(text, text, text, text, text, text, integer) from anon;
grant execute on function public.create_owned_campaign_room(text, text, text, text, text, text, integer) to authenticated;
