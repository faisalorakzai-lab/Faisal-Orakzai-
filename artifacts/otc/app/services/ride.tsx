import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Dimensions, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { OtcRideTypeSelector, OTC_RIDE_TYPES, type OtcRideType } from "@/components/ride/OtcRideTypeSelector";
import { PlacesSearch, type PlaceResult } from "@/components/ride/PlacesSearch";
import { RideMapFull, type MapCoord } from "@/components/ride/RideMapFull";
import { DriverFoundCard, type DriverInfo } from "@/components/ride/DriverFoundCard";
import { PaymentSelector, type PaymentMethod } from "@/components/ride/PaymentSelector";
import { ServiceModeSelector, type ServiceMode } from "@/components/ride/ServiceModeSelector";
import { SharedSpaceCard } from "@/components/ride/SharedSpaceCard";
import { MicroInvestmentCard } from "@/components/ride/MicroInvestmentCard";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "@/contexts/LocationContext";
import { useRide } from "@/contexts/RideContext";
import { useWallet } from "@/contexts/WalletContext";
import { useWealth } from "@/contexts/WealthContext";
import { supabase } from "@/lib/supabase";
import { setActiveRide } from "@/lib/activeRideStore";
import { useColors } from "@/hooks/useColors";

const { height: SCREEN_H } = Dimensions.get("window");
const ABLY_CHANNEL = "ride:space";

function calcDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1));
}

function getApiUrl(path: string): string {
  if (typeof window !== "undefined" && window.location?.origin) return `${window.location.origin}${path}`;
  const domain = process.env["EXPO_PUBLIC_DOMAIN"] ?? "";
  return domain ? `https://${domain}${path}` : path;
}

type Phase = "input" | "ready" | "searching" | "found";

export default function OtcRideScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user: authUser, token: authToken } = useAuth();
  const { city, district, coordinates } = useLocation();
  const { setSelectedClass } = useRide();
  const { addTransaction } = useWallet();
  const { serviceMode, setServiceMode, trunkSpaceLiters, setTrunkSpaceLiters, addInvestment } = useWealth();

  const [phase, setPhase] = useState<Phase>("input");
  const [pickup, setPickup] = useState<MapCoord | null>(null);
  const [dropoff, setDropoff] = useState<MapCoord | null>(null);
  const [dropoffFocused, setDropoffFocused] = useState(false);
  const [rideType, setRideType] = useState<OtcRideType>(OTC_RIDE_TYPES[1]);
  const [suggestedPrice, setSuggestedPrice] = useState(0);
  const [offeredPrice, setOfferedPrice] = useState("");
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [driverInfo, setDriverInfo] = useState<DriverInfo | null>(null);
  const [rideId, setRideId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [insufficientBalance, setInsufficientBalance] = useState(false);
  const [isSharedSpaceEnabled, setIsSharedSpaceEnabled] = useState(true);

  const searchAnim = useRef(new Animated.Value(0)).current;
  const searchLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const realtimeChannelRef = useRef<ReturnType<NonNullable<typeof supabase>["channel"]> | null>(null);
  const handledRef = useRef(false);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 16);
  const distanceKm = pickup && dropoff ? calcDistance(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng) : 0;
  const fare = parseInt(offeredPrice, 10) || suggestedPrice;
  const microInvestment = Math.round(fare * 0.02);

  useEffect(() => {
    if (coordinates) setPickup({ lat: coordinates.lat, lng: coordinates.lng, name: district || city || "Your Location" });
    else setPickup({ lat: 24.8607, lng: 67.0011, name: "Karachi, Pakistan" });
  }, [coordinates, city, district]);

  useEffect(() => {
    return () => { if (realtimeChannelRef.current && supabase) { supabase.removeChannel(realtimeChannelRef.current); realtimeChannelRef.current = null; } };
  }, []);

  useEffect(() => {
    if (distanceKm > 0) {
      const p = Math.round(distanceKm * rideType.baseRate);
      setSuggestedPrice(p);
      setOfferedPrice(p.toString());
    }
  }, [distanceKm, rideType]);

  function startSearchAnimation() {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(searchAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(searchAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]));
    searchLoopRef.current = loop;
    loop.start();
  }

  function stopSearchAnimation() { searchLoopRef.current?.stop(); searchLoopRef.current = null; searchAnim.setValue(0); }

  async function handleConfirm() {
    if (!pickup || !dropoff) return;
    if (paymentMethod === "wallet" && walletBalance !== null && walletBalance < fare) { setInsufficientBalance(true); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const bidId = `OTC-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    setRideId(bidId);
    setPhase("searching");
    handledRef.current = false;
    startSearchAnimation();

    if (supabase) {
      await supabase.from("ride_requests").insert({
        id: bidId,
        user_id: authUser?.id ?? null,
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
        offered_price: fare,
        status: "searching",
        service_mode: serviceMode,
        trunk_space_liters: trunkSpaceLiters,
        shared_space_enabled: isSharedSpaceEnabled,
      });

      const channel = supabase.channel(`ride-assign-${bidId}`).on("postgres_changes", { event: "UPDATE", schema: "public", table: "ride_requests", filter: `id=eq.${bidId}` }, (payload) => {
        const row = payload.new as Record<string, unknown>;
        if (row["status"] === "assigned") {
          handleDriverAssigned({
            driver_id: row["driver_id"] as string,
            driver_name: row["driver_name"] as string,
            driver_phone: (row["driver_phone"] as string | null) ?? null,
            driver_vehicle_model: (row["driver_vehicle_model"] as string | null) ?? null,
            driver_plate: (row["driver_plate"] as string | null) ?? null,
            driver_rating: (row["driver_rating"] as number) ?? 4.8,
            driver_eta: (row["driver_eta"] as number) ?? 5,
            total_fare: (row["total_fare"] as number) ?? 0,
          });
        }
      }).subscribe();
      realtimeChannelRef.current = channel;

      try {
        const resp = await fetch(getApiUrl("/api/otc/match-driver"), { method: "POST", headers: { "Content-Type": "application/json", ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) }, body: JSON.stringify({ ride_request_id: bidId, pickup_lat: pickup.lat, pickup_lng: pickup.lng, ride_type: rideType.id, distance_km: distanceKm, payment_method: paymentMethod, service_mode: serviceMode, trunk_space_liters: trunkSpaceLiters, shared_space_enabled: isSharedSpaceEnabled }) });
        const json = await resp.json() as { status: string; driver?: { id: string; name: string; phone: string | null; vehicle_model: string | null; plate_number: string | null; rating: number; eta: number }; total_fare?: number };
        if (json.status === "assigned") handleDriverAssigned(json);
      } catch {
        setTimeout(() => handleDriverAssigned({ driver: { id: "demo", name: "Tariq Mehmood", phone: "+923001234567", vehicle_model: "Honda Civic", plate_number: "KHI-908", rating: 4.9, eta: 4 }, total_fare: fare }), 1800);
      }
    }
  }

  function handleDriverAssigned(data: { driver?: { id: string; name: string; phone: string | null; vehicle_model: string | null; plate_number: string | null; rating: number; eta: number }; total_fare?: number; driver_id?: string; driver_name?: string; driver_phone?: string | null; driver_vehicle_model?: string | null; driver_plate?: string | null; driver_rating?: number; driver_eta?: number; total_fare_row?: number; }) {
    if (handledRef.current) return;
    handledRef.current = true;
    stopSearchAnimation();
    const info: DriverInfo = { id: data.driver?.id ?? data.driver_id ?? "unknown", name: data.driver?.name ?? data.driver_name ?? "OTC Partner", phone: data.driver?.phone ?? data.driver_phone ?? null, vehicleModel: data.driver?.vehicle_model ?? data.driver_vehicle_model ?? null, plate: data.driver?.plate_number ?? data.driver_plate ?? null, rating: data.driver?.rating ?? data.driver_rating ?? 4.8, eta: data.driver?.eta ?? data.driver_eta ?? 5, totalFare: data.total_fare ?? data.total_fare_row ?? fare, rideTypeLabel: rideType.label };
    setDriverInfo(info);
    setPhase("found");
    addInvestment({ rideId: rideId ?? "pending", fare, amount: microInvestment, assetType: "digital_asset" });
    addTransaction({ type: "debit", amount: microInvestment, description: "Micro-investment to digital asset wallet", category: "commission" });
  }

  function resetRide() { stopSearchAnimation(); if (realtimeChannelRef.current && supabase) { supabase.removeChannel(realtimeChannelRef.current); realtimeChannelRef.current = null; } setPhase("input"); setDropoff(null); setDropoffFocused(false); setOfferedPrice(""); setSuggestedPrice(0); setRideId(null); setDriverInfo(null); setPaymentMethod("cash"); setWalletBalance(null); setInsufficientBalance(false); handledRef.current = false; }

  return (
    <View style={styles.root}>
      <RideMapFull pickup={pickup} dropoff={dropoff} searching={phase === "searching"} style={StyleSheet.absoluteFill} />
      <View style={[styles.topBar, { paddingTop: topPad, paddingHorizontal: 20 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}><Feather name="arrow-left" size={20} color="#FFD700" /></TouchableOpacity>
        <View style={styles.titleBadge}><Text style={styles.titleText}>OTC RIDE</Text></View>
        {phase !== "input" ? <TouchableOpacity style={styles.resetBtn} onPress={resetRide} activeOpacity={0.8}><Feather name="refresh-ccw" size={16} color="#888" /></TouchableOpacity> : <View style={{ width: 40 }} />}
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.kavWrapper} keyboardVerticalOffset={0}>
        <View style={[styles.bottomPanel, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 24 : 12), maxHeight: SCREEN_H * 0.78 }]}>
          <View style={styles.dragHandle} />
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.panelScroll}>
            {(phase === "input" || phase === "ready") && <View style={styles.inputCard}><PlacesSearch label="PICKUP" placeholder="Detecting location…" value={pickup?.name ?? ""} onSelect={(p) => setPickup({ lat: p.lat, lng: p.lng, name: p.name })} proximityLng={pickup?.lng ?? 67.0011} proximityLat={pickup?.lat ?? 24.8607} dotColor="#FFD700" readOnly onPress={() => {}} /><View style={styles.inputDivider} />{dropoffFocused ? <PlacesSearch label="DESTINATION" placeholder="Where to?" value={dropoff?.name ?? ""} onSelect={(p) => { setDropoff({ lat: p.lat, lng: p.lng, name: p.name }); setDropoffFocused(false); }} proximityLng={pickup?.lng ?? 67.0011} proximityLat={pickup?.lat ?? 24.8607} dotColor="#22C55E" /> : <PlacesSearch label="DESTINATION" placeholder="Where to?" value={dropoff?.name ?? ""} onSelect={(p) => { setDropoff({ lat: p.lat, lng: p.lng, name: p.name }); setDropoffFocused(false); }} proximityLng={pickup?.lng ?? 67.0011} proximityLat={pickup?.lat ?? 24.8607} dotColor={dropoff ? "#22C55E" : "#555"} readOnly onPress={() => setDropoffFocused(true)} />}</View>}
            {dropoff && (
              <>
                <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Passenger Experience</Text></View>
                <ServiceModeSelector value={serviceMode} onChange={setServiceMode} />
                <SharedSpaceCard trunkLiters={trunkSpaceLiters} available={isSharedSpaceEnabled} onToggle={() => { setIsSharedSpaceEnabled((v) => !v); setTrunkSpaceLiters((v) => (v > 0 ? 0 : 42)); }} />
                <View style={styles.distanceRow}><Feather name="map" size={12} color="#FFD700" /><Text style={styles.distanceText}>{distanceKm} km route</Text></View>
                <View style={styles.fareCard}><Text style={styles.fareCardTitle}>YOUR BID PRICE</Text><View style={styles.fareCardBody}><View style={styles.fareSide}><Text style={styles.fareSmallLabel}>SUGGESTED</Text><Text style={styles.fareSmallAmt}>PKR {suggestedPrice.toLocaleString()}</Text></View><View style={styles.fareVDivider} /><View style={styles.fareSide}><Text style={styles.fareSmallLabel}>YOUR OFFER</Text>{isEditingPrice ? <TextInput style={styles.fareInput} value={offeredPrice} onChangeText={setOfferedPrice} keyboardType="numeric" autoFocus onBlur={() => setIsEditingPrice(false)} selectTextOnFocus /> : <TouchableOpacity style={styles.fareEditRow} onPress={() => setIsEditingPrice(true)}><Text style={styles.fareEditAmt}>PKR {fare.toLocaleString()}</Text><Feather name="edit-2" size={12} color="#FFD700" /></TouchableOpacity>}</View></View><View style={styles.bidHintRow}><Feather name="zap" size={11} color="#444" /><Text style={styles.bidHintText}>Drivers see your fare, service mode, and trunk space in real-time</Text></View></View>
                <MicroInvestmentCard fare={fare} amount={microInvestment} />
              </>
            )}
            {phase === "searching" && <View style={styles.searchCard}><ActivityIndicator color="#FFD700" /><Text style={styles.searchText}>Searching for drivers…</Text></View>}
            {phase === "found" && driverInfo && <DriverFoundCard driver={driverInfo} onCancel={resetRide} onStartRide={() => router.push("/services/ride-active")} />}
          </ScrollView>
          <View style={styles.ctaWrap}>{phase === "input" || phase === "ready" ? <TouchableOpacity style={[styles.ctaBtn, !dropoff && styles.ctaBtnDisabled]} onPress={handleConfirm} disabled={!dropoff} activeOpacity={0.85}><Feather name="zap" size={18} color="#000" /><Text style={styles.ctaBtnText}>{dropoff ? `Post Bid · PKR ${fare.toLocaleString()}` : "Enter Destination to Bid"}</Text></TouchableOpacity> : phase === "searching" ? <TouchableOpacity style={styles.cancelBtn} onPress={resetRide}><Text style={styles.cancelText}>Cancel Bid</Text></TouchableOpacity> : null}</View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" }, topBar: { position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 12, zIndex: 10 }, backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.72)", borderWidth: 1, borderColor: "rgba(255,215,0,0.25)", alignItems: "center", justifyContent: "center" }, titleBadge: { backgroundColor: "rgba(0,0,0,0.72)", borderWidth: 1, borderColor: "rgba(255,215,0,0.25)", borderRadius: 20, paddingHorizontal: 18, paddingVertical: 9 }, titleText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#FFD700", letterSpacing: 2 }, resetBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.72)", borderWidth: 1, borderColor: "rgba(255,215,0,0.12)", alignItems: "center", justifyContent: "center" }, kavWrapper: { position: "absolute", bottom: 0, left: 0, right: 0 }, bottomPanel: { backgroundColor: "rgba(8,8,8,0.97)", borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: "rgba(255,215,0,0.12)", paddingTop: 10, paddingHorizontal: 20 }, dragHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(255,215,0,0.25)", alignSelf: "center", marginBottom: 16 }, panelScroll: { gap: 16, paddingBottom: 8 }, inputCard: { backgroundColor: "#111", borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,215,0,0.15)", paddingHorizontal: 16, paddingVertical: 4 }, inputDivider: { height: 1, backgroundColor: "rgba(255,215,0,0.08)", marginLeft: 22 }, sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, sectionTitle: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#444", letterSpacing: 2, textTransform: "uppercase" }, distanceRow: { flexDirection: "row", alignItems: "center", gap: 6 }, distanceText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#FFD700" }, fareCard: { backgroundColor: "#111", borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,215,0,0.18)", padding: 16, gap: 12 }, fareCardTitle: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#555", letterSpacing: 1.5 }, fareCardBody: { flexDirection: "row", alignItems: "center" }, fareSide: { flex: 1, gap: 4 }, fareSmallLabel: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#555", letterSpacing: 1 }, fareSmallAmt: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#888" }, fareVDivider: { width: 1, height: 44, backgroundColor: "rgba(255,215,0,0.12)", marginHorizontal: 16 }, fareEditRow: { flexDirection: "row", alignItems: "center", gap: 8 }, fareEditAmt: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#FFD700" }, fareInput: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#FFD700", padding: 0, margin: 0, minWidth: 80 }, bidHintRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 }, bidHintText: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#444", flex: 1 }, searchCard: { backgroundColor: "#111", borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,215,0,0.1)", padding: 24, alignItems: "center", gap: 10 }, searchText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" }, ctaWrap: { marginTop: 12 }, ctaBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "#FFD700", borderRadius: 16, height: 56 }, ctaBtnDisabled: { backgroundColor: "#111" }, ctaBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#000", letterSpacing: 0.3 }, cancelBtn: { height: 52, borderRadius: 14, borderWidth: 1, borderColor: "rgba(248,113,113,0.3)", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(248,113,113,0.06)" }, cancelText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#F87171" }, });
