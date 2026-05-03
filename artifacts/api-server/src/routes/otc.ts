import { createHmac, timingSafeEqual } from "node:crypto";
import { Router } from "express";
import Ably from "ably";
import { supabaseAdmin } from "../db/supabaseAdmin";

const ABLY_API_KEY = process.env.ABLY_API_KEY ?? "";
let ablyRest: Ably.Rest | null = null;
if (ABLY_API_KEY) {
  ablyRest = new Ably.Rest({ key: ABLY_API_KEY });
}

async function publishAbly(channel: string, event: string, data: unknown): Promise<void> {
  if (!ablyRest) return;
  try {
    await ablyRest.channels.get(channel).publish(event, data);
  } catch {}
}

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
  const db = supabaseAdmin!;
  const items = await Promise.all(rows.map(async (row) => {
    const [ridesTaken, walletRow, issues] = await Promise.all([
      db.from("ride_requests").select("id", { count: "exact", head: true }).eq("user_id", row.user_id),
      db.from("wallets").select("balance").eq("user_id", row.user_id).maybeSingle(),
      db.from("support_tickets").select("id, subject, status, created_at").eq("user_id", row.user_id).order("created_at", { ascending: false }).limit(5),
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
  const validStatuses = ["searching", "ongoing", "completed", "cancelled"];
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
  const allowed = ["Searching", "Ongoing", "Completed", "Cancelled"];
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

router.get("/admin/bookings", async (req, res) => {
  if (!supabaseAdmin) { res.status(503).json({ error: "Supabase not configured" }); return; }
  const type = String(req.query.type ?? "all");
  const page = Math.max(Number(req.query.page ?? 1) || 1, 1);
  const pageSize = Math.min(Math.max(Number(req.query.pageSize ?? 20) || 20, 1), 50);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const mapType = (rowType: string) => {
    if (rowType === "car") return "Car Rentals";
    if (rowType === "hotel") return "Hotel Stays";
    if (rowType === "flight") return "Flight Tickets";
    return rowType;
  };

  const tableMap: Record<string, string> = {
    car: "rental_requests",
    hotel: "hotel_bookings",
    flight: "airline_bookings",
  };

  const types = type === "all" ? ["car", "hotel", "flight"] : [type];
  const items = [];

  for (const currentType of types) {
    const table = tableMap[currentType];
    if (!table) continue;
    const { data, error, count } = await supabaseAdmin
      .from(table)
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error) { res.status(500).json({ error: `Failed to fetch ${currentType} bookings` }); return; }
    for (const row of data ?? []) {
      items.push({
        id: row.id,
        type: currentType,
        service: mapType(currentType),
        user_name: row.user_name ?? row.customer_name ?? row.name ?? "Unknown User",
        requested_dates: row.requested_dates ?? row.booking_dates ?? row.departure_date ?? row.check_in ?? row.check_out ?? "—",
        proposed_price: Number(row.proposed_price ?? row.requested_price ?? row.amount ?? row.total_price ?? 0),
        status: row.status ?? "pending_review",
        created_at: row.created_at ?? null,
        final_price: row.final_price ?? null,
        confirmed: Boolean(row.confirmed ?? false),
        voucher_url: row.voucher_url ?? row.ticket_url ?? row.document_url ?? null,
        asset_reserved: Boolean(row.asset_reserved ?? false),
        admin_reason: row.admin_reason ?? row.rejection_reason ?? null,
        contact_phone: row.phone ?? row.contact_phone ?? null,
      });
    }
  }

  items.sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")));
  res.json({ items, page, pageSize, total: items.length, totalPages: Math.max(Math.ceil(items.length / pageSize), 1) });
});

router.patch("/admin/bookings/:id/manage", async (req, res) => {
  if (!supabaseAdmin) { res.status(503).json({ error: "Supabase not configured" }); return; }
  const { id } = req.params;
  const { type, action, asset_reserved, final_price, reason, file_url } = req.body as {
    type?: "car" | "hotel" | "flight";
    action?: "approve" | "reject" | "upload";
    asset_reserved?: boolean;
    final_price?: number;
    reason?: string;
    file_url?: string;
  };
  const table = type === "car" ? "rental_requests" : type === "hotel" ? "hotel_bookings" : type === "flight" ? "airline_bookings" : "";
  if (!table || !action) { res.status(400).json({ error: "type and action are required" }); return; }
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof asset_reserved === "boolean") update.asset_reserved = asset_reserved;
  if (typeof final_price === "number") update.final_price = final_price;
  if (action === "approve") {
    update.status = "confirmed";
    update.confirmed = true;
    update.admin_reason = null;
  } else if (action === "reject") {
    update.status = "cancelled";
    update.confirmed = false;
    update.admin_reason = reason?.trim() ?? "Rejected by admin";
  } else if (action === "upload") {
    if (!file_url?.trim()) { res.status(400).json({ error: "file_url is required" }); return; }
    update.voucher_url = file_url.trim();
  }
  const { data, error } = await supabaseAdmin.from(table).update(update).eq("id", id).select("id, status").single();
  if (error || !data) { res.status(500).json({ error: "Failed to manage booking" }); return; }
  res.json({ ok: true, booking: data });
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


// ─── ADMIN: WALLET CONTROL ──────────────────────────────────────────────────

router.get("/admin/wallet/search", async (req, res) => {
  if (!supabaseAdmin) { res.status(503).json({ error: "Supabase not configured" }); return; }
  const q = String(req.query.q ?? "").trim();
  if (!q) { res.status(400).json({ error: "q param required" }); return; }

  const [profilesRes, driversRes] = await Promise.all([
    supabaseAdmin.from("profiles")
      .select("user_id, name, phone, email")
      .or(`name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%,user_id.eq.${q}`)
      .limit(10),
    supabaseAdmin.from("drivers")
      .select("id, name, phone")
      .or(`name.ilike.%${q}%,phone.ilike.%${q}%,id.eq.${q}`)
      .limit(10),
  ]);

  const userIds = (profilesRes.data ?? []).map((p) => p.user_id);
  const driverIds = (driversRes.data ?? []).map((d) => d.id);
  const allIds = [...new Set([...userIds, ...driverIds])];

  if (allIds.length === 0) { res.json({ results: [] }); return; }

  const { data: wallets } = await supabaseAdmin
    .from("wallets")
    .select("user_id, pkr_balance, okbond_balance")
    .in("user_id", allIds);

  const walletMap = Object.fromEntries((wallets ?? []).map((w) => [w.user_id, w]));

  const results = [
    ...(profilesRes.data ?? []).map((p) => ({
      id: p.user_id,
      name: p.name ?? "Unknown",
      phone: p.phone ?? "—",
      type: "user" as const,
      pkr_balance: Number(walletMap[p.user_id]?.pkr_balance ?? 0),
      okbond_balance: Number(walletMap[p.user_id]?.okbond_balance ?? 0),
    })),
    ...(driversRes.data ?? [])
      .filter((d) => !userIds.includes(d.id))
      .map((d) => ({
        id: d.id,
        name: d.name ?? "Unknown",
        phone: d.phone ?? "—",
        type: "driver" as const,
        pkr_balance: Number(walletMap[d.id]?.pkr_balance ?? 0),
        okbond_balance: Number(walletMap[d.id]?.okbond_balance ?? 0),
      })),
  ];

  res.json({ results });
});

router.post("/admin/wallet/adjust", async (req, res) => {
  if (!supabaseAdmin) { res.status(503).json({ error: "Supabase not configured" }); return; }
  const { user_id, asset_type, action, amount, reason, admin_name } =
    req.body as { user_id?: string; asset_type?: "PKR" | "OKBOND"; action?: "add" | "deduct"; amount?: number; reason?: string; admin_name?: string };

  if (!user_id || !asset_type || !action || !amount || !reason?.trim()) {
    res.status(400).json({ error: "user_id, asset_type, action, amount, reason are required" }); return;
  }
  if (!["PKR", "OKBOND"].includes(asset_type)) { res.status(400).json({ error: "asset_type must be PKR or OKBOND" }); return; }
  if (!["add", "deduct"].includes(action)) { res.status(400).json({ error: "action must be add or deduct" }); return; }
  if (amount <= 0) { res.status(400).json({ error: "amount must be positive" }); return; }

  const col = asset_type === "PKR" ? "pkr_balance" : "okbond_balance";

  const { data: wallet } = await supabaseAdmin.from("wallets").select("user_id, pkr_balance, okbond_balance").eq("user_id", user_id).maybeSingle();
  if (!wallet) {
    await supabaseAdmin.from("wallets").insert({ user_id, pkr_balance: 0, okbond_balance: 0, updated_at: new Date().toISOString() });
  }

  const current = Number(wallet?.[col as keyof typeof wallet] ?? 0);
  const newBalance = action === "add" ? current + amount : Math.max(current - amount, 0);

  const { error: updateErr } = await supabaseAdmin.from("wallets")
    .update({ [col]: newBalance, updated_at: new Date().toISOString() })
    .eq("user_id", user_id);
  if (updateErr) { res.status(500).json({ error: "Failed to update wallet" }); return; }

  await supabaseAdmin.from("transactions").insert({
    user_id,
    type: action === "add" ? "manual_credit" : "manual_debit",
    asset_type,
    amount,
    balance_after: newBalance,
    reason: reason.trim(),
    is_manual: true,
    admin_name: admin_name?.trim() ?? "Admin",
    created_at: new Date().toISOString(),
  }).then(() => {});

  req.log.info({ user_id, asset_type, action, amount }, "Admin wallet adjustment");
  res.json({ ok: true, new_balance: newBalance });
});

router.get("/admin/wallet/manual-transactions", async (req, res) => {
  if (!supabaseAdmin) { res.status(503).json({ error: "Supabase not configured" }); return; }
  const page = Math.max(Number(req.query.page ?? 1) || 1, 1);
  const pageSize = 30;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, error, count } = await supabaseAdmin
    .from("transactions")
    .select("id, user_id, type, asset_type, amount, balance_after, reason, admin_name, created_at", { count: "exact" })
    .eq("is_manual", true)
    .order("created_at", { ascending: false })
    .range(from, to);
  if (error) { req.log.warn({ err: error }, "manual-transactions query failed"); res.json({ items: [], total: 0 }); return; }
  res.json({ items: data ?? [], total: count ?? 0, totalPages: Math.max(Math.ceil((count ?? 0) / pageSize), 1) });
});

// ─── ADMIN: REFERRALS ───────────────────────────────────────────────────────

router.get("/admin/referrals", async (req, res) => {
  if (!supabaseAdmin) { res.status(503).json({ error: "Supabase not configured" }); return; }
  const search = String(req.query.search ?? "").trim();
  const page = Math.max(Number(req.query.page ?? 1) || 1, 1);
  const pageSize = 25;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseAdmin
    .from("referrals")
    .select("id, referrer_id, referee_id, created_at, reward_status, reward_paid_at, referee_first_ride_completed, referee_device_id, referrer_device_id", { count: "exact" });

  if (search) query = query.or(`referrer_id.ilike.%${search}%`);

  const { data, error, count } = await query.order("created_at", { ascending: false }).range(from, to);
  if (error) { req.log.warn({ err: error }, "referrals query failed"); res.json({ items: [], total: 0 }); return; }

  const rows = data ?? [];
  const userIds = [...new Set([...rows.map((r) => r.referrer_id), ...rows.map((r) => r.referee_id)].filter(Boolean))];
  const { data: profiles } = userIds.length > 0
    ? await supabaseAdmin.from("profiles").select("user_id, name, phone").in("user_id", userIds)
    : { data: [] };

  const profMap = Object.fromEntries((profiles ?? []).map((p) => [p.user_id, p]));

  const items = rows.map((r) => ({
    id: r.id,
    referrer_id: r.referrer_id,
    referee_id: r.referee_id,
    referrer_name: profMap[r.referrer_id]?.name ?? "Unknown",
    referrer_phone: profMap[r.referrer_id]?.phone ?? "—",
    referee_name: profMap[r.referee_id]?.name ?? "Unknown",
    referee_phone: profMap[r.referee_id]?.phone ?? "—",
    created_at: r.created_at,
    reward_status: r.reward_status ?? "pending",
    reward_paid_at: r.reward_paid_at ?? null,
    referee_first_ride_completed: Boolean(r.referee_first_ride_completed),
    potential_fraud: Boolean(r.referee_device_id && r.referrer_device_id && r.referee_device_id === r.referrer_device_id),
    referee_device_id: r.referee_device_id ?? null,
    referrer_device_id: r.referrer_device_id ?? null,
  }));

  res.json({ items, total: count ?? 0, totalPages: Math.max(Math.ceil((count ?? 0) / pageSize), 1) });
});

router.post("/admin/referrals/:id/approve", async (req, res) => {
  if (!supabaseAdmin) { res.status(503).json({ error: "Supabase not configured" }); return; }
  const { id } = req.params;
  const { reward_pkr } = req.body as { reward_pkr?: number };
  const amount = Number(reward_pkr ?? 29000);

  const { data: referral, error: refErr } = await supabaseAdmin
    .from("referrals").select("referrer_id, reward_status, referee_first_ride_completed").eq("id", id).single();
  if (refErr || !referral) { res.status(404).json({ error: "Referral not found" }); return; }
  if (!referral.referee_first_ride_completed) { res.status(400).json({ error: "Referee has not completed first ride yet" }); return; }
  if (referral.reward_status === "paid") { res.status(400).json({ error: "Reward already paid" }); return; }

  const { data: wallet } = await supabaseAdmin.from("wallets").select("pkr_balance").eq("user_id", referral.referrer_id).maybeSingle();
  const current = Number(wallet?.pkr_balance ?? 0);
  const newBalance = current + amount;

  await supabaseAdmin.from("wallets").upsert({ user_id: referral.referrer_id, pkr_balance: newBalance, updated_at: new Date().toISOString() });

  await supabaseAdmin.from("transactions").insert({
    user_id: referral.referrer_id,
    type: "referral_bonus",
    asset_type: "PKR",
    amount,
    balance_after: newBalance,
    reason: "Referral Bonus — referee completed first ride",
    is_manual: true,
    admin_name: "System",
    created_at: new Date().toISOString(),
  });

  await supabaseAdmin.from("referrals").update({ reward_status: "paid", reward_paid_at: new Date().toISOString() }).eq("id", id);

  req.log.info({ referralId: id, referrerId: referral.referrer_id, amount }, "Referral reward approved");
  res.json({ ok: true, credited: amount, new_balance: newBalance });
});

// ─── ADMIN: COMMISSION SETTINGS ─────────────────────────────────────────────

const DEFAULT_COMMISSIONS = {
  ride: 0.20,
  delivery: 0.15,
  hotel: 0.10,
  rental: 0.12,
  flight: 0.05,
};

router.get("/admin/commission", async (req, res) => {
  if (!supabaseAdmin) { res.status(503).json({ error: "Supabase not configured" }); return; }
  const { data, error } = await supabaseAdmin.from("app_settings").select("key, value").in("key", ["commission_ride", "commission_delivery", "commission_hotel", "commission_rental", "commission_flight"]);
  if (error) { res.json({ rates: DEFAULT_COMMISSIONS }); return; }
  const rates: Record<string, number> = { ...DEFAULT_COMMISSIONS };
  for (const row of data ?? []) {
    const k = row.key.replace("commission_", "");
    rates[k] = Number(row.value ?? DEFAULT_COMMISSIONS[k as keyof typeof DEFAULT_COMMISSIONS]);
  }
  const { data: history } = await supabaseAdmin.from("commission_history").select("id, key, old_value, new_value, admin_name, changed_at").order("changed_at", { ascending: false }).limit(20);
  res.json({ rates, history: history ?? [] });
});

// ─── BIDDING ENGINE ─────────────────────────────────────────────────────────

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

  // Notify nearby drivers via Ably
  await publishAbly("drivers:nearby", "bid:new", {
    bid_id,
    pickup_name,
    dropoff_name,
    distance_km,
    suggested_fare,
    expires_at,
  });

  req.log.info({ bid_id, suggested_fare }, "Ride bid created");
  res.status(201).json({ bid_id, status: "open", expires_at });
});

router.get("/bid/:id", async (req, res) => {
  const { id } = req.params;

  if (!supabaseAdmin) {
    res.json({ bid_id: id, status: "open", offers: [] });
    return;
  }

  const [bidRes, offersRes] = await Promise.all([
    supabaseAdmin.from("ride_bids").select("*").eq("id", id).maybeSingle(),
    supabaseAdmin.from("bid_offers")
      .select("*")
      .eq("bid_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!bidRes.data) {
    res.status(404).json({ error: "Bid not found" });
    return;
  }

  res.json({ bid: bidRes.data, offers: offersRes.data ?? [] });
});

router.post("/bid/:id/driver-offer", async (req, res) => {
  const { id } = req.params;
  const auth = requireDriverAuth(req.headers.authorization);
  if ("error" in auth) { res.status(auth.status).json({ error: auth.error }); return; }

  const { offered_fare, eta } = req.body as { offered_fare?: number; eta?: number };
  if (!offered_fare || offered_fare <= 0) {
    res.status(400).json({ error: "offered_fare is required and must be positive" });
    return;
  }

  const offer_id = `OFF-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

  let driverName = "OTC Driver";
  let driverPhone: string | null = null;
  let driverVehicle: string | null = null;
  let driverPlate: string | null = null;
  let driverRating = 4.8;

  if (supabaseAdmin) {
    try {
      const { data: d } = await supabaseAdmin
        .from("drivers")
        .select("name, phone, vehicle_model, plate_number, rating")
        .eq("id", auth.claims.sub)
        .maybeSingle();
      if (d) {
        driverName = d.name ?? driverName;
        driverPhone = d.phone ?? null;
        driverVehicle = d.vehicle_model ?? null;
        driverPlate = d.plate_number ?? null;
        driverRating = Number(d.rating ?? 4.8);
      }

      await supabaseAdmin.from("bid_offers").insert({
        id: offer_id,
        bid_id: id,
        driver_id: auth.claims.sub,
        driver_name: driverName,
        driver_phone: driverPhone,
        driver_vehicle: driverVehicle,
        driver_plate: driverPlate,
        driver_rating: driverRating,
        offered_fare,
        eta: eta ?? 5,
        status: "pending",
        created_at: new Date().toISOString(),
      });
    } catch {}
  }

  const offer = {
    id: offer_id,
    driver_id: auth.claims.sub,
    driver_name: driverName,
    driver_phone: driverPhone,
    driver_vehicle: driverVehicle,
    driver_plate: driverPlate,
    driver_rating: driverRating,
    offered_fare,
    eta: eta ?? 5,
    status: "pending",
    created_at: new Date().toISOString(),
  };

  // Push offer to user in real-time via Ably
  await publishAbly(`bid:${id}`, "bid:offer", offer);

  req.log.info({ bid_id: id, driver_id: auth.claims.sub, offered_fare }, "Driver placed bid offer");
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

  req.log.info({ bid_id: id, offer_id }, "User accepted bid offer");
  res.json({ ok: true, status: "accepted" });
});

router.post("/bid/:id/user-reject", async (req, res) => {
  const { id } = req.params;
  const { offer_id } = req.body as { offer_id?: string };
  if (!offer_id) { res.status(400).json({ error: "offer_id required" }); return; }

  if (supabaseAdmin) {
    try {
      await supabaseAdmin.from("bid_offers").update({ status: "rejected" }).eq("id", offer_id);
    } catch {}
  }

  await publishAbly(`bid:${id}`, "bid:offer_rejected", { offer_id });

  res.json({ ok: true });
});

router.post("/bid/:id/cancel", async (req, res) => {
  const { id } = req.params;

  if (supabaseAdmin) {
    try {
      await supabaseAdmin.from("ride_bids").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", id);
    } catch {}
  }

  await publishAbly(`bid:${id}`, "bid:cancelled", { bid_id: id });

  req.log.info({ bid_id: id }, "Ride bid cancelled");
  res.json({ ok: true });
});

// ─── DRIVER: BID NOTIFICATIONS ──────────────────────────────────────────────

router.get("/driver/bids/nearby", async (req, res) => {
  const auth = requireDriverAuth(req.headers.authorization);
  if ("error" in auth) { res.status(auth.status).json({ error: auth.error }); return; }

  if (!supabaseAdmin) {
    res.json({ bids: [] });
    return;
  }

  const { data, error } = await supabaseAdmin
    .from("ride_bids")
    .select("id, pickup_name, dropoff_name, distance_km, suggested_fare, expires_at, created_at")
    .eq("status", "open")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) { req.log.warn({ err: error }, "ride_bids table not available"); res.json({ bids: [] }); return; }
  res.json({ bids: data ?? [] });
});

router.post("/admin/commission/update", async (req, res) => {
  if (!supabaseAdmin) { res.status(503).json({ error: "Supabase not configured" }); return; }
  const { rates, admin_name } = req.body as { rates?: Record<string, number>; admin_name?: string };
  if (!rates || typeof rates !== "object") { res.status(400).json({ error: "rates object required" }); return; }

  const validKeys = ["ride", "delivery", "hotel", "rental", "flight"];
  const updates = Object.entries(rates).filter(([k]) => validKeys.includes(k));

  const { data: existing } = await supabaseAdmin.from("app_settings").select("key, value").in("key", updates.map(([k]) => `commission_${k}`));
  const existMap = Object.fromEntries((existing ?? []).map((r) => [r.key, r.value]));

  const historyInserts = updates.map(([k, v]) => ({
    key: k,
    old_value: Number(existMap[`commission_${k}`] ?? DEFAULT_COMMISSIONS[k as keyof typeof DEFAULT_COMMISSIONS]),
    new_value: Number(v),
    admin_name: admin_name?.trim() ?? "Admin",
    changed_at: new Date().toISOString(),
  }));

  for (const [k, v] of updates) {
    await supabaseAdmin.from("app_settings").upsert({ key: `commission_${k}`, value: String(v), updated_at: new Date().toISOString() }, { onConflict: "key" });
  }

  if (historyInserts.length > 0) {
    await supabaseAdmin.from("commission_history").insert(historyInserts);
  }

  req.log.info({ rates }, "Commission rates updated by admin");
  res.json({ ok: true, updated: updates.map(([k]) => k) });
});

export default router;

