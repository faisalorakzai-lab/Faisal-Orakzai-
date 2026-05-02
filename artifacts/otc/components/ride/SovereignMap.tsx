import Constants from "expo-constants";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";

const { width } = Dimensions.get("window");
const MAP_H = 260;
const MAP_W = width - 48;

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string>;
const MAPBOX_TOKEN: string = extra.mapboxToken ?? "";

function buildMapboxUrl(w: number, h: number): string | null {
  if (!MAPBOX_TOKEN) return null;
  const pw = Math.min(Math.round(w), 1280);
  const ph = Math.min(Math.round(h), 1280);
  return (
    `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/` +
    `67.0011,24.8607,11,0/${pw}x${ph}@2x` +
    `?access_token=${MAPBOX_TOKEN}&logo=false&attribution=false`
  );
}

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
  const left = x * MAP_W - dotSize / 2;
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
              color: "rgba(255,215,0,0.7)",
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

function MovingVehicle({
  startX,
  startY,
  color,
}: {
  startX: number;
  startY: number;
  color: string;
}) {
  const x = useRef(new Animated.Value(startX * MAP_W)).current;
  const y = useRef(new Animated.Value(startY * MAP_H)).current;

  useEffect(() => {
    function randomMove() {
      const tx = Math.random() * MAP_W;
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
        width: 7,
        height: 7,
        borderRadius: 3.5,
        backgroundColor: color,
        transform: [{ translateX: x }, { translateY: y }],
        shadowColor: color,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 4,
      }}
    />
  );
}

interface SovereignMapProps {
  pickupLabel?: string;
  dropoffLabel?: string;
  driverLat?: number;
  driverLng?: number;
}

export function SovereignMap({
  pickupLabel,
  dropoffLabel,
}: SovereignMapProps) {
  const mapboxUrl = buildMapboxUrl(MAP_W, MAP_H);

  return (
    <View style={styles.container}>
      <View style={styles.mapWrapper}>
        <View style={styles.map}>
          {/* Real Mapbox satellite/dark base map */}
          {mapboxUrl ? (
            <Image
              source={{ uri: mapboxUrl }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
          ) : null}

          {/* Dark overlay to unify with app theme */}
          <View style={styles.darkOverlay} />

          {/* Grid lines */}
          {Array.from({ length: 8 }).map((_, i) => (
            <View
              key={`h${i}`}
              style={[styles.gridH, { top: (i / 8) * MAP_H }]}
            />
          ))}
          {Array.from({ length: 12 }).map((_, i) => (
            <View
              key={`v${i}`}
              style={[styles.gridV, { left: (i / 12) * MAP_W }]}
            />
          ))}

          {/* Road highlights */}
          <View style={[styles.road, { top: MAP_H * 0.3, left: 0, right: 0, height: 2 }]} />
          <View style={[styles.road, { top: MAP_H * 0.55, left: 0, right: 0, height: 1.5 }]} />
          <View style={[styles.road, { left: MAP_W * 0.4, top: 0, bottom: 0, width: 1.5 }]} />
          <View style={[styles.road, { left: MAP_W * 0.65, top: 0, bottom: 0, width: 1 }]} />

          {/* Moving sovereign vehicles */}
          <MovingVehicle startX={0.1} startY={0.3} color="#FFD700" />
          <MovingVehicle startX={0.6} startY={0.5} color="#FFD700" />
          <MovingVehicle startX={0.8} startY={0.2} color="rgba(255,215,0,0.5)" />
          <MovingVehicle startX={0.35} startY={0.7} color="rgba(255,243,163,0.7)" />
          <MovingVehicle startX={0.5} startY={0.1} color="#FFD700" />

          {/* Hotspot demand rings */}
          {HOTSPOTS.map((h, i) => (
            <PulsingDot key={i} {...h} delay={i * 300} />
          ))}

          {/* User location pin */}
          <View
            style={[
              styles.userPin,
              { left: MAP_W * 0.42 - 6, top: MAP_H * 0.45 - 6 },
            ]}
          >
            <View style={styles.userPinInner} />
            <View style={styles.userPinRing} />
          </View>

          {/* Mapbox attribution (required by ToS) */}
          {mapboxUrl ? (
            <View style={styles.attribution}>
              <Text style={styles.attributionText}>© Mapbox © OSM</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#FFD700" }]} />
          <Text style={styles.legendText}>High Demand</Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendDot, { backgroundColor: "#FFD700", opacity: 0.4 }]}
          />
          <Text style={styles.legendText}>Sovereign Grid</Text>
        </View>
        {mapboxUrl ? (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#22C55E" }]} />
            <Text style={styles.legendText}>Live Map</Text>
          </View>
        ) : null}
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
    borderColor: "rgba(255,215,0,0.2)",
  },
  map: {
    height: MAP_H,
    backgroundColor: "#050A05",
    overflow: "hidden",
    position: "relative",
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5,5,5,0.55)",
  },
  gridH: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,215,0,0.05)",
  },
  gridV: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "rgba(255,215,0,0.05)",
  },
  road: {
    position: "absolute",
    backgroundColor: "rgba(255,215,0,0.12)",
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
    borderColor: "rgba(255,215,0,0.5)",
  },
  attribution: {
    position: "absolute",
    bottom: 4,
    right: 6,
  },
  attributionText: {
    fontSize: 8,
    color: "rgba(255,255,255,0.4)",
    fontFamily: "Inter_400Regular",
  },
  legend: {
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 4,
    paddingTop: 8,
    flexWrap: "wrap",
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
