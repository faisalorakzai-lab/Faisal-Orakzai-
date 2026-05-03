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

const NAV_ITEMS = [
  { key: "users", label: "Users", icon: "users" },
  { key: "drivers", label: "Drivers", icon: "navigation-2" },
  { key: "rides", label: "Rides", icon: "map" },
  { key: "rentals", label: "Rentals", icon: "key" },
  { key: "hotels", label: "Hotels", icon: "home" },
  { key: "flights", label: "Flights", icon: "send" },
  { key: "financials", label: "Financials", icon: "dollar-sign" },
] as const;

const METRICS = [
  { key: "totalUsers", label: "Total Users", icon: "users" },
  { key: "totalDrivers", label: "Total Drivers", icon: "navigation-2" },
  { key: "totalRides", label: "Total Rides", icon: "map" },
  { key: "rentACar", label: "Rent-A-Car", icon: "key" },
  { key: "hotelBookings", label: "Hotel Bookings", icon: "home" },
  { key: "flightTickets", label: "Flight Tickets", icon: "send" },
  { key: "totalRevenue", label: "Total Revenue", icon: "dollar-sign" },
] as const;

const FALLBACK_STATS: AdminStats = {
  totalUsers: 0,
  totalDrivers: 0,
  totalRides: 0,
  rentACar: 0,
  hotelBookings: 0,
  flightTickets: 0,
  totalRevenue: 0,
};

function formatNumber(value: number) {
  return value.toLocaleString();
}

function CountUp({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const duration = 1200;
    const id = setInterval(() => {
      const progress = Math.min((Date.now() - start) / duration, 1);
      const next = Math.floor(value * (0.2 + 0.8 * progress));
      setShown(progress >= 1 ? value : next);
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
        const statsJson = await statsRes.json().catch(() => FALLBACK_STATS);
        const revenueJson = await revenueRes.json().catch(() => ({ days: [] as DailyPoint[] }));
        const activityJson = await activityRes.json().catch(() => ({ items: [] as ActivityItem[] }));
        if (!alive) return;
        setStats(statsJson.stats ?? FALLBACK_STATS);
        setSeries(revenueJson.days ?? []);
        setActivity(activityJson.items ?? []);
      } catch {
        if (alive) {
          setStats(FALLBACK_STATS);
          setSeries([]);
          setActivity([]);
        }
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, []);

  const metrics = useMemo(() => METRICS.map((metric) => ({ ...metric, value: stats[metric.key] })), [stats]);

  return (
    <View style={styles.root}>
      <View style={[styles.sidebar, { paddingTop: topPad }]}> 
        <Text style={styles.brand}>ORAKZAI</Text>
        <Text style={styles.brandSub}>Command Center</Text>
        {NAV_ITEMS.map((item) => (
          <TouchableOpacity key={item.key} style={styles.navItem} onPress={() => {}} activeOpacity={0.8}>
            <Feather name={item.icon} size={16} color={GOLD} />
            <Text style={styles.navText}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.main}
        contentContainerStyle={{ paddingTop: topPad, paddingBottom: insets.bottom + 28 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.kicker}>Leadership Overview</Text>
            <Text style={styles.title}>Main Admin Dashboard</Text>
          </View>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={16} color={GOLD} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingBox}><ActivityIndicator color={GOLD} /><Text style={styles.loadingText}>Loading live data…</Text></View>
        ) : (
          <>
            <View style={styles.statsGrid}>
              {metrics.map((metric) => (
                <View key={metric.key} style={styles.statCard}>
                  <View style={styles.statTop}>
                    <Feather name={metric.icon} size={16} color={GOLD} />
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
                {activity.slice(0, 5).map((item) => (
                  <View key={item.id} style={styles.feedItem}>
                    <View style={styles.feedIcon}><Feather name={item.icon} size={14} color={GOLD} /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.feedTitle}>{item.title}</Text>
                      <Text style={styles.feedSub}>{item.subtitle}</Text>
                    </View>
                    <Text style={styles.feedTime}>{item.time}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: "row", backgroundColor: BG },
  sidebar: { width: 220, borderRightWidth: 1, borderRightColor: "rgba(255,215,0,0.12)", paddingHorizontal: 16, backgroundColor: "#080808", gap: 12 },
  brand: { color: GOLD, fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  brandSub: { color: "#8A8A8A", fontSize: 11, textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 },
  navItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,215,0,0.08)", backgroundColor: "rgba(255,255,255,0.02)" },
  navText: { color: "#F5F5F5", fontSize: 13, fontFamily: "Inter_500Medium" },
  main: { flex: 1 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 18 },
  kicker: { color: GOLD, fontSize: 11, letterSpacing: 2, textTransform: "uppercase" },
  title: { color: "#FFF", fontSize: 28, fontFamily: "Inter_700Bold" },
  backBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: GOLD_DIM, alignItems: "center", justifyContent: "center" },
  loadingBox: { alignItems: "center", gap: 10, padding: 40 },
  loadingText: { color: "#9A9A9A" },
  statsGrid: { paddingHorizontal: 20, flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 18 },
  statCard: { width: "31%", minWidth: 180, flexGrow: 1, borderWidth: 1, borderColor: GOLD_DIM, borderRadius: 18, padding: 16, backgroundColor: "rgba(255,255,255,0.03)" },
  statTop: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  statLabel: { color: "#D0D0D0", fontSize: 12, fontFamily: "Inter_500Medium" },
  metricValue: { color: GOLD, fontSize: 28, fontFamily: "Inter_700Bold" },
  panel: { marginHorizontal: 20, marginBottom: 18, borderWidth: 1, borderColor: GOLD_DIM, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.03)", padding: 16 },
  panelHeader: { marginBottom: 14 },
  panelTitle: { color: "#FFF", fontSize: 18, fontFamily: "Inter_700Bold" },
  panelSub: { color: "#8A8A8A", fontSize: 12, marginTop: 4 },
  chartWrap: { height: 180, flexDirection: "row", alignItems: "flex-end", gap: 8 },
  chartCol: { flex: 1, alignItems: "center", gap: 8 },
  chartBarWrap: { width: "100%", flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 10, overflow: "hidden" },
  chartBar: { width: "100%", backgroundColor: GOLD, borderRadius: 10 },
  chartLabel: { color: "#8A8A8A", fontSize: 10 },
  feedPanel: { marginHorizontal: 20, borderWidth: 1, borderColor: GOLD_DIM, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.03)", padding: 16 },
  feedList: { gap: 12 },
  feedItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" },
  feedIcon: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,215,0,0.08)" },
  feedTitle: { color: "#FFF", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  feedSub: { color: "#9A9A9A", fontSize: 12, marginTop: 2 },
  feedTime: { color: GOLD, fontSize: 11 },
});
