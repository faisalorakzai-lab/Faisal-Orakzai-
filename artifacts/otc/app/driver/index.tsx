import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDriverAuth } from "@/contexts/DriverAuthContext";
import { supabase } from "@/lib/supabase";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN ?? "";
const GOLD = "#C9A84C";
const GOLD_BRIGHT = "#FFD700";
const ACCEPT_GREEN = "#30D158";
const DECLINE_RED = "#FF3B30";
const SILVER = "#B0B8C8";
const POLL_MS = 4000;
const TIMER_SECONDS = 30;

type ServiceType = "ride" | "delivery";
type NavIcon = React.ComponentProps<typeof Feather>["name"];
interface PendingRide {
  id: string;
  pickup_address?: string;
  dropoff_address?: string;
  total_fare?: number;
}

function BottomNav({ active }: { active: string }) {
  const items = [
    { key: "home", label: "Home", icon: "home" },
    { key: "bids", label: "Bids", icon: "zap" },
    { key: "earnings", label: "Earnings", icon: "dollar-sign" },
    { key: "withdraw", label: "Withdraw", icon: "arrow-up-circle" },
  ] as const;
  return (
    <View style={navStyles.wrap}>
      {items.map((item) => {
        const on = active === item.key;
        function handleNav() {
          if (item.key === "bids") router.push("/driver/bids" as never);
          else if (item.key === "earnings") router.push("/driver/earnings" as never);
          else if (item.key === "withdraw") router.push("/driver/withdraw" as never);
          else router.push("/driver" as never);
        }
        return (
          <TouchableOpacity key={item.key} style={navStyles.item} activeOpacity={0.8} onPress={handleNav}>
            <Feather name={item.icon as NavIcon} size={18} color={on ? GOLD_BRIGHT : "#666666"} />
            <Text style={[navStyles.label, { color: on ? GOLD_BRIGHT : "#666666" }]}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const navStyles = StyleSheet.create({
  wrap: { flexDirection: "row", justifyContent: "space-around", alignItems: "center", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)", paddingTop: 14, paddingBottom: 8, backgroundColor: "#000000" },
  item: { alignItems: "center", gap: 5 },
  label: { fontSize: 10, fontFamily: "Inter_500Medium" },
});

export default function DriverHome() {
  const insets = useSafeAreaInsets();
  const { driver, token, logout, setDriverOnline } = useDriverAuth();
  const [isOnline, setIsOnline] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [prefersRide, setPrefersRide] = useState(true);
  const [prefersDelivery, setPrefersDelivery] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [todayEarned, setTodayEarned] = useState(0);
  const [todayTrips, setTodayTrips] = useState(0);
  const [pendingRide, setPendingRide] = useState<PendingRide | null>(null);
  const [showRequest, setShowRequest] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const [serviceMode, setServiceMode] = useState<"silent" | "business" | "social">("business");
  const [trunkLiters, setTrunkLiters] = useState(42);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 16);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingRideRef = useRef<PendingRide | null>(null);
  pendingRideRef.current = pendingRide;

  const openRideRequest = useCallback((ride: PendingRide) => {
    setPendingRide(ride);
    setShowRequest(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }, []);

  const fetchLatestSearchingRide = useCallback(async () => {
    if (!token) return;
    const res = await fetch(`${API_BASE}/api/otc/driver/requests/searching`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return;
    const data = await res.json() as { ride?: PendingRide };
    if (data.ride && !pendingRideRef.current) openRideRequest(data.ride);
  }, [token, openRideRequest]);

  useEffect(() => {
    if (!isOnline) { if (pollRef.current) clearInterval(pollRef.current); return; }
    fetchLatestSearchingRide();
    pollRef.current = setInterval(fetchLatestSearchingRide, POLL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [isOnline, fetchLatestSearchingRide]);

  async function toggleOnline() {
    if (!token || toggling) return;
    setToggling(true);
    const next = !isOnline;
    try {
      const res = await fetch(`${API_BASE}/api/otc/driver/toggle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_online: next }),
      });
      if (res.ok) { setIsOnline(next); setDriverOnline(next, token); }
    } catch {}
    setToggling(false);
  }

  async function updatePreferences(ride: boolean, delivery: boolean) {
    if (!token || savingPrefs) return;
    setSavingPrefs(true);
    try {
      await fetch(`${API_BASE}/api/otc/driver/preferences`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prefers_ride: ride, prefers_delivery: delivery }),
      });
    } catch {}
    setSavingPrefs(false);
  }

  async function handleAccept() {
    if (!pendingRide || !token) return;
    setShowRequest(false);
    try {
      await fetch(`${API_BASE}/api/otc/driver/request/${pendingRide.id}/respond`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "accept" }),
      });
      setTodayTrips((p) => p + 1);
      setTodayEarned((p) => p + (pendingRide.total_fare ?? 0));
      await fetch(`${API_BASE}/api/otc/ride/${pendingRide.id}/trunk-space`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ available_liters: trunkLiters }) });
      await fetch(`${API_BASE}/api/otc/ride/${pendingRide.id}/service-mode`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ service_mode: serviceMode }) });
    } catch {}
    setPendingRide(null);
  }

  async function handleReject() {
    if (!pendingRide || !token) return;
    setShowRequest(false);
    try {
      await fetch(`${API_BASE}/api/otc/driver/request/${pendingRide.id}/respond`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "decline" }),
      });
    } catch {}
    setPendingRide(null);
  }

  if (!driver) return null;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: topPad, paddingBottom: insets.bottom + 20 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.greeting}>{isOnline ? "Searching for requests" : "You are currently invisible"}</Text>
            <Text style={styles.driverName}>{driver.name}</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={() => logout().then(() => router.replace("/driver/login"))} activeOpacity={0.8}><Feather name="log-out" size={15} color="#888888" /></TouchableOpacity>
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickActionBtn} onPress={() => router.push("/driver/bids" as never)}>
            <Feather name="zap" size={16} color={GOLD_BRIGHT} /><Text style={styles.quickActionText}>Open Bids</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.prefsSection}>
          <Text style={styles.prefsTitle}>Service Modes</Text>
          <View style={styles.modeBox}>
            <TouchableOpacity onPress={() => setServiceMode("silent")} style={[styles.modeChip, serviceMode === "silent" && styles.modeChipOn]}><Text style={styles.modeText}>Silent</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setServiceMode("business")} style={[styles.modeChip, serviceMode === "business" && styles.modeChipOn]}><Text style={styles.modeText}>Business</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setServiceMode("social")} style={[styles.modeChip, serviceMode === "social" && styles.modeChipOn]}><Text style={styles.modeText}>Social</Text></TouchableOpacity>
          </View>
        </View>

        <View style={styles.prefsSection}>
          <Text style={styles.prefsTitle}>Shared Space</Text>
          <TouchableOpacity style={styles.sharedBox} onPress={() => setTrunkLiters((v) => (v > 0 ? 0 : 42))}>
            <Text style={styles.sharedTitle}>{trunkLiters > 0 ? "Mini-delivery enabled" : "Enable trunk space"}</Text>
            <Text style={styles.sharedSub}>{trunkLiters > 0 ? `${trunkLiters}L available for shared-space logistics` : "Turn on trunk space to list mini-delivery options"}</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.toggleSection, { marginBottom: 20 }] }>
          <TouchableOpacity style={[styles.bigToggle, { backgroundColor: isOnline ? GOLD : "#141414" }]} onPress={toggleOnline} disabled={toggling} activeOpacity={0.88}>
            {toggling ? <ActivityIndicator color={isOnline ? "#050505" : GOLD} size="large" /> : <><Feather name={isOnline ? "radio" : "power"} size={36} color={isOnline ? "#050505" : "#444444"} /><Text style={[styles.bigToggleLabel, { color: isOnline ? "#050505" : "#555555" }]}>{isOnline ? "GO OFFLINE" : "GO ONLINE"}</Text></>}
          </TouchableOpacity>
        </View>
      </ScrollView>
      <BottomNav active={activeTab} />
      {showRequest && pendingRide && (
        <Modal transparent animationType="slide" visible={showRequest} onRequestClose={handleReject}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>New Ride Request</Text>
              <Text style={styles.modalSub}>{pendingRide.pickup_address} → {pendingRide.dropoff_address}</Text>
              <View style={styles.modalRow}><Text style={styles.modalLabel}>Trunk</Text><Text style={styles.modalValue}>{trunkLiters}L</Text></View>
              <View style={styles.modalRow}><Text style={styles.modalLabel}>Mode</Text><Text style={styles.modalValue}>{serviceMode}</Text></View>
              <View style={styles.modalButtons}><TouchableOpacity onPress={handleReject} style={styles.rejectBtn}><Text style={styles.rejectText}>Decline</Text></TouchableOpacity><TouchableOpacity onPress={handleAccept} style={styles.acceptBtn}><Text style={styles.acceptText}>Accept</Text></TouchableOpacity></View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000000" },
  scroll: { paddingHorizontal: 20 },
  topBar: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 },
  greeting: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#888888" },
  driverName: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  logoutBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center", borderColor: "rgba(255,255,255,0.1)" },
  quickActions: { marginBottom: 16 },
  quickActionBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,215,0,0.08)", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "rgba(255,215,0,0.2)" },
  quickActionText: { color: GOLD_BRIGHT, fontFamily: "Inter_700Bold" },
  prefsSection: { marginBottom: 16 },
  prefsTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFFFFF", marginBottom: 8 },
  modeBox: { flexDirection: "row", gap: 10 },
  modeChip: { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", backgroundColor: "#0D0D0D" },
  modeChipOn: { backgroundColor: "rgba(255,215,0,0.12)", borderColor: "rgba(255,215,0,0.35)" },
  modeText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 12 },
  sharedBox: { borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,215,0,0.18)", backgroundColor: "#111", padding: 14 },
  sharedTitle: { color: GOLD_BRIGHT, fontFamily: "Inter_700Bold", fontSize: 13 },
  sharedSub: { color: "#666", fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 4 },
  toggleSection: { alignItems: "center", gap: 18 },
  bigToggle: { width: 190, height: 190, borderRadius: 95, borderWidth: 2, alignItems: "center", justifyContent: "center", gap: 8 },
  bigToggleLabel: { fontSize: 14, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#111", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, borderTopWidth: 1, borderColor: "rgba(255,215,0,0.2)" },
  modalTitle: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 18 },
  modalSub: { color: "#888", fontFamily: "Inter_400Regular", marginTop: 6, marginBottom: 14 },
  modalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  modalLabel: { color: "#666", fontFamily: "Inter_400Regular" },
  modalValue: { color: GOLD_BRIGHT, fontFamily: "Inter_700Bold" },
  modalButtons: { flexDirection: "row", gap: 10, marginTop: 12 },
  rejectBtn: { flex: 1, height: 52, borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,90,90,0.3)", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,90,90,0.06)" },
  acceptBtn: { flex: 1, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: GOLD_BRIGHT },
  rejectText: { color: "#FF5A5F", fontFamily: "Inter_700Bold" },
  acceptText: { color: "#000", fontFamily: "Inter_700Bold" },
});
