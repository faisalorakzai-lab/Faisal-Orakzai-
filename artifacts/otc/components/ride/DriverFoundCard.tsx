import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export interface DriverInfo {
  id: string;
  name: string;
  phone: string | null;
  vehicleModel: string | null;
  plate: string | null;
  rating: number;
  eta: number;
  totalFare: number;
  rideTypeLabel: string;
}

interface DriverFoundCardProps {
  driver: DriverInfo;
  onCancel: () => void;
  onStartRide: () => void;
}

export function DriverFoundCard({
  driver,
  onCancel,
  onStartRide,
}: DriverFoundCardProps) {
  const slideAnim = useRef(new Animated.Value(60)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 70,
        friction: 11,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, fadeAnim]);

  function handleCall() {
    if (!driver.phone) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(`tel:${driver.phone}`);
  }

  function handleCancel() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onCancel();
  }

  const initial = driver.name.charAt(0).toUpperCase();

  return (
    <Animated.View
      style={[
        styles.card,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* ── Header badge ── */}
      <View style={styles.headerRow}>
        <View style={styles.matchBadge}>
          <Feather name="check-circle" size={13} color="#22C55E" />
          <Text style={styles.matchText}>OTC Partner Matched</Text>
        </View>
        <View style={styles.etaBadge}>
          <Feather name="clock" size={11} color="#000" />
          <Text style={styles.etaText}>{driver.eta} min</Text>
        </View>
      </View>

      {/* ── Driver profile ── */}
      <View style={styles.profileRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarInitial}>{initial}</Text>
          <View style={styles.onlineDot} />
        </View>

        <View style={styles.profileInfo}>
          <Text style={styles.driverName}>{driver.name}</Text>
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Feather
                key={s}
                name="star"
                size={11}
                color={s <= Math.round(driver.rating) ? "#FFD700" : "#333"}
              />
            ))}
            <Text style={styles.ratingNum}>{driver.rating.toFixed(1)}</Text>
          </View>
        </View>

        <View style={styles.rideTypePill}>
          <Text style={styles.rideTypePillText}>{driver.rideTypeLabel}</Text>
        </View>
      </View>

      {/* ── Vehicle details ── */}
      <View style={styles.vehicleCard}>
        <View style={styles.vehicleRow}>
          <Feather name="truck" size={14} color="#FFD700" />
          <Text style={styles.vehicleModel}>
            {driver.vehicleModel ?? "OTC Partner Vehicle"}
          </Text>
        </View>
        {driver.plate && (
          <View style={styles.plateBox}>
            <Text style={styles.plateText}>{driver.plate}</Text>
          </View>
        )}
      </View>

      {/* ── Fare ── */}
      <View style={styles.fareRow}>
        <Text style={styles.fareLabel}>Total Fare</Text>
        <Text style={styles.fareAmount}>
          PKR {driver.totalFare.toLocaleString()}
        </Text>
      </View>

      {/* ── Action buttons ── */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={handleCancel}
          activeOpacity={0.8}
        >
          <Feather name="x" size={16} color="#F87171" />
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.callBtn,
            !driver.phone && styles.callBtnDisabled,
          ]}
          onPress={handleCall}
          activeOpacity={0.8}
          disabled={!driver.phone}
        >
          <Feather
            name="phone"
            size={16}
            color={driver.phone ? "#000" : "#555"}
          />
          <Text
            style={[
              styles.callText,
              !driver.phone && { color: "#555" },
            ]}
          >
            Call Driver
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Start ride CTA ── */}
      <TouchableOpacity
        style={styles.startBtn}
        onPress={onStartRide}
        activeOpacity={0.85}
      >
        <Feather name="play" size={18} color="#000" />
        <Text style={styles.startText}>Activate Ride Mode</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#111",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(255,215,0,0.25)",
    padding: 18,
    gap: 14,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  matchBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  matchText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: "#22C55E",
    letterSpacing: 0.4,
  },
  etaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFD700",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  etaText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: "#000",
  },

  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "rgba(255,215,0,0.1)",
    borderWidth: 2,
    borderColor: "#FFD700",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  avatarInitial: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#FFD700",
  },
  onlineDot: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#111",
  },
  profileInfo: { flex: 1, gap: 5 },
  driverName: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  ratingNum: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: "#FFD700",
    marginLeft: 4,
  },
  rideTypePill: {
    backgroundColor: "rgba(255,215,0,0.1)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.3)",
  },
  rideTypePillText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "#FFD700",
    letterSpacing: 0.5,
  },

  vehicleCard: {
    backgroundColor: "rgba(255,215,0,0.04)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.1)",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  vehicleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  vehicleModel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#ccc",
    flex: 1,
  },
  plateBox: {
    backgroundColor: "#fff",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  plateText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: "#000",
    letterSpacing: 1,
  },

  fareRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(255,215,0,0.1)",
  },
  fareLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "#666",
  },
  fareAmount: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: "#FFD700",
  },

  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.35)",
    backgroundColor: "rgba(248,113,113,0.07)",
  },
  cancelText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#F87171",
  },
  callBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#FFD700",
  },
  callBtnDisabled: {
    backgroundColor: "#222",
  },
  callText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#000",
  },

  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#FFD700",
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 10,
  },
  startText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#000",
    letterSpacing: 0.3,
  },
});
