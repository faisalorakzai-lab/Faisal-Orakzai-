import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
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

interface ServiceMeta {
  id: string;
  label: string;
  icon: string;
  description: string;
  features: string[];
  coinReward: number;
  estimatedTime: string;
  priceLabel: string;
}

const SERVICE_META: Record<string, ServiceMeta> = {
  ride: {
    id: "ride",
    label: "OTC Ride",
    icon: "navigation",
    description:
      "Book a premium ride across Pakistan's major cities. Safe, reliable, and fast.",
    features: [
      "GPS-tracked drivers",
      "Fixed prices, no surge",
      "AC vehicles guaranteed",
      "24/7 availability",
    ],
    coinReward: 2,
    estimatedTime: "5-15 min",
    priceLabel: "From PKR 150",
  },
  delivery: {
    id: "delivery",
    label: "OTC Delivery",
    icon: "package",
    description:
      "Send packages door-to-door, same-day delivery available in all major cities.",
    features: [
      "Same-day delivery",
      "Live package tracking",
      "Fragile item handling",
      "Cash on delivery",
    ],
    coinReward: 3,
    estimatedTime: "2-4 hours",
    priceLabel: "From PKR 250",
  },
  rental: {
    id: "rental",
    label: "Rent-a-Car",
    icon: "truck",
    description:
      "Rent premium vehicles from our fleet for daily, weekly, or monthly needs.",
    features: [
      "Latest model vehicles",
      "With or without driver",
      "Full insurance coverage",
      "Flexible duration",
    ],
    coinReward: 10,
    estimatedTime: "Pickup in 1 hr",
    priceLabel: "From PKR 5,000/day",
  },
  hotel: {
    id: "hotel",
    label: "Hotel Booking",
    icon: "home",
    description:
      "Find and book the best hotels across Pakistan at exclusive OTC rates.",
    features: [
      "Best price guarantee",
      "Instant confirmation",
      "Free cancellation",
      "OTC loyalty rewards",
    ],
    coinReward: 15,
    estimatedTime: "Instant booking",
    priceLabel: "From PKR 3,500/night",
  },
  sovereign: {
    id: "sovereign",
    label: "Sovereign Mode",
    icon: "shield",
    description:
      "Reserve elite, discreet, and high-priority transport with premium dispatch handling.",
    features: [
      "Priority dispatch",
      "Elite partner drivers",
      "Discreet service",
      "Concierge support",
    ],
    coinReward: 20,
    estimatedTime: "Instant priority",
    priceLabel: "From PKR 2,500",
  },
};

export default function ServiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addTransaction, balance } = useWallet();
  const [booked, setBooked] = useState(false);

  const service = SERVICE_META[id ?? ""] ?? SERVICE_META.ride;
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 16);

  function handleBook() {
    if (booked) return;
    Alert.alert(
      `Book ${service.label}?`,
      `You'll earn ${service.coinReward} OTC Coins for this booking.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: () => {
            setBooked(true);
            addTransaction({
              type: "credit",
              amount: service.coinReward,
              description: `${service.label} booking reward`,
              category: service.id as any,
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert(
              "Booking Confirmed!",
              `You earned ${service.coinReward} OTC Coins.`,
              [{ text: "Great!", onPress: () => router.back() }]
            );
          },
        },
      ]
    );
  }

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
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Feather name="arrow-left" size={22} color={colors.gold} />
        </TouchableOpacity>

        <View
          style={[
            styles.heroIcon,
            {
              backgroundColor: "rgba(255,215,0,0.08)",
              borderColor: colors.glassBorder,
              borderRadius: 24,
            },
          ]}
        >
          <Feather name={service.icon as any} size={48} color={colors.gold} />
        </View>

        <Text style={[styles.serviceTitle, { color: colors.foreground }]}>
          {service.label}
        </Text>
        <Text style={[styles.serviceDesc, { color: colors.mutedForeground }]}>
          {service.description}
        </Text>

        <View style={styles.metaRow}>
          <GlassCard style={styles.metaCard}>
            <Feather name="clock" size={16} color={colors.gold} />
            <Text style={[styles.metaVal, { color: colors.foreground }]}>
              {service.estimatedTime}
            </Text>
            <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>
              ETA
            </Text>
          </GlassCard>
          <GlassCard style={styles.metaCard}>
            <Feather name="tag" size={16} color={colors.gold} />
            <Text style={[styles.metaVal, { color: colors.foreground }]}>
              {service.priceLabel}
            </Text>
            <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>
              Starting
            </Text>
          </GlassCard>
          <GlassCard style={styles.metaCard}>
            <Feather name="star" size={16} color={colors.gold} />
            <Text style={[styles.metaVal, { color: colors.gold }]}>
              +{service.coinReward}
            </Text>
            <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>
              OTC Coins
            </Text>
          </GlassCard>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Features
        </Text>
        <GlassCard style={styles.featuresCard}>
          {service.features.map((f, i) => (
            <View
              key={i}
              style={[
                styles.featureRow,
                i < service.features.length - 1 && {
                  borderBottomColor: colors.border,
                  borderBottomWidth: 1,
                },
              ]}
            >
              <View
                style={[
                  styles.checkCircle,
                  {
                    backgroundColor: "rgba(255,215,0,0.1)",
                    borderRadius: 12,
                  },
                ]}
              >
                <Feather name="check" size={14} color={colors.gold} />
              </View>
              <Text style={[styles.featureText, { color: colors.foreground }]}>
                {f}
              </Text>
            </View>
          ))}
        </GlassCard>

        <GlassCard variant="gold" style={styles.walletNote}>
          <Feather name="star" size={16} color={colors.gold} />
          <Text style={[styles.walletNoteText, { color: colors.foreground }]}>
            Your balance:{" "}
          </Text>
          <CoinBadge amount={balance} size="sm" />
        </GlassCard>
      </ScrollView>

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
        <TouchableOpacity
          style={[
            styles.bookBtn,
            {
              backgroundColor: booked ? colors.muted : colors.gold,
              borderRadius: colors.radius,
            },
          ]}
          onPress={handleBook}
          activeOpacity={0.85}
          disabled={booked}
        >
          <Text
            style={[
              styles.bookBtnText,
              {
                color: booked ? colors.mutedForeground : colors.primaryForeground,
              },
            ]}
          >
            {booked ? "Booking Confirmed" : `Book ${service.label}`}
          </Text>
          {!booked && (
            <Feather name="arrow-right" size={18} color={colors.primaryForeground} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20, gap: 16 },
  backBtn: {
    alignSelf: "flex-start",
    padding: 4,
    marginBottom: 4,
  },
  heroIcon: {
    width: 96,
    height: 96,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginVertical: 8,
  },
  serviceTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  serviceDesc: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: "row",
    gap: 10,
    marginVertical: 4,
  },
  metaCard: {
    flex: 1,
    padding: 14,
    alignItems: "center",
    gap: 6,
  },
  metaVal: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  metaLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginTop: 4,
  },
  featuresCard: { overflow: "hidden" },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  checkCircle: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  walletNote: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 8,
  },
  walletNoteText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  bookBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 56,
    gap: 8,
  },
  bookBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
