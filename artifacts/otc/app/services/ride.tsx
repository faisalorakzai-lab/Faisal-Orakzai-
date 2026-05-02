import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  OtcRideTypeSelector,
  OTC_RIDE_TYPES,
  type OtcRideType,
} from "@/components/ride/OtcRideTypeSelector";
import { PlacesSearch, type PlaceResult } from "@/components/ride/PlacesSearch";
import { RideMapFull, type MapCoord } from "@/components/ride/RideMapFull";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "@/contexts/LocationContext";
import { useRide, type RideClass } from "@/contexts/RideContext";
import { supabase } from "@/lib/supabase";
import { useColors } from "@/hooks/useColors";

const { height: SCREEN_H } = Dimensions.get("window");

const DRIVERS = [
  { name: "Tariq Mehmood", rating: 4.9, eta: 4 },
  { name: "Asad Ali Khan", rating: 4.8, eta: 6 },
  { name: "Samiullah Baig", rating: 5.0, eta: 3 },
  { name: "Fawad Iqbal", rating: 4.7, eta: 7 },
];

function calcDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return parseFloat(
    (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1)
  );
}

type Phase = "input" | "ready" | "searching" | "found";

export default function OtcRideScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user: authUser } = useAuth();
  const { city, district, coordinates } = useLocation();
  const { setSelectedClass } = useRide();

  const [phase, setPhase] = useState<Phase>("input");
  const [pickup, setPickup] = useState<MapCoord | null>(null);
  const [dropoff, setDropoff] = useState<MapCoord | null>(null);
  const [dropoffFocused, setDropoffFocused] = useState(false);
  const [rideType, setRideType] = useState<OtcRideType>(OTC_RIDE_TYPES[1]);
  const [suggestedPrice, setSuggestedPrice] = useState(0);
  const [offeredPrice, setOfferedPrice] = useState("");
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [driver, setDriver] = useState(DRIVERS[0]);
  const [rideId, setRideId] = useState<string | null>(null);

  const searchAnim = useRef(new Animated.Value(0)).current;
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 16);

  useEffect(() => {
    if (coordinates) {
      setPickup({
        lat: coordinates.lat,
        lng: coordinates.lng,
        name: district || city || "Your Location",
      });
    } else {
      setPickup({ lat: 24.8607, lng: 67.0011, name: "Karachi, Pakistan" });
    }
  }, [coordinates, city, district]);

  const distanceKm =
    pickup && dropoff
      ? calcDistance(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng)
      : 0;

  function recalcPrice(type: OtcRideType, dist: number) {
    const p = Math.round(dist * type.baseRate);
    setSuggestedPrice(p);
    setOfferedPrice(p.toString());
  }

  function handleDropoffSelect(place: PlaceResult) {
    const coord: MapCoord = { lat: place.lat, lng: place.lng, name: place.name };
    setDropoff(coord);
    setDropoffFocused(false);
    const dist = pickup
      ? calcDistance(pickup.lat, pickup.lng, place.lat, place.lng)
      : 0;
    recalcPrice(rideType, dist);
    setPhase("ready");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function handleRideTypeSelect(cls: RideClass, type: OtcRideType) {
    setRideType(type);
    setSelectedClass(cls);
    recalcPrice(type, distanceKm);
  }

  async function handleConfirm() {
    if (!pickup || !dropoff) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    const id = `OTC-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)
      .toUpperCase()}`;
    setRideId(id);
    setPhase("searching");

    if (supabase) {
      supabase
        .from("ride_requests")
        .insert({
          id,
          user_id: (authUser as any)?.id ?? null,
          pickup_name: pickup.name ?? "Unknown",
          pickup_lat: pickup.lat,
          pickup_lng: pickup.lng,
          dropoff_name: dropoff.name ?? "Unknown",
          dropoff_lat: dropoff.lat,
          dropoff_lng: dropoff.lng,
          ride_type: rideType.id,
          ride_type_label: rideType.label,
          distance_km: distanceKm,
          suggested_price: suggestedPrice,
          offered_price: parseInt(offeredPrice, 10) || 0,
          status: "searching",
        })
        .then(() => {});
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(searchAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(searchAnim, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();

    setTimeout(() => {
      loop.stop();
      searchAnim.setValue(0);
      setDriver(DRIVERS[Math.floor(Math.random() * DRIVERS.length)]);
      setPhase("found");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 2600);
  }

  function handleStartRide() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/services/sovereign-mode");
  }

  function resetRide() {
    setPhase("input");
    setDropoff(null);
    setDropoffFocused(false);
    setOfferedPrice("");
    setSuggestedPrice(0);
    setRideId(null);
    searchAnim.setValue(0);
  }

  const offeredNum = parseInt(offeredPrice, 10) || 0;
  const priceDiff = offeredNum - suggestedPrice;

  return (
    <View style={styles.root}>
      {/* ── Full-screen map background ── */}
      <RideMapFull
        pickup={pickup}
        dropoff={dropoff}
        style={StyleSheet.absoluteFill}
      />

      {/* ── Top bar ── */}
      <View
        style={[
          styles.topBar,
          { paddingTop: topPad, paddingHorizontal: 20 },
        ]}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Feather name="arrow-left" size={20} color="#FFD700" />
        </TouchableOpacity>

        <View style={styles.titleBadge}>
          <Text style={styles.titleText}>OTC RIDE</Text>
        </View>

        {phase !== "input" && (
          <TouchableOpacity
            style={styles.resetBtn}
            onPress={resetRide}
            activeOpacity={0.8}
          >
            <Feather name="refresh-ccw" size={16} color="#888" />
          </TouchableOpacity>
        )}
        {phase === "input" && <View style={{ width: 40 }} />}
      </View>

      {/* ── Bottom panel ── */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.kavWrapper}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <View
          style={[
            styles.bottomPanel,
            {
              paddingBottom:
                insets.bottom + (Platform.OS === "web" ? 24 : 12),
              maxHeight: SCREEN_H * 0.72,
            },
          ]}
        >
          <View style={styles.dragHandle} />

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.panelScroll}
          >
            {/* ── Input Card ── */}
            {(phase === "input" || phase === "ready") && (
              <View style={styles.inputCard}>
                {/* Pickup */}
                <PlacesSearch
                  label="PICKUP"
                  placeholder="Detecting location…"
                  value={pickup?.name ?? ""}
                  onSelect={(p) =>
                    setPickup({ lat: p.lat, lng: p.lng, name: p.name })
                  }
                  proximityLng={pickup?.lng ?? 67.0011}
                  proximityLat={pickup?.lat ?? 24.8607}
                  dotColor="#FFD700"
                  readOnly
                  onPress={() => {}}
                />

                <View style={styles.inputDivider} />

                {/* Dropoff */}
                {dropoffFocused ? (
                  <PlacesSearch
                    label="DESTINATION"
                    placeholder="Where to?"
                    value={dropoff?.name ?? ""}
                    onSelect={handleDropoffSelect}
                    proximityLng={pickup?.lng ?? 67.0011}
                    proximityLat={pickup?.lat ?? 24.8607}
                    dotColor="#22C55E"
                  />
                ) : (
                  <PlacesSearch
                    label="DESTINATION"
                    placeholder="Where to?"
                    value={dropoff?.name ?? ""}
                    onSelect={handleDropoffSelect}
                    proximityLng={pickup?.lng ?? 67.0011}
                    proximityLat={pickup?.lat ?? 24.8607}
                    dotColor={dropoff ? "#22C55E" : "#555"}
                    readOnly
                    onPress={() => setDropoffFocused(true)}
                  />
                )}
              </View>
            )}

            {/* ── Ride Type Selector ── */}
            {(phase === "ready" || phase === "found") && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Choose Ride</Text>
                  {distanceKm > 0 && (
                    <View style={styles.distancePill}>
                      <Feather name="map" size={11} color="#FFD700" />
                      <Text style={styles.distanceText}>{distanceKm} km</Text>
                    </View>
                  )}
                </View>

                <OtcRideTypeSelector
                  selected={rideType.id}
                  onSelect={handleRideTypeSelect}
                  distanceKm={distanceKm}
                />

                {/* ── Price Negotiation Card ── */}
                {suggestedPrice > 0 && (
                  <View style={styles.priceCard}>
                    <View style={styles.priceRow}>
                      <View style={styles.priceSide}>
                        <Text style={styles.priceLabelSmall}>
                          SUGGESTED
                        </Text>
                        <Text style={styles.suggestedAmt}>
                          PKR {suggestedPrice.toLocaleString()}
                        </Text>
                      </View>

                      <View style={styles.priceVDivider} />

                      <View style={styles.priceSide}>
                        <Text style={styles.priceLabelSmall}>
                          YOUR OFFER
                        </Text>
                        {isEditingPrice ? (
                          <TextInput
                            style={styles.priceInput}
                            value={offeredPrice}
                            onChangeText={setOfferedPrice}
                            keyboardType="numeric"
                            onBlur={() => setIsEditingPrice(false)}
                            autoFocus
                            selectTextOnFocus
                            returnKeyType="done"
                          />
                        ) : (
                          <TouchableOpacity
                            style={styles.offerRow}
                            onPress={() => {
                              setIsEditingPrice(true);
                              Haptics.impactAsync(
                                Haptics.ImpactFeedbackStyle.Light
                              );
                            }}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.offeredAmt}>
                              PKR {offeredNum.toLocaleString()}
                            </Text>
                            <Feather
                              name="edit-2"
                              size={12}
                              color="#FFD700"
                            />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>

                    {priceDiff !== 0 && (
                      <View style={styles.diffRow}>
                        <Feather
                          name={
                            priceDiff < 0 ? "trending-down" : "trending-up"
                          }
                          size={12}
                          color={priceDiff < 0 ? "#34D399" : "#F87171"}
                        />
                        <Text
                          style={[
                            styles.diffText,
                            {
                              color:
                                priceDiff < 0 ? "#34D399" : "#F87171",
                            },
                          ]}
                        >
                          {priceDiff < 0
                            ? `PKR ${Math.abs(priceDiff)} below suggested`
                            : `PKR ${priceDiff} above suggested`}
                        </Text>
                      </View>
                    )}

                    <View style={styles.priceHintRow}>
                      <Feather name="info" size={10} color="#444" />
                      <Text style={styles.priceHintText}>
                        Tap offer to edit · PKR 0 accepted
                      </Text>
                    </View>
                  </View>
                )}
              </>
            )}

            {/* ── Searching Phase ── */}
            {phase === "searching" && (
              <View style={styles.searchingCard}>
                <Animated.View
                  style={[
                    styles.searchPulse,
                    {
                      opacity: searchAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.15, 0.45],
                      }),
                      transform: [
                        {
                          scale: searchAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.85, 1.15],
                          }),
                        },
                      ],
                    },
                  ]}
                />
                <ActivityIndicator color="#FFD700" size="large" />
                <Text style={styles.searchingTitle}>
                  Scanning OTC Grid…
                </Text>
                <Text style={styles.searchingSub}>
                  Finding nearest{" "}
                  <Text style={{ color: "#FFD700" }}>{rideType.label}</Text>{" "}
                  partner
                </Text>
                {rideId && (
                  <Text style={styles.rideIdText}>#{rideId}</Text>
                )}
              </View>
            )}

            {/* ── Driver Found ── */}
            {phase === "found" && (
              <View style={styles.foundCard}>
                <View style={styles.foundBadgeRow}>
                  <Feather name="check-circle" size={14} color="#22C55E" />
                  <Text style={styles.foundBadgeText}>Driver Matched</Text>
                </View>
                <View style={styles.driverRow}>
                  <View style={styles.driverAvatar}>
                    <Text style={styles.driverInitial}>
                      {driver.name.charAt(0)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.driverName}>{driver.name}</Text>
                    <View style={styles.driverMeta}>
                      <Feather name="star" size={11} color="#FFD700" />
                      <Text style={styles.driverRating}>{driver.rating}</Text>
                      <Text style={styles.driverEta}>
                        · {driver.eta} min away
                      </Text>
                    </View>
                  </View>
                  <View style={styles.rideTypePill}>
                    <Text style={styles.rideTypePillText}>
                      {rideType.label}
                    </Text>
                  </View>
                </View>
                <View style={styles.foundPriceRow}>
                  <Text style={styles.foundPriceLabel}>Agreed Price</Text>
                  <Text style={styles.foundPrice}>
                    PKR {offeredNum.toLocaleString()}
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* ── CTA Button ── */}
          {phase !== "searching" && (
            <View style={styles.ctaWrap}>
              {phase === "found" ? (
                <TouchableOpacity
                  style={styles.ctaBtnActive}
                  onPress={handleStartRide}
                  activeOpacity={0.85}
                >
                  <Feather name="play" size={18} color="#000" />
                  <Text style={styles.ctaBtnText}>Activate Ride Mode</Text>
                </TouchableOpacity>
              ) : phase === "ready" && dropoff ? (
                <TouchableOpacity
                  style={styles.ctaBtnActive}
                  onPress={handleConfirm}
                  activeOpacity={0.85}
                >
                  <Feather name="navigation" size={18} color="#000" />
                  <Text style={styles.ctaBtnText}>
                    Confirm OTC Request · PKR {offeredNum.toLocaleString()}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.ctaBtnDisabled}>
                  <Feather name="map-pin" size={18} color="#444" />
                  <Text style={[styles.ctaBtnText, { color: "#444" }]}>
                    Enter Destination to Continue
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },

  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
    zIndex: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.72)",
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  titleBadge: {
    backgroundColor: "rgba(0,0,0,0.72)",
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.25)",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  titleText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#FFD700",
    letterSpacing: 2,
  },
  resetBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.72)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },

  kavWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  bottomPanel: {
    backgroundColor: "rgba(8,8,8,0.97)",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "rgba(255,215,0,0.12)",
    paddingTop: 10,
    paddingHorizontal: 20,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,215,0,0.25)",
    alignSelf: "center",
    marginBottom: 16,
  },
  panelScroll: { gap: 16, paddingBottom: 8 },

  inputCard: {
    backgroundColor: "#111",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.15)",
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  inputDivider: {
    height: 1,
    backgroundColor: "rgba(255,215,0,0.08)",
    marginLeft: 22,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 0.5,
  },
  distancePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,215,0,0.1)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  distanceText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: "#FFD700",
  },

  priceCard: {
    backgroundColor: "#111",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.18)",
    padding: 16,
    gap: 10,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
  },
  priceSide: { flex: 1, gap: 4 },
  priceLabelSmall: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: "#555",
    letterSpacing: 1,
  },
  suggestedAmt: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#888",
  },
  priceVDivider: {
    width: 1,
    height: 44,
    backgroundColor: "rgba(255,215,0,0.12)",
    marginHorizontal: 16,
  },
  offerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  offeredAmt: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#FFD700",
  },
  priceInput: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#FFD700",
    padding: 0,
    margin: 0,
    minWidth: 80,
  },
  diffRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  diffText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  priceHintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  priceHintText: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: "#444",
  },

  searchingCard: {
    backgroundColor: "#111",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.18)",
    padding: 28,
    alignItems: "center",
    gap: 12,
    position: "relative",
    overflow: "hidden",
    minHeight: 160,
  },
  searchPulse: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#FFD700",
    alignSelf: "center",
  },
  searchingTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 0.3,
  },
  searchingSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#888",
    textAlign: "center",
  },
  rideIdText: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: "#555",
    letterSpacing: 0.5,
    marginTop: 4,
  },

  foundCard: {
    backgroundColor: "#111",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.25)",
    padding: 16,
    gap: 14,
  },
  foundBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  foundBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: "#22C55E",
    letterSpacing: 0.5,
  },
  driverRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  driverAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,215,0,0.12)",
    borderWidth: 1.5,
    borderColor: "#FFD700",
    alignItems: "center",
    justifyContent: "center",
  },
  driverInitial: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#FFD700",
  },
  driverName: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  driverMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  driverRating: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: "#FFD700",
  },
  driverEta: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#666",
  },
  rideTypePill: {
    backgroundColor: "rgba(255,215,0,0.1)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.3)",
  },
  rideTypePillText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "#FFD700",
  },
  foundPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,215,0,0.1)",
  },
  foundPriceLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "#666",
  },
  foundPrice: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#FFD700",
  },

  ctaWrap: { marginTop: 12 },
  ctaBtnActive: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#FFD700",
    borderRadius: 16,
    height: 56,
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  ctaBtnDisabled: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#111",
    borderRadius: 16,
    height: 56,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  ctaBtnText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#000",
    letterSpacing: 0.3,
  },
});
