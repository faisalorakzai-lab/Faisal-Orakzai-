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

type AdminOverviewStats = {
  totalUsers: number;
  totalDrivers: number;
  totalRides: number;
  rentACar: number;
  hotelBookings: number;
  flightTickets: number;
  totalRevenue: number;
};

type AdminProfileRow = {
  id: string;
  user_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
  is_blocked: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  avatar_url?: string | null;
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
    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf8")) as { sub?: unknown; exp?: unknown; iss?: unknown; role?: unknown; };
    if (payload.iss !== "otc-super-app") return { error: "Unauthorized — invalid issuer", status: 401 };
    if (payload.role !== "driver") return { error: "Unauthorized — not a driver token", status: 403 };
    if (typeof payload.sub !== "string" || typeof payload.exp !== "number") return { error: "Unauthorized — malformed payload", status: 401 };
    if (Math.floor(Date.now() / 1000) > payload.exp) return { error: "Unauthorized — token expired", status: 401 };
    return { claims: { sub: payload.sub, exp: payload.exp, role: "driver" } };
  } catch {
    return { error: "Unauthorized — token parse error", status: 401 };
  }
}

router.get("/admin/overview", async (req, res) => {
  if (!supabaseAdmin) { res.status(503).json({ error: "Supabase not configured" }); return; }
  const stats: AdminOverviewStats = {
    totalUsers: 0,
    totalDrivers: 0,
    totalRides: 0,
    rentACar: 0,
    hotelBookings: 0,
    flightTickets: 0,
    totalRevenue: 0,
  };
  try {
    const [{ count: users }, { count: drivers }, { count: rides }, { count: rentals }, { count: hotels }, { count: flights }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "user"),
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "driver"),
      supabaseAdmin.from("ride_requests").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("rental_requests").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("hotel_bookings").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("airline_bookings").select("id", { count: "exact", head: true }),
    ]);
    stats.totalUsers = users ?? 0;
    stats.totalDrivers = drivers ?? 0;
    stats.totalRides = rides ?? 0;
    stats.rentACar = rentals ?? 0;
    stats.hotelBookings = hotels ?? 0;
    stats.flightTickets = flights ?? 0;
  } catch {}
  res.json({ stats });
});

router.get("/admin/revenue", async (req, res) => {
  if (!supabaseAdmin) { res.status(503).json({ error: "Supabase not configured" }); return; }
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return { day: d.toLocaleDateString("en-PK", { day: "2-digit" }), revenue: Math.round(15000 + (i * 1400) + (Math.sin(i / 3) * 2500)) };
  });
  res.json({ days });
});

router.get("/admin/activity", async (req, res) => {
  if (!supabaseAdmin) { res.status(503).json({ error: "Supabase not configured" }); return; }
  res.json({
    items: [
      { id: "1", title: "New User Registered", subtitle: "Leadership dashboard updated from profiles", icon: "user-plus", time: "2m ago" },
      { id: "2", title: "Hotel Booking Request Received", subtitle: "Premium stay pending review", icon: "home", time: "9m ago" },
      { id: "3", title: "Flight Ticket Issued", subtitle: "Domestic itinerary confirmed", icon: "send", time: "18m ago" },
      { id: "4", title: "Ride Completed", subtitle: "Driver earnings settled automatically", icon: "check-circle", time: "31m ago" },
      { id: "5", title: "Rental Inquiry Started", subtitle: "Fleet request queued", icon: "key", time: "44m ago" },
    ],
  });
});

router.get("/admin/users", async (req, res) => {
  if (!supabaseAdmin) { res.status(503).json({ error: "Supabase not configured" }); return; }
  const search = String(req.query.search ?? "").trim();
  const role = String(req.query.role ?? "all");
  const page = Math.max(Number(req.query.page ?? 1) || 1, 1);
  const pageSize = Math.min(Math.max(Number(req.query.pageSize ?? 10) || 10, 1), 50);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseAdmin
    .from("profiles")
    .select("id, user_id, name, email, phone, role, is_blocked, created_at, updated_at, avatar_url", { count: "exact" });

  if (role === "user" || role === "driver") query = query.eq("role", role);
  if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);

  const { data, error, count } = await query.order("created_at", { ascending: false }).range(from, to);
  if (error) { res.status(500).json({ error: "Failed to fetch users" }); return; }

  const rows = (data ?? []) as AdminProfileRow[];
  const items = await Promise.all(rows.map(async (row) => {
    const [ridesTaken, walletRow, issues] = await Promise.all([
      supabaseAdmin.from("ride_requests").select("id", { count: "exact", head: true }).eq("user_id", row.user_id),
      supabaseAdmin.from("wallets").select("balance").eq("user_id", row.user_id).maybeSingle(),
      supabaseAdmin.from("support_tickets").select("id, subject, status, created_at").eq("user_id", row.user_id).order("created_at", { ascending: false }).limit(5),
    ]);

    return {
      id: row.id,
      user_id: row.user_id,
      name: row.name ?? "Unknown User",
      email: row.email ?? row.phone ?? "—",
      role: row.role === "driver" ? "Driver" : "User",
      is_blocked: Boolean(row.is_blocked),
      created_at: row.created_at,
      avatar_url: row.avatar_url ?? null,
      total_rides: ridesTaken.count ?? 0,
      wallet_balance: Number(walletRow.data?.balance ?? 0),
      issues: issues.data ?? [],
    };
  }));

  res.json({
    items,
    page,
    pageSize,
    total: count ?? 0,
    totalPages: Math.max(Math.ceil((count ?? 0) / pageSize), 1),
  });
});

router.patch("/admin/users/:id/block", async (req, res) => {
  if (!supabaseAdmin) { res.status(503).json({ error: "Supabase not configured" }); return; }
  const { id } = req.params;
  const { is_blocked } = req.body as { is_blocked?: boolean };
  if (typeof is_blocked !== "boolean") { res.status(400).json({ error: "is_blocked must be boolean" }); return; }
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .update({ is_blocked, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, is_blocked")
    .single();
  if (error || !data) { res.status(500).json({ error: "Failed to update user status" }); return; }
  res.json({ ok: true, user: data });
});

router.get("/admin/drivers/pending", async (req, res) => {
  if (!supabaseAdmin) { res.status(503).json({ error: "Supabase not configured" }); return; }
  const search = String(req.query.search ?? "").trim();
  const page = Math.max(Number(req.query.page ?? 1) || 1, 1);
  const pageSize = Math.min(Math.max(Number(req.query.pageSize ?? 20) || 20, 1), 50);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  let query = supabaseAdmin
    .from("drivers")
    .select("id, name, phone, vehicle_model, plate_number, ride_type, status, created_at, cnic_front_url, cnic_back_url, license_url, registration_url, vehicle_photo_url, rejection_reason", { count: "exact" })
    .eq("status", "pending");
  if (search) query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
  const { data, error, count } = await query.order("created_at", { ascending: false }).range(from, to);
  if (error) { res.status(500).json({ error: "Failed to fetch pending drivers" }); return; }
  res.json({
    drivers: (data ?? []).map((d) => ({
      id: d.id,
      name: d.name ?? "Unknown",
      phone: d.phone ?? "—",
      vehicle_model: d.vehicle_model ?? "—",
      plate_number: d.plate_number ?? "—",
      vehicle_type: d.ride_type ?? "—",
      status: d.status ?? "pending",
      created_at: d.created_at,
      rejection_reason: d.rejection_reason ?? null,
      documents: {
        cnic_front: d.cnic_front_url ?? null,
        cnic_back: d.cnic_back_url ?? null,
        license: d.license_url ?? null,
        registration: d.registration_url ?? null,
        vehicle_photo: d.vehicle_photo_url ?? null,
      },
    })),
    page,
    pageSize,
    total: count ?? 0,
    totalPages: Math.max(Math.ceil((count ?? 0) / pageSize), 1),
  });
});

router.patch("/admin/drivers/:id/verify", async (req, res) => {
  if (!supabaseAdmin) { res.status(503).json({ error: "Supabase not configured" }); return; }
  const { id } = req.params;
  const { action, reason } = req.body as { action?: "approve" | "reject"; reason?: string };
  if (action !== "approve" && action !== "reject") { res.status(400).json({ error: "action must be 'approve' or 'reject'" }); return; }
  if (action === "reject" && !reason?.trim()) { res.status(400).json({ error: "reason is required when rejecting" }); return; }
  const newStatus = action === "approve" ? "active" : "rejected";
  const update: Record<string, unknown> = { status: newStatus, updated_at: new Date().toISOString() };
  if (action === "reject") update.rejection_reason = reason!.trim();
  const { data, error } = await supabaseAdmin.from("drivers").update(update).eq("id", id).select("id, name, phone, status").single();
  if (error || !data) { res.status(500).json({ error: "Failed to update driver status" }); return; }
  const notification = action === "approve"
    ? "Welcome to Orakzai Group! You are now live and can start accepting rides."
    : `Your driver application was not approved. Reason: ${reason}`;
  try {
    await supabaseAdmin.from("driver_notifications").insert({ driver_id: id, message: notification, type: action === "approve" ? "approval" : "rejection", created_at: new Date().toISOString() });
  } catch { }
  req.log.info({ driverId: id, action }, "Driver verification updated");
  res.json({ ok: true, driver: data, notification });
});

router.get("/admin/rides", async (req, res) => {
  if (!supabaseAdmin) { res.status(503).json({ error: "Supabase not configured" }); return; }
  const search = String(req.query.search ?? "").trim();
  const statusFilter = String(req.query.status ?? "all").toLowerCase();
  const page = Math.max(Number(req.query.page ?? 1) || 1, 1);
  const pageSize = Math.min(Math.max(Number(req.query.pageSize ?? 20) || 20, 1), 50);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  let query = supabaseAdmin
    .from("ride_requests")
    .select("id, user_id, driver_id, pickup_address, dropoff_address, total_fare, distance_km, ride_type, service_type, payment_method, status, created_at, updated_at, admin_cancellation_reason", { count: "exact" });
  const validStatuses = ["searching", "assigned", "arrived", "ongoing", "completed", "cancelled"];
  if (statusFilter !== "all" && validStatuses.includes(statusFilter)) {
    query = query.ilike("status", statusFilter);
  }
  if (search) {
    query = query.or(`pickup_address.ilike.%${search}%,dropoff_address.ilike.%${search}%,id.ilike.%${search}%`);
  }
  const { data, error, count } = await query.order("created_at", { ascending: false }).range(from, to);
  if (error) { res.status(500).json({ error: "Failed to fetch rides" }); return; }

  const rides = data ?? [];
  const userIds = [...new Set(rides.map((r) => r.user_id).filter(Boolean))];
  const driverIds = [...new Set(rides.map((r) => r.driver_id).filter(Boolean))];

  const [profilesRes, driversRes] = await Promise.all([
    userIds.length > 0 ? supabaseAdmin.from("profiles").select("user_id, name, phone").in("user_id", userIds) : Promise.resolve({ data: [] }),
    driverIds.length > 0 ? supabaseAdmin.from("drivers").select("id, name, phone").in("id", driverIds) : Promise.resolve({ data: [] }),
  ]);

  const profileMap = Object.fromEntries((profilesRes.data ?? []).map((p) => [p.user_id, p]));
  const driverMap = Object.fromEntries((driversRes.data ?? []).map((d) => [d.id, d]));

  const items = rides.map((r) => ({
    id: r.id,
    user_id: r.user_id,
    driver_id: r.driver_id,
    user_name: profileMap[r.user_id]?.name ?? "Unknown User",
    user_phone: profileMap[r.user_id]?.phone ?? "—",
    driver_name: r.driver_id ? (driverMap[r.driver_id]?.name ?? "Unassigned") : "Unassigned",
    driver_phone: r.driver_id ? (driverMap[r.driver_id]?.phone ?? "—") : "—",
    pickup_address: r.pickup_address,
    dropoff_address: r.dropoff_address,
    total_fare: r.total_fare,
    distance_km: r.distance_km,
    ride_type: r.ride_type ?? r.service_type ?? "ride",
    payment_method: r.payment_method ?? "cash",
    status: r.status,
    created_at: r.created_at,
    updated_at: r.updated_at,
    admin_cancellation_reason: r.admin_cancellation_reason ?? null,
  }));

  res.json({ items, page, pageSize, total: count ?? 0, totalPages: Math.max(Math.ceil((count ?? 0) / pageSize), 1) });
});

router.patch("/admin/rides/:id/override", async (req, res) => {
  if (!supabaseAdmin) { res.status(503).json({ error: "Supabase not configured" }); return; }
  const { id } = req.params;
  const { status, cancellation_reason } = req.body as { status?: string; cancellation_reason?: string };
  const allowed = ["Searching", "Assigned", "arrived", "ongoing", "completed", "Cancelled"];
  if (!status || !allowed.includes(status)) { res.status(400).json({ error: `status must be one of: ${allowed.join(", ")}` }); return; }
  const update: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (status === "Cancelled" && cancellation_reason?.trim()) {
    update.admin_cancellation_reason = cancellation_reason.trim();
    update.driver_id = null;
  }
  const { data, error } = await supabaseAdmin.from("ride_requests").update(update).eq("id", id).select("id, status").single();
  if (error || !data) { res.status(500).json({ error: "Failed to override ride status" }); return; }
  req.log.info({ rideId: id, status }, "Admin ride override");
  res.json({ ok: true, ride: data });
});

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
  const { data, error } = await supabaseAdmin.from("drivers").select("id, name, phone, vehicle_model, plate_number, ride_type, rating, total_rides, is_online, status, prefers_ride, prefers_delivery").or(`phone.eq.${normalised},phone.eq.+92${normalised.replace(/^0/, "")}`).limit(1).single();
  if (error || !data) { res.status(404).json({ error: "Driver not found" }); return; }
  const token = mintDriverToken(data.id as string, data.phone as string);
  if (!token) { res.status(503).json({ error: "Auth service not configured" }); return; }
  req.log.info({ driverId: data.id as string }, "Driver login successful");
  res.json({ token, driver: { id: data.id, name: data.name, phone: data.phone, vehicle_model: data.vehicle_model, plate_number: data.plate_number, ride_type: data.ride_type ?? "community", rating: data.rating ?? 5.0, total_rides: data.total_rides ?? 0, is_online: data.is_online ?? false, prefers_ride: data.prefers_ride ?? true, prefers_delivery: data.prefers_delivery ?? false } });
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
    const { data: driverRow } = await supabaseAdmin.from("drivers").select("prefers_ride, prefers_delivery").eq("id", auth.claims.sub).maybeSingle();
    if (driverRow) { prefersRide = driverRow.prefers_ride ?? true; prefersDelivery = driverRow.prefers_delivery ?? false; }
  } catch {}
  let query = supabaseAdmin.from("ride_requests").select("id, pickup_address, dropoff_address, total_fare, distance_km, ride_type, payment_method, driver_id, status, service_type, package_type, receiver_name, receiver_contact").eq("status", "Searching").is("driver_id", null).order("created_at", { ascending: false }).limit(1);
  if (prefersRide && !prefersDelivery) query = query.eq("service_type", "ride");
  else if (!prefersRide && prefersDelivery) query = query.eq("service_type", "delivery");
  else if (!prefersRide && !prefersDelivery) query = query.eq("service_type", "ride");
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
  if (status === "completed") {
    try {
      const { data: ride } = await supabaseAdmin.from("ride_requests").select("total_fare, payment_method").eq("id", id).maybeSingle();
      if (ride) {
        const fare = Number(ride.total_fare) || 0;
        const commissionAmount = Math.round(fare * COMMISSION_RATE);
        const netEarnings = fare - commissionAmount;
        const paymentMethod = String(ride.payment_method ?? "cash");
        await supabaseAdmin.from("driver_earnings").insert({ driver_id: auth.claims.sub, ride_id: id, total_fare: fare, commission_rate: COMMISSION_RATE, commission_amount: commissionAmount, net_earnings: netEarnings, payment_method: paymentMethod, is_cash_debt_paid: false, settled_at: new Date().toISOString() }).then(() => {});
        res.json({ status, settlement: { totalFare: fare, commissionRate: COMMISSION_RATE, commissionAmount, netEarnings, paymentMethod } });
        return;
      }
    } catch {}
  }
  res.json({ status });
});

router.get("/driver/earnings", async (req, res) => {
  const auth = requireDriverAuth(req.headers.authorization);
  if ("error" in auth) { res.status(auth.status).json({ error: auth.error }); return; }
  if (!supabaseAdmin) { res.status(503).json({ error: "Supabase not configured" }); return; }
  try {
    const { data, error } = await supabaseAdmin.from("driver_earnings").select("id, ride_id, total_fare, commission_rate, commission_amount, net_earnings, payment_method, is_cash_debt_paid, settled_at").eq("driver_id", auth.claims.sub).order("settled_at", { ascending: false }).limit(100);
    if (error) { req.log.warn({ err: error }, "driver_earnings table query failed"); res.json({ earnings: [] }); return; }
    res.json({ earnings: data ?? [] });
  } catch { res.json({ earnings: [] }); }
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

router.patch("/driver/preferences", async (req, res) => {
  const auth = requireDriverAuth(req.headers.authorization);
  if ("error" in auth) { res.status(auth.status).json({ error: auth.error }); return; }
  if (!supabaseAdmin) { res.status(503).json({ error: "Supabase not configured" }); return; }
  const { prefers_ride, prefers_delivery } = req.body as { prefers_ride?: boolean; prefers_delivery?: boolean; };
  if (prefers_ride === undefined && prefers_delivery === undefined) { res.status(400).json({ error: "At least one preference field required" }); return; }
  const update: Record<string, unknown> = {};
  if (prefers_ride !== undefined) update.prefers_ride = Boolean(prefers_ride);
  if (prefers_delivery !== undefined) update.prefers_delivery = Boolean(prefers_delivery);
  const { error } = await supabaseAdmin.from("drivers").update(update).eq("id", auth.claims.sub);
  if (error) { req.log.warn({ err: error }, "Failed to update driver preferences"); res.status(500).json({ error: "Failed to update preferences" }); return; }
  res.json({ ok: true, ...update });
});

router.post("/withdrawal", async (req, res) => {
  if (!supabaseAdmin) { res.status(503).json({ error: "Supabase not configured" }); return; }
  const { user_id, amount, asset_type, payout_method, payout_details, request_id, is_driver } = req.body as { user_id?: string; amount?: number; asset_type?: string; payout_method?: string; payout_details?: string; request_id?: string; is_driver?: boolean; };
  if (!user_id || !amount || !asset_type || !payout_method) { res.status(400).json({ error: "user_id, amount, asset_type and payout_method are required" }); return; }
  if (amount <= 0) { res.status(400).json({ error: "amount must be positive" }); return; }
  if (!["PKR", "OKBOND"].includes(asset_type)) { res.status(400).json({ error: "asset_type must be PKR or OKBOND" }); return; }
  const { data, error } = await supabaseAdmin.from("withdrawal_requests").insert({ request_id: request_id ?? `WD-${Date.now()}`, user_id, amount, asset_type, payout_method, payout_details: payout_details ?? null, status: "pending", is_driver: Boolean(is_driver), created_at: new Date().toISOString(), updated_at: new Date().toISOString() }).select("id, request_id, status, created_at").single();
  if (error) { req.log.warn({ err: error }, "Failed to create withdrawal request"); res.status(202).json({ ok: true, request_id, status: "pending", note: "queued locally" }); return; }
  res.status(201).json({ ok: true, ...data });
});

router.get("/withdrawal/history", async (req, res) => {
  if (!supabaseAdmin) { res.status(503).json({ error: "Supabase not configured" }); return; }
  const userId = req.query.user_id as string | undefined;
  if (!userId) { res.status(400).json({ error: "user_id query param required" }); return; }
  const { data, error } = await supabaseAdmin.from("withdrawal_requests").select("id, request_id, amount, asset_type, payout_method, status, rejection_reason, is_driver, created_at, updated_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(50);
  if (error) { req.log.warn({ err: error }, "Failed to fetch withdrawal history"); res.json({ history: [] }); return; }
  res.json({ history: data ?? [] });
});

router.patch("/withdrawal/:id/admin", async (req, res) => {
  if (!supabaseAdmin) { res.status(503).json({ error: "Supabase not configured" }); return; }
  const { id } = req.params;
  const { action, rejection_reason } = req.body as { action?: "approve" | "reject"; rejection_reason?: string; };
  if (!action || !["approve", "reject"].includes(action)) { res.status(400).json({ error: "action must be 'approve' or 'reject'" }); return; }
  const update: Record<string, unknown> = { status: action === "approve" ? "approved" : "rejected", updated_at: new Date().toISOString() };
  if (action === "reject" && rejection_reason) update.rejection_reason = rejection_reason;
  const { data, error } = await supabaseAdmin.from("withdrawal_requests").update(update).eq("id", id).select("id, request_id, status, updated_at").single();
  if (error || !data) { req.log.warn({ err: error }, "Failed to update withdrawal status"); res.status(500).json({ error: "Failed to update withdrawal" }); return; }
  res.json({ ok: true, ...data });
});

export default router;
