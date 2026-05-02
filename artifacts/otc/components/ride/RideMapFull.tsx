import Constants from "expo-constants";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  Text,
  View,
} from "react-native";

const { width: SCREEN_W } = Dimensions.get("window");
const MAP_H = 320;

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string>;
const MAPBOX_TOKEN = extra.mapboxToken ?? "";

export interface MapCoord {
  lat: number;
  lng: number;
  name?: string;
}

interface RideMapFullProps {
  pickup?: MapCoord | null;
  dropoff?: MapCoord | null;
  searching?: boolean;
  carPosition?: MapCoord | null;
  style?: object;
}

function buildMapUrl(
  pickup: MapCoord | null | undefined,
  dropoff: MapCoord | null | undefined,
  carPosition: MapCoord | null | undefined,
  w: number,
  h: number
): string | null {
  if (!MAPBOX_TOKEN) return null;
  const pw = Math.min(Math.round(w), 1280);
  const ph = Math.min(Math.round(h), 1280);
  const base = `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static`;
  const qs = `?access_token=${MAPBOX_TOKEN}&logo=false&attribution=false`;

  if (pickup && dropoff) {
    const geojson = JSON.stringify({
      type: "Feature",
      properties: {
        stroke: "#FFD700",
        "stroke-width": 3,
        "stroke-opacity": 0.9,
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [pickup.lng, pickup.lat],
          [dropoff.lng, dropoff.lat],
        ],
      },
    });
    const encodedGeo = encodeURIComponent(geojson);
    const pickMarker = `pin-s+FFD700(${pickup.lng},${pickup.lat})`;
    const dropMarker = `pin-s+22C55E(${dropoff.lng},${dropoff.lat})`;
    const carMarker  = carPosition
      ? `,pin-s+ffffff(${carPosition.lng},${carPosition.lat})`
      : "";
    const overlay = `geojson(${encodedGeo}),${pickMarker},${dropMarker}${carMarker}`;
    return `${base}/${overlay}/auto/${pw}x${ph}@2x${qs}&padding=70,40,70,40`;
  }

  if (pickup) {
    const marker  = `pin-s+FFD700(${pickup.lng},${pickup.lat})`;
    const carMark = carPosition
      ? `,pin-s+ffffff(${carPosition.lng},${carPosition.lat})`
      : "";
    const overlay = `${marker}${carMark}`;
    const center  = carPosition
      ? `${(pickup.lng + carPosition.lng) / 2},${(pickup.lat + carPosition.lat) / 2},12,0`
      : `${pickup.lng},${pickup.lat},13,0`;
    return `${base}/${overlay}/${center}/${pw}x${ph}@2x${qs}`;
  }

  return `${base}/67.0011,24.8607,11,0/${pw}x${ph}@2x${qs}`;
}

// Three concentric pulse rings for searching state
function PulseRings() {
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const ring3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    function makeLoop(anim: Animated.Value, delay: number) {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 1800,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
    }
    const l1 = makeLoop(ring1, 0);
    const l2 = makeLoop(ring2, 500);
    const l3 = makeLoop(ring3, 1000);
    l1.start(); l2.start(); l3.start();
    return () => { l1.stop(); l2.stop(); l3.stop(); };
  }, [ring1, ring2, ring3]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {[
        { anim: ring1, maxSize: 100 },
        { anim: ring2, maxSize: 160 },
        { anim: ring3, maxSize: 220 },
      ].map(({ anim, maxSize }, i) => {
        const size    = anim.interpolate({ inputRange: [0, 1], outputRange: [32, maxSize] });
        const opacity = anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.55, 0] });
        return (
          <Animated.View
            key={i}
            style={[
              styles.ring,
              {
                opacity,
                width: size,
                height: size,
                borderRadius: Animated.divide(size, 2) as unknown as number,
              },
            ]}
          />
        );
      })}
      <View style={styles.centreDot} />
      <View style={styles.searchLabel}>
        <Text style={styles.searchLabelText}>Finding your OTC Partner…</Text>
      </View>
    </View>
  );
}

export function RideMapFull({
  pickup,
  dropoff,
  searching = false,
  carPosition,
  style,
}: RideMapFullProps) {
  const mapW = SCREEN_W;
  const [mapUrl, setMapUrl] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const url = buildMapUrl(pickup, dropoff, carPosition, mapW, MAP_H);
    fadeAnim.setValue(0);
    setMapUrl(url);
  }, [
    pickup?.lat, pickup?.lng,
    dropoff?.lat, dropoff?.lng,
    carPosition?.lat, carPosition?.lng,
    mapW,
  ]);

  function onLoad() {
    Animated.timing(fadeAnim, {
      toValue: 1, duration: 450, useNativeDriver: true,
    }).start();
  }

  return (
    <View style={[styles.container, { width: mapW, height: MAP_H }, style]}>
      <View style={styles.base} />

      {mapUrl ? (
        <Animated.Image
          source={{ uri: mapUrl }}
          style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}
          resizeMode="cover"
          onLoad={onLoad}
        />
      ) : (
        <View style={styles.noMapGrid}>
          {Array.from({ length: 10 }).map((_, i) => (
            <View key={`h${i}`} style={[styles.gridLine, { top: (i / 10) * MAP_H, left: 0, right: 0, height: 1 }]} />
          ))}
          {Array.from({ length: 14 }).map((_, i) => (
            <View key={`v${i}`} style={[styles.gridLine, { left: (i / 14) * mapW, top: 0, bottom: 0, width: 1 }]} />
          ))}
        </View>
      )}

      <View style={styles.gradientTop} />
      <View style={styles.gradientBottom} />

      {searching ? (
        <PulseRings />
      ) : (
        <>
          {pickup && (
            <View style={[styles.pinBadge, styles.pinTop]}>
              <View style={[styles.pinDot, { backgroundColor: "#FFD700" }]} />
              <Text style={styles.pinText} numberOfLines={1}>{pickup.name ?? "Pickup"}</Text>
            </View>
          )}
          {dropoff && (
            <View style={[styles.pinBadge, styles.pinBottom]}>
              <View style={[styles.pinDot, { backgroundColor: "#22C55E" }]} />
              <Text style={styles.pinText} numberOfLines={1}>{dropoff.name ?? "Destination"}</Text>
            </View>
          )}
        </>
      )}

      {mapUrl && <Text style={styles.attr}>© Mapbox © OSM</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: "relative", overflow: "hidden" },
  base: { ...StyleSheet.absoluteFillObject, backgroundColor: "#060A06" },
  noMapGrid: { ...StyleSheet.absoluteFillObject },
  gridLine: { position: "absolute", backgroundColor: "rgba(255,215,0,0.04)" },
  gradientTop:    { position: "absolute", top: 0, left: 0, right: 0, height: 90, backgroundColor: "rgba(0,0,0,0.55)" },
  gradientBottom: { position: "absolute", bottom: 0, left: 0, right: 0, height: 90, backgroundColor: "rgba(0,0,0,0.55)" },

  ring: {
    position: "absolute",
    alignSelf: "center",
    top: "50%",
    marginTop: -11,
    borderWidth: 2,
    borderColor: "#FFD700",
    backgroundColor: "transparent",
  },
  centreDot: {
    position: "absolute",
    alignSelf: "center",
    top: "50%",
    marginTop: -7,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#FFD700",
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 6,
  },
  searchLabel: {
    position: "absolute",
    alignSelf: "center",
    bottom: 28,
    backgroundColor: "rgba(0,0,0,0.75)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.3)",
  },
  searchLabelText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "#FFD700",
    letterSpacing: 0.4,
  },

  pinBadge: {
    position: "absolute",
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.78)",
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    maxWidth: 220,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.15)",
  },
  pinTop:    { top: 16 },
  pinBottom: { bottom: 16 },
  pinDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  pinText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#fff", flexShrink: 1 },
  attr: {
    position: "absolute",
    bottom: 4,
    right: 8,
    fontSize: 8,
    color: "rgba(255,255,255,0.35)",
    fontFamily: "Inter_400Regular",
  },
});
