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
import { AdminSidebar } from "./index";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

const GOLD = "#FFD700";
const GOLD_DIM = "rgba(255,215,0,0.18)";
const BG = "#050505";
const RED = "#E53935";
const RED_DIM = "rgba(229,57,53,0.15)";
const GREEN = "#43A047";
const BLUE = "#1E88E5";
const ORANGE = "#FB8C00";

type RideItem = {
  id: string;
  user_id: string;
  driver_id: string | null;
  user_name: string;
  user_phone: string;
  driver_name: string;
  driver_phone: string;
  pickup_address: string;
  dropoff_address: string;
  total_fare: number;
  distance_km: number;
  ride_type: string;
  payment_method: string;
  status: string;
  created_at: string | null;
  updated_at: string | null;
  admin_cancellation_reason: string | null;
};

type StatusConfig = { label: string; color: string; bg: string; emoji: string };

const STATUS_MAP: Record<string, StatusConfig> = {
  searching: { label: "Searching", color: ORANGE, bg: "rgba(251,140,0,0.15)", emoji: "🟠" },
  assigned:  { label: "Assigned",  color: BLUE,   bg: "rgba(30,136,229,0.15)", emoji: "🔵" },
  arrived:   { label: "Arrived",   color: BLUE,   bg: "rgba(30,136,229,0.15)", emoji: "🔵" },
  ongoing:   { label: "Ongoing",   color: BLUE,   bg: "rgba(30,136,229,0.15)", emoji: "🔵" },
  completed: { label: "Completed", color: GREEN,  bg: "rgba(67,160,71,0.15)",  emoji: "🟢" },
  cancelled: { label: "Cancelled", color: RED,    bg: RED_DIM,                emoji: "🔴" },
};

function getStatus(s: string): StatusConfig {
  return STATUS_MAP[s.toLowerCase()] ?? { label: s, color: "#888", bg: "rgba(255,255,255,0.06)", emoji: "⚪" };
}

const STATUS_FILTERS = ["all", "Searching", "Assigned", "arrived", "ongoing", "completed", "Cancelled"];
const OVERRIDE_OPTIONS = ["Searching", "Assigned", "arrived", "ongoing", "completed", "Cancelled"];

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-PK", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function RideManagementScreen() {
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === "web" ? 60 : 14);

  const [rides, setRides] = useState<RideItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [selectedRide, setSelectedRide] = useState<RideItem | null>(null);
  const [overrideMode, setOverrideMode] = useState(false);
  const [overrideStatus, setOverrideStatus] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async (p: number, q: string, sf: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), search: q, status: sf });
      const res = await fetch(`${API_BASE}/api/otc/admin/rides?${params}`);
      const json = await res.json() as { items?: RideItem[]; totalPages?: number; total?: number };
      setRides(json.items ?? []);
      setTotalPages(json.totalPages ?? 1);
      setTotal(json.total ?? 0);
    } catch {
      setRides([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(page, search, statusFilter); }, [page, statusFilter]);

  const handleSearch = () => { setPage(1); load(1, search, statusFilter); };

  const handleOverride = async () => {
    if (!selectedRide || !overrideStatus) return;
    if (overrideStatus === "Cancelled" && !cancelReason.trim()) return;
    setActionLoading(true);
    setActionMsg(null);
    try {
      const res = await fetch(`${API_BASE}/api/otc/admin/rides/${selectedRide.id}/override`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: overrideStatus, cancellation_reason: cancelReason.trim() || undefined }),
      });
      const json = await res.json() as { ok?: boolean; error?: string };
      if (json.ok) {
        setActionMsg({ type: "success", text: `Ride status overridden to "${overrideStatus}".` });
        setRides((prev) => prev.map((r) => r.id === selectedRide.id ? { ...r, status: overrideStatus, admin_cancellation_reason: cancelReason.trim() || r.admin_cancellation_reason } : r));
        setSelectedRide((prev) => prev ? { ...prev, status: overrideStatus } : null);
        setTimeout(() => { setOverrideMode(false); setCancelReason(""); setOverrideStatus(""); setActionMsg(null); }, 1600);
      } else {
        setActionMsg({ type: "error", text: json.error ?? "Override failed" });
      }
    } catch {
      setActionMsg({ type: "error", text: "Network error" });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <AdminSidebar activeKey="rides" topPad={topPad} />

      <View style={[styles.main, { paddingTop: topPad }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.kicker}>Operations Command</Text>
            <Text style={styles.title}>Global Ride Ledger</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{total} total rides</Text>
          </View>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Feather name="search" size={14} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search address or ride ID…"
              placeholderTextColor="#555"
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
          </View>
          <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
            <Text style={styles.searchBtnText}>Search</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {STATUS_FILTERS.map((sf) => {
            const active = statusFilter === sf;
            const cfg = sf === "all" ? null : getStatus(sf);
            return (
              <TouchableOpacity
                key={sf}
                style={[styles.filterChip, active && (cfg ? { backgroundColor: cfg.bg, borderColor: cfg.color + "55" } : styles.filterChipActive)]}
                onPress={() => { setStatusFilter(sf); setPage(1); }}
                activeOpacity={0.8}
              >
                {cfg && <Text>{cfg.emoji} </Text>}
                <Text style={[styles.filterChipText, active && (cfg ? { color: cfg.color } : { color: GOLD })]}>
                  {sf === "all" ? "All" : getStatus(sf).label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {loading ? (
          <View style={styles.center}><ActivityIndicator color={GOLD} size="large" /></View>
        ) : rides.length === 0 ? (
          <View style={styles.center}>
            <Feather name="map" size={40} color="#333" />
            <Text style={styles.emptyText}>No rides found</Text>
          </View>
        ) : (
          <ScrollView style={styles.tableScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.tableHeader}>
              {["ID", "User", "Driver", "Type", "Fare", "Status", "Time", ""].map((h) => (
                <Text key={h} style={styles.th}>{h}</Text>
              ))}
            </View>
            {rides.map((r) => {
              const sc = getStatus(r.status);
              return (
                <TouchableOpacity key={r.id} style={styles.tableRow} onPress={() => { setSelectedRide(r); setOverrideMode(false); setCancelReason(""); setOverrideStatus(""); setActionMsg(null); }} activeOpacity={0.75}>
                  <Text style={styles.tdId}>{r.id.slice(0, 8)}…</Text>
                  <View style={styles.td}>
                    <Text style={styles.tdMain}>{r.user_name}</Text>
                  </View>
                  <View style={styles.td}>
                    <Text style={styles.tdMain}>{r.driver_name}</Text>
                  </View>
                  <Text style={styles.tdText}>{r.ride_type}</Text>
                  <Text style={[styles.tdText, { color: GOLD }]}>PKR {Number(r.total_fare).toLocaleString()}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: sc.bg, borderColor: sc.color + "44" }]}>
                    <Text style={[styles.statusText, { color: sc.color }]}>{sc.emoji} {sc.label}</Text>
                  </View>
                  <Text style={styles.tdTime}>{fmtDate(r.created_at)}</Text>
                  <TouchableOpacity style={styles.detailBtn} onPress={() => { setSelectedRide(r); setOverrideMode(false); setCancelReason(""); setOverrideStatus(""); setActionMsg(null); }}>
                    <Feather name="eye" size={14} color={GOLD} />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}

            <View style={styles.pagination}>
              <TouchableOpacity style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]} onPress={() => page > 1 && setPage((p) => p - 1)} disabled={page <= 1}>
                <Feather name="chevron-left" size={16} color={page <= 1 ? "#333" : GOLD} />
              </TouchableOpacity>
              <Text style={styles.pageText}>Page {page} of {totalPages}</Text>
              <TouchableOpacity style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]} onPress={() => page < totalPages && setPage((p) => p + 1)} disabled={page >= totalPages}>
                <Feather name="chevron-right" size={16} color={page >= totalPages ? "#333" : GOLD} />
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </View>

      {selectedRide && (
        <Modal visible animationType="slide" transparent onRequestClose={() => setSelectedRide(null)}>
          <View style={modal.overlay}>
            <View style={modal.sheet}>
              <View style={modal.header}>
                <View style={{ flex: 1 }}>
                  <Text style={modal.rideId}>Ride #{selectedRide.id.slice(0, 12)}…</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
                    {(() => { const sc = getStatus(selectedRide.status); return (
                      <View style={[modal.statusBadge, { backgroundColor: sc.bg, borderColor: sc.color + "55" }]}>
                        <Text style={[modal.statusText, { color: sc.color }]}>{sc.emoji} {sc.label}</Text>
                      </View>
                    ); })()}
                    <Text style={modal.rideSub}>{fmtDate(selectedRide.created_at)}</Text>
                  </View>
                </View>
                <TouchableOpacity style={modal.closeBtn} onPress={() => setSelectedRide(null)}>
                  <Feather name="x" size={18} color="#FFF" />
                </TouchableOpacity>
              </View>

              <ScrollView style={modal.body} showsVerticalScrollIndicator={false}>
                <View style={modal.section}>
                  <Text style={modal.sectionLabel}>Journey Details</Text>
                  <View style={modal.journeyCard}>
                    <View style={modal.journeyRow}>
                      <View style={[modal.dot, { backgroundColor: GREEN }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={modal.journeyPre}>Pickup</Text>
                        <Text style={modal.journeyAddr}>{selectedRide.pickup_address}</Text>
                      </View>
                    </View>
                    <View style={modal.journeyLine} />
                    <View style={modal.journeyRow}>
                      <View style={[modal.dot, { backgroundColor: RED }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={modal.journeyPre}>Drop-off</Text>
                        <Text style={modal.journeyAddr}>{selectedRide.dropoff_address}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={modal.section}>
                  <Text style={modal.sectionLabel}>Fare & Service</Text>
                  <View style={modal.infoGrid}>
                    <View style={modal.infoCell}>
                      <Text style={modal.infoPre}>Total Fare</Text>
                      <Text style={[modal.infoVal, { color: GOLD }]}>PKR {Number(selectedRide.total_fare).toLocaleString()}</Text>
                    </View>
                    <View style={modal.infoCell}>
                      <Text style={modal.infoPre}>Distance</Text>
                      <Text style={modal.infoVal}>{selectedRide.distance_km} km</Text>
                    </View>
                    <View style={modal.infoCell}>
                      <Text style={modal.infoPre}>Service</Text>
                      <Text style={modal.infoVal}>{selectedRide.ride_type}</Text>
                    </View>
                    <View style={modal.infoCell}>
                      <Text style={modal.infoPre}>Payment</Text>
                      <Text style={modal.infoVal}>{selectedRide.payment_method}</Text>
                    </View>
                  </View>
                </View>

                <View style={modal.section}>
                  <Text style={modal.sectionLabel}>Parties</Text>
                  <View style={modal.partiesRow}>
                    <View style={modal.partyCard}>
                      <Feather name="user" size={16} color={GOLD} />
                      <Text style={modal.partyRole}>Passenger</Text>
                      <Text style={modal.partyName}>{selectedRide.user_name}</Text>
                      <Text style={modal.partyPhone}>{selectedRide.user_phone}</Text>
                    </View>
                    <View style={modal.partyCard}>
                      <Feather name="navigation-2" size={16} color={GOLD} />
                      <Text style={modal.partyRole}>Driver</Text>
                      <Text style={modal.partyName}>{selectedRide.driver_name}</Text>
                      <Text style={modal.partyPhone}>{selectedRide.driver_phone}</Text>
                    </View>
                  </View>
                </View>

                {selectedRide.admin_cancellation_reason && (
                  <View style={modal.auditBox}>
                    <Feather name="alert-triangle" size={13} color={RED} />
                    <Text style={modal.auditText}>Admin note: {selectedRide.admin_cancellation_reason}</Text>
                  </View>
                )}

                {actionMsg && (
                  <View style={[modal.msgBox, actionMsg.type === "success" ? modal.msgSuccess : modal.msgError]}>
                    <Feather name={actionMsg.type === "success" ? "check-circle" : "alert-circle"} size={14} color={actionMsg.type === "success" ? GREEN : RED} />
                    <Text style={[modal.msgText, { color: actionMsg.type === "success" ? GREEN : RED }]}>{actionMsg.text}</Text>
                  </View>
                )}

                {!overrideMode ? (
                  <TouchableOpacity style={modal.overrideBtn} onPress={() => { setOverrideMode(true); setOverrideStatus(selectedRide.status); }}>
                    <Feather name="edit-2" size={15} color={BG} />
                    <Text style={modal.overrideBtnText}>Override Status</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={modal.overrideBox}>
                    <Text style={modal.overrideBoxLabel}>Set New Status</Text>
                    <View style={modal.overrideOptions}>
                      {OVERRIDE_OPTIONS.map((opt) => {
                        const sc = getStatus(opt);
                        const active = overrideStatus === opt;
                        return (
                          <TouchableOpacity
                            key={opt}
                            style={[modal.overrideOpt, active && { backgroundColor: sc.bg, borderColor: sc.color + "55" }]}
                            onPress={() => setOverrideStatus(opt)}
                          >
                            <Text style={[modal.overrideOptText, active && { color: sc.color }]}>{sc.emoji} {sc.label}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {overrideStatus === "Cancelled" && (
                      <TextInput
                        style={modal.cancelInput}
                        placeholder="Cancellation reason (required)…"
                        placeholderTextColor="#555"
                        value={cancelReason}
                        onChangeText={setCancelReason}
                        multiline
                        numberOfLines={2}
                      />
                    )}

                    <View style={modal.overrideBtnRow}>
                      <TouchableOpacity style={modal.cancelOverrideBtn} onPress={() => { setOverrideMode(false); setCancelReason(""); }}>
                        <Text style={modal.cancelOverrideText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[modal.confirmOverrideBtn, (actionLoading || (overrideStatus === "Cancelled" && !cancelReason.trim())) && modal.btnDisabled]}
                        onPress={handleOverride}
                        disabled={actionLoading || (overrideStatus === "Cancelled" && !cancelReason.trim())}
                      >
                        {actionLoading ? <ActivityIndicator size="small" color={BG} /> : <Text style={modal.confirmOverrideText}>Apply Override</Text>}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: "row", backgroundColor: BG },
  main: { flex: 1, paddingHorizontal: 20 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  kicker: { color: GOLD, fontSize: 10, letterSpacing: 2, textTransform: "uppercase" },
  title: { color: "#FFF", fontSize: 24, fontFamily: "Inter_700Bold" },
  badge: { backgroundColor: GOLD_DIM, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: GOLD_DIM },
  badgeText: { color: GOLD, fontSize: 12, fontFamily: "Inter_700Bold" },
  searchRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  searchBox: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,215,0,0.10)", borderRadius: 10, paddingHorizontal: 12, height: 40 },
  searchInput: { flex: 1, color: "#FFF", fontSize: 13 },
  searchBtn: { backgroundColor: GOLD, borderRadius: 10, paddingHorizontal: 16, height: 40, justifyContent: "center" },
  searchBtnText: { color: BG, fontFamily: "Inter_700Bold", fontSize: 13 },
  filterRow: { marginBottom: 14, flexGrow: 0 },
  filterChip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: "#222", marginRight: 8, backgroundColor: "rgba(255,255,255,0.03)" },
  filterChipActive: { backgroundColor: GOLD_DIM, borderColor: GOLD_DIM },
  filterChipText: { color: "#888", fontSize: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyText: { color: "#555", fontSize: 14 },
  tableScroll: { flex: 1 },
  tableHeader: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(255,215,0,0.10)" },
  th: { flex: 1, color: "#555", fontSize: 9, textTransform: "uppercase", letterSpacing: 1 },
  tableRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)", gap: 4 },
  tdId: { width: 80, color: "#666", fontSize: 10, fontFamily: "Inter_500Medium" },
  td: { flex: 1 },
  tdMain: { color: "#FFF", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  tdText: { flex: 1, color: "#CCC", fontSize: 11 },
  tdTime: { flex: 1, color: "#666", fontSize: 10 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  statusText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  detailBtn: { width: 30, height: 30, borderRadius: 8, borderWidth: 1, borderColor: GOLD_DIM, alignItems: "center", justifyContent: "center" },
  pagination: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 16, paddingVertical: 20 },
  pageBtn: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: "rgba(255,215,0,0.2)", alignItems: "center", justifyContent: "center" },
  pageBtnDisabled: { borderColor: "#222" },
  pageText: { color: "#888", fontSize: 12 },
});

const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#0A0A0A", borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: "rgba(255,215,0,0.15)", maxHeight: "92%" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", padding: 20, borderBottomWidth: 1, borderBottomColor: "rgba(255,215,0,0.10)" },
  rideId: { color: "#FFF", fontSize: 18, fontFamily: "Inter_700Bold" },
  rideSub: { color: "#666", fontSize: 11 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3, borderWidth: 1 },
  statusText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center" },
  body: { padding: 20 },
  section: { marginBottom: 18 },
  sectionLabel: { color: GOLD, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, marginBottom: 10 },
  journeyCard: { backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,215,0,0.10)", padding: 14, gap: 4 },
  journeyRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  journeyLine: { width: 2, height: 16, backgroundColor: "rgba(255,255,255,0.10)", marginLeft: 4, marginVertical: 4 },
  journeyPre: { color: "#666", fontSize: 10, textTransform: "uppercase", letterSpacing: 1 },
  journeyAddr: { color: "#FFF", fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 2 },
  infoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  infoCell: { width: "48%", backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", padding: 12 },
  infoPre: { color: "#666", fontSize: 10, textTransform: "uppercase", letterSpacing: 1 },
  infoVal: { color: "#FFF", fontSize: 15, fontFamily: "Inter_700Bold", marginTop: 4 },
  partiesRow: { flexDirection: "row", gap: 12 },
  partyCard: { flex: 1, backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,215,0,0.10)", padding: 14, gap: 4 },
  partyRole: { color: GOLD, fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginTop: 6 },
  partyName: { color: "#FFF", fontSize: 14, fontFamily: "Inter_700Bold" },
  partyPhone: { color: "#888", fontSize: 12 },
  auditBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(229,57,53,0.08)", borderRadius: 10, borderWidth: 1, borderColor: "rgba(229,57,53,0.2)", padding: 12, marginBottom: 14 },
  auditText: { color: "#E57373", fontSize: 12, flex: 1 },
  msgBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, marginBottom: 14 },
  msgSuccess: { backgroundColor: "rgba(67,160,71,0.15)" },
  msgError: { backgroundColor: RED_DIM },
  msgText: { fontSize: 13, flex: 1 },
  overrideBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: GOLD, borderRadius: 12, paddingVertical: 14, marginBottom: 8 },
  overrideBtnText: { color: BG, fontFamily: "Inter_700Bold", fontSize: 14 },
  overrideBox: { backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,215,0,0.15)", padding: 14, gap: 12, marginBottom: 8 },
  overrideBoxLabel: { color: GOLD, fontSize: 10, textTransform: "uppercase", letterSpacing: 2 },
  overrideOptions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  overrideOpt: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: "#333", backgroundColor: "rgba(255,255,255,0.03)" },
  overrideOptText: { color: "#888", fontSize: 12 },
  cancelInput: { backgroundColor: "#0D0D0D", borderRadius: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", color: "#FFF", fontSize: 13, padding: 10, textAlignVertical: "top" },
  overrideBtnRow: { flexDirection: "row", gap: 10 },
  cancelOverrideBtn: { flex: 1, borderRadius: 10, paddingVertical: 12, borderWidth: 1, borderColor: "#333", alignItems: "center" },
  cancelOverrideText: { color: "#888", fontFamily: "Inter_500Medium" },
  confirmOverrideBtn: { flex: 2, borderRadius: 10, paddingVertical: 12, backgroundColor: GOLD, alignItems: "center" },
  confirmOverrideText: { color: BG, fontFamily: "Inter_700Bold" },
  btnDisabled: { opacity: 0.4 },
});
