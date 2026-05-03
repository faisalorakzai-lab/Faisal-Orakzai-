import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDriverAuth } from "@/contexts/DriverAuthContext";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN ?? "";
const GOLD = "#FFD700";
const GOLD_DIM = "#C9A84C";
const RED = "#FF5A5F";
const GREEN = "#30D158";
const EARNINGS_KEY = "@otc/driver_earnings";

export interface EarningEntry {
  id: string;
  ride_id: string;
  total_fare: number;
  commission_rate: number;
  commission_amount: number;
  net_earnings: number;
  payment_method: string;
  is_cash_debt_paid: boolean;
  settled_at: string;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-PK", { day: "numeric", month: "short" }) +
    " · " + d.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" });
}

function isSameDay(iso: string, ref: Date) {
  const d = new Date(iso);
  return d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate();
}

function TodaySummary({ entries }: { entries: EarningEntry[] }) {
  const today = new Date();
  const todayEntries = entries.filter(e => isSameDay(e.settled_at, today));
  const totalFare = todayEntries.reduce((s, e) => s + e.total_fare, 0);
  const totalCommission = todayEntries.reduce((s, e) => s + e.commission_amount, 0);
  const netEarnings = todayEntries.reduce((s, e) => s + e.net_earnings, 0);
  const cashDebt = todayEntries
    .filter(e => e.payment_method === "cash" && !e.is_cash_debt_paid)
    .reduce((s, e) => s + e.commission_amount, 0);

  return (
    <View style={todayStyles.card}>
      <Text style={todayStyles.cardTitle}>TODAY'S SUMMARY</Text>
      <View style={todayStyles.bigRow}>
        <View style={todayStyles.bigStat}>
          <Text style={todayStyles.bigLabel}>Gross</Text>
          <Text style={todayStyles.bigValue}>PKR {totalFare.toLocaleString()}</Text>
        </View>
        <View style={todayStyles.sep} />
        <View style={todayStyles.bigStat}>
          <Text style={todayStyles.bigLabel}>Commission</Text>
          <Text style={[todayStyles.bigValue, { color: RED }]}>-{totalCommission.toLocaleString()}</Text>
        </View>
        <View style={todayStyles.sep} />
        <View style={todayStyles.bigStat}>
          <Text style={todayStyles.bigLabel}>Net</Text>
          <Text style={[todayStyles.bigValue, { color: GOLD }]}>{netEarnings.toLocaleString()}</Text>
        </View>
      </View>
      {cashDebt > 0 && (
        <View style={todayStyles.debtBanner}>
          <Feather name="alert-triangle" size={13} color="#FF9500" />
          <Text style={todayStyles.debtText}>
            Cash owed to OTC: <Text style={{ color: "#FF9500", fontFamily: "Inter_700Bold" }}>PKR {cashDebt.toLocaleString()}</Text>
          </Text>
        </View>
      )}
      <View style={todayStyles.tripsRow}>
        <Feather name="navigation" size={12} color={GOLD_DIM} />
        <Text style={todayStyles.tripsText}>{todayEntries.length} ride{todayEntries.length !== 1 ? "s" : ""} today</Text>
      </View>
    </View>
  );
}

const todayStyles = StyleSheet.create({
  card: { backgroundColor: "#0C0C0C", borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,215,0,0.18)", padding: 20, gap: 14, marginBottom: 20 },
  cardTitle: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#555", letterSpacing: 1.5, textTransform: "uppercase" },
  bigRow: { flexDirection: "row", alignItems: "center" },
  bigStat: { flex: 1, alignItems: "center", gap: 4 },
  bigLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#666", letterSpacing: 0.5 },
  bigValue: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff" },
  sep: { width: 1, height: 40, backgroundColor: "rgba(255,215,0,0.1)" },
  debtBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,149,0,0.08)", borderRadius: 10, padding: 10, borderWidth: 1, borderColor: "rgba(255,149,0,0.25)" },
  debtText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#aaa", flex: 1 },
  tripsRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  tripsText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#555" },
});

function EarningRow({ item }: { item: EarningEntry }) {
  const isCash = item.payment_method === "cash";
  const methodColor = isCash ? GREEN : GOLD;
  const methodIcon = isCash ? "dollar-sign" : "credit-card";

  return (
    <View style={rowStyles.card}>
      <View style={rowStyles.top}>
        <View style={rowStyles.leftCol}>
          <View style={rowStyles.iconWrap}>
            <Feather name={methodIcon} size={16} color={methodColor} />
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={rowStyles.fareText}>PKR {item.total_fare.toLocaleString()}</Text>
            <Text style={rowStyles.dateText}>{formatDate(item.settled_at)}</Text>
          </View>
        </View>
        <View style={[rowStyles.methodBadge, { borderColor: methodColor + "44" }]}>
          <Text style={[rowStyles.methodText, { color: methodColor }]}>
            {isCash ? "CASH" : "WALLET"}
          </Text>
        </View>
      </View>

      <View style={rowStyles.divider} />

      <View style={rowStyles.breakdown}>
        <View style={rowStyles.breakdownRow}>
          <Text style={rowStyles.bLabel}>Commission ({Math.round(item.commission_rate * 100)}%)</Text>
          <Text style={rowStyles.bDeduct}>- PKR {item.commission_amount.toLocaleString()}</Text>
        </View>
        <View style={rowStyles.breakdownRow}>
          <Text style={rowStyles.bLabel}>Net earnings</Text>
          <Text style={rowStyles.bNet}>PKR {item.net_earnings.toLocaleString()}</Text>
        </View>
        {isCash && (
          <View style={rowStyles.breakdownRow}>
            <Text style={rowStyles.bLabel}>Commission owed</Text>
            <View style={rowStyles.debtBadge}>
              <Text style={rowStyles.debtText}>
                {item.is_cash_debt_paid ? "PAID" : "PENDING"}
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  card: { backgroundColor: "#0A0A0A", borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", padding: 16, gap: 12 },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  leftCol: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  iconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.05)", alignItems: "center", justifyContent: "center" },
  fareText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
  dateText: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#555" },
  methodBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  methodText: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.04)" },
  breakdown: { gap: 8 },
  breakdownRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  bLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#555" },
  bDeduct: { fontSize: 13, fontFamily: "Inter_700Bold", color: RED },
  bNet: { fontSize: 13, fontFamily: "Inter_700Bold", color: GOLD },
  debtBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: "rgba(255,149,0,0.1)", borderWidth: 1, borderColor: "rgba(255,149,0,0.3)" },
  debtText: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#FF9500", letterSpacing: 0.8 },
});

export default function DriverEarningsScreen() {
  const insets = useSafeAreaInsets();
  const { token, driver } = useDriverAuth();
  const [entries, setEntries] = useState<EarningEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 16);

  const loadEarnings = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    try {
      if (token) {
        const res = await fetch(`${API_BASE}/api/otc/driver/earnings`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json() as { earnings?: EarningEntry[] };
          const list = data.earnings ?? [];
          setEntries(list);
          await AsyncStorage.setItem(EARNINGS_KEY + "_" + (driver?.id ?? ""), JSON.stringify(list));
          return;
        }
      }
    } catch { /* fall through to cache */ }
    try {
      const cached = await AsyncStorage.getItem(EARNINGS_KEY + "_" + (driver?.id ?? ""));
      if (cached) setEntries(JSON.parse(cached) as EarningEntry[]);
    } catch { /* ignore */ }
    setIsLoading(false);
    setIsRefreshing(false);
  }, [token, driver?.id]);

  useEffect(() => {
    loadEarnings().finally(() => { setIsLoading(false); setIsRefreshing(false); });
  }, [loadEarnings]);

  if (!driver) {
    router.replace("/driver/login");
    return null;
  }

  const allTimeNet = entries.reduce((s, e) => s + e.net_earnings, 0);
  const totalCommission = entries.reduce((s, e) => s + e.commission_amount, 0);

  return (
    <View style={styles.root}>
      <FlatList
        data={entries}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => <EarningRow item={item} />}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadEarnings(true).finally(() => setIsRefreshing(false))}
            tintColor={GOLD}
          />
        }
        contentContainerStyle={[styles.scroll, { paddingTop: topPad, paddingBottom: insets.bottom + 100 }]}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <TouchableOpacity style={styles.backBtn} onPress={() => router.push("/driver" as never)} activeOpacity={0.8}>
                <Feather name="arrow-left" size={20} color={GOLD} />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={styles.screenTitle}>Earnings</Text>
                <Text style={styles.screenSub}>{driver.name}</Text>
              </View>
              <View style={styles.allTimeChip}>
                <Text style={styles.allTimeLabel}>ALL TIME</Text>
                <Text style={styles.allTimeValue}>PKR {allTimeNet.toLocaleString()}</Text>
              </View>
            </View>

            {entries.length > 0 && <TodaySummary entries={entries} />}

            {entries.length > 0 && (
              <View style={styles.allTimeRow}>
                <View style={styles.allTimeStat}>
                  <Text style={styles.allTimeStatLabel}>Total earned</Text>
                  <Text style={[styles.allTimeStatValue, { color: GOLD }]}>PKR {allTimeNet.toLocaleString()}</Text>
                </View>
                <View style={styles.allTimeStat}>
                  <Text style={styles.allTimeStatLabel}>Commission paid</Text>
                  <Text style={[styles.allTimeStatValue, { color: RED }]}>PKR {totalCommission.toLocaleString()}</Text>
                </View>
                <View style={styles.allTimeStat}>
                  <Text style={styles.allTimeStatLabel}>Rides</Text>
                  <Text style={styles.allTimeStatValue}>{entries.length}</Text>
                </View>
              </View>
            )}

            <Text style={styles.sectionTitle}>RIDE LEDGER</Text>

            {isLoading && (
              <ActivityIndicator color={GOLD} style={{ marginVertical: 40 }} />
            )}
          </>
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Feather name="dollar-sign" size={44} color="#333" />
              <Text style={styles.emptyTitle}>No earnings yet</Text>
              <Text style={styles.emptySub}>Complete rides to see your commission ledger</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  scroll: { paddingHorizontal: 20 },
  header: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#0D0D0D", borderWidth: 1, borderColor: "rgba(255,215,0,0.2)", alignItems: "center", justifyContent: "center" },
  screenTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff" },
  screenSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#555", marginTop: 2 },
  allTimeChip: { alignItems: "flex-end", gap: 2 },
  allTimeLabel: { fontSize: 8, fontFamily: "Inter_700Bold", color: "#444", letterSpacing: 1.2, textTransform: "uppercase" },
  allTimeValue: { fontSize: 15, fontFamily: "Inter_700Bold", color: GOLD },
  allTimeRow: { flexDirection: "row", backgroundColor: "#0A0A0A", borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)", padding: 16, marginBottom: 20, gap: 4 },
  allTimeStat: { flex: 1, alignItems: "center", gap: 4 },
  allTimeStatLabel: { fontSize: 9, fontFamily: "Inter_400Regular", color: "#444", letterSpacing: 0.5 },
  allTimeStatValue: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
  sectionTitle: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#444", letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 12 },
  empty: { alignItems: "center", gap: 10, paddingTop: 60 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: "#fff", marginTop: 6 },
  emptySub: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#444", textAlign: "center" },
});
