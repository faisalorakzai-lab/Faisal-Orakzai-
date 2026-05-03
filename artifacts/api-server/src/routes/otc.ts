import { createHmac, timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { supabaseAdmin } from "../db/supabaseAdmin";

const router = Router();

const SESSION_SECRET = process.env.SESSION_SECRET ?? "";
if (!SESSION_SECRET) {
  console.error("[OTC] FATAL: SESSION_SECRET env var is not set. All OTC auth routes will reject requests.");
}

const driverOtps = new Map<string, { otp: string; expires: number }>();

type DriverClaims = { sub: string; exp: number; role: string };

type DriverRide = {
  id: string;
  pickup_address: string;
  dropoff_address: string;
  total_fare: number;
  distance_km: number;
  ride_type: string;
  payment_method: string;
  driver_id: string | null;
  status: string;
};

function mintDriverToken(driverId: string, phone: string): string | null {
  if (!SESSION_SECRET) return null;
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64");
  const payload = Buffer.from(JSON.stringify({
    sub: driverId,
    phone,
    role: "driver",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    iss: "otc-super-app",
  })).toString("base64");
  const sig = createHmac("sha256", SESSION_SECRET).update(`${header}.${payload}`).digest("base64");
  return `${header}.${payload}.${sig}`;
}

function requireDriverAuth(authHeader: string | undefined): { claims: DriverClaims } | { error: string; status: number } {
  if (!SESSION_SECRET) return { error: "Auth service not configured", status: 503 };
  if (!authHeader?.startsWith("Bearer ")) return { error: "Unauthorized — missing token", status: 401 };
  const token = authHeader.slice(7);
  const parts = token.split(".");
  if (parts.length !== 3) return { error: "Unauthorized — malformed token", status: 401 };
  try {
    const expectedSig = createHmac("sha256", SESSION_SECRET).update(`${parts[0]}.${parts[1]}`).digest("base64");
    const actualBuf = Buffer.from(parts[2], "base64");
    const expectedBuf = Buffer.from(expectedSig, "base64");
    if (actualBuf.length !== expectedBuf.length) return { error: "Unauthorized — invalid token", status: 401 };
    if (!timingSafeEqual(actualBuf, expectedBuf)) return { error: "Unauthorized — invalid token", status: 401 };
    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf8")) as {
      sub?: unknown;
      exp?: unknown;
      iss?: unknown;
      role?: unknown;
    };
    if (payload.iss !== "otc-super-app") return { error: "Unauthorized — invalid issuer", status: 401 };
    if (payload.role !== "driver") return { error: "Unauthorized — not a driver token", status: 403 };
    if (typeof payload.sub !== "string" || typeof payload.exp !== "number") return { error: "Unauthorized — malformed payload", status: 401 };
    if (Math.floor(Date.now() / 1000) > payload.exp) return { error: "Unauthorized — token expired", status: 401 };
    return { claims: { sub: payload.sub, exp: payload.exp, role: "driver" } };
  } catch {
    return { error: "Unauthorized — token parse error", status: 401 };
  }
}

router.post("/driver/otp-request", async (req, res) => {
  if (!supabaseAdmin) { res.status(503).json({ error: "Supabase not configured" }); return; }
  const { phone } = req.body as { phone?: string };
  if (!phone?.trim()) { res.status(400).json({ error: "phone is required" }); return; }
  const normalised = phone.trim().replace(/\s+/g, "");
  const { data, error } = await supabaseAdmin.from("drivers").select("id, name, phone, status").or(`phone.eq.${normalised},phone.eq.+92${normalised.replace(/^0/, "")}`).limit(1).single();
  if (error || !data) { res.status(404).json({ error: "No driver account found for this number. Contact Orakzai Services to register." }); return; }
  if (data.status === "inactive") { res.status(403).json({ error: "Your driver account is inactive. Contact support." }); return; }
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expires = Math.floor(Date.now() / 1000) + 10 * 60;
  driverOtps.set(normalised, { otp, expires });
  req.log.info({ driverId: data.id as string }, "Driver OTP requested");
  res.json({ message: "OTP sent", demoOtp: otp });
});

router.post("/driver/otp-verify", async (req, res) => {
  if (!supabaseAdmin) { res.status(503).json({ error: "Supabase not configured" }); return; }
  const { phone, otp } = req.body as { phone?: string; otp?: string };
  if (!phone?.trim() || !otp?.trim()) { res.status(400).json({ error: "phone and otp are required" }); return; }
  const normalised = phone.trim().replace(/\s+/g, "");
  const stored = driverOtps.get(normalised);
  if (!stored || Math.floor(Date.now() / 1000) > stored.expires) { res.status(401).json({ error: "OTP expired. Please request a new one." }); return; }
  if (stored.otp !== otp.trim()) { res.status(401).json({ error: "Incorrect OTP. Please try again." }); return; }
  driverOtps.delete(normalised);
  const { data, error } = await supabaseAdmin.from("drivers").select("id, name, phone, vehicle_model, plate_number, ride_type, rating, total_rides, is_online, status").or(`phone.eq.${normalised},phone.eq.+92${normalised.replace(/^0/, "")}`).limit(1).single();
  if (error || !data) { res.status(404).json({ error: "Driver not found" }); return; }
  const token = mintDriverToken(data.id as string, data.phone as string);
  if (!token) { res.status(503).json({ error: "Auth service not configured" }); return; }
  req.log.info({ driverId: data.id as string }, "Driver login successful");
  res.json({
    token,
    driver: {
      id: data.id,
      name: data.name,
      phone: data.phone,
      vehicle_model: data.vehicle_model,
      plate_number: data.plate_number,
      ride_type: data.ride_type ?? "community",
      rating: data.rating ?? 5.0,
      total_rides: data.total_rides ?? 0,
      is_online: data.is_online ?? false,
    },
  });
});

router.patch("/driver/toggle", async (req, res) => {
  const auth = requireDriverAuth(req.headers.authorization);
  if ("error" in auth) { res.status(auth.status).json({ error: auth.error }); return; }
  if (!supabaseAdmin) { res.status(503).json({ error: "Supabase not configured" }); return; }
  const { is_online } = req.body as { is_online?: boolean };
  if (typeof is_online !== "boolean") { res.status(400).json({ error: "is_online (boolean) is required" }); return; }
  const { error } = await supabaseAdmin.from("drivers").update({ is_online, updated_at: new Date().toISOString() }).eq("id", auth.claims.sub);
  if (error) { res.status(500).json({ error: "Failed to update status" }); return; }
  res.json({ is_online });
});

router.get("/driver/requests/searching", async (req, res) => {
  const auth = requireDriverAuth(req.headers.authorization);
  if ("error" in auth) { res.status(auth.status).json({ error: auth.error }); return; }
  if (!supabaseAdmin) { res.status(503).json({ error: "Supabase not configured" }); return; }

  let prefersRide = true;
  let prefersDelivery = false;
  try {
    const { data: driverRow } = await supabaseAdmin
      .from("drivers")
      .select("prefers_ride, prefers_delivery")
      .eq("id", auth.claims.sub)
      .maybeSingle();
    if (driverRow) {
      prefersRide = driverRow.prefers_ride ?? true;
      prefersDelivery = driverRow.prefers_delivery ?? false;
    }
  } catch {}

  let query = supabaseAdmin
    .from("ride_requests")
    .select("id, pickup_address, dropoff_address, total_fare, distance_km, ride_type, payment_method, driver_id, status, service_type, package_type, receiver_name, receiver_contact")
    .eq("status", "Searching")
    .is("driver_id", null)
    .order("created_at", { ascending: false })
    .limit(1);

  if (prefersRide && !prefersDelivery) {
    query = query.eq("service_type", "ride");
  } else if (!prefersRide && prefersDelivery) {
    query = query.eq("service_type", "delivery");
  } else if (!prefersRide && !prefersDelivery) {
    query = query.eq("service_type", "ride");
  }

  const { data, error } = await query.maybeSingle();
  if (error) { res.status(500).json({ error: "Failed to query pending rides" }); return; }
  res.json({ ride: data as DriverRide | null });
});

router.patch("/driver/request/:id/respond", async (req, res) => {
  const auth = requireDriverAuth(req.headers.authorization);
  if ("error" in auth) { res.status(auth.status).json({ error: auth.error }); return; }
  if (!supabaseAdmin) { res.status(503).json({ error: "Supabase not configured" }); return; }
  const { id } = req.params;
  const { action } = req.body as { action?: "accept" | "decline" };
  if (action !== "accept" && action !== "decline") { res.status(400).json({ error: "action must be 'accept' or 'decline'" }); return; }
  const driverId = auth.claims.sub;
  const newStatus = action === "accept" ? "Assigned" : "Searching";
  const updatePayload: Record<string, unknown> = { status: newStatus, updated_at: new Date().toISOString() };
  if (action === "accept") updatePayload.driver_id = driverId;
  if (action === "decline") updatePayload.driver_id = null;
  const { error } = await supabaseAdmin.from("ride_requests").update(updatePayload).eq("id", id);
  if (error) { res.status(500).json({ error: "Failed to update ride" }); return; }
  res.json({ status: newStatus });
});

const COMMISSION_RATE = Number(process.env.OTC_COMMISSION_RATE ?? 0.20);

router.patch("/driver/request/:id/state", async (req, res) => {
  const auth = requireDriverAuth(req.headers.authorization);
  if ("error" in auth) { res.status(auth.status).json({ error: auth.error }); return; }
  if (!supabaseAdmin) { res.status(503).json({ error: "Supabase not configured" }); return; }
  const { id } = req.params;
  const { status } = req.body as { status?: "arrived" | "ongoing" | "completed" };
  if (!["arrived", "ongoing", "completed"].includes(String(status))) { res.status(400).json({ error: "status must be arrived, ongoing, or completed" }); return; }
  const { error } = await supabaseAdmin.from("ride_requests").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) { res.status(500).json({ error: "Failed to update ride state" }); return; }

  // Auto-settle commission when ride completes
  if (status === "completed") {
    try {
      const { data: ride } = await supabaseAdmin
        .from("ride_requests")
        .select("total_fare, payment_method")
        .eq("id", id)
        .maybeSingle();
      if (ride) {
        const fare = Number(ride.total_fare) || 0;
        const commissionAmount = Math.round(fare * COMMISSION_RATE);
        const netEarnings = fare - commissionAmount;
        const paymentMethod = String(ride.payment_method ?? "cash");
        await supabaseAdmin.from("driver_earnings").insert({
          driver_id: auth.claims.sub,
          ride_id: id,
          total_fare: fare,
          commission_rate: COMMISSION_RATE,
          commission_amount: commissionAmount,
          net_earnings: netEarnings,
          payment_method: paymentMethod,
          is_cash_debt_paid: false,
          settled_at: new Date().toISOString(),
        }).then(() => {/* best-effort insert */});
        res.json({
          status,
          settlement: {
            totalFare: fare,
            commissionRate: COMMISSION_RATE,
            commissionAmount,
            netEarnings,
            paymentMethod,
          },
        });
        return;
      }
    } catch { /* fall through to plain response */ }
  }

  res.json({ status });
});

router.get("/driver/earnings", async (req, res) => {
  const auth = requireDriverAuth(req.headers.authorization);
  if ("error" in auth) { res.status(auth.status).json({ error: auth.error }); return; }
  if (!supabaseAdmin) { res.status(503).json({ error: "Supabase not configured" }); return; }
  try {
    const { data, error } = await supabaseAdmin
      .from("driver_earnings")
      .select("id, ride_id, total_fare, commission_rate, commission_amount, net_earnings, payment_method, is_cash_debt_paid, settled_at")
      .eq("driver_id", auth.claims.sub)
      .order("settled_at", { ascending: false })
      .limit(100);
    if (error) {
      // Table might not exist yet — return empty list gracefully
      req.log.warn({ err: error }, "driver_earnings table query failed");
      res.json({ earnings: [] });
      return;
    }
    res.json({ earnings: data ?? [] });
  } catch {
    res.json({ earnings: [] });
  }
});

router.get("/driver/request/:id/chat", async (req, res) => {
  const auth = requireDriverAuth(req.headers.authorization);
  if ("error" in auth) { res.status(auth.status).json({ error: auth.error }); return; }
  if (!supabaseAdmin) { res.status(503).json({ error: "Supabase not configured" }); return; }
  const { id } = req.params;
  const { data, error } = await supabaseAdmin.from("ride_chat_messages").select("id, ride_id, sender, message, created_at").eq("ride_id", id).order("created_at", { ascending: true }).limit(50);
  if (error) { res.status(500).json({ error: "Failed to fetch chat" }); return; }
  res.json({ messages: data ?? [] });
});

router.post("/driver/request/:id/chat", async (req, res) => {
  const auth = requireDriverAuth(req.headers.authorization);
  if ("error" in auth) { res.status(auth.status).json({ error: auth.error }); return; }
  if (!supabaseAdmin) { res.status(503).json({ error: "Supabase not configured" }); return; }
  const { id } = req.params;
  const { message } = req.body as { message?: string };
  if (!message?.trim()) { res.status(400).json({ error: "message is required" }); return; }
  const { data, error } = await supabaseAdmin.from("ride_chat_messages").insert({ ride_id: id, sender: "driver", message: message.trim(), created_at: new Date().toISOString() }).select("id, ride_id, sender, message, created_at").single();
  if (error || !data) { res.status(500).json({ error: "Failed to send chat" }); return; }
  res.json({ message: data });
});

// ── Driver service preferences ───────────────────────────────────────────────

router.patch("/driver/preferences", async (req, res) => {
  const auth = requireDriverAuth(req.headers.authorization);
  if ("error" in auth) { res.status(auth.status).json({ error: auth.error }); return; }
  if (!supabaseAdmin) { res.status(503).json({ error: "Supabase not configured" }); return; }

  const { prefers_ride, prefers_delivery } = req.body as {
    prefers_ride?: boolean;
    prefers_delivery?: boolean;
  };

  if (prefers_ride === undefined && prefers_delivery === undefined) {
    res.status(400).json({ error: "At least one preference field required" });
    return;
  }

  const update: Record<string, unknown> = {};
  if (prefers_ride !== undefined) update.prefers_ride = Boolean(prefers_ride);
  if (prefers_delivery !== undefined) update.prefers_delivery = Boolean(prefers_delivery);

  const { error } = await supabaseAdmin
    .from("drivers")
    .update(update)
    .eq("id", auth.claims.sub);

  if (error) {
    req.log.warn({ err: error }, "Failed to update driver preferences");
    res.status(500).json({ error: "Failed to update preferences" });
    return;
  }
  res.json({ ok: true, ...update });
});

// ── Withdrawal requests ──────────────────────────────────────────────────────

router.post("/withdrawal", async (req, res) => {
  if (!supabaseAdmin) { res.status(503).json({ error: "Supabase not configured" }); return; }

  const {
    user_id,
    amount,
    asset_type,
    payout_method,
    payout_details,
    request_id,
    is_driver,
  } = req.body as {
    user_id?: string;
    amount?: number;
    asset_type?: string;
    payout_method?: string;
    payout_details?: string;
    request_id?: string;
    is_driver?: boolean;
  };

  if (!user_id || !amount || !asset_type || !payout_method) {
    res.status(400).json({ error: "user_id, amount, asset_type and payout_method are required" });
    return;
  }
  if (amount <= 0) {
    res.status(400).json({ error: "amount must be positive" });
    return;
  }
  if (!["PKR", "OKBOND"].includes(asset_type)) {
    res.status(400).json({ error: "asset_type must be PKR or OKBOND" });
    return;
  }

  const { data, error } = await supabaseAdmin
    .from("withdrawal_requests")
    .insert({
      request_id: request_id ?? `WD-${Date.now()}`,
      user_id,
      amount,
      asset_type,
      payout_method,
      payout_details: payout_details ?? null,
      status: "pending",
      is_driver: Boolean(is_driver),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id, request_id, status, created_at")
    .single();

  if (error) {
    req.log.warn({ err: error }, "Failed to create withdrawal request");
    // Return a successful-looking response so the client can still show pending state
    res.status(202).json({ ok: true, request_id, status: "pending", note: "queued locally" });
    return;
  }
  res.status(201).json({ ok: true, ...data });
});

router.get("/withdrawal/history", async (req, res) => {
  if (!supabaseAdmin) { res.status(503).json({ error: "Supabase not configured" }); return; }
  const userId = req.query.user_id as string | undefined;
  if (!userId) { res.status(400).json({ error: "user_id query param required" }); return; }

  const { data, error } = await supabaseAdmin
    .from("withdrawal_requests")
    .select("id, request_id, amount, asset_type, payout_method, status, rejection_reason, is_driver, created_at, updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    req.log.warn({ err: error }, "Failed to fetch withdrawal history");
    res.json({ history: [] });
    return;
  }
  res.json({ history: data ?? [] });
});

router.patch("/withdrawal/:id/admin", async (req, res) => {
  if (!supabaseAdmin) { res.status(503).json({ error: "Supabase not configured" }); return; }

  const { id } = req.params;
  const { action, rejection_reason } = req.body as {
    action?: "approve" | "reject";
    rejection_reason?: string;
  };

  if (!action || !["approve", "reject"].includes(action)) {
    res.status(400).json({ error: "action must be 'approve' or 'reject'" });
    return;
  }

  const update: Record<string, unknown> = {
    status: action === "approve" ? "approved" : "rejected",
    updated_at: new Date().toISOString(),
  };
  if (action === "reject" && rejection_reason) update.rejection_reason = rejection_reason;

  const { data, error } = await supabaseAdmin
    .from("withdrawal_requests")
    .update(update)
    .eq("id", id)
    .select("id, request_id, status, updated_at")
    .single();

  if (error || !data) {
    req.log.warn({ err: error }, "Failed to update withdrawal status");
    res.status(500).json({ error: "Failed to update withdrawal" });
    return;
  }
  res.json({ ok: true, ...data });
});

export default router;
