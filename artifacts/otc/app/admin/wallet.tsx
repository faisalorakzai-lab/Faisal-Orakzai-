import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
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
import { AdminSidebar } from "./AdminSidebar";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

const GOLD = "#FFD700";
const BG = "#050505";
const CARD = "#0D0D0D";
const BORDER = "rgba(255,215,0,0.13)";
const GREEN = "#00E676";
const RED = "#FF4B4B";

type WalletUser = {
  id: string;
  name: string;
  phone: string;
  type: "user" | "driver";
  pkr_balance: number;
  okbond_balance: number;
};

type TxRow = {
  id: string;
  user_id: string;
  type: string;
  asset_type: string;
  amount: number;
  balance_after: number;
  reason: string;
  admin_name: string;
  created_at: string;
};

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 16 : insets.top;

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<WalletUser[]>([]);
  const [selected, setSelected] = useState<WalletUser | null>(null);

  const [assetType, setAssetType] = useState<"PKR" | "OKBOND">("PKR");
  const [action, setAction] = useState<"add" | "deduct">("add");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const [showConfirm, setShowConfirm] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [execMsg, setExecMsg] = useState<string | null>(null);

  const [txRows, setTxRows] = useState<TxRow[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txPage, setTxPage] = useState(1);
  const [txTotalPages, setTxTotalPages] = useState(1);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setSearching(true);
    setResults([]);
    try {
      const r = await fetch(`${API_BASE}/api/otc/admin/wallet/search?q=${encodeURIComponent(query.trim())}`);
      const d = await r.json();
      setResults(d.results ?? []);
    } catch { setResults([]); }
    finally { setSearching(false); }
  }, [query]);

  const loadTransactions = useCallback(async (page = 1) => {
    setTxLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/otc/admin/wallet/manual-transactions?page=${page}`);
      const d = await r.json();
      setTxRows(d.items ?? []);
      setTxTotalPages(d.totalPages ?? 1);
      setTxPage(page);
    } catch { setTxRows([]); }
    finally { setTxLoading(false); }
  }, []);

  useEffect(() => { loadTransactions(1); }, [loadTransactions]);

  const confirmExecute = () => {
    if (!selected || !amount || !reason.trim()) return;
    setShowConfirm(true);
  };

  const executeTransaction = async () => {
    if (!selected) return;
    setExecuting(true);
    setExecMsg(null);
    try {
      const r = await fetch(`${API_BASE}/api/otc/admin/wallet/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: selected.id,
          asset_type: assetType,
          action,
          amount: Number(amount),
          reason: reason.trim(),
          admin_name: "Admin",
        }),
      });
      const d = await r.json();
      if (!r.ok) { setExecMsg(`Error: ${d.error}`); }
      else {
        const newBal = d.new_balance as number;
        setSelected({
          ...selected,
          pkr_balance: assetType === "PKR" ? newBal : selected.pkr_balance,
          okbond_balance: assetType === "OKBOND" ? newBal : selected.okbond_balance,
        });
        setAmount(""); setReason("");
        setExecMsg(`✓ Done — new balance: ${newBal.toLocaleString()} ${assetType}`);
        loadTransactions(1);
      }
    } catch { setExecMsg("Network error — please retry"); }
    finally { setExecuting(false); setShowConfirm(false); }
  };

  return (
    <View style={[s.root, { paddingTop: topPad }]}>
      <AdminSidebar activeKey="wallet" topPad={topPad} />

      <ScrollView style={s.main} contentContainerStyle={s.mainContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <Feather name="credit-card" size={22} color={GOLD} />
          <View style={{ marginLeft: 10 }}>
            <Text style={s.title}>Master Wallet Control</Text>
            <Text style={s.subtitle}>Search, adjust and audit user balances</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={s.card}>
          <Text style={s.sectionLabel}>Global Wallet Search</Text>
          <View style={s.searchRow}>
            <TextInput
              style={s.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Search by name, phone or ID…"
              placeholderTextColor="#444"
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            <TouchableOpacity style={s.searchBtn} onPress={handleSearch} activeOpacity={0.8}>
              {searching
                ? <ActivityIndicator color={BG} size="small" />
                : <Feather name="search" size={16} color={BG} />}
            </TouchableOpacity>
          </View>

          {results.length > 0 && (
            <View style={s.resultsList}>
              {results.map((u) => (
                <TouchableOpacity
                  key={u.id}
                  style={[s.resultRow, selected?.id === u.id && s.resultRowActive]}
                  onPress={() => setSelected(u)}
                  activeOpacity={0.8}
                >
                  <Feather name={u.type === "driver" ? "truck" : "user"} size={14} color={selected?.id === u.id ? BG : GOLD} />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={[s.resultName, selected?.id === u.id && { color: BG }]}>{u.name}</Text>
                    <Text style={[s.resultPhone, selected?.id === u.id && { color: "#333" }]}>{u.phone} · {u.type}</Text>
                  </View>
                  <Text style={[s.resultBal, selected?.id === u.id && { color: BG }]}>{u.pkr_balance.toLocaleString()} PKR</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Balance Cards */}
        {selected && (
          <View style={s.balanceRow}>
            <View style={[s.balCard, { flex: 1 }]}>
              <Feather name="dollar-sign" size={20} color={GOLD} />
              <Text style={s.balLabel}>PKR Balance</Text>
              <Text style={s.balAmount}>₨ {selected.pkr_balance.toLocaleString()}</Text>
            </View>
            <View style={[s.balCard, { flex: 1 }]}>
              <Feather name="zap" size={20} color={GOLD} />
              <Text style={s.balLabel}>OKBOND Balance</Text>
              <Text style={s.balAmount}>{selected.okbond_balance.toLocaleString()} OKBOND</Text>
            </View>
          </View>
        )}

        {/* Adjustment Form */}
        {selected && (
          <View style={s.card}>
            <Text style={s.sectionLabel}>Adjustment Tools — {selected.name}</Text>

            {/* Asset Type */}
            <Text style={s.fieldLabel}>Asset Type</Text>
            <View style={s.toggleRow}>
              {(["PKR", "OKBOND"] as const).map((a) => (
                <TouchableOpacity
                  key={a}
                  style={[s.toggleBtn, assetType === a && s.toggleBtnActive]}
                  onPress={() => setAssetType(a)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.toggleText, assetType === a && s.toggleTextActive]}>{a}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Action Type */}
            <Text style={s.fieldLabel}>Action</Text>
            <View style={s.toggleRow}>
              <TouchableOpacity
                style={[s.toggleBtn, action === "add" && { backgroundColor: GREEN, borderColor: GREEN }]}
                onPress={() => setAction("add")} activeOpacity={0.8}
              >
                <Text style={[s.toggleText, action === "add" && { color: BG, fontFamily: "Inter_700Bold" }]}>
                  + Add
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.toggleBtn, action === "deduct" && { backgroundColor: RED, borderColor: RED }]}
                onPress={() => setAction("deduct")} activeOpacity={0.8}
              >
                <Text style={[s.toggleText, action === "deduct" && { color: "#fff", fontFamily: "Inter_700Bold" }]}>
                  − Deduct
                </Text>
              </TouchableOpacity>
            </View>

            {/* Amount */}
            <Text style={s.fieldLabel}>Amount</Text>
            <TextInput
              style={s.input}
              value={amount}
              onChangeText={setAmount}
              placeholder="Enter amount…"
              placeholderTextColor="#444"
              keyboardType="numeric"
            />

            {/* Reason */}
            <Text style={s.fieldLabel}>Reason / Note <Text style={{ color: RED }}>*</Text></Text>
            <TextInput
              style={[s.input, { height: 72, textAlignVertical: "top" }]}
              value={reason}
              onChangeText={setReason}
              placeholder="e.g. Referral Bonus, Correction for Ride #123…"
              placeholderTextColor="#444"
              multiline
            />

            {execMsg && (
              <Text style={[s.execMsg, execMsg.startsWith("✓") ? { color: GREEN } : { color: RED }]}>
                {execMsg}
              </Text>
            )}

            <TouchableOpacity
              style={[s.executeBtn, (!amount || !reason.trim()) && s.executeBtnDisabled]}
              onPress={confirmExecute}
              activeOpacity={0.8}
              disabled={!amount || !reason.trim()}
            >
              <Feather name="zap" size={15} color={BG} />
              <Text style={s.executeBtnText}>Execute Transaction</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Manual Transaction History */}
        <View style={s.card}>
          <View style={s.sectionHeaderRow}>
            <Text style={s.sectionLabel}>Manual Adjustment History</Text>
            <TouchableOpacity onPress={() => loadTransactions(1)} activeOpacity={0.8}>
              <Feather name="refresh-cw" size={14} color={GOLD} />
            </TouchableOpacity>
          </View>

          {txLoading ? (
            <ActivityIndicator color={GOLD} style={{ marginVertical: 20 }} />
          ) : txRows.length === 0 ? (
            <Text style={s.emptyText}>No manual transactions yet</Text>
          ) : (
            <>
              {/* Table Header */}
              <View style={[s.tableRow, s.tableHeader]}>
                {["Admin", "User ID", "Action", "Amount", "Asset", "Reason", "Date"].map((h) => (
                  <Text key={h} style={[s.tableCell, s.tableHeaderCell, h === "Reason" && { flex: 2 }]}>{h}</Text>
                ))}
              </View>
              {txRows.map((tx) => (
                <View key={tx.id} style={[s.tableRow, s.tableDataRow]}>
                  <Text style={s.tableCell}>{tx.admin_name ?? "Admin"}</Text>
                  <Text style={[s.tableCell, { color: "#999" }]}>{tx.user_id.slice(0, 8)}…</Text>
                  <Text style={[s.tableCell, { color: tx.type.includes("credit") || tx.type === "referral_bonus" ? GREEN : RED }]}>
                    {tx.type.includes("debit") ? "Deduct" : "Add"}
                  </Text>
                  <Text style={[s.tableCell, { color: GOLD }]}>{Number(tx.amount).toLocaleString()}</Text>
                  <Text style={s.tableCell}>{tx.asset_type}</Text>
                  <Text style={[s.tableCell, { flex: 2, color: "#ccc" }]} numberOfLines={1}>{tx.reason}</Text>
                  <Text style={[s.tableCell, { color: "#666" }]}>{new Date(tx.created_at).toLocaleDateString()}</Text>
                </View>
              ))}

              {/* Pagination */}
              <View style={s.pageRow}>
                <TouchableOpacity style={s.pageBtn} onPress={() => loadTransactions(Math.max(txPage - 1, 1))} disabled={txPage <= 1} activeOpacity={0.8}>
                  <Feather name="chevron-left" size={14} color={txPage <= 1 ? "#333" : GOLD} />
                </TouchableOpacity>
                <Text style={s.pageText}>{txPage} / {txTotalPages}</Text>
                <TouchableOpacity style={s.pageBtn} onPress={() => loadTransactions(Math.min(txPage + 1, txTotalPages))} disabled={txPage >= txTotalPages} activeOpacity={0.8}>
                  <Feather name="chevron-right" size={14} color={txPage >= txTotalPages ? "#333" : GOLD} />
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal visible={showConfirm} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Feather name="alert-triangle" size={32} color={GOLD} style={{ marginBottom: 14 }} />
            <Text style={s.modalTitle}>Confirm Transaction</Text>
            <Text style={s.modalBody}>
              Are you sure you want to {action === "add" ? "Add" : "Deduct"}{" "}
              <Text style={{ color: GOLD, fontFamily: "Inter_700Bold" }}>
                {Number(amount).toLocaleString()} {assetType}
              </Text>{" "}
              {action === "add" ? "to" : "from"}{" "}
              <Text style={{ color: GOLD, fontFamily: "Inter_700Bold" }}>{selected?.name}</Text>?
            </Text>
            <Text style={[s.modalBody, { color: "#888", marginTop: 6 }]}>Reason: {reason}</Text>
            <View style={s.modalBtnRow}>
              <TouchableOpacity style={s.modalCancelBtn} onPress={() => setShowConfirm(false)} activeOpacity={0.8}>
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalConfirmBtn} onPress={executeTransaction} activeOpacity={0.8} disabled={executing}>
                {executing ? <ActivityIndicator color={BG} size="small" /> : <Text style={s.modalConfirmText}>Confirm</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, flexDirection: "row", backgroundColor: BG },
  main: { flex: 1 },
  mainContent: { padding: 20, gap: 16, paddingBottom: 60 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  title: { color: GOLD, fontSize: 22, fontFamily: "Inter_700Bold" },
  subtitle: { color: "#666", fontSize: 12 },
  card: { backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 18, gap: 12 },
  sectionLabel: { color: GOLD, fontSize: 13, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  searchRow: { flexDirection: "row", gap: 10 },
  searchInput: { flex: 1, backgroundColor: "#111", borderRadius: 10, borderWidth: 1, borderColor: BORDER, color: "#fff", paddingHorizontal: 14, paddingVertical: 10, fontSize: 13 },
  searchBtn: { backgroundColor: GOLD, borderRadius: 10, paddingHorizontal: 16, justifyContent: "center", alignItems: "center" },
  resultsList: { gap: 6 },
  resultRow: { flexDirection: "row", alignItems: "center", padding: 11, borderRadius: 10, borderWidth: 1, borderColor: BORDER, backgroundColor: "#111" },
  resultRowActive: { backgroundColor: GOLD, borderColor: GOLD },
  resultName: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  resultPhone: { color: "#666", fontSize: 11, marginTop: 1 },
  resultBal: { color: GOLD, fontSize: 12, fontFamily: "Inter_600SemiBold" },
  balanceRow: { flexDirection: "row", gap: 12 },
  balCard: { backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 18, alignItems: "center", gap: 6 },
  balLabel: { color: "#888", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 },
  balAmount: { color: GOLD, fontSize: 20, fontFamily: "Inter_700Bold" },
  fieldLabel: { color: "#888", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.8 },
  toggleRow: { flexDirection: "row", gap: 10 },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: BORDER, alignItems: "center" },
  toggleBtnActive: { backgroundColor: GOLD, borderColor: GOLD },
  toggleText: { color: "#ccc", fontSize: 13, fontFamily: "Inter_500Medium" },
  toggleTextActive: { color: BG, fontFamily: "Inter_700Bold" },
  input: { backgroundColor: "#111", borderRadius: 10, borderWidth: 1, borderColor: BORDER, color: "#fff", paddingHorizontal: 14, paddingVertical: 10, fontSize: 13 },
  execMsg: { fontSize: 13, fontFamily: "Inter_500Medium" },
  executeBtn: { backgroundColor: GOLD, borderRadius: 12, paddingVertical: 13, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 4 },
  executeBtnDisabled: { opacity: 0.35 },
  executeBtnText: { color: BG, fontSize: 14, fontFamily: "Inter_700Bold" },
  emptyText: { color: "#444", fontSize: 13, textAlign: "center", paddingVertical: 20 },
  tableRow: { flexDirection: "row", alignItems: "center" },
  tableHeader: { borderBottomWidth: 1, borderBottomColor: BORDER, paddingBottom: 8, marginBottom: 4 },
  tableHeaderCell: { color: "#666", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.6 },
  tableDataRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)" },
  tableCell: { flex: 1, color: "#ddd", fontSize: 11, fontFamily: "Inter_400Regular" },
  pageRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 12 },
  pageBtn: { padding: 6 },
  pageText: { color: "#666", fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center" },
  modalCard: { backgroundColor: "#111", borderRadius: 20, borderWidth: 1, borderColor: BORDER, padding: 28, width: 320, alignItems: "center" },
  modalTitle: { color: GOLD, fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 10 },
  modalBody: { color: "#ccc", fontSize: 14, textAlign: "center", lineHeight: 22 },
  modalBtnRow: { flexDirection: "row", gap: 12, marginTop: 22 },
  modalCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: BORDER, alignItems: "center" },
  modalCancelText: { color: "#888", fontSize: 13 },
  modalConfirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: GOLD, alignItems: "center" },
  modalConfirmText: { color: BG, fontSize: 13, fontFamily: "Inter_700Bold" },
});
