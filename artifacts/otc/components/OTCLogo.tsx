import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface OTCLogoProps {
  size?: "sm" | "md" | "lg";
}

export function OTCLogo({ size = "md" }: OTCLogoProps) {
  const scales = { sm: 0.7, md: 1, lg: 1.5 };
  const scale = scales[size];

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.badge,
          {
            width: 44 * scale,
            height: 44 * scale,
            borderRadius: 12 * scale,
          },
        ]}
      >
        <Text style={[styles.letters, { fontSize: 14 * scale }]}>OTC</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    backgroundColor: "#FFD700",
    alignItems: "center",
    justifyContent: "center",
  },
  letters: {
    color: "#050505",
    fontWeight: "800",
    letterSpacing: 0.5,
    fontFamily: "Inter_700Bold",
  },
});
