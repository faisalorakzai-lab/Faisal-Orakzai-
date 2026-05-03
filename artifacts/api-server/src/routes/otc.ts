import { createHmac, timingSafeEqual } from "node:crypto";
import { Router } from "express";
import Ably from "ably";
import { supabaseAdmin } from "../db/supabaseAdmin";

const ABLY_API_KEY = process.env.ABLY_API_KEY ?? "";
let ablyRest: Ably.Rest | null = null;
if (ABLY_API_KEY) ablyRest = new Ably.Rest({ key: ABLY_API_KEY });

async function publishAbly(channel: string, event: string, data: unknown): Promise<void> {
  if (!ablyRest) return;
  try { await ablyRest.channels.get(channel).publish(event, data); } catch {}
}

const router = Router();

function requireDriverAuth(
  authorization: string | undefined
): { claims: { sub: string } } | { status: number; error: string } {
  if (!authorization?.startsWith("Bearer ")) {
    return { status: 401, error: "Authorization required" };
  }
  const token = authorization.slice("Bearer ".length).trim();
  if (!token) return { status: 401, error: "Authorization required" };
  return { claims: { sub: token } };
}

router.post("/wealth/micro-investment", async (req, res) => {
  if (!supabaseAdmin) { res.status(503).json({ error: "Supabase not configured" }); return; }
  const { user_id, ride_id, fare, amount } = req.body as { user_id?: string; ride_id?: string; fare?: number; amount?: number };
  if (!user_id || !ride_id || !fare || !amount) { res.status(400).json({ error: "user_id, ride_id, fare, amount required" }); return; }
  await supabaseAdmin.from("micro_investments").insert({ user_id, ride_id, fare, amount, asset_type: "digital_asset", created_at: new Date().toISOString() });
  res.status(201).json({ ok: true });
});

router.patch("/ride/:id/trunk-space", async (req, res) => {
  const { id } = req.params;
  const { available_liters } = req.body as { available_liters?: number };
  if (typeof available_liters !== "number") { res.status(400).json({ error: "available_liters required" }); return; }
  if (supabaseAdmin) {
    await supabaseAdmin.from("ride_requests").update({ trunk_space_liters: available_liters, updated_at: new Date().toISOString() }).eq("id", id);
  }
  await publishAbly(`ride:${id}:space`, "trunk:space", { ride_id: id, available_liters });
  res.json({ ok: true, available_liters });
});

router.patch("/ride/:id/service-mode", async (req, res) => {
  const { id } = req.params;
  const { service_mode } = req.body as { service_mode?: "silent" | "business" | "social" };
  if (!service_mode) { res.status(400).json({ error: "service_mode required" }); return; }
  if (supabaseAdmin) {
    await supabaseAdmin.from("ride_requests").update({ service_mode, updated_at: new Date().toISOString() }).eq("id", id);
  }
  res.json({ ok: true, service_mode });
});

router.post("/bid/create", async (req, res) => {
  const {
    user_id, pickup_name, pickup_lat, pickup_lng,
    dropoff_name, dropoff_lat, dropoff_lng,
    distance_km, suggested_fare,
  } = req.body as {
    user_id?: string; pickup_name?: string; pickup_lat?: number; pickup_lng?: number;
    dropoff_name?: string; dropoff_lat?: number; dropoff_lng?: number;
    distance_km?: number; suggested_fare?: number;
  };

  if (!pickup_name || !dropoff_name || !suggested_fare) {
    res.status(400).json({ error: "pickup_name, dropoff_name, suggested_fare are required" });
    return;
  }

  const bid_id = `BID-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  if (supabaseAdmin) {
    try {
      await supabaseAdmin.from("ride_bids").insert({
        id: bid_id,
        user_id: user_id ?? null,
        pickup_name: pickup_name ?? "Unknown",
        pickup_lat: pickup_lat ?? 0,
        pickup_lng: pickup_lng ?? 0,
        dropoff_name: dropoff_name ?? "Unknown",
        dropoff_lat: dropoff_lat ?? 0,
        dropoff_lng: dropoff_lng ?? 0,
        distance_km: distance_km ?? 0,
        suggested_fare: suggested_fare,
        status: "open",
        expires_at,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } catch {}
  }

  await publishAbly("drivers:nearby", "bid:new", { bid_id, pickup_name, dropoff_name, distance_km, suggested_fare, expires_at });
  res.status(201).json({ bid_id, status: "open", expires_at });
});

router.post("/bid/:id/driver-offer", async (req, res) => {
  const { id } = req.params;
  const auth = requireDriverAuth(req.headers.authorization);
  if ("error" in auth) { res.status(auth.status).json({ error: auth.error }); return; }
  const { offered_fare, eta } = req.body as { offered_fare?: number; eta?: number };
  if (!offered_fare || offered_fare <= 0) { res.status(400).json({ error: "offered_fare is required and must be positive" }); return; }
  const offer_id = `OFF-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  let driverName = "OTC Driver";
  let driverPhone: string | null = null;
  let driverVehicle: string | null = null;
  let driverPlate: string | null = null;
  let driverRating = 4.8;
  if (supabaseAdmin) {
    try {
      const { data: d } = await supabaseAdmin.from("drivers").select("name, phone, vehicle_model, plate_number, rating").eq("id", auth.claims.sub).maybeSingle();
      if (d) { driverName = d.name ?? driverName; driverPhone = d.phone ?? null; driverVehicle = d.vehicle_model ?? null; driverPlate = d.plate_number ?? null; driverRating = Number(d.rating ?? 4.8); }
      await supabaseAdmin.from("bid_offers").insert({ id: offer_id, bid_id: id, driver_id: auth.claims.sub, driver_name: driverName, driver_phone: driverPhone, driver_vehicle: driverVehicle, driver_plate: driverPlate, driver_rating: driverRating, offered_fare, eta: eta ?? 5, status: "pending", created_at: new Date().toISOString() });
    } catch {}
  }
  const offer = { id: offer_id, driver_id: auth.claims.sub, driver_name: driverName, driver_phone: driverPhone, driver_vehicle: driverVehicle, driver_plate: driverPlate, driver_rating: driverRating, offered_fare, eta: eta ?? 5, status: "pending", created_at: new Date().toISOString() };
  await publishAbly(`bid:${id}`, "bid:offer", offer);
  res.status(201).json({ offer_id, status: "pending" });
});

router.post("/bid/:id/user-accept", async (req, res) => {
  const { id } = req.params;
  const { offer_id } = req.body as { offer_id?: string };
  if (!offer_id) { res.status(400).json({ error: "offer_id required" }); return; }
  if (supabaseAdmin) {
    try {
      await Promise.all([
        supabaseAdmin.from("ride_bids").update({ status: "accepted", updated_at: new Date().toISOString() }).eq("id", id),
        supabaseAdmin.from("bid_offers").update({ status: "accepted" }).eq("id", offer_id),
        supabaseAdmin.from("bid_offers").update({ status: "rejected" }).eq("bid_id", id).neq("id", offer_id),
      ]);
    } catch {}
  }
  await publishAbly(`bid:${id}`, "bid:accepted", { offer_id });
  res.json({ ok: true, status: "accepted" });
});

router.post("/bid/:id/user-reject", async (req, res) => {
  const { id } = req.params;
  const { offer_id } = req.body as { offer_id?: string };
  if (!offer_id) { res.status(400).json({ error: "offer_id required" }); return; }
  if (supabaseAdmin) {
    try { await supabaseAdmin.from("bid_offers").update({ status: "rejected" }).eq("id", offer_id); } catch {}
  }
  await publishAbly(`bid:${id}`, "bid:offer_rejected", { offer_id });
  res.json({ ok: true });
});

router.post("/bid/:id/cancel", async (req, res) => {
  const { id } = req.params;
  if (supabaseAdmin) {
    try { await supabaseAdmin.from("ride_bids").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", id); } catch {}
  }
  await publishAbly(`bid:${id}`, "bid:cancelled", { bid_id: id });
  res.json({ ok: true });
});

router.get("/driver/bids/nearby", async (req, res) => {
  const auth = requireDriverAuth(req.headers.authorization);
  if ("error" in auth) { res.status(auth.status).json({ error: auth.error }); return; }
  if (!supabaseAdmin) { res.json({ bids: [] }); return; }
  const { data, error } = await supabaseAdmin.from("ride_bids").select("id, pickup_name, dropoff_name, distance_km, suggested_fare, expires_at, created_at").eq("status", "open").gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }).limit(10);
  if (error) { res.json({ bids: [] }); return; }
  res.json({ bids: data ?? [] });
});

export default router;
