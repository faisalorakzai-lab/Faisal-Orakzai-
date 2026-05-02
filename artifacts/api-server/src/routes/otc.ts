import { Router } from "express";
import { createClient } from "@supabase/supabase-js";

const router = Router();

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY ?? "";

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SECRET_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
        auth: { persistSession: false },
      })
    : null;

export async function ensureOtcTables(): Promise<void> {
  if (!supabaseAdmin) return;
  try {
    await supabaseAdmin.from("otc_character_profiles").select("user_id").limit(1);
    await supabaseAdmin.from("otc_wallet_data").select("user_id").limit(1);
    await supabaseAdmin.from("profiles").select("user_id").limit(1);
  } catch {
  }
}

/*
  Run these in your Supabase SQL Editor to enable all cloud features:

  CREATE TABLE IF NOT EXISTS profiles (
    user_id TEXT PRIMARY KEY,
    name TEXT,
    phone TEXT UNIQUE NOT NULL,
    wallet_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    okbond_coins DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS otc_character_profiles (
    user_id TEXT PRIMARY KEY,
    credits INTEGER NOT NULL DEFAULT 12,
    tier TEXT NOT NULL DEFAULT 'Pioneer',
    total_rides INTEGER NOT NULL DEFAULT 0,
    avg_rating FLOAT NOT NULL DEFAULT 5.0,
    equity_points INTEGER NOT NULL DEFAULT 0,
    discount_rate FLOAT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS otc_wallet_data (
    user_id TEXT PRIMARY KEY,
    balance INTEGER NOT NULL DEFAULT 0,
    transactions JSONB NOT NULL DEFAULT '[]',
    has_claimed_welcome BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
*/

router.get("/health", (_req, res) => {
  res.json({
    supabase: supabaseAdmin !== null,
  });
});

export default router;
