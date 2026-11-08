/* Fill these in to turn on accounts (email + password, email confirmation) and cloud sync.
   Leave them empty to run PoiWallet as a local-only app with no sign-in.
   Get both values from Supabase: Project Settings → API. The anon key is public by design;
   row-level security in supabase/schema.sql keeps each user's data private. */
window.POIWALLET_CONFIG = {
  supabaseUrl: "",
  supabaseAnonKey: ""
};
