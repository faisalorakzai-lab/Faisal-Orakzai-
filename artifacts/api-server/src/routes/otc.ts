import { Router } from "express";
import { createClient } from "@supabase/supabase-js";

const router = Router();

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
    const { error: e1 } = await supabaseAdmin
      .from("otc_character_profiles")
      .select("user_id")
      .limit(1);
    if (e1?.code === "42P01") {
      await supabaseAdmin.rpc("exec_ddl", {
        sql: `CREATE TABLE IF NOT EXISTS otc_character_profiles (
          user_id TEXT PRIMARY KEY,
          credits INTEGER NOT NULL DEFAULT 12,
          tier TEXT NOT NULL DEFAULT 'Pioneer',
          total_rides INTEGER NOT NULL DEFAULT 0,
          avg_rating FLOAT NOT NULL DEFAULT 5.0,
          equity_points INTEGER NOT NULL DEFAULT 0,
          discount_rate FLOAT NOT NULL DEFAULT 0,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );`,
      });
    }
    const { error: e2 } = await supabaseAdmin
      .from("otc_wallet_data")
      .select("user_id")
      .limit(1);
    if (e2?.code === "42P01") {
      await supabaseAdmin.rpc("exec_ddl", {
        sql: `CREATE TABLE IF NOT EXISTS otc_wallet_data (
          user_id TEXT PRIMARY KEY,
          balance INTEGER NOT NULL DEFAULT 0,
          transactions JSONB NOT NULL DEFAULT '[]',
          has_claimed_welcome BOOLEAN NOT NULL DEFAULT FALSE,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );`,
      });
    }
  } catch {
  }
}

router.post("/parse-voice", async (req, res) => {
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
