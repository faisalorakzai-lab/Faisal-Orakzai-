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
    // tables may not exist yet
  }
}

// Fare rates per km for each ride type
const RATES_PER_KM: Record<string, number> = {
  community: 30,   // OTC Bike
  autonomous: 60,  // OTC Prime
  sovereign: 120,  // OTC Lux
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

router.get("/health", (_req, res) => {
  res.json({ supabase: supabaseAdmin !== null });
});

// POST /api/otc/match-driver
// Finds nearest available driver, calculates fare, assigns to ride_request
router.post("/match-driver", async (req, res) => {
  const {
    ride_request_id,
    pickup_lat,
    pickup_lng,
    ride_type,
    distance_km,
  } = req.body as {
    ride_request_id?: string;
    pickup_lat?: number;
    pickup_lng?: number;
    ride_type?: string;
    distance_km?: number;
  };

  if (!ride_request_id || pickup_lat == null || pickup_lng == null || !ride_type) {
    res.status(400).json({ error: "Missing required fields: ride_request_id, pickup_lat, pickup_lng, ride_type" });
    return;
  }

  if (!supabaseAdmin) {
    res.status(503).json({ error: "Supabase not configured on server" });
    return;
  }

  // Calculate total fare
  const rate = RATES_PER_KM[ride_type] ?? 60;
  const distKm = typeof distance_km === "number" && distance_km > 0 ? distance_km : 5;
  const total_fare = Math.round(distKm * rate);

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

  // Score drivers: prefer compatible type AND nearest distance
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

  // Update ride_request — this triggers Supabase Realtime on the client
  const { error: updateError } = await supabaseAdmin
    .from("ride_requests")
    .update({
      status: "assigned",
      driver_id: best.id,
      driver_name: best.name,
      driver_phone: best.phone ?? null,
      driver_vehicle_model: best.vehicle_model ?? null,
      driver_plate: best.plate_number ?? null,
      driver_rating: best.rating ?? 4.8,
      driver_eta: etaMinutes,
      total_fare,
    })
    .eq("id", ride_request_id);

  if (updateError) {
    req.log.error({ err: updateError }, "Failed to assign driver to ride_request");
    res.status(500).json({ error: "Failed to assign driver" });
    return;
  }

  req.log.info(
    { ride_request_id, driver_id: best.id, eta: etaMinutes, total_fare },
    "Driver assigned"
  );

  // ── MVP auto-simulation: advance ride lifecycle ───────────────────────────
  // 10 s → ongoing (driver picks up passenger)
  // 30 s → completed
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
            .then(() => {});
        }, 20_000);
      });
  }, 10_000);

  res.json({
    status: "assigned",
    driver: {
      id: best.id as string,
      name: best.name as string,
      phone: (best.phone ?? null) as string | null,
      vehicle_model: (best.vehicle_model ?? null) as string | null,
      plate_number: (best.plate_number ?? null) as string | null,
      rating: (best.rating ?? 4.8) as number,
      eta: etaMinutes,
    },
    total_fare,
  });
});

export default router;
