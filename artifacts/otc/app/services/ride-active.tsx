import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RideCompletedModal } from "@/components/ride/RideCompletedModal";
import { RideProgressBar, type LivePhase } from "@/components/ride/RideProgressBar";
import { RideMapFull } from "@/components/ride/RideMapFull";
import { clearActiveRide, getActiveRide } from "@/lib/activeRideStore";
import { supabase } from "@/lib/supabase";

const { height: SCREEN_H } = Dimensions.get("window");

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export default function RideActiveScreen() {
  const insets = useSafeAreaInsets();
  const rideData = getActiveRide();

  const [phase, setPhase]             = useState<LivePhase>("assigned");
  const [carLat, setCarLat]           = useState<number | null>(null);
  const [carLng, setCarLng]           = useState<number | null>(null);
  const [etaSeconds, setEtaSeconds]   = useState((rideData?.driver.eta ?? 5) * 60);
  const [showCompleted, setShowCompleted] = useState(false);

  const realtimeRef  = useRef<ReturnType<NonNullable<typeof supabase>["channel"]> | null>(null);
  const carIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const etaIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseRef       = useRef<LivePhase>("assigned");
  const handledRef     = useRef<Record<string, boolean>>({});

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 16);

  useEffect(() => {
    if (!rideData) {
      router.replace("/(tabs)");
      return;
    }

    // ETA countdown
    etaIntervalRef.current = setInterval(() => {
      setEtaSeconds(s => Math.max(0, s - 1));
    }, 1000);

    startCarAnimation("assigned");

    // Subscribe to Realtime
    if (supabase) {
      const ch = supabase
        .channel(`ride-live-${rideData.rideId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "ride_requests",
            filter: `id=eq.${rideData.rideId}`,
          },
          (payload) => {
            const row = payload.new as Record<string, unknown>;
            const status = row["status"] as string;
            if (status === "ongoing"   && !handledRef.current["ongoing"])   transitionTo("ongoing");
            if (status === "completed" && !handledRef.current["completed"]) transitionTo("completed");
          }
        )
        .subscribe();
      realtimeRef.current = ch;
    }

    return cleanup;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function cleanup() {
    if (carIntervalRef.current)  clearInterval(carIntervalRef.current);
    if (etaIntervalRef.current)  clearInterval(etaIntervalRef.current);
    if (realtimeRef.current && supabase) supabase.removeChannel(realtimeRef.current);
  }

  function transitionTo(next: LivePhase) {
    handledRef.current[next] = true;
    phaseRef.current = next;
    setPhase(next);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (carIntervalRef.current) clearInterval(carIntervalRef.current);

    if (next === "ongoing") {
      setEtaSeconds((rideData?.driver.eta ?? 5) * 60 + 480);
      startCarAnimation("ongoing");
    }
    if (next === "completed") {
      if (etaIntervalRef.current) clearInterval(etaIntervalRef.current);
      setEtaSeconds(0);
      setShowCompleted(true);
    }
  }

  function startCarAnimation(p: LivePhase) {
    if (!rideData) return;
    const { pickup, dropoff } = rideData;

    // Mock driver start slightly offset from pickup
    const driverLat = pickup.lat + 0.018;
    const driverLng = pickup.lng - 0.014;

    const fromLat = p === "assigned" ? driverLat : pickup.lat;
    const fromLng = p === "assigned" ? driverLng : pickup.lng;
    const toLat   = p === "assigned" ? pickup.lat : dropoff.lat;
    const toLng   = p === "assigned" ? pickup.lng : dropoff.lng;

    const STEPS    = p === "assigned" ? 40 : 60;
    const INTERVAL = p === "assigned" ? 500 : 400;
    let step = 0;

    setCarLat(fromLat);
    setCarLng(fromLng);

    carIntervalRef.current = setInterval(() => {
      step++;
      const t = Math.min(step / STEPS, 1);
      setCarLat(lerp(fromLat, toLat, t));
      setCarLng(lerp(fromLng, toLng, t));
      if (step >= STEPS && carIntervalRef.current) clearInterval(carIntervalRef.current);
    }, INTERVAL);
  }

  function handleBackToHome() {
    cleanup();
    clearActiveRide();
    router.replace("/(tabs)");
  }

  if (!rideData) return null;

  const { driver, pickup, dropoff, totalFare, offeredPrice, rideTypeLabel } = rideData;
  const etaMins = Math.ceil(etaSeconds / 60);
  const etaSecs = etaSeconds % 60;
  const etaDisplay = `${etaMins}:${etaSecs.toString().padStart(2, "0")}`;
  const carCoord = carLat != null && carLng != null
    ? { lat: carLat, lng: carLng }
    : null;

  return (
    <View style={styles.root}>
      {/* ── Full-screen map ── */}
      <RideMapFull
        pickup={pickup}
        dropoff={phase !== "assigned" ? dropoff : undefined}
        carPosition={carCoord}
        style={StyleSheet.absoluteFill}
      />

      {/* ── Top bar ── */}
      <View style={[styles.topBar, { paddingTop: topPad, paddingHorizontal: 20 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={handleBackToHome}
          activeOpacity={0.8}
        >
          <Feather name="arrow-left" size={20} color="#FFD700" />
        </TouchableOpacity>

        <View
          style={[
            styles.statusBadge,
            phase === "ongoing"   && styles.badgeOngoing,
            phase === "completed" && styles.badgeDone,
          ]}
        >
          <View
            style={[
              styles.statusDot,
              phase === "ongoing"   && { backgroundColor: "#22C55E" },
              phase === "completed" && { backgroundColor: "#FFD700" },
            ]}
          />
          <Text style={styles.statusText}>
            {phase === "assigned"  ? "DRIVER ARRIVING"  :
             phase === "ongoing"   ? "EN ROUTE"         : "COMPLETED"}
          </Text>
        </View>

        <View style={{ width: 40 }} />
      </View>

      {/* ── Bottom panel ── */}
      <View
        style={[
          styles.panel,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 24 : 16) },
        ]}
      >
        <View style={styles.dragHandle} />

        {/* Progress bar */}
        <RideProgressBar phase={phase} />

        <View style={styles.panelDivider} />

        {/* ── Assigned content ── */}
        {phase === "assigned" && (
          <View style={styles.content}>
            <View style={styles.contentHeader}>
              <View>
                <Text style={styles.phaseTitle}>Driver is on the way</Text>
                <Text style={styles.phaseSub} numberOfLines={1}>
                  {driver.name}
                  {driver.vehicleModel ? ` · ${driver.vehicleModel}` : ""}
                </Text>
              </View>
              {driver.plate && (
                <View style={styles.plateBadge}>
                  <Text style={styles.plateText}>{driver.plate}</Text>
                </View>
              )}
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Feather name="clock" size={16} color="#FFD700" />
                <Text style={styles.statValue}>{etaDisplay}</Text>
                <Text style={styles.statLabel}>ETA</Text>
              </View>
              <View style={styles.statSep} />
              <View style={styles.statItem}>
                <Feather name="star" size={16} color="#FFD700" />
                <Text style={styles.statValue}>{driver.rating.toFixed(1)}</Text>
                <Text style={styles.statLabel}>Rating</Text>
              </View>
              <View style={styles.statSep} />
              <View style={styles.statItem}>
                <Feather name="credit-card" size={16} color="#FFD700" />
                <Text style={styles.statValue}>
                  {totalFare > 0 ? `${totalFare.toLocaleString()}` : `${offeredPrice.toLocaleString()}`}
                </Text>
                <Text style={styles.statLabel}>PKR</Text>
              </View>
            </View>
          </View>
        )}

        {/* ── Ongoing content ── */}
        {phase === "ongoing" && (
          <View style={styles.content}>
            <View style={styles.contentHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.phaseTitle}>You're on the way</Text>
                <Text style={styles.phaseSub} numberOfLines={1}>
                  To{" "}
                  <Text style={{ color: "#FFD700" }}>
                    {dropoff.name ?? "Destination"}
                  </Text>
                </Text>
              </View>
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Feather name="clock" size={16} color="#FFD700" />
                <Text style={styles.statValue}>{etaDisplay}</Text>
                <Text style={styles.statLabel}>Arrival</Text>
              </View>
              <View style={styles.statSep} />
              <View style={styles.statItem}>
                <Feather name="user" size={16} color="#FFD700" />
                <Text style={styles.statValue}>{driver.name.split(" ")[0]}</Text>
                <Text style={styles.statLabel}>Driver</Text>
              </View>
              <View style={styles.statSep} />
              <View style={styles.statItem}>
                <Feather name="dollar-sign" size={16} color="#FFD700" />
                <Text style={styles.statValue}>
                  {totalFare > 0 ? totalFare.toLocaleString() : offeredPrice.toLocaleString()}
                </Text>
                <Text style={styles.statLabel}>PKR</Text>
              </View>
            </View>

            {/* Route summary */}
            <View style={styles.routeRow}>
              <View style={styles.routePoint}>
                <View style={[styles.routeDot, { backgroundColor: "#FFD700" }]} />
                <Text style={styles.routeLabel} numberOfLines={1}>
                  {pickup.name ?? "Pickup"}
                </Text>
              </View>
              <Feather name="arrow-right" size={14} color="#444" style={{ marginHorizontal: 8 }} />
              <View style={styles.routePoint}>
                <View style={[styles.routeDot, { backgroundColor: "#22C55E" }]} />
                <Text style={styles.routeLabel} numberOfLines={1}>
                  {dropoff.name ?? "Destination"}
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* ── Ride completed modal ── */}
      {showCompleted && (
        <RideCompletedModal
          totalFare={totalFare > 0 ? totalFare : offeredPrice}
          offeredPrice={offeredPrice}
          rideTypeLabel={rideTypeLabel}
          onBackToHome={handleBackToHome}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },

  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
    zIndex: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.72)",
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.72)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.25)",
  },
  badgeOngoing: { borderColor: "rgba(34,197,94,0.4)" },
  badgeDone:    { borderColor: "rgba(255,215,0,0.5)" },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#FFD700",
  },
  statusText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 1.2,
  },

  panel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(8,8,8,0.97)",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "rgba(255,215,0,0.12)",
    paddingTop: 10,
    paddingHorizontal: 20,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,215,0,0.25)",
    alignSelf: "center",
    marginBottom: 4,
  },
  panelDivider: {
    height: 1,
    backgroundColor: "rgba(255,215,0,0.08)",
    marginBottom: 14,
  },

  content: { gap: 14, paddingBottom: 4 },

  contentHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  phaseTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 0.2,
  },
  phaseSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#666",
    marginTop: 3,
  },
  plateBadge: {
    backgroundColor: "#fff",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  plateText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: "#000",
    letterSpacing: 1,
  },

  statsRow: {
    flexDirection: "row",
    backgroundColor: "#111",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.1)",
    padding: 14,
    alignItems: "center",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  statLabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: "#555",
    letterSpacing: 0.5,
  },
  statSep: {
    width: 1,
    height: 36,
    backgroundColor: "rgba(255,215,0,0.1)",
  },

  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(34,197,94,0.1)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.3)",
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22C55E",
  },
  liveText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "#22C55E",
    letterSpacing: 1,
  },

  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    padding: 12,
  },
  routePoint: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  routeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  routeLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#888",
    flex: 1,
  },
});
