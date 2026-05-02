import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect } from "react";
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
import { GlassCard } from "@/components/GlassCard";
import { useFlight, type FlightBooking } from "@/contexts/FlightContext";
import { useColors } from "@/hooks/useColors";

const GOLD = "#C9A84C";
const GOLD_BRIGHT = "#FFD700";

type Status = "pending_approval" | "confirmed" | "negotiating" | "cancelled";

const STATUS_CONFIG: Record<Status, { color: string; bg: string; border: string; label: string; dot: string; emoji: string }> = {
  pending_approval: { color: "#FF9500", bg: "rgba(255,149,0,0.1)",  border: "rgba(255,149,0,0.28)",  label: "Pending Review",  dot: "#FF9500", emoji: "🟠" },
  confirmed:        { color: "#34C759", bg: "rgba(52,199,89,0.1)",  border: "rgba(52,199,89,0.28)",  label: "Ticket Issued",   dot: "#34C759", emoji: "🟢" },
  negotiating:      { color: GOLD,      bg: "rgba(201,168,76,0.1)", border: "rgba(201,168,76,0.28)", label: "Negotiating",     dot: GOLD,      emoji: "🟡" },
  cancelled:        { color: "#FF3B30", bg: "rgba(255,59,48,0.1)",  border: "rgba(255,59,48,0.28)",  label: "Cancelled",       dot: "#FF3B30", emoji: "🔴" },
};

function getStatus(s: string): Status {
  return (s in STATUS_CONFIG ? s : "pending_approval") as Status;
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" });
}
function cityCode(city: string) {
  const m = city.match(/\(([A-Z]+)\)/); return m ? m[1] : city.slice(0, 3).toUpperCase();
}
function classLabel(c: string) {
  return c === "economy" ? "Economy" : c === "business" ? "Business" : "First Class";
}

function TicketCard({ booking }: { booking: FlightBooking }) {
  const colors = useColors();
  const status = getStatus(booking.status);
  const cfg = STATUS_CONFIG[status];
  const isConfirmed = status === "confirmed";

  return (
    <View style={[styles.ticketCard, { backgroundColor: "#0A0A0A", borderColor: isConfirmed ? "rgba(52,199,89,0.3)" : "rgba(201,168,76,0.18)" }]}>
      {/* Header */}
      <View style={styles.ticketHeader}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
          <Feather name="send" size={10} color={GOLD} style={{ transform: [{ rotate: "-45deg" }] }} />
          <Text style={styles.ticketHeaderLabel}>
            {booking.travel_type === "domestic" ? "DOMESTIC" : "INTERNATIONAL"} FLIGHT
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
          <View style={[styles.statusDot, { backgroundColor: cfg.dot }]} />
          <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>

      {/* Perforation */}
      <View style={styles.perfRow}>
        <View style={[styles.perfCircle, { backgroundColor: "#000000" }]} />
        <View style={styles.perfLine}>
          {Array.from({ length: 20 }).map((_, i) => (
            <View key={i} style={[styles.perfDash, { backgroundColor: "rgba(201,168,76,0.18)" }]} />
          ))}
        </View>
        <View style={[styles.perfCircle, { backgroundColor: "#000000" }]} />
      </View>

      {/* Route */}
      <View style={styles.routeRow}>
        <View style={styles.cityBlock}>
          <Text style={[styles.routeCode, { color: isConfirmed ? "#34C759" : GOLD_BRIGHT }]}>
            {cityCode(booking.from_city)}
          </Text>
          <Text style={[styles.routeName, { color: colors.mutedForeground }]} numberOfLines={1}>
            {booking.from_city.replace(/\s*\([A-Z]+\)/, "")}
          </Text>
        </View>
        <View style={styles.planeWrap}>
          <View style={[styles.routeLine, { backgroundColor: "rgba(201,168,76,0.2)" }]} />
          <Feather name="send" size={18} color={isConfirmed ? "#34C759" : GOLD} style={{ transform: [{ rotate: "-45deg" }] }} />
          <View style={[styles.routeLine, { backgroundColor: "rgba(201,168,76,0.2)" }]} />
        </View>
        <View style={[styles.cityBlock, { alignItems: "flex-end" }]}>
          <Text style={[styles.routeCode, { color: isConfirmed ? "#34C759" : GOLD_BRIGHT }]}>
            {cityCode(booking.to_city)}
          </Text>
          <Text style={[styles.routeName, { color: colors.mutedForeground }]} numberOfLines={1}>
            {booking.to_city.replace(/\s*\([A-Z]+\)/, "")}
          </Text>
        </View>
      </View>

      {/* Details grid */}
      <View style={styles.detailsGrid}>
        {[
          { label: "DATE",  value: fmtDate(booking.departure_date) },
          { label: "CLASS", value: classLabel(booking.travel_class) },
          { label: "PAX",   value: `${booking.passengers}` },
          { label: "FARE",  value: `PKR ${(booking.final_fare ?? booking.suggested_fare).toLocaleString()}` },
        ].map(({ label, value }) => (
          <View key={label} style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>{label}</Text>
            <Text style={[styles.detailValue, { color: "#FFFFFF" }]}>{value}</Text>
          </View>
        ))}
      </View>

      {/* Perforation */}
      <View style={styles.perfRow}>
        <View style={[styles.perfCircle, { backgroundColor: "#000000" }]} />
        <View style={styles.perfLine}>
          {Array.from({ length: 20 }).map((_, i) => (
            <View key={i} style={[styles.perfDash, { backgroundColor: "rgba(201,168,76,0.18)" }]} />
          ))}
        </View>
        <View style={[styles.perfCircle, { backgroundColor: "#000000" }]} />
      </View>

      {/* Footer */}
      <View style={styles.ticketFooter}>
        {booking.proposed_fare && (
          <View style={[styles.proposedTag, { backgroundColor: "rgba(201,168,76,0.08)", borderColor: "rgba(201,168,76,0.22)" }]}>
            <Text style={[styles.proposedTagText, { color: GOLD }]}>
              Proposed: PKR {booking.proposed_fare.toLocaleString()}
            </Text>
          </View>
        )}
        {booking.visa_assistance && (
          <View style={[styles.visaTag, { backgroundColor: "rgba(201,168,76,0.08)", borderColor: "rgba(201,168,76,0.22)" }]}>
            <Feather name="credit-card" size={10} color={GOLD} />
            <Text style={[styles.visaTagText, { color: GOLD }]}>Visa Assist</Text>
          </View>
        )}
        {isConfirmed && (
          <View style={[styles.issuedBadge, { backgroundColor: "rgba(52,199,89,0.1)", borderColor: "rgba(52,199,89,0.25)" }]}>
            <Feather name="check-circle" size={11} color="#34C759" />
            <Text style={[styles.issuedText, { color: "#34C759" }]}>TICKET ISSUED</Text>
          </View>
        )}
      </View>

      {booking.admin_note && (
        <View style={[styles.adminNote, { backgroundColor: "rgba(201,168,76,0.06)", borderColor: "rgba(201,168,76,0.15)" }]}>
          <Feather name="message-circle" size={12} color={GOLD} />
          <Text style={[styles.adminNoteText, { color: "#CCCCCC" }]}>{booking.admin_note}</Text>
        </View>
      )}
    </View>
  );
}

export default function FlightBookingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { bookings, isLoadingBookings, fetchBookings } = useFlight();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 16);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);
  const onRefresh = useCallback(() => { fetchBookings(); }, [fetchBookings]);

  const confirmed   = bookings.filter((b) => b.status === "confirmed");
  const pending     = bookings.filter((b) => b.status === "pending_approval");
  const negotiating = bookings.filter((b) => b.status === "negotiating");
  const cancelled   = bookings.filter((b) => b.status === "cancelled");
  const ordered     = [...confirmed, ...pending, ...negotiating, ...cancelled];

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: "#000000" }]}
      contentContainerStyle={[
        styles.scroll,
        { paddingTop: topPad, paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 110) },
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isLoadingBookings} onRefresh={onRefresh} tintColor={GOLD} />
      }
    >
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
        <Feather name="arrow-left" size={22} color={GOLD_BRIGHT} />
      </TouchableOpacity>

      <View style={styles.header}>
        <View style={styles.headerBadge}>
          <Feather name="bookmark" size={10} color={GOLD} />
          <Text style={styles.headerBadgeText}>MY TICKETS</Text>
        </View>
        <Text style={styles.headerTitle}>Flight History</Text>
        <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
          Issued tickets, pending requests & past travel.
        </Text>
      </View>

      <View style={styles.legendRow}>
        {(Object.entries(STATUS_CONFIG) as [Status, typeof STATUS_CONFIG[Status]][]).map(([, cfg]) => (
          <View key={cfg.label} style={styles.legendItem}>
            <Text style={{ fontSize: 10 }}>{cfg.emoji}</Text>
            <Text style={[styles.legendText, { color: colors.mutedForeground }]}>{cfg.label}</Text>
          </View>
        ))}
      </View>

      {isLoadingBookings ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={GOLD} size="large" />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading tickets…</Text>
        </View>
      ) : ordered.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={{ fontSize: 48 }}>✈️</Text>
          <Text style={[styles.emptyTitle, { color: "#FFFFFF" }]}>No tickets yet</Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
            Search for a flight and submit your first booking request.
          </Text>
          <TouchableOpacity
            style={[styles.searchBtn, { backgroundColor: GOLD }]}
            onPress={() => router.back()}
            activeOpacity={0.88}
          >
            <Feather name="search" size={15} color="#050505" />
            <Text style={styles.searchBtnText}>Search Flights</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ gap: 14 }}>
          {ordered.map((b) => <TicketCard key={b.id} booking={b} />)}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  backBtn: { alignSelf: "flex-start", padding: 4, marginBottom: 12 },

  header: { gap: 6, marginBottom: 20 },
  headerBadge: {
    flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start",
    backgroundColor: "rgba(201,168,76,0.08)", borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: "rgba(201,168,76,0.2)", marginBottom: 4,
  },
  headerBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold", color: GOLD, letterSpacing: 1.5 },
  headerTitle: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  headerSub: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },

  legendRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 20 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendText: { fontSize: 11, fontFamily: "Inter_500Medium" },

  loadingBox: { alignItems: "center", gap: 12, paddingVertical: 60 },
  loadingText: { fontSize: 13, fontFamily: "Inter_400Regular" },

  emptyBox: { alignItems: "center", gap: 14, paddingVertical: 50 },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  emptySub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20, maxWidth: 280 },
  searchBtn: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 13 },
  searchBtnText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#050505" },

  // Ticket
  ticketCard: { borderRadius: 18, borderWidth: 1, overflow: "hidden" },
  ticketHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14, paddingBottom: 10 },
  ticketHeaderLabel: { fontSize: 10, fontFamily: "Inter_700Bold", color: GOLD, letterSpacing: 1.2 },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },

  perfRow: { flexDirection: "row", alignItems: "center", marginHorizontal: -1 },
  perfCircle: { width: 16, height: 16, borderRadius: 8 },
  perfLine: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-around", paddingHorizontal: 6 },
  perfDash: { width: 5, height: 2, borderRadius: 1 },

  routeRow: { flexDirection: "row", alignItems: "center", padding: 16, paddingVertical: 18, gap: 8 },
  cityBlock: { flex: 1, gap: 3 },
  routeCode: { fontSize: 30, fontFamily: "Inter_700Bold" },
  routeName: { fontSize: 10, fontFamily: "Inter_400Regular" },
  planeWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  routeLine: { flex: 1, height: 1 },

  detailsGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 14, paddingBottom: 8 },
  detailItem: { width: "50%", paddingVertical: 6, gap: 2 },
  detailLabel: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1, textTransform: "uppercase" },
  detailValue: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  ticketFooter: { flexDirection: "row", flexWrap: "wrap", gap: 8, padding: 14, paddingTop: 10 },
  proposedTag: { flexDirection: "row", gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  proposedTagText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  visaTag: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  visaTagText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  issuedBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  issuedText: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },

  adminNote: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    margin: 14, marginTop: 0, padding: 11, borderRadius: 10, borderWidth: 1,
  },
  adminNoteText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 18 },
});
