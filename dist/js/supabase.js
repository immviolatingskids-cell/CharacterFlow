(() => {
  const SUPABASE_URL = 'https://fslcitgacknbockjubti.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_xnVlnjoJxMRbqFPyEwgAkQ_hrV2sWbY';

  if (!window.supabase) {
    console.error('[Supabase] SDK failed to load.');
    return;
  }

  const isConfigured =
    SUPABASE_URL.startsWith('https://') &&
    SUPABASE_URL.includes('.supabase.co') &&
    SUPABASE_KEY.startsWith('sb_publishable_');

  console.log('[Supabase] Configuration check:', {
    isConfigured,
    urlValid: SUPABASE_URL.startsWith('https://'),
    domainValid: SUPABASE_URL.includes('.supabase.co'),
    keyValid: SUPABASE_KEY.startsWith('sb_publishable_')
  });

  if (!isConfigured) {
    window.promptforgeSupabase = null;
    console.warn('[Supabase] Configuration missing.');
    return;
  }

  window.promptforgeSupabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  );

  console.info(
    '[Supabase] Client initialized:',
    window.promptforgeSupabase
  );
})();