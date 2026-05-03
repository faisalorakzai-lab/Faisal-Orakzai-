import React from "react";
import { StyleSheet, Text, View } from "react-native";

export function MicroInvestmentCard({ fare, amount }: { fare: number; amount: number }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>MICRO-INVESTMENT</Text>
      <Text style={styles.value}>2% of PKR {fare.toLocaleString()}</Text>
      <Text style={styles.sub}>PKR {amount.toLocaleString()} moved to your digital asset wallet</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,215,0,0.18)", backgroundColor: "#111", padding: 14, gap: 4 },
  title: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#666", letterSpacing: 1.4 },
  value: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFD700" },
  sub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#888" },
});
