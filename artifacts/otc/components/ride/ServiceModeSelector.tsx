import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export type ServiceMode = "silent" | "business" | "social";

const MODES: Array<{ id: ServiceMode; label: string; sub: string }> = [
  { id: "silent", label: "Silent", sub: "Quiet, minimal talk" },
  { id: "business", label: "Business", sub: "Professional ride" },
  { id: "social", label: "Social", sub: "Friendly conversation" },
];

export function ServiceModeSelector({ value, onChange }: { value: ServiceMode; onChange: (mode: ServiceMode) => void }) {
  return (
    <View style={styles.wrap}>
      {MODES.map((mode) => {
        const active = mode.id === value;
        return (
          <TouchableOpacity key={mode.id} style={[styles.card, active && styles.cardActive]} onPress={() => onChange(mode.id)} activeOpacity={0.85}>
            <Text style={[styles.label, active && styles.labelActive]}>{mode.label}</Text>
            <Text style={[styles.sub, active && styles.subActive]}>{mode.sub}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", gap: 10 },
  card: { flex: 1, borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,215,0,0.12)", backgroundColor: "#111", padding: 12, gap: 4 },
  cardActive: { borderColor: "rgba(255,215,0,0.35)", backgroundColor: "rgba(255,215,0,0.08)" },
  label: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#fff" },
  labelActive: { color: "#FFD700" },
  sub: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#666" },
  subActive: { color: "#ccc" },
});
