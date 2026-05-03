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
  const { data, error } = await supabaseAdmin
    .from("drivers")
    .select("id, name, phone, status")
    .or(`phone.eq.${normalised},phone.eq.+92${normalised.replace(/^0/, "")}`)
    .limit(1)
    .single();
  if (error || !data) {
    res.status(404).json({ error: "No driver account found for this number. Contact Orakzai Services to register." });
    return;
  }
  if (data.status === "inactive") {
    res.status(403).json({ error: "Your driver account is inactive. Contact support." });
    return;
  }
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expires = Math.floor(Date.now() / 1000) + 10 * 60;
  driverOtps.set(normalised, { otp, expires });
  req.log.info({ driverId: data.id as string }, "Driver OTP requested");
  res.json({ message: "OTP sent", demoOtp: otp });
});

router.post("/driver/otp-verify", async (req, res) => {
  if (!supabaseAdmin) { res.status(503).json({ error: "Supabase not configured" }); return; }
  const { phone, otp } = req.body as { phone?: string; otp?: string };
  if (!phone?.trim() || !otp?.trim()) {
    res.status(400).json({ error: "phone and otp are required" }); return;
  }
  const normalised = phone.trim().replace(/\s+/g, "");
  const stored = driverOtps.get(normalised);
  if (!stored || Math.floor(Date.now() / 1000) > stored.expires) {
    res.status(401).json({ error: "OTP expired. Please request a new one." }); return;
  }
  if (stored.otp !== otp.trim()) {
    res.status(401).json({ error: "Incorrect OTP. Please try again." }); return;
  }
  driverOtps.delete(normalised);
  const { data, error } = await supabaseAdmin
    .from("drivers")
    .select("id, name, phone, vehicle_model, plate_number, ride_type, rating, total_rides, is_online, status")
    .or(`phone.eq.${normalised},phone.eq.+92${normalised.replace(/^0/, "")}`)
    .limit(1)
    .single();
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
  const { error } = await supabaseAdmin
    .from("drivers")
    .update({ is_online, updated_at: new Date().toISOString() })
    .eq("id", auth.claims.sub);
  if (error) { res.status(500).json({ error: "Failed to update status" }); return; }
  res.json({ is_online });
});

router.get("/driver/requests/searching", async (req, res) => {
  const auth = requireDriverAuth(req.headers.authorization);
  if ("error" in auth) { res.status(auth.status).json({ error: auth.error }); return; }
  if (!supabaseAdmin) { res.status(503).json({ error: "Supabase not configured" }); return; }
  const { data, error } = await supabaseAdmin
    .from("ride_requests")
    .select("id, pickup_address, dropoff_address, total_fare, distance_km, ride_type, payment_method, driver_id, status")
    .eq("status", "Searching")
    .is("driver_id", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) { res.status(500).json({ error: "Failed to query pending rides" }); return; }
  res.json({ ride: data as DriverRide | null });
});

router.patch("/driver/request/:id/respond", async (req, res) => {
  const auth = requireDriverAuth(req.headers.authorization);
  if ("error" in auth) { res.status(auth.status).json({ error: auth.error }); return; }
  if (!supabaseAdmin) { res.status(503).json({ error: "Supabase not configured" }); return; }
  const { id } = req.params;
  const { action } = req.body as { action?: "accept" | "decline" };
  if (action !== "accept" && action !== "decline") {
    res.status(400).json({ error: "action must be 'accept' or 'decline'" });
    return;
  }
  const driverId = auth.claims.sub;
  const newStatus = action === "accept" ? "Assigned" : "Searching";
  const updatePayload: Record<string, unknown> = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  };
  if (action === "accept") updatePayload.driver_id = driverId;
  if (action === "decline") updatePayload.driver_id = null;
  const { error } = await supabaseAdmin.from("ride_requests").update(updatePayload).eq("id", id);
  if (error) {
    res.status(500).json({ error: "Failed to update ride" });
    return;
  }
  res.json({ status: newStatus });
});

export default router;
