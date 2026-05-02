import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CoinBadge } from "@/components/CoinBadge";
import { GlassCard } from "@/components/GlassCard";
import { useWallet } from "@/contexts/WalletContext";
import { useColors } from "@/hooks/useColors";

type Step = "browse" | "duration" | "certificate";

type FeatherIconName = React.ComponentProps<typeof Feather>["name"];

interface Vehicle {
  id: string;
  name: string;
  model: string;
  category: string;
  icon: FeatherIconName;
  dailyRate: number;
  seats: number;
  transmission: string;
  fuel: string;
  features: string[];
}

const VEHICLES: Vehicle[] = [
  {
    id: "alto",
    name: "Suzuki Alto",
    model: "2024",
    category: "Economy",
    icon: "navigation",
    dailyRate: 5000,
    seats: 4,
    transmission: "Manual",
    fuel: "Petrol",
    features: ["GPS Tracking", "AC", "Full Insurance"],
  },
  {
    id: "cultus",
    name: "Suzuki Cultus",
    model: "2024",
    category: "Compact",
    icon: "navigation",
    dailyRate: 7000,
    seats: 5,
    transmission: "Auto",
    fuel: "Petrol",
    features: ["GPS Tracking", "AC", "Full Insurance", "Dash Cam"],
  },
  {
    id: "civic",
    name: "Honda Civic",
    model: "2024",
    category: "Sedan",
    icon: "navigation",
    dailyRate: 12000,
    seats: 5,
    transmission: "Auto",
    fuel: "Petrol",
    features: ["GPS Tracking", "AC", "Full Insurance", "Dash Cam", "Music System"],
  },
  {
    id: "fortuner",
    name: "Toyota Fortuner",
    model: "2024",
    category: "SUV",
    icon: "truck",
    dailyRate: 22000,
    seats: 7,
    transmission: "Auto",
    fuel: "Diesel",
    features: ["GPS Tracking", "AC", "Full Insurance", "Dash Cam", "Music System", "4WD"],
  },
];

const DURATION_OPTIONS = [1, 2, 3, 5, 7, 14, 30];
const COIN_REWARD = 10;

function generateProofId(): string {
  return "OTC-RNT-" + Date.now().toString(36).toUpperCase();
}

export default function RentalScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addTransaction, balance } = useWallet();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 16);

  const [step, setStep] = useState<Step>("browse");
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [duration, setDuration] = useState(1);
  const [proofId] = useState(generateProofId);
  const [rewarded, setRewarded] = useState(false);

  function handleVehicleContinue() {
    if (!selectedVehicle) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep("duration");
  }

  function handleConfirmBooking() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (!rewarded) {
      setRewarded(true);
      addTransaction({
        type: "credit",
        amount: COIN_REWARD,
        description: "Rent-a-Car booking reward",
        category: "rental",
      });
    }
    setStep("certificate");
  }

  const totalCost = (selectedVehicle?.dailyRate ?? 0) * duration;
  const today = new Date();
  const returnDate = new Date(today.getTime() + duration * 86400000);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" });

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
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            if (step === "duration") { setStep("browse"); return; }
            if (step === "certificate") { router.back(); return; }
            router.back();
          }}
          activeOpacity={0.8}
        >
          <Feather name="arrow-left" size={22} color={colors.gold} />
        </TouchableOpacity>

        <View style={styles.headerRow}>
          <View style={[styles.heroIcon, { backgroundColor: "rgba(255,215,0,0.08)", borderColor: colors.glassBorder }]}>
            <Feather name="truck" size={36} color={colors.gold} />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.screenTitle, { color: colors.foreground }]}>Rent-a-Car</Text>
            <Text style={[styles.screenSub, { color: colors.mutedForeground }]}>Premium vehicle rentals</Text>
          </View>
        </View>

        <View style={styles.stepPills}>
          {(["browse", "duration", "certificate"] as Step[]).map((s, i) => (
            <View key={s} style={styles.pillRow}>
              <View style={[
                styles.pill,
                {
                  backgroundColor: step === s ? colors.gold : (
                    (["browse", "duration", "certificate"].indexOf(step) > i) ? "rgba(255,215,0,0.3)" : colors.muted
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

        {step === "browse" && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Choose Vehicle</Text>
            <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>All vehicles include GPS, AC & insurance</Text>

            {VEHICLES.map((v) => (
              <TouchableOpacity
                key={v.id}
                onPress={() => {
                  setSelectedVehicle(v);
                  Haptics.selectionAsync();
                }}
                activeOpacity={0.85}
              >
                <GlassCard
                  variant={selectedVehicle?.id === v.id ? "gold" : "default"}
                  style={[styles.vehicleCard, selectedVehicle?.id === v.id && { borderColor: colors.gold }]}
                >
                  <View style={styles.vehicleTop}>
                    <View style={[styles.vehicleIconBox, { backgroundColor: "rgba(255,215,0,0.08)", borderRadius: 12 }]}>
                      <Feather name={v.icon} size={28} color={colors.gold} />
                    </View>
                    <View style={styles.vehicleInfo}>
                      <View style={styles.vehicleNameRow}>
                        <Text style={[styles.vehicleName, { color: colors.foreground }]}>{v.name}</Text>
                        <View style={[styles.categoryBadge, { backgroundColor: "rgba(255,215,0,0.12)", borderRadius: 8 }]}>
                          <Text style={[styles.categoryText, { color: colors.gold }]}>{v.category}</Text>
                        </View>
                      </View>
                      <Text style={[styles.vehicleModel, { color: colors.mutedForeground }]}>{v.model} Model</Text>
                    </View>
                    {selectedVehicle?.id === v.id && (
                      <View style={[styles.checkBadge, { backgroundColor: colors.gold, borderRadius: 12 }]}>
                        <Feather name="check" size={14} color="#050505" />
                      </View>
                    )}
                  </View>

                  <View style={[styles.vehicleSpecs, { borderTopColor: colors.border }]}>
                    <View style={styles.specItem}>
                      <Feather name="users" size={12} color={colors.mutedForeground} />
                      <Text style={[styles.specText, { color: colors.mutedForeground }]}>{v.seats} seats</Text>
                    </View>
                    <View style={styles.specItem}>
                      <Feather name="settings" size={12} color={colors.mutedForeground} />
                      <Text style={[styles.specText, { color: colors.mutedForeground }]}>{v.transmission}</Text>
                    </View>
                    <View style={styles.specItem}>
                      <Feather name="droplet" size={12} color={colors.mutedForeground} />
                      <Text style={[styles.specText, { color: colors.mutedForeground }]}>{v.fuel}</Text>
                    </View>
                    <Text style={[styles.vehicleRate, { color: colors.gold }]}>
                      PKR {v.dailyRate.toLocaleString()}<Text style={{ fontSize: 11 }}>/day</Text>
                    </Text>
                  </View>
                </GlassCard>
              </TouchableOpacity>
            ))}

            <GlassCard variant="gold" style={styles.rewardNote}>
              <Feather name="star" size={14} color={colors.gold} />
              <Text style={[styles.rewardText, { color: colors.foreground }]}>
                Earn <Text style={{ color: colors.gold, fontFamily: "Inter_700Bold" }}>+{COIN_REWARD} OTC Coins</Text> on every rental
              </Text>
            </GlassCard>
          </View>
        )}

        {step === "duration" && selectedVehicle && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Select Duration</Text>
            <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>
              {selectedVehicle.name} · PKR {selectedVehicle.dailyRate.toLocaleString()}/day
            </Text>

            <View style={styles.durationGrid}>
              {DURATION_OPTIONS.map((d) => (
                <TouchableOpacity
                  key={d}
                  onPress={() => {
                    setDuration(d);
                    Haptics.selectionAsync();
                  }}
                  style={[
                    styles.durationBtn,
                    {
                      backgroundColor: duration === d ? colors.gold : colors.glassBackground,
                      borderColor: duration === d ? colors.gold : colors.glassBorder,
                      borderRadius: colors.radius,
                    },
                  ]}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.durationNum, { color: duration === d ? "#050505" : colors.foreground }]}>
                    {d}
                  </Text>
                  <Text style={[styles.durationUnit, { color: duration === d ? "#050505" : colors.mutedForeground }]}>
                    {d === 1 ? "day" : "days"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <GlassCard style={styles.costCard}>
              <Text style={[styles.costTitle, { color: colors.mutedForeground }]}>Cost Breakdown</Text>
              <View style={styles.costRow}>
                <Text style={[styles.costLabel, { color: colors.mutedForeground }]}>Daily Rate</Text>
                <Text style={[styles.costVal, { color: colors.foreground }]}>PKR {selectedVehicle.dailyRate.toLocaleString()}</Text>
              </View>
              <View style={styles.costRow}>
                <Text style={[styles.costLabel, { color: colors.mutedForeground }]}>Duration</Text>
                <Text style={[styles.costVal, { color: colors.foreground }]}>{duration} {duration === 1 ? "day" : "days"}</Text>
              </View>
              <View style={styles.costRow}>
                <Text style={[styles.costLabel, { color: colors.mutedForeground }]}>Pickup Date</Text>
                <Text style={[styles.costVal, { color: colors.foreground }]}>{fmt(today)}</Text>
              </View>
              <View style={styles.costRow}>
                <Text style={[styles.costLabel, { color: colors.mutedForeground }]}>Return Date</Text>
                <Text style={[styles.costVal, { color: colors.foreground }]}>{fmt(returnDate)}</Text>
              </View>
              <View style={[styles.costTotal, { borderTopColor: colors.border }]}>
                <Text style={[styles.costTotalLabel, { color: colors.foreground }]}>Total</Text>
                <Text style={[styles.costTotalVal, { color: colors.gold }]}>PKR {totalCost.toLocaleString()}</Text>
              </View>
            </GlassCard>

            <GlassCard style={styles.featuresCard}>
              <Text style={[styles.costTitle, { color: colors.mutedForeground }]}>Included Features</Text>
              {selectedVehicle.features.map((f, i) => (
                <View key={i} style={styles.featureRow}>
                  <View style={[styles.checkCircle, { backgroundColor: "rgba(255,215,0,0.1)", borderRadius: 12 }]}>
                    <Feather name="check" size={12} color={colors.gold} />
                  </View>
                  <Text style={[styles.featureText, { color: colors.foreground }]}>{f}</Text>
                </View>
              ))}
            </GlassCard>
          </View>
        )}

        {step === "certificate" && selectedVehicle && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Proof of Rental</Text>
            <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>Your rental certificate</Text>

            <GlassCard variant="gold" style={styles.certificate}>
              <View style={styles.certHeader}>
                <View style={[styles.certLogo, { backgroundColor: "rgba(255,215,0,0.15)", borderRadius: 16 }]}>
                  <Feather name="truck" size={28} color={colors.gold} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.certBrand, { color: colors.gold }]}>OTC Rent-a-Car</Text>
                  <Text style={[styles.certSub, { color: colors.mutedForeground }]}>Rental Certificate</Text>
                </View>
                <View style={[styles.certStatus, { backgroundColor: "rgba(76,175,80,0.15)", borderRadius: 8 }]}>
                  <Text style={[styles.certStatusText, { color: "#4CAF50" }]}>ACTIVE</Text>
                </View>
              </View>

              <View style={[styles.certDivider, { borderColor: "rgba(255,215,0,0.2)" }]} />

              <View style={styles.certBody}>
                <View style={styles.certRow}>
                  <Text style={[styles.certLabel, { color: colors.mutedForeground }]}>Certificate No.</Text>
                  <Text style={[styles.certValue, { color: colors.gold }]}>{proofId}</Text>
                </View>
                <View style={styles.certRow}>
                  <Text style={[styles.certLabel, { color: colors.mutedForeground }]}>Vehicle</Text>
                  <Text style={[styles.certValue, { color: colors.foreground }]}>{selectedVehicle.name} {selectedVehicle.model}</Text>
                </View>
                <View style={styles.certRow}>
                  <Text style={[styles.certLabel, { color: colors.mutedForeground }]}>Category</Text>
                  <Text style={[styles.certValue, { color: colors.foreground }]}>{selectedVehicle.category}</Text>
                </View>
                <View style={styles.certRow}>
                  <Text style={[styles.certLabel, { color: colors.mutedForeground }]}>Pickup</Text>
                  <Text style={[styles.certValue, { color: colors.foreground }]}>{fmt(today)}</Text>
                </View>
                <View style={styles.certRow}>
                  <Text style={[styles.certLabel, { color: colors.mutedForeground }]}>Return</Text>
                  <Text style={[styles.certValue, { color: colors.foreground }]}>{fmt(returnDate)}</Text>
                </View>
                <View style={styles.certRow}>
                  <Text style={[styles.certLabel, { color: colors.mutedForeground }]}>Duration</Text>
                  <Text style={[styles.certValue, { color: colors.foreground }]}>{duration} {duration === 1 ? "day" : "days"}</Text>
                </View>
              </View>

              <View style={[styles.certDivider, { borderColor: "rgba(255,215,0,0.2)" }]} />

              <View style={styles.certFooter}>
                <View>
                  <Text style={[styles.certTotalLabel, { color: colors.mutedForeground }]}>Total Paid</Text>
                  <Text style={[styles.certTotal, { color: colors.gold }]}>PKR {totalCost.toLocaleString()}</Text>
                </View>
                <View style={[styles.certStamp, { borderColor: "rgba(255,215,0,0.4)", borderRadius: 40 }]}>
                  <Feather name="check-circle" size={22} color={colors.gold} />
                  <Text style={[styles.certStampText, { color: colors.gold }]}>CONFIRMED</Text>
                </View>
              </View>
            </GlassCard>

            <GlassCard variant="gold" style={styles.rewardBanner}>
              <Feather name="star" size={18} color={colors.gold} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.rewardBannerTitle, { color: colors.foreground }]}>Coins Earned!</Text>
                <Text style={[styles.rewardBannerSub, { color: colors.mutedForeground }]}>
                  +{COIN_REWARD} OTC Coins added to your wallet
                </Text>
              </View>
              <CoinBadge amount={balance} size="sm" />
            </GlassCard>
          </View>
        )}
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 16), backgroundColor: colors.background, borderTopColor: colors.border }]}>
        {step === "browse" && (
          <TouchableOpacity
            style={[styles.cta, { backgroundColor: selectedVehicle ? colors.gold : colors.muted, borderRadius: colors.radius }]}
            onPress={handleVehicleContinue}
            activeOpacity={0.85}
            disabled={!selectedVehicle}
          >
            <Text style={[styles.ctaText, { color: selectedVehicle ? "#050505" : colors.mutedForeground }]}>
              {selectedVehicle ? `Select ${selectedVehicle.name}` : "Choose a Vehicle"}
            </Text>
            <Feather name="arrow-right" size={18} color={selectedVehicle ? "#050505" : colors.mutedForeground} />
          </TouchableOpacity>
        )}
        {step === "duration" && (
          <TouchableOpacity
            style={[styles.cta, { backgroundColor: colors.gold, borderRadius: colors.radius }]}
            onPress={handleConfirmBooking}
            activeOpacity={0.85}
          >
            <Text style={[styles.ctaText, { color: "#050505" }]}>
              Confirm · PKR {totalCost.toLocaleString()}
            </Text>
            <Feather name="check" size={18} color="#050505" />
          </TouchableOpacity>
        )}
        {step === "certificate" && (
          <TouchableOpacity
            style={[styles.cta, { backgroundColor: colors.gold, borderRadius: colors.radius }]}
            onPress={() => router.back()}
            activeOpacity={0.85}
          >
            <Text style={[styles.ctaText, { color: "#050505" }]}>Back to Home</Text>
            <Feather name="home" size={18} color="#050505" />
          </TouchableOpacity>
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
  stepPills: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  pillRow: { flexDirection: "row", alignItems: "center" },
  pill: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  pillText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  pillLine: { width: 40, height: 2 },
  section: { gap: 14 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  sectionSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: -8 },
  vehicleCard: { padding: 16, gap: 12 },
  vehicleTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  vehicleIconBox: { width: 52, height: 52, alignItems: "center", justifyContent: "center" },
  vehicleInfo: { flex: 1 },
  vehicleNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  vehicleName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  categoryBadge: { paddingHorizontal: 8, paddingVertical: 3 },
  categoryText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  vehicleModel: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  checkBadge: { width: 24, height: 24, alignItems: "center", justifyContent: "center" },
  vehicleSpecs: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderTopWidth: 1,
    paddingTop: 12,
  },
  specItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  specText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  vehicleRate: { marginLeft: "auto", fontSize: 14, fontFamily: "Inter_700Bold" },
  rewardNote: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14 },
  rewardText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  durationGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  durationBtn: {
    width: "28%",
    aspectRatio: 1.3,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  durationNum: { fontSize: 22, fontFamily: "Inter_700Bold" },
  durationUnit: { fontSize: 11, fontFamily: "Inter_400Regular" },
  costCard: { padding: 16, gap: 12 },
  costTitle: { fontSize: 11, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  costRow: { flexDirection: "row", justifyContent: "space-between" },
  costLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  costVal: { fontSize: 13, fontFamily: "Inter_500Medium" },
  costTotal: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, paddingTop: 12, marginTop: 4 },
  costTotalLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  costTotalVal: { fontSize: 18, fontFamily: "Inter_700Bold" },
  featuresCard: { padding: 16, gap: 10 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  checkCircle: { width: 24, height: 24, alignItems: "center", justifyContent: "center" },
  featureText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  certificate: { padding: 20, gap: 0 },
  certHeader: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 16 },
  certLogo: { width: 52, height: 52, alignItems: "center", justifyContent: "center" },
  certBrand: { fontSize: 16, fontFamily: "Inter_700Bold" },
  certSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  certStatus: { paddingHorizontal: 10, paddingVertical: 5 },
  certStatusText: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  certDivider: { borderWidth: 0.5, marginVertical: 14 },
  certBody: { gap: 10 },
  certRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  certLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  certValue: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  certFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 0 },
  certTotalLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  certTotal: { fontSize: 22, fontFamily: "Inter_700Bold", marginTop: 4 },
  certStamp: { alignItems: "center", justifyContent: "center", borderWidth: 1.5, padding: 10, gap: 4 },
  certStampText: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1 },
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
