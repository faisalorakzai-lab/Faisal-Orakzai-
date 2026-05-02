import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { Linking, Platform } from "react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { useReferral } from "@/contexts/ReferralContext";
import { useWallet } from "@/contexts/WalletContext";

const GOLD = "#FFD700";
const GOLD_DIM = "rgba(255,215,0,0.15)";
const GREEN = "#22C55E";

const MILESTONE_TARGET = 10;

export default function InviteScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { stats, isLoading, applyReferralCode, refresh } = useReferral();
  const { addTransaction } = useWallet();

  const [copied, setCopied] = useState(false);
  const [claimCode, setClaimCode] = useState("");
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimMsg, setClaimMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [scaleAnim] = useState(new Animated.Value(1));

  const code = stats?.referral_code ?? user?.referralCode ?? "OTC—";
  const referrals = stats?.successful_referrals ?? 0;
  const milestoneReached = referrals >= MILESTONE_TARGET;
  const milestoneClaimed = stats?.milestone_claimed ?? false;
  const progress = Math.min(referrals / MILESTONE_TARGET, 1);
  const remaining = Math.max(MILESTONE_TARGET - referrals, 0);

  async function handleCopy() {
    await Clipboard.setStringAsync(code);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.08, duration: 90, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 140, useNativeDriver: true }),
    ]).start();
    setTimeout(() => setCopied(false), 2500);
  }

  function handleWhatsApp() {
    const msg = encodeURIComponent(
      `Join Faisal Orakzai's OTC Ecosystem! 🚗\n\nUse my code *${code}* to get 10 free OTC Coins on signup. Let's build the future together!\n\nDownload: https://otc.replit.app`
    );
    Linking.openURL(`https://wa.me/?text=${msg}`).catch(() => {});
  }

  async function handleApplyCode() {
    if (!claimCode.trim()) return;
    setClaimLoading(true);
    setClaimMsg(null);
    try {
      const result = await applyReferralCode(claimCode.trim().toUpperCase());
      if (result.ok) {
        addTransaction({
          type: "credit",
          amount: 10,
          description: "Referral bonus — new user reward",
          category: "referral",
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      setClaimMsg({ ok: result.ok, text: result.message });
      if (result.ok) setClaimCode("");
    } finally {
      setClaimLoading(false);
    }
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + (Platform.OS === "web" ? 20 : 0) }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Invite & Earn</Text>
          <Text style={styles.headerSub}>
            Refer friends. Earn OTC Coins. Hit the $100 Milestone.
          </Text>
        </View>

        {/* Milestone Banner */}
        {milestoneReached ? (
          <View style={styles.milestoneBanner}>
            <Text style={styles.milestoneIcon}>🏆</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.milestoneTitle}>
                {milestoneClaimed ? "Milestone Claimed!" : "$100 Mega-Milestone Reached!"}
              </Text>
              <Text style={styles.milestoneSub}>
                {milestoneClaimed
                  ? "Your Gold Achievement has been credited."
                  : "10,000 PKR has been added to your OTC Wallet!"}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Referral Code Card */}
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>YOUR REFERRAL CODE</Text>
          <Animated.View style={[styles.codeBox, { transform: [{ scale: scaleAnim }] }]}>
            <Text style={styles.codeText}>{code}</Text>
            <TouchableOpacity style={styles.copyBtn} onPress={handleCopy} activeOpacity={0.75}>
              <Feather
                name={copied ? "check" : "copy"}
                size={18}
                color={copied ? GREEN : GOLD}
              />
              <Text style={[styles.copyLabel, { color: copied ? GREEN : GOLD }]}>
                {copied ? "Copied!" : "Copy"}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Rewards info */}
          <View style={styles.rewardsRow}>
            <View style={styles.rewardPill}>
              <Text style={styles.rewardNum}>+10</Text>
              <Text style={styles.rewardDesc}>Coins for friend</Text>
            </View>
            <View style={styles.rewardDivider} />
            <View style={styles.rewardPill}>
              <Text style={styles.rewardNum}>+5</Text>
              <Text style={styles.rewardDesc}>Coins for you</Text>
            </View>
            <View style={styles.rewardDivider} />
            <View style={styles.rewardPill}>
              <Text style={styles.rewardNum}>$100</Text>
              <Text style={styles.rewardDesc}>Mega-Milestone</Text>
            </View>
          </View>
        </View>

        {/* Progress Tracker */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <View style={styles.progressLeft}>
              <Text style={styles.progressTitle}>Milestone Progress</Text>
              {isLoading ? (
                <ActivityIndicator color={GOLD} size="small" style={{ marginTop: 4 }} />
              ) : (
                <Text style={styles.progressSub}>
                  {milestoneReached
                    ? "🎉 You've reached the $100 Mega-Milestone!"
                    : `You are ${remaining}/${MILESTONE_TARGET} referrals away from your $100 Bonus!`}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={refresh} style={styles.refreshBtn}>
              <Feather name="refresh-cw" size={16} color={GOLD} />
            </TouchableOpacity>
          </View>

          {/* Gold Progress Bar */}
          <View style={styles.barTrack}>
            <Animated.View
              style={[
                styles.barFill,
                {
                  width: `${progress * 100}%`,
                  backgroundColor: milestoneReached ? GREEN : GOLD,
                },
              ]}
            />
          </View>

          <View style={styles.progressNumbers}>
            <Text style={styles.progressCount}>
              <Text style={{ color: milestoneReached ? GREEN : GOLD, fontFamily: "Inter_700Bold" }}>
                {referrals}
              </Text>
              /{MILESTONE_TARGET} completed
            </Text>
            {!milestoneReached && (
              <Text style={styles.progressGoal}>Goal: $100 Bonus</Text>
            )}
          </View>

          {/* Milestone steps */}
          <View style={styles.stepsRow}>
            {Array.from({ length: MILESTONE_TARGET }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.step,
                  {
                    backgroundColor:
                      i < referrals
                        ? milestoneReached
                          ? GREEN
                          : GOLD
                        : "rgba(255,215,0,0.1)",
                    borderColor:
                      i < referrals
                        ? milestoneReached
                          ? GREEN
                          : GOLD
                        : "rgba(255,215,0,0.2)",
                  },
                ]}
              />
            ))}
          </View>
        </View>

        {/* Share on WhatsApp */}
        <TouchableOpacity
          style={styles.whatsappBtn}
          onPress={handleWhatsApp}
          activeOpacity={0.85}
        >
          <View style={styles.whatsappInner}>
            <View style={styles.whatsappIcon}>
              <Feather name="share-2" size={20} color="#000" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.whatsappTitle}>Share on WhatsApp</Text>
              <Text style={styles.whatsappSub}>Send your invite to friends instantly</Text>
            </View>
            <Feather name="chevron-right" size={18} color="#000" />
          </View>
        </TouchableOpacity>

        {/* Apply a Referral Code */}
        <View style={styles.applyCard}>
          <Text style={styles.applyTitle}>Have a Referral Code?</Text>
          <Text style={styles.applySub}>
            Enter a friend's code to claim your 10 OTC Coins welcome bonus.
          </Text>
          <View style={styles.applyRow}>
            <View
              style={[
                styles.applyInput,
                {
                  borderColor: claimMsg
                    ? claimMsg.ok
                      ? GREEN
                      : "#EF4444"
                    : claimCode
                    ? GOLD
                    : "rgba(255,215,0,0.2)",
                },
              ]}
            >
              <Feather
                name="tag"
                size={16}
                color={claimCode ? GOLD : "rgba(255,255,255,0.25)"}
              />
              <TextInput
                style={styles.applyTextInput}
                placeholder="e.g. OTCABCD9"
                placeholderTextColor="rgba(255,255,255,0.2)"
                value={claimCode}
                onChangeText={(v) => {
                  setClaimCode(v.toUpperCase());
                  setClaimMsg(null);
                }}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </View>
            <TouchableOpacity
              style={[
                styles.applySubmit,
                { opacity: claimCode.trim().length >= 6 ? 1 : 0.4 },
              ]}
              onPress={handleApplyCode}
              disabled={claimLoading || claimCode.trim().length < 6}
              activeOpacity={0.8}
            >
              {claimLoading ? (
                <ActivityIndicator color="#000" size="small" />
              ) : (
                <Feather name="arrow-right" size={20} color="#000" />
              )}
            </TouchableOpacity>
          </View>
          {claimMsg ? (
            <View style={styles.claimMsgRow}>
              <Feather
                name={claimMsg.ok ? "check-circle" : "x-circle"}
                size={14}
                color={claimMsg.ok ? GREEN : "#EF4444"}
              />
              <Text
                style={[
                  styles.claimMsgText,
                  { color: claimMsg.ok ? GREEN : "#EF4444" },
                ]}
              >
                {claimMsg.text}
              </Text>
            </View>
          ) : null}
        </View>

        {/* How it works */}
        <View style={styles.howCard}>
          <Text style={styles.howTitle}>How It Works</Text>
          {[
            {
              n: "1",
              t: "Share Your Code",
              d: "Send your unique code to a friend via WhatsApp or any channel.",
            },
            {
              n: "2",
              t: "Friend Joins OTC",
              d: "They sign up using your code and instantly receive 10 OTC Coins.",
            },
            {
              n: "3",
              t: "Complete First Ride",
              d: "Once they complete their first ride, you earn 5 OTC Coins.",
            },
            {
              n: "4",
              t: "Hit the Milestone",
              d: "Refer 10 friends who ride → earn the $100 Mega-Milestone Bonus!",
            },
          ].map((step) => (
            <View key={step.n} style={styles.howStep}>
              <View style={styles.howNum}>
                <Text style={styles.howNumText}>{step.n}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.howStepTitle}>{step.t}</Text>
                <Text style={styles.howStepDesc}>{step.d}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000000" },
  scroll: { paddingHorizontal: 20, paddingTop: 12 },

  header: { marginBottom: 20 },
  headerTitle: {
    fontSize: 30,
    fontFamily: "Inter_700Bold",
    color: GOLD,
    letterSpacing: 0.3,
  },
  headerSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.45)",
    marginTop: 4,
  },

  milestoneBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(34,197,94,0.1)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.4)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  milestoneIcon: { fontSize: 28 },
  milestoneTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#22C55E",
  },
  milestoneSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(34,197,94,0.7)",
    marginTop: 2,
  },

  codeCard: {
    backgroundColor: "#0A0A0A",
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.25)",
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
  },
  codeLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,215,0,0.5)",
    letterSpacing: 2,
    marginBottom: 12,
  },
  codeBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,215,0,0.07)",
    borderWidth: 2,
    borderColor: GOLD,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 16,
  },
  codeText: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: GOLD,
    letterSpacing: 3,
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,215,0,0.1)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  copyLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  rewardsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  rewardPill: { alignItems: "center", gap: 2 },
  rewardNum: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: GOLD,
  },
  rewardDesc: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.4)",
  },
  rewardDivider: {
    width: 1,
    height: 36,
    backgroundColor: "rgba(255,215,0,0.15)",
  },

  progressCard: {
    backgroundColor: "#0A0A0A",
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.15)",
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  progressLeft: { flex: 1 },
  progressTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  progressSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.45)",
    marginTop: 3,
    lineHeight: 17,
  },
  refreshBtn: {
    padding: 6,
    backgroundColor: GOLD_DIM,
    borderRadius: 8,
  },
  barTrack: {
    height: 10,
    backgroundColor: "rgba(255,215,0,0.1)",
    borderRadius: 100,
    overflow: "hidden",
    marginBottom: 10,
  },
  barFill: {
    height: "100%",
    borderRadius: 100,
    minWidth: 4,
  },
  progressNumbers: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  progressCount: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.5)",
  },
  progressGoal: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: GOLD,
  },
  stepsRow: {
    flexDirection: "row",
    gap: 5,
  },
  step: {
    flex: 1,
    height: 6,
    borderRadius: 100,
    borderWidth: 1,
  },

  whatsappBtn: {
    backgroundColor: GOLD,
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
  },
  whatsappInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  whatsappIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  whatsappTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#000000",
  },
  whatsappSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(0,0,0,0.55)",
    marginTop: 1,
  },

  applyCard: {
    backgroundColor: "#0A0A0A",
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.15)",
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
  },
  applyTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  applySub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.4)",
    marginBottom: 14,
  },
  applyRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  applyInput: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 50,
    backgroundColor: "#111",
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  applyTextInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: GOLD,
    letterSpacing: 1.5,
  },
  applySubmit: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
  },
  claimMsgRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  claimMsgText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },

  howCard: {
    backgroundColor: "#0A0A0A",
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.12)",
    borderRadius: 18,
    padding: 20,
    gap: 16,
  },
  howTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  howStep: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  howNum: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: GOLD_DIM,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  howNumText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: GOLD,
  },
  howStepTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  howStepDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.4)",
    marginTop: 2,
    lineHeight: 17,
  },
});
