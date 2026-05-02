import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface RideCompletedModalProps {
  totalFare: number;
  offeredPrice: number;
  rideTypeLabel: string;
  onBackToHome: () => void;
}

export function RideCompletedModal({
  totalFare,
  offeredPrice,
  rideTypeLabel,
  onBackToHome,
}: RideCompletedModalProps) {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(80)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 350, useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0, tension: 65, friction: 12, useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1, tension: 65, friction: 12, useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, scaleAnim]);

  const fare = totalFare > 0 ? totalFare : offeredPrice;

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
      <Animated.View
        style={[
          styles.card,
          {
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim },
            ],
          },
        ]}
      >
        {/* Success icon */}
        <View style={styles.iconWrap}>
          <View style={styles.iconRing}>
            <Feather name="check" size={32} color="#000" />
          </View>
          <View style={styles.iconGlow} />
        </View>

        <Text style={styles.title}>Ride Completed</Text>
        <Text style={styles.subtitle}>
          Thank you for riding with{" "}
          <Text style={{ color: "#FFD700" }}>OTC</Text>
        </Text>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Fare row */}
        <View style={styles.fareSection}>
          <Text style={styles.fareLabel}>Total Fare</Text>
          <Text style={styles.fareAmount}>PKR {fare.toLocaleString()}</Text>
        </View>

        {/* Detail rows */}
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <View style={styles.detailLeft}>
              <Feather name="tag" size={13} color="#666" />
              <Text style={styles.detailKey}>Ride Type</Text>
            </View>
            <Text style={styles.detailVal}>{rideTypeLabel}</Text>
          </View>

          <View style={styles.detailSep} />

          <View style={styles.detailRow}>
            <View style={styles.detailLeft}>
              <Feather name="credit-card" size={13} color="#666" />
              <Text style={styles.detailKey}>Paid via</Text>
            </View>
            <Text style={styles.detailVal}>Cash</Text>
          </View>

          <View style={styles.detailSep} />

          <View style={styles.detailRow}>
            <View style={styles.detailLeft}>
              <Feather name="shield" size={13} color="#666" />
              <Text style={styles.detailKey}>Status</Text>
            </View>
            <View style={styles.paidBadge}>
              <Text style={styles.paidText}>VERIFIED</Text>
            </View>
          </View>
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={styles.homeBtn}
          onPress={onBackToHome}
          activeOpacity={0.85}
        >
          <Feather name="home" size={18} color="#000" />
          <Text style={styles.homeBtnText}>Back to Home</Text>
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          Rate your ride in the History tab
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.85)",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 32,
    paddingHorizontal: 16,
  },

  card: {
    width: "100%",
    backgroundColor: "#0C0C0C",
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: "rgba(255,215,0,0.2)",
    padding: 28,
    alignItems: "center",
    gap: 14,
  },

  iconWrap: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  iconRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#FFD700",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  iconGlow: {
    position: "absolute",
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255,215,0,0.15)",
    zIndex: 1,
  },

  title: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#666",
  },

  divider: {
    width: "100%",
    height: 1,
    backgroundColor: "rgba(255,215,0,0.1)",
    marginVertical: 4,
  },

  fareSection: { alignItems: "center", gap: 4 },
  fareLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "#555",
    letterSpacing: 1,
  },
  fareAmount: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    color: "#FFD700",
    letterSpacing: -0.5,
  },

  detailsCard: {
    width: "100%",
    backgroundColor: "#111",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    padding: 16,
    gap: 0,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  detailLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  detailKey: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#666",
  },
  detailVal: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  detailSep: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  paidBadge: {
    backgroundColor: "rgba(34,197,94,0.12)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.3)",
  },
  paidText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "#22C55E",
    letterSpacing: 0.8,
  },

  homeBtn: {
    width: "100%",
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
    marginTop: 4,
  },
  homeBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#000",
    letterSpacing: 0.3,
  },

  footerNote: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#333",
  },
});
