import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { ComponentProps, useRef } from "react";
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import type { RideClass } from "@/contexts/RideContext";
import { useColors } from "@/hooks/useColors";

type McIconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

export interface OtcRideType {
  id: RideClass;
  label: string;
  subtitle: string;
  icon: McIconName;
  tag: string;
  tagColor: string;
  multiplier: number;
  eta: string;
  baseRate: number;
}

export const OTC_RIDE_TYPES: OtcRideType[] = [
  {
    id: "community",
    label: "OTC Bike",
    subtitle: "Economical & Fast",
    icon: "motorbike",
    tag: "SAVE",
    tagColor: "#34D399",
    multiplier: 0.75,
    eta: "3–6 min",
    baseRate: 22,
  },
  {
    id: "autonomous",
    label: "OTC Prime",
    subtitle: "Daily Comfort",
    icon: "car-side",
    tag: "POPULAR",
    tagColor: "#A78BFA",
    multiplier: 1.0,
    eta: "5–8 min",
    baseRate: 38,
  },
  {
    id: "sovereign",
    label: "OTC Lux",
    subtitle: "Elite Executive",
    icon: "car-sports",
    tag: "ELITE",
    tagColor: "#FFD700",
    multiplier: 1.75,
    eta: "6–10 min",
    baseRate: 65,
  },
];

interface OtcRideTypeSelectorProps {
  selected: RideClass;
  onSelect: (c: RideClass, type: OtcRideType) => void;
  distanceKm: number;
}

export function OtcRideTypeSelector({
  selected,
  onSelect,
  distanceKm,
}: OtcRideTypeSelectorProps) {
  const colors = useColors();
  const glows = useRef(OTC_RIDE_TYPES.map(() => new Animated.Value(0))).current;

  function handlePress(type: OtcRideType, i: number) {
    onSelect(type.id, type);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.timing(glows[i], {
        toValue: 1,
        duration: 140,
        useNativeDriver: true,
      }),
      Animated.timing(glows[i], {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
    >
      {OTC_RIDE_TYPES.map((t, i) => {
        const active = selected === t.id;
        const price =
          distanceKm > 0 ? Math.round(distanceKm * t.baseRate) : null;

        return (
          <TouchableOpacity
            key={t.id}
            onPress={() => handlePress(t, i)}
            activeOpacity={0.85}
          >
            <View style={styles.cardOuter}>
              {/* Gold glow overlay — fades in on press via useNativeDriver */}
              <Animated.View
                style={[
                  StyleSheet.absoluteFill,
                  styles.glowOverlay,
                  { opacity: glows[i] },
                ]}
                pointerEvents="none"
              />

              <View
                style={[
                  styles.card,
                  {
                    borderColor: active
                      ? colors.gold
                      : "rgba(255,215,0,0.12)",
                    backgroundColor: active
                      ? "rgba(255,215,0,0.07)"
                      : "#111111",
                    elevation: active ? 6 : 2,
                  },
                ]}
              >
                <View style={styles.topRow}>
                  <View
                    style={[
                      styles.iconBox,
                      {
                        backgroundColor: active
                          ? "rgba(255,215,0,0.14)"
                          : "rgba(255,215,0,0.05)",
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={t.icon}
                      size={28}
                      color={active ? colors.gold : colors.mutedForeground}
                    />
                  </View>
                  <View
                    style={[
                      styles.tag,
                      {
                        backgroundColor: `${t.tagColor}18`,
                        borderColor: `${t.tagColor}40`,
                      },
                    ]}
                  >
                    <Text style={[styles.tagText, { color: t.tagColor }]}>
                      {t.tag}
                    </Text>
                  </View>
                </View>

                <Text
                  style={[
                    styles.name,
                    { color: active ? colors.gold : colors.foreground },
                  ]}
                >
                  {t.label}
                </Text>
                <Text style={[styles.sub, { color: colors.mutedForeground }]}>
                  {t.subtitle}
                </Text>
                <Text style={[styles.eta, { color: colors.mutedForeground }]}>
                  {t.eta}
                </Text>

                {price !== null && (
                  <Text
                    style={[
                      styles.price,
                      { color: active ? colors.gold : colors.foreground },
                    ]}
                  >
                    PKR {price.toLocaleString()}
                  </Text>
                )}

                {active && (
                  <View
                    style={[
                      styles.selectedBar,
                      { backgroundColor: colors.gold },
                    ]}
                  />
                )}
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    gap: 12,
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
  cardOuter: {
    position: "relative",
    borderRadius: 17,
    overflow: "hidden",
  },
  glowOverlay: {
    borderRadius: 17,
    backgroundColor: "rgba(255,215,0,0.18)",
  },
  card: {
    width: 148,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    gap: 5,
    position: "relative",
    overflow: "hidden",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  tag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  tagText: {
    fontSize: 8,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  name: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.2,
  },
  sub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  eta: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.3,
  },
  price: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    marginTop: 4,
  },
  selectedBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    borderRadius: 2,
  },
});
