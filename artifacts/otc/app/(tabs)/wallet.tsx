import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
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
  welcome: "star",
  ride: "navigation",
  delivery: "package",
  rental: "truck",
  hotel: "home",
  topup: "plus-circle",
};

const CATEGORY_LABELS: Record<Transaction["category"], string> = {
  referral: "Referral Bonus",
  welcome: "Welcome Bonus",
  ride: "Ride",
  delivery: "Delivery",
  rental: "Car Rental",
  hotel: "Hotel",
  topup: "Top-up",
};

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
}

export default function WalletScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { balance, transactions, claimReferral } = useWallet();
  const [referralInput, setReferralInput] = useState("");
  const [showReferral, setShowReferral] = useState(false);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 16);

  function handleClaimReferral() {
    const code = referralInput.trim().toUpperCase();
    if (!code) return;
    const success = claimReferral(code);
    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Referral Applied!", "You earned 5 OTC Coins!");
      setReferralInput("");
      setShowReferral(false);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Invalid Code", "This referral code is invalid or already used.");
    }
  }

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
            <Text style={[styles.screenTitle, { color: colors.foreground }]}>
              OTC Wallet
            </Text>

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
                setShowReferral(!showReferral);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              activeOpacity={0.8}
            >
              <Feather name="gift" size={18} color={colors.gold} />
              <Text style={[styles.referralToggleText, { color: colors.foreground }]}>
                Apply Referral Code
              </Text>
              <Feather
                name={showReferral ? "chevron-up" : "chevron-down"}
                size={18}
                color={colors.mutedForeground}
              />
            </TouchableOpacity>

            {showReferral && (
              <GlassCard style={styles.referralBox}>
                <Text style={[styles.referralHint, { color: colors.mutedForeground }]}>
                  Enter your friend's referral code to earn 5 OTC Coins
                </Text>
                <View style={styles.referralInputRow}>
                  <TextInput
                    style={[
                      styles.referralInput,
                      {
                        color: colors.foreground,
                        backgroundColor: colors.input,
                        borderColor: colors.border,
                        borderRadius: colors.radius / 2,
                      },
                    ]}
                    placeholder="OTCXXXX1234"
                    placeholderTextColor={colors.mutedForeground}
                    value={referralInput}
                    onChangeText={(v) => setReferralInput(v.toUpperCase())}
                    autoCapitalize="characters"
                    returnKeyType="done"
                    onSubmitEditing={handleClaimReferral}
                  />
                  <TouchableOpacity
                    style={[
                      styles.claimBtn,
                      {
                        backgroundColor: referralInput.trim()
                          ? colors.gold
                          : colors.muted,
                        borderRadius: colors.radius / 2,
                      },
                    ]}
                    onPress={handleClaimReferral}
                    disabled={!referralInput.trim()}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.claimBtnText,
                        {
                          color: referralInput.trim()
                            ? colors.primaryForeground
                            : colors.mutedForeground,
                        },
                      ]}
                    >
                      Claim
                    </Text>
                  </TouchableOpacity>
                </View>
              </GlassCard>
            )}

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
  screenTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
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
  referralBox: {
    padding: 16,
    gap: 12,
  },
  referralHint: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  referralInputRow: {
    flexDirection: "row",
    gap: 10,
  },
  referralInput: {
    flex: 1,
    height: 46,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    letterSpacing: 1,
  },
  claimBtn: {
    paddingHorizontal: 20,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  claimBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
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
