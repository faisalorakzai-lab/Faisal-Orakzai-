import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { useFlight, type FlightBooking } from "@/contexts/FlightContext";
import { useHotel, type HotelBooking } from "@/contexts/HotelContext";
import { useRental, type RentalRequest } from "@/contexts/RentalContext";
import { useColors } from "@/hooks/useColors";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN ?? "";

const GOLD        = "#C9A84C";
const GOLD_BRIGHT = "#FFD700";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RideRecord {
  id: string;
  status: string;
  ride_type: string;
  pickup_address: string;
  dropoff_address: string;
  total_fare: number;
  payment_method: string;
  driver_name: string | null;
  created_at: string;
}

type Tab = "rides" | "bookings";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-PK", {
    day: "2-digit", month: "short", year: "numeric",
  });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-PK", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}
function cityCode(city: string) {
  const m = city.match(/\(([A-Z]+)\)/); return m ? m[1] : city.slice(0, 3).toUpperCase();
}
function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

// ─── Status configs ───────────────────────────────────────────────────────────

const RIDE_STATUS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  completed:   { label: "Completed",   color: "#34C759", bg: "rgba(52,199,89,0.1)",  border: "rgba(52,199,89,0.28)"  },
  cancelled:   { label: "Cancelled",   color: "#FF3B30", bg: "rgba(255,59,48,0.1)",  border: "rgba(255,59,48,0.28)"  },
  ongoing:     { label: "Ongoing",     color: GOLD,      bg: "rgba(201,168,76,0.1)", border: "rgba(201,168,76,0.28)" },
  assigned:    { label: "Assigned",    color: GOLD,      bg: "rgba(201,168,76,0.1)", border: "rgba(201,168,76,0.28)" },
  pending:     { label: "Pending",     color: "#FF9500", bg: "rgba(255,149,0,0.1)",  border: "rgba(255,149,0,0.28)"  },
  no_drivers:  { label: "No Drivers",  color: "#FF3B30", bg: "rgba(255,59,48,0.1)",  border: "rgba(255,59,48,0.28)"  },
};
function rideStatus(s: string) {
  return RIDE_STATUS[s] ?? { label: s, color: "#AAAAAA", bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.12)" };
}

const BOOKING_STATUS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending_approval: { label: "Pending",     color: "#FF9500", bg: "rgba(255,149,0,0.1)",  border: "rgba(255,149,0,0.28)"  },
  confirmed:        { label: "Confirmed",   color: "#34C759", bg: "rgba(52,199,89,0.1)",  border: "rgba(52,199,89,0.28)"  },
  negotiating:      { label: "Negotiating", color: GOLD,      bg: "rgba(201,168,76,0.1)", border: "rgba(201,168,76,0.28)" },
  cancelled:        { label: "Cancelled",   color: "#FF3B30", bg: "rgba(255,59,48,0.1)",  border: "rgba(255,59,48,0.28)"  },
};
function bookingStatus(s: string) {
  return BOOKING_STATUS[s] ?? { label: s, color: "#AAAAAA", bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.12)" };
}

// ─── Ride Card ────────────────────────────────────────────────────────────────

function RideCard({ ride }: { ride: RideRecord }) {
  const colors = useColors();
  const st = rideStatus(ride.status);
  const isBike = ride.ride_type === "community";
  const rideLabel = ride.ride_type === "sovereign" ? "Sovereign Ride"
    : ride.ride_type === "autonomous" ? "Autonomous Ride"
    : "Community Ride";

  return (
    <View style={[styles.card, { backgroundColor: "#0A0A0A", borderColor: "rgba(201,168,76,0.14)" }]}>
      {/* Top row */}
      <View style={styles.cardTop}>
        <View style={[styles.vehicleIcon, { backgroundColor: "rgba(201,168,76,0.07)", borderColor: "rgba(201,168,76,0.18)" }]}>
          <Text style={{ fontSize: 20 }}>{isBike ? "🏍️" : "🚗"}</Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.cardTitle, { color: "#FFFFFF" }]}>{rideLabel}</Text>
          <Text style={[styles.cardMeta, { color: colors.mutedForeground }]}>
            {fmtDate(ride.created_at)} · {fmtTime(ride.created_at)}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: st.bg, borderColor: st.border }]}>
          <View style={[styles.badgeDot, { backgroundColor: st.color }]} />
          <Text style={[styles.badgeText, { color: st.color }]}>{st.label}</Text>
        </View>
      </View>

      {/* Route */}
      <View style={[styles.routeBlock, { borderTopColor: "rgba(255,255,255,0.05)", borderBottomColor: "rgba(255,255,255,0.05)" }]}>
        <View style={styles.routePin}>
          <View style={[styles.pinDot, { backgroundColor: "#34C759" }]} />
          <Text style={[styles.routeText, { color: "#CCCCCC" }]} numberOfLines={1}>
            {truncate(ride.pickup_address, 38)}
          </Text>
        </View>
        <View style={[styles.pinLine, { backgroundColor: "rgba(201,168,76,0.18)" }]} />
        <View style={styles.routePin}>
          <Feather name="map-pin" size={10} color={GOLD} />
          <Text style={[styles.routeText, { color: "#CCCCCC" }]} numberOfLines={1}>
            {truncate(ride.dropoff_address, 38)}
          </Text>
        </View>
      </View>

      {/* Bottom */}
      <View style={styles.cardBottom}>
        <View style={{ gap: 2 }}>
          {ride.driver_name && (
            <Text style={[styles.cardMeta, { color: colors.mutedForeground }]}>
              Driver: {ride.driver_name}
            </Text>
          )}
          <Text style={[styles.cardMeta, { color: colors.mutedForeground }]}>
            {ride.payment_method === "wallet" ? "Wallet" : "Cash"}
          </Text>
        </View>
        {ride.total_fare > 0 && (
          <Text style={styles.fare}>PKR {ride.total_fare.toLocaleString()}</Text>
        )}
      </View>
    </View>
  );
}

// ─── Booking unified type ─────────────────────────────────────────────────────

type BookingKind = "rental" | "hotel" | "flight";

interface UnifiedBooking {
  kind: BookingKind;
  id: string;
  title: string;          // Car name / Hotel name / "KHI → ISB"
  subtitle: string;       // date range / departure date
  amount: number;
  status: string;
  created_at: string;
  raw: RentalRequest | HotelBooking | FlightBooking;
}

function rentalToUnified(r: RentalRequest): UnifiedBooking {
  return {
    kind: "rental",
    id: r.id,
    title: r.car_name,
    subtitle: `${fmtDate(r.start_date)} → ${fmtDate(r.end_date)} · ${r.days}d`,
    amount: r.total_cost,
    status: r.status,
    created_at: r.created_at,
    raw: r,
  };
}
function hotelToUnified(h: HotelBooking): UnifiedBooking {
  return {
    kind: "hotel",
    id: h.id,
    title: h.hotel_name,
    subtitle: `${fmtDate(h.check_in)} → ${fmtDate(h.check_out)} · ${h.nights} night${h.nights !== 1 ? "s" : ""}`,
    amount: h.total_cost,
    status: h.status,
    created_at: h.created_at,
    raw: h,
  };
}
function flightToUnified(f: FlightBooking): UnifiedBooking {
  return {
    kind: "flight",
    id: f.id,
    title: `${cityCode(f.from_city)} → ${cityCode(f.to_city)}`,
    subtitle: `${fmtDate(f.departure_date)} · ${f.travel_class === "economy" ? "Economy" : f.travel_class === "business" ? "Business" : "First Class"} · ${f.passengers} pax`,
    amount: (f.final_fare ?? f.proposed_fare ?? f.suggested_fare) * f.passengers,
    status: f.status,
    created_at: f.created_at,
    raw: f,
  };
}

// Kind configs
const KIND_CONFIG: Record<BookingKind, { label: string; icon: string; color: string; route: string }> = {
  rental:  { label: "Rent A Car",  icon: "🚘", color: "#4A9EFF", route: "/services/rental-bookings" },
  hotel:   { label: "Hotel Stay",  icon: "🏨", color: GOLD,      route: "/services/hotel-bookings"  },
  flight:  { label: "Flight",      icon: "✈️", color: "#AF52DE", route: "/services/flight-bookings" },
};

// ─── Booking Card ─────────────────────────────────────────────────────────────

function BookingCard({ booking }: { booking: UnifiedBooking }) {
  const colors = useColors();
  const st = bookingStatus(booking.status);
  const kc = KIND_CONFIG[booking.kind];

  return (
    <View style={[styles.card, { backgroundColor: "#0A0A0A", borderColor: "rgba(201,168,76,0.14)" }]}>
      <View style={styles.cardTop}>
        <View style={[styles.vehicleIcon, { backgroundColor: `${kc.color}12`, borderColor: `${kc.color}30` }]}>
          <Text style={{ fontSize: 20 }}>{kc.icon}</Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={[styles.kindTag, { backgroundColor: `${kc.color}14`, borderColor: `${kc.color}28` }]}>
            <Text style={[styles.kindTagText, { color: kc.color }]}>{kc.label.toUpperCase()}</Text>
          </View>
          <Text style={[styles.cardTitle, { color: "#FFFFFF" }]} numberOfLines={1}>
            {booking.title}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: st.bg, borderColor: st.border }]}>
          <View style={[styles.badgeDot, { backgroundColor: st.color }]} />
          <Text style={[styles.badgeText, { color: st.color }]}>{st.label}</Text>
        </View>
      </View>

      <View style={[styles.bookingMeta, { borderTopColor: "rgba(255,255,255,0.05)" }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
          <Feather name="calendar" size={11} color={colors.mutedForeground} />
          <Text style={[styles.cardMeta, { color: colors.mutedForeground }]} numberOfLines={1}>
            {booking.subtitle}
          </Text>
        </View>
        {booking.amount > 0 && (
          <Text style={styles.fare}>PKR {booking.amount.toLocaleString()}</Text>
        )}
      </View>

      <View style={[styles.cardFooter, { borderTopColor: "rgba(255,255,255,0.05)" }]}>
        <Text style={[styles.cardMeta, { color: colors.mutedForeground }]}>
          Booked {fmtDate(booking.created_at)}
        </Text>
        <TouchableOpacity
          style={[styles.detailBtn, { borderColor: "rgba(201,168,76,0.3)", backgroundColor: "rgba(201,168,76,0.07)" }]}
          onPress={() => router.push(kc.route as never)}
          activeOpacity={0.82}
        >
          <Text style={[styles.detailBtnText, { color: GOLD }]}>View Details</Text>
          <Feather name="chevron-right" size={12} color={GOLD} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ tab }: { tab: Tab }) {
  const colors = useColors();
  return (
    <View style={styles.emptyWrap}>
      <View style={[styles.emptyIcon, { borderColor: "rgba(201,168,76,0.2)", backgroundColor: "rgba(201,168,76,0.05)" }]}>
        <Text style={{ fontSize: 40 }}>{tab === "rides" ? "🛺" : "📋"}</Text>
      </View>
      <Text style={[styles.emptyTitle, { color: "#FFFFFF" }]}>No History Yet</Text>
      <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
        {tab === "rides"
          ? "Your completed and past rides will appear here."
          : "Your hotel, car & flight bookings will appear here."}
      </Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function HistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token, user } = useAuth();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 16);

  const { myBookings: rentals, fetchMyBookings: fetchRentals } = useRental();
  const { bookings: hotelBookings, fetchBookings: fetchHotels } = useHotel();
  const { bookings: flightBookings, fetchBookings: fetchFlights } = useFlight();

  const [tab, setTab] = useState<Tab>("rides");
  const [rides, setRides] = useState<RideRecord[]>([]);
  const [isLoadingRides, setIsLoadingRides] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchRides = useCallback(async () => {
    if (!token || !user?.id) return;
    setIsLoadingRides(true);
    try {
      const res = await fetch(`${API_BASE}/api/otc/rides/history/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("failed");
      const data = await res.json() as { rides: RideRecord[] };
      setRides(data.rides ?? []);
    } catch {
      setRides([]);
    } finally {
      setIsLoadingRides(false);
    }
  }, [token, user?.id]);

  const loadAll = useCallback(async () => {
    await Promise.all([fetchRides(), fetchRentals(), fetchHotels(), fetchFlights()]);
  }, [fetchRides, fetchRentals, fetchHotels, fetchFlights]);

  useEffect(() => { void loadAll(); }, [loadAll]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadAll();
    setIsRefreshing(false);
  }, [loadAll]);

  const unifiedBookings = useMemo<UnifiedBooking[]>(() => {
    const all: UnifiedBooking[] = [
      ...rentals.map(rentalToUnified),
      ...hotelBookings.map(hotelToUnified),
      ...flightBookings.map(flightToUnified),
    ];
    return all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [rentals, hotelBookings, flightBookings]);

  const isLoading = isLoadingRides && rides.length === 0;

  const totalRides    = rides.length;
  const totalBookings = unifiedBookings.length;
  const completedRides = rides.filter((r) => r.status === "completed").length;
  const confirmedBookings = unifiedBookings.filter((b) => b.status === "confirmed").length;

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: "#000000" }]}
      contentContainerStyle={[
        styles.scroll,
        { paddingTop: topPad, paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 120) },
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={GOLD} />
      }
    >
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
        <Feather name="arrow-left" size={22} color={GOLD_BRIGHT} />
      </TouchableOpacity>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerBadge}>
          <Feather name="clock" size={10} color={GOLD} />
          <Text style={styles.headerBadgeText}>ORDER HISTORY</Text>
        </View>
        <Text style={styles.headerTitle}>My History</Text>
        <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
          All rides, bookings and service requests in one place.
        </Text>
      </View>

      {/* Stats strip */}
      <View style={[styles.statsRow, { borderColor: "rgba(201,168,76,0.14)", backgroundColor: "#0A0A0A" }]}>
        {[
          { label: "Total Rides",     value: totalRides },
          { label: "Rides Done",      value: completedRides },
          { label: "Total Bookings",  value: totalBookings },
          { label: "Confirmed",       value: confirmedBookings },
        ].map(({ label, value }, i) => (
          <React.Fragment key={label}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{value}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
            </View>
            {i < 3 && <View style={[styles.statDivider, { backgroundColor: "rgba(201,168,76,0.12)" }]} />}
          </React.Fragment>
        ))}
      </View>

      {/* Tab toggle */}
      <View style={[styles.tabBar, { backgroundColor: "#0D0D0D", borderColor: "rgba(201,168,76,0.14)" }]}>
        {([
          { key: "rides" as Tab,    label: "Rides",    icon: "navigation" as const,  count: totalRides    },
          { key: "bookings" as Tab, label: "Bookings", icon: "bookmark"   as const, count: totalBookings },
        ]).map(({ key, label, icon, count }) => {
          const active = tab === key;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.tabBtn, { backgroundColor: active ? GOLD : "transparent" }]}
              onPress={() => setTab(key)}
              activeOpacity={0.82}
            >
              <Feather name={icon} size={13} color={active ? "#050505" : colors.mutedForeground} />
              <Text style={[styles.tabText, { color: active ? "#050505" : colors.mutedForeground }]}>
                {label}
              </Text>
              {count > 0 && (
                <View style={[styles.tabCount, {
                  backgroundColor: active ? "rgba(0,0,0,0.18)" : "rgba(201,168,76,0.14)",
                }]}>
                  <Text style={[styles.tabCountText, { color: active ? "#050505" : GOLD }]}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Sub-label for bookings tab */}
      {tab === "bookings" && totalBookings > 0 && (
        <View style={styles.subLegend}>
          {(["rental", "hotel", "flight"] as BookingKind[]).map((k) => {
            const kc = KIND_CONFIG[k];
            const c = unifiedBookings.filter((b) => b.kind === k).length;
            return (
              <View key={k} style={styles.legendPill}>
                <Text style={{ fontSize: 11 }}>{kc.icon}</Text>
                <Text style={[styles.legendText, { color: colors.mutedForeground }]}>
                  {c} {kc.label}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Content */}
      {tab === "rides" ? (
        isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={GOLD} size="large" />
            <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading rides…</Text>
          </View>
        ) : rides.length === 0 ? (
          <EmptyState tab="rides" />
        ) : (
          <View style={styles.list}>
            <Text style={[styles.listLabel, { color: colors.mutedForeground }]}>
              {totalRides} ride{totalRides !== 1 ? "s" : ""} · newest first
            </Text>
            {rides.map((r) => <RideCard key={r.id} ride={r} />)}
          </View>
        )
      ) : (
        unifiedBookings.length === 0 ? (
          <EmptyState tab="bookings" />
        ) : (
          <View style={styles.list}>
            <Text style={[styles.listLabel, { color: colors.mutedForeground }]}>
              {totalBookings} booking{totalBookings !== 1 ? "s" : ""} · newest first
            </Text>
            {unifiedBookings.map((b) => <BookingCard key={`${b.kind}-${b.id}`} booking={b} />)}
          </View>
        )
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  backBtn: { alignSelf: "flex-start", padding: 4, marginBottom: 12 },

  header: { gap: 6, marginBottom: 18 },
  headerBadge: {
    flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start",
    backgroundColor: "rgba(201,168,76,0.08)", borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: "rgba(201,168,76,0.2)", marginBottom: 4,
  },
  headerBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold", color: GOLD, letterSpacing: 1.5 },
  headerTitle: { fontSize: 30, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  headerSub: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },

  statsRow: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 14, borderWidth: 1,
    paddingVertical: 14, marginBottom: 16,
  },
  statItem: { flex: 1, alignItems: "center", gap: 3 },
  statValue: { fontSize: 20, fontFamily: "Inter_700Bold", color: GOLD_BRIGHT },
  statLabel: { fontSize: 9, fontFamily: "Inter_500Medium", textAlign: "center" },
  statDivider: { width: 1, height: 28 },

  tabBar: {
    flexDirection: "row", borderRadius: 14, borderWidth: 1,
    padding: 4, marginBottom: 16, gap: 4,
  },
  tabBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 7, borderRadius: 10, paddingVertical: 11,
  },
  tabText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  tabCount: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  tabCountText: { fontSize: 10, fontFamily: "Inter_700Bold" },

  subLegend: { flexDirection: "row", gap: 12, marginBottom: 14, flexWrap: "wrap" },
  legendPill: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendText: { fontSize: 11, fontFamily: "Inter_500Medium" },

  loadingBox: { alignItems: "center", gap: 12, paddingVertical: 60 },
  loadingText: { fontSize: 13, fontFamily: "Inter_400Regular" },

  list: { gap: 10 },
  listLabel: { fontSize: 11, fontFamily: "Inter_500Medium", marginBottom: 4 },

  emptyWrap: { alignItems: "center", gap: 14, paddingVertical: 50 },
  emptyIcon: {
    width: 88, height: 88, borderRadius: 44,
    borderWidth: 1, alignItems: "center", justifyContent: "center",
  },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  emptySub: {
    fontSize: 13, fontFamily: "Inter_400Regular",
    textAlign: "center", lineHeight: 20, maxWidth: 280,
  },

  // Card shared
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14, paddingBottom: 12 },
  vehicleIcon: {
    width: 44, height: 44, borderRadius: 12,
    borderWidth: 1, alignItems: "center", justifyContent: "center",
  },
  cardTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", lineHeight: 20 },
  cardMeta: { fontSize: 11, fontFamily: "Inter_400Regular" },
  badge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1,
  },
  badgeDot: { width: 5, height: 5, borderRadius: 3 },
  badgeText: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.4 },
  fare: { fontSize: 16, fontFamily: "Inter_700Bold", color: GOLD_BRIGHT },

  // Ride card
  routeBlock: { borderTopWidth: 1, borderBottomWidth: 1, paddingHorizontal: 14, paddingVertical: 10, gap: 6 },
  routePin: { flexDirection: "row", alignItems: "center", gap: 8 },
  pinDot: { width: 8, height: 8, borderRadius: 4 },
  pinLine: { width: 1, height: 10, marginLeft: 3 },
  routeText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  cardBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14, paddingTop: 10 },

  // Booking card
  kindTag: {
    alignSelf: "flex-start", paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 5, borderWidth: 1, marginBottom: 3,
  },
  kindTagText: { fontSize: 8, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  bookingMeta: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderTopWidth: 1, paddingHorizontal: 14, paddingVertical: 10,
  },
  cardFooter: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderTopWidth: 1, paddingHorizontal: 14, paddingVertical: 10,
  },
  detailBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 9, borderWidth: 1,
  },
  detailBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
});
