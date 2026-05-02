import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
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

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN ?? "";
const GOLD = "#C9A84C";
const GOLD_BRIGHT = "#FFD700";
const ACCEPT_GREEN = "#30D158";
const DECLINE_RED = "#FF3B30";
const POLL_MS = 5000;
const TIMER_SECONDS = 30;

interface PendingRide {
  id: string;
  pickup_address: string;
  dropoff_address: string;
  total_fare: number;
  distance_km: number;
  ride_type: string;
  payment_method: string;
}

// ── Online Pulse Animation ───────────────────────────────────────────────────

function OnlinePulse() {
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (v: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(v, { toValue: 1, duration: 1400, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
          Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      );
    Animated.parallel([animate(ring1, 0), animate(ring2, 700)]).start();
    return () => { ring1.stopAnimation(); ring2.stopAnimation(); };
  }, [ring1, ring2]);

  const ringStyle = (v: Animated.Value) => ({
    opacity: v.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.7, 0.5, 0] }),
    transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] }) }],
  });

  return (
    <View style={pulseStyles.wrap}>
      <Animated.View style={[pulseStyles.ring, ringStyle(ring1)]} />
      <Animated.View style={[pulseStyles.ring, ringStyle(ring2)]} />
      <View style={pulseStyles.dot} />
    </View>
  );
}

const pulseStyles = StyleSheet.create({
  wrap: { width: 14, height: 14, alignItems: "center", justifyContent: "center" },
  ring: {
    position: "absolute", width: 14, height: 14, borderRadius: 7,
    backgroundColor: ACCEPT_GREEN, borderWidth: 0,
  },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: ACCEPT_GREEN },
});

// ── Countdown Timer ──────────────────────────────────────────────────────────

function CountdownBar({ seconds, total }: { seconds: number; total: number }) {
  const pct = seconds / total;
  const color = seconds > 15 ? ACCEPT_GREEN : seconds > 8 ? GOLD : DECLINE_RED;
  return (
    <View style={countStyles.wrap}>
      <View style={[countStyles.track, { backgroundColor: "#222222" }]}>
        <Animated.View
          style={[
            countStyles.fill,
            { width: `${pct * 100}%` as `${number}%`, backgroundColor: color },
          ]}
        />
      </View>
      <Text style={[countStyles.label, { color }]}>{seconds}s</Text>
    </View>
  );
}

const countStyles = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", gap: 10 },
  track: { flex: 1, height: 5, borderRadius: 3, overflow: "hidden" },
  fill: { height: 5, borderRadius: 3 },
  label: { fontSize: 18, fontFamily: "Inter_700Bold", minWidth: 36, textAlign: "right" },
});

// ── Incoming Request Modal ───────────────────────────────────────────────────

function IncomingRequestModal({
  ride,
  visible,
  onAccept,
  onDecline,
}: {
  ride: PendingRide | null;
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [countdown, setCountdown] = useState(TIMER_SECONDS);
  const slideY = useRef(new Animated.Value(400)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (visible && ride) {
      setCountdown(TIMER_SECONDS);
      Animated.spring(slideY, { toValue: 0, useNativeDriver: true, speed: 14, bounciness: 4 }).start();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      intervalRef.current = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) { onDecline(); return 0; }
          if (c === 15) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          if (c <= 5)  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          return c - 1;
        });
      }, 1000);
    } else {
      Animated.timing(slideY, { toValue: 400, duration: 250, useNativeDriver: true }).start();
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [visible, ride, slideY, onDecline]);

  if (!ride) return null;

  const rideLabel = ride.ride_type === "sovereign" ? "Sovereign" : ride.ride_type === "autonomous" ? "Autonomous" : "Community";

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={modalStyles.overlay}>
        <Animated.View
          style={[modalStyles.sheet, { transform: [{ translateY: slideY }], paddingBottom: insets.bottom + 20, backgroundColor: "#0A0A0A" }]}
        >
          {/* Handle */}
          <View style={[modalStyles.handle, { backgroundColor: "#333333" }]} />

          {/* Header */}
          <View style={modalStyles.header}>
            <View style={[modalStyles.headerIcon, { backgroundColor: "rgba(48,209,88,0.12)", borderColor: "rgba(48,209,88,0.3)" }]}>
              <Text style={{ fontSize: 26 }}>🚦</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={modalStyles.headerTitle}>Incoming Trip</Text>
              <View style={[modalStyles.rideBadge, { backgroundColor: "rgba(201,168,76,0.1)", borderColor: "rgba(201,168,76,0.25)" }]}>
                <Text style={[modalStyles.rideBadgeText, { color: GOLD }]}>{rideLabel.toUpperCase()} RIDE</Text>
              </View>
            </View>
          </View>

          <CountdownBar seconds={countdown} total={TIMER_SECONDS} />

          {/* Route */}
          <View style={[modalStyles.routeCard, { backgroundColor: "#111111", borderColor: "rgba(255,255,255,0.08)" }]}>
            <View style={modalStyles.routeRow}>
              <View style={[modalStyles.routeDot, { backgroundColor: ACCEPT_GREEN }]} />
              <View style={{ flex: 1 }}>
                <Text style={[modalStyles.routeLabel, { color: "#888888" }]}>PICKUP</Text>
                <Text style={[modalStyles.routeAddress, { color: "#FFFFFF" }]} numberOfLines={2}>
                  {ride.pickup_address}
                </Text>
              </View>
            </View>
            <View style={modalStyles.routeConnector}>
              <View style={[modalStyles.connectorLine, { backgroundColor: "rgba(201,168,76,0.2)" }]} />
              <Feather name="arrow-down" size={13} color={GOLD} />
              <View style={[modalStyles.connectorLine, { backgroundColor: "rgba(201,168,76,0.2)" }]} />
            </View>
            <View style={modalStyles.routeRow}>
              <Feather name="map-pin" size={14} color={GOLD} />
              <View style={{ flex: 1 }}>
                <Text style={[modalStyles.routeLabel, { color: "#888888" }]}>DROPOFF</Text>
                <Text style={[modalStyles.routeAddress, { color: "#FFFFFF" }]} numberOfLines={2}>
                  {ride.dropoff_address}
                </Text>
              </View>
            </View>
          </View>

          {/* Stats */}
          <View style={modalStyles.statsRow}>
            {[
              { label: "FARE",     value: `PKR ${ride.total_fare.toLocaleString()}`, color: GOLD_BRIGHT, big: true },
              { label: "DISTANCE", value: `${ride.distance_km.toFixed(1)} km`,       color: "#FFFFFF",   big: false },
              { label: "PAYMENT",  value: ride.payment_method === "wallet" ? "Wallet" : "Cash", color: "#FFFFFF", big: false },
            ].map(({ label, value, color, big }) => (
              <View key={label} style={[modalStyles.statBox, { backgroundColor: "#111111", borderColor: "rgba(255,255,255,0.07)" }]}>
                <Text style={[modalStyles.statLabel, { color: "#888888" }]}>{label}</Text>
                <Text style={[modalStyles.statValue, { color, fontSize: big ? 20 : 15 }]}>{value}</Text>
              </View>
            ))}
          </View>

          {/* Buttons */}
          <View style={modalStyles.btnRow}>
            <TouchableOpacity
              style={[modalStyles.declineBtn, { borderColor: "rgba(255,59,48,0.4)", backgroundColor: "rgba(255,59,48,0.08)" }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onDecline(); }}
              activeOpacity={0.85}
            >
              <Feather name="x" size={20} color={DECLINE_RED} />
              <Text style={[modalStyles.declineBtnText, { color: DECLINE_RED }]}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modalStyles.acceptBtn, { backgroundColor: ACCEPT_GREEN }]}
              onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); onAccept(); }}
              activeOpacity={0.88}
            >
              <Feather name="check" size={20} color="#050505" />
              <Text style={modalStyles.acceptBtnText}>Accept</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.72)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingTop: 10, gap: 16 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 6 },
  header: { flexDirection: "row", alignItems: "center", gap: 14 },
  headerIcon: { width: 58, height: 58, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#FFFFFF", marginBottom: 4 },
  rideBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  rideBadgeText: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1.2 },
  routeCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 6 },
  routeRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  routeDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4, flexShrink: 0 },
  routeLabel: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 2 },
  routeAddress: { fontSize: 14, fontFamily: "Inter_500Medium", lineHeight: 20 },
  routeConnector: { flexDirection: "row", alignItems: "center", paddingLeft: 5, gap: 4, marginVertical: 2 },
  connectorLine: { flex: 1, height: 1 },
  statsRow: { flexDirection: "row", gap: 8 },
  statBox: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 11, gap: 3 },
  statLabel: { fontSize: 8, fontFamily: "Inter_700Bold", letterSpacing: 1, textTransform: "uppercase" },
  statValue: { fontFamily: "Inter_700Bold" },
  btnRow: { flexDirection: "row", gap: 12 },
  declineBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 16, borderWidth: 1.5, paddingVertical: 16,
  },
  declineBtnText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  acceptBtn: {
    flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 16, paddingVertical: 16,
  },
  acceptBtnText: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#050505" },
});

// ── Main Dashboard ───────────────────────────────────────────────────────────

export default function DriverDashboard() {
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 16);
  const { driver, token, logout, setDriverOnline } = useDriverAuth();

  const [isOnline,    setIsOnline]    = useState(driver?.is_online ?? false);
  const [toggling,    setToggling]    = useState(false);
  const [pendingRide, setPendingRide] = useState<PendingRide | null>(null);
  const [showRequest, setShowRequest] = useState(false);
  const [todayTrips,  setTodayTrips]  = useState(0);
  const [todayEarned, setTodayEarned] = useState(0);

  const bgAnim = useRef(new Animated.Value(isOnline ? 1 : 0)).current;
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    Animated.timing(bgAnim, { toValue: isOnline ? 1 : 0, duration: 600, useNativeDriver: false }).start();
  }, [isOnline, bgAnim]);

  const bgColor = bgAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["#000000", "#050501"],
  });

  const pollForRides = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/otc/driver/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json() as { ride?: PendingRide };
      if (data.ride && !showRequest) {
        setPendingRide(data.ride);
        setShowRequest(true);
      }
    } catch { /* ignore poll failures */ }
  }, [token, showRequest]);

  useEffect(() => {
    if (!driver) { router.replace("/driver/login"); return; }
    setIsOnline(driver.is_online);
  }, [driver]);

  useEffect(() => {
    if (isOnline) {
      pollRef.current = setInterval(pollForRides, POLL_MS);
      pollForRides();
    } else {
      if (pollRef.current) clearInterval(pollRef.current);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [isOnline, pollForRides]);

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
    } catch { /* ignore */ }
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
    } catch { /* ignore */ }
    setPendingRide(null);
  }

  async function handleDecline() {
    if (!pendingRide || !token) return;
    setShowRequest(false);
    try {
      await fetch(`${API_BASE}/api/otc/driver/request/${pendingRide.id}/respond`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "decline" }),
      });
    } catch { /* ignore */ }
    setPendingRide(null);
  }

  if (!driver) return null;

  const rideTypeLabel = driver.ride_type === "sovereign" ? "Sovereign" : driver.ride_type === "autonomous" ? "Autonomous" : "Community";

  return (
    <Animated.View style={[styles.root, { backgroundColor: bgColor }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPad, paddingBottom: insets.bottom + (Platform.OS === "web" ? 40 : 120) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.topBar}>
          <View>
            <Text style={[styles.greeting, { color: "#888888" }]}>Welcome back,</Text>
            <Text style={styles.driverName}>{driver.name}</Text>
          </View>
          <TouchableOpacity
            style={[styles.logoutBtn, { borderColor: "rgba(255,255,255,0.1)" }]}
            onPress={() => logout().then(() => router.replace("/driver/login"))}
            activeOpacity={0.8}
          >
            <Feather name="log-out" size={15} color="#888888" />
          </TouchableOpacity>
        </View>

        {/* Vehicle Card */}
        <View style={[styles.vehicleCard, { backgroundColor: "#0D0D0D", borderColor: isOnline ? "rgba(201,168,76,0.3)" : "rgba(255,255,255,0.07)" }]}>
          <View style={{ flex: 1, gap: 4 }}>
            <View style={[styles.vehicleBadge, { backgroundColor: isOnline ? "rgba(201,168,76,0.1)" : "#1A1A1A", borderColor: isOnline ? "rgba(201,168,76,0.25)" : "#333333" }]}>
              <Text style={[styles.vehicleBadgeText, { color: isOnline ? GOLD : "#666666" }]}>
                {rideTypeLabel.toUpperCase()} DRIVER
              </Text>
            </View>
            <Text style={[styles.vehicleModel, { color: "#FFFFFF" }]}>{driver.vehicle_model}</Text>
            <Text style={[styles.vehiclePlate, { color: "#888888" }]}>{driver.plate_number}</Text>
          </View>
          <View style={styles.ratingBox}>
            <Text style={[styles.ratingValue, { color: GOLD_BRIGHT }]}>{driver.rating.toFixed(1)}</Text>
            <Feather name="star" size={12} color={GOLD} />
            <Text style={[styles.ratingLabel, { color: "#666666" }]}>{driver.total_rides} trips</Text>
          </View>
        </View>

        {/* Today Stats */}
        <View style={[styles.statsRow, { backgroundColor: "#0D0D0D", borderColor: "rgba(255,255,255,0.06)" }]}>
          {[
            { label: "Today's Trips", value: `${todayTrips}` },
            { label: "Today's Earned", value: todayEarned > 0 ? `PKR ${todayEarned.toLocaleString()}` : "—" },
            { label: "Rating",         value: driver.rating.toFixed(1) + " ★" },
          ].map(({ label, value }, i) => (
            <React.Fragment key={label}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: GOLD_BRIGHT }]}>{value}</Text>
                <Text style={[styles.statLabel, { color: "#666666" }]}>{label}</Text>
              </View>
              {i < 2 && <View style={[styles.statDivider, { backgroundColor: "#1A1A1A" }]} />}
            </React.Fragment>
          ))}
        </View>

        {/* Go Online Toggle — main interaction */}
        <View style={styles.toggleSection}>
          {isOnline ? (
            <>
              <View style={styles.searchingWrap}>
                <OnlinePulse />
                <Text style={[styles.searchingText, { color: "#AAAAAA" }]}>Searching for trips…</Text>
              </View>
              <View style={styles.glowRings}>
                <View style={[styles.glowRing, { borderColor: "rgba(201,168,76,0.06)", width: 280, height: 280, borderRadius: 140 }]} />
                <View style={[styles.glowRing, { borderColor: "rgba(201,168,76,0.10)", width: 210, height: 210, borderRadius: 105 }]} />
                <View style={[styles.glowRing, { borderColor: "rgba(201,168,76,0.16)", width: 148, height: 148, borderRadius: 74 }]} />
              </View>
            </>
          ) : (
            <Text style={[styles.offlineLabel, { color: "#555555" }]}>You are currently offline</Text>
          )}

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
                <Feather
                  name={isOnline ? "radio" : "power"}
                  size={36}
                  color={isOnline ? "#050505" : "#444444"}
                />
                <Text style={[styles.bigToggleLabel, { color: isOnline ? "#050505" : "#555555" }]}>
                  {isOnline ? "GO OFFLINE" : "GO ONLINE"}
                </Text>
                <Text style={[styles.bigToggleSub, { color: isOnline ? "rgba(0,0,0,0.55)" : "#333333" }]}>
                  {isOnline ? "Tap to stop accepting trips" : "Tap to start accepting trips"}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <View style={[styles.statusPill, { backgroundColor: isOnline ? "rgba(48,209,88,0.1)" : "#111111", borderColor: isOnline ? "rgba(48,209,88,0.3)" : "#222222" }]}>
            <View style={[styles.statusDot, { backgroundColor: isOnline ? ACCEPT_GREEN : "#444444" }]} />
            <Text style={[styles.statusText, { color: isOnline ? ACCEPT_GREEN : "#555555" }]}>
              {isOnline ? "ONLINE · EARNING" : "OFFLINE"}
            </Text>
          </View>
        </View>
      </ScrollView>

      <IncomingRequestModal
        ride={pendingRide}
        visible={showRequest}
        onAccept={handleAccept}
        onDecline={handleDecline}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  topBar: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 },
  greeting: { fontSize: 13, fontFamily: "Inter_400Regular" },
  driverName: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  logoutBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },

  vehicleCard: { flexDirection: "row", alignItems: "center", borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  vehicleBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, marginBottom: 4 },
  vehicleBadgeText: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1.2 },
  vehicleModel: { fontSize: 17, fontFamily: "Inter_700Bold" },
  vehiclePlate: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 2, letterSpacing: 1 },
  ratingBox: { alignItems: "center", gap: 2 },
  ratingValue: { fontSize: 28, fontFamily: "Inter_700Bold" },
  ratingLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },

  statsRow: { flexDirection: "row", borderRadius: 14, borderWidth: 1, paddingVertical: 14, marginBottom: 36 },
  statItem: { flex: 1, alignItems: "center", gap: 3 },
  statValue: { fontSize: 16, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center" },
  statDivider: { width: 1, height: 28 },

  toggleSection: { alignItems: "center", gap: 24 },
  searchingWrap: { flexDirection: "row", alignItems: "center", gap: 10 },
  searchingText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  glowRings: { position: "absolute", top: -20, alignItems: "center", justifyContent: "center" },
  glowRing: { position: "absolute", borderWidth: 1 },
  offlineLabel: { fontSize: 14, fontFamily: "Inter_400Regular" },

  bigToggle: {
    width: 180, height: 180, borderRadius: 90, borderWidth: 2,
    alignItems: "center", justifyContent: "center", gap: 8,
  },
  bigToggleLabel: { fontSize: 14, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  bigToggleSub: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 20 },

  statusPill: {
    flexDirection: "row", alignItems: "center", gap: 7,
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1.5 },
});
