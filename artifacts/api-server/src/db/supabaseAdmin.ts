import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { logger } from "../lib/logger";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY ?? "";

let _client: SupabaseClient | null = null;

if (SUPABASE_URL && SUPABASE_SECRET_KEY) {
  _client = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
} else {
  logger.warn("SUPABASE_URL or SUPABASE_SECRET_KEY not set — Supabase features disabled");
}

export const supabaseAdmin = _client;
