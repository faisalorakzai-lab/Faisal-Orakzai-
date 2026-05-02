import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
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
import { CoinBadge } from "@/components/CoinBadge";
import { GlassCard } from "@/components/GlassCard";
import { useWallet } from "@/contexts/WalletContext";
import { useColors } from "@/hooks/useColors";

type Step = "address" | "package" | "tracking";

type FeatherIconName = React.ComponentProps<typeof Feather>["name"];

interface PackageType {
  id: string;
  label: string;
  icon: FeatherIconName;
  description: string;
  price: number;
  eta: string;
}

const PACKAGE_TYPES: PackageType[] = [
  {
    id: "document",
    label: "Documents",
    icon: "file-text",
    description: "Letters, contracts, official papers",
    price: 250,
    eta: "1-2 hrs",
  },
  {
    id: "small",
    label: "Small Parcel",
    icon: "package",
    description: "Electronics, clothing, small gifts",
    price: 350,
    eta: "2-3 hrs",
  },
  {
    id: "large",
    label: "Large Parcel",
    icon: "box",
    description: "Appliances, bulk items, cartons",
    price: 600,
    eta: "3-5 hrs",
  },
  {
    id: "fragile",
    label: "Fragile Item",
    icon: "alert-triangle",
    description: "Glassware, ceramics, delicate items",
    price: 500,
    eta: "2-4 hrs",
  },
];

const TRACKING_STEPS: { id: string; label: string; icon: FeatherIconName }[] = [
  { id: "pickup", label: "Courier dispatched", icon: "user-check" },
  { id: "collected", label: "Package collected", icon: "package" },
  { id: "transit", label: "In transit", icon: "truck" },
  { id: "nearby", label: "Arriving soon", icon: "map-pin" },
  { id: "delivered", label: "Delivered!", icon: "check-circle" },
];

const COIN_REWARD = 3;

export default function DeliveryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addTransaction, balance } = useWallet();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 16);

  const [step, setStep] = useState<Step>("address");
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [selectedPackage, setSelectedPackage] = useState<PackageType | null>(null);
  const [trackingStep, setTrackingStep] = useState(0);
  const [rewarded, setRewarded] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (step !== "tracking") return;

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start();

    let current = 0;
    const interval = setInterval(() => {
      current += 1;
      setTrackingStep(current);
      Animated.timing(progressAnim, {
        toValue: current / (TRACKING_STEPS.length - 1),
        duration: 500,
        useNativeDriver: false,
      }).start();
      if (current >= TRACKING_STEPS.length - 1) {
        clearInterval(interval);
        if (!rewarded) {
          setRewarded(true);
          addTransaction({
            type: "credit",
            amount: COIN_REWARD,
            description: "OTC Delivery booking reward",
            category: "delivery",
          });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    }, 2200);

    return () => {
      clearInterval(interval);
      pulseAnim.stopAnimation();
    };
  }, [step]);

  function handleAddressContinue() {
    if (!pickup.trim() || !dropoff.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep("package");
  }

  function handlePackageContinue() {
    if (!selectedPackage) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStep("tracking");
  }

  const isDelivered = trackingStep >= TRACKING_STEPS.length - 1;

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
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            if (step === "package") { setStep("address"); return; }
            if (step === "tracking" && !isDelivered) { setStep("package"); return; }
            router.back();
          }}
          activeOpacity={0.8}
        >
          <Feather name="arrow-left" size={22} color={colors.gold} />
        </TouchableOpacity>

        <View style={styles.headerRow}>
          <View style={[styles.heroIcon, { backgroundColor: "rgba(255,215,0,0.08)", borderColor: colors.glassBorder }]}>
            <Feather name="package" size={36} color={colors.gold} />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.screenTitle, { color: colors.foreground }]}>OTC Delivery</Text>
            <Text style={[styles.screenSub, { color: colors.mutedForeground }]}>Same-day door-to-door</Text>
          </View>
        </View>

        <View style={styles.stepPills}>
          {(["address", "package", "tracking"] as Step[]).map((s, i) => (
            <View key={s} style={styles.pillRow}>
              <View style={[
                styles.pill,
                {
                  backgroundColor: step === s ? colors.gold : (
                    (["address", "package", "tracking"].indexOf(step) > i) ? "rgba(255,215,0,0.3)" : colors.muted
                  ),
                },
              ]}>
                <Text style={[styles.pillText, { color: step === s ? "#050505" : colors.mutedForeground }]}>
                  {i + 1}
                </Text>
              </View>
              {i < 2 && <View style={[styles.pillLine, { backgroundColor: colors.border }]} />}
            </View>
          ))}
        </View>

        {step === "address" && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Pickup & Delivery</Text>

            <GlassCard style={styles.addressCard}>
              <View style={[styles.addressRow, { borderBottomColor: colors.border }]}>
                <View style={[styles.dotGreen, { backgroundColor: "#4CAF50" }]} />
                <TextInput
                  style={[styles.addressInput, { color: colors.foreground }]}
                  placeholder="Pickup address"
                  placeholderTextColor={colors.mutedForeground}
                  value={pickup}
                  onChangeText={setPickup}
                />
              </View>
              <View style={styles.addressRow}>
                <View style={[styles.dotRed, { backgroundColor: colors.gold }]} />
                <TextInput
                  style={[styles.addressInput, { color: colors.foreground }]}
                  placeholder="Drop-off address"
                  placeholderTextColor={colors.mutedForeground}
                  value={dropoff}
                  onChangeText={setDropoff}
                />
              </View>
            </GlassCard>

            <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 8 }]}>Quick Locations</Text>
            <View style={styles.quickLocRow}>
              {["Karachi Airport", "DHA Phase 5", "Gulshan Chowrangi", "Saddar"].map((loc) => (
                <TouchableOpacity
                  key={loc}
                  style={[styles.quickLoc, { backgroundColor: colors.glassBackground, borderColor: colors.glassBorder }]}
                  onPress={() => {
                    if (!pickup) setPickup(loc);
                    else if (!dropoff) setDropoff(loc);
                  }}
                  activeOpacity={0.8}
                >
                  <Feather name="map-pin" size={12} color={colors.gold} />
                  <Text style={[styles.quickLocText, { color: colors.foreground }]}>{loc}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <GlassCard variant="gold" style={styles.rewardNote}>
              <Feather name="star" size={14} color={colors.gold} />
              <Text style={[styles.rewardText, { color: colors.foreground }]}>
                Earn <Text style={{ color: colors.gold, fontFamily: "Inter_700Bold" }}>+{COIN_REWARD} OTC Coins</Text> on this delivery
              </Text>
            </GlassCard>
          </View>
        )}

        {step === "package" && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Package Type</Text>
            <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>Select what you are sending</Text>
            {PACKAGE_TYPES.map((pkg) => (
              <TouchableOpacity
                key={pkg.id}
                onPress={() => {
                  setSelectedPackage(pkg);
                  Haptics.selectionAsync();
                }}
                activeOpacity={0.85}
              >
                <GlassCard
                  variant={selectedPackage?.id === pkg.id ? "gold" : "default"}
                  style={[styles.packageCard, selectedPackage?.id === pkg.id && { borderColor: colors.gold }]}
                >
                  <View style={[styles.pkgIcon, { backgroundColor: "rgba(255,215,0,0.1)", borderRadius: 12 }]}>
                    <Feather name={pkg.icon} size={24} color={colors.gold} />
                  </View>
                  <View style={styles.pkgInfo}>
                    <Text style={[styles.pkgLabel, { color: colors.foreground }]}>{pkg.label}</Text>
                    <Text style={[styles.pkgDesc, { color: colors.mutedForeground }]}>{pkg.description}</Text>
                  </View>
                  <View style={styles.pkgMeta}>
                    <Text style={[styles.pkgPrice, { color: colors.gold }]}>PKR {pkg.price}</Text>
                    <Text style={[styles.pkgEta, { color: colors.mutedForeground }]}>{pkg.eta}</Text>
                  </View>
                  {selectedPackage?.id === pkg.id && (
                    <View style={[styles.checkBadge, { backgroundColor: colors.gold, borderRadius: 12 }]}>
                      <Feather name="check" size={14} color="#050505" />
                    </View>
                  )}
                </GlassCard>
              </TouchableOpacity>
            ))}

            {selectedPackage && (
              <GlassCard style={styles.summaryCard}>
                <Text style={[styles.summaryTitle, { color: colors.mutedForeground }]}>Delivery Summary</Text>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>From</Text>
                  <Text style={[styles.summaryVal, { color: colors.foreground }]} numberOfLines={1}>{pickup}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>To</Text>
                  <Text style={[styles.summaryVal, { color: colors.foreground }]} numberOfLines={1}>{dropoff}</Text>
                </View>
                <View style={[styles.summaryRow, styles.summaryDivider, { borderTopColor: colors.border }]}>
                  <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Total</Text>
                  <Text style={[styles.summaryTotal, { color: colors.gold }]}>PKR {selectedPackage.price}</Text>
                </View>
              </GlassCard>
            )}
          </View>
        )}

        {step === "tracking" && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              {isDelivered ? "Package Delivered!" : "Live Tracking"}
            </Text>
            <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>
              {isDelivered ? "Your package has been delivered successfully" : "Real-time courier status"}
            </Text>

            <GlassCard style={styles.mapStub}>
              <View style={styles.mapContent}>
                <Animated.View style={[styles.mapPulse, { transform: [{ scale: pulseAnim }], backgroundColor: "rgba(255,215,0,0.2)", borderRadius: 40 }]}>
                  <Feather name={isDelivered ? "check-circle" : "truck"} size={32} color={colors.gold} />
                </Animated.View>
                <Text style={[styles.mapLabel, { color: colors.mutedForeground }]}>
                  {isDelivered ? "Delivered to " + dropoff : "En route to " + dropoff}
                </Text>
              </View>
            </GlassCard>

            <GlassCard style={styles.trackingCard}>
              {TRACKING_STEPS.map((ts, i) => {
                const done = i <= trackingStep;
                const active = i === trackingStep && !isDelivered;
                return (
                  <View key={ts.id} style={styles.trackRow}>
                    <View style={styles.trackLeft}>
                      <View style={[
                        styles.trackDot,
                        {
                          backgroundColor: done ? colors.gold : colors.muted,
                          borderColor: active ? colors.gold : "transparent",
                          borderWidth: active ? 2 : 0,
                        },
                      ]}>
                        {done && <Feather name={ts.icon} size={12} color="#050505" />}
                      </View>
                      {i < TRACKING_STEPS.length - 1 && (
                        <View style={[styles.trackLine, { backgroundColor: i < trackingStep ? colors.gold : colors.border }]} />
                      )}
                    </View>
                    <Text style={[styles.trackLabel, { color: done ? colors.foreground : colors.mutedForeground }]}>
                      {ts.label}
                    </Text>
                  </View>
                );
              })}
            </GlassCard>

            {isDelivered && (
              <GlassCard variant="gold" style={styles.rewardBanner}>
                <Feather name="star" size={18} color={colors.gold} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rewardBannerTitle, { color: colors.foreground }]}>Reward Earned!</Text>
                  <Text style={[styles.rewardBannerSub, { color: colors.mutedForeground }]}>
                    +{COIN_REWARD} OTC Coins added to your wallet
                  </Text>
                </View>
                <CoinBadge amount={balance} size="sm" />
              </GlassCard>
            )}
          </View>
        )}
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 16), backgroundColor: colors.background, borderTopColor: colors.border }]}>
        {step === "address" && (
          <TouchableOpacity
            style={[styles.cta, { backgroundColor: colors.gold, borderRadius: colors.radius }]}
            onPress={handleAddressContinue}
            activeOpacity={0.85}
          >
            <Text style={[styles.ctaText, { color: "#050505" }]}>Set Package Details</Text>
            <Feather name="arrow-right" size={18} color="#050505" />
          </TouchableOpacity>
        )}
        {step === "package" && (
          <TouchableOpacity
            style={[styles.cta, { backgroundColor: selectedPackage ? colors.gold : colors.muted, borderRadius: colors.radius }]}
            onPress={handlePackageContinue}
            activeOpacity={0.85}
            disabled={!selectedPackage}
          >
            <Text style={[styles.ctaText, { color: selectedPackage ? "#050505" : colors.mutedForeground }]}>Confirm & Send</Text>
            <Feather name="send" size={18} color={selectedPackage ? "#050505" : colors.mutedForeground} />
          </TouchableOpacity>
        )}
        {step === "tracking" && isDelivered && (
          <TouchableOpacity
            style={[styles.cta, { backgroundColor: colors.gold, borderRadius: colors.radius }]}
            onPress={() => router.back()}
            activeOpacity={0.85}
          >
            <Text style={[styles.ctaText, { color: "#050505" }]}>Back to Home</Text>
            <Feather name="home" size={18} color="#050505" />
          </TouchableOpacity>
        )}
        {step === "tracking" && !isDelivered && (
          <View style={[styles.cta, { backgroundColor: colors.muted, borderRadius: colors.radius }]}>
            <Text style={[styles.ctaText, { color: colors.mutedForeground }]}>Tracking in progress…</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20, gap: 16 },
  backBtn: { alignSelf: "flex-start", padding: 4, marginBottom: 4 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1 },
  screenTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  screenSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  stepPills: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 0, marginVertical: 4 },
  pillRow: { flexDirection: "row", alignItems: "center" },
  pill: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  pillText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  pillLine: { width: 40, height: 2 },
  section: { gap: 14 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  sectionSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: -8 },
  addressCard: { overflow: "hidden" },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  dotGreen: { width: 10, height: 10, borderRadius: 5 },
  dotRed: { width: 10, height: 10, borderRadius: 5 },
  addressInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", padding: 0 },
  quickLocRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quickLoc: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  quickLocText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  rewardNote: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14 },
  rewardText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  packageCard: { padding: 14, flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 0 },
  pkgIcon: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  pkgInfo: { flex: 1 },
  pkgLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  pkgDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  pkgMeta: { alignItems: "flex-end" },
  pkgPrice: { fontSize: 14, fontFamily: "Inter_700Bold" },
  pkgEta: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  checkBadge: { width: 24, height: 24, alignItems: "center", justifyContent: "center" },
  summaryCard: { padding: 16, gap: 10 },
  summaryTitle: { fontSize: 11, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  summaryVal: { fontSize: 13, fontFamily: "Inter_500Medium", maxWidth: "60%" },
  summaryDivider: { borderTopWidth: 1, paddingTop: 10, marginTop: 2 },
  summaryTotal: { fontSize: 16, fontFamily: "Inter_700Bold" },
  mapStub: {
    height: 180,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,215,0,0.03)",
  },
  mapContent: { alignItems: "center", gap: 14 },
  mapPulse: { width: 72, height: 72, alignItems: "center", justifyContent: "center" },
  mapLabel: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  trackingCard: { padding: 16, gap: 0 },
  trackRow: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  trackLeft: { alignItems: "center", width: 24 },
  trackDot: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  trackLine: { width: 2, height: 28, marginTop: 2 },
  trackLabel: { fontSize: 14, fontFamily: "Inter_500Medium", paddingBottom: 24, paddingTop: 4 },
  rewardBanner: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  rewardBannerTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  rewardBannerSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  bottomBar: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 56,
    gap: 8,
  },
  ctaText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
