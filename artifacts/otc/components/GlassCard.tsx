import React from "react";
import {
  StyleSheet,
  View,
  type ViewStyle,
  type StyleProp,
} from "react-native";
import { useColors } from "@/hooks/useColors";

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: "default" | "gold" | "dark";
}

export function GlassCard({
  children,
  style,
  variant = "default",
}: GlassCardProps) {
  const colors = useColors();

  const variantStyle: ViewStyle =
    variant === "gold"
      ? {
          backgroundColor: "rgba(255, 215, 0, 0.08)",
          borderColor: "rgba(255, 215, 0, 0.3)",
        }
      : variant === "dark"
      ? {
          backgroundColor: "rgba(5, 5, 5, 0.9)",
          borderColor: "rgba(255, 215, 0, 0.1)",
        }
      : {
          backgroundColor: colors.glassBackground,
          borderColor: colors.glassBorder,
        };

  return (
    <View
      style={[
        styles.card,
        { borderRadius: colors.radius },
        variantStyle,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    overflow: "hidden",
  },
});
