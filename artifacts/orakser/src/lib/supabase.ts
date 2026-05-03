declare const __SUPABASE_URL__: string;
declare const __SUPABASE_ANON_KEY__: string;

import { createClient } from "@supabase/supabase-js";

const supabaseUrl: string =
  typeof __SUPABASE_URL__ !== "undefined" ? __SUPABASE_URL__ : "";
const supabaseAnonKey: string =
  typeof __SUPABASE_ANON_KEY__ !== "undefined" ? __SUPABASE_ANON_KEY__ : "";

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          storageKey: "orakser_admin_session",
          autoRefreshToken: true,
        },
      })
    : null;
