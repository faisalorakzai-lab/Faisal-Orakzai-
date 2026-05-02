import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";

interface ProofOfRideCardProps {
  hash: string;
  gridNode: string;
  rideClass: string;
  timestamp?: number;
}

export function ProofOfRideCard({
  hash,
  gridNode,
  rideClass,
  timestamp,
}: ProofOfRideCardProps) {
  const colors = useColors();
  const [copied, setCopied] = useState(false);
  const [revealedChars, setRevealedChars] = useState(0);
  const glowAnim = useRef(new Animated.Value(0)).current;
  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Reveal hash char by char
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setRevealedChars(i);
      if (i >= hash.length) clearInterval(interval);
    }, 40);

    // Glow pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.3, duration: 1500, useNativeDriver: true }),
      ])
    ).start();

    // Scan line animation
    Animated.loop(
      Animated.timing(scanAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();

    return () => clearInterval(interval);
  }, [hash, glowAnim, scanAnim]);

  async function handleCopy() {
    await Clipboard.setStringAsync(hash);
    setCopied(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => setCopied(false), 2000);
  }

  const displayHash = hash.slice(0, revealedChars) + "█".repeat(Math.max(0, hash.length - revealedChars - 1));
  const classLabel = rideClass.charAt(0).toUpperCase() + rideClass.slice(1);
  const ts = timestamp ? new Date(timestamp).toLocaleTimeString("en-PK") : "";

  return (
    <Animated.View
      style={[
        styles.card,
        {
          borderColor: glowAnim.interpolate({
            inputRange: [0.3, 1],
            outputRange: ["rgba(255,215,0,0.15)", "rgba(255,215,0,0.4)"],
          }),
          borderRadius: colors.radius,
        },
      ]}
    >
      {/* Scan line */}
      <Animated.View
        style={[
          styles.scanLine,
          {
            transform: [
              {
                translateY: scanAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 140],
                }),
              },
            ],
          },
        ]}
        pointerEvents="none"
      />

      <View style={styles.topRow}>
        <View style={styles.chainIcon}>
          <Feather name="link" size={16} color={colors.gold} />
        </View>
        <View>
          <Text style={[styles.title, { color: colors.gold }]}>
            Proof of Ride™
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Sovereign Grid Certificate
          </Text>
        </View>
        <TouchableOpacity onPress={handleCopy} style={styles.copyBtn}>
          <Feather
            name={copied ? "check" : "copy"}
            size={16}
            color={copied ? "#22C55E" : colors.gold}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.hashBlock}>
        <Text style={[styles.hashLabel, { color: colors.mutedForeground }]}>
          TRANSACTION HASH
        </Text>
        <Text style={[styles.hash, { color: colors.gold }]} numberOfLines={1}>
          {displayHash}
        </Text>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>
            GRID NODE
          </Text>
          <Text style={[styles.metaVal, { color: colors.foreground }]}>
            {gridNode}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>
            CLASS
          </Text>
          <Text style={[styles.metaVal, { color: colors.foreground }]}>
            {classLabel}
          </Text>
        </View>
        {ts ? (
          <View style={styles.metaItem}>
            <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>
              TIME
            </Text>
            <Text style={[styles.metaVal, { color: colors.foreground }]}>
              {ts}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.statusRow}>
        <View style={styles.statusDot} />
        <Text style={[styles.statusText, { color: "#22C55E" }]}>
          Confirmed on Orakzai Sovereign Grid
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(5,10,2,0.98)",
    borderWidth: 1,
    padding: 16,
    gap: 14,
    overflow: "hidden",
    position: "relative",
  },
  scanLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,215,0,0.12)",
    zIndex: 1,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  chainIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,215,0,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.5,
  },
  copyBtn: {
    marginLeft: "auto",
    padding: 4,
  },
  hashBlock: {
    backgroundColor: "rgba(255,215,0,0.04)",
    borderRadius: 8,
    padding: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.08)",
  },
  hashLabel: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  hash: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metaItem: { gap: 4 },
  metaLabel: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  metaVal: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#22C55E",
    shadowColor: "#22C55E",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.3,
  },
});
