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
const AMBER = "#FFA500";

type ReferralRow = {
  id: string;
  referrer_id: string;
  referee_id: string;
  referrer_name: string;
  referrer_phone: string;
  referee_name: string;
  referee_phone: string;
  created_at: string;
  reward_status: string;
  reward_paid_at: string | null;
  referee_first_ride_completed: boolean;
  potential_fraud: boolean;
  referee_device_id: string | null;
  referrer_device_id: string | null;
};

const USD_TO_PKR = 290;
const REWARD_PKR = 100 * USD_TO_PKR;

export default function ReferralsScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 16 : insets.top;

  const [rows, setRows] = useState<ReferralRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [approving, setApproving] = useState<string | null>(null);
  const [confirmRow, setConfirmRow] = useState<ReferralRow | null>(null);
  const [resultMsg, setResultMsg] = useState<{ id: string; msg: string; ok: boolean } | null>(null);

  const load = useCallback(async (pg = 1, s = search) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(pg) });
      if (s.trim()) params.set("search", s.trim());
      const r = await fetch(`${API_BASE}/api/otc/admin/referrals?${params}`);
      const d = await r.json();
      setRows(d.items ?? []);
      setTotalPages(d.totalPages ?? 1);
      setPage(pg);
    } catch { setRows([]); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(1); }, []);

  const handleSearch = () => load(1, search);

  const approveReward = async (row: ReferralRow) => {
    setApproving(row.id);
    setResultMsg(null);
    try {
      const r = await fetch(`${API_BASE}/api/otc/admin/referrals/${row.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reward_pkr: REWARD_PKR }),
      });
      const d = await r.json();
      if (r.ok) {
        setResultMsg({ id: row.id, msg: `✓ Rs ${d.credited?.toLocaleString()} credited to ${row.referrer_name}`, ok: true });
        load(page);
      } else {
        setResultMsg({ id: row.id, msg: `Error: ${d.error}`, ok: false });
      }
    } catch { setResultMsg({ id: row.id, msg: "Network error", ok: false }); }
    finally { setApproving(null); setConfirmRow(null); }
  };

  const statusColor = (s: string) => {
    if (s === "paid") return GREEN;
    if (s === "pending") return AMBER;
    return "#666";
  };

  return (
    <View style={[st.root, { paddingTop: topPad }]}>
      <AdminSidebar activeKey="referrals" topPad={topPad} />

      <ScrollView style={st.main} contentContainerStyle={st.mainContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={st.header}>
          <View style={st.headerIcon}>
            <Feather name="gift" size={22} color={BG} />
          </View>
          <View style={{ marginLeft: 12 }}>
            <Text style={st.title}>Referral Management</Text>
            <Text style={st.subtitle}>Track referrals, approve $100 rewards, detect fraud</Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={st.statsRow}>
          {[
            { label: "Total Referrals", key: "total", color: GOLD },
            { label: "Pending Reward", key: "pending", color: AMBER },
            { label: "Rewards Paid", key: "paid", color: GREEN },
            { label: "Fraud Flags", key: "fraud", color: RED },
          ].map(({ label, key, color }) => {
            const count = key === "total"
              ? rows.length
              : key === "fraud"
              ? rows.filter((r) => r.potential_fraud).length
              : rows.filter((r) => r.reward_status === key).length;
            return (
              <View key={key} style={[st.statCard, { borderColor: color + "30" }]}>
                <Text style={[st.statNum, { color }]}>{count}</Text>
                <Text style={st.statLabel}>{label}</Text>
              </View>
            );
          })}
        </View>

        {/* Search */}
        <View style={st.card}>
          <Text style={st.sectionLabel}>Referral Tracking Table</Text>
          <View style={st.searchRow}>
            <TextInput
              style={st.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search by referrer name or ID…"
              placeholderTextColor="#444"
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            <TouchableOpacity style={st.searchBtn} onPress={handleSearch} activeOpacity={0.8}>
              <Feather name="search" size={15} color={BG} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={GOLD} style={{ marginVertical: 24 }} />
          ) : rows.length === 0 ? (
            <Text style={st.emptyText}>No referrals found</Text>
          ) : (
            <>
              {/* Table Header */}
              <View style={[st.tableRow, st.tableHeader]}>
                {["Referrer", "Referee", "Joined", "1st Ride", "Reward", "Action"].map((h) => (
                  <Text key={h} style={[st.cell, st.hCell]}>{h}</Text>
                ))}
              </View>

              {rows.map((row) => (
                <View key={row.id} style={st.tableDataRow}>
                  <View style={st.tableRow}>
                    {/* Referrer */}
                    <View style={[st.cell, { flexDirection: "column" }]}>
                      <Text style={st.cellName}>{row.referrer_name}</Text>
                      <Text style={st.cellSub}>{row.referrer_phone}</Text>
                    </View>
                    {/* Referee */}
                    <View style={[st.cell, { flexDirection: "column" }]}>
                      <Text style={st.cellName}>{row.referee_name}</Text>
                      <Text style={st.cellSub}>{row.referee_phone}</Text>
                    </View>
                    {/* Join Date */}
                    <Text style={[st.cell, { color: "#777", fontSize: 11 }]}>
                      {new Date(row.created_at).toLocaleDateString()}
                    </Text>
                    {/* First Ride */}
                    <View style={st.cell}>
                      <View style={[st.badge, { backgroundColor: row.referee_first_ride_completed ? GREEN + "22" : "#1a1a1a", borderColor: row.referee_first_ride_completed ? GREEN + "55" : BORDER }]}>
                        <Feather name={row.referee_first_ride_completed ? "check-circle" : "clock"} size={11} color={row.referee_first_ride_completed ? GREEN : "#666"} />
                        <Text style={[st.badgeText, { color: row.referee_first_ride_completed ? GREEN : "#666" }]}>
                          {row.referee_first_ride_completed ? "Done" : "Pending"}
                        </Text>
                      </View>
                    </View>
                    {/* Reward Status */}
                    <View style={st.cell}>
                      <View style={[st.badge, { backgroundColor: statusColor(row.reward_status) + "22", borderColor: statusColor(row.reward_status) + "55" }]}>
                        <Text style={[st.badgeText, { color: statusColor(row.reward_status), textTransform: "capitalize" }]}>
                          {row.reward_status}
                        </Text>
                      </View>
                    </View>
                    {/* Action */}
                    <View style={st.cell}>
                      {row.reward_status === "paid" ? (
                        <Feather name="check-circle" size={16} color={GREEN} />
                      ) : row.referee_first_ride_completed ? (
                        <TouchableOpacity
                          style={st.approveBtn}
                          onPress={() => setConfirmRow(row)}
                          activeOpacity={0.8}
                          disabled={approving === row.id}
                        >
                          {approving === row.id
                            ? <ActivityIndicator color={BG} size="small" />
                            : <Text style={st.approveBtnText}>Approve $100</Text>}
                        </TouchableOpacity>
                      ) : (
                        <Text style={{ color: "#444", fontSize: 11 }}>Awaiting ride</Text>
                      )}
                    </View>
                  </View>

                  {/* Result Message */}
                  {resultMsg?.id === row.id && (
                    <Text style={[st.resultMsg, { color: resultMsg.ok ? GREEN : RED }]}>{resultMsg.msg}</Text>
                  )}

                  {/* Fraud Warning */}
                  {row.potential_fraud && (
                    <View style={st.fraudBanner}>
                      <Feather name="alert-triangle" size={13} color={RED} />
                      <Text style={st.fraudText}>
                        Potential Fraud — Same device ID detected (Referrer: {row.referrer_device_id?.slice(0, 12)}… / Referee: {row.referee_device_id?.slice(0, 12)}…)
                      </Text>
                    </View>
                  )}
                </View>
              ))}

              {/* Pagination */}
              <View style={st.pageRow}>
                <TouchableOpacity style={st.pageBtn} onPress={() => load(Math.max(page - 1, 1))} disabled={page <= 1} activeOpacity={0.8}>
                  <Feather name="chevron-left" size={14} color={page <= 1 ? "#333" : GOLD} />
                </TouchableOpacity>
                <Text style={st.pageText}>{page} / {totalPages}</Text>
                <TouchableOpacity style={st.pageBtn} onPress={() => load(Math.min(page + 1, totalPages))} disabled={page >= totalPages} activeOpacity={0.8}>
                  <Feather name="chevron-right" size={14} color={page >= totalPages ? "#333" : GOLD} />
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {/* Reward Info Card */}
        <View style={[st.card, { borderColor: GOLD + "40" }]}>
          <View style={st.infoRow}>
            <Feather name="info" size={16} color={GOLD} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[st.sectionLabel, { marginBottom: 4 }]}>Reward Policy</Text>
              <Text style={st.infoText}>$100 USD = Rs {REWARD_PKR.toLocaleString()} PKR at current rate (1 USD ≈ {USD_TO_PKR} PKR). Reward is credited only after the referee completes their first ride. All rewards are logged as 'Referral Bonus' in the transaction ledger.</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Approve Confirmation Modal */}
      <Modal visible={!!confirmRow} transparent animationType="fade">
        <View style={st.modalOverlay}>
          <View style={st.modalCard}>
            <View style={[st.headerIcon, { marginBottom: 16 }]}>
              <Feather name="gift" size={28} color={BG} />
            </View>
            <Text style={st.modalTitle}>Approve $100 Reward</Text>
            <Text style={st.modalBody}>
              Credit <Text style={{ color: GOLD, fontFamily: "Inter_700Bold" }}>Rs {REWARD_PKR.toLocaleString()}</Text> to{" "}
              <Text style={{ color: GOLD, fontFamily: "Inter_700Bold" }}>{confirmRow?.referrer_name}</Text> for referring{" "}
              {confirmRow?.referee_name}?
            </Text>
            {confirmRow?.potential_fraud && (
              <View style={[st.fraudBanner, { marginTop: 12 }]}>
                <Feather name="alert-triangle" size={13} color={RED} />
                <Text style={st.fraudText}>Warning: Same device ID detected — possible fraud!</Text>
              </View>
            )}
            <View style={st.modalBtnRow}>
              <TouchableOpacity style={st.modalCancelBtn} onPress={() => setConfirmRow(null)} activeOpacity={0.8}>
                <Text style={st.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={st.modalConfirmBtn}
                onPress={() => confirmRow && approveReward(confirmRow)}
                activeOpacity={0.8}
                disabled={!!approving}
              >
                {approving
                  ? <ActivityIndicator color={BG} size="small" />
                  : <Text style={st.modalConfirmText}>Confirm & Pay</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, flexDirection: "row", backgroundColor: BG },
  main: { flex: 1 },
  mainContent: { padding: 20, gap: 16, paddingBottom: 60 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  headerIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: GOLD, justifyContent: "center", alignItems: "center" },
  title: { color: GOLD, fontSize: 22, fontFamily: "Inter_700Bold" },
  subtitle: { color: "#666", fontSize: 12 },
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: { flex: 1, backgroundColor: CARD, borderRadius: 14, borderWidth: 1, padding: 14, alignItems: "center", gap: 4 },
  statNum: { fontSize: 22, fontFamily: "Inter_700Bold" },
  statLabel: { color: "#666", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8, textAlign: "center" },
  card: { backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 18, gap: 12 },
  sectionLabel: { color: GOLD, fontSize: 13, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
  searchRow: { flexDirection: "row", gap: 10 },
  searchInput: { flex: 1, backgroundColor: "#111", borderRadius: 10, borderWidth: 1, borderColor: BORDER, color: "#fff", paddingHorizontal: 14, paddingVertical: 10, fontSize: 13 },
  searchBtn: { backgroundColor: GOLD, borderRadius: 10, paddingHorizontal: 16, justifyContent: "center", alignItems: "center" },
  emptyText: { color: "#444", fontSize: 13, textAlign: "center", paddingVertical: 20 },
  tableRow: { flexDirection: "row", alignItems: "center" },
  tableHeader: { borderBottomWidth: 1, borderBottomColor: BORDER, paddingBottom: 8, marginBottom: 2 },
  hCell: { color: "#666", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.6, fontFamily: "Inter_600SemiBold" },
  tableDataRow: { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)", paddingVertical: 10 },
  cell: { flex: 1, paddingRight: 6 },
  cellName: { color: "#ddd", fontSize: 12, fontFamily: "Inter_500Medium" },
  cellSub: { color: "#555", fontSize: 10, marginTop: 1 },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3, alignSelf: "flex-start" },
  badgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  approveBtn: { backgroundColor: GOLD, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  approveBtnText: { color: BG, fontSize: 11, fontFamily: "Inter_700Bold" },
  fraudBanner: { flexDirection: "row", alignItems: "flex-start", gap: 7, backgroundColor: RED + "15", borderWidth: 1, borderColor: RED + "40", borderRadius: 8, padding: 8, marginTop: 6 },
  fraudText: { color: RED, fontSize: 11, flex: 1, lineHeight: 16 },
  resultMsg: { fontSize: 12, marginTop: 4, fontFamily: "Inter_500Medium" },
  pageRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 12 },
  pageBtn: { padding: 6 },
  pageText: { color: "#666", fontSize: 12 },
  infoRow: { flexDirection: "row", alignItems: "flex-start" },
  infoText: { color: "#888", fontSize: 12, lineHeight: 18 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center" },
  modalCard: { backgroundColor: "#111", borderRadius: 20, borderWidth: 1, borderColor: BORDER, padding: 28, width: 340, alignItems: "center" },
  modalTitle: { color: GOLD, fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 10 },
  modalBody: { color: "#ccc", fontSize: 14, textAlign: "center", lineHeight: 22 },
  modalBtnRow: { flexDirection: "row", gap: 12, marginTop: 22 },
  modalCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: BORDER, alignItems: "center" },
  modalCancelText: { color: "#888", fontSize: 13 },
  modalConfirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: GOLD, alignItems: "center" },
  modalConfirmText: { color: BG, fontSize: 13, fontFamily: "Inter_700Bold" },
});
