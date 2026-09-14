insert into public.content_domains (slug,name) values
('wardrobe','Wardrobe'),('accessories','Accessories'),('grooming','Grooming'),('motifs','Motifs'),('props','Props'),('activities','Activities'),('locations','Locations'),('mood','Mood'),('visual','Visual'),('occupations','Occupations'),('interests','Interests'),('hobbies','Hobbies'),('scenes','Scenes'),('colours','Colours'),('photography','Photography'),('traits','Traits')
on conflict (slug) do update set name=excluded.name;

insert into public.content_items (domain_id,slug,label,metadata,provenance,review_status)
select d.id, x.slug, x.label, x.metadata, 'curated', 'approved' from public.content_domains d cross join (values
 ('wardrobe','oversized-blazer','Oversized tailored blazer','{"sourcePack":"tech-girlie"}'::jsonb),
 ('occupations','software-engineer','Software Engineer','{"sourcePack":"tech-girlie"}'::jsonb),
 ('props','slim-laptop','Slim laptop with minimal decals','{"sourcePack":"tech-girlie"}'::jsonb),
 ('locations','creative-workspace','Graphic creative workspace','{"sourcePack":"tech-girlie"}'::jsonb),
 ('mood','assured-playful','Assured and playful','{"sourcePack":"tech-girlie"}'::jsonb),
 ('visual','clean-editorial','Clean editorial framing','{"sourcePack":"tech-girlie"}'::jsonb),
 ('props','reusable-water-bottle','Reusable water bottle','{"sourcePack":"gym-girlie"}'::jsonb),
 ('props','annotated-paperback','Annotated paperback','{"sourcePack":"booktok"}'::jsonb)
) as x(domain_slug,slug,label,metadata) where d.slug=x.domain_slug
on conflict (domain_id,slug) do update set label=excluded.label, metadata=excluded.metadata, updated_at=now();
