import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface DriverEquityCardProps {
  name: string;
  rating: number;
  equityPoints: number;
  totalRides: number;
  partnerSince: string;
  eta: number;
  rideClass: string;
}

export function DriverEquityCard({
  name,
  rating,
  equityPoints,
  totalRides,
  partnerSince,
  eta,
  rideClass,
}: DriverEquityCardProps) {
  const colors = useColors();
  const progressAnim = useRef(new Animated.Value(0)).current;
  const equityProgress = Math.min(equityPoints / 5000, 1);
  const nextTier = equityProgress < 0.2 ? "Silver Partner" : equityProgress < 0.5 ? "Gold Partner" : "Sovereign Partner";

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: equityProgress,
      duration: 1200,
      useNativeDriver: false,
    }).start();
  }, [equityProgress, progressAnim]);

  const classColors: Record<string, string> = {
    sovereign: "#FFD700",
    autonomous: "#A78BFA",
    community: "#34D399",
  };
  const classColor = classColors[rideClass] ?? "#FFD700";

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: "rgba(255,255,255,0.02)",
          borderColor: "rgba(255,215,0,0.12)",
          borderRadius: colors.radius,
        },
      ]}
    >
      <View style={styles.topRow}>
        <View
          style={[
            styles.avatar,
            { backgroundColor: "rgba(255,215,0,0.08)", borderColor: classColor, borderRadius: 24 },
          ]}
        >
          <Feather name="user" size={22} color={classColor} />
        </View>
        <View style={styles.driverInfo}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.foreground }]}>{name}</Text>
            <View style={[styles.partnerBadge, { backgroundColor: "rgba(255,215,0,0.1)", borderRadius: 4 }]}>
              <Feather name="shield" size={10} color={colors.gold} />
              <Text style={[styles.partnerText, { color: colors.gold }]}>PARTNER</Text>
            </View>
          </View>
          <View style={styles.ratingRow}>
            <Feather name="star" size={12} color={colors.gold} />
            <Text style={[styles.rating, { color: colors.foreground }]}>{rating.toFixed(1)}</Text>
            <Text style={[styles.dot, { color: colors.mutedForeground }]}>·</Text>
            <Text style={[styles.rides, { color: colors.mutedForeground }]}>{totalRides.toLocaleString()} rides</Text>
            <Text style={[styles.dot, { color: colors.mutedForeground }]}>·</Text>
            <Text style={[styles.rides, { color: colors.mutedForeground }]}>Since {partnerSince}</Text>
          </View>
        </View>
        <View style={styles.etaBubble}>
          <Text style={[styles.etaNum, { color: colors.gold }]}>{eta}</Text>
          <Text style={[styles.etaUnit, { color: colors.mutedForeground }]}>min</Text>
        </View>
      </View>

      {/* Equity Progress */}
      <View style={styles.equitySection}>
        <View style={styles.equityHeader}>
          <Text style={[styles.equityLabel, { color: colors.mutedForeground }]}>
            EQUITY POINTS
          </Text>
          <Text style={[styles.equityPoints, { color: colors.gold }]}>
            {equityPoints.toLocaleString()} EP
          </Text>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: "rgba(255,215,0,0.08)", borderRadius: 4 }]}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                backgroundColor: classColor,
                borderRadius: 4,
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0%", "100%"],
                }),
              },
            ]}
          />
        </View>
        <Text style={[styles.nextTierText, { color: colors.mutedForeground }]}>
          Next: <Text style={{ color: colors.gold }}>{nextTier}</Text>
        </Text>
      </View>

      <View style={styles.bottomRow}>
        <View style={styles.statItem}>
          <Feather name="trending-up" size={14} color={classColor} />
          <Text style={[styles.statText, { color: colors.foreground }]}>
            Equity Shareholder
          </Text>
        </View>
        <View style={[styles.classBadge, { borderColor: `${classColor}40`, backgroundColor: `${classColor}10`, borderRadius: 6 }]}>
          <Text style={[styles.classText, { color: classColor }]}>
            {rideClass.toUpperCase()} CLASS
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, padding: 16, gap: 14 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 50,
    height: 50,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  driverInfo: { flex: 1, gap: 4 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  partnerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.2)",
  },
  partnerText: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  rating: { fontSize: 13, fontFamily: "Inter_700Bold" },
  dot: { fontSize: 13 },
  rides: { fontSize: 11, fontFamily: "Inter_400Regular" },
  etaBubble: { alignItems: "center", gap: 0 },
  etaNum: { fontSize: 22, fontFamily: "Inter_700Bold" },
  etaUnit: { fontSize: 11, fontFamily: "Inter_400Regular" },
  equitySection: { gap: 8 },
  equityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  equityLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  equityPoints: { fontSize: 14, fontFamily: "Inter_700Bold" },
  progressTrack: { height: 6, overflow: "hidden" },
  progressFill: { height: "100%" },
  nextTierText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  statText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  classBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  classText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
});
