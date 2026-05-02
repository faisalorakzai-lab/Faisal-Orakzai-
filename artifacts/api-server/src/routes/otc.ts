import { Router, Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";

const router = Router();

const PARSE_VOICE_RATE_MAP = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;

function requireOtcAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization ?? "";
  if (!auth.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = auth.slice(7);
  const parts = token.split(".");
  if (parts.length !== 3) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }
  try {
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64").toString("utf8")
    ) as { sub?: string; exp?: number };
    if (!payload.sub || !payload.exp || Date.now() / 1000 > payload.exp) {
      res.status(401).json({ error: "Token expired or invalid" });
      return;
    }
    const userId = payload.sub;
    const now = Date.now();
    const entry = PARSE_VOICE_RATE_MAP.get(userId);
    if (!entry || now > entry.resetAt) {
      PARSE_VOICE_RATE_MAP.set(userId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    } else if (entry.count >= RATE_LIMIT) {
      res.status(429).json({ error: "Rate limit exceeded. Try again in a minute." });
      return;
    } else {
      entry.count += 1;
    }
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";
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

router.post("/parse-voice", requireOtcAuth, async (req, res) => {
  const { command } = req.body as { command?: string };
  if (!command || typeof command !== "string") {
    res.status(400).json({ error: "command is required" });
    return;
  }

  if (!GEMINI_API_KEY) {
    res.status(503).json({ error: "Gemini not configured" });
    return;
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are a ride-booking AI for OTC (Orakzai Transport Corporation) in Pakistan. Parse this voice command and extract the destination and ride class.

Valid ride classes: "sovereign" (luxury), "autonomous" (smart), "community" (budget).
Pakistani city locations: DHA Phase 2, Clifton Block 5, Gulshan-e-Iqbal, Saddar, PECHS Block 2, Karachi Airport, Dolmen Mall, North Nazimabad, Korangi, Bahria Town, Blue Area Islamabad, Gulberg Lahore, Liberty Market Lahore, Model Town Lahore.

Voice command: "${command}"

Respond with valid JSON only — no markdown, no explanation:
{"destination": "exact location name or empty string", "rideClass": "sovereign|autonomous|community|null", "confidence": 0.0-1.0}`,
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.1,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = (await response.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };
    const rawText =
      data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    const parsed = JSON.parse(rawText) as {
      destination?: string;
      rideClass?: string | null;
      confidence?: number;
    };

    res.json({
      destination: parsed.destination ?? "",
      rideClass: parsed.rideClass ?? null,
      confidence: parsed.confidence ?? 0.8,
    });
  } catch (err) {
    req.log.error({ err }, "Gemini parse-voice failed");
    res.status(500).json({ error: "Failed to parse command" });
  }
});

router.get("/health", (_req, res) => {
  res.json({
    supabase: supabaseAdmin !== null,
    gemini: GEMINI_API_KEY !== "",
  });
});

export default router;
