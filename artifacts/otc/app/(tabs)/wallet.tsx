import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CoinBadge } from "@/components/CoinBadge";
import { GlassCard } from "@/components/GlassCard";
import { useWallet, type Transaction } from "@/contexts/WalletContext";
import { useColors } from "@/hooks/useColors";

const CATEGORY_ICONS: Record<Transaction["category"], string> = {
  referral: "gift",
  milestone: "award",
  welcome: "star",
  ride: "navigation",
  delivery: "package",
  rental: "truck",
  hotel: "home",
  topup: "plus-circle",
  commission: "percent",
  withdrawal: "arrow-up-circle",
};

const CATEGORY_LABELS: Record<Transaction["category"], string> = {
  referral: "Referral Bonus",
  milestone: "Milestone Reward",
  welcome: "Welcome Bonus",
  ride: "Ride",
  delivery: "Delivery",
  rental: "Car Rental",
  hotel: "Hotel",
  topup: "Top-up",
  commission: "Commission",
  withdrawal: "Withdrawal",
};

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
}

export default function WalletScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { balance, transactions } = useWallet();

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 16);

  function renderTx({ item }: { item: Transaction }) {
    const isCredit = item.type === "credit";
    return (
      <View style={styles.txRow}>
        <View
          style={[
            styles.txIconBox,
            {
              backgroundColor: isCredit
                ? "rgba(255,215,0,0.08)"
                : "rgba(204,51,51,0.08)",
              borderRadius: 12,
            },
          ]}
        >
          <Feather
            name={CATEGORY_ICONS[item.category] as any}
            size={18}
            color={isCredit ? colors.gold : colors.destructive}
          />
        </View>
        <View style={styles.txInfo}>
          <Text style={[styles.txLabel, { color: colors.foreground }]}>
            {item.description || CATEGORY_LABELS[item.category]}
          </Text>
          <Text style={[styles.txDate, { color: colors.mutedForeground }]}>
            {formatDate(item.timestamp)}
          </Text>
        </View>
        <Text
          style={[
            styles.txAmount,
            { color: isCredit ? colors.gold : colors.destructive },
          ]}
        >
          {isCredit ? "+" : "-"}{item.amount} OTC
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={renderTx}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: topPad,
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 90),
          },
        ]}
        ListHeaderComponent={() => (
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Text style={[styles.screenTitle, { color: colors.foreground }]}>
                OTC Wallet
              </Text>
              <TouchableOpacity
                style={[styles.withdrawBtn, { backgroundColor: colors.glassBackground, borderColor: colors.glassBorder }]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/services/withdraw" as never); }}
                activeOpacity={0.8}
              >
                <Feather name="arrow-up-circle" size={14} color={colors.gold} />
                <Text style={[styles.withdrawBtnText, { color: colors.gold }]}>Withdraw</Text>
              </TouchableOpacity>
            </View>

            <GlassCard variant="gold" style={styles.balanceCard}>
              <Text style={[styles.balanceLabel, { color: colors.mutedForeground }]}>
                TOTAL BALANCE
              </Text>
              <CoinBadge amount={balance} size="lg" showLabel />
              <View style={[styles.divider, { backgroundColor: colors.glassBorder }]} />
              <View style={styles.infoRow}>
                <Feather name="info" size={13} color={colors.mutedForeground} />
                <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
                  1 OTC Coin = PKR 10 equivalent
                </Text>
              </View>
            </GlassCard>

            {/* Referral — directs to the dedicated Invite & Earn tab */}
            <TouchableOpacity
              style={[
                styles.referralToggle,
                {
                  backgroundColor: colors.glassBackground,
                  borderColor: colors.glassBorder,
                  borderRadius: colors.radius,
                },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.navigate("/(tabs)/invite");
              }}
              activeOpacity={0.8}
            >
              <Feather name="gift" size={18} color={colors.gold} />
              <Text style={[styles.referralToggleText, { color: colors.foreground }]}>
                Invite & Earn — Referral Codes
              </Text>
              <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>

            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Transactions
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="star" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No transactions yet
            </Text>
          </View>
        }
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: colors.border }]} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  header: { gap: 16, marginBottom: 8 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  screenTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
  },
  withdrawBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  withdrawBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  balanceCard: {
    padding: 20,
    gap: 10,
  },
  balanceLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  infoText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  referralToggle: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderWidth: 1,
    gap: 10,
  },
  referralToggleText: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginTop: 4,
    marginBottom: 4,
  },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 14,
  },
  txIconBox: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  txInfo: { flex: 1, gap: 3 },
  txLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  txDate: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  txAmount: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  separator: {
    height: 1,
  },
  empty: {
    alignItems: "center",
    gap: 12,
    paddingTop: 40,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
});
