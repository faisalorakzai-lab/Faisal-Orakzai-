import React from "react";
import { Feather } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export function SharedSpaceCard({
  trunkLiters,
  available,
  onToggle,
}: {
  trunkLiters: number;
  available: boolean;
  onToggle: () => void;
}) {
  return (
    <TouchableOpacity style={[styles.card, available && styles.cardActive]} onPress={onToggle} activeOpacity={0.85}>
      <View style={styles.row}>
        <View style={[styles.icon, available && styles.iconActive]}>
          <Feather name="truck" size={15} color={available ? "#000" : "#FFD700"} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Shared Space</Text>
          <Text style={styles.sub}>{available ? "Mini-delivery enabled" : "Tap to enable trunk delivery"}</Text>
        </View>
        <Text style={styles.value}>{trunkLiters}L</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,215,0,0.12)", backgroundColor: "#111", padding: 14 },
  cardActive: { borderColor: "rgba(34,197,94,0.35)", backgroundColor: "rgba(34,197,94,0.06)" },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  icon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,215,0,0.08)" },
  iconActive: { backgroundColor: "#22C55E" },
  title: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#fff" },
  sub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#666", marginTop: 2 },
  value: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFD700" },
});
