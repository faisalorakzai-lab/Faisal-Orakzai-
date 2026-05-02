import Constants from "expo-constants";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string>;
const supabaseUrl: string = extra.supabaseUrl ?? "";
const supabaseAnonKey: string = extra.supabaseAnonKey ?? "";

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false },
      })
    : null;

export function isSupabaseReady(): boolean {
  return supabase !== null;
}
