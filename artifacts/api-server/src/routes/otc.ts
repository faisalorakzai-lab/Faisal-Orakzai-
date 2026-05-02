import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import { createHmac, timingSafeEqual } from "crypto";

const router = Router();

const SUPABASE_URL       = process.env.SUPABASE_URL        ?? "";
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY ?? "";
// SESSION_SECRET is a true server-held secret — never shipped to clients.
// Tokens are HMAC-SHA256 signed with this secret and verified on every request.
// SESSION_SECRET must be set in the environment — never falls back to a default.
// If unset, OTC auth routes are disabled and the server logs a fatal error.
const SESSION_SECRET = process.env.SESSION_SECRET ?? "";
if (!SESSION_SECRET) {
  // Log immediately but don't crash the whole server — OTC routes return 503
  console.error("[OTC] FATAL: SESSION_SECRET env var is not set. All OTC auth routes will reject requests.");
}

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SECRET_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
        auth: { persistSession: false },
      })
    : null;

// ── Token helpers ─────────────────────────────────────────────────────────────
// Tokens are issued by the server only (POST /api/otc/auth/token).
// Format: base64(header).base64(payload).base64(HMAC-SHA256 signature)
// The HMAC is keyed with SESSION_SECRET — only the server can mint valid tokens.

function mintOtcToken(sub: string, phone: string): string | null {
  // Refuse to issue tokens if the signing secret is not configured
  if (!SESSION_SECRET) return null;
  const header  = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64");
  const payload = Buffer.from(
    JSON.stringify({
      sub,
      phone,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
      iss: "otc-super-app",
    })
  ).toString("base64");
  const sig = createHmac("sha256", SESSION_SECRET)
    .update(`${header}.${payload}`)
    .digest("base64");
  return `${header}.${payload}.${sig}`;
}

// Returns {sub, exp} if the token is validly signed by SESSION_SECRET, else null.
// Returns null immediately if SESSION_SECRET is unset — no tokens can be verified.
function parseOtcToken(authHeader: string | undefined): { sub: string; exp: number } | null {
  if (!SESSION_SECRET) return null;
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    // Re-compute expected HMAC signature
    const expectedSig = createHmac("sha256", SESSION_SECRET)
      .update(`${parts[0]}.${parts[1]}`)
      .digest("base64");

    // Timing-safe comparison — prevents timing attacks
    const actualBuf   = Buffer.from(parts[2],      "base64");
    const expectedBuf = Buffer.from(expectedSig,   "base64");
    if (actualBuf.length !== expectedBuf.length) return null;
    if (!timingSafeEqual(actualBuf, expectedBuf))  return null;

    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf8")) as {
      sub?: unknown;
      exp?: unknown;
      iss?: unknown;
    };
    if (payload.iss !== "otc-super-app") return null;
    if (typeof payload.sub !== "string" || typeof payload.exp !== "number") return null;

    return { sub: payload.sub, exp: payload.exp };
  } catch {
    return null;
  }
}

// Common auth guard reused across all protected routes
function requireAuth(
  authHeader: string | undefined
): { claims: { sub: string; exp: number } } | { error: string; status: number } {
  const claims = parseOtcToken(authHeader);
  if (!claims)                                      return { error: "Unauthorized — missing or invalid token", status: 401 };
  if (Math.floor(Date.now() / 1000) > claims.exp)  return { error: "Unauthorized — token expired",           status: 401 };
  return { claims };
}

export async function ensureOtcTables(): Promise<void> {
  if (!supabaseAdmin) return;
  try {
    await supabaseAdmin.from("otc_character_profiles").select("user_id").limit(1);
    await supabaseAdmin.from("otc_wallet_data").select("user_id").limit(1);
    await supabaseAdmin.from("profiles").select("user_id").limit(1);
  } catch {
    // tables may not exist yet
  }
}

// Fare rates per km for each ride type
const RATES_PER_KM: Record<string, number> = {
  community:  30,   // OTC Bike
  autonomous: 60,   // OTC Prime
  sovereign:  120,  // OTC Lux
};

// Haversine distance in km
function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Settlement helper ────────────────────────────────────────────────────────
// Called when ride status transitions to "completed".
// Records a transaction ledger entry. If wallet payment, deducts from profile.
async function settleRide(
  adminRef: NonNullable<typeof supabaseAdmin>,
  rideId: string
): Promise<void> {
  // Fetch the completed ride record
  const { data: ride, error: rideErr } = await adminRef
    .from("ride_requests")
    .select("user_id, total_fare, payment_method")
    .eq("id", rideId)
    .single();

  if (rideErr || !ride) return;

  const userId:        string = (ride.user_id as string | null) ?? "";
  const fare:          number = (ride.total_fare as number | null) ?? 0;
  const paymentMethod: string = (ride.payment_method as string | null) ?? "cash";

  if (!userId || fare <= 0) return;

  if (paymentMethod === "wallet") {
    // Fetch current wallet balance from profiles
    const { data: profile, error: profileErr } = await adminRef
      .from("profiles")
      .select("wallet_balance")
      .eq("user_id", userId)
      .single();

    if (!profileErr && profile) {
      const currentBalance = (profile.wallet_balance as number | null) ?? 0;
      const newBalance = Math.max(0, currentBalance - fare);

      await adminRef
        .from("profiles")
        .update({ wallet_balance: newBalance })
        .eq("user_id", userId);
    }

    // Insert wallet debit transaction
    await adminRef.from("transactions").insert({
      user_id:        userId,
      ride_id:        rideId,
      amount:         fare,
      type:           "debit",
      payment_method: "wallet",
      description:    `Ride fare deducted — ${rideId}`,
    });
  } else {
    // Insert cash transaction record
    await adminRef.from("transactions").insert({
      user_id:        userId,
      ride_id:        rideId,
      amount:         fare,
      type:           "debit",
      payment_method: "cash",
      description:    `Cash paid on arrival — ${rideId}`,
    });
  }
}

// ── Referral helpers ─────────────────────────────────────────────────────────

const REFERRAL_NEW_USER_COINS  = 10;   // coins credited to the new user
const REFERRAL_REFERRER_COINS  = 5;    // coins credited to the referrer
const MILESTONE_TARGET         = 10;   // successful referrals needed
const MILESTONE_PKR            = 10000; // PKR credited on milestone ($100 equiv)
const MAX_DEVICES_PER_REFERRAL = 3;    // anti-spam: one device can claim at most 3 referrals

async function creditOtcCoins(
  admin: NonNullable<typeof supabaseAdmin>,
  userId: string,
  amount: number,
  description: string
): Promise<void> {
  // Update otc_wallet_data balance
  const { data: wd } = await admin
    .from("otc_wallet_data")
    .select("balance, transactions")
    .eq("user_id", userId)
    .maybeSingle();

  const currentBalance  = (wd?.balance as number | null) ?? 0;
  const existingTxs     = Array.isArray(wd?.transactions) ? (wd?.transactions as unknown[]) : [];
  const newTx = {
    id:          Date.now().toString() + Math.random().toString(36).substring(2, 7),
    type:        "credit",
    amount,
    description,
    timestamp:   Date.now(),
    category:    "referral",
  };
  await admin.from("otc_wallet_data").upsert({
    user_id:     userId,
    balance:     currentBalance + amount,
    transactions: [newTx, ...existingTxs],
    updated_at:  new Date().toISOString(),
  });
}

// ── GET /api/otc/health ──────────────────────────────────────────────────────
router.get("/health", (_req, res) => {
  res.json({ supabase: supabaseAdmin !== null });
});

// ── POST /api/otc/auth/token ──────────────────────────────────────────────────
// Issues a server-signed HMAC-SHA256 token for the OTC app.
// Client NEVER mints its own tokens — only the server can produce valid tokens.
router.post("/auth/token", async (req, res) => {
  const { phone, otp } = req.body as { phone?: string; otp?: string };

  if (!phone?.trim()) { res.status(400).json({ error: "phone is required" }); return; }
  if (!otp?.trim())   { res.status(400).json({ error: "otp is required"   }); return; }

  // Demo OTP validation — replace with real SMS verification in production
  if (otp !== "123456" && otp !== "000000") {
    res.status(401).json({ error: "Invalid OTP. Use 123456 for demo." });
    return;
  }

  // Look up or create user profile in Supabase
  let userId: string | null = null;
  let existingName: string | null = null;
  let referralCode: string | null = null;

  if (supabaseAdmin) {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("user_id, name, referral_code")
      .eq("phone", phone.trim())
      .maybeSingle();

    userId       = (profile?.user_id       as string | null) ?? null;
    existingName = (profile?.name          as string | null) ?? null;
    referralCode = (profile?.referral_code as string | null) ?? null;
  }

  // Generate deterministic ID for new users
  if (!userId) {
    userId = Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
  }

  // Generate referral code if missing
  if (!referralCode) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "OTC";
    for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
    referralCode = code;
  }

  // Upsert profile with referral_code
  if (supabaseAdmin) {
    await supabaseAdmin.from("profiles").upsert(
      {
        user_id:       userId,
        phone:         phone.trim(),
        wallet_balance: 0,
        okbond_coins:  0,
        referral_code: referralCode,
      },
      { onConflict: "phone", ignoreDuplicates: false }
    ).then(() => {}, () => {});
  }

  const token = mintOtcToken(userId, phone.trim());
  if (!token) {
    // SESSION_SECRET was not set — reject before issuing any token
    res.status(503).json({ error: "Auth service not configured — SESSION_SECRET missing on server" });
    return;
  }

  req.log.info({ userId }, "OTC session token issued");
  res.json({ token, user_id: userId, name: existingName, referral_code: referralCode });
});

// ── GET /api/otc/referral/stats/:userId ──────────────────────────────────────
router.get("/referral/stats/:userId", async (req, res) => {
  const { userId } = req.params;
  const auth = requireAuth(req.headers.authorization);
  if ("error" in auth) { res.status(auth.status).json({ error: auth.error }); return; }
  if (auth.claims.sub !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
  if (!supabaseAdmin) { res.status(503).json({ error: "Supabase not configured" }); return; }

  const { data } = await supabaseAdmin
    .from("profiles")
    .select("referral_code, successful_referrals, milestone_claimed, referred_by")
    .eq("user_id", userId)
    .maybeSingle();

  res.json({
    referral_code:         (data?.referral_code         as string  | null) ?? null,
    successful_referrals:  (data?.successful_referrals  as number  | null) ?? 0,
    milestone_claimed:     (data?.milestone_claimed      as boolean | null) ?? false,
    referred_by:           (data?.referred_by            as string  | null) ?? null,
  });
});

// ── POST /api/otc/referral/apply ──────────────────────────────────────────────
// Called when a new user enters a referral code during profile setup.
router.post("/referral/apply", async (req, res) => {
  const auth = requireAuth(req.headers.authorization);
  if ("error" in auth) { res.status(auth.status).json({ error: auth.error }); return; }
  if (!supabaseAdmin) { res.status(503).json({ error: "Supabase not configured" }); return; }

  const { referral_code, device_id } = req.body as {
    referral_code?: string;
    device_id?: string;
  };

  if (!referral_code?.trim()) {
    res.status(400).json({ error: "referral_code is required" }); return;
  }

  const userId = auth.claims.sub;
  const code   = referral_code.trim().toUpperCase();

  // Prevent self-referral
  const { data: self } = await supabaseAdmin
    .from("profiles")
    .select("referral_code, referred_by")
    .eq("user_id", userId)
    .maybeSingle();

  if (self?.referral_code === code) {
    res.status(400).json({ error: "You cannot use your own referral code" }); return;
  }
  if (self?.referred_by) {
    res.status(400).json({ error: "You have already used a referral code" }); return;
  }

  // Device anti-spam check
  if (device_id) {
    const { count } = await supabaseAdmin
      .from("device_registry")
      .select("*", { count: "exact", head: true })
      .eq("device_id", device_id) as { count: number | null };

    if ((count ?? 0) >= MAX_DEVICES_PER_REFERRAL) {
      res.status(429).json({
        error: "Too many accounts created from this device",
      }); return;
    }
    // Register device
    await supabaseAdmin
      .from("device_registry")
      .upsert({ device_id, user_id: userId });
  }

  // Find the referrer
  const { data: referrer } = await supabaseAdmin
    .from("profiles")
    .select("user_id")
    .eq("referral_code", code)
    .maybeSingle();

  if (!referrer?.user_id) {
    res.status(404).json({ error: "Referral code not found" }); return;
  }

  // Store referred_by on the new user's profile
  await supabaseAdmin
    .from("profiles")
    .update({ referred_by: code })
    .eq("user_id", userId);

  req.log.info({ userId, referral_code: code }, "Referral code applied");
  res.json({ message: "Referral code applied! Rewards unlock after your first ride." });
});

// ── POST /api/otc/referral/complete ───────────────────────────────────────────
// Called after the new user's first ride completes.
// Credits coins to both users and checks for the $100 milestone.
router.post("/referral/complete", async (req, res) => {
  const auth = requireAuth(req.headers.authorization);
  if ("error" in auth) { res.status(auth.status).json({ error: auth.error }); return; }
  if (!supabaseAdmin) { res.status(503).json({ error: "Supabase not configured" }); return; }

  const userId = auth.claims.sub;

  // ── Verify a real completed ride exists for this user ─────────────────────
  // This prevents the endpoint from being triggered without a genuine ride.
  const { data: completedRide } = await supabaseAdmin
    .from("ride_requests")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "completed")
    .limit(1)
    .maybeSingle();

  if (!completedRide) {
    res.status(403).json({ error: "No completed ride found for this user" });
    return;
  }

  // Fetch new user profile
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("referred_by, first_ride_done")
    .eq("user_id", userId)
    .maybeSingle();

  if (!profile) { res.status(404).json({ error: "Profile not found" }); return; }
  if (profile.first_ride_done) {
    res.json({ message: "Already processed" }); return;
  }

  // Mark first ride done regardless of referral
  await supabaseAdmin
    .from("profiles")
    .update({ first_ride_done: true })
    .eq("user_id", userId);

  if (!profile.referred_by) {
    res.json({ message: "No referral to process" }); return;
  }

  const refCode = profile.referred_by as string;

  // Credit new user 10 coins
  await creditOtcCoins(
    supabaseAdmin,
    userId,
    REFERRAL_NEW_USER_COINS,
    "Referral reward — first ride completed"
  );

  // Find referrer
  const { data: referrerProfile } = await supabaseAdmin
    .from("profiles")
    .select("user_id, successful_referrals, milestone_claimed, wallet_balance")
    .eq("referral_code", refCode)
    .maybeSingle();

  if (!referrerProfile?.user_id) {
    res.json({ credited_new_user: true }); return;
  }

  const referrerId          = referrerProfile.user_id  as string;
  const prevReferrals       = (referrerProfile.successful_referrals as number | null) ?? 0;
  const alreadyMilestoned   = (referrerProfile.milestone_claimed   as boolean| null) ?? false;
  const newReferrals        = prevReferrals + 1;

  // Credit referrer 5 coins
  await creditOtcCoins(
    supabaseAdmin,
    referrerId,
    REFERRAL_REFERRER_COINS,
    `Referral reward — friend completed first ride`
  );

  // Increment successful_referrals
  const updatePayload: Record<string, unknown> = { successful_referrals: newReferrals };

  // Milestone check
  if (newReferrals >= MILESTONE_TARGET && !alreadyMilestoned) {
    const currentWallet = (referrerProfile.wallet_balance as number | null) ?? 0;
    updatePayload["milestone_claimed"] = true;
    updatePayload["wallet_balance"]    = currentWallet + MILESTONE_PKR;

    // Also credit milestone coins (1000 coins = 10,000 PKR)
    await creditOtcCoins(
      supabaseAdmin,
      referrerId,
      1000,
      "🏆 $100 Mega-Milestone Achievement — 10 successful referrals!"
    );

    req.log.info({ referrerId, newReferrals }, "Milestone reached!");
  }

  await supabaseAdmin
    .from("profiles")
    .update(updatePayload)
    .eq("user_id", referrerId);

  req.log.info(
    { userId, referrerId, newReferrals },
    "Referral completed"
  );

  res.json({
    credited_new_user:   true,
    credited_referrer:   true,
    referrer_referrals:  newReferrals,
    milestone_triggered: newReferrals >= MILESTONE_TARGET && !alreadyMilestoned,
  });
});

// ── GET /api/otc/wallet-balance/:userId ──────────────────────────────────────
// Requires a valid OTC session token (Authorization: Bearer <token>).
// The token's sub claim must match the requested userId.
router.get("/wallet-balance/:userId", async (req, res) => {
  const { userId } = req.params;

  if (!userId || userId.trim() === "") {
    res.status(400).json({ error: "userId is required" });
    return;
  }

  const auth = requireAuth(req.headers.authorization);
  if ("error" in auth) { res.status(auth.status).json({ error: auth.error }); return; }
  if (auth.claims.sub !== userId) {
    res.status(403).json({ error: "Forbidden — token subject does not match userId" });
    return;
  }

  if (!supabaseAdmin) {
    res.status(503).json({ error: "Supabase not configured" });
    return;
  }

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("wallet_balance")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    res.json({ wallet_balance: 0 });
    return;
  }

  res.json({ wallet_balance: (data.wallet_balance as number | null) ?? 0 });
});

// ── GET /api/otc/rides/history/:userId ────────────────────────────────────────
router.get("/rides/history/:userId", async (req, res) => {
  const { userId } = req.params;
  const auth = requireAuth(req.headers.authorization);
  if ("error" in auth) { res.status(auth.status).json({ error: auth.error }); return; }
  if (auth.claims.sub !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
  if (!supabaseAdmin) { res.status(503).json({ error: "Supabase not configured" }); return; }

  const { data, error } = await supabaseAdmin
    .from("ride_requests")
    .select("id, user_id, status, ride_type, pickup_address, dropoff_address, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, total_fare, payment_method, driver_name, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) { res.status(500).json({ error: "Failed to fetch ride history" }); return; }

  const rides = (data ?? []).map((row) => ({
    id:               row.id               as string,
    user_id:          row.user_id           as string,
    status:           row.status            as string,
    ride_type:        row.ride_type         as string,
    pickup_address:   (row.pickup_address   as string | null) ?? "Pickup",
    dropoff_address:  (row.dropoff_address  as string | null) ?? "Dropoff",
    total_fare:       (row.total_fare       as number | null) ?? 0,
    payment_method:   (row.payment_method   as string | null) ?? "cash",
    driver_name:      (row.driver_name      as string | null) ?? null,
    created_at:       row.created_at        as string,
  }));
  res.json({ rides });
});

// ── POST /api/otc/match-driver ───────────────────────────────────────────────
// Finds nearest available driver, calculates fare, assigns to ride_request
router.post("/match-driver", async (req, res) => {
  const {
    ride_request_id,
    pickup_lat,
    pickup_lng,
    ride_type,
    distance_km,
    payment_method,
  } = req.body as {
    ride_request_id?: string;
    pickup_lat?: number;
    pickup_lng?: number;
    ride_type?: string;
    distance_km?: number;
    payment_method?: string;
  };

  if (!ride_request_id || pickup_lat == null || pickup_lng == null || !ride_type) {
    res.status(400).json({ error: "Missing required fields: ride_request_id, pickup_lat, pickup_lng, ride_type" });
    return;
  }

  // Verify the caller holds a valid session token
  const auth = requireAuth(req.headers.authorization);
  if ("error" in auth) { res.status(auth.status).json({ error: auth.error }); return; }

  if (!supabaseAdmin) {
    res.status(503).json({ error: "Supabase not configured on server" });
    return;
  }

  // Verify ride_request belongs to the authenticated user
  const { data: rideOwner } = await supabaseAdmin
    .from("ride_requests")
    .select("user_id")
    .eq("id", ride_request_id)
    .single();
  if (rideOwner?.user_id && rideOwner.user_id !== auth.claims.sub) {
    res.status(403).json({ error: "Forbidden — ride request does not belong to this user" });
    return;
  }

  // Calculate total fare
  const rate = RATES_PER_KM[ride_type] ?? 60;
  const distKm = typeof distance_km === "number" && distance_km > 0 ? distance_km : 5;
  const total_fare = Math.round(distKm * rate);

  // Normalise payment method
  const pMethod = payment_method === "wallet" ? "wallet" : "cash";

  // Query all active + online drivers
  const { data: allDrivers, error: driversError } = await supabaseAdmin
    .from("drivers")
    .select("id, name, phone, vehicle_model, plate_number, lat, lng, ride_type, rating, total_rides")
    .eq("status", "active")
    .eq("is_online", true);

  if (driversError) {
    req.log.error({ err: driversError }, "Failed to query drivers table");
    res.status(500).json({ error: "Failed to query drivers" });
    return;
  }

  if (!allDrivers || allDrivers.length === 0) {
    await supabaseAdmin
      .from("ride_requests")
      .update({ status: "no_drivers" })
      .eq("id", ride_request_id);
    res.json({ status: "no_drivers", message: "No active drivers available" });
    return;
  }

  // Ride-type compatibility map — sovereign drivers can serve autonomous too
  const compat: Record<string, string[]> = {
    community:  ["community"],
    autonomous: ["autonomous", "sovereign"],
    sovereign:  ["sovereign"],
  };
  const compatTypes = compat[ride_type] ?? [ride_type];

  type DriverRow = typeof allDrivers[number];
  let best: DriverRow | null = null;
  let bestDist = Infinity;

  // Pass 1: compatible type within 5 km
  for (const d of allDrivers) {
    if (!compatTypes.includes(d.ride_type as string)) continue;
    const dist = haversineKm(pickup_lat, pickup_lng, d.lat as number, d.lng as number);
    if (dist <= 5 && dist < bestDist) { best = d; bestDist = dist; }
  }

  // Pass 2: any active driver within 10 km
  if (!best) {
    for (const d of allDrivers) {
      const dist = haversineKm(pickup_lat, pickup_lng, d.lat as number, d.lng as number);
      if (dist <= 10 && dist < bestDist) { best = d; bestDist = dist; }
    }
  }

  // Pass 3: last resort — closest overall
  if (!best) {
    for (const d of allDrivers) {
      const dist = haversineKm(pickup_lat, pickup_lng, d.lat as number, d.lng as number);
      if (dist < bestDist) { best = d; bestDist = dist; }
    }
  }

  if (!best) {
    await supabaseAdmin
      .from("ride_requests")
      .update({ status: "no_drivers" })
      .eq("id", ride_request_id);
    res.json({ status: "no_drivers" });
    return;
  }

  // ETA: distance / average city speed 28 km/h → minutes, min 2
  const etaMinutes = Math.max(2, Math.round((bestDist / 28) * 60));

  // Update ride_request — triggers Supabase Realtime on the client
  const { error: updateError } = await supabaseAdmin
    .from("ride_requests")
    .update({
      status:               "assigned",
      driver_id:            best.id,
      driver_name:          best.name,
      driver_phone:         best.phone ?? null,
      driver_vehicle_model: best.vehicle_model ?? null,
      driver_plate:         best.plate_number ?? null,
      driver_rating:        best.rating ?? 4.8,
      driver_eta:           etaMinutes,
      total_fare,
      payment_method:       pMethod,
    })
    .eq("id", ride_request_id);

  if (updateError) {
    req.log.error({ err: updateError }, "Failed to assign driver to ride_request");
    res.status(500).json({ error: "Failed to assign driver" });
    return;
  }

  req.log.info(
    { ride_request_id, driver_id: best.id, eta: etaMinutes, total_fare, payment_method: pMethod },
    "Driver assigned"
  );

  // ── Auto-simulation: advance ride lifecycle ───────────────────────────────
  // 10 s → ongoing  |  30 s → completed (+ settle payment)
  const adminRef = supabaseAdmin;
  setTimeout(() => {
    adminRef
      .from("ride_requests")
      .update({ status: "ongoing" })
      .eq("id", ride_request_id)
      .then(() => {
        setTimeout(() => {
          adminRef
            .from("ride_requests")
            .update({ status: "completed" })
            .eq("id", ride_request_id)
            .then(() => {
              settleRide(adminRef, ride_request_id).catch(() => {});
            });
        }, 20_000);
      });
  }, 10_000);

  res.json({
    status: "assigned",
    driver: {
      id:            best.id as string,
      name:          best.name as string,
      phone:         (best.phone ?? null) as string | null,
      vehicle_model: (best.vehicle_model ?? null) as string | null,
      plate_number:  (best.plate_number ?? null) as string | null,
      rating:        (best.rating ?? 4.8) as number,
      eta:           etaMinutes,
    },
    total_fare,
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// ── HOTEL & RESIDENCY MODULE ───────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════════════════
// ── AIRLINES & GLOBAL TRAVEL MODULE ───────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

// ── POST /api/otc/flight/request ───────────────────────────────────────────────
router.post("/flight/request", async (req, res) => {
  const auth = requireAuth(req.headers.authorization);
  if ("error" in auth) { res.status(auth.status).json({ error: auth.error }); return; }
  if (!supabaseAdmin)  { res.status(503).json({ error: "Supabase not configured" }); return; }

  const userId = auth.claims.sub;
  const {
    travel_type, from_city, to_city, departure_date,
    travel_class, passengers, suggested_fare, proposed_fare, visa_assistance,
  } = req.body as {
    travel_type?: string; from_city?: string; to_city?: string;
    departure_date?: string; travel_class?: string; passengers?: number;
    suggested_fare?: number; proposed_fare?: number | null; visa_assistance?: boolean;
  };

  if (!travel_type?.trim())    { res.status(400).json({ error: "travel_type is required" });    return; }
  if (!from_city?.trim())      { res.status(400).json({ error: "from_city is required" });      return; }
  if (!to_city?.trim())        { res.status(400).json({ error: "to_city is required" });        return; }
  if (!departure_date?.trim()) { res.status(400).json({ error: "departure_date is required" }); return; }
  if (!travel_class?.trim())   { res.status(400).json({ error: "travel_class is required" });   return; }
  if (!suggested_fare || suggested_fare < 1) { res.status(400).json({ error: "suggested_fare is required" }); return; }

  const pax = (passengers && passengers > 0) ? passengers : 1;

  const { data: booking, error: insertErr } = await supabaseAdmin
    .from("airline_bookings")
    .insert({
      user_id:         userId,
      travel_type:     travel_type.trim(),
      from_city:       from_city.trim(),
      to_city:         to_city.trim(),
      departure_date,
      travel_class:    travel_class.trim(),
      passengers:      pax,
      suggested_fare,
      proposed_fare:   (typeof proposed_fare === "number" && proposed_fare > 0) ? proposed_fare : null,
      visa_assistance: visa_assistance === true,
      status:          "pending_approval",
    })
    .select()
    .single();

  if (insertErr || !booking) {
    req.log.error({ insertErr }, "Failed to insert flight booking");
    res.status(500).json({ error: "Failed to create booking" });
    return;
  }

  req.log.info({ userId, from_city, to_city, travel_type }, "Flight booking request created");
  res.status(201).json({
    booking: {
      id:              booking.id              as string,
      user_id:         booking.user_id         as string,
      travel_type:     booking.travel_type     as string,
      from_city:       booking.from_city       as string,
      to_city:         booking.to_city         as string,
      departure_date:  booking.departure_date  as string,
      travel_class:    booking.travel_class    as string,
      passengers:      booking.passengers      as number,
      suggested_fare:  booking.suggested_fare  as number,
      proposed_fare:   booking.proposed_fare   as number | null,
      visa_assistance: booking.visa_assistance as boolean,
      status:          booking.status          as string,
      admin_note:      booking.admin_note      as string | null,
      final_fare:      booking.final_fare      as number | null,
      created_at:      booking.created_at      as string,
    },
  });
});

// ── GET /api/otc/flight/bookings/:userId ───────────────────────────────────────
router.get("/flight/bookings/:userId", async (req, res) => {
  const { userId } = req.params;
  const auth = requireAuth(req.headers.authorization);
  if ("error" in auth) { res.status(auth.status).json({ error: auth.error }); return; }
  if (auth.claims.sub !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
  if (!supabaseAdmin) { res.status(503).json({ error: "Supabase not configured" }); return; }

  const { data, error } = await supabaseAdmin
    .from("airline_bookings")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) { res.status(500).json({ error: "Failed to fetch flight bookings" }); return; }

  const bookings = (data ?? []).map((row) => ({
    id:              row.id              as string,
    user_id:         row.user_id         as string,
    travel_type:     row.travel_type     as string,
    from_city:       row.from_city       as string,
    to_city:         row.to_city         as string,
    departure_date:  row.departure_date  as string,
    travel_class:    row.travel_class    as string,
    passengers:      row.passengers      as number,
    suggested_fare:  row.suggested_fare  as number,
    proposed_fare:   row.proposed_fare   as number | null,
    visa_assistance: row.visa_assistance as boolean,
    status:          row.status          as string,
    admin_note:      row.admin_note      as string | null,
    final_fare:      row.final_fare      as number | null,
    created_at:      row.created_at      as string,
  }));
  res.json({ bookings });
});

// ── PATCH /api/otc/flight/request/:requestId/status ───────────────────────────
router.patch("/flight/request/:requestId/status", async (req, res) => {
  const { requestId } = req.params;
  const auth = requireAuth(req.headers.authorization);
  if ("error" in auth) { res.status(auth.status).json({ error: auth.error }); return; }
  if (!supabaseAdmin)  { res.status(503).json({ error: "Supabase not configured" }); return; }

  const allowed = ["confirmed", "negotiating", "cancelled"];
  const { status, admin_note, final_fare } = req.body as {
    status?: string; admin_note?: string; final_fare?: number;
  };
  if (!status || !allowed.includes(status)) {
    res.status(400).json({ error: `status must be one of: ${allowed.join(", ")}` }); return;
  }

  const { data: updated, error } = await supabaseAdmin
    .from("airline_bookings")
    .update({
      status,
      admin_note: admin_note ?? null,
      final_fare: final_fare ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .select()
    .single();

  if (error || !updated) { res.status(404).json({ error: "Flight booking not found" }); return; }

  req.log.info({ requestId, status, admin: auth.claims.sub }, "Flight booking status updated");
  res.json({ message: "Status updated", status, id: requestId });
});

// ── GET /api/otc/flight/admin ─────────────────────────────────────────────────
router.get("/flight/admin", async (req, res) => {
  const auth = requireAuth(req.headers.authorization);
  if ("error" in auth) { res.status(auth.status).json({ error: auth.error }); return; }
  if (!supabaseAdmin)  { res.status(503).json({ error: "Supabase not configured" }); return; }

  const statusFilter = (req.query.status as string | undefined) ?? "pending_approval";

  const { data, error } = await supabaseAdmin
    .from("airline_bookings")
    .select("*")
    .eq("status", statusFilter)
    .order("created_at", { ascending: false });

  if (error) { res.status(500).json({ error: "Failed to fetch admin flight requests" }); return; }

  res.json({ requests: data ?? [], total: (data ?? []).length });
});

// ── GET /api/otc/hotels ────────────────────────────────────────────────────────
router.get("/hotels", async (_req, res) => {
  if (!supabaseAdmin) { res.status(503).json({ error: "Supabase not configured" }); return; }

  const { data, error } = await supabaseAdmin
    .from("hotels")
    .select("*")
    .eq("available", true)
    .order("sort_order", { ascending: true });

  if (error) { res.status(500).json({ error: "Failed to fetch hotels" }); return; }

  const hotels = (data ?? []).map((row) => ({
    id:              row.id              as string,
    name:            row.name            as string,
    city:            row.city            as string,
    stars:           row.stars           as number,
    description:     row.description     as string,
    cover_image_url: row.cover_image_url as string | null,
    images:          (row.images         as string[]) ?? [],
    starting_rate:   row.starting_rate   as number,
    room_types:      (row.room_types     as object[]) ?? [],
    amenities:       (row.amenities      as string[]) ?? [],
    available:       row.available       as boolean,
  }));
  res.json({ hotels });
});

// ── POST /api/otc/hotel/request ────────────────────────────────────────────────
router.post("/hotel/request", async (req, res) => {
  const auth = requireAuth(req.headers.authorization);
  if ("error" in auth) { res.status(auth.status).json({ error: auth.error }); return; }
  if (!supabaseAdmin)  { res.status(503).json({ error: "Supabase not configured" }); return; }

  const userId = auth.claims.sub;
  const { hotel_id, room_type, room_rate, check_in, check_out, nights, proposed_rate } = req.body as {
    hotel_id?: string; room_type?: string; room_rate?: number;
    check_in?: string; check_out?: string; nights?: number;
    proposed_rate?: number | null;
  };

  if (!hotel_id?.trim())  { res.status(400).json({ error: "hotel_id is required" });  return; }
  if (!room_type?.trim()) { res.status(400).json({ error: "room_type is required" }); return; }
  if (!check_in?.trim())  { res.status(400).json({ error: "check_in is required" });  return; }
  if (!check_out?.trim()) { res.status(400).json({ error: "check_out is required" }); return; }
  if (!nights || nights < 1) { res.status(400).json({ error: "nights must be >= 1" }); return; }

  const { data: hotel } = await supabaseAdmin
    .from("hotels")
    .select("id, name, cover_image_url, available, starting_rate")
    .eq("id", hotel_id.trim())
    .maybeSingle();

  if (!hotel)          { res.status(404).json({ error: "Hotel not found" });                return; }
  if (!hotel.available){ res.status(409).json({ error: "Hotel is fully booked" });          return; }

  const canonicalRate = (room_rate && room_rate > 0) ? room_rate : (hotel.starting_rate as number);
  const effectiveRate = (typeof proposed_rate === "number" && proposed_rate > 0)
    ? proposed_rate : canonicalRate;
  const totalCost = effectiveRate * nights;

  const { data: booking, error: insertErr } = await supabaseAdmin
    .from("hotel_bookings")
    .insert({
      user_id:       userId,
      hotel_id:      hotel.id,
      room_type:     room_type.trim(),
      check_in,
      check_out,
      nights,
      room_rate:     canonicalRate,
      proposed_rate: (typeof proposed_rate === "number" && proposed_rate > 0) ? proposed_rate : null,
      total_cost:    totalCost,
      status:        "pending_approval",
    })
    .select()
    .single();

  if (insertErr || !booking) {
    req.log.error({ insertErr }, "Failed to insert hotel booking");
    res.status(500).json({ error: "Failed to create booking" });
    return;
  }

  req.log.info({ userId, hotelId: hotel_id, nights }, "Hotel booking request created");
  res.status(201).json({
    booking: {
      id:              booking.id              as string,
      user_id:         booking.user_id         as string,
      hotel_id:        booking.hotel_id        as string,
      hotel_name:      hotel.name              as string,
      hotel_image_url: (hotel.cover_image_url  as string | null) ?? "",
      room_type:       booking.room_type       as string,
      check_in:        booking.check_in        as string,
      check_out:       booking.check_out       as string,
      nights:          booking.nights          as number,
      room_rate:       booking.room_rate       as number,
      proposed_rate:   booking.proposed_rate   as number | null,
      total_cost:      booking.total_cost      as number,
      status:          booking.status          as string,
      admin_note:      booking.admin_note      as string | null,
      created_at:      booking.created_at      as string,
    },
  });
});

// ── GET /api/otc/hotel/bookings/:userId ────────────────────────────────────────
router.get("/hotel/bookings/:userId", async (req, res) => {
  const { userId } = req.params;
  const auth = requireAuth(req.headers.authorization);
  if ("error" in auth) { res.status(auth.status).json({ error: auth.error }); return; }
  if (auth.claims.sub !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
  if (!supabaseAdmin) { res.status(503).json({ error: "Supabase not configured" }); return; }

  const { data, error } = await supabaseAdmin
    .from("hotel_bookings")
    .select("*, hotels(name, cover_image_url)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) { res.status(500).json({ error: "Failed to fetch hotel bookings" }); return; }

  const bookings = (data ?? []).map((row) => {
    const h = row.hotels as { name: string; cover_image_url: string | null } | null;
    return {
      id:              row.id            as string,
      user_id:         row.user_id       as string,
      hotel_id:        row.hotel_id      as string,
      hotel_name:      h?.name           ?? (row.hotel_id as string),
      hotel_image_url: h?.cover_image_url ?? "",
      room_type:       row.room_type     as string,
      check_in:        row.check_in      as string,
      check_out:       row.check_out     as string,
      nights:          row.nights        as number,
      room_rate:       row.room_rate     as number,
      proposed_rate:   row.proposed_rate as number | null,
      total_cost:      row.total_cost    as number,
      status:          row.status        as string,
      admin_note:      row.admin_note    as string | null,
      created_at:      row.created_at    as string,
    };
  });
  res.json({ bookings });
});

// ── PATCH /api/otc/hotel/request/:requestId/status ────────────────────────────
router.patch("/hotel/request/:requestId/status", async (req, res) => {
  const { requestId } = req.params;
  const auth = requireAuth(req.headers.authorization);
  if ("error" in auth) { res.status(auth.status).json({ error: auth.error }); return; }
  if (!supabaseAdmin)  { res.status(503).json({ error: "Supabase not configured" }); return; }

  const allowed = ["confirmed", "negotiating", "cancelled"];
  const { status, admin_note } = req.body as { status?: string; admin_note?: string };
  if (!status || !allowed.includes(status)) {
    res.status(400).json({ error: `status must be one of: ${allowed.join(", ")}` });
    return;
  }

  const { data: updated, error } = await supabaseAdmin
    .from("hotel_bookings")
    .update({ status, admin_note: admin_note ?? null, updated_at: new Date().toISOString() })
    .eq("id", requestId)
    .select()
    .single();

  if (error || !updated) { res.status(404).json({ error: "Hotel booking not found" }); return; }

  req.log.info({ requestId, status, admin: auth.claims.sub }, "Hotel booking status updated");
  res.json({ message: "Status updated", status, id: requestId });
});

// ── GET /api/otc/hotel/admin ───────────────────────────────────────────────────
router.get("/hotel/admin", async (req, res) => {
  const auth = requireAuth(req.headers.authorization);
  if ("error" in auth) { res.status(auth.status).json({ error: auth.error }); return; }
  if (!supabaseAdmin)  { res.status(503).json({ error: "Supabase not configured" }); return; }

  const statusFilter = (req.query.status as string | undefined) ?? "pending_approval";

  const { data, error } = await supabaseAdmin
    .from("hotel_bookings")
    .select("*, hotels(name, city, cover_image_url, stars)")
    .eq("status", statusFilter)
    .order("created_at", { ascending: false });

  if (error) { res.status(500).json({ error: "Failed to fetch admin hotel requests" }); return; }

  const requests = (data ?? []).map((row) => {
    const h = row.hotels as { name: string; city: string; cover_image_url: string | null; stars: number } | null;
    return {
      id:              row.id            as string,
      user_id:         row.user_id       as string,
      hotel_id:        row.hotel_id      as string,
      hotel_name:      h?.name           ?? row.hotel_id,
      hotel_city:      h?.city           ?? "",
      hotel_stars:     h?.stars          ?? 0,
      hotel_image_url: h?.cover_image_url ?? "",
      room_type:       row.room_type     as string,
      check_in:        row.check_in      as string,
      check_out:       row.check_out     as string,
      nights:          row.nights        as number,
      room_rate:       row.room_rate     as number,
      proposed_rate:   row.proposed_rate as number | null,
      total_cost:      row.total_cost    as number,
      status:          row.status        as string,
      admin_note:      row.admin_note    as string | null,
      created_at:      row.created_at    as string,
    };
  });
  res.json({ requests, total: requests.length });
});

// ══════════════════════════════════════════════════════════════════════════════
// ── RENT-A-CAR MODULE ─────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

// ── GET /api/otc/cars ─────────────────────────────────────────────────────────
// Public endpoint — returns the full car fleet catalog sorted by sort_order.
router.get("/cars", async (_req, res) => {
  if (!supabaseAdmin) {
    res.status(503).json({ error: "Supabase not configured" });
    return;
  }
  const { data, error } = await supabaseAdmin
    .from("cars")
    .select("*")
    .eq("available", true)
    .order("sort_order", { ascending: true });

  if (error) {
    res.status(500).json({ error: "Failed to fetch cars" });
    return;
  }
  const cars = (data ?? []).map((row) => ({
    id:           row.id           as string,
    name:         row.name         as string,
    category:     row.category     as string,
    fuel_type:    row.fuel_type    as string,
    transmission: row.transmission as string,
    seats:        row.seats        as number,
    base_rate:    row.base_rate    as number,
    image_url:    row.image_url    as string | null,
    features:     (row.features    as string[]) ?? [],
    available:    row.available    as boolean,
  }));
  res.json({ cars });
});

// ── POST /api/otc/rental/request ──────────────────────────────────────────────
// Authenticated. Creates a new rental booking request (status: pending_approval).
router.post("/rental/request", async (req, res) => {
  const auth = requireAuth(req.headers.authorization);
  if ("error" in auth) { res.status(auth.status).json({ error: auth.error }); return; }
  if (!supabaseAdmin) { res.status(503).json({ error: "Supabase not configured" }); return; }

  const userId = auth.claims.sub;
  const {
    car_id,
    start_date,
    end_date,
    days,
    proposed_rate,
  } = req.body as {
    car_id?: string;
    start_date?: string;
    end_date?: string;
    days?: number;
    proposed_rate?: number | null;
  };

  if (!car_id?.trim())    { res.status(400).json({ error: "car_id is required" });    return; }
  if (!start_date?.trim()) { res.status(400).json({ error: "start_date is required" }); return; }
  if (!end_date?.trim())   { res.status(400).json({ error: "end_date is required" });   return; }
  if (!days || days < 1)   { res.status(400).json({ error: "days must be >= 1" });       return; }

  // Fetch the car to get the canonical base_rate
  const { data: car } = await supabaseAdmin
    .from("cars")
    .select("id, name, base_rate, image_url, available")
    .eq("id", car_id.trim())
    .maybeSingle();

  if (!car) { res.status(404).json({ error: "Car not found" }); return; }
  if (!car.available) { res.status(409).json({ error: "Car is currently unavailable" }); return; }

  const baseRate    = car.base_rate    as number;
  const effectiveRate = (typeof proposed_rate === "number" && proposed_rate > 0)
    ? proposed_rate
    : baseRate;
  const totalCost = effectiveRate * days;

  const { data: booking, error: insertErr } = await supabaseAdmin
    .from("rental_requests")
    .insert({
      user_id:       userId,
      car_id:        car.id,
      start_date,
      end_date,
      days,
      base_rate:     baseRate,
      proposed_rate: (typeof proposed_rate === "number" && proposed_rate > 0) ? proposed_rate : null,
      total_cost:    totalCost,
      status:        "pending_approval",
    })
    .select()
    .single();

  if (insertErr || !booking) {
    req.log.error({ insertErr }, "Failed to insert rental request");
    res.status(500).json({ error: "Failed to create booking" });
    return;
  }

  req.log.info({ userId, carId: car_id, days }, "Rental request created");
  res.status(201).json({
    booking: {
      id:            booking.id            as string,
      car_id:        booking.car_id        as string,
      car_name:      car.name              as string,
      car_image_url: (car.image_url        as string | null) ?? "",
      start_date:    booking.start_date    as string,
      end_date:      booking.end_date      as string,
      days:          booking.days          as number,
      base_rate:     booking.base_rate     as number,
      proposed_rate: booking.proposed_rate as number | null,
      total_cost:    booking.total_cost    as number,
      status:        booking.status        as string,
      admin_note:    booking.admin_note    as string | null,
      created_at:    booking.created_at    as string,
    },
  });
});

// ── GET /api/otc/rental/bookings/:userId ──────────────────────────────────────
// Authenticated. Returns the user's rental bookings, most recent first.
router.get("/rental/bookings/:userId", async (req, res) => {
  const { userId } = req.params;
  const auth = requireAuth(req.headers.authorization);
  if ("error" in auth) { res.status(auth.status).json({ error: auth.error }); return; }
  if (auth.claims.sub !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
  if (!supabaseAdmin) { res.status(503).json({ error: "Supabase not configured" }); return; }

  const { data, error } = await supabaseAdmin
    .from("rental_requests")
    .select("*, cars(name, image_url)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    res.status(500).json({ error: "Failed to fetch bookings" });
    return;
  }

  const bookings = (data ?? []).map((row) => {
    const carRef = row.cars as { name: string; image_url: string | null } | null;
    return {
      id:            row.id            as string,
      car_id:        row.car_id        as string,
      car_name:      carRef?.name      ?? (row.car_id as string),
      car_image_url: carRef?.image_url ?? "",
      start_date:    row.start_date    as string,
      end_date:      row.end_date      as string,
      days:          row.days          as number,
      base_rate:     row.base_rate     as number,
      proposed_rate: row.proposed_rate as number | null,
      total_cost:    row.total_cost    as number,
      status:        row.status        as string,
      admin_note:    row.admin_note    as string | null,
      created_at:    row.created_at    as string,
    };
  });

  res.json({ bookings });
});

// ── PATCH /api/otc/rental/request/:requestId/status ───────────────────────────
// Admin-only: approve, negotiate, or cancel a rental request.
// In production, add an admin role check. For now, any authenticated user can
// call this (suitable for internal admin panel use behind a separate admin auth).
router.patch("/rental/request/:requestId/status", async (req, res) => {
  const { requestId } = req.params;
  const auth = requireAuth(req.headers.authorization);
  if ("error" in auth) { res.status(auth.status).json({ error: auth.error }); return; }
  if (!supabaseAdmin) { res.status(503).json({ error: "Supabase not configured" }); return; }

  const { status, admin_note } = req.body as {
    status?: "confirmed" | "negotiating" | "cancelled";
    admin_note?: string;
  };
  const allowed = ["confirmed", "negotiating", "cancelled"];
  if (!status || !allowed.includes(status)) {
    res.status(400).json({ error: `status must be one of: ${allowed.join(", ")}` });
    return;
  }

  const { data: updated, error } = await supabaseAdmin
    .from("rental_requests")
    .update({
      status,
      admin_note: admin_note ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .select()
    .single();

  if (error || !updated) {
    res.status(404).json({ error: "Rental request not found" });
    return;
  }

  req.log.info({ requestId, status, admin: auth.claims.sub }, "Rental request status updated");
  res.json({ message: "Status updated", status, id: requestId });
});

// ── GET /api/otc/rental/admin ─────────────────────────────────────────────────
// Admin view: all rental requests with car + user profile info, newest first.
router.get("/rental/admin", async (req, res) => {
  const auth = requireAuth(req.headers.authorization);
  if ("error" in auth) { res.status(auth.status).json({ error: auth.error }); return; }
  if (!supabaseAdmin) { res.status(503).json({ error: "Supabase not configured" }); return; }

  const statusFilter = (req.query.status as string | undefined) ?? "pending_approval";

  const { data, error } = await supabaseAdmin
    .from("rental_requests")
    .select("*, cars(name, category, image_url, base_rate)")
    .eq("status", statusFilter)
    .order("created_at", { ascending: false });

  if (error) {
    res.status(500).json({ error: "Failed to fetch admin requests" });
    return;
  }

  const requests = (data ?? []).map((row) => {
    const carRef = row.cars as { name: string; category: string; image_url: string | null; base_rate: number } | null;
    return {
      id:            row.id            as string,
      user_id:       row.user_id       as string,
      car_id:        row.car_id        as string,
      car_name:      carRef?.name      ?? row.car_id,
      car_category:  carRef?.category  ?? "",
      car_image_url: carRef?.image_url ?? "",
      car_base_rate: carRef?.base_rate ?? 0,
      start_date:    row.start_date    as string,
      end_date:      row.end_date      as string,
      days:          row.days          as number,
      base_rate:     row.base_rate     as number,
      proposed_rate: row.proposed_rate as number | null,
      total_cost:    row.total_cost    as number,
      status:        row.status        as string,
      admin_note:    row.admin_note    as string | null,
      created_at:    row.created_at    as string,
    };
  });

  res.json({ requests, total: requests.length });
});

export default router;
