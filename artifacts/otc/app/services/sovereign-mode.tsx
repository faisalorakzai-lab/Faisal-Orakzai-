import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
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
import { ProofOfRideCard } from "@/components/ride/ProofOfRideCard";
import { useCharacter } from "@/contexts/CharacterContext";
import { useRide } from "@/contexts/RideContext";
import { useWallet } from "@/contexts/WalletContext";
import { useColors } from "@/hooks/useColors";

const OTC_UPDATES = [
  {
    id: "1",
    category: "FLEET",
    title: "50 New Sovereign Vehicles Added",
    body: "Orakzai Transport expands premium fleet across Karachi, Lahore & Islamabad.",
    time: "2m ago",
  },
  {
    id: "2",
    category: "EQUITY",
    title: "Partner Equity Program Hits PKR 10M",
    body: "Driver-Partners now hold collective equity worth PKR 10 million in the OTC Grid.",
    time: "18m ago",
  },
  {
    id: "3",
    category: "TECH",
    title: "Autonomous AI Routing Goes Live",
    body: "ML-powered route optimization now reduces trip time by 22% on average.",
    time: "1h ago",
  },
  {
    id: "4",
    category: "COIN",
    title: "OTC Coin Utility Expansion",
    body: "Use OTC Coins at partner hotels, rental desks, and delivery hubs starting Q3.",
    time: "3h ago",
  },
];

function ElapsedTimer({ startedAt }: { startedAt: number }) {
  const colors = useColors();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  return (
    <Text style={[styles.timerText, { color: colors.gold }]}>
      {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
    </Text>
  );
}

function PulsingBar() {
  const colors = useColors();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.2, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, [anim]);

  return (
    <View style={styles.progressTrack}>
      {Array.from({ length: 16 }).map((_, i) => (
        <Animated.View
          key={i}
          style={[
            styles.progressBar,
            {
              backgroundColor: colors.gold,
              opacity: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [i % 2 === 0 ? 0.15 : 0.05, i % 2 === 0 ? 0.9 : 0.3],
              }),
            },
          ]}
        />
      ))}
    </View>
  );
}

export default function SovereignModeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { session, completeRide, cancelRide } = useRide();
  const { addTransaction, balance } = useWallet();
  const { addRide, profile } = useCharacter();
  const [activeTab, setActiveTab] = useState<"status" | "wallet" | "updates" | "proof">("status");
  const [completed, setCompleted] = useState(false);
  const glowAnim = useRef(new Animated.Value(0)).current;
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.3, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }, [glowAnim]);

  if (!session) {
    router.replace("/(tabs)");
    return null;
  }

  function handleEndRide() {
    Alert.alert(
      "End Ride",
      "Rate your experience",
      [4.5, 5.0].map((r) => ({
        text: `⭐ ${r}`,
        onPress: () => finishRide(r),
      })).concat([{ text: "Cancel", style: "cancel" as const, onPress: () => {} }])
    );
  }

  function finishRide(rating: number) {
    const done = completeRide();
    if (!done) return;
    addTransaction({
      type: "credit",
      amount: done.coinsEarned,
      description: `Sovereign Ride · ${done.pickup.name} → ${done.dropoff.name}`,
      category: "ride",
    });
    addRide(rating);
    setCompleted(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  const classColors: Record<string, string> = {
    sovereign: "#FFD700",
    autonomous: "#A78BFA",
    community: "#34D399",
  };
  const classColor = classColors[session.rideClass] ?? "#FFD700";
  const classLabel = session.rideClass.charAt(0).toUpperCase() + session.rideClass.slice(1);

  if (completed) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: topPad + 32, paddingBottom: insets.bottom + 60 },
          ]}
        >
          <View style={styles.completedBadge}>
            <Animated.View
              style={[
                styles.checkRing,
                {
                  borderColor: glowAnim.interpolate({
                    inputRange: [0.3, 1],
                    outputRange: ["rgba(34,197,94,0.2)", "rgba(34,197,94,0.6)"],
                  }),
                },
              ]}
            >
              <Feather name="check" size={36} color="#22C55E" />
            </Animated.View>
            <Text style={[styles.completedTitle, { color: "#22C55E" }]}>
              Ride Complete
            </Text>
            <Text style={[styles.completedSub, { color: colors.mutedForeground }]}>
              {session.pickup.name} → {session.dropoff.name}
            </Text>
          </View>

          <GlassCard variant="gold" style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryKey, { color: colors.mutedForeground }]}>Fare Paid</Text>
              <Text style={[styles.summaryVal, { color: colors.foreground }]}>
                PKR {session.finalPrice.toLocaleString()}
              </Text>
            </View>
            {session.discountApplied > 0 && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryKey, { color: "#22C55E" }]}>CC Discount</Text>
                <Text style={[styles.summaryVal, { color: "#22C55E" }]}>
                  −PKR {session.discountApplied.toLocaleString()}
                </Text>
              </View>
            )}
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryKey, { color: colors.mutedForeground }]}>OTC Coins Earned</Text>
              <CoinBadge amount={session.coinsEarned} size="sm" showLabel />
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryKey, { color: colors.mutedForeground }]}>Distance</Text>
              <Text style={[styles.summaryVal, { color: colors.foreground }]}>
                {session.distance} km
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryKey, { color: colors.mutedForeground }]}>Character Credits</Text>
              <Text style={[styles.summaryVal, { color: colors.gold }]}>
                {profile.credits} CC · {profile.tier}
              </Text>
            </View>
          </GlassCard>

          <ProofOfRideCard
            hash={session.proofHash}
            gridNode={session.gridNode}
            rideClass={session.rideClass}
            timestamp={session.startedAt}
          />

          <TouchableOpacity
            style={[styles.doneBtn, { backgroundColor: colors.gold, borderRadius: colors.radius }]}
            onPress={() => {
              cancelRide();
              router.replace("/(tabs)");
            }}
            activeOpacity={0.85}
          >
            <Text style={[styles.doneBtnText, { color: colors.primaryForeground }]}>
              Return to Dashboard
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: "#020402" }]}>
      {/* Sovereign Mode Header */}
      <Animated.View
        style={[
          styles.sovereignHeader,
          {
            paddingTop: topPad + 12,
            borderBottomColor: glowAnim.interpolate({
              inputRange: [0.3, 1],
              outputRange: [`${classColor}30`, `${classColor}80`],
            }),
          },
        ]}
      >
        <View style={styles.sovereignHeaderInner}>
          <View>
            <Text style={[styles.sovereignLabel, { color: `${classColor}99` }]}>
              {classLabel.toUpperCase()} MODE ACTIVE
            </Text>
            <Text style={[styles.sovereignTitle, { color: classColor }]}>
              Sovereign Mode
            </Text>
          </View>
          <ElapsedTimer startedAt={session.startedAt} />
        </View>
        <PulsingBar />
      </Animated.View>

      {/* Ride Info Strip */}
      <View style={[styles.rideStrip, { backgroundColor: `${classColor}0A` }]}>
        <View style={styles.ripItem}>
          <Feather name="map-pin" size={12} color={colors.mutedForeground} />
          <Text style={[styles.ripText, { color: colors.mutedForeground }]} numberOfLines={1}>
            {session.pickup.name}
          </Text>
        </View>
        <Feather name="arrow-right" size={14} color={classColor} />
        <View style={styles.ripItem}>
          <Feather name="map-pin" size={12} color={classColor} />
          <Text style={[styles.ripText, { color: classColor }]} numberOfLines={1}>
            {session.dropoff.name}
          </Text>
        </View>
        <Text style={[styles.ripDist, { color: colors.mutedForeground }]}>
          {session.distance} km
        </Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(["status", "wallet", "updates", "proof"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              activeTab === tab && [styles.tabActive, { borderBottomColor: classColor }],
            ]}
            onPress={() => {
              setActiveTab(tab);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === tab ? classColor : colors.mutedForeground },
              ]}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.tabContent,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 90) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* STATUS TAB */}
        {activeTab === "status" && (
          <View style={styles.tabSection}>
            <GlassCard variant="dark" style={styles.statusCard}>
              <View style={styles.statusRow}>
                <View
                  style={[styles.statusDot, { backgroundColor: "#22C55E", shadowColor: "#22C55E" }]}
                />
                <Text style={[styles.statusText, { color: "#22C55E" }]}>
                  Ride In Progress
                </Text>
              </View>
              <View style={[styles.statusDivider, { backgroundColor: "rgba(255,215,0,0.08)" }]} />
              <View style={styles.statusGrid}>
                <View style={styles.statusCell}>
                  <Text style={[styles.statusCellLabel, { color: colors.mutedForeground }]}>DRIVER</Text>
                  <Text style={[styles.statusCellVal, { color: colors.foreground }]}>
                    {session.driverName}
                  </Text>
                </View>
                <View style={styles.statusCell}>
                  <Text style={[styles.statusCellLabel, { color: colors.mutedForeground }]}>RATING</Text>
                  <Text style={[styles.statusCellVal, { color: colors.gold }]}>
                    ⭐ {session.driverRating}
                  </Text>
                </View>
                <View style={styles.statusCell}>
                  <Text style={[styles.statusCellLabel, { color: colors.mutedForeground }]}>CLASS</Text>
                  <Text style={[styles.statusCellVal, { color: classColor }]}>{classLabel}</Text>
                </View>
                <View style={styles.statusCell}>
                  <Text style={[styles.statusCellLabel, { color: colors.mutedForeground }]}>GRID</Text>
                  <Text style={[styles.statusCellVal, { color: colors.foreground }]}>
                    {session.gridNode}
                  </Text>
                </View>
              </View>
            </GlassCard>

            <GlassCard style={styles.safetyCard}>
              <View style={styles.safetyHeader}>
                <Feather name="shield" size={16} color={classColor} />
                <Text style={[styles.safetyTitle, { color: colors.foreground }]}>
                  Safety & Controls
                </Text>
              </View>
              {[
                { icon: "phone", label: "Call Driver" },
                { icon: "share-2", label: "Share Trip" },
                { icon: "alert-circle", label: "Emergency SOS" },
              ].map((item, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.safetyBtn, { borderColor: colors.border }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    Alert.alert(item.label, "Feature active in production.");
                  }}
                  activeOpacity={0.7}
                >
                  <Feather name={item.icon as any} size={16} color={classColor} />
                  <Text style={[styles.safetyBtnText, { color: colors.foreground }]}>
                    {item.label}
                  </Text>
                  <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
                </TouchableOpacity>
              ))}
            </GlassCard>
          </View>
        )}

        {/* WALLET TAB */}
        {activeTab === "wallet" && (
          <View style={styles.tabSection}>
            <GlassCard variant="gold" style={styles.walletCard}>
              <Text style={[styles.walletLabel, { color: colors.mutedForeground }]}>
                SOVEREIGN WALLET
              </Text>
              <CoinBadge amount={balance} size="lg" showLabel />
              <View style={[styles.walletDivider, { backgroundColor: "rgba(255,215,0,0.12)" }]} />
              <View style={styles.walletEarnRow}>
                <Feather name="star" size={14} color={colors.gold} />
                <Text style={[styles.walletEarnText, { color: colors.foreground }]}>
                  Earning{" "}
                  <Text style={{ color: colors.gold, fontFamily: "Inter_700Bold" }}>
                    {session.coinsEarned} OTC Coins
                  </Text>{" "}
                  this ride
                </Text>
              </View>
            </GlassCard>

            <GlassCard style={styles.charCard}>
              <Text style={[styles.charTitle, { color: colors.foreground }]}>
                Character Credits
              </Text>
              <View style={styles.charRow}>
                <View style={styles.charItem}>
                  <Text style={[styles.charNum, { color: colors.gold }]}>
                    {profile.credits}
                  </Text>
                  <Text style={[styles.charKey, { color: colors.mutedForeground }]}>Credits</Text>
                </View>
                <View style={styles.charItem}>
                  <Text style={[styles.charNum, { color: classColor }]}>
                    {profile.tier}
                  </Text>
                  <Text style={[styles.charKey, { color: colors.mutedForeground }]}>Tier</Text>
                </View>
                <View style={styles.charItem}>
                  <Text style={[styles.charNum, { color: "#22C55E" }]}>
                    {profile.totalRides}
                  </Text>
                  <Text style={[styles.charKey, { color: colors.mutedForeground }]}>Rides</Text>
                </View>
              </View>
              {profile.discountRate > 0 && (
                <View style={[styles.discountActive, { backgroundColor: "rgba(34,197,94,0.08)", borderRadius: 8 }]}>
                  <Feather name="percent" size={14} color="#22C55E" />
                  <Text style={styles.discountActiveText}>
                    {Math.round(profile.discountRate * 100)}% Character Discount active on all rides
                  </Text>
                </View>
              )}
            </GlassCard>
          </View>
        )}

        {/* UPDATES TAB */}
        {activeTab === "updates" && (
          <View style={styles.tabSection}>
            <Text style={[styles.updatesTitle, { color: colors.mutedForeground }]}>
              ORAKZAI GROUP LIVE FEED
            </Text>
            {OTC_UPDATES.map((item) => (
              <GlassCard key={item.id} style={styles.updateCard}>
                <View style={styles.updateTop}>
                  <View
                    style={[
                      styles.updateCat,
                      {
                        backgroundColor: "rgba(255,215,0,0.08)",
                        borderRadius: 4,
                      },
                    ]}
                  >
                    <Text style={[styles.updateCatText, { color: colors.gold }]}>
                      {item.category}
                    </Text>
                  </View>
                  <Text style={[styles.updateTime, { color: colors.mutedForeground }]}>
                    {item.time}
                  </Text>
                </View>
                <Text style={[styles.updateTitle, { color: colors.foreground }]}>
                  {item.title}
                </Text>
                <Text style={[styles.updateBody, { color: colors.mutedForeground }]}>
                  {item.body}
                </Text>
              </GlassCard>
            ))}
          </View>
        )}

        {/* PROOF TAB */}
        {activeTab === "proof" && (
          <View style={styles.tabSection}>
            <ProofOfRideCard
              hash={session.proofHash}
              gridNode={session.gridNode}
              rideClass={session.rideClass}
              timestamp={session.startedAt}
            />
            <GlassCard style={styles.protocolCard}>
              <Feather name="info" size={16} color={colors.gold} />
              <Text style={[styles.protocolTitle, { color: colors.foreground }]}>
                Proof of Ride Protocol™
              </Text>
              <Text style={[styles.protocolBody, { color: colors.mutedForeground }]}>
                Every ride generates a unique immutable hash anchored to the Orakzai Sovereign Grid.
                This certificate serves as cryptographic proof of your journey, driver assignment,
                and coin issuance — creating trust at scale across the OTC ecosystem.
              </Text>
            </GlassCard>
          </View>
        )}
      </ScrollView>

      {/* End Ride Button */}
      <View
        style={[
          styles.endRideBar,
          {
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 16),
            borderTopColor: `${classColor}20`,
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.endRideBtn, { borderColor: colors.destructive, borderRadius: colors.radius }]}
          onPress={handleEndRide}
          activeOpacity={0.85}
        >
          <Feather name="check-square" size={18} color={colors.destructive} />
          <Text style={[styles.endRideBtnText, { color: colors.destructive }]}>
            End Ride
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20, gap: 20 },
  sovereignHeader: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  sovereignHeaderInner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  sovereignLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  sovereignTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  timerText: { fontSize: 32, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  progressTrack: {
    flexDirection: "row",
    gap: 3,
    height: 4,
    alignItems: "center",
  },
  progressBar: { flex: 1, height: 4, borderRadius: 2 },
  rideStrip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 8,
  },
  ripItem: { flexDirection: "row", alignItems: "center", gap: 4, flex: 1 },
  ripText: { fontSize: 12, fontFamily: "Inter_500Medium", flex: 1 },
  ripDist: { fontSize: 11, fontFamily: "Inter_400Regular" },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,215,0,0.08)",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {},
  tabText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  tabContent: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  tabSection: { gap: 12 },
  statusCard: { padding: 16, gap: 14 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  statusText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  statusDivider: { height: 1 },
  statusGrid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  statusCell: { width: "45%", gap: 4 },
  statusCellLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  statusCellVal: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  safetyCard: { padding: 16, gap: 12 },
  safetyHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  safetyTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  safetyBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  safetyBtnText: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  walletCard: { padding: 20, gap: 12 },
  walletLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.5 },
  walletDivider: { height: 1 },
  walletEarnRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  walletEarnText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  charCard: { padding: 16, gap: 14 },
  charTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  charRow: { flexDirection: "row", justifyContent: "space-around" },
  charItem: { alignItems: "center", gap: 4 },
  charNum: { fontSize: 22, fontFamily: "Inter_700Bold" },
  charKey: { fontSize: 11, fontFamily: "Inter_400Regular" },
  discountActive: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10 },
  discountActiveText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#22C55E", flex: 1 },
  updatesTitle: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1.5, marginBottom: 4 },
  updateCard: { padding: 14, gap: 8 },
  updateTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  updateCat: { paddingHorizontal: 6, paddingVertical: 2 },
  updateCatText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  updateTime: { fontSize: 11, fontFamily: "Inter_400Regular" },
  updateTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  updateBody: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  protocolCard: { padding: 16, gap: 10 },
  protocolTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  protocolBody: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  completedBadge: { alignItems: "center", gap: 12, paddingVertical: 24 },
  checkRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  completedTitle: { fontSize: 28, fontFamily: "Inter_700Bold" },
  completedSub: { fontSize: 14, fontFamily: "Inter_400Regular" },
  summaryCard: { padding: 18, gap: 12 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryKey: { fontSize: 13, fontFamily: "Inter_400Regular" },
  summaryVal: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  doneBtn: {
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  doneBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  endRideBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  endRideBtn: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1.5,
  },
  endRideBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
