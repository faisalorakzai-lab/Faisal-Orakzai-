import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

interface CoinBadgeProps {
  amount: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function CoinBadge({
  amount,
  size = "md",
  showLabel = false,
}: CoinBadgeProps) {
  const iconSize = size === "sm" ? 12 : size === "lg" ? 20 : 16;
  const fontSize = size === "sm" ? 12 : size === "lg" ? 22 : 16;

  return (
    <View style={styles.row}>
      <Feather name="star" size={iconSize} color="#FFD700" />
      <Text style={[styles.amount, { fontSize }]}>
        {" "}
        {amount.toLocaleString()}
      </Text>
      {showLabel && <Text style={styles.label}> OTC Coins</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  amount: {
    color: "#FFD700",
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
  },
  label: {
    color: "#8A8060",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
});
