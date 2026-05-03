import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
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
const GOLD_DIM = "rgba(255,215,0,0.18)";
const BG = "#050505";
const RED = "#E53935";
const RED_DIM = "rgba(229,57,53,0.15)";
const GREEN = "#43A047";
const GREEN_DIM = "rgba(67,160,71,0.15)";

type DriverDoc = {
  cnic_front: string | null;
  cnic_back: string | null;
  license: string | null;
  registration: string | null;
  vehicle_photo: string | null;
};

type PendingDriver = {
  id: string;
  name: string;
  phone: string;
  vehicle_model: string;
  plate_number: string;
  vehicle_type: string;
  status: string;
  created_at: string | null;
  rejection_reason: string | null;
  documents: DriverDoc;
};

type ZoomImage = { url: string; label: string } | null;

const DOC_LABELS: { key: keyof DriverDoc; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: "cnic_front", label: "CNIC Front", icon: "credit-card" },
  { key: "cnic_back", label: "CNIC Back", icon: "credit-card" },
  { key: "license", label: "Driving Licence", icon: "file-text" },
  { key: "registration", label: "Vehicle Registration / Route Permit", icon: "clipboard" },
  { key: "vehicle_photo", label: "Vehicle Photo", icon: "camera" },
];

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" });
}

function statusColor(s: string) {
  if (s === "active") return GREEN;
  if (s === "rejected") return RED;
  return GOLD;
}

export default function DriverVerificationScreen() {
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === "web" ? 60 : 14);

  const [drivers, setDrivers] = useState<PendingDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [selectedDriver, setSelectedDriver] = useState<PendingDriver | null>(null);
  const [zoomImage, setZoomImage] = useState<ZoomImage>(null);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async (p: number, q: string) => {
    setLoading(true);
    try {
      const url = `${API_BASE}/api/otc/admin/drivers/pending?page=${p}&search=${encodeURIComponent(q)}`;
      const res = await fetch(url);
      const json = await res.json() as { drivers?: PendingDriver[]; totalPages?: number; total?: number };
      setDrivers(json.drivers ?? []);
      setTotalPages(json.totalPages ?? 1);
      setTotal(json.total ?? 0);
    } catch {
      setDrivers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(page, search); }, [page]);

  const handleSearch = () => { setPage(1); load(1, search); };

  const handleVerify = async (action: "approve" | "reject") => {
    if (!selectedDriver) return;
    if (action === "reject" && !rejectReason.trim()) return;
    setActionLoading(true);
    setActionMsg(null);
    try {
      const res = await fetch(`${API_BASE}/api/otc/admin/drivers/${selectedDriver.id}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason: rejectReason.trim() || undefined }),
      });
      const json = await res.json() as { ok?: boolean; error?: string };
      if (json.ok) {
        setActionMsg({ type: "success", text: action === "approve" ? "Driver approved and notified!" : "Driver rejected with reason sent." });
        setDrivers((prev) => prev.filter((d) => d.id !== selectedDriver.id));
        setTotal((t) => t - 1);
        setTimeout(() => { setSelectedDriver(null); setRejectMode(false); setRejectReason(""); setActionMsg(null); }, 1800);
      } else {
        setActionMsg({ type: "error", text: json.error ?? "Action failed" });
      }
    } catch {
      setActionMsg({ type: "error", text: "Network error" });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <AdminSidebar activeKey="drivers" topPad={topPad} />

      <View style={[styles.main, { paddingTop: topPad }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.kicker}>Verification Queue</Text>
            <Text style={styles.title}>Driver Approval Portal</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{total} pending</Text>
          </View>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Feather name="search" size={14} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or phone…"
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

        {loading ? (
          <View style={styles.center}><ActivityIndicator color={GOLD} size="large" /></View>
        ) : drivers.length === 0 ? (
          <View style={styles.center}>
            <Feather name="check-circle" size={40} color="#333" />
            <Text style={styles.emptyText}>No pending drivers</Text>
          </View>
        ) : (
          <ScrollView style={styles.tableScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.tableHeader}>
              {["Name", "Vehicle", "Type", "Applied", "Status", ""].map((h) => (
                <Text key={h} style={[styles.th, h === "" && { width: 80 }]}>{h}</Text>
              ))}
            </View>
            {drivers.map((d) => (
              <TouchableOpacity key={d.id} style={styles.tableRow} onPress={() => { setSelectedDriver(d); setRejectMode(false); setRejectReason(""); setActionMsg(null); }} activeOpacity={0.75}>
                <View style={styles.td}>
                  <Text style={styles.tdMain}>{d.name}</Text>
                  <Text style={styles.tdSub}>{d.phone}</Text>
                </View>
                <View style={styles.td}>
                  <Text style={styles.tdMain}>{d.vehicle_model}</Text>
                  <Text style={styles.tdSub}>{d.plate_number}</Text>
                </View>
                <Text style={styles.tdText}>{d.vehicle_type}</Text>
                <Text style={styles.tdText}>{fmtDate(d.created_at)}</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusColor(d.status) + "22", borderColor: statusColor(d.status) + "44" }]}>
                  <Text style={[styles.statusText, { color: statusColor(d.status) }]}>{d.status}</Text>
                </View>
                <TouchableOpacity style={styles.reviewBtn} onPress={() => { setSelectedDriver(d); setRejectMode(false); setRejectReason(""); setActionMsg(null); }}>
                  <Text style={styles.reviewBtnText}>Review</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}

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

      {selectedDriver && (
        <Modal visible animationType="fade" transparent onRequestClose={() => setSelectedDriver(null)}>
          <View style={modal.overlay}>
            <View style={modal.sheet}>
              <View style={modal.header}>
                <View>
                  <Text style={modal.driverName}>{selectedDriver.name}</Text>
                  <Text style={modal.driverSub}>{selectedDriver.phone} · {selectedDriver.vehicle_model} · {selectedDriver.plate_number}</Text>
                </View>
                <TouchableOpacity style={modal.closeBtn} onPress={() => { setSelectedDriver(null); setRejectMode(false); setRejectReason(""); setActionMsg(null); }}>
                  <Feather name="x" size={18} color="#FFF" />
                </TouchableOpacity>
              </View>

              <ScrollView style={modal.body} showsVerticalScrollIndicator={false}>
                <Text style={modal.sectionLabel}>Document Gallery</Text>
                <View style={modal.docGrid}>
                  {DOC_LABELS.map(({ key, label, icon }) => {
                    const url = selectedDriver.documents[key];
                    return (
                      <View key={key} style={modal.docCard}>
                        <View style={modal.docLabelRow}>
                          <Feather name={icon} size={12} color={GOLD} />
                          <Text style={modal.docLabel}>{label}</Text>
                        </View>
                        {url ? (
                          <TouchableOpacity onPress={() => setZoomImage({ url, label })} activeOpacity={0.85}>
                            <Image source={{ uri: url }} style={modal.docImg} resizeMode="cover" />
                            <View style={modal.zoomHint}>
                              <Feather name="maximize-2" size={12} color="#FFF" />
                              <Text style={modal.zoomHintText}>Tap to zoom</Text>
                            </View>
                          </TouchableOpacity>
                        ) : (
                          <View style={modal.docMissing}>
                            <Feather name="image" size={22} color="#333" />
                            <Text style={modal.docMissingText}>Not uploaded</Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>

                {actionMsg && (
                  <View style={[modal.msgBox, actionMsg.type === "success" ? modal.msgSuccess : modal.msgError]}>
                    <Feather name={actionMsg.type === "success" ? "check-circle" : "alert-circle"} size={14} color={actionMsg.type === "success" ? GREEN : RED} />
                    <Text style={[modal.msgText, { color: actionMsg.type === "success" ? GREEN : RED }]}>{actionMsg.text}</Text>
                  </View>
                )}

                {!rejectMode ? (
                  <View style={modal.actionRow}>
                    <TouchableOpacity
                      style={[modal.approveBtn, actionLoading && modal.btnDisabled]}
                      onPress={() => handleVerify("approve")}
                      disabled={actionLoading}
                      activeOpacity={0.85}
                    >
                      {actionLoading ? <ActivityIndicator size="small" color={BG} /> : (
                        <>
                          <Feather name="check" size={16} color={BG} />
                          <Text style={modal.approveBtnText}>Approve Driver</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={modal.rejectBtn}
                      onPress={() => setRejectMode(true)}
                      disabled={actionLoading}
                      activeOpacity={0.85}
                    >
                      <Feather name="x-circle" size={16} color={RED} />
                      <Text style={modal.rejectBtnText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={modal.rejectBox}>
                    <Text style={modal.rejectBoxLabel}>Rejection Reason</Text>
                    <TextInput
                      style={modal.rejectInput}
                      placeholder="e.g. Licence expired, blurry photos…"
                      placeholderTextColor="#555"
                      value={rejectReason}
                      onChangeText={setRejectReason}
                      multiline
                      numberOfLines={3}
                    />
                    <View style={modal.rejectBtnRow}>
                      <TouchableOpacity style={modal.cancelRejectBtn} onPress={() => { setRejectMode(false); setRejectReason(""); }}>
                        <Text style={modal.cancelRejectText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[modal.confirmRejectBtn, (!rejectReason.trim() || actionLoading) && modal.btnDisabled]}
                        onPress={() => handleVerify("reject")}
                        disabled={!rejectReason.trim() || actionLoading}
                        activeOpacity={0.85}
                      >
                        {actionLoading ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={modal.confirmRejectText}>Send Rejection</Text>}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {zoomImage && (
        <Modal visible animationType="fade" transparent onRequestClose={() => setZoomImage(null)}>
          <View style={zoom.overlay}>
            <TouchableOpacity style={zoom.closeBtn} onPress={() => setZoomImage(null)}>
              <Feather name="x" size={20} color="#FFF" />
            </TouchableOpacity>
            <Text style={zoom.label}>{zoomImage.label}</Text>
            <Image source={{ uri: zoomImage.url }} style={zoom.img} resizeMode="contain" />
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
  searchRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  searchBox: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,215,0,0.10)", borderRadius: 10, paddingHorizontal: 12, height: 40 },
  searchInput: { flex: 1, color: "#FFF", fontSize: 13 },
  searchBtn: { backgroundColor: GOLD, borderRadius: 10, paddingHorizontal: 16, height: 40, justifyContent: "center" },
  searchBtnText: { color: BG, fontFamily: "Inter_700Bold", fontSize: 13 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyText: { color: "#555", fontSize: 14 },
  tableScroll: { flex: 1 },
  tableHeader: { flexDirection: "row", paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(255,215,0,0.10)" },
  th: { flex: 1, color: "#666", fontSize: 10, textTransform: "uppercase", letterSpacing: 1 },
  tableRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)", gap: 6 },
  td: { flex: 1 },
  tdMain: { color: "#FFF", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  tdSub: { color: "#777", fontSize: 11, marginTop: 1 },
  tdText: { flex: 1, color: "#CCC", fontSize: 12 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3, borderWidth: 1 },
  statusText: { fontSize: 10, fontFamily: "Inter_700Bold", textTransform: "capitalize" },
  reviewBtn: { width: 70, backgroundColor: GOLD_DIM, borderRadius: 8, paddingVertical: 6, alignItems: "center", borderWidth: 1, borderColor: GOLD_DIM },
  reviewBtnText: { color: GOLD, fontSize: 11, fontFamily: "Inter_700Bold" },
  pagination: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 16, paddingVertical: 20 },
  pageBtn: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: "rgba(255,215,0,0.2)", alignItems: "center", justifyContent: "center" },
  pageBtnDisabled: { borderColor: "#222" },
  pageText: { color: "#888", fontSize: 12 },
});

const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center", padding: 16 },
  sheet: { backgroundColor: "#0C0C0C", borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,215,0,0.15)", width: "100%", maxWidth: 640, maxHeight: "90%", overflow: "hidden" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", padding: 20, borderBottomWidth: 1, borderBottomColor: "rgba(255,215,0,0.10)" },
  driverName: { color: "#FFF", fontSize: 20, fontFamily: "Inter_700Bold" },
  driverSub: { color: "#888", fontSize: 12, marginTop: 3 },
  closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center" },
  body: { padding: 20 },
  sectionLabel: { color: GOLD, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, marginBottom: 14 },
  docGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 20 },
  docCard: { width: "47%", borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,215,0,0.12)", overflow: "hidden", backgroundColor: "#111" },
  docLabelRow: { flexDirection: "row", alignItems: "center", gap: 6, padding: 10 },
  docLabel: { color: "#CCC", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  docImg: { width: "100%", height: 140 },
  zoomHint: { flexDirection: "row", alignItems: "center", gap: 4, padding: 6, backgroundColor: "rgba(0,0,0,0.6)", position: "absolute", bottom: 0, right: 0, borderTopLeftRadius: 8 },
  zoomHintText: { color: "#FFF", fontSize: 10 },
  docMissing: { height: 120, alignItems: "center", justifyContent: "center", gap: 6 },
  docMissingText: { color: "#444", fontSize: 11 },
  msgBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, marginBottom: 14 },
  msgSuccess: { backgroundColor: GREEN_DIM },
  msgError: { backgroundColor: RED_DIM },
  msgText: { fontSize: 13, flex: 1 },
  actionRow: { flexDirection: "row", gap: 12, marginBottom: 8 },
  approveBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: GOLD, borderRadius: 12, paddingVertical: 14 },
  approveBtnText: { color: BG, fontFamily: "Inter_700Bold", fontSize: 14 },
  btnDisabled: { opacity: 0.5 },
  rejectBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 20, borderRadius: 12, borderWidth: 1, borderColor: RED_DIM, backgroundColor: RED_DIM },
  rejectBtnText: { color: RED, fontFamily: "Inter_700Bold", fontSize: 14 },
  rejectBox: { backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(229,57,53,0.2)", padding: 14, gap: 10, marginBottom: 8 },
  rejectBoxLabel: { color: RED, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 },
  rejectInput: { backgroundColor: "#0D0D0D", borderRadius: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", color: "#FFF", fontSize: 13, padding: 10, minHeight: 72, textAlignVertical: "top" },
  rejectBtnRow: { flexDirection: "row", gap: 10 },
  cancelRejectBtn: { flex: 1, borderRadius: 10, paddingVertical: 12, borderWidth: 1, borderColor: "#333", alignItems: "center" },
  cancelRejectText: { color: "#888", fontFamily: "Inter_500Medium" },
  confirmRejectBtn: { flex: 2, borderRadius: 10, paddingVertical: 12, backgroundColor: RED, alignItems: "center" },
  confirmRejectText: { color: "#FFF", fontFamily: "Inter_700Bold" },
});

const zoom = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.96)", justifyContent: "center", alignItems: "center", padding: 16 },
  closeBtn: { position: "absolute", top: 48, right: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center", zIndex: 10 },
  label: { color: GOLD, fontSize: 12, letterSpacing: 1, textTransform: "uppercase", marginBottom: 16 },
  img: { width: "100%", height: "80%" },
});
