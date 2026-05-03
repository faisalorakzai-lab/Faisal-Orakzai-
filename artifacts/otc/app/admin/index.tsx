import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

const GOLD = "#FFD700";
const GOLD_DIM = "rgba(255,215,0,0.18)";
const BG = "#050505";

type AdminStats = {
  totalUsers: number;
  totalDrivers: number;
  totalRides: number;
  rentACar: number;
  hotelBookings: number;
  flightTickets: number;
  totalRevenue: number;
};

type DailyPoint = { day: string; revenue: number };
type ActivityItem = { id: string; title: string; subtitle: string; icon: keyof typeof Feather.glyphMap; time: string };

export const NAV_ITEMS = [
  { key: "overview", label: "Overview", icon: "grid" as const, route: "/admin" },
  { key: "drivers", label: "Driver Verification", icon: "shield" as const, route: "/admin/drivers" },
  { key: "rides", label: "Ride Ledger", icon: "map" as const, route: "/admin/rides" },
  { key: "users", label: "Users", icon: "users" as const, route: "/admin/users" },
  { key: "rentals", label: "Rentals", icon: "key" as const, route: "/admin" },
  { key: "hotels", label: "Hotels", icon: "home" as const, route: "/admin" },
  { key: "flights", label: "Flights", icon: "send" as const, route: "/admin" },
  { key: "financials", label: "Financials", icon: "dollar-sign" as const, route: "/admin" },
] as const;

type NavKey = typeof NAV_ITEMS[number]["key"];

export function AdminSidebar({ activeKey, topPad }: { activeKey: NavKey; topPad: number }) {
  return (
    <View style={[sidebar.root, { paddingTop: topPad }]}>
      <Text style={sidebar.brand}>ORAKZAI</Text>
      <Text style={sidebar.brandSub}>Command Center</Text>
      {NAV_ITEMS.map((item) => {
        const active = item.key === activeKey;
        return (
          <TouchableOpacity
            key={item.key}
            style={[sidebar.navItem, active && sidebar.navItemActive]}
            onPress={() => { if (!active) router.push(item.route as never); }}
            activeOpacity={0.8}
          >
            <Feather name={item.icon} size={15} color={active ? BG : GOLD} />
            <Text style={[sidebar.navText, active && sidebar.navTextActive]}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
      <TouchableOpacity style={sidebar.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
        <Feather name="arrow-left" size={14} color="#666" />
        <Text style={sidebar.backText}>Exit Admin</Text>
      </TouchableOpacity>
    </View>
  );
}

const sidebar = StyleSheet.create({
  root: { width: 200, borderRightWidth: 1, borderRightColor: "rgba(255,215,0,0.10)", paddingHorizontal: 14, backgroundColor: "#070707", gap: 6 },
  brand: { color: GOLD, fontSize: 18, fontFamily: "Inter_700Bold", letterSpacing: 2, marginBottom: 2 },
  brandSub: { color: "#6A6A6A", fontSize: 10, textTransform: "uppercase", letterSpacing: 2, marginBottom: 10 },
  navItem: { flexDirection: "row", alignItems: "center", gap: 9, paddingVertical: 11, paddingHorizontal: 11, borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,215,0,0.07)", backgroundColor: "rgba(255,255,255,0.02)" },
  navItemActive: { backgroundColor: GOLD, borderColor: GOLD },
  navText: { color: "#E0E0E0", fontSize: 12, fontFamily: "Inter_500Medium", flex: 1 },
  navTextActive: { color: BG, fontFamily: "Inter_700Bold" },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: "auto", paddingVertical: 12, paddingHorizontal: 11 },
  backText: { color: "#555", fontSize: 12 },
});

const METRICS = [
  { key: "totalUsers", label: "Total Users", icon: "users" },
  { key: "totalDrivers", label: "Total Drivers", icon: "navigation-2" },
  { key: "totalRides", label: "Total Rides", icon: "map" },
  { key: "rentACar", label: "Rent-A-Car", icon: "key" },
  { key: "hotelBookings", label: "Hotel Bookings", icon: "home" },
  { key: "flightTickets", label: "Flight Tickets", icon: "send" },
  { key: "totalRevenue", label: "Total Revenue", icon: "dollar-sign" },
] as const;

const FALLBACK_STATS: AdminStats = { totalUsers: 0, totalDrivers: 0, totalRides: 0, rentACar: 0, hotelBookings: 0, flightTickets: 0, totalRevenue: 0 };

function formatNumber(value: number) { return value.toLocaleString(); }

function CountUp({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const duration = 1200;
    const id = setInterval(() => {
      const progress = Math.min((Date.now() - start) / duration, 1);
      setShown(progress >= 1 ? value : Math.floor(value * (0.2 + 0.8 * progress)));
      if (progress >= 1) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [value]);
  return <Text style={styles.metricValue}>{formatNumber(shown)}{suffix}</Text>;
}

function MiniBarChart({ data }: { data: DailyPoint[] }) {
  const max = Math.max(...data.map((d) => d.revenue), 1);
  return (
    <View style={styles.chartWrap}>
      {data.map((point) => (
        <View key={point.day} style={styles.chartCol}>
          <View style={styles.chartBarWrap}>
            <View style={[styles.chartBar, { height: `${Math.max((point.revenue / max) * 100, 8)}%` }]} />
          </View>
          <Text style={styles.chartLabel}>{point.day}</Text>
        </View>
      ))}
    </View>
  );
}

export default function AdminOverviewScreen() {
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<AdminStats>(FALLBACK_STATS);
  const [series, setSeries] = useState<DailyPoint[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const topPad = insets.top + (Platform.OS === "web" ? 60 : 14);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const [statsRes, revenueRes, activityRes] = await Promise.all([
          fetch(`${API_BASE}/api/otc/admin/overview`),
          fetch(`${API_BASE}/api/otc/admin/revenue`),
          fetch(`${API_BASE}/api/otc/admin/activity`),
        ]);
        const statsJson = await statsRes.json().catch(() => ({ stats: FALLBACK_STATS }));
        const revenueJson = await revenueRes.json().catch(() => ({ days: [] }));
        const activityJson = await activityRes.json().catch(() => ({ items: [] }));
        if (!alive) return;
        setStats(statsJson.stats ?? FALLBACK_STATS);
        setSeries(revenueJson.days ?? []);
        setActivity(activityJson.items ?? []);
      } catch {
        if (alive) { setStats(FALLBACK_STATS); setSeries([]); setActivity([]); }
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, []);

  const metrics = useMemo(() => METRICS.map((m) => ({ ...m, value: stats[m.key] })), [stats]);

  return (
    <View style={styles.root}>
      <AdminSidebar activeKey="overview" topPad={topPad} />
      <ScrollView
        style={styles.main}
        contentContainerStyle={{ paddingTop: topPad, paddingBottom: insets.bottom + 28 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.kicker}>Leadership Overview</Text>
            <Text style={styles.title}>Command Center</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={GOLD} />
            <Text style={styles.loadingText}>Loading live data…</Text>
          </View>
        ) : (
          <>
            <View style={styles.statsGrid}>
              {metrics.map((metric) => (
                <View key={metric.key} style={styles.statCard}>
                  <View style={styles.statTop}>
                    <Feather name={metric.icon as keyof typeof Feather.glyphMap} size={15} color={GOLD} />
                    <Text style={styles.statLabel}>{metric.label}</Text>
                  </View>
                  <CountUp value={metric.value} suffix={metric.key === "totalRevenue" ? " PKR" : ""} />
                </View>
              ))}
            </View>

            <View style={styles.panel}>
              <View style={styles.panelHeader}>
                <Text style={styles.panelTitle}>Daily Revenue</Text>
                <Text style={styles.panelSub}>Last 30 days</Text>
              </View>
              <MiniBarChart data={series} />
            </View>

            <View style={styles.feedPanel}>
              <View style={styles.panelHeader}>
                <Text style={styles.panelTitle}>Recent Activity</Text>
                <Text style={styles.panelSub}>Live feed</Text>
              </View>
              <View style={styles.feedList}>
                {activity.slice(0, 6).map((item) => (
                  <View key={item.id} style={styles.feedItem}>
                    <View style={styles.feedIcon}>
                      <Feather name={item.icon} size={13} color={GOLD} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.feedTitle}>{item.title}</Text>
                      <Text style={styles.feedSub}>{item.subtitle}</Text>
                    </View>
                    <Text style={styles.feedTime}>{item.time}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.quickActionsRow}>
              <TouchableOpacity style={styles.qaCard} onPress={() => router.push("/admin/drivers" as never)}>
                <Feather name="shield" size={20} color={GOLD} />
                <Text style={styles.qaTitle}>Driver Verification</Text>
                <Text style={styles.qaSub}>Review pending applications</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.qaCard} onPress={() => router.push("/admin/rides" as never)}>
                <Feather name="map" size={20} color={GOLD} />
                <Text style={styles.qaTitle}>Ride Ledger</Text>
                <Text style={styles.qaSub}>Live operations view</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: "row", backgroundColor: BG },
  main: { flex: 1 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 18 },
  kicker: { color: GOLD, fontSize: 10, letterSpacing: 2, textTransform: "uppercase" },
  title: { color: "#FFF", fontSize: 26, fontFamily: "Inter_700Bold" },
  loadingBox: { alignItems: "center", gap: 10, padding: 40 },
  loadingText: { color: "#9A9A9A" },
  statsGrid: { paddingHorizontal: 20, flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  statCard: { width: "30%", minWidth: 160, flexGrow: 1, borderWidth: 1, borderColor: GOLD_DIM, borderRadius: 16, padding: 14, backgroundColor: "rgba(255,255,255,0.03)" },
  statTop: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 10 },
  statLabel: { color: "#C0C0C0", fontSize: 11, fontFamily: "Inter_500Medium", flex: 1 },
  metricValue: { color: GOLD, fontSize: 24, fontFamily: "Inter_700Bold" },
  panel: { marginHorizontal: 20, marginBottom: 16, borderWidth: 1, borderColor: GOLD_DIM, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.03)", padding: 16 },
  panelHeader: { marginBottom: 12 },
  panelTitle: { color: "#FFF", fontSize: 16, fontFamily: "Inter_700Bold" },
  panelSub: { color: "#8A8A8A", fontSize: 11, marginTop: 3 },
  chartWrap: { height: 160, flexDirection: "row", alignItems: "flex-end", gap: 6 },
  chartCol: { flex: 1, alignItems: "center", gap: 6 },
  chartBarWrap: { width: "100%", flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 8, overflow: "hidden" },
  chartBar: { width: "100%", backgroundColor: GOLD, borderRadius: 8 },
  chartLabel: { color: "#8A8A8A", fontSize: 9 },
  feedPanel: { marginHorizontal: 20, marginBottom: 16, borderWidth: 1, borderColor: GOLD_DIM, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.03)", padding: 16 },
  feedList: { gap: 10 },
  feedItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)" },
  feedIcon: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,215,0,0.08)" },
  feedTitle: { color: "#FFF", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  feedSub: { color: "#9A9A9A", fontSize: 11, marginTop: 1 },
  feedTime: { color: GOLD, fontSize: 10 },
  quickActionsRow: { marginHorizontal: 20, flexDirection: "row", gap: 12, marginBottom: 20 },
  qaCard: { flex: 1, borderWidth: 1, borderColor: GOLD_DIM, borderRadius: 16, padding: 16, backgroundColor: "rgba(255,215,0,0.04)", gap: 6 },
  qaTitle: { color: "#FFF", fontSize: 13, fontFamily: "Inter_700Bold" },
  qaSub: { color: "#888", fontSize: 11 },
});
