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
import type { PaymentMethod } from "@/components/ride/PaymentSelector";

interface RideCompletedModalProps {
  totalFare: number;
  offeredPrice: number;
  rideTypeLabel: string;
  paymentMethod: PaymentMethod;
  commissionRate?: number;
  onBackToHome: () => void;
}

export function RideCompletedModal({
  totalFare,
  offeredPrice,
  rideTypeLabel,
  paymentMethod,
  commissionRate = 0.2,
  onBackToHome,
}: RideCompletedModalProps) {
  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const slideAnim  = useRef(new Animated.Value(80)).current;
  const scaleAnim  = useRef(new Animated.Value(0.92)).current;
  const checkScale = useRef(new Animated.Value(0)).current;
  const checkOpacity = useRef(new Animated.Value(0)).current;
  const glowAnim   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 320, useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0, tension: 65, friction: 12, useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1, tension: 65, friction: 12, useNativeDriver: true,
      }),
    ]).start(() => {
      // Gold checkmark springs in after card settles
      Animated.parallel([
        Animated.spring(checkScale, {
          toValue: 1, tension: 80, friction: 8, useNativeDriver: true,
        }),
        Animated.timing(checkOpacity, {
          toValue: 1, duration: 200, useNativeDriver: true,
        }),
      ]).start(() => {
        // Glow pulse loop
        Animated.loop(
          Animated.sequence([
            Animated.timing(glowAnim, {
              toValue: 1, duration: 900, useNativeDriver: true,
            }),
            Animated.timing(glowAnim, {
              toValue: 0, duration: 900, useNativeDriver: true,
            }),
          ])
        ).start();
      });
    });
  }, [fadeAnim, slideAnim, scaleAnim, checkScale, checkOpacity, glowAnim]);

  const fare = totalFare > 0 ? totalFare : offeredPrice;
  const commissionAmount = Math.round(fare * commissionRate);
  const netEarnings = Math.max(0, fare - commissionAmount);

  const payLabel = paymentMethod === "wallet" ? "OTC Wallet" : "Cash";
  const payIcon  = paymentMethod === "wallet" ? "credit-card" : "dollar-sign";

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
        {/* Animated checkmark icon */}
        <View style={styles.iconWrap}>
          <Animated.View
            style={[
              styles.iconGlow,
              {
                opacity: glowAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.15, 0.40],
                }),
                transform: [
                  {
                    scale: glowAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.25],
                    }),
                  },
                ],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.iconRing,
              {
                opacity: checkOpacity,
                transform: [{ scale: checkScale }],
              },
            ]}
          >
            <Feather name="check" size={32} color="#000" />
          </Animated.View>
        </View>

        <Text style={styles.title}>Ride Completed</Text>
        <Text style={styles.subtitle}>
          Thank you for riding with{" "}
          <Text style={{ color: "#FFD700" }}>OTC</Text>
        </Text>

        <View style={styles.divider} />

        {/* Fare */}
        <View style={styles.fareSection}>
          <Text style={styles.fareLabel}>TOTAL FARE</Text>
          <Text style={styles.fareAmount}>PKR {fare.toLocaleString()}</Text>
        </View>

        <View style={styles.earningsCard}>
          <View style={styles.earningsRow}>
            <Text style={styles.earningsKey}>Commission</Text>
            <Text style={styles.deductionText}>- PKR {commissionAmount.toLocaleString()}</Text>
          </View>
          <View style={styles.earningsRow}>
            <Text style={styles.earningsKey}>Net earnings</Text>
            <Text style={styles.netText}>PKR {netEarnings.toLocaleString()}</Text>
          </View>
        </View>

        {/* Details */}
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
              <Feather name={payIcon} size={13} color="#666" />
              <Text style={styles.detailKey}>Paid via</Text>
            </View>
            <View style={styles.paidMethodBadge}>
              <Feather
                name={payIcon}
                size={11}
                color={paymentMethod === "wallet" ? "#FFD700" : "#22C55E"}
              />
              <Text
                style={[
                  styles.paidMethodText,
                  paymentMethod === "wallet"
                    ? styles.paidMethodWallet
                    : styles.paidMethodCash,
                ]}
              >
                {payLabel}
              </Text>
            </View>
          </View>

          <View style={styles.detailSep} />

          <View style={styles.detailRow}>
            <View style={styles.detailLeft}>
              <Feather name="shield" size={13} color="#666" />
              <Text style={styles.detailKey}>Status</Text>
            </View>
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>VERIFIED</Text>
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
    backgroundColor: "rgba(0,0,0,0.88)",
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
    borderColor: "rgba(255,215,0,0.22)",
    padding: 28,
    alignItems: "center",
    gap: 14,
  },

  iconWrap: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    width: 90,
    height: 90,
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
    backgroundColor: "rgba(255,215,0,0.25)",
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
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "#555",
    letterSpacing: 1.2,
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
  },
  earningsCard: {
    width: "100%",
    backgroundColor: "rgba(255,215,0,0.06)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.16)",
    padding: 14,
    gap: 8,
  },
  earningsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  earningsKey: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#bbb",
  },
  deductionText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#FF5A5F",
  },
  netText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#FFD700",
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

  paidMethodBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "rgba(255,215,0,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.2)",
  },
  paidMethodText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
  },
  paidMethodWallet: { color: "#FFD700" },
  paidMethodCash:   { color: "#22C55E" },

  verifiedBadge: {
    backgroundColor: "rgba(34,197,94,0.1)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.3)",
  },
  verifiedText: {
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
