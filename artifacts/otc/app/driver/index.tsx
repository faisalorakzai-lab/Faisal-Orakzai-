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

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN ?? "";
const GOLD = "#C9A84C";
const GOLD_BRIGHT = "#FFD700";
const ACCEPT_GREEN = "#30D158";
const DECLINE_RED = "#FF3B30";
const POLL_MS = 5000;
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

function OnlinePulse() {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1200, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
        Animated.timing(pulse, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  return (
    <View style={pulseStyles.wrap}>
      <Animated.View
        style={[
          pulseStyles.ring,
          {
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }),
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 3.2] }) }],
          },
        ]}
      />
      <View style={pulseStyles.dot} />
    </View>
  );
}

const pulseStyles = StyleSheet.create({
  wrap: { width: 16, height: 16, alignItems: "center", justifyContent: "center" },
  ring: { position: "absolute", width: 16, height: 16, borderRadius: 8, backgroundColor: ACCEPT_GREEN },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: ACCEPT_GREEN },
});

function CountdownBar({ seconds, total }: { seconds: number; total: number }) {
  const pct = seconds / total;
  const color = seconds > 15 ? ACCEPT_GREEN : seconds > 8 ? GOLD : DECLINE_RED;
  return (
    <View style={countStyles.wrap}>
      <View style={countStyles.track}>
        <View style={[countStyles.fill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
      <Text style={[countStyles.label, { color }]}>{seconds}s</Text>
    </View>
  );
}

const countStyles = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", gap: 10 },
  track: { flex: 1, height: 5, borderRadius: 3, overflow: "hidden", backgroundColor: "#222222" },
  fill: { height: 5, borderRadius: 3 },
  label: { fontSize: 18, fontFamily: "Inter_700Bold", minWidth: 36, textAlign: "right" },
});

function IncomingRequestModal({ ride, visible, onAccept, onDecline }: { ride: PendingRide | null; visible: boolean; onAccept: () => void; onDecline: () => void; }) {
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
          if (c <= 5) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
        <Animated.View style={[modalStyles.sheet, { transform: [{ translateY: slideY }], paddingBottom: insets.bottom + 20, backgroundColor: "#0A0A0A" }]}>
          <View style={modalStyles.handle} />
          <View style={modalStyles.header}>
            <View style={modalStyles.headerIcon}>
              <Text style={{ fontSize: 26 }}>🚦</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={modalStyles.headerTitle}>Incoming Trip</Text>
              <View style={modalStyles.rideBadge}><Text style={modalStyles.rideBadgeText}>{rideLabel.toUpperCase()} RIDE</Text></View>
            </View>
          </View>
          <CountdownBar seconds={countdown} total={TIMER_SECONDS} />
          <View style={modalStyles.routeCard}>
            <View style={modalStyles.routeRow}>
              <View style={[modalStyles.routeDot, { backgroundColor: ACCEPT_GREEN }]} />
              <View style={{ flex: 1 }}>
                <Text style={modalStyles.routeLabel}>PICKUP</Text>
                <Text style={modalStyles.routeAddress} numberOfLines={2}>{ride.pickup_address}</Text>
              </View>
            </View>
            <View style={modalStyles.routeConnector}>
              <View style={modalStyles.connectorLine} />
              <Feather name="arrow-down" size={13} color={GOLD} />
              <View style={modalStyles.connectorLine} />
            </View>
            <View style={modalStyles.routeRow}>
              <Feather name="map-pin" size={14} color={GOLD} />
              <View style={{ flex: 1 }}>
                <Text style={modalStyles.routeLabel}>DROPOFF</Text>
                <Text style={modalStyles.routeAddress} numberOfLines={2}>{ride.dropoff_address}</Text>
              </View>
            </View>
          </View>
          <View style={modalStyles.statsRow}>
            {[
              { label: "FARE", value: `PKR ${ride.total_fare.toLocaleString()}`, color: GOLD_BRIGHT, big: true },
              { label: "DISTANCE", value: `${ride.distance_km.toFixed(1)} km`, color: "#FFFFFF", big: false },
              { label: "PAYMENT", value: ride.payment_method === "wallet" ? "Wallet" : "Cash", color: "#FFFFFF", big: false },
            ].map(({ label, value, color, big }) => (
              <View key={label} style={modalStyles.statBox}>
                <Text style={modalStyles.statLabel}>{label}</Text>
                <Text style={[modalStyles.statValue, { color, fontSize: big ? 20 : 15 }]}>{value}</Text>
              </View>
            ))}
          </View>
          <View style={modalStyles.btnRow}>
            <TouchableOpacity style={modalStyles.declineBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onDecline(); }} activeOpacity={0.85}>
              <Feather name="x" size={20} color={DECLINE_RED} />
              <Text style={modalStyles.declineBtnText}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity style={modalStyles.acceptBtn} onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); onAccept(); }} activeOpacity={0.88}>
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
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 6, backgroundColor: "#333333" },
  header: { flexDirection: "row", alignItems: "center", gap: 14 },
  headerIcon: { width: 58, height: 58, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(48,209,88,0.12)", borderColor: "rgba(48,209,88,0.3)" },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#FFFFFF", marginBottom: 4 },
  rideBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, backgroundColor: "rgba(201,168,76,0.1)", borderColor: "rgba(201,168,76,0.25)" },
  rideBadgeText: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1.2, color: GOLD },
  routeCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 6, backgroundColor: "#111111", borderColor: "rgba(255,255,255,0.08)" },
  routeRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  routeDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4, flexShrink: 0 },
  routeLabel: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 2, color: "#888888" },
  routeAddress: { fontSize: 14, fontFamily: "Inter_500Medium", lineHeight: 20, color: "#FFFFFF" },
  routeConnector: { flexDirection: "row", alignItems: "center", paddingLeft: 5, gap: 4, marginVertical: 2 },
  connectorLine: { flex: 1, height: 1, backgroundColor: "rgba(201,168,76,0.2)" },
  statsRow: { flexDirection: "row", gap: 8 },
  statBox: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 11, gap: 3, backgroundColor: "#111111", borderColor: "rgba(255,255,255,0.07)" },
  statLabel: { fontSize: 8, fontFamily: "Inter_700Bold", letterSpacing: 1, textTransform: "uppercase", color: "#888888" },
  statValue: { fontFamily: "Inter_700Bold" },
  btnRow: { flexDirection: "row", gap: 12 },
  declineBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 16, borderWidth: 1.5, paddingVertical: 16, borderColor: "rgba(255,59,48,0.4)", backgroundColor: "rgba(255,59,48,0.08)" },
  declineBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: DECLINE_RED },
  acceptBtn: { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 16, paddingVertical: 16, backgroundColor: ACCEPT_GREEN },
  acceptBtnText: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#050505" },
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
          <TouchableOpacity key={item.key} style={navStyles.item} activeOpacity={0.8}>
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

  useEffect(() => {
    if (!driver) {
      router.replace("/driver/login");
      return;
    }
    setIsOnline(driver.is_online);
  }, [driver]);

  const pollForRides = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/otc/driver/pending`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const data = await res.json() as { ride?: PendingRide };
      if (data.ride && !showRequest) {
        setPendingRide(data.ride);
        setShowRequest(true);
      }
    } catch {}
  }, [token, showRequest]);

  useEffect(() => {
    if (isOnline) {
      pollRef.current = setInterval(pollForRides, POLL_MS);
      pollForRides();
    } else if (pollRef.current) {
      clearInterval(pollRef.current);
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

  async function handleDecline() {
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
          {isOnline ? <OnlinePulse /> : null}
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
                <Text style={[styles.bigToggleSub, { color: isOnline ? "rgba(0,0,0,0.55)" : "#333333" }]}>
                  {isOnline ? "Tap to stop accepting trips" : "Tap to start accepting trips"}
                </Text>
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
      <IncomingRequestModal ride={pendingRide} visible={showRequest} onAccept={handleAccept} onDecline={handleDecline} />
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
