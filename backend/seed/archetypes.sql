insert into public.archetypes (slug,name,description,status) values
('tech-girlie','Tech Girlie','Polished, playful technology-culture presentation with clean editorial detail.','active'),
('gym-girlie','Gym Girlie','Energetic athleisure styling and polished training-adjacent context.','active'),
('booktok','Booktok','Literary visual language with intimate warm presentation.','active'),
('y2k','Y2K','Playful late-90s/early-00s pop styling and glossy nostalgia.','active'),
('streetwear','Streetwear','Relaxed urban layers, grounded movement, and direct documentary energy.','active'),
('clean-girl','Clean Girl','Minimal, fresh and quietly polished presentation.','active'),
('coquette','Coquette','Romantic ribbons, soft ornament and playful femininity.','active'),
('dark-academia','Dark Academia','Scholarly vintage layering with moody autumnal atmosphere.','active'),
('goth','Goth','Graphic dark styling, dramatic contrast and nocturnal mood.','active'),
('emo','Emo','Expressive alternative layering with intimate high-contrast feeling.','active'),
('grunge','Grunge','Worn-in layers, tactile imperfection and candid attitude.','active'),
('preppy','Preppy','Crisp collegiate-inspired colour, tailoring and neat layering.','active'),
('old-money','Old Money','Quietly refined, timeless tailoring and restrained luxury cues.','active'),
('boho','Boho','Layered natural textures, artisanal detail and free-flowing ease.','active'),
('gorpcore','Gorpcore','Technical outdoor utility translated into everyday styling.','active')
on conflict (slug) do update set name=excluded.name, description=excluded.description, status=excluded.status, updated_at=now();
