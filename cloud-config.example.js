// Copy this file to cloud-config.js and fill in values from Supabase.
// This is the publishable anonymous key only. Never put a service-role key here.
window.PROMPTFORGE_CLOUD = Object.freeze({
  provider: 'supabase',
  url: 'https://YOUR_PROJECT.supabase.co',
  anonKey: 'YOUR_PUBLISHABLE_ANON_KEY'
});
