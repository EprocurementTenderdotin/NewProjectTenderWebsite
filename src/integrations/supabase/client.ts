import { createClient } from "@supabase/supabase-js";

/**
 * Supabase browser client — connects to the user's own Supabase project.
 * Publishable key is safe for frontend (protected by RLS).
 */
const SUPABASE_URL = "https://xrukcmxjvvohcaltzeku.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_e3eB2lIbULIYP5YF0il9Yg_zHqtL2Ri";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  },
});
