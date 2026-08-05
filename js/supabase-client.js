window.Catetin = window.Catetin || {};

Catetin.configReady = window.CATETIN_CONFIG.SUPABASE_URL.indexOf('YOUR-PROJECT') === -1;

if (Catetin.configReady) {
  Catetin.supabase = supabase.createClient(CATETIN_CONFIG.SUPABASE_URL, CATETIN_CONFIG.SUPABASE_ANON_KEY);
}
