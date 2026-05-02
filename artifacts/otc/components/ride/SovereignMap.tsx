import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  View,
} from "react-native";

const { width } = Dimensions.get("window");
const MAP_H = 260;

interface Hotspot {
  x: number;
  y: number;
  intensity: number;
  label: string;
}

const HOTSPOTS: Hotspot[] = [
  { x: 0.2, y: 0.35, intensity: 1, label: "DHA" },
  { x: 0.55, y: 0.25, intensity: 0.7, label: "Clifton" },
  { x: 0.75, y: 0.55, intensity: 0.9, label: "Gulshan" },
  { x: 0.38, y: 0.65, intensity: 0.5, label: "PECHS" },
  { x: 0.65, y: 0.78, intensity: 0.8, label: "Saddar" },
  { x: 0.15, y: 0.7, intensity: 0.4, label: "Korangi" },
  { x: 0.85, y: 0.3, intensity: 0.6, label: "North Nzb" },
];

const GRID_LINES_H = 8;
const GRID_LINES_V = 12;

function PulsingDot({
  x,
  y,
  intensity,
  label,
  delay,
}: Hotspot & { delay: number }) {
  const pulse1 = useRef(new Animated.Value(0)).current;
  const pulse2 = useRef(new Animated.Value(0)).current;
  const opacity1 = useRef(new Animated.Value(1)).current;
  const opacity2 = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const duration = 1800 + Math.random() * 600;
    const anim = Animated.loop(
      Animated.stagger(duration / 2, [
        Animated.parallel([
          Animated.timing(pulse1, {
            toValue: 1,
            duration,
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(opacity1, {
            toValue: 0,
            duration,
            delay,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulse2, {
            toValue: 1,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(opacity2, {
            toValue: 0,
            duration,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [delay, pulse1, pulse2, opacity1, opacity2]);

  const dotSize = 6 + intensity * 8;
  const maxScale = 2.5 + intensity * 1.5;
  const left = x * (width - 48) - dotSize / 2;
  const top = y * MAP_H - dotSize / 2;

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}>
      <View style={{ position: "absolute", left, top, alignItems: "center", justifyContent: "center" }}>
        <Animated.View
          style={{
            position: "absolute",
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            backgroundColor: `rgba(255,215,0,${0.15 * intensity})`,
            transform: [
              {
                scale: pulse1.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, maxScale],
                }),
              },
            ],
            opacity: opacity1,
          }}
        />
        <Animated.View
          style={{
            position: "absolute",
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            backgroundColor: `rgba(255,215,0,${0.1 * intensity})`,
            transform: [
              {
                scale: pulse2.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, maxScale * 0.7],
                }),
              },
            ],
            opacity: opacity2,
          }}
        />
        <View
          style={{
            width: dotSize * 0.5,
            height: dotSize * 0.5,
            borderRadius: dotSize * 0.25,
            backgroundColor: "#FFD700",
            shadowColor: "#FFD700",
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.9,
            shadowRadius: 6,
          }}
        />
        {intensity > 0.6 && (
          <Text
            style={{
              position: "absolute",
              top: dotSize * 0.5 + 2,
              fontSize: 8,
              color: "rgba(255,215,0,0.6)",
              fontFamily: "Inter_500Medium",
              letterSpacing: 0.3,
              width: 50,
              textAlign: "center",
              left: -20,
            }}
          >
            {label}
          </Text>
        )}
      </View>
    </View>
  );
}

interface MoverDot {
  x: Animated.Value;
  y: Animated.Value;
}

function MovingVehicle({ startX, startY, color }: { startX: number; startY: number; color: string }) {
  const x = useRef(new Animated.Value(startX * (width - 48))).current;
  const y = useRef(new Animated.Value(startY * MAP_H)).current;

  useEffect(() => {
    function randomMove() {
      const tx = Math.random() * (width - 48);
      const ty = Math.random() * MAP_H;
      Animated.parallel([
        Animated.timing(x, {
          toValue: tx,
          duration: 4000 + Math.random() * 3000,
          useNativeDriver: true,
        }),
        Animated.timing(y, {
          toValue: ty,
          duration: 4000 + Math.random() * 3000,
          useNativeDriver: true,
        }),
      ]).start(randomMove);
    }
    randomMove();
  }, [x, y]);

  return (
    <Animated.View
      style={{
        position: "absolute",
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: color,
        transform: [{ translateX: x }, { translateY: y }],
        shadowColor: color,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 3,
      }}
    />
  );
}

interface SovereignMapProps {
  pickupLabel?: string;
  dropoffLabel?: string;
}

export function SovereignMap({ pickupLabel, dropoffLabel }: SovereignMapProps) {
  const tilt = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(tilt, { toValue: 1, duration: 6000, useNativeDriver: true }),
        Animated.timing(tilt, { toValue: 0, duration: 6000, useNativeDriver: true }),
      ])
    ).start();
  }, [tilt]);

  return (
    <View style={styles.container}>
      <View style={styles.mapWrapper}>
        <View style={styles.map}>
          {/* Grid lines */}
          {Array.from({ length: GRID_LINES_H }).map((_, i) => (
            <View
              key={`h${i}`}
              style={[
                styles.gridH,
                { top: (i / GRID_LINES_H) * MAP_H },
              ]}
            />
          ))}
          {Array.from({ length: GRID_LINES_V }).map((_, i) => (
            <View
              key={`v${i}`}
              style={[
                styles.gridV,
                { left: (i / GRID_LINES_V) * (width - 48) },
              ]}
            />
          ))}

          {/* Road-like shapes */}
          <View style={[styles.road, { top: MAP_H * 0.3, left: 0, right: 0, height: 2 }]} />
          <View style={[styles.road, { top: MAP_H * 0.55, left: 0, right: 0, height: 1.5 }]} />
          <View style={[styles.road, { left: (width - 48) * 0.4, top: 0, bottom: 0, width: 1.5 }]} />
          <View style={[styles.road, { left: (width - 48) * 0.65, top: 0, bottom: 0, width: 1 }]} />

          {/* Moving vehicles */}
          <MovingVehicle startX={0.1} startY={0.3} color="#FFD700" />
          <MovingVehicle startX={0.6} startY={0.5} color="#FFD700" />
          <MovingVehicle startX={0.8} startY={0.2} color="rgba(255,215,0,0.5)" />
          <MovingVehicle startX={0.35} startY={0.7} color="rgba(255,243,163,0.7)" />
          <MovingVehicle startX={0.5} startY={0.1} color="#FFD700" />

          {/* Hotspots */}
          {HOTSPOTS.map((h, i) => (
            <PulsingDot key={i} {...h} delay={i * 300} />
          ))}

          {/* User location pin */}
          <View style={[styles.userPin, { left: (width - 48) * 0.42 - 6, top: MAP_H * 0.45 - 6 }]}>
            <View style={styles.userPinInner} />
            <View style={styles.userPinRing} />
          </View>
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#FFD700" }]} />
          <Text style={styles.legendText}>High Demand</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#FFD700", opacity: 0.4 }]} />
          <Text style={styles.legendText}>Sovereign Grid</Text>
        </View>
        {pickupLabel && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#22C55E" }]} />
            <Text style={styles.legendText}>{pickupLabel}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%" },
  mapWrapper: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.15)",
  },
  map: {
    height: MAP_H,
    backgroundColor: "#050A05",
    overflow: "hidden",
    position: "relative",
  },
  gridH: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,215,0,0.04)",
  },
  gridV: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "rgba(255,215,0,0.04)",
  },
  road: {
    position: "absolute",
    backgroundColor: "rgba(255,215,0,0.08)",
  },
  userPin: {
    position: "absolute",
    width: 14,
    height: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  userPinInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFD700",
    zIndex: 2,
  },
  userPinRing: {
    position: "absolute",
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "rgba(255,215,0,0.4)",
  },
  legend: {
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 4,
    paddingTop: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 10,
    color: "rgba(255,215,0,0.5)",
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.3,
  },
});
