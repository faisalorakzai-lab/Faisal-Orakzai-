import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect } from "react";
import {
  ActivityIndicator,
  Image,
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
import { useHotel, type HotelBooking } from "@/contexts/HotelContext";
import { useColors } from "@/hooks/useColors";

const GOLD = "#C9A84C";
const GOLD_BRIGHT = "#FFD700";

type Status = "pending_approval" | "confirmed" | "negotiating" | "cancelled";

const STATUS_CONFIG: Record<Status, { color: string; bg: string; border: string; label: string; dot: string }> = {
  pending_approval: {
    color: "#FF9500", bg: "rgba(255,149,0,0.1)", border: "rgba(255,149,0,0.28)",
    label: "Pending Review", dot: "#FF9500",
  },
  confirmed: {
    color: "#34C759", bg: "rgba(52,199,89,0.1)", border: "rgba(52,199,89,0.28)",
    label: "Confirmed", dot: "#34C759",
  },
  negotiating: {
    color: GOLD, bg: "rgba(201,168,76,0.1)", border: "rgba(201,168,76,0.28)",
    label: "Negotiating", dot: GOLD,
  },
  cancelled: {
    color: "#FF3B30", bg: "rgba(255,59,48,0.1)", border: "rgba(255,59,48,0.28)",
    label: "Cancelled", dot: "#FF3B30",
  },
};

function getStatus(s: string): Status {
  return (s in STATUS_CONFIG ? s : "pending_approval") as Status;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-PK", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function DigitalPass({ booking }: { booking: HotelBooking }) {
  const colors = useColors();
  const cfg = STATUS_CONFIG.confirmed;

  return (
    <View style={[styles.pass, { borderColor: "rgba(201,168,76,0.35)", backgroundColor: "#0A0A0A" }]}>
      <View style={styles.passTopRow}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Feather name="star" size={10} color={GOLD} />
          <Text style={styles.passTopLabel}>OTC CONCIERGE PASS</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
          <View style={[styles.statusDotSmall, { backgroundColor: cfg.dot }]} />
          <Text style={[styles.statusBadgeText, { color: cfg.color }]}>READY FOR CHECK-IN</Text>
        </View>
      </View>

      <View style={[styles.passDivider, { backgroundColor: "rgba(201,168,76,0.14)" }]} />

      <View style={styles.passBody}>
        <Text style={styles.passHotelName} numberOfLines={1}>{booking.hotel_name}</Text>
        <Text style={[styles.passRoomType, { color: GOLD }]}>{booking.room_type}</Text>

        <View style={styles.passDatesRow}>
          <View style={styles.passDateBlock}>
            <Text style={[styles.passDateLabel, { color: colors.mutedForeground }]}>CHECK-IN</Text>
            <Text style={styles.passDateValue}>{formatDate(booking.check_in)}</Text>
          </View>
          <View style={styles.passArrow}>
            <View style={[styles.passLine, { backgroundColor: "rgba(201,168,76,0.3)" }]} />
            <Feather name="moon" size={11} color={GOLD} />
            <Text style={[styles.passNights, { color: GOLD }]}>{booking.nights}n</Text>
            <View style={[styles.passLine, { backgroundColor: "rgba(201,168,76,0.3)" }]} />
          </View>
          <View style={[styles.passDateBlock, { alignItems: "flex-end" }]}>
            <Text style={[styles.passDateLabel, { color: colors.mutedForeground }]}>CHECK-OUT</Text>
            <Text style={styles.passDateValue}>{formatDate(booking.check_out)}</Text>
          </View>
        </View>

        <View style={[styles.passTotalRow, { borderTopColor: "rgba(201,168,76,0.12)" }]}>
          <Text style={[styles.passTotalLabel, { color: colors.mutedForeground }]}>Total</Text>
          <Text style={styles.passTotalValue}>PKR {booking.total_cost.toLocaleString()}</Text>
        </View>
      </View>
    </View>
  );
}

function BookingCard({ booking }: { booking: HotelBooking }) {
  const colors = useColors();
  const status = getStatus(booking.status);
  const cfg = STATUS_CONFIG[status];
  const isConfirmed = status === "confirmed";

  return (
    <GlassCard style={styles.bookingCard}>
      {isConfirmed && <DigitalPass booking={booking} />}

      {!isConfirmed && (
        <View style={styles.bookingHeader}>
          <View style={styles.bookingHeaderLeft}>
            {booking.hotel_image_url ? (
              <Image
                source={{ uri: booking.hotel_image_url }}
                style={styles.hotelThumb}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.hotelThumb, { backgroundColor: "#1A1A1A", alignItems: "center", justifyContent: "center" }]}>
                <Feather name="home" size={20} color={GOLD} />
              </View>
            )}
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={[styles.bookingHotelName, { color: "#FFFFFF" }]} numberOfLines={1}>
                {booking.hotel_name}
              </Text>
              <Text style={[styles.bookingRoomType, { color: GOLD }]}>{booking.room_type}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
            <View style={[styles.statusDotSmall, { backgroundColor: cfg.dot }]} />
            <Text style={[styles.statusBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>
      )}

      {!isConfirmed && (
        <>
          <View style={[styles.bookingDivider, { backgroundColor: "rgba(255,255,255,0.06)" }]} />

          <View style={styles.datesRow}>
            <View style={styles.dateBlock}>
              <Text style={[styles.dateBlockLabel, { color: colors.mutedForeground }]}>CHECK-IN</Text>
              <Text style={[styles.dateBlockVal, { color: "#FFFFFF" }]}>{formatDate(booking.check_in)}</Text>
            </View>
            <View style={styles.nightsBlock}>
              <Feather name="moon" size={12} color={GOLD} />
              <Text style={[styles.nightsVal, { color: GOLD }]}>
                {booking.nights} {booking.nights === 1 ? "night" : "nights"}
              </Text>
            </View>
            <View style={[styles.dateBlock, { alignItems: "flex-end" }]}>
              <Text style={[styles.dateBlockLabel, { color: colors.mutedForeground }]}>CHECK-OUT</Text>
              <Text style={[styles.dateBlockVal, { color: "#FFFFFF" }]}>{formatDate(booking.check_out)}</Text>
            </View>
          </View>

          <View style={[styles.bookingDivider, { backgroundColor: "rgba(255,255,255,0.06)" }]} />

          <View style={styles.bookingFooter}>
            <View style={{ gap: 2 }}>
              <Text style={[styles.footerLabel, { color: colors.mutedForeground }]}>Estimated Total</Text>
              <Text style={[styles.footerTotal, { color: GOLD_BRIGHT }]}>
                PKR {booking.total_cost.toLocaleString()}
              </Text>
            </View>
            {booking.proposed_rate && (
              <View style={[styles.negotiatedBadge, { backgroundColor: "rgba(201,168,76,0.1)", borderColor: "rgba(201,168,76,0.25)" }]}>
                <Text style={[styles.negotiatedText, { color: GOLD }]}>Proposed Rate</Text>
              </View>
            )}
          </View>

          {booking.admin_note && (
            <View style={[styles.adminNote, { backgroundColor: "rgba(201,168,76,0.07)", borderColor: "rgba(201,168,76,0.18)" }]}>
              <Feather name="message-circle" size={13} color={GOLD} />
              <Text style={[styles.adminNoteText, { color: "#CCCCCC" }]}>{booking.admin_note}</Text>
            </View>
          )}
        </>
      )}
    </GlassCard>
  );
}

export default function HotelBookingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { bookings, isLoadingBookings, fetchBookings } = useHotel();
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
          <Feather name="calendar" size={10} color={GOLD} />
          <Text style={styles.headerBadgeText}>MY RESERVATIONS</Text>
        </View>
        <Text style={styles.headerTitle}>Booking History</Text>
        <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
          Confirmed passes, pending requests, and past stays.
        </Text>
      </View>

      {/* Legend */}
      <View style={styles.legendRow}>
        {(Object.entries(STATUS_CONFIG) as [Status, typeof STATUS_CONFIG[Status]][]).map(([key, cfg]) => (
          <View key={key} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: cfg.dot }]} />
            <Text style={[styles.legendText, { color: colors.mutedForeground }]}>{cfg.label}</Text>
          </View>
        ))}
      </View>

      {isLoadingBookings ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={GOLD} size="large" />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading reservations…</Text>
        </View>
      ) : ordered.length === 0 ? (
        <View style={styles.emptyBox}>
          <View style={[styles.emptyIcon, { borderColor: "rgba(201,168,76,0.2)", backgroundColor: "rgba(201,168,76,0.05)" }]}>
            <Text style={{ fontSize: 38 }}>🏨</Text>
          </View>
          <Text style={[styles.emptyTitle, { color: "#FFFFFF" }]}>No reservations yet</Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
            Browse our curated collection and request your first booking.
          </Text>
          <TouchableOpacity
            style={[styles.browseBtn, { backgroundColor: GOLD }]}
            onPress={() => router.back()}
            activeOpacity={0.88}
          >
            <Feather name="search" size={15} color="#050505" />
            <Text style={styles.browseBtnText}>Browse Properties</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ gap: 16 }}>
          {confirmed.length > 0 && (
            <View style={styles.sectionGroup}>
              <View style={styles.sectionLabelRow}>
                <View style={[styles.sectionDot, { backgroundColor: "#34C759" }]} />
                <Text style={[styles.sectionGroupLabel, { color: colors.mutedForeground }]}>
                  READY FOR CHECK-IN
                </Text>
              </View>
              {confirmed.map((b) => <BookingCard key={b.id} booking={b} />)}
            </View>
          )}
          {pending.length > 0 && (
            <View style={styles.sectionGroup}>
              <View style={styles.sectionLabelRow}>
                <View style={[styles.sectionDot, { backgroundColor: "#FF9500" }]} />
                <Text style={[styles.sectionGroupLabel, { color: colors.mutedForeground }]}>
                  PENDING REVIEW
                </Text>
              </View>
              {pending.map((b) => <BookingCard key={b.id} booking={b} />)}
            </View>
          )}
          {negotiating.length > 0 && (
            <View style={styles.sectionGroup}>
              <View style={styles.sectionLabelRow}>
                <View style={[styles.sectionDot, { backgroundColor: GOLD }]} />
                <Text style={[styles.sectionGroupLabel, { color: colors.mutedForeground }]}>
                  NEGOTIATING
                </Text>
              </View>
              {negotiating.map((b) => <BookingCard key={b.id} booking={b} />)}
            </View>
          )}
          {cancelled.length > 0 && (
            <View style={styles.sectionGroup}>
              <View style={styles.sectionLabelRow}>
                <View style={[styles.sectionDot, { backgroundColor: "#FF3B30" }]} />
                <Text style={[styles.sectionGroupLabel, { color: colors.mutedForeground }]}>
                  CANCELLED
                </Text>
              </View>
              {cancelled.map((b) => <BookingCard key={b.id} booking={b} />)}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20, gap: 0 },
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
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { fontSize: 11, fontFamily: "Inter_500Medium" },

  loadingBox: { alignItems: "center", gap: 12, paddingVertical: 60 },
  loadingText: { fontSize: 13, fontFamily: "Inter_400Regular" },

  emptyBox: { alignItems: "center", gap: 14, paddingVertical: 50 },
  emptyIcon: { width: 90, height: 90, borderRadius: 45, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  emptySub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20, maxWidth: 280 },
  browseBtn: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 13 },
  browseBtnText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#050505" },

  sectionGroup: { gap: 10 },
  sectionLabelRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  sectionDot: { width: 6, height: 6, borderRadius: 3 },
  sectionGroupLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.2 },

  bookingCard: { padding: 0, overflow: "hidden", gap: 0 },

  // Digital Pass
  pass: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  passTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14, paddingBottom: 10 },
  passTopLabel: { fontSize: 10, fontFamily: "Inter_700Bold", color: GOLD, letterSpacing: 1.5 },
  passDivider: { height: 1, marginHorizontal: 14 },
  passBody: { padding: 14, gap: 8 },
  passHotelName: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  passRoomType: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  passDatesRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  passDateBlock: { flex: 1, gap: 3 },
  passDateLabel: { fontSize: 8, fontFamily: "Inter_700Bold", letterSpacing: 1, textTransform: "uppercase" },
  passDateValue: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
  passArrow: { flexDirection: "row", alignItems: "center", gap: 3 },
  passLine: { width: 14, height: 1 },
  passNights: { fontSize: 10, fontFamily: "Inter_700Bold" },
  passTotalRow: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, paddingTop: 10 },
  passTotalLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  passTotalValue: { fontSize: 16, fontFamily: "Inter_700Bold", color: GOLD_BRIGHT },

  // Status badge
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  statusDotSmall: { width: 6, height: 6, borderRadius: 3 },
  statusBadgeText: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },

  // Booking card (non-confirmed)
  bookingHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", padding: 14, gap: 10 },
  bookingHeaderLeft: { flexDirection: "row", gap: 12, flex: 1, alignItems: "center" },
  hotelThumb: { width: 52, height: 52, borderRadius: 12, overflow: "hidden" },
  bookingHotelName: { fontSize: 14, fontFamily: "Inter_700Bold" },
  bookingRoomType: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  bookingDivider: { height: 1 },
  datesRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 8 },
  dateBlock: { flex: 1, gap: 3 },
  dateBlockLabel: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1, textTransform: "uppercase" },
  dateBlockVal: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  nightsBlock: { flexDirection: "row", alignItems: "center", gap: 4 },
  nightsVal: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  bookingFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, paddingTop: 10 },
  footerLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  footerTotal: { fontSize: 18, fontFamily: "Inter_700Bold" },
  negotiatedBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  negotiatedText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  adminNote: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    margin: 14, marginTop: 0, padding: 12, borderRadius: 10, borderWidth: 1,
  },
  adminNoteText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 18 },
});
