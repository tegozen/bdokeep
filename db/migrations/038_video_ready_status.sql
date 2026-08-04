-- class_videos: ready vs still waiting for YouTube thumbnail
alter table public.class_videos
  add column if not exists status text not null default 'ready';

alter table public.class_videos
  add column if not exists status_since timestamptz not null default now();

update public.class_videos
set status = 'ready'
where status is distinct from 'ready'
  and status not in ('ready', 'processing');

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'class_videos_status_check'
      and conrelid = 'public.class_videos'::regclass
  ) then
    alter table public.class_videos
      add constraint class_videos_status_check
      check (status in ('ready', 'processing'));
  end if;
end $$;

create index if not exists class_videos_processing_idx
  on public.class_videos (status_since)
  where status = 'processing';
