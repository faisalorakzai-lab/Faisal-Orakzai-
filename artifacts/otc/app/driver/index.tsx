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

type PendingRide = {
  id: string;
  pickup_address: string;
  dropoff_address: string;
  total_fare: number;
  distance_km: number;
  ride_type: string;
  payment_method: string;
  driver_id?: string | null;
  service_type?: ServiceType;
  package_type?: string;
  receiver_name?: string;
  receiver_contact?: string;
};

function useLoopingPulse(active: boolean) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active) { pulse.stopAnimation(); pulse.setValue(0); return; }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1100, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
        Animated.timing(pulse, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [active, pulse]);
  return pulse;
}

function CircularCountdown({ seconds, isDelivery }: { seconds: number; isDelivery?: boolean }) {
  const accentColor = isDelivery ? SILVER : GOLD_BRIGHT;
  const color = seconds > 15 ? ACCEPT_GREEN : seconds > 8 ? (isDelivery ? SILVER : GOLD) : DECLINE_RED;
  const dashScale = 1 - seconds / TIMER_SECONDS;
  return (
    <View style={circleStyles.wrap}>
      <View style={circleStyles.track} />
      <View style={[circleStyles.progress, { borderColor: color, transform: [{ rotate: `${dashScale * 360}deg` }] }]} />
      <View style={circleStyles.inner}>
        <Text style={[circleStyles.seconds, { color }]}>{seconds}</Text>
        <Text style={circleStyles.label}>SEC</Text>
      </View>
    </View>
  );
}

const circleStyles = StyleSheet.create({
  wrap: { width: 110, height: 110, alignItems: "center", justifyContent: "center" },
  track: { position: "absolute", width: 86, height: 86, borderRadius: 43, borderWidth: 6, borderColor: "rgba(255,255,255,0.08)" },
  progress: { position: "absolute", width: 86, height: 86, borderRadius: 43, borderWidth: 6, borderColor: GOLD, borderRightColor: "transparent", borderBottomColor: "transparent" },
  inner: { position: "absolute", width: 78, height: 78, borderRadius: 39, alignItems: "center", justifyContent: "center", backgroundColor: "#090909" },
  seconds: { fontSize: 22, fontFamily: "Inter_700Bold" },
  label: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#8A8A8A", letterSpacing: 1.4 },
});

function RidePing({ color = GOLD }: { color?: string }) {
  const pulse = useLoopingPulse(true);
  return (
    <View style={pingStyles.wrap}>
      <Animated.View style={[pingStyles.ring, { backgroundColor: color, opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.7] }) }] }]} />
      <View style={[pingStyles.dot, { backgroundColor: color }]} />
    </View>
  );
}

const pingStyles = StyleSheet.create({
  wrap: { width: 18, height: 18, alignItems: "center", justifyContent: "center" },
  ring: { position: "absolute", width: 18, height: 18, borderRadius: 9 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});

function RideRequestOverlay({ ride, visible, onAccept, onReject }: {
  ride: PendingRide | null; visible: boolean; onAccept: () => void; onReject: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [seconds, setSeconds] = useState(TIMER_SECONDS);
  const slideY = useRef(new Animated.Value(500)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isDelivery = ride?.service_type === "delivery";
  const accentColor = isDelivery ? SILVER : GOLD_BRIGHT;
  const accentDim = isDelivery ? "rgba(176,184,200,0.25)" : "rgba(255,215,0,0.18)";
  const headerTitle = isDelivery ? "New Delivery Request!" : "New Ride Request!";

  useEffect(() => {
    if (!visible || !ride) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      Animated.timing(slideY, { toValue: 500, duration: 220, useNativeDriver: true }).start();
      return;
    }
    setSeconds(TIMER_SECONDS);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Animated.spring(slideY, { toValue: 0, useNativeDriver: true, speed: 15, bounciness: 5 }).start();
    intervalRef.current = setInterval(() => {
      setSeconds((current) => {
        if (current <= 1) { onReject(); return 0; }
        if (current === 15) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (current <= 5) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        return current - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [visible, ride, slideY, onReject]);

  if (!ride) return null;

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={overlayStyles.backdrop}>
        <Animated.View style={[
          overlayStyles.sheet,
          { transform: [{ translateY: slideY }], paddingBottom: insets.bottom + 20, borderColor: accentDim },
        ]}>
          <View style={overlayStyles.headerRow}>
            <View style={overlayStyles.headerTitleWrap}>
              <RidePing color={isDelivery ? SILVER : GOLD_BRIGHT} />
              <Text style={overlayStyles.headerTitle}>{headerTitle}</Text>
            </View>
            <View style={[overlayStyles.typePill, { backgroundColor: isDelivery ? "rgba(176,184,200,0.12)" : "rgba(255,215,0,0.12)", borderColor: isDelivery ? "rgba(176,184,200,0.3)" : "rgba(255,215,0,0.3)" }]}>
              <Feather name={isDelivery ? "package" : "navigation"} size={11} color={accentColor} />
              <Text style={[overlayStyles.typePillText, { color: accentColor }]}>{isDelivery ? "DELIVERY" : "RIDE"}</Text>
            </View>
            <TouchableOpacity style={overlayStyles.rejectCorner} onPress={onReject} activeOpacity={0.8}>
              <Feather name="x" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={[overlayStyles.headerGlow, { backgroundColor: isDelivery ? "rgba(176,184,200,0.35)" : "rgba(255,215,0,0.5)" }]} />

          <View style={overlayStyles.routeCard}>
            <View style={overlayStyles.routeRow}>
              <Feather name="map-pin" size={15} color={accentColor} />
              <View style={{ flex: 1 }}>
                <Text style={overlayStyles.routeLabel}>{isDelivery ? "Pickup / Sender" : "Pickup"}</Text>
                <Text style={overlayStyles.routeText} numberOfLines={2}>{ride.pickup_address}</Text>
              </View>
            </View>
            <View style={overlayStyles.routeDivider} />
            <View style={overlayStyles.routeRow}>
              <Feather name={isDelivery ? "package" : "navigation"} size={15} color="#FFFFFF" />
              <View style={{ flex: 1 }}>
                <Text style={overlayStyles.routeLabel}>{isDelivery ? "Drop-off / Receiver" : "Drop"}</Text>
                <Text style={overlayStyles.routeText} numberOfLines={2}>{ride.dropoff_address}</Text>
              </View>
            </View>
          </View>

          {/* Delivery-specific: package info */}
          {isDelivery && (
            <View style={overlayStyles.deliveryCard}>
              <View style={overlayStyles.deliveryRow}>
                <Feather name="box" size={14} color={SILVER} />
                <Text style={overlayStyles.deliveryLabel}>Package Type</Text>
                <Text style={overlayStyles.deliveryVal}>{ride.package_type ?? "Standard Parcel"}</Text>
              </View>
              {(ride.receiver_name || ride.receiver_contact) && (
                <View style={overlayStyles.deliveryRow}>
                  <Feather name="user" size={14} color={SILVER} />
                  <Text style={overlayStyles.deliveryLabel}>Receiver</Text>
                  <Text style={overlayStyles.deliveryVal}>{ride.receiver_name ?? ""}{ride.receiver_contact ? ` · ${ride.receiver_contact}` : ""}</Text>
                </View>
              )}
            </View>
          )}

          <View style={[overlayStyles.moneyCard, { backgroundColor: isDelivery ? "rgba(176,184,200,0.07)" : "rgba(255,215,0,0.1)", borderColor: isDelivery ? "rgba(176,184,200,0.2)" : "rgba(255,215,0,0.3)" }]}>
            <Text style={[overlayStyles.moneyLabel, { color: accentColor }]}>Fare</Text>
            <Text style={[overlayStyles.moneyValue, { color: accentColor }]}>{ride.total_fare.toLocaleString()} PKR</Text>
          </View>

          <View style={overlayStyles.metaRow}>
            <View style={overlayStyles.metaBox}>
              <Text style={overlayStyles.metaLabel}>Distance</Text>
              <Text style={overlayStyles.metaValue}>{ride.distance_km.toFixed(1)} km</Text>
            </View>
            <CircularCountdown seconds={seconds} isDelivery={isDelivery} />
          </View>

          <TouchableOpacity style={[overlayStyles.acceptBtn, { backgroundColor: accentColor, shadowColor: accentColor }]} onPress={onAccept} activeOpacity={0.9}>
            <Text style={overlayStyles.acceptBtnText}>{isDelivery ? "ACCEPT DELIVERY" : "ACCEPT"}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={overlayStyles.rejectBtn} onPress={onReject} activeOpacity={0.8}>
            <Text style={overlayStyles.rejectBtnText}>Pass</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const overlayStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.88)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#050505", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, gap: 14, borderWidth: 1 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitleWrap: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  headerTitle: { color: "#FFFFFF", fontSize: 20, fontFamily: "Inter_700Bold", flex: 1 },
  typePill: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 20, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
  typePillText: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  rejectCorner: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.08)" },
  headerGlow: { height: 2, borderRadius: 1, shadowOpacity: 0.8, shadowRadius: 14, shadowOffset: { width: 0, height: 0 } },
  routeCard: { backgroundColor: "#0D0D0D", borderRadius: 18, padding: 16, gap: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  routeRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  routeLabel: { color: "#888888", fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 4 },
  routeText: { color: "#FFFFFF", fontSize: 15, fontFamily: "Inter_500Medium", lineHeight: 21 },
  routeDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.08)" },
  deliveryCard: { backgroundColor: "#0D0D0D", borderRadius: 14, borderWidth: 1, borderColor: "rgba(176,184,200,0.12)", padding: 12, gap: 10 },
  deliveryRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  deliveryLabel: { fontSize: 11, fontFamily: "Inter_500Medium", color: "#666", flex: 1 },
  deliveryVal: { fontSize: 13, fontFamily: "Inter_700Bold", color: SILVER },
  moneyCard: { borderRadius: 18, paddingVertical: 14, paddingHorizontal: 18, borderWidth: 1 },
  moneyLabel: { fontSize: 10, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 2, marginBottom: 4 },
  moneyValue: { fontSize: 30, fontFamily: "Inter_700Bold" },
  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  metaBox: { flex: 1, backgroundColor: "#0D0D0D", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)" },
  metaLabel: { color: "#888888", fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 6 },
  metaValue: { color: "#FFFFFF", fontSize: 17, fontFamily: "Inter_700Bold" },
  acceptBtn: { borderRadius: 20, alignItems: "center", paddingVertical: 16, shadowOpacity: 0.45, shadowRadius: 20, shadowOffset: { width: 0, height: 0 } },
  acceptBtnText: { color: "#040404", fontSize: 18, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  rejectBtn: { alignItems: "center", paddingVertical: 8 },
  rejectBtnText: { color: "#A1A1A1", fontSize: 13, fontFamily: "Inter_500Medium" },
});

function MainMap() {
  return (
    <View style={mapStyles.wrap}>
      <View style={mapStyles.grid} />
      <View style={mapStyles.glow} />
      <View style={mapStyles.pin}><View style={mapStyles.pinCore} /></View>
    </View>
  );
}

const mapStyles = StyleSheet.create({
  wrap: { height: 200, borderRadius: 24, overflow: "hidden", backgroundColor: "#050505", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", marginBottom: 20 },
  grid: { ...StyleSheet.absoluteFillObject, backgroundColor: "#060606", opacity: 1 },
  glow: { position: "absolute", width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(255,215,0,0.08)", top: 12, left: 32 },
  pin: { position: "absolute", top: 88, left: 154, width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,215,0,0.14)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,215,0,0.35)" },
  pinCore: { width: 12, height: 12, borderRadius: 6, backgroundColor: GOLD_BRIGHT, shadowColor: GOLD_BRIGHT, shadowOpacity: 0.8, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
});

function BottomNav({ active }: { active: string }) {
  const items = [
    { key: "home", label: "Home", icon: "home" },
    { key: "earnings", label: "Earnings", icon: "dollar-sign" },
    { key: "withdraw", label: "Withdraw", icon: "arrow-up-circle" },
    { key: "profile", label: "Profile", icon: "user" },
  ] as const;
  return (
    <View style={navStyles.wrap}>
      {items.map((item) => {
        const on = active === item.key;
        function handleNav() {
          if (item.key === "earnings") router.push("/driver/earnings" as never);
          else if (item.key === "withdraw") router.push("/driver/withdraw" as never);
          else router.push("/driver" as never);
        }
        return (
          <TouchableOpacity key={item.key} style={navStyles.item} activeOpacity={0.8} onPress={handleNav}>
            <Feather name={item.icon as any} size={18} color={on ? GOLD_BRIGHT : "#666666"} />
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

// ── Service Preference Toggle ────────────────────────────────────────────────

function ServiceToggle({
  label,
  sub,
  icon,
  value,
  onChange,
  accentColor,
}: {
  label: string;
  sub: string;
  icon: string;
  value: boolean;
  onChange: (v: boolean) => void;
  accentColor: string;
}) {
  return (
    <View style={[toggleStyles.row, value && { borderColor: accentColor + "44", backgroundColor: accentColor + "05" }]}>
      <View style={[toggleStyles.iconBox, { backgroundColor: value ? accentColor + "18" : "rgba(255,255,255,0.05)" }]}>
        <Feather name={icon as any} size={18} color={value ? accentColor : "#555"} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[toggleStyles.label, value && { color: "#FFFFFF" }]}>{label}</Text>
        <Text style={toggleStyles.sub}>{sub}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={(v) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onChange(v); }}
        trackColor={{ false: "#1A1A1A", true: accentColor + "55" }}
        thumbColor={value ? accentColor : "#333"}
        ios_backgroundColor="#1A1A1A"
      />
    </View>
  );
}

const toggleStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "#0D0D0D", borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", padding: 14 },
  iconBox: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#888", marginBottom: 2 },
  sub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#444" },
});

// ── Main Dashboard ───────────────────────────────────────────────────────────

export default function DriverDashboard() {
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 16);
  const { driver, token, logout, setDriverOnline } = useDriverAuth();

  const [isOnline, setIsOnline] = useState(driver?.is_online ?? false);
  const [toggling, setToggling] = useState(false);
  const [pendingRide, setPendingRide] = useState<PendingRide | null>(null);
  const [showRequest, setShowRequest] = useState(false);
  const [todayTrips, setTodayTrips] = useState(0);
  const [todayEarned, setTodayEarned] = useState(0);
  const [activeTab] = useState("home");
  const [prefersRide, setPrefersRide] = useState(driver?.prefers_ride ?? true);
  const [prefersDelivery, setPrefersDelivery] = useState(driver?.prefers_delivery ?? false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingRideRef = useRef<PendingRide | null>(null);

  useEffect(() => { pendingRideRef.current = pendingRide; }, [pendingRide]);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/api/otc/driver/earnings`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() as Promise<{ earnings?: Array<{ net_earnings: number; settled_at: string }> }> : Promise.resolve({ earnings: [] }))
      .then((data) => {
        const today = new Date();
        const todayItems = (data.earnings ?? []).filter((e) => {
          const d = new Date(e.settled_at);
          return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
        });
        setTodayTrips(todayItems.length);
        setTodayEarned(todayItems.reduce((s, e) => s + (e.net_earnings ?? 0), 0));
      })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!driver) { router.replace("/driver/login"); return; }
    setIsOnline(driver.is_online);
    setPrefersRide(driver.prefers_ride ?? true);
    setPrefersDelivery(driver.prefers_delivery ?? false);
  }, [driver]);

  const triggerNotification = useCallback(async () => {
    try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } catch {}
    try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); } catch {}
  }, []);

  const openRideRequest = useCallback((ride: PendingRide) => {
    setPendingRide(ride);
    setShowRequest(true);
    triggerNotification();
  }, [triggerNotification]);

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

  useEffect(() => {
    if (!token || !isOnline || !supabase) return;
    const channel = supabase
      .channel(`driver-searching-${driver?.id ?? "driver"}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ride_requests", filter: "status=eq.Searching" }, (payload) => {
        const row = payload.new as PendingRide;
        if (!pendingRideRef.current && row && row.driver_id == null) openRideRequest(row);
      })
      .subscribe();
    return () => { void supabase?.removeChannel(channel); };
  }, [token, isOnline, driver?.id, openRideRequest]);

  async function toggleOnline() {
    if (!token || toggling) return;
    setToggling(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const next = !isOnline;
    try {
      const res = await fetch(`${API_BASE}/api/otc/driver/toggle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_online: next }),
      });
      if (res.ok) { setIsOnline(next); setDriverOnline(next, token); if (next) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }
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
      setTodayEarned((p) => p + pendingRide.total_fare);
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
      <View style={[styles.edgeGlow, { opacity: isOnline ? 1 : 0 }]} />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: topPad, paddingBottom: insets.bottom + 20 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <View>
            <Text style={[styles.greeting, { color: isOnline ? "#888888" : "#666666" }]}>{isOnline ? "Searching for requests" : "You are currently invisible"}</Text>
            <Text style={styles.driverName}>{driver.name}</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={() => logout().then(() => router.replace("/driver/login"))} activeOpacity={0.8}>
            <Feather name="log-out" size={15} color="#888888" />
          </TouchableOpacity>
        </View>

        <View style={[styles.vehicleCard, { backgroundColor: "#0D0D0D", borderColor: isOnline ? "rgba(201,168,76,0.3)" : "rgba(255,255,255,0.07)" }]}>
          <View style={{ flex: 1, gap: 4 }}>
            <View style={styles.vehicleBadge}><Text style={[styles.vehicleBadgeText, { color: isOnline ? GOLD : "#666666" }]}>PREMIUM DRIVER</Text></View>
            <Text style={styles.vehicleModel}>{driver.vehicle_model}</Text>
            <Text style={styles.vehiclePlate}>{driver.plate_number}</Text>
          </View>
          <View style={styles.ratingBox}>
            <Text style={[styles.ratingValue, { color: GOLD_BRIGHT }]}>{driver.rating.toFixed(1)}</Text>
            <Feather name="star" size={12} color={GOLD} />
            <Text style={styles.ratingLabel}>{driver.total_rides} trips</Text>
          </View>
        </View>

        <MainMap />

        <View style={[styles.earningsCard, { backgroundColor: "#0D0D0D", borderColor: "rgba(255,255,255,0.07)" }]}>
          <Text style={styles.cardLabel}>TODAY'S EARNINGS</Text>
          <Text style={[styles.earningsValue, { color: GOLD_BRIGHT }]}>{todayEarned.toLocaleString()} PKR</Text>
          <TouchableOpacity onPress={() => router.push("/driver/earnings" as never)} activeOpacity={0.8}>
            <Text style={[styles.viewDetails, { color: GOLD }]}>View Details</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statTile}>
            <Text style={styles.cardLabel}>TOTAL RIDES TODAY</Text>
            <Text style={styles.statBig}>{todayTrips}</Text>
          </View>
          <View style={styles.statTile}>
            <Text style={styles.cardLabel}>ACCEPTANCE RATE</Text>
            <Text style={[styles.statBig, { color: GOLD_BRIGHT }]}>98%</Text>
          </View>
        </View>

        {/* ── Service Preferences ────────────────────────────────────── */}
        <View style={styles.prefsSection}>
          <View style={styles.prefsTitleRow}>
            <Text style={styles.prefsTitle}>Service Preferences</Text>
            {savingPrefs && <ActivityIndicator size="small" color={GOLD} />}
          </View>
          <Text style={styles.prefsSub}>Toggle the types of work you accept</Text>
          <View style={styles.prefsList}>
            <ServiceToggle
              label="Ride Mode"
              sub="Accept passenger ride requests"
              icon="users"
              value={prefersRide}
              accentColor={GOLD_BRIGHT}
              onChange={(v) => {
                if (!v && !prefersDelivery) { setPrefersDelivery(true); updatePreferences(false, true); }
                else updatePreferences(v, prefersDelivery);
                setPrefersRide(v);
              }}
            />
            <ServiceToggle
              label="Delivery Mode"
              sub="Accept package delivery requests"
              icon="package"
              value={prefersDelivery}
              accentColor={SILVER}
              onChange={(v) => {
                if (!v && !prefersRide) { setPrefersRide(true); updatePreferences(true, false); }
                else updatePreferences(prefersRide, v);
                setPrefersDelivery(v);
              }}
            />
          </View>
          {prefersRide && prefersDelivery && (
            <View style={styles.multiTaskBadge}>
              <Feather name="zap" size={12} color={GOLD} />
              <Text style={styles.multiTaskText}>Multi-tasking ON — maximising your earnings</Text>
            </View>
          )}
        </View>

        {/* ── Online toggle ────────────────────────────────────────── */}
        <View style={styles.toggleSection}>
          <Text style={styles.statusNote}>{isOnline ? "Searching for nearby passengers" : "You are currently invisible"}</Text>
          <TouchableOpacity
            style={[styles.bigToggle, { backgroundColor: isOnline ? GOLD : "#141414", borderColor: isOnline ? GOLD : "#2A2A2A", shadowColor: isOnline ? GOLD : "transparent", shadowRadius: isOnline ? 30 : 0, shadowOpacity: isOnline ? 0.35 : 0, shadowOffset: { width: 0, height: 0 }, elevation: isOnline ? 20 : 0 }]}
            onPress={toggleOnline}
            disabled={toggling}
            activeOpacity={0.88}
          >
            {toggling ? (
              <ActivityIndicator color={isOnline ? "#050505" : GOLD} size="large" />
            ) : (
              <>
                <Feather name={isOnline ? "radio" : "power"} size={36} color={isOnline ? "#050505" : "#444444"} />
                <Text style={[styles.bigToggleLabel, { color: isOnline ? "#050505" : "#555555" }]}>{isOnline ? "GO OFFLINE" : "GO ONLINE"}</Text>
                <Text style={[styles.bigToggleSub, { color: isOnline ? "rgba(0,0,0,0.55)" : "#333333" }]}>Tap to start or stop accepting trips</Text>
              </>
            )}
          </TouchableOpacity>
          <View style={styles.statusPill}>
            <View style={[styles.statusDot, { backgroundColor: isOnline ? ACCEPT_GREEN : "#444444" }]} />
            <Text style={[styles.statusText, { color: isOnline ? ACCEPT_GREEN : "#555555" }]}>{isOnline ? "ONLINE · EARNING" : "OFFLINE"}</Text>
          </View>
        </View>
      </ScrollView>

      <BottomNav active={activeTab} />
      <RideRequestOverlay ride={pendingRide} visible={showRequest} onAccept={handleAccept} onReject={handleReject} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000000" },
  edgeGlow: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderWidth: 1, borderColor: "rgba(255,215,0,0.15)", shadowColor: GOLD_BRIGHT, shadowOpacity: 0.3, shadowRadius: 28, shadowOffset: { width: 0, height: 0 } },
  scroll: { paddingHorizontal: 20 },
  topBar: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 },
  greeting: { fontSize: 13, fontFamily: "Inter_400Regular" },
  driverName: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  logoutBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center", borderColor: "rgba(255,255,255,0.1)" },
  vehicleCard: { flexDirection: "row", alignItems: "center", borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  vehicleBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, marginBottom: 4, backgroundColor: "rgba(201,168,76,0.1)", borderColor: "rgba(201,168,76,0.25)" },
  vehicleBadgeText: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1.2 },
  vehicleModel: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  vehiclePlate: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 2, letterSpacing: 1, color: "#888888" },
  ratingBox: { alignItems: "center", gap: 2 },
  ratingValue: { fontSize: 28, fontFamily: "Inter_700Bold" },
  ratingLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#666666" },
  earningsCard: { borderRadius: 18, borderWidth: 1, padding: 18, marginBottom: 12, gap: 8 },
  cardLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.4, textTransform: "uppercase", color: "#888888" },
  earningsValue: { fontSize: 32, fontFamily: "Inter_700Bold" },
  viewDetails: { fontSize: 12, fontFamily: "Inter_700Bold" },
  statsGrid: { flexDirection: "row", gap: 10, marginBottom: 18 },
  statTile: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 16, gap: 8, backgroundColor: "#0D0D0D", borderColor: "rgba(255,255,255,0.06)" },
  statBig: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  prefsSection: { marginBottom: 24 },
  prefsTitleRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  prefsTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  prefsSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#555", marginBottom: 12 },
  prefsList: { gap: 10 },
  multiTaskBadge: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10, backgroundColor: "rgba(255,215,0,0.07)", borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,215,0,0.2)", paddingHorizontal: 12, paddingVertical: 8 },
  multiTaskText: { fontSize: 12, fontFamily: "Inter_500Medium", color: GOLD },
  toggleSection: { alignItems: "center", gap: 18, marginBottom: 20 },
  statusNote: { fontSize: 13, fontFamily: "Inter_500Medium", color: "#AAAAAA" },
  bigToggle: { width: 190, height: 190, borderRadius: 95, borderWidth: 2, alignItems: "center", justifyContent: "center", gap: 8 },
  bigToggleLabel: { fontSize: 14, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  bigToggleSub: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 20 },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, backgroundColor: "rgba(48,209,88,0.1)", borderColor: "rgba(48,209,88,0.3)" },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1.5 },
});
