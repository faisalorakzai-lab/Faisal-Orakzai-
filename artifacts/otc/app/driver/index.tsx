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
const POLL_MS = 4000;
const TIMER_SECONDS = 30;

type PendingRide = {
  id: string;
  pickup_address: string;
  dropoff_address: string;
  total_fare: number;
  distance_km: number;
  ride_type: string;
  payment_method: string;
};

function useLoopingPulse(active: boolean) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }
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

function CircularCountdown({ seconds }: { seconds: number }) {
  const radius = 38;
  const progress = seconds / TIMER_SECONDS;
  const dashScale = 1 - progress;
  const color = seconds > 15 ? ACCEPT_GREEN : seconds > 8 ? GOLD : DECLINE_RED;

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

function RidePing() {
  const pulse = useLoopingPulse(true);
  return (
    <View style={pingStyles.wrap}>
      <Animated.View
        style={[
          pingStyles.ring,
          {
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.7] }) }],
          },
        ]}
      />
      <View style={pingStyles.dot} />
    </View>
  );
}

const pingStyles = StyleSheet.create({
  wrap: { width: 18, height: 18, alignItems: "center", justifyContent: "center" },
  ring: { position: "absolute", width: 18, height: 18, borderRadius: 9, backgroundColor: GOLD },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: GOLD_BRIGHT },
});

function RideRequestOverlay({
  ride,
  visible,
  onAccept,
  onReject,
}: {
  ride: PendingRide | null;
  visible: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [seconds, setSeconds] = useState(TIMER_SECONDS);
  const slideY = useRef(new Animated.Value(500)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
        if (current <= 1) {
          onReject();
          return 0;
        }
        if (current === 15) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (current <= 5) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        return current - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [visible, ride, slideY, onReject]);

  if (!ride) return null;

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={overlayStyles.backdrop}>
        <Animated.View style={[overlayStyles.sheet, { transform: [{ translateY: slideY }], paddingBottom: insets.bottom + 20 }]}>
          <View style={overlayStyles.headerRow}>
            <View style={overlayStyles.headerTitleWrap}>
              <RidePing />
              <Text style={overlayStyles.headerTitle}>New Ride Request!</Text>
            </View>
            <TouchableOpacity style={overlayStyles.rejectCorner} onPress={onReject} activeOpacity={0.8}>
              <Feather name="x" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={overlayStyles.headerGlow} />

          <View style={overlayStyles.routeCard}>
            <View style={overlayStyles.routeRow}>
              <Feather name="map-pin" size={15} color={GOLD} />
              <View style={{ flex: 1 }}>
                <Text style={overlayStyles.routeLabel}>Pickup</Text>
                <Text style={overlayStyles.routeText} numberOfLines={2}>{ride.pickup_address}</Text>
              </View>
            </View>
            <View style={overlayStyles.routeDivider} />
            <View style={overlayStyles.routeRow}>
              <Feather name="navigation" size={15} color="#FFFFFF" />
              <View style={{ flex: 1 }}>
                <Text style={overlayStyles.routeLabel}>Drop</Text>
                <Text style={overlayStyles.routeText} numberOfLines={2}>{ride.dropoff_address}</Text>
              </View>
            </View>
          </View>

          <View style={overlayStyles.moneyCard}>
            <Text style={overlayStyles.moneyLabel}>Fare</Text>
            <Text style={overlayStyles.moneyValue}>{ride.total_fare.toLocaleString()} PKR</Text>
          </View>

          <View style={overlayStyles.metaRow}>
            <View style={overlayStyles.metaBox}>
              <Text style={overlayStyles.metaLabel}>Distance</Text>
              <Text style={overlayStyles.metaValue}>{ride.distance_km.toFixed(1)} km</Text>
            </View>
            <CircularCountdown seconds={seconds} />
          </View>

          <TouchableOpacity style={overlayStyles.acceptBtn} onPress={onAccept} activeOpacity={0.9}>
            <Text style={overlayStyles.acceptBtnText}>ACCEPT</Text>
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
  sheet: { backgroundColor: "#050505", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, gap: 16, borderWidth: 1, borderColor: "rgba(255,215,0,0.18)" },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitleWrap: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerTitle: { color: "#FFFFFF", fontSize: 24, fontFamily: "Inter_700Bold" },
  rejectCorner: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.08)" },
  headerGlow: { height: 2, borderRadius: 1, backgroundColor: "rgba(255,215,0,0.5)", shadowColor: GOLD_BRIGHT, shadowOpacity: 0.8, shadowRadius: 14, shadowOffset: { width: 0, height: 0 } },
  routeCard: { backgroundColor: "#0D0D0D", borderRadius: 18, padding: 16, gap: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  routeRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  routeLabel: { color: "#888888", fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 4 },
  routeText: { color: "#FFFFFF", fontSize: 15, fontFamily: "Inter_500Medium", lineHeight: 21 },
  routeDivider: { height: 1, backgroundColor: "rgba(255,215,0,0.18)" },
  moneyCard: { backgroundColor: "rgba(255,215,0,0.1)", borderRadius: 18, paddingVertical: 16, paddingHorizontal: 18, borderWidth: 1, borderColor: "rgba(255,215,0,0.3)" },
  moneyLabel: { color: GOLD, fontSize: 10, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 2, marginBottom: 4 },
  moneyValue: { color: GOLD_BRIGHT, fontSize: 34, fontFamily: "Inter_700Bold" },
  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  metaBox: { flex: 1, backgroundColor: "#0D0D0D", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)" },
  metaLabel: { color: "#888888", fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 6 },
  metaValue: { color: "#FFFFFF", fontSize: 17, fontFamily: "Inter_700Bold" },
  acceptBtn: { backgroundColor: GOLD_BRIGHT, borderRadius: 20, alignItems: "center", paddingVertical: 16, shadowColor: GOLD_BRIGHT, shadowOpacity: 0.45, shadowRadius: 20, shadowOffset: { width: 0, height: 0 } },
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
    { key: "rating", label: "Rating", icon: "star" },
    { key: "profile", label: "Profile", icon: "user" },
  ] as const;
  return (
    <View style={navStyles.wrap}>
      {items.map((item) => {
        const on = active === item.key;
        return (
          <TouchableOpacity key={item.key} style={navStyles.item} activeOpacity={0.8} onPress={() => router.push("/driver" as never)}>
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

export default function DriverDashboard() {
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 16);
  const { driver, token, logout, setDriverOnline } = useDriverAuth();

  const [isOnline, setIsOnline] = useState(driver?.is_online ?? false);
  const [toggling, setToggling] = useState(false);
  const [pendingRide, setPendingRide] = useState<PendingRide | null>(null);
  const [showRequest, setShowRequest] = useState(false);
  const [todayTrips, setTodayTrips] = useState(12);
  const [todayEarned, setTodayEarned] = useState(2500);
  const [activeTab] = useState("home");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingRideRef = useRef<PendingRide | null>(null);

  useEffect(() => {
    pendingRideRef.current = pendingRide;
  }, [pendingRide]);

  useEffect(() => {
    if (!driver) {
      router.replace("/driver/login");
      return;
    }
    setIsOnline(driver.is_online);
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
    if (!isOnline) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    fetchLatestSearchingRide();
    pollRef.current = setInterval(fetchLatestSearchingRide, POLL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [isOnline, fetchLatestSearchingRide]);

  useEffect(() => {
    if (!token || !isOnline || !supabase) return;
    const channel = supabase
      .channel(`driver-searching-${driver?.id ?? "driver"}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ride_requests", filter: "status=eq.Searching" },
        (payload) => {
          const row = payload.new as PendingRide;
          if (!pendingRideRef.current && row && row.driver_id == null) openRideRequest(row);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
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
      if (res.ok) {
        setIsOnline(next);
        setDriverOnline(next, token);
        if (next) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {}
    setToggling(false);
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
            <Text style={[styles.greeting, { color: isOnline ? "#888888" : "#666666" }]}>{isOnline ? "Searching for nearby passengers" : "You are currently invisible"}</Text>
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
          <TouchableOpacity activeOpacity={0.8}>
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

        <View style={styles.toggleSection}>
          <Text style={styles.statusNote}>{isOnline ? "Searching for nearby passengers" : "You are currently invisible"}</Text>
          <TouchableOpacity
            style={[
              styles.bigToggle,
              {
                backgroundColor: isOnline ? GOLD : "#141414",
                borderColor: isOnline ? GOLD : "#2A2A2A",
                shadowColor: isOnline ? GOLD : "transparent",
                shadowRadius: isOnline ? 30 : 0,
                shadowOpacity: isOnline ? 0.35 : 0,
                shadowOffset: { width: 0, height: 0 },
                elevation: isOnline ? 20 : 0,
              },
            ]}
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
  toggleSection: { alignItems: "center", gap: 18, marginBottom: 20 },
  statusNote: { fontSize: 13, fontFamily: "Inter_500Medium", color: "#AAAAAA" },
  bigToggle: { width: 190, height: 190, borderRadius: 95, borderWidth: 2, alignItems: "center", justifyContent: "center", gap: 8 },
  bigToggleLabel: { fontSize: 14, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  bigToggleSub: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 20 },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, backgroundColor: "rgba(48,209,88,0.1)", borderColor: "rgba(48,209,88,0.3)" },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1.5 },
});