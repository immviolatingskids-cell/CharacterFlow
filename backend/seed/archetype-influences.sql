insert into public.archetype_influences (archetype_id,content_item_id,weight,relationship_type,rationale,provenance,review_status)
select a.id, i.id, x.weight, x.relationship_type, x.rationale, 'curated', 'approved'
from (values
 ('tech-girlie','oversized-blazer',.90,'core','Strong visual fit for polished tech-culture styling.'),
 ('tech-girlie','software-engineer',.95,'likely','Direct occupation relationship from the local catalogue.'),
 ('tech-girlie','slim-laptop',.95,'visual','Signature technology prop.'),
 ('tech-girlie','creative-workspace',.84,'contextual','Supports focused digital making.'),
 ('tech-girlie','assured-playful',.82,'core','Matches the pack mood.'),
 ('tech-girlie','clean-editorial',.90,'visual','Primary visual treatment.'),
 ('gym-girlie','reusable-water-bottle',.64,'likely','Reusable bottle is a recurring training prop.'),
 ('booktok','annotated-paperback',.88,'core','Signature reading prop.')
) x(archetype_slug,item_slug,weight,relationship_type,rationale)
join public.archetypes a on a.slug=x.archetype_slug
join public.content_items i on i.slug=x.item_slug
on conflict (archetype_id,content_item_id) do update set weight=excluded.weight, relationship_type=excluded.relationship_type, rationale=excluded.rationale, updated_at=now();
