-- Singleton site banner: guild recruitment (icon + text + optional links)

create table public.guild_recruit_banner (
  id boolean primary key default true check (id),
  enabled boolean not null default false,
  body text not null default '',
  icon_mime text null,
  icon_bytes bytea null,
  links jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  constraint guild_recruit_banner_body_len
    check (char_length(body) between 0 and 280),
  constraint guild_recruit_banner_links_array
    check (jsonb_typeof(links) = 'array')
);

insert into public.guild_recruit_banner (id) values (true);

alter table public.guild_recruit_banner enable row level security;

-- No anon/authenticated policies → only bdokeep_app / service_role via Nitro

grant all on public.guild_recruit_banner to service_role;

do $$
begin
  if exists (select from pg_roles where rolname = 'bdokeep_app') then
    grant select, insert, update, delete on public.guild_recruit_banner to bdokeep_app;
    execute 'drop policy if exists bdokeep_app_all on public.guild_recruit_banner';
    execute 'create policy bdokeep_app_all on public.guild_recruit_banner for all to bdokeep_app using (true) with check (true)';
  end if;
end $$;
