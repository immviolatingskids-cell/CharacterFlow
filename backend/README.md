# PromptForge cloud setup

This is the small, private-cloud foundation for the personal PromptForge workspace.

1. Create a Supabase project and enable email authentication.
2. Run `supabase-schema.sql` in the SQL editor.
3. Configure the frontend with the project URL and anonymous client key.
4. Never put a service-role key or generation-provider key in the frontend.

For local development, copy `cloud-config.example.js` to `cloud-config.js` and fill in the project URL and publishable anonymous key. Load that file before `app.js`. If it is absent, PromptForge remains local-only.

The schema deliberately stores the existing CharacterFlow state shape in JSONB. That keeps `studio-core.js` as the application model while giving Characters, immutable Takes, prompts, and media independent ownership and lifecycle records.
