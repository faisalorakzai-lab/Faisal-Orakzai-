import { Feather } from "@expo/vector-icons";
import Constants from "expo-constants";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string>;
const MAPBOX_TOKEN = extra.mapboxToken ?? "";

export interface PlaceResult {
  id: string;
  name: string;
  fullAddress: string;
  lat: number;
  lng: number;
}

interface PlacesSearchProps {
  label: string;
  placeholder: string;
  value: string;
  onSelect: (place: PlaceResult) => void;
  proximityLng?: number;
  proximityLat?: number;
  dotColor?: string;
  readOnly?: boolean;
  onPress?: () => void;
}

export function PlacesSearch({
  label,
  placeholder,
  value,
  onSelect,
  proximityLng = 67.0011,
  proximityLat = 24.8607,
  dotColor = "#FFD700",
  readOnly = false,
  onPress,
}: PlacesSearchProps) {
  const colors = useColors();
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  function search(text: string) {
    setQuery(text);
    if (timer.current) clearTimeout(timer.current);
    if (!text.trim() || !MAPBOX_TOKEN) {
      setResults([]);
      return;
    }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const prox = `${proximityLng},${proximityLat}`;
        const url =
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(text)}.json` +
          `?country=PK&types=poi,address,place,locality,neighborhood` +
          `&proximity=${prox}&limit=5&access_token=${MAPBOX_TOKEN}`;
        const res = await fetch(url);
        const json = await res.json();
        const mapped: PlaceResult[] = (json.features ?? []).map((f: Record<string, any>) => ({
          id: f.id as string,
          name: (f.text ?? f.place_name) as string,
          fullAddress: f.place_name as string,
          lat: (f.geometry.coordinates as number[])[1],
          lng: (f.geometry.coordinates as number[])[0],
        }));
        setResults(mapped);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 380);
  }

  function pick(p: PlaceResult) {
    setQuery(p.name);
    setResults([]);
    setFocused(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(p);
  }

  const showDropdown = focused && (results.length > 0 || loading);

  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
        <View style={styles.inputBlock}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
          {readOnly ? (
            <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
              <Text
                style={[styles.readonlyText, { color: value ? colors.foreground : colors.mutedForeground }]}
                numberOfLines={1}
              >
                {value || placeholder}
              </Text>
            </TouchableOpacity>
          ) : (
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              value={query}
              onChangeText={search}
              placeholder={placeholder}
              placeholderTextColor={colors.mutedForeground}
              onFocus={() => setFocused(true)}
              onBlur={() => setTimeout(() => setFocused(false), 200)}
              returnKeyType="search"
              autoCorrect={false}
              autoFocus
            />
          )}
        </View>
        {loading ? (
          <ActivityIndicator size="small" color={colors.gold} />
        ) : (
          <Feather name="search" size={15} color={colors.mutedForeground} />
        )}
      </View>

      {showDropdown && (
        <View style={[styles.dropdown, { borderColor: "rgba(255,215,0,0.18)", backgroundColor: "#111" }]}>
          {results.length === 0 && loading && (
            <View style={styles.dropItem}>
              <ActivityIndicator size="small" color="#FFD700" />
              <Text style={[styles.dropAddr, { color: "#888" }]}>Searching…</Text>
            </View>
          )}
          {results.map((p, i) => (
            <TouchableOpacity
              key={p.id}
              style={[
                styles.dropItem,
                i < results.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: "rgba(255,215,0,0.07)",
                },
              ]}
              onPress={() => pick(p)}
              activeOpacity={0.7}
            >
              <Feather name="map-pin" size={13} color="#666" style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.dropName, { color: "#fff" }]}>{p.name}</Text>
                <Text style={[styles.dropAddr, { color: "#666" }]} numberOfLines={1}>
                  {p.fullAddress}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: "100%" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
  },
  dot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  inputBlock: { flex: 1 },
  label: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
    marginBottom: 2,
    textTransform: "uppercase",
  },
  input: { fontSize: 15, fontFamily: "Inter_500Medium", padding: 0, margin: 0 },
  readonlyText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  dropdown: { borderWidth: 1, borderRadius: 12, marginTop: 4, overflow: "hidden" },
  dropItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  dropName: { fontSize: 13, fontFamily: "Inter_500Medium" },
  dropAddr: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
});
