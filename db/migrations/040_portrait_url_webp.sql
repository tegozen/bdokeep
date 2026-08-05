-- Point class portraits at the card webp assets; full-size portrait.png removed from the repo.
update public.classes
set portrait_url = regexp_replace(portrait_url, 'portrait\.png$', 'portrait-card-360.webp', 'i')
where portrait_url ~* 'portrait\.png$';
