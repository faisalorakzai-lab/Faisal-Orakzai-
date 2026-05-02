import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DriverEquityCard } from "@/components/ride/DriverEquityCard";
import { ProofOfRideCard } from "@/components/ride/ProofOfRideCard";
import { SovereignMap } from "@/components/ride/SovereignMap";
import { VehicleClassSelector } from "@/components/ride/VehicleClassSelector";
import { VoiceCommandPanel } from "@/components/ride/VoiceCommandPanel";
import { GlassCard } from "@/components/GlassCard";
import { useCharacter } from "@/contexts/CharacterContext";
import {
  generateProofHash,
  pickGridNode,
  useRide,
  type RideClass,
  type RideSession,
} from "@/contexts/RideContext";
import { useWallet } from "@/contexts/WalletContext";
import { useColors } from "@/hooks/useColors";

const KARACHI_LOCATIONS = [
  { name: "DHA Phase 2", lat: 24.7999, lng: 67.0595 },
  { name: "Clifton Block 5", lat: 24.8114, lng: 67.0305 },
  { name: "Gulshan-e-Iqbal", lat: 24.9205, lng: 67.1237 },
  { name: "Saddar", lat: 24.8617, lng: 67.0176 },
  { name: "PECHS Block 2", lat: 24.8742, lng: 67.0658 },
  { name: "Karachi Airport", lat: 24.9008, lng: 67.1681 },
  { name: "Dolmen Mall", lat: 24.8093, lng: 67.0274 },
  { name: "North Nazimabad", lat: 24.9465, lng: 67.0537 },
  { name: "Korangi", lat: 24.8278, lng: 67.1222 },
  { name: "Bahria Town", lat: 24.8606, lng: 67.2652 },
];

const DRIVERS = [
  { name: "Tariq Mehmood", rating: 4.9, equityPoints: 2840, totalRides: 1243, partnerSince: "2023" },
  { name: "Asad Ali Khan", rating: 4.8, equityPoints: 1520, totalRides: 876, partnerSince: "2024" },
  { name: "Samiullah Baig", rating: 5.0, equityPoints: 4210, totalRides: 2108, partnerSince: "2022" },
  { name: "Fawad Iqbal", rating: 4.7, equityPoints: 960, totalRides: 534, partnerSince: "2024" },
];

type BookingPhase =
  | "map"
  | "selecting"
  | "voice"
  | "confirming"
  | "searching"
  | "found"
  | "proof";

function calcDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
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

const BASE_RATE_PER_KM = 42;

export default function SovereignRideScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, getPersonalizedPrice } = useCharacter();
  const { addTransaction } = useWallet();
  const { selectedClass, setSelectedClass, startRide, session, cancelRide } = useRide();

  const [phase, setPhase] = useState<BookingPhase>("map");
  const [pickup, setPickup] = useState(KARACHI_LOCATIONS[0]);
  const [dropoff, setDropoff] = useState<typeof KARACHI_LOCATIONS[0] | null>(null);
  const [searchingDropoff, setSearchingDropoff] = useState(false);
  const [dropoffInput, setDropoffInput] = useState("");
  const [dropoffResults, setDropoffResults] = useState<typeof KARACHI_LOCATIONS>([]);
  const [driver, setDriver] = useState(DRIVERS[0]);
  const [currentSession, setCurrentSession] = useState<RideSession | null>(null);
  const [showVoice, setShowVoice] = useState(false);

  const searchAnim = useRef(new Animated.Value(0)).current;
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 16);

  const distance = dropoff
    ? calcDistance(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng)
    : 0;
  const classMultipliers: Record<RideClass, number> = {
    sovereign: 1.8,
    autonomous: 1.4,
    community: 1.0,
  };
  const basePrice = Math.round(distance * BASE_RATE_PER_KM * classMultipliers[selectedClass]);
  const finalPrice = getPersonalizedPrice(basePrice);
  const coinsEarned = selectedClass === "sovereign" ? 8 : selectedClass === "autonomous" ? 5 : 2;

  function handleDropoffSearch(text: string) {
    setDropoffInput(text);
    if (!text) { setDropoffResults([]); return; }
    const filtered = KARACHI_LOCATIONS.filter(
      (l) =>
        l.name.toLowerCase().includes(text.toLowerCase()) &&
        l.name !== pickup.name
    );
    setDropoffResults(filtered);
  }

  function selectDropoff(loc: typeof KARACHI_LOCATIONS[0]) {
    setDropoff(loc);
    setDropoffInput(loc.name);
    setDropoffResults([]);
    setSearchingDropoff(false);
    setPhase("selecting");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function handleVoiceParsed(
    destination: string,
    rideClass?: RideClass
  ) {
    const found = KARACHI_LOCATIONS.find((l) =>
      l.name.toLowerCase().includes(destination.toLowerCase())
    );
    if (found) {
      selectDropoff(found);
    } else {
      const pseudo = { name: destination, lat: 24.85 + Math.random() * 0.1, lng: 67.0 + Math.random() * 0.2 };
      selectDropoff(pseudo as any);
    }
    if (rideClass) setSelectedClass(rideClass);
    setShowVoice(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function handleConfirmRide() {
    if (!dropoff) return;
    setPhase("searching");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Simulate driver search animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(searchAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(searchAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    ).start();

    const chosenDriver = DRIVERS[Math.floor(Math.random() * DRIVERS.length)];
    setDriver(chosenDriver);

    setTimeout(() => {
      searchAnim.stopAnimation();
      const sessionId = Date.now().toString() + Math.random().toString(36).substring(2, 8);
      const gridNode = pickGridNode();
      const partial = {
        id: sessionId,
        rideClass: selectedClass,
        pickup: { name: pickup.name, lat: pickup.lat, lng: pickup.lng },
        dropoff: { name: dropoff.name, lat: dropoff.lat, lng: dropoff.lng },
        distance,
        basePrice,
        finalPrice,
        discountApplied: basePrice - finalPrice,
        coinsEarned,
        driverName: chosenDriver.name,
        driverRating: chosenDriver.rating,
        driverEquityPoints: chosenDriver.equityPoints,
        startedAt: Date.now(),
        gridNode,
      };
      const hash = generateProofHash(partial);
      const newSession: RideSession = { ...partial, proofHash: hash };
      setCurrentSession(newSession);
      setPhase("found");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 2500);
  }

  function handleStartRide() {
    if (!currentSession) return;
    startRide(currentSession);
    router.push("/services/sovereign-mode");
  }

  function handleProofDone() {
    cancelRide();
    router.back();
  }

  const characterTierColors: Record<string, string> = {
    Pioneer: "#8A8060",
    Elite: "#A78BFA",
    Sovereign: "#FFD700",
    Apex: "#FF6B35",
  };
  const tierColor = characterTierColors[profile.tier] ?? colors.gold;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: topPad,
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 100),
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={colors.gold} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.screenTitle, { color: colors.gold }]}>
              Sovereign Ride
            </Text>
            <Text style={[styles.screenSub, { color: colors.mutedForeground }]}>
              Orakzai Mobility Grid
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.voiceBtn, { borderColor: colors.glassBorder, borderRadius: 20 }]}
            onPress={() => {
              setShowVoice(!showVoice);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            activeOpacity={0.8}
          >
            <Feather name="mic" size={18} color={showVoice ? colors.gold : colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Character Credits Bar */}
        <GlassCard variant="gold" style={styles.creditsCard}>
          <View style={styles.creditsRow}>
            <View style={styles.creditsLeft}>
              <Feather name="award" size={16} color={tierColor} />
              <Text style={[styles.tierName, { color: tierColor }]}>
                {profile.tier}
              </Text>
              <View style={[styles.tierBadge, { backgroundColor: `${tierColor}18`, borderRadius: 4 }]}>
                <Text style={[styles.tierBadgeText, { color: tierColor }]}>
                  CC {profile.credits}
                </Text>
              </View>
            </View>
            <View style={styles.creditsRight}>
              {profile.discountRate > 0 && (
                <View style={styles.discountFlag}>
                  <Feather name="percent" size={12} color="#22C55E" />
                  <Text style={styles.discountFlagText}>
                    {Math.round(profile.discountRate * 100)}% discount active
                  </Text>
                </View>
              )}
              <Text style={[styles.creditsHint, { color: colors.mutedForeground }]}>
                Earn credits per ride
              </Text>
            </View>
          </View>
        </GlassCard>

        {/* Voice Panel */}
        {showVoice && (
          <VoiceCommandPanel
            onParsed={handleVoiceParsed}
            onDismiss={() => setShowVoice(false)}
          />
        )}

        {/* Map */}
        <SovereignMap
          pickupLabel={pickup.name}
          dropoffLabel={dropoff?.name}
        />

        {/* Location Inputs */}
        <GlassCard style={styles.locationCard}>
          {/* Pickup */}
          <View style={styles.locationRow}>
            <View style={[styles.locationDot, { backgroundColor: colors.gold }]} />
            <View style={styles.locationInput}>
              <Text style={[styles.locationLabel, { color: colors.mutedForeground }]}>
                PICKUP
              </Text>
              <Text style={[styles.locationValue, { color: colors.foreground }]}>
                {pickup.name}
              </Text>
            </View>
            <Feather name="map-pin" size={16} color={colors.gold} />
          </View>

          <View style={[styles.locationDivider, { backgroundColor: colors.border }]} />

          {/* Dropoff */}
          <View style={styles.locationRow}>
            <View style={[styles.locationDot, { backgroundColor: dropoff ? "#22C55E" : colors.mutedForeground }]} />
            <View style={styles.locationInput}>
              <Text style={[styles.locationLabel, { color: colors.mutedForeground }]}>
                DESTINATION
              </Text>
              {searchingDropoff ? (
                <TextInput
                  style={[styles.locationTextInput, { color: colors.foreground }]}
                  value={dropoffInput}
                  onChangeText={handleDropoffSearch}
                  placeholder="Search destination..."
                  placeholderTextColor={colors.mutedForeground}
                  autoFocus
                  returnKeyType="search"
                />
              ) : (
                <TouchableOpacity onPress={() => setSearchingDropoff(true)}>
                  <Text
                    style={[
                      styles.locationValue,
                      { color: dropoff ? colors.foreground : colors.mutedForeground },
                    ]}
                  >
                    {dropoff ? dropoff.name : "Select destination"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity onPress={() => setSearchingDropoff(true)}>
              <Feather name="search" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {/* Search results */}
          {dropoffResults.length > 0 && (
            <View style={styles.results}>
              {dropoffResults.map((loc, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.resultItem,
                    i < dropoffResults.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                  ]}
                  onPress={() => selectDropoff(loc)}
                  activeOpacity={0.7}
                >
                  <Feather name="map-pin" size={14} color={colors.mutedForeground} />
                  <Text style={[styles.resultText, { color: colors.foreground }]}>
                    {loc.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </GlassCard>

        {/* Class Selector — shown after dropoff selected */}
        {dropoff && phase !== "searching" && phase !== "found" && phase !== "proof" && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Select Class
              </Text>
              {distance > 0 && (
                <Text style={[styles.distance, { color: colors.mutedForeground }]}>
                  {distance} km
                </Text>
              )}
            </View>
            <VehicleClassSelector
              selected={selectedClass}
              onSelect={setSelectedClass}
              basePrice={Math.round(distance * BASE_RATE_PER_KM)}
              personalizedPrice={getPersonalizedPrice}
              discountRate={profile.discountRate}
            />
          </>
        )}

        {/* Pricing Breakdown */}
        {dropoff && phase !== "searching" && phase !== "found" && phase !== "proof" && basePrice > 0 && (
          <GlassCard style={styles.pricingCard}>
            <Text style={[styles.pricingTitle, { color: colors.foreground }]}>
              Autonomous Dynamic Pricing
            </Text>
            <View style={styles.pricingRow}>
              <Text style={[styles.pricingKey, { color: colors.mutedForeground }]}>
                Distance ({distance} km)
              </Text>
              <Text style={[styles.pricingVal, { color: colors.foreground }]}>
                PKR {Math.round(distance * BASE_RATE_PER_KM).toLocaleString()}
              </Text>
            </View>
            <View style={styles.pricingRow}>
              <Text style={[styles.pricingKey, { color: colors.mutedForeground }]}>
                Class Multiplier ({selectedClass})
              </Text>
              <Text style={[styles.pricingVal, { color: colors.foreground }]}>
                ×{classMultipliers[selectedClass].toFixed(1)}
              </Text>
            </View>
            {profile.discountRate > 0 && (
              <View style={styles.pricingRow}>
                <Text style={[styles.pricingKey, { color: "#22C55E" }]}>
                  Character Credit Discount ({profile.tier})
                </Text>
                <Text style={[styles.pricingVal, { color: "#22C55E" }]}>
                  −PKR {(basePrice - finalPrice).toLocaleString()}
                </Text>
              </View>
            )}
            <View style={[styles.pricingDivider, { backgroundColor: colors.border }]} />
            <View style={styles.pricingRow}>
              <Text style={[styles.pricingTotal, { color: colors.foreground }]}>
                Total
              </Text>
              <Text style={[styles.pricingTotalVal, { color: colors.gold }]}>
                PKR {finalPrice.toLocaleString()}
              </Text>
            </View>
            <View style={styles.coinsEarnRow}>
              <Feather name="star" size={13} color={colors.gold} />
              <Text style={[styles.coinsEarn, { color: colors.mutedForeground }]}>
                You'll earn{" "}
                <Text style={{ color: colors.gold }}>{coinsEarned} OTC Coins</Text> for this ride
              </Text>
            </View>
          </GlassCard>
        )}

        {/* Searching phase */}
        {phase === "searching" && (
          <GlassCard variant="gold" style={styles.searchingCard}>
            <ActivityIndicator color={colors.gold} size="large" />
            <Text style={[styles.searchingTitle, { color: colors.foreground }]}>
              Scanning Sovereign Grid...
            </Text>
            <Text style={[styles.searchingSub, { color: colors.mutedForeground }]}>
              Matching you with the nearest{" "}
              <Text style={{ color: colors.gold }}>
                {selectedClass.charAt(0).toUpperCase() + selectedClass.slice(1)}
              </Text>{" "}
              partner
            </Text>
          </GlassCard>
        )}

        {/* Driver Found */}
        {phase === "found" && currentSession && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Partner Found
            </Text>
            <DriverEquityCard
              name={driver.name}
              rating={driver.rating}
              equityPoints={driver.equityPoints}
              totalRides={driver.totalRides}
              partnerSince={driver.partnerSince}
              eta={Math.round(3 + Math.random() * 6)}
              rideClass={selectedClass}
            />
            <ProofOfRideCard
              hash={currentSession.proofHash}
              gridNode={currentSession.gridNode}
              rideClass={selectedClass}
              timestamp={currentSession.startedAt}
            />
          </>
        )}
      </ScrollView>

      {/* Bottom CTA */}
      {phase !== "searching" && phase !== "proof" && (
        <View
          style={[
            styles.bottomBar,
            {
              paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 16),
              backgroundColor: colors.background,
              borderTopColor: colors.border,
            },
          ]}
        >
          {phase === "found" ? (
            <TouchableOpacity
              style={[styles.ctaBtn, { backgroundColor: colors.gold, borderRadius: colors.radius }]}
              onPress={handleStartRide}
              activeOpacity={0.85}
            >
              <Feather name="play" size={18} color={colors.primaryForeground} />
              <Text style={[styles.ctaBtnText, { color: colors.primaryForeground }]}>
                Activate Sovereign Mode
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.ctaBtn,
                {
                  backgroundColor: dropoff && basePrice > 0 ? colors.gold : colors.muted,
                  borderRadius: colors.radius,
                },
              ]}
              onPress={dropoff && basePrice > 0 ? handleConfirmRide : undefined}
              activeOpacity={0.85}
              disabled={!dropoff || basePrice === 0}
            >
              <Feather
                name="navigation"
                size={18}
                color={dropoff && basePrice > 0 ? colors.primaryForeground : colors.mutedForeground}
              />
              <Text
                style={[
                  styles.ctaBtnText,
                  {
                    color:
                      dropoff && basePrice > 0
                        ? colors.primaryForeground
                        : colors.mutedForeground,
                  },
                ]}
              >
                {!dropoff
                  ? "Select a Destination"
                  : `Confirm · PKR ${finalPrice.toLocaleString()}`}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20, gap: 16 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
  },
  backBtn: { padding: 4 },
  screenTitle: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: 0.3 },
  screenSub: { fontSize: 11, fontFamily: "Inter_400Regular", letterSpacing: 0.5 },
  voiceBtn: {
    marginLeft: "auto",
    width: 40,
    height: 40,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  creditsCard: { padding: 14 },
  creditsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  creditsLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  tierName: { fontSize: 14, fontFamily: "Inter_700Bold" },
  tierBadge: { paddingHorizontal: 8, paddingVertical: 3 },
  tierBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  creditsRight: { alignItems: "flex-end", gap: 3 },
  discountFlag: { flexDirection: "row", alignItems: "center", gap: 4 },
  discountFlagText: { fontSize: 11, fontFamily: "Inter_500Medium", color: "#22C55E" },
  creditsHint: { fontSize: 11, fontFamily: "Inter_400Regular" },
  locationCard: { padding: 14, gap: 0 },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
  },
  locationDot: { width: 10, height: 10, borderRadius: 5 },
  locationInput: { flex: 1 },
  locationLabel: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1, marginBottom: 2 },
  locationValue: { fontSize: 15, fontFamily: "Inter_500Medium" },
  locationTextInput: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    padding: 0,
    margin: 0,
  },
  locationDivider: { height: 1, marginLeft: 22 },
  results: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,215,0,0.08)",
    paddingTop: 8,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },
  resultText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  distance: { fontSize: 13, fontFamily: "Inter_500Medium" },
  pricingCard: { padding: 16, gap: 10 },
  pricingTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  pricingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  pricingKey: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1, marginRight: 8 },
  pricingVal: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  pricingDivider: { height: 1 },
  pricingTotal: { fontSize: 15, fontFamily: "Inter_700Bold" },
  pricingTotalVal: { fontSize: 20, fontFamily: "Inter_700Bold" },
  coinsEarnRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  coinsEarn: { fontSize: 12, fontFamily: "Inter_400Regular" },
  searchingCard: { padding: 28, alignItems: "center", gap: 14 },
  searchingTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  searchingSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 56,
    gap: 10,
  },
  ctaBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
