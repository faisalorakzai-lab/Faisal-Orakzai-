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

import { PlacesSearch, type PlaceResult } from "@/components/ride/PlacesSearch";
import { RideMapFull, type MapCoord } from "@/components/ride/RideMapFull";
import { BidOfferCard } from "@/components/bid/BidOfferCard";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "@/contexts/LocationContext";
import { useAblyBid, type BidOffer } from "@/hooks/useAblyBid";
import { setActiveRide } from "@/lib/activeRideStore";

const { height: SCREEN_H } = Dimensions.get("window");
const GOLD = "#FFD700";

function getApiUrl(path: string): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}${path}`;
  }
  const domain = process.env["EXPO_PUBLIC_DOMAIN"] ?? "";
  return domain ? `https://${domain}${path}` : path;
}

function calcDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1));
}

const BASE_RATE = 38;

type Phase = "setup" | "bidding" | "accepted";

export default function BidRideScreen() {
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const { coordinates, city, district } = useLocation();

  const [phase, setPhase] = useState<Phase>("setup");
  const [pickup, setPickup] = useState<MapCoord | null>(null);
  const [dropoff, setDropoff] = useState<MapCoord | null>(null);
  const [dropoffFocused, setDropoffFocused] = useState(false);
  const [suggestedFare, setSuggestedFare] = useState(0);
  const [customFare, setCustomFare] = useState("");
  const [isEditingFare, setIsEditingFare] = useState(false);
  const [bidId, setBidId] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [acceptedOffer, setAcceptedOffer] = useState<BidOffer | null>(null);
  const [processingOfferId, setProcessingOfferId] = useState<string | null>(null);

  const pulseAnim = useRef(new Animated.Value(0)).current;
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 16);
  const distanceKm =
    pickup && dropoff
      ? calcDistance(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng)
      : 0;

  const { state: bidState, connected: ablyConnected } = useAblyBid(bidId);

  useEffect(() => {
    if (coordinates) {
      setPickup({ lat: coordinates.lat, lng: coordinates.lng, name: district || city || "Your Location" });
    } else {
      setPickup({ lat: 24.8607, lng: 67.0011, name: "Karachi, Pakistan" });
    }
  }, [coordinates, city, district]);

  useEffect(() => {
    if (distanceKm > 0) {
      const p = Math.round(distanceKm * BASE_RATE);
      setSuggestedFare(p);
      setCustomFare(p.toString());
    }
  }, [distanceKm]);

  useEffect(() => {
    if (bidState.status === "accepted" && bidState.acceptedOffer) {
      stopPulse();
      setAcceptedOffer(bidState.acceptedOffer);
      setPhase("accepted");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [bidState.status, bidState.acceptedOffer]);

  function startPulse() {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    );
    pulseLoopRef.current = loop;
    loop.start();
  }

  function stopPulse() {
    pulseLoopRef.current?.stop();
    pulseLoopRef.current = null;
    pulseAnim.setValue(0);
  }

  function handleDropoffSelect(place: PlaceResult) {
    setDropoff({ lat: place.lat, lng: place.lng, name: place.name });
    setDropoffFocused(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  async function handlePostBid() {
    if (!pickup || !dropoff) return;
    const fare = parseInt(customFare, 10) || suggestedFare;
    if (fare <= 0) return;

    setPosting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      const resp = await fetch(getApiUrl("/api/otc/bid/create"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          user_id: user?.id,
          pickup_name: pickup.name,
          pickup_lat: pickup.lat,
          pickup_lng: pickup.lng,
          dropoff_name: dropoff.name,
          dropoff_lat: dropoff.lat,
          dropoff_lng: dropoff.lng,
          distance_km: distanceKm,
          suggested_fare: fare,
        }),
      });

      const json = (await resp.json()) as { bid_id?: string; error?: string };

      if (json.bid_id) {
        setBidId(json.bid_id);
        setPhase("bidding");
        startPulse();
      } else {
        // Demo mode: generate local bid ID
        const localId = `BID-${Date.now()}`;
        setBidId(localId);
        setPhase("bidding");
        startPulse();
      }
    } catch {
      // Demo fallback
      const localId = `BID-${Date.now()}`;
      setBidId(localId);
      setPhase("bidding");
      startPulse();
    } finally {
      setPosting(false);
    }
  }

  async function handleAcceptOffer(offer: BidOffer) {
    if (!bidId || processingOfferId) return;
    setProcessingOfferId(offer.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      await fetch(getApiUrl(`/api/otc/bid/${bidId}/user-accept`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ offer_id: offer.id }),
      });
    } catch {}

    // Move to active ride
    if (pickup && dropoff) {
      setActiveRide({
        rideId: bidId,
        driver: {
          id: offer.driver_id,
          name: offer.driver_name,
          phone: offer.driver_phone,
          vehicleModel: offer.driver_vehicle,
          plate: offer.driver_plate,
          rating: offer.driver_rating,
          eta: offer.eta,
          totalFare: offer.offered_fare,
          rideTypeLabel: "OTC Prime",
        },
        pickup,
        dropoff,
        rideTypeLabel: "OTC Prime",
        totalFare: offer.offered_fare,
        offeredPrice: offer.offered_fare,
        paymentMethod: "cash",
      });
      stopPulse();
      setAcceptedOffer(offer);
      setPhase("accepted");
    }
    setProcessingOfferId(null);
  }

  async function handleRejectOffer(offer: BidOffer) {
    if (!bidId || processingOfferId) return;
    setProcessingOfferId(offer.id);

    try {
      await fetch(getApiUrl(`/api/otc/bid/${bidId}/user-reject`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ offer_id: offer.id }),
      });
    } catch {}

    setProcessingOfferId(null);
  }

  async function handleCancelBid() {
    if (!bidId) {
      resetToSetup();
      return;
    }
    setCancelling(true);
    try {
      await fetch(getApiUrl(`/api/otc/bid/${bidId}/cancel`), {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch {}
    setCancelling(false);
    resetToSetup();
  }

  function resetToSetup() {
    stopPulse();
    setPhase("setup");
    setBidId(null);
    setDropoff(null);
    setDropoffFocused(false);
    setSuggestedFare(0);
    setCustomFare("");
    setAcceptedOffer(null);
    setProcessingOfferId(null);
  }

  function handleStartRide() {
    router.push("/services/ride-active");
  }

  const fare = parseInt(customFare, 10) || suggestedFare;
  const fareDiff = fare - suggestedFare;

  return (
    <View style={styles.root}>
      <RideMapFull
        pickup={pickup}
        dropoff={dropoff}
        searching={phase === "bidding"}
        style={StyleSheet.absoluteFill}
      />

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: topPad, paddingHorizontal: 20 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Feather name="arrow-left" size={20} color={GOLD} />
        </TouchableOpacity>
        <View style={styles.titleBadge}>
          <Text style={styles.titleText}>BID RIDE</Text>
        </View>
        {phase === "bidding" && (
          <View style={[styles.ablyPill, ablyConnected ? styles.ablyLive : styles.ablyOff]}>
            <View style={[styles.ablyDot, ablyConnected ? styles.ablyDotLive : styles.ablyDotOff]} />
            <Text style={styles.ablyLabel}>{ablyConnected ? "LIVE" : "SYNC"}</Text>
          </View>
        )}
        {phase !== "bidding" && <View style={{ width: 56 }} />}
      </View>

      {/* Bottom panel */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.kavWrapper}
        keyboardVerticalOffset={0}
      >
        <View
          style={[
            styles.bottomPanel,
            { paddingBottom: insets.bottom + (Platform.OS === "web" ? 24 : 12), maxHeight: SCREEN_H * 0.78 },
          ]}
        >
          <View style={styles.dragHandle} />

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.panelScroll}
          >
            {/* ── SETUP PHASE ── */}
            {phase === "setup" && (
              <>
                <View style={styles.inputCard}>
                  <PlacesSearch
                    label="PICKUP"
                    placeholder="Detecting location…"
                    value={pickup?.name ?? ""}
                    onSelect={(p) => setPickup({ lat: p.lat, lng: p.lng, name: p.name })}
                    proximityLng={pickup?.lng ?? 67.0011}
                    proximityLat={pickup?.lat ?? 24.8607}
                    dotColor={GOLD}
                    readOnly
                    onPress={() => {}}
                  />
                  <View style={styles.inputDivider} />
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

                {dropoff && distanceKm > 0 && (
                  <>
                    <View style={styles.distanceRow}>
                      <Feather name="map" size={12} color={GOLD} />
                      <Text style={styles.distanceText}>{distanceKm} km route</Text>
                    </View>

                    <View style={styles.fareCard}>
                      <Text style={styles.fareCardTitle}>YOUR BID PRICE</Text>
                      <View style={styles.fareCardBody}>
                        <View style={styles.fareSide}>
                          <Text style={styles.fareSmallLabel}>SUGGESTED</Text>
                          <Text style={styles.fareSmallAmt}>PKR {suggestedFare.toLocaleString()}</Text>
                        </View>
                        <View style={styles.fareVDivider} />
                        <View style={styles.fareSide}>
                          <Text style={styles.fareSmallLabel}>YOUR OFFER</Text>
                          {isEditingFare ? (
                            <TextInput
                              style={styles.fareInput}
                              value={customFare}
                              onChangeText={setCustomFare}
                              keyboardType="numeric"
                              autoFocus
                              onBlur={() => setIsEditingFare(false)}
                              selectTextOnFocus
                              returnKeyType="done"
                            />
                          ) : (
                            <TouchableOpacity
                              style={styles.fareEditRow}
                              onPress={() => {
                                setIsEditingFare(true);
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              }}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.fareEditAmt}>PKR {fare.toLocaleString()}</Text>
                              <Feather name="edit-2" size={12} color={GOLD} />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                      {fareDiff !== 0 && (
                        <View style={styles.fareDiffRow}>
                          <Feather
                            name={fareDiff < 0 ? "trending-down" : "trending-up"}
                            size={12}
                            color={fareDiff < 0 ? "#34D399" : "#F87171"}
                          />
                          <Text style={[styles.fareDiffText, { color: fareDiff < 0 ? "#34D399" : "#F87171" }]}>
                            {fareDiff < 0
                              ? `PKR ${Math.abs(fareDiff)} below suggested — drivers may counter`
                              : `PKR ${fareDiff} above suggested — faster match`}
                          </Text>
                        </View>
                      )}
                      <View style={styles.bidHint}>
                        <Feather name="zap" size={11} color="#444" />
                        <Text style={styles.bidHintText}>
                          Drivers see your fare and can accept or counter-offer in real-time
                        </Text>
                      </View>
                    </View>
                  </>
                )}
              </>
            )}

            {/* ── BIDDING PHASE ── */}
            {phase === "bidding" && (
              <>
                <View style={styles.biddingHeader}>
                  <Animated.View
                    style={[
                      styles.pulseDot,
                      {
                        opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.6] }),
                        transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.15] }) }],
                      },
                    ]}
                  />
                  <Text style={styles.biddingTitle}>Bid Posted — Waiting for Drivers</Text>
                  <Text style={styles.biddingBidId}>#{bidId}</Text>
                  <View style={styles.biddingFareRow}>
                    <Text style={styles.biddingFareLabel}>YOUR BID:</Text>
                    <Text style={styles.biddingFareAmt}>PKR {fare.toLocaleString()}</Text>
                  </View>
                  {dropoff && (
                    <View style={styles.routeRow}>
                      <View style={styles.routePill}>
                        <Feather name="map-pin" size={10} color={GOLD} />
                        <Text style={styles.routeText} numberOfLines={1}>{pickup?.name}</Text>
                      </View>
                      <Feather name="arrow-right" size={11} color="#555" />
                      <View style={styles.routePill}>
                        <Feather name="map-pin" size={10} color="#22C55E" />
                        <Text style={styles.routeText} numberOfLines={1}>{dropoff.name}</Text>
                      </View>
                    </View>
                  )}
                </View>

                {bidState.offers.length === 0 ? (
                  <View style={styles.waitingCard}>
                    <ActivityIndicator color={GOLD} size="small" />
                    <Text style={styles.waitingText}>Scanning nearby drivers…</Text>
                    <Text style={styles.waitingSubText}>
                      Drivers within 5 km are being notified
                    </Text>
                  </View>
                ) : (
                  <View style={styles.offersSection}>
                    <View style={styles.offersSectionHeader}>
                      <Feather name="users" size={13} color={GOLD} />
                      <Text style={styles.offersSectionTitle}>
                        {bidState.offers.length} Driver Offer{bidState.offers.length !== 1 ? "s" : ""}
                      </Text>
                    </View>
                    {bidState.offers.map((offer) => (
                      <BidOfferCard
                        key={offer.id}
                        offer={offer}
                        suggestedFare={fare}
                        onAccept={handleAcceptOffer}
                        onReject={handleRejectOffer}
                        disabled={processingOfferId === offer.id}
                      />
                    ))}
                  </View>
                )}
              </>
            )}

            {/* ── ACCEPTED PHASE ── */}
            {phase === "accepted" && acceptedOffer && (
              <View style={styles.acceptedCard}>
                <View style={styles.acceptedBadge}>
                  <Feather name="check-circle" size={14} color="#22C55E" />
                  <Text style={styles.acceptedBadgeText}>BID ACCEPTED</Text>
                </View>
                <View style={styles.acceptedDriver}>
                  <View style={styles.acceptedAvatar}>
                    <Text style={styles.acceptedAvatarText}>
                      {acceptedOffer.driver_name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={styles.acceptedDriverName}>{acceptedOffer.driver_name}</Text>
                    {acceptedOffer.driver_vehicle && (
                      <Text style={styles.acceptedVehicle}>{acceptedOffer.driver_vehicle}</Text>
                    )}
                    <View style={styles.acceptedRatingRow}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Feather key={s} name="star" size={11} color={s <= Math.round(acceptedOffer.driver_rating) ? GOLD : "#333"} />
                      ))}
                      <Text style={styles.acceptedRatingNum}>{acceptedOffer.driver_rating.toFixed(1)}</Text>
                    </View>
                  </View>
                  <View style={styles.acceptedEtaPill}>
                    <Feather name="clock" size={11} color="#000" />
                    <Text style={styles.acceptedEtaText}>{acceptedOffer.eta} min</Text>
                  </View>
                </View>
                <View style={styles.acceptedFareRow}>
                  <Text style={styles.acceptedFareLabel}>FINAL FARE</Text>
                  <Text style={styles.acceptedFareAmt}>PKR {acceptedOffer.offered_fare.toLocaleString()}</Text>
                </View>
                <TouchableOpacity style={styles.startRideBtn} onPress={handleStartRide} activeOpacity={0.85}>
                  <Feather name="play" size={18} color="#000" />
                  <Text style={styles.startRideBtnText}>Start Ride</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          {/* CTA */}
          <View style={styles.ctaWrap}>
            {phase === "setup" && (
              <TouchableOpacity
                style={[styles.ctaBtn, (!dropoff || posting) && styles.ctaBtnDisabled]}
                onPress={handlePostBid}
                disabled={!dropoff || posting}
                activeOpacity={0.85}
              >
                {posting ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <Feather name="zap" size={18} color={dropoff ? "#000" : "#444"} />
                )}
                <Text style={[styles.ctaBtnText, (!dropoff || posting) && { color: "#444" }]}>
                  {posting
                    ? "Posting Bid…"
                    : dropoff
                    ? `Post Bid · PKR ${fare.toLocaleString()}`
                    : "Enter Destination to Bid"}
                </Text>
              </TouchableOpacity>
            )}

            {phase === "bidding" && (
              <TouchableOpacity
                style={styles.cancelBidBtn}
                onPress={handleCancelBid}
                disabled={cancelling}
                activeOpacity={0.8}
              >
                {cancelling ? (
                  <ActivityIndicator color="#F87171" size="small" />
                ) : (
                  <Feather name="x" size={16} color="#F87171" />
                )}
                <Text style={styles.cancelBidText}>{cancelling ? "Cancelling…" : "Cancel Bid"}</Text>
              </TouchableOpacity>
            )}
          </View>
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
    color: GOLD,
    letterSpacing: 2,
  },
  ablyPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  ablyLive: { backgroundColor: "rgba(34,197,94,0.1)", borderColor: "rgba(34,197,94,0.3)" },
  ablyOff: { backgroundColor: "rgba(0,0,0,0.72)", borderColor: "rgba(255,255,255,0.1)" },
  ablyDot: { width: 6, height: 6, borderRadius: 3 },
  ablyDotLive: { backgroundColor: "#22C55E" },
  ablyDotOff: { backgroundColor: "#666" },
  ablyLabel: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#22C55E", letterSpacing: 1 },

  kavWrapper: { position: "absolute", bottom: 0, left: 0, right: 0 },
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

  distanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  distanceText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: GOLD,
  },

  fareCard: {
    backgroundColor: "#111",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.18)",
    padding: 16,
    gap: 12,
  },
  fareCardTitle: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "#555",
    letterSpacing: 1.5,
  },
  fareCardBody: { flexDirection: "row", alignItems: "center" },
  fareSide: { flex: 1, gap: 4 },
  fareSmallLabel: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#555", letterSpacing: 1 },
  fareSmallAmt: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#888" },
  fareVDivider: { width: 1, height: 44, backgroundColor: "rgba(255,215,0,0.12)", marginHorizontal: 16 },
  fareEditRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  fareEditAmt: { fontSize: 22, fontFamily: "Inter_700Bold", color: GOLD },
  fareInput: { fontSize: 22, fontFamily: "Inter_700Bold", color: GOLD, padding: 0, margin: 0, minWidth: 80 },
  fareDiffRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  fareDiffText: { fontSize: 11, fontFamily: "Inter_500Medium", flex: 1 },
  bidHint: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  bidHintText: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#444", flex: 1 },

  // Bidding phase
  biddingHeader: {
    backgroundColor: "#111",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.18)",
    padding: 18,
    gap: 10,
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  pulseDot: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: GOLD,
    alignSelf: "center",
  },
  biddingTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 0.3,
  },
  biddingBidId: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: "#555",
    letterSpacing: 0.5,
  },
  biddingFareRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  biddingFareLabel: { fontSize: 11, fontFamily: "Inter_500Medium", color: "#888" },
  biddingFareAmt: { fontSize: 20, fontFamily: "Inter_700Bold", color: GOLD },
  routeRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "center" },
  routePill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,215,0,0.08)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  routeText: { fontSize: 10, fontFamily: "Inter_500Medium", color: "#ccc", maxWidth: 120 },

  waitingCard: {
    backgroundColor: "#111",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.1)",
    padding: 24,
    alignItems: "center",
    gap: 10,
  },
  waitingText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },
  waitingSubText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#666", textAlign: "center" },

  offersSection: { gap: 12 },
  offersSectionHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  offersSectionTitle: { fontSize: 13, fontFamily: "Inter_700Bold", color: GOLD, letterSpacing: 0.5 },

  // Accepted phase
  acceptedCard: {
    backgroundColor: "#111",
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "rgba(34,197,94,0.35)",
    padding: 18,
    gap: 16,
  },
  acceptedBadge: { flexDirection: "row", alignItems: "center", gap: 6 },
  acceptedBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#22C55E", letterSpacing: 1.5 },
  acceptedDriver: { flexDirection: "row", alignItems: "center", gap: 12 },
  acceptedAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255,215,0,0.12)",
    borderWidth: 2,
    borderColor: "rgba(255,215,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  acceptedAvatarText: { fontSize: 20, fontFamily: "Inter_700Bold", color: GOLD },
  acceptedDriverName: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
  acceptedVehicle: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#666" },
  acceptedRatingRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  acceptedRatingNum: { fontSize: 11, fontFamily: "Inter_500Medium", color: "#888", marginLeft: 3 },
  acceptedEtaPill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: GOLD, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  acceptedEtaText: { fontSize: 12, fontFamily: "Inter_700Bold", color: "#000" },
  acceptedFareRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  acceptedFareLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#666", letterSpacing: 0.8 },
  acceptedFareAmt: { fontSize: 24, fontFamily: "Inter_700Bold", color: GOLD },
  startRideBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: GOLD,
    borderRadius: 14,
    height: 52,
  },
  startRideBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#000", letterSpacing: 0.3 },

  // CTA
  ctaWrap: { marginTop: 12 },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: GOLD,
    borderRadius: 16,
    height: 56,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  ctaBtnDisabled: { backgroundColor: "#111", shadowOpacity: 0, elevation: 0, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  ctaBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#000", letterSpacing: 0.3 },
  cancelBidBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.3)",
    borderRadius: 16,
    height: 52,
    backgroundColor: "rgba(248,113,113,0.06)",
  },
  cancelBidText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#F87171" },
});
