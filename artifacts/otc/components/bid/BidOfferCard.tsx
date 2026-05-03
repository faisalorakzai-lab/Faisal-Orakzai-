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
import type { BidOffer } from "@/hooks/useAblyBid";

const GOLD = "#FFD700";
const GOLD_DIM = "rgba(255,215,0,0.12)";

interface BidOfferCardProps {
  offer: BidOffer;
  suggestedFare: number;
  onAccept: (offer: BidOffer) => void;
  onReject: (offer: BidOffer) => void;
  disabled?: boolean;
}

export function BidOfferCard({
  offer,
  suggestedFare,
  onAccept,
  onReject,
  disabled,
}: BidOfferCardProps) {
  const slideIn = useRef(new Animated.Value(40)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideIn, {
        toValue: 0,
        tension: 70,
        friction: 11,
        useNativeDriver: true,
      }),
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideIn, fadeIn]);

  const diff = offer.offered_fare - suggestedFare;
  const diffPct = suggestedFare > 0 ? Math.round((diff / suggestedFare) * 100) : 0;
  const isLower = diff < 0;
  const isAccepted = offer.status === "accepted";
  const isRejected = offer.status === "rejected";

  function handleAccept() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onAccept(offer);
  }

  function handleReject() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onReject(offer);
  }

  const initial = offer.driver_name.charAt(0).toUpperCase();

  return (
    <Animated.View
      style={[
        styles.card,
        isAccepted && styles.cardAccepted,
        isRejected && styles.cardRejected,
        { opacity: fadeIn, transform: [{ translateY: slideIn }] },
      ]}
    >
      {isAccepted && (
        <View style={styles.statusBanner}>
          <Feather name="check-circle" size={12} color="#22C55E" />
          <Text style={[styles.statusText, { color: "#22C55E" }]}>ACCEPTED</Text>
        </View>
      )}
      {isRejected && (
        <View style={styles.statusBanner}>
          <Feather name="x-circle" size={12} color="#666" />
          <Text style={[styles.statusText, { color: "#666" }]}>DECLINED</Text>
        </View>
      )}

      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
          <View style={styles.onlineDot} />
        </View>
        <View style={styles.driverInfo}>
          <Text style={styles.driverName}>{offer.driver_name}</Text>
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Feather
                key={s}
                name="star"
                size={10}
                color={s <= Math.round(offer.driver_rating) ? GOLD : "#333"}
              />
            ))}
            <Text style={styles.ratingNum}>{offer.driver_rating.toFixed(1)}</Text>
          </View>
          {offer.driver_vehicle && (
            <Text style={styles.vehicleText} numberOfLines={1}>
              {offer.driver_vehicle}
              {offer.driver_plate ? ` · ${offer.driver_plate}` : ""}
            </Text>
          )}
        </View>
        <View style={styles.etaPill}>
          <Feather name="clock" size={10} color="#000" />
          <Text style={styles.etaText}>{offer.eta} min</Text>
        </View>
      </View>

      <View style={styles.fareRow}>
        <View style={styles.fareSide}>
          <Text style={styles.fareLabel}>OFFERED FARE</Text>
          <Text style={styles.fareAmount}>PKR {offer.offered_fare.toLocaleString()}</Text>
        </View>
        <View style={[styles.diffBadge, isLower ? styles.diffLow : styles.diffHigh]}>
          <Feather
            name={isLower ? "trending-down" : diff === 0 ? "minus" : "trending-up"}
            size={12}
            color={isLower ? "#22C55E" : diff === 0 ? GOLD : "#F87171"}
          />
          <Text
            style={[
              styles.diffText,
              { color: isLower ? "#22C55E" : diff === 0 ? GOLD : "#F87171" },
            ]}
          >
            {diff === 0
              ? "Exact match"
              : `${isLower ? "-" : "+"}${Math.abs(diffPct)}% (PKR ${Math.abs(diff).toLocaleString()})`}
          </Text>
        </View>
      </View>

      {!isAccepted && !isRejected && !disabled && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.rejectBtn}
            onPress={handleReject}
            activeOpacity={0.8}
          >
            <Feather name="x" size={16} color="#F87171" />
            <Text style={styles.rejectText}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.acceptBtn}
            onPress={handleAccept}
            activeOpacity={0.85}
          >
            <Feather name="check" size={16} color="#000" />
            <Text style={styles.acceptText}>Accept · PKR {offer.offered_fare.toLocaleString()}</Text>
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#111",
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "rgba(255,215,0,0.22)",
    padding: 16,
    gap: 14,
  },
  cardAccepted: {
    borderColor: "rgba(34,197,94,0.4)",
    backgroundColor: "rgba(34,197,94,0.04)",
  },
  cardRejected: {
    borderColor: "rgba(255,255,255,0.06)",
    opacity: 0.5,
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  statusText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(255,215,0,0.12)",
    borderWidth: 1.5,
    borderColor: "rgba(255,215,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: GOLD,
  },
  onlineDot: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#111",
  },
  driverInfo: { flex: 1, gap: 3 },
  driverName: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 0.2,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  ratingNum: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "#888",
    marginLeft: 2,
  },
  vehicleText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#666",
    marginTop: 1,
  },
  etaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: GOLD,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  etaText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "#000",
  },
  fareRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fareSide: { gap: 2 },
  fareLabel: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: "#555",
    letterSpacing: 1.2,
  },
  fareAmount: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: GOLD,
  },
  diffBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  diffLow: { backgroundColor: "rgba(34,197,94,0.1)" },
  diffHigh: { backgroundColor: "rgba(248,113,113,0.1)" },
  diffText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.3)",
    borderRadius: 12,
    paddingVertical: 12,
    backgroundColor: "rgba(248,113,113,0.06)",
  },
  rejectText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#F87171",
  },
  acceptBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: 12,
  },
  acceptText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#000",
  },
});
