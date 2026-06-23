do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.messages'::regclass
      and conname = 'messages_content_length_check'
  ) then
    alter table public.messages
      add constraint messages_content_length_check
      check (char_length(content) between 1 and 8000);
  end if;
end $$;

update storage.buckets
set
  file_size_limit = 4 * 1024 * 1024,
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/avif'
  ]::text[]
where id = 'portraits';

update storage.buckets
set
  file_size_limit = 20 * 1024 * 1024,
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/avif',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]::text[]
where id = 'scene-images';

update storage.buckets
set
  file_size_limit = 12 * 1024 * 1024,
  allowed_mime_types = array[
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/x-wav',
    'audio/ogg',
    'audio/mp4',
    'audio/aac',
    'audio/flac'
  ]::text[]
where id = 'audio-tracks';
