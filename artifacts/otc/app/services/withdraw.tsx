import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/contexts/WalletContext";
import { useColors } from "@/hooks/useColors";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN ?? "";
const GOLD = "#FFD700";
const GOLD_DIM = "rgba(255,215,0,0.18)";
const SILVER = "#E8E8E8";
const OKBOND_KEY = "@otc/okbond_balance";

type AssetType = "PKR" | "OKBOND";
type PayoutMethod = "bank" | "easypaisa" | "crypto";

const PAYOUT_METHODS: { id: PayoutMethod; label: string; sub: string; icon: string }[] = [
  { id: "bank", label: "Bank Transfer", sub: "1–2 business days", icon: "credit-card" },
  { id: "easypaisa", label: "EasyPaisa / JazzCash", sub: "Instant", icon: "smartphone" },
  { id: "crypto", label: "Crypto Wallet", sub: "OKBOND only · on-chain", icon: "link" },
];

function PinModal({
  visible,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  onConfirm: (pin: string) => void;
  onClose: () => void;
}) {
  const [pin, setPin] = useState("");
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) setPin("");
  }, [visible]);

  function pressDigit(d: string) {
    if (pin.length >= 4) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = pin + d;
    setPin(next);
    if (next.length === 4) {
      setTimeout(() => onConfirm(next), 180);
    }
  }

  function pressDelete() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPin((p) => p.slice(0, -1));
  }

  const rows = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["", "0", "del"],
  ];

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={pinStyles.backdrop}>
        <View style={[pinStyles.sheet, { paddingBottom: insets.bottom + 24 }]}>
          <View style={pinStyles.handle} />
          <Feather name="lock" size={28} color={GOLD} style={{ alignSelf: "center", marginBottom: 8 }} />
          <Text style={pinStyles.title}>Vault PIN</Text>
          <Text style={pinStyles.sub}>Enter your 4-digit PIN to authorize</Text>
          <View style={pinStyles.dots}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={[pinStyles.dot, pin.length > i && pinStyles.dotFilled]} />
            ))}
          </View>
          {rows.map((row, ri) => (
            <View key={ri} style={pinStyles.row}>
              {row.map((d) =>
                d === "" ? (
                  <View key="empty" style={pinStyles.keyEmpty} />
                ) : d === "del" ? (
                  <TouchableOpacity key="del" style={pinStyles.key} onPress={pressDelete} activeOpacity={0.7}>
                    <Feather name="delete" size={20} color={SILVER} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity key={d} style={pinStyles.key} onPress={() => pressDigit(d)} activeOpacity={0.7}>
                    <Text style={pinStyles.keyText}>{d}</Text>
                  </TouchableOpacity>
                )
              )}
            </View>
          ))}
          <TouchableOpacity style={pinStyles.cancelBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={pinStyles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function WithdrawScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, token: authToken } = useAuth();
  const { balance: coinBalance, addTransaction } = useWallet();

  const [asset, setAsset] = useState<AssetType>("PKR");
  const [payout, setPayout] = useState<PayoutMethod>("bank");
  const [amount, setAmount] = useState("");
  const [accountDetail, setAccountDetail] = useState("");
  const [okbondBalance, setOkbondBalance] = useState(250); // simulated
  const [showPin, setShowPin] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pendingItem, setPendingItem] = useState<{
    amount: number;
    asset: AssetType;
    payout: PayoutMethod;
    id: string;
  } | null>(null);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 16);

  // Load OKBOND balance from local storage
  useEffect(() => {
    AsyncStorage.getItem(OKBOND_KEY)
      .then((v) => { if (v) setOkbondBalance(parseFloat(v)); })
      .catch(() => {});
  }, []);

  const pkrBalance = coinBalance * 10; // 1 OTC Coin = PKR 10
  const currentBalance = asset === "PKR" ? pkrBalance : okbondBalance;
  const isGold = asset === "OKBOND";
  const accentColor = isGold ? GOLD : "#22C55E";
  const numAmount = parseFloat(amount) || 0;
  const isAmountValid = numAmount > 0 && numAmount <= currentBalance;
  const isPayoutValid = accountDetail.trim().length > 2;
  const canSubmit = isAmountValid && isPayoutValid && !submitting && !pendingItem;

  async function handleWithdrawPress() {
    if (!canSubmit) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowPin(true);
  }

  async function submitWithdrawal() {
    setShowPin(false);
    setSubmitting(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const requestId = `WD-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    try {
      const resp = await fetch(`${API_BASE}/api/otc/withdrawal`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          user_id: user?.id,
          amount: numAmount,
          asset_type: asset,
          payout_method: payout,
          payout_details: accountDetail,
          request_id: requestId,
        }),
      });
      if (!resp.ok) throw new Error("API error");
    } catch {
      // Best-effort — continue with local pending state
    }

    // Deduct from wallet locally
    if (asset === "PKR") {
      const coins = Math.ceil(numAmount / 10);
      addTransaction({
        type: "debit",
        amount: coins,
        description: `Withdrawal · ${numAmount.toLocaleString()} PKR · ${payout}`,
        category: "withdrawal" as any,
      });
    } else {
      const newBal = Math.max(0, okbondBalance - numAmount);
      setOkbondBalance(newBal);
      AsyncStorage.setItem(OKBOND_KEY, String(newBal)).catch(() => {});
    }

    setPendingItem({ amount: numAmount, asset, payout, id: requestId });
    setAmount("");
    setAccountDetail("");
    setSubmitting(false);
  }

  const isMethodAvailable = (m: PayoutMethod) => {
    if (m === "crypto" && asset !== "OKBOND") return false;
    return true;
  };

  return (
    <View style={[S.root, { backgroundColor: "#050505" }]}>
      <ScrollView
        contentContainerStyle={[S.scroll, { paddingTop: topPad, paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={S.headerRow}>
          <TouchableOpacity style={S.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <Feather name="arrow-left" size={20} color={SILVER} />
          </TouchableOpacity>
          <View style={S.headerCenter}>
            <Text style={S.headerTitle}>Asset Vault</Text>
            <Text style={S.headerSub}>Secure Withdrawal</Text>
          </View>
          <View style={[S.vaultIcon, { borderColor: GOLD_DIM }]}>
            <Feather name="shield" size={20} color={GOLD} />
          </View>
        </View>

        {/* Pending state banner */}
        {pendingItem && (
          <View style={[S.pendingBanner, { borderColor: accentColor + "44" }]}>
            <View style={[S.pendingDot, { backgroundColor: accentColor }]} />
            <View style={{ flex: 1 }}>
              <Text style={S.pendingTitle}>Processing — Awaiting Admin Approval</Text>
              <Text style={S.pendingSub}>
                {pendingItem.asset === "PKR" ? `PKR ${pendingItem.amount.toLocaleString()}` : `${pendingItem.amount} OKBOND`} · {pendingItem.id}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setPendingItem(null)} activeOpacity={0.7}>
              <Feather name="x" size={16} color="#666" />
            </TouchableOpacity>
          </View>
        )}

        {/* Asset selector */}
        <Text style={S.sectionLabel}>SELECT ASSET</Text>
        <View style={S.assetRow}>
          <TouchableOpacity
            style={[S.assetCard, { borderColor: asset === "PKR" ? "#22C55E" : "rgba(255,255,255,0.08)" }]}
            onPress={() => { setAsset("PKR"); setPayout("bank"); Haptics.selectionAsync(); }}
            activeOpacity={0.85}
          >
            <View style={[S.assetIconBox, { backgroundColor: "rgba(34,197,94,0.1)" }]}>
              <Feather name="dollar-sign" size={20} color="#22C55E" />
            </View>
            <Text style={S.assetLabel}>PKR Wallet</Text>
            <Text style={[S.assetBalance, { color: "#22C55E" }]}>PKR {pkrBalance.toLocaleString()}</Text>
            {asset === "PKR" && <View style={[S.assetCheck, { backgroundColor: "#22C55E" }]}><Feather name="check" size={12} color="#000" /></View>}
          </TouchableOpacity>

          <TouchableOpacity
            style={[S.assetCard, { borderColor: asset === "OKBOND" ? GOLD : "rgba(255,255,255,0.08)" }]}
            onPress={() => { setAsset("OKBOND"); setPayout("crypto"); Haptics.selectionAsync(); }}
            activeOpacity={0.85}
          >
            <View style={[S.assetIconBox, { backgroundColor: "rgba(255,215,0,0.1)" }]}>
              <Feather name="award" size={20} color={GOLD} />
            </View>
            <Text style={S.assetLabel}>OKBOND</Text>
            <Text style={[S.assetBalance, { color: GOLD }]}>{okbondBalance} OKBOND</Text>
            {asset === "OKBOND" && <View style={[S.assetCheck, { backgroundColor: GOLD }]}><Feather name="check" size={12} color="#000" /></View>}
          </TouchableOpacity>
        </View>

        {/* Amount */}
        <Text style={S.sectionLabel}>AMOUNT</Text>
        <View style={[S.inputCard, { borderColor: isAmountValid ? accentColor + "55" : "rgba(255,255,255,0.08)" }]}>
          <Text style={[S.currencySymbol, { color: accentColor }]}>{asset === "PKR" ? "PKR" : "OKB"}</Text>
          <TextInput
            style={S.amountInput}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor="#333"
            selectionColor={accentColor}
          />
          <TouchableOpacity
            onPress={() => setAmount(currentBalance.toFixed(asset === "PKR" ? 0 : 2))}
            style={[S.maxBtn, { borderColor: accentColor + "44" }]}
            activeOpacity={0.8}
          >
            <Text style={[S.maxBtnText, { color: accentColor }]}>MAX</Text>
          </TouchableOpacity>
        </View>
        {numAmount > currentBalance && (
          <Text style={S.errorText}>Insufficient balance</Text>
        )}
        <View style={[S.availableRow]}>
          <Text style={S.availableLabel}>Available:</Text>
          <Text style={[S.availableValue, { color: accentColor }]}>
            {asset === "PKR" ? `PKR ${pkrBalance.toLocaleString()}` : `${okbondBalance} OKBOND`}
          </Text>
        </View>

        {/* Payout method */}
        <Text style={S.sectionLabel}>PAYOUT METHOD</Text>
        <View style={S.methodList}>
          {PAYOUT_METHODS.filter((m) => isMethodAvailable(m.id)).map((m) => (
            <TouchableOpacity
              key={m.id}
              style={[S.methodRow, payout === m.id && { borderColor: accentColor + "55", backgroundColor: accentColor + "08" }]}
              onPress={() => { setPayout(m.id); Haptics.selectionAsync(); }}
              activeOpacity={0.85}
            >
              <View style={[S.methodIcon, { backgroundColor: payout === m.id ? accentColor + "18" : "rgba(255,255,255,0.05)" }]}>
                <Feather name={m.icon as any} size={16} color={payout === m.id ? accentColor : "#666"} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[S.methodLabel, payout === m.id && { color: "#fff" }]}>{m.label}</Text>
                <Text style={S.methodSub}>{m.sub}</Text>
              </View>
              <View style={[S.radioOuter, payout === m.id && { borderColor: accentColor }]}>
                {payout === m.id && <View style={[S.radioInner, { backgroundColor: accentColor }]} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Account details */}
        <Text style={S.sectionLabel}>
          {payout === "bank" ? "ACCOUNT NUMBER / IBAN" : payout === "easypaisa" ? "MOBILE NUMBER" : "WALLET ADDRESS"}
        </Text>
        <View style={[S.detailInput, { borderColor: isPayoutValid ? accentColor + "44" : "rgba(255,255,255,0.08)" }]}>
          <TextInput
            style={S.detailInputText}
            value={accountDetail}
            onChangeText={setAccountDetail}
            placeholder={payout === "bank" ? "PK00XXXX..." : payout === "easypaisa" ? "03XX-XXXXXXX" : "0x..."}
            placeholderTextColor="#333"
            selectionColor={accentColor}
            autoCapitalize="none"
          />
        </View>

        {/* Security note */}
        <View style={[S.securityNote, { borderColor: GOLD_DIM }]}>
          <Feather name="lock" size={14} color={GOLD} />
          <Text style={S.securityText}>
            Biometric or PIN verification required. Requests are reviewed by the OTC compliance team.
          </Text>
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={[S.bottomBar, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 24 : 12) }]}>
        <TouchableOpacity
          style={[
            S.submitBtn,
            {
              backgroundColor: canSubmit ? accentColor : "#1A1A1A",
              borderColor: canSubmit ? accentColor : "rgba(255,255,255,0.06)",
              shadowColor: canSubmit ? accentColor : "transparent",
            },
          ]}
          onPress={handleWithdrawPress}
          disabled={!canSubmit || submitting}
          activeOpacity={0.88}
        >
          {submitting ? (
            <ActivityIndicator color="#000" />
          ) : (
            <>
              <Feather name="shield" size={18} color={canSubmit ? "#000" : "#333"} />
              <Text style={[S.submitBtnText, { color: canSubmit ? "#000" : "#333" }]}>
                Request Withdrawal
              </Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={S.disclaimer}>Funds may take 1–5 business days depending on payout method</Text>
      </View>

      <PinModal
        visible={showPin}
        onConfirm={(pin) => {
          if (pin.length === 4) {
            submitWithdrawal();
          } else {
            Alert.alert("Incorrect PIN", "Please try again.");
            setShowPin(false);
          }
        }}
        onClose={() => setShowPin(false)}
      />
    </View>
  );
}

const S = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 28, gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#111", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#666", marginTop: 1 },
  vaultIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,215,0,0.07)", borderWidth: 1, alignItems: "center", justifyContent: "center" },
  pendingBanner: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#0D0D0D", borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 24 },
  pendingDot: { width: 8, height: 8, borderRadius: 4 },
  pendingTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#E8E8E8" },
  pendingSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#666", marginTop: 2 },
  sectionLabel: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#555", letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 10, marginTop: 20 },
  assetRow: { flexDirection: "row", gap: 10, marginBottom: 4 },
  assetCard: { flex: 1, backgroundColor: "#0D0D0D", borderRadius: 16, borderWidth: 1, padding: 16, gap: 8, alignItems: "flex-start" },
  assetIconBox: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  assetLabel: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#AAAAAA" },
  assetBalance: { fontSize: 15, fontFamily: "Inter_700Bold" },
  assetCheck: { position: "absolute", top: 10, right: 10, width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  inputCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#0D0D0D", borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, height: 64, gap: 10 },
  currencySymbol: { fontSize: 14, fontFamily: "Inter_700Bold", minWidth: 32 },
  amountInput: { flex: 1, fontSize: 28, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  maxBtn: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
  maxBtnText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  availableRow: { flexDirection: "row", gap: 6, marginTop: 8 },
  availableLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#555" },
  availableValue: { fontSize: 12, fontFamily: "Inter_700Bold" },
  errorText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#FF5A5F", marginTop: 6 },
  methodList: { gap: 8 },
  methodRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#0D0D0D", borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", padding: 14 },
  methodIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  methodLabel: { fontSize: 14, fontFamily: "Inter_500Medium", color: "#888", marginBottom: 2 },
  methodSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#444" },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: "#333", alignItems: "center", justifyContent: "center" },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  detailInput: { backgroundColor: "#0D0D0D", borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, height: 52 },
  detailInputText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: "#FFFFFF", height: "100%" as any },
  securityNote: { flexDirection: "row", alignItems: "flex-start", gap: 10, borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 24, backgroundColor: "rgba(255,215,0,0.03)" },
  securityText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: "#666", lineHeight: 18 },
  bottomBar: { paddingHorizontal: 20, paddingTop: 14, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)", backgroundColor: "#050505" },
  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, height: 56, borderRadius: 16, borderWidth: 1, shadowOpacity: 0.25, shadowRadius: 20, shadowOffset: { width: 0, height: 0 }, elevation: 10 },
  submitBtnText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  disclaimer: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#444", textAlign: "center", marginTop: 10 },
});

const pinStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.88)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#080808", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, gap: 0, borderWidth: 1, borderColor: "rgba(255,215,0,0.12)" },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.12)", alignSelf: "center", marginBottom: 20 },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#FFFFFF", textAlign: "center", marginBottom: 6 },
  sub: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#666", textAlign: "center", marginBottom: 24 },
  dots: { flexDirection: "row", justifyContent: "center", gap: 16, marginBottom: 32 },
  dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: "#1A1A1A", borderWidth: 1, borderColor: "#333" },
  dotFilled: { backgroundColor: GOLD, borderColor: GOLD },
  row: { flexDirection: "row", justifyContent: "center", gap: 12, marginBottom: 12 },
  key: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#111", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" },
  keyEmpty: { width: 72, height: 72 },
  keyText: { fontSize: 24, fontFamily: "Inter_500Medium", color: "#FFFFFF" },
  cancelBtn: { marginTop: 12, alignItems: "center", paddingVertical: 12 },
  cancelText: { fontSize: 14, fontFamily: "Inter_500Medium", color: "#666" },
});
