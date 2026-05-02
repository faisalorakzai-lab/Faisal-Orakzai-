import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect } from "react";
import {
  FlatList,
  Image,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassCard } from "@/components/GlassCard";
import { useRental, type RentalRequest } from "@/contexts/RentalContext";
import { useColors } from "@/hooks/useColors";

const GOLD = "#FFD700";

const STATUS_CONFIG = {
  pending_approval: {
    label: "Pending Approval",
    dot: "🟠",
    color: "#FF9500",
    bg: "rgba(255,149,0,0.12)",
  },
  confirmed: {
    label: "Confirmed",
    dot: "🟢",
    color: "#34C759",
    bg: "rgba(52,199,89,0.12)",
  },
  negotiating: {
    label: "Negotiating",
    dot: "🔵",
    color: "#007AFF",
    bg: "rgba(0,122,255,0.12)",
  },
  cancelled: {
    label: "Cancelled",
    dot: "🔴",
    color: "#FF3B30",
    bg: "rgba(255,59,48,0.12)",
  },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" });
}

function BookingCard({ item }: { item: RentalRequest }) {
  const colors = useColors();
  const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.pending_approval;
  const effectiveRate = item.proposed_rate ?? item.base_rate;

  return (
    <GlassCard style={styles.card}>
      <View style={styles.cardInner}>
        <Image
          source={{ uri: item.car_image_url }}
          style={styles.carThumb}
          resizeMode="cover"
        />
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <Text style={[styles.carName, { color: colors.foreground }]} numberOfLines={1}>
              {item.car_name}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
              <Text style={[styles.statusDot]}>{cfg.dot}</Text>
              <Text style={[styles.statusLabel, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
          </View>

          <View style={styles.dateRow}>
            <Feather name="calendar" size={11} color={colors.mutedForeground} />
            <Text style={[styles.dateText, { color: colors.mutedForeground }]}>
              {formatDate(item.start_date)} → {formatDate(item.end_date)}
            </Text>
            <Text style={[styles.daysText, { color: colors.gold }]}>
              {item.days}d
            </Text>
          </View>

          <View style={styles.cardBottom}>
            <View>
              <Text style={[styles.rateLabel, { color: colors.mutedForeground }]}>
                {item.proposed_rate && item.proposed_rate !== item.base_rate ? "Proposed Rate" : "Rate"}
              </Text>
              <Text style={[styles.rateValue, { color: GOLD }]}>
                PKR {effectiveRate.toLocaleString()}<Text style={styles.perDay}>/day</Text>
              </Text>
            </View>
            <View style={styles.totalBox}>
              <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Total</Text>
              <Text style={[styles.totalValue, { color: colors.foreground }]}>
                PKR {item.total_cost.toLocaleString()}
              </Text>
            </View>
          </View>

          {item.admin_note ? (
            <View style={[styles.adminNote, { borderColor: "rgba(255,215,0,0.2)", backgroundColor: "rgba(255,215,0,0.05)" }]}>
              <Feather name="message-square" size={11} color={GOLD} />
              <Text style={[styles.adminNoteText, { color: colors.mutedForeground }]} numberOfLines={2}>
                {item.admin_note}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </GlassCard>
  );
}

export default function RentalBookingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { myBookings, isLoadingBookings, fetchMyBookings } = useRental();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 16);

  useEffect(() => {
    fetchMyBookings();
  }, [fetchMyBookings]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <FlatList
        data={myBookings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <BookingCard item={item} />}
        refreshControl={
          <RefreshControl
            refreshing={isLoadingBookings}
            onRefresh={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              fetchMyBookings();
            }}
            tintColor={GOLD}
          />
        }
        contentContainerStyle={[
          styles.list,
          {
            paddingTop: topPad,
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 100),
          },
        ]}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListHeaderComponent={() => (
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.back();
              }}
              style={styles.backBtn}
              activeOpacity={0.7}
            >
              <Feather name="arrow-left" size={22} color={GOLD} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.foreground }]}>My Bookings</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Track your rental requests
            </Text>

            <View style={styles.legendRow}>
              {Object.values(STATUS_CONFIG).map((cfg) => (
                <View key={cfg.label} style={styles.legendItem}>
                  <Text style={styles.legendDot}>{cfg.dot}</Text>
                  <Text style={[styles.legendLabel, { color: colors.mutedForeground }]}>
                    {cfg.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
        ListEmptyComponent={
          !isLoadingBookings ? (
            <View style={styles.empty}>
              <View style={[styles.emptyIcon, { borderColor: "rgba(255,215,0,0.2)", backgroundColor: "rgba(255,215,0,0.06)" }]}>
                <Feather name="truck" size={40} color={GOLD} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                No bookings yet
              </Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                Browse our elite fleet and request your first rental
              </Text>
              <TouchableOpacity
                style={[styles.emptyBtn, { backgroundColor: GOLD }]}
                onPress={() => router.back()}
                activeOpacity={0.85}
              >
                <Text style={styles.emptyBtnText}>Browse Fleet</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { paddingHorizontal: 20 },
  header: { gap: 4, marginBottom: 20 },
  backBtn: { alignSelf: "flex-start", marginBottom: 12, padding: 4 },
  title: { fontSize: 26, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 16 },
  legendRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { fontSize: 12 },
  legendLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },

  card: { overflow: "hidden" },
  cardInner: { flexDirection: "row" },
  carThumb: {
    width: 90,
    height: 90,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  cardBody: { flex: 1, padding: 12, gap: 6 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  carName: { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusDot: { fontSize: 9 },
  statusLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  dateText: { fontSize: 11, fontFamily: "Inter_400Regular", flex: 1 },
  daysText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  cardBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  rateLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  rateValue: { fontSize: 13, fontFamily: "Inter_700Bold" },
  perDay: { fontSize: 10, fontFamily: "Inter_400Regular" },
  totalBox: { alignItems: "flex-end" },
  totalLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  totalValue: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  adminNote: {
    flexDirection: "row",
    gap: 6,
    padding: 7,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "flex-start",
  },
  adminNoteText: { fontSize: 11, fontFamily: "Inter_400Regular", flex: 1 },

  empty: { alignItems: "center", gap: 12, paddingTop: 60 },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptySub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 32 },
  emptyBtn: {
    marginTop: 8,
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 12,
  },
  emptyBtnText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#050505" },
});
