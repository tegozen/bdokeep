-- Rewrite legacy bdocodex hotlinks to same-origin /codex paths.
-- Safe to re-run. Ensures CSP img-src 'self' works after deploy.

update public.skills
set icon_url = regexp_replace(icon_url, '^https?://bdocodex\.com', '/codex', 'i')
where icon_url ~* '^https?://bdocodex\.com/';

update public.buffs
set icon_url = regexp_replace(icon_url, '^https?://bdocodex\.com', '/codex', 'i')
where icon_url ~* '^https?://bdocodex\.com/';

update public.items
set icon_url = regexp_replace(icon_url, '^https?://bdocodex\.com', '/codex', 'i')
where icon_url ~* '^https?://bdocodex\.com/';

update public.classes
set
  icon_url = case
    when icon_url ~* '^https?://bdocodex\.com/' then regexp_replace(icon_url, '^https?://bdocodex\.com', '/codex', 'i')
    else icon_url
  end,
  portrait_url = case
    when portrait_url ~* '^https?://bdocodex\.com/' then regexp_replace(portrait_url, '^https?://bdocodex\.com', '/codex', 'i')
    else portrait_url
  end
where icon_url ~* '^https?://bdocodex\.com/'
   or portrait_url ~* '^https?://bdocodex\.com/';

-- Protocol-relative //bdocodex.com/...
update public.skills
set icon_url = regexp_replace(icon_url, '^//bdocodex\.com', '/codex', 'i')
where icon_url ~* '^//bdocodex\.com/';

update public.buffs
set icon_url = regexp_replace(icon_url, '^//bdocodex\.com', '/codex', 'i')
where icon_url ~* '^//bdocodex\.com/';

update public.items
set icon_url = regexp_replace(icon_url, '^//bdocodex\.com', '/codex', 'i')
where icon_url ~* '^//bdocodex\.com/';
