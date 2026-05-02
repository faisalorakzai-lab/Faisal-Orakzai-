import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
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
import { OTCLogo } from "@/components/OTCLogo";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/contexts/WalletContext";
import { useColors } from "@/hooks/useColors";

interface ServiceTile {
  id: string;
  label: string;
  icon: string;
  description: string;
  color: string;
  available: boolean;
}

const SERVICES: ServiceTile[] = [
  {
    id: "ride",
    label: "Ride",
    icon: "navigation",
    description: "Book a ride instantly",
    color: "#FFD700",
    available: true,
  },
  {
    id: "delivery",
    label: "Delivery",
    icon: "package",
    description: "Send packages fast",
    color: "#FFF3A3",
    available: true,
  },
  {
    id: "rental",
    label: "Rent-a-Car",
    icon: "truck",
    description: "Premium vehicle rentals",
    color: "#B8960C",
    available: true,
  },
  {
    id: "hotel",
    label: "Hotel",
    icon: "home",
    description: "Find the best stays",
    color: "#FFD700",
    available: true,
  },
];

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { balance } = useWallet();

  const topPad =
    insets.top + (Platform.OS === "web" ? 67 : 0);

  function handleService(service: ServiceTile) {
    if (!service.available) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/services/${service.id}`);
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: topPad + 16,
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 80),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <View style={styles.logoRow}>
            <OTCLogo size="sm" />
            <View>
              <Text style={[styles.appName, { color: colors.gold }]}>OTC</Text>
              <Text style={[styles.appSub, { color: colors.mutedForeground }]}>
                Super App
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[
              styles.walletBadge,
              {
                backgroundColor: colors.glassBackground,
                borderColor: colors.glassBorder,
                borderRadius: 24,
              },
            ]}
            onPress={() => router.push("/(tabs)/wallet")}
            activeOpacity={0.8}
          >
            <CoinBadge amount={balance} size="sm" />
          </TouchableOpacity>
        </View>

        <View style={styles.greetRow}>
          <Text style={[styles.greet, { color: colors.mutedForeground }]}>
            Welcome back
          </Text>
          <Text style={[styles.greetName, { color: colors.foreground }]}>
            {user?.name ?? user?.phone ?? "Traveler"}
          </Text>
        </View>

        <GlassCard variant="gold" style={styles.heroBanner}>
          <View style={styles.heroContent}>
            <View>
              <Text style={[styles.heroTitle, { color: colors.gold }]}>
                Your OTC Wallet
              </Text>
              <CoinBadge amount={balance} size="lg" showLabel />
            </View>
            <TouchableOpacity
              style={[
                styles.heroBtn,
                { backgroundColor: colors.gold, borderRadius: 10 },
              ]}
              onPress={() => router.push("/(tabs)/wallet")}
              activeOpacity={0.8}
            >
              <Feather name="arrow-right" size={18} color="#050505" />
            </TouchableOpacity>
          </View>
        </GlassCard>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Our Services
        </Text>

        <View style={styles.grid}>
          {SERVICES.map((service) => (
            <TouchableOpacity
              key={service.id}
              style={styles.tileWrapper}
              onPress={() => handleService(service)}
              activeOpacity={0.85}
            >
              <GlassCard
                style={[
                  styles.tile,
                  !service.available && styles.tileDisabled,
                ]}
              >
                <View
                  style={[
                    styles.tileIcon,
                    {
                      backgroundColor: service.available
                        ? "rgba(255,215,0,0.1)"
                        : "rgba(255,215,0,0.04)",
                      borderRadius: 14,
                    },
                  ]}
                >
                  <Feather
                    name={service.icon as any}
                    size={28}
                    color={service.available ? service.color : colors.mutedForeground}
                  />
                </View>
                <Text
                  style={[
                    styles.tileLabel,
                    {
                      color: service.available
                        ? colors.foreground
                        : colors.mutedForeground,
                    },
                  ]}
                >
                  {service.label}
                </Text>
                <Text
                  style={[
                    styles.tileDesc,
                    { color: colors.mutedForeground },
                  ]}
                >
                  {service.available ? service.description : "Coming soon"}
                </Text>
              </GlassCard>
            </TouchableOpacity>
          ))}
        </View>

        <GlassCard style={styles.referralCard}>
          <View style={styles.referralContent}>
            <Feather name="gift" size={22} color={colors.gold} />
            <View style={styles.referralText}>
              <Text style={[styles.referralTitle, { color: colors.foreground }]}>
                Refer & Earn
              </Text>
              <Text style={[styles.referralSub, { color: colors.mutedForeground }]}>
                Earn 5 OTC Coins per referral. New users get 10 free!
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/profile")}
              activeOpacity={0.8}
            >
              <Feather name="chevron-right" size={20} color={colors.gold} />
            </TouchableOpacity>
          </View>
        </GlassCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  appName: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  appSub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.5,
  },
  walletBadge: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  greetRow: {
    marginBottom: 20,
  },
  greet: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  greetName: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  heroBanner: {
    padding: 20,
    marginBottom: 28,
  },
  heroContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroTitle: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginBottom: 6,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  heroBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginBottom: 14,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  tileWrapper: {
    width: "47%",
  },
  tile: {
    padding: 18,
    minHeight: 140,
    justifyContent: "space-between",
    gap: 10,
  },
  tileDisabled: {
    opacity: 0.5,
  },
  tileIcon: {
    width: 54,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  tileLabel: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  tileDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
  },
  referralCard: {
    padding: 16,
  },
  referralContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  referralText: {
    flex: 1,
    gap: 4,
  },
  referralTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  referralSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
  },
});
