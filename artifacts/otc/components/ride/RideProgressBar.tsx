import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

export type LivePhase = "assigned" | "ongoing" | "completed";

const STAGES = [
  { key: "searching", label: "Searching" },
  { key: "assigned",  label: "Assigned"  },
  { key: "ongoing",   label: "On Route"  },
  { key: "completed", label: "Done"      },
] as const;

function phaseToProgress(phase: LivePhase): number {
  if (phase === "assigned")  return 1;
  if (phase === "ongoing")   return 2;
  return 3;
}

interface RideProgressBarProps {
  phase: LivePhase;
}

export function RideProgressBar({ phase }: RideProgressBarProps) {
  const progress = useRef(new Animated.Value(phaseToProgress(phase))).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: phaseToProgress(phase),
      duration: 700,
      useNativeDriver: false,
    }).start();
  }, [phase, progress]);

  // Width of the fill line = progress/3 * 100%
  const fillWidth = progress.interpolate({
    inputRange: [0, 3],
    outputRange: ["0%", "100%"],
    extrapolate: "clamp",
  });

  return (
    <View style={styles.container}>
      {/* Track line */}
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { width: fillWidth }]} />
      </View>

      {/* Dots + labels */}
      <View style={styles.dotsRow}>
        {STAGES.map((s, i) => {
          const done = phaseToProgress(phase) >= i;
          const active =
            (phase === "assigned"  && i === 1) ||
            (phase === "ongoing"   && i === 2) ||
            (phase === "completed" && i === 3);
          return (
            <View key={s.key} style={styles.dotWrap}>
              <View
                style={[
                  styles.dot,
                  done  && styles.dotDone,
                  active && styles.dotActive,
                ]}
              >
                {active && <View style={styles.dotPulse} />}
              </View>
              <Text style={[styles.label, done && styles.labelDone]}>
                {s.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 16, paddingHorizontal: 8 },

  track: {
    position: "absolute",
    top: 24,
    left: 24,
    right: 24,
    height: 2,
    backgroundColor: "rgba(255,215,0,0.12)",
    borderRadius: 1,
  },
  fill: {
    height: "100%",
    backgroundColor: "#FFD700",
    borderRadius: 1,
  },

  dotsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  dotWrap: { alignItems: "center", gap: 6 },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#222",
    borderWidth: 2,
    borderColor: "rgba(255,215,0,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  dotDone: {
    backgroundColor: "#FFD700",
    borderColor: "#FFD700",
  },
  dotActive: {
    backgroundColor: "#FFD700",
    borderColor: "#FFD700",
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 6,
  },
  dotPulse: {
    position: "absolute",
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "rgba(255,215,0,0.4)",
  },
  label: {
    fontSize: 9,
    fontFamily: "Inter_500Medium",
    color: "#444",
    letterSpacing: 0.4,
  },
  labelDone: { color: "#FFD700" },
});
