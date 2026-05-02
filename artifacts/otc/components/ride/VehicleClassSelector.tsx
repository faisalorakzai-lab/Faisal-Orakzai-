import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { RideClass } from "@/contexts/RideContext";
import { useColors } from "@/hooks/useColors";

interface ClassMeta {
  id: RideClass;
  label: string;
  subtitle: string;
  icon: string;
  tag: string;
  tagColor: string;
  description: string;
  multiplier: number;
  eta: string;
}

const CLASSES: ClassMeta[] = [
  {
    id: "sovereign",
    label: "Sovereign",
    subtitle: "Premium Experience",
    icon: "star",
    tag: "ELITE",
    tagColor: "#FFD700",
    description: "Top-tier vehicles. Curated drivers. White-glove service.",
    multiplier: 1.8,
    eta: "4–7 min",
  },
  {
    id: "autonomous",
    label: "Autonomous",
    subtitle: "Future-Ready",
    icon: "cpu",
    tag: "TECH",
    tagColor: "#A78BFA",
    description: "AI-optimized routing. Next-gen dashcam & telemetry.",
    multiplier: 1.4,
    eta: "6–10 min",
  },
  {
    id: "community",
    label: "Community",
    subtitle: "Orakzai Integrity",
    icon: "users",
    tag: "VALUE",
    tagColor: "#34D399",
    description: "Economical rides. Verified OTC partners. Zero compromise on safety.",
    multiplier: 1.0,
    eta: "3–6 min",
  },
];

interface VehicleClassSelectorProps {
  selected: RideClass;
  onSelect: (c: RideClass) => void;
  basePrice: number;
  personalizedPrice: (base: number) => number;
  discountRate: number;
}

export function VehicleClassSelector({
  selected,
  onSelect,
  basePrice,
  personalizedPrice,
  discountRate,
}: VehicleClassSelectorProps) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      {CLASSES.map((cls) => {
        const isSelected = selected === cls.id;
        const price = Math.round(basePrice * cls.multiplier);
        const final = personalizedPrice(price);
        const hasDiscount = final < price;

        return (
          <TouchableOpacity
            key={cls.id}
            onPress={() => {
              onSelect(cls.id);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            activeOpacity={0.85}
          >
            <View
              style={[
                styles.card,
                {
                  borderColor: isSelected ? colors.gold : "rgba(255,215,0,0.1)",
                  backgroundColor: isSelected
                    ? "rgba(255,215,0,0.07)"
                    : "rgba(255,255,255,0.02)",
                  borderRadius: colors.radius,
                },
              ]}
            >
              <View style={styles.left}>
                <View
                  style={[
                    styles.iconBox,
                    {
                      backgroundColor: isSelected
                        ? "rgba(255,215,0,0.12)"
                        : "rgba(255,215,0,0.04)",
                      borderRadius: 12,
                    },
                  ]}
                >
                  <Feather
                    name={cls.icon as any}
                    size={22}
                    color={isSelected ? colors.gold : colors.mutedForeground}
                  />
                </View>
                <View style={styles.textBlock}>
                  <View style={styles.nameRow}>
                    <Text
                      style={[
                        styles.name,
                        { color: isSelected ? colors.gold : colors.foreground },
                      ]}
                    >
                      {cls.label}
                    </Text>
                    <View
                      style={[
                        styles.tag,
                        {
                          backgroundColor: `${cls.tagColor}18`,
                          borderColor: `${cls.tagColor}40`,
                        },
                      ]}
                    >
                      <Text style={[styles.tagText, { color: cls.tagColor }]}>
                        {cls.tag}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                    {cls.description}
                  </Text>
                  <Text style={[styles.eta, { color: colors.mutedForeground }]}>
                    ETA {cls.eta}
                  </Text>
                </View>
              </View>
              <View style={styles.priceBlock}>
                {hasDiscount && (
                  <Text style={[styles.originalPrice, { color: colors.mutedForeground }]}>
                    PKR {price.toLocaleString()}
                  </Text>
                )}
                <Text
                  style={[
                    styles.price,
                    { color: isSelected ? colors.gold : colors.foreground },
                  ]}
                >
                  {final.toLocaleString()}
                </Text>
                {hasDiscount && (
                  <View
                    style={[
                      styles.discountBadge,
                      { backgroundColor: "rgba(34,197,94,0.12)" },
                    ]}
                  >
                    <Text style={[styles.discountText, { color: "#22C55E" }]}>
                      -{Math.round(discountRate * 100)}%
                    </Text>
                  </View>
                )}
              </View>
              {isSelected && (
                <View
                  style={[
                    styles.selectedIndicator,
                    { backgroundColor: colors.gold, borderRadius: 2 },
                  ]}
                />
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    padding: 14,
    position: "relative",
    overflow: "hidden",
  },
  left: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  iconBox: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  textBlock: { flex: 1, gap: 4 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { fontSize: 16, fontFamily: "Inter_700Bold" },
  tag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  tagText: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 16 },
  eta: { fontSize: 11, fontFamily: "Inter_500Medium", letterSpacing: 0.3 },
  priceBlock: {
    alignItems: "flex-end",
    gap: 3,
    minWidth: 70,
  },
  originalPrice: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textDecorationLine: "line-through",
  },
  price: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  discountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
  },
  selectedIndicator: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
});
