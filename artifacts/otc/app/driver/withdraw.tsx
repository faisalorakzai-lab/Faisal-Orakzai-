import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
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

import { useDriverAuth } from "@/contexts/DriverAuthContext";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN ?? "";
const GOLD = "#FFD700";
const GOLD_DIM = "rgba(255,215,0,0.18)";

type PayoutMethod = "bank" | "easypaisa";

const PAYOUT_METHODS: { id: PayoutMethod; label: string; sub: string; icon: string }[] = [
  { id: "bank", label: "Bank Transfer", sub: "1–2 business days", icon: "credit-card" },
  { id: "easypaisa", label: "EasyPaisa / JazzCash", sub: "Instant settlement", icon: "smartphone" },
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
    if (next.length === 4) setTimeout(() => onConfirm(next), 180);
  }

  function pressDelete() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPin((p) => p.slice(0, -1));
  }

  const rows = [["1","2","3"],["4","5","6"],["7","8","9"],["","0","del"]];

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={pinS.backdrop}>
        <View style={[pinS.sheet, { paddingBottom: insets.bottom + 24 }]}>
          <View style={pinS.handle} />
          <Feather name="lock" size={28} color={GOLD} style={{ alignSelf: "center", marginBottom: 8 }} />
          <Text style={pinS.title}>Vault PIN</Text>
          <Text style={pinS.sub}>Enter your 4-digit PIN</Text>
          <View style={pinS.dots}>
            {[0,1,2,3].map((i) => (
              <View key={i} style={[pinS.dot, pin.length > i && pinS.dotFilled]} />
            ))}
          </View>
          {rows.map((row, ri) => (
            <View key={ri} style={pinS.row}>
              {row.map((d) =>
                d === "" ? <View key="empty" style={pinS.keyEmpty} /> :
                d === "del" ? (
                  <TouchableOpacity key="del" style={pinS.key} onPress={pressDelete} activeOpacity={0.7}>
                    <Feather name="delete" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity key={d} style={pinS.key} onPress={() => pressDigit(d)} activeOpacity={0.7}>
                    <Text style={pinS.keyText}>{d}</Text>
                  </TouchableOpacity>
                )
              )}
            </View>
          ))}
          <TouchableOpacity style={pinS.cancelBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={pinS.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function DriverWithdrawScreen() {
  const insets = useSafeAreaInsets();
  const { driver, token } = useDriverAuth();

  const [payout, setPayout] = useState<PayoutMethod>("bank");
  const [amount, setAmount] = useState("");
  const [accountDetail, setAccountDetail] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pendingItem, setPendingItem] = useState<{ amount: number; id: string } | null>(null);
  const [availableBalance, setAvailableBalance] = useState(0);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 16);

  // Fetch driver's net earnings balance
  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/api/otc/driver/earnings`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() as Promise<{ earnings?: Array<{ net_earnings: number; is_cash_debt_paid: boolean; payment_method: string }> }> : Promise.resolve({ earnings: [] }))
      .then((data) => {
        const total = (data.earnings ?? [])
          .filter((e) => e.payment_method !== "cash" || e.is_cash_debt_paid)
          .reduce((s, e) => s + (e.net_earnings ?? 0), 0);
        setAvailableBalance(Math.max(0, total));
      })
      .catch(() => {});
  }, [token]);

  const numAmount = parseFloat(amount) || 0;
  const isAmountValid = numAmount > 0 && numAmount <= availableBalance;
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

    const requestId = `DWD-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    try {
      await fetch(`${API_BASE}/api/otc/withdrawal`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          user_id: driver?.id,
          amount: numAmount,
          asset_type: "PKR",
          payout_method: payout,
          payout_details: accountDetail,
          request_id: requestId,
          is_driver: true,
        }),
      });
    } catch {}

    setAvailableBalance((b) => Math.max(0, b - numAmount));
    setPendingItem({ amount: numAmount, id: requestId });
    setAmount("");
    setAccountDetail("");
    setSubmitting(false);
  }

  return (
    <View style={[S.root]}>
      <ScrollView
        contentContainerStyle={[S.scroll, { paddingTop: topPad, paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={S.headerRow}>
          <TouchableOpacity style={S.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <Feather name="arrow-left" size={20} color="#E8E8E8" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={S.headerTitle}>Driver Vault</Text>
            <Text style={S.headerSub}>Withdraw Your Earnings</Text>
          </View>
          <View style={S.vaultBadge}>
            <Feather name="shield" size={18} color={GOLD} />
          </View>
        </View>

        {/* Balance card */}
        <View style={[S.balanceCard, { borderColor: GOLD_DIM }]}>
          <Text style={S.balanceLabel}>AVAILABLE TO WITHDRAW</Text>
          <Text style={S.balanceValue}>PKR {availableBalance.toLocaleString()}</Text>
          <Text style={S.balanceSub}>{driver?.name ?? "Driver"} · Net after commission</Text>
        </View>

        {/* Pending banner */}
        {pendingItem && (
          <View style={S.pendingBanner}>
            <View style={S.pendingDot} />
            <View style={{ flex: 1 }}>
              <Text style={S.pendingTitle}>Processing — Awaiting Admin Approval</Text>
              <Text style={S.pendingSub}>PKR {pendingItem.amount.toLocaleString()} · {pendingItem.id}</Text>
            </View>
            <TouchableOpacity onPress={() => setPendingItem(null)} activeOpacity={0.7}>
              <Feather name="x" size={16} color="#666" />
            </TouchableOpacity>
          </View>
        )}

        {/* Amount */}
        <Text style={S.sectionLabel}>AMOUNT (PKR)</Text>
        <View style={[S.inputCard, { borderColor: isAmountValid ? GOLD + "55" : "rgba(255,255,255,0.08)" }]}>
          <Text style={[S.currencySymbol]}>PKR</Text>
          <TextInput
            style={S.amountInput}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor="#333"
            selectionColor={GOLD}
          />
          <TouchableOpacity onPress={() => setAmount(String(availableBalance))} style={S.maxBtn} activeOpacity={0.8}>
            <Text style={S.maxBtnText}>MAX</Text>
          </TouchableOpacity>
        </View>
        {numAmount > availableBalance && <Text style={S.errorText}>Exceeds available balance</Text>}

        {/* Payout method */}
        <Text style={S.sectionLabel}>PAYOUT METHOD</Text>
        <View style={S.methodList}>
          {PAYOUT_METHODS.map((m) => (
            <TouchableOpacity
              key={m.id}
              style={[S.methodRow, payout === m.id && { borderColor: GOLD + "55", backgroundColor: "rgba(255,215,0,0.05)" }]}
              onPress={() => { setPayout(m.id); Haptics.selectionAsync(); }}
              activeOpacity={0.85}
            >
              <View style={[S.methodIcon, { backgroundColor: payout === m.id ? "rgba(255,215,0,0.12)" : "rgba(255,255,255,0.05)" }]}>
                <Feather name={m.icon as any} size={16} color={payout === m.id ? GOLD : "#666"} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[S.methodLabel, payout === m.id && { color: "#fff" }]}>{m.label}</Text>
                <Text style={S.methodSub}>{m.sub}</Text>
              </View>
              <View style={[S.radioOuter, payout === m.id && { borderColor: GOLD }]}>
                {payout === m.id && <View style={[S.radioInner, { backgroundColor: GOLD }]} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Account details */}
        <Text style={S.sectionLabel}>
          {payout === "bank" ? "ACCOUNT NUMBER / IBAN" : "MOBILE NUMBER"}
        </Text>
        <View style={[S.detailInput, { borderColor: isPayoutValid ? GOLD + "44" : "rgba(255,255,255,0.08)" }]}>
          <TextInput
            style={S.detailInputText}
            value={accountDetail}
            onChangeText={setAccountDetail}
            placeholder={payout === "bank" ? "PK00XXXX..." : "03XX-XXXXXXX"}
            placeholderTextColor="#333"
            selectionColor={GOLD}
            autoCapitalize="none"
          />
        </View>

        {/* Security note */}
        <View style={[S.securityNote, { borderColor: GOLD_DIM }]}>
          <Feather name="lock" size={14} color={GOLD} />
          <Text style={S.securityText}>
            PIN or biometric verification required. Approved by admin within 1–2 business days.
          </Text>
        </View>
      </ScrollView>

      {/* CTA */}
      <View style={[S.bottomBar, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 24 : 12) }]}>
        <TouchableOpacity
          style={[S.submitBtn, { backgroundColor: canSubmit ? GOLD : "#141414", borderColor: canSubmit ? GOLD : "#222", shadowColor: canSubmit ? GOLD : "transparent" }]}
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
      </View>

      <PinModal
        visible={showPin}
        onConfirm={(pin) => {
          if (pin.length === 4) submitWithdrawal();
          else setShowPin(false);
        }}
        onClose={() => setShowPin(false)}
      />
    </View>
  );
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#050505" },
  scroll: { paddingHorizontal: 20 },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 24, gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#111", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#666" },
  vaultBadge: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,215,0,0.07)", borderWidth: 1, borderColor: "rgba(255,215,0,0.18)", alignItems: "center", justifyContent: "center" },
  balanceCard: { backgroundColor: "#0D0D0D", borderRadius: 20, borderWidth: 1, padding: 20, gap: 6, marginBottom: 20 },
  balanceLabel: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#666", letterSpacing: 1.4, textTransform: "uppercase" },
  balanceValue: { fontSize: 34, fontFamily: "Inter_700Bold", color: GOLD },
  balanceSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#555" },
  pendingBanner: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#0D0D0D", borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,215,0,0.2)", padding: 14, marginBottom: 20 },
  pendingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: GOLD },
  pendingTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#E8E8E8" },
  pendingSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#666", marginTop: 2 },
  sectionLabel: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#555", letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 10, marginTop: 20 },
  inputCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#0D0D0D", borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, height: 64, gap: 10 },
  currencySymbol: { fontSize: 14, fontFamily: "Inter_700Bold", color: GOLD, minWidth: 32 },
  amountInput: { flex: 1, fontSize: 28, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  maxBtn: { borderRadius: 8, borderWidth: 1, borderColor: "rgba(255,215,0,0.3)", paddingHorizontal: 10, paddingVertical: 5 },
  maxBtnText: { fontSize: 11, fontFamily: "Inter_700Bold", color: GOLD },
  errorText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#FF5A5F", marginTop: 6 },
  methodList: { gap: 8 },
  methodRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#0D0D0D", borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", padding: 14 },
  methodIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  methodLabel: { fontSize: 14, fontFamily: "Inter_500Medium", color: "#888", marginBottom: 2 },
  methodSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#444" },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: "#333", alignItems: "center", justifyContent: "center" },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  detailInput: { backgroundColor: "#0D0D0D", borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, justifyContent: "center", height: 52 },
  detailInputText: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#FFFFFF" },
  securityNote: { flexDirection: "row", alignItems: "flex-start", gap: 10, borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 24, backgroundColor: "rgba(255,215,0,0.03)" },
  securityText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: "#666", lineHeight: 18 },
  bottomBar: { paddingHorizontal: 20, paddingTop: 14, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)", backgroundColor: "#050505" },
  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, height: 56, borderRadius: 16, borderWidth: 1, shadowOpacity: 0.25, shadowRadius: 20, shadowOffset: { width: 0, height: 0 }, elevation: 10 },
  submitBtnText: { fontSize: 16, fontFamily: "Inter_700Bold" },
});

const pinS = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.88)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#080808", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, borderWidth: 1, borderColor: "rgba(255,215,0,0.12)" },
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
