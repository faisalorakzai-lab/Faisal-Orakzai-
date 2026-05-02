import Constants from "expo-constants";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
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
  style?: object;
}

function buildMapUrl(
  pickup: MapCoord | null | undefined,
  dropoff: MapCoord | null | undefined,
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
    const overlay = `geojson(${encodedGeo}),${pickMarker},${dropMarker}`;
    return `${base}/${overlay}/auto/${pw}x${ph}@2x${qs}&padding=70,40,70,40`;
  }

  if (pickup) {
    const marker = `pin-s+FFD700(${pickup.lng},${pickup.lat})`;
    return `${base}/${marker}/${pickup.lng},${pickup.lat},13,0/${pw}x${ph}@2x${qs}`;
  }

  return `${base}/67.0011,24.8607,11,0/${pw}x${ph}@2x${qs}`;
}

export function RideMapFull({ pickup, dropoff, style }: RideMapFullProps) {
  const mapW = SCREEN_W;
  const [mapUrl, setMapUrl] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const url = buildMapUrl(pickup, dropoff, mapW, MAP_H);
    fadeAnim.setValue(0);
    setMapUrl(url);
  }, [
    pickup?.lat,
    pickup?.lng,
    dropoff?.lat,
    dropoff?.lng,
    mapW,
  ]);

  function onLoad() {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 450,
      useNativeDriver: true,
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
            <View
              key={`h${i}`}
              style={[styles.gridLine, { top: (i / 10) * MAP_H, left: 0, right: 0, height: 1 }]}
            />
          ))}
          {Array.from({ length: 14 }).map((_, i) => (
            <View
              key={`v${i}`}
              style={[styles.gridLine, { left: (i / 14) * mapW, top: 0, bottom: 0, width: 1 }]}
            />
          ))}
        </View>
      )}

      <View style={styles.gradientTop} />
      <View style={styles.gradientBottom} />

      {pickup && (
        <View style={[styles.pinBadge, styles.pinTop]}>
          <View style={[styles.pinDot, { backgroundColor: "#FFD700" }]} />
          <Text style={styles.pinText} numberOfLines={1}>
            {pickup.name ?? "Pickup"}
          </Text>
        </View>
      )}

      {dropoff && (
        <View style={[styles.pinBadge, styles.pinBottom]}>
          <View style={[styles.pinDot, { backgroundColor: "#22C55E" }]} />
          <Text style={styles.pinText} numberOfLines={1}>
            {dropoff.name ?? "Destination"}
          </Text>
        </View>
      )}

      {mapUrl && (
        <Text style={styles.attr}>© Mapbox © OSM</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    overflow: "hidden",
  },
  base: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#060A06",
  },
  noMapGrid: {
    ...StyleSheet.absoluteFillObject,
  },
  gridLine: {
    position: "absolute",
    backgroundColor: "rgba(255,215,0,0.04)",
  },
  gradientTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 90,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  gradientBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 90,
    backgroundColor: "rgba(0,0,0,0.55)",
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
  pinTop: { top: 16 },
  pinBottom: { bottom: 16 },
  pinDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  pinText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "#fff",
    flexShrink: 1,
  },
  attr: {
    position: "absolute",
    bottom: 4,
    right: 8,
    fontSize: 8,
    color: "rgba(255,255,255,0.35)",
    fontFamily: "Inter_400Regular",
  },
});
