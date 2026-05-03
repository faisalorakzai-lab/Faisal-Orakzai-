import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : "";
const GOLD = "#FFD700";
const BG = "#050505";
const RED = "#E53935";
const GREEN = "#43A047";
const BLUE = "#1E88E5";
const AMBER = "#FFB020";

type BookingType = "car" | "hotel" | "flight";
type BookingItem = {
  id: string;
  type: BookingType;
  service: string;
  user_name: string;
  requested_dates: string;
  proposed_price: number;
  status: string;
  created_at: string | null;
  final_price: number | null;
  confirmed: boolean;
  voucher_url: string | null;
  asset_reserved: boolean;
  admin_reason: string | null;
  contact_phone: string | null;
};

const TABS: { key: "all" | BookingType; label: string }[] = [
  { key: "all", label: "All Requests" },
  { key: "car", label: "Car Rentals" },
  { key: "hotel", label: "Hotel Stays" },
  { key: "flight", label: "Flight Tickets" },
];

const STATUS = {
  pending_review: { label: "Pending Review", color: AMBER, bg: "rgba(255,176,32,0.12)" },
  awaiting_payment: { label: "Awaiting Payment", color: BLUE, bg: "rgba(30,136,229,0.12)" },
  confirmed: { label: "Confirmed", color: GREEN, bg: "rgba(67,160,71,0.12)" },
  cancelled: { label: "Cancelled", color: RED, bg: "rgba(229,57,53,0.12)" },
};

function fmtDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleString("en-PK", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
}

export default function AdminBookingsScreen() {
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === "web" ? 60 : 14);
  const [type, setType] = useState<"all" | BookingType>("all");
  const [items, setItems] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<BookingItem | null>(null);
  const [assetReserved, setAssetReserved] = useState(false);
  const [finalPrice, setFinalPrice] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [voucherUrl, setVoucherUrl] = useState("");
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async (nextType: typeof type) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/otc/admin/bookings?type=${nextType}`);
      const json = await res.json() as { items?: BookingItem[] };
      setItems(json.items ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(type); }, [load, type]);

  const filtered = useMemo(() => items.filter((item) => type === "all" || item.type === type), [items, type]);

  const manage = async (action: "approve" | "reject" | "upload") => {
    if (!selected) return;
    setActionLoading(true);
    setActionMsg(null);
    try {
      const res = await fetch(`${API_BASE}/api/otc/admin/bookings/${selected.id}/manage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: selected.type,
          action,
          asset_reserved: assetReserved,
          final_price: finalPrice ? Number(finalPrice) : undefined,
          reason: rejectReason,
          file_url: voucherUrl,
        }),
      });
      const json = await res.json() as { ok?: boolean; error?: string };
      if (json.ok) {
        setActionMsg(action === "approve" ? "Request approved and invoiced." : action === "reject" ? "Request rejected." : "Voucher uploaded.");
        await load(type);
        if (action !== "upload") setSelected(null);
      } else {
        setActionMsg(json.error ?? "Action failed");
      }
    } catch {
      setActionMsg("Network error");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <AdminSidebar activeKey="financials" topPad={topPad} />
      <View style={[styles.main, { paddingTop: topPad }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.kicker}>Enterprise Booking Ops</Text>
            <Text style={styles.title}>Unified Booking Management</Text>
          </View>
          <View style={styles.badge}><Text style={styles.badgeText}>{filtered.length} requests</Text></View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsRow}>
          {TABS.map((tab) => {
            const active = tab.key === type;
            return (
              <TouchableOpacity key={tab.key} style={[styles.tab, active && styles.tabActive]} onPress={() => setType(tab.key)}>
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        {loading ? <ActivityIndicator color={GOLD} /> : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {filtered.map((item) => (
              <TouchableOpacity key={item.id} style={styles.card} onPress={() => { setSelected(item); setAssetReserved(item.asset_reserved); setFinalPrice(String(item.final_price ?? item.proposed_price)); setRejectReason(""); setVoucherUrl(""); setActionMsg(null); }}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.user}>{item.user_name}</Text>
                    <Text style={styles.sub}>{item.service}</Text>
                  </View>
                  <View style={[styles.status, { backgroundColor: STATUS[item.status as keyof typeof STATUS]?.bg ?? STATUS.pending_review.bg }]}>
                    <Text style={[styles.statusText, { color: STATUS[item.status as keyof typeof STATUS]?.color ?? STATUS.pending_review.color }]}>
                      {STATUS[item.status as keyof typeof STATUS]?.label ?? "Pending Review"}
                    </Text>
                  </View>
                </View>
                <Text style={styles.details}>{item.requested_dates}</Text>
                <Text style={styles.price}>Proposed PKR {item.proposed_price.toLocaleString()}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
      {selected && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setSelected(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <Text style={styles.modalTitle}>Manage Request</Text>
              <Text style={styles.modalSub}>{selected.service} • {selected.user_name}</Text>
              <View style={styles.checkRow}>
                <TouchableOpacity onPress={() => setAssetReserved((v) => !v)} style={styles.checkBox}>
                  <Text style={styles.checkMark}>{assetReserved ? "✓" : ""}</Text>
                </TouchableOpacity>
                <Text style={styles.checkLabel}>Confirm availability / reserve asset</Text>
              </View>
              <TextInput style={styles.input} placeholder="Final price" placeholderTextColor="#666" value={finalPrice} onChangeText={setFinalPrice} keyboardType="numeric" />
              <TextInput style={styles.input} placeholder="Reject reason" placeholderTextColor="#666" value={rejectReason} onChangeText={setRejectReason} />
              <TextInput style={styles.input} placeholder="Voucher / ticket URL" placeholderTextColor="#666" value={voucherUrl} onChangeText={setVoucherUrl} />
              {actionMsg ? <Text style={styles.msg}>{actionMsg}</Text> : null}
              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.ghostBtn} onPress={() => setSelected(null)}><Text style={styles.ghostText}>Close</Text></TouchableOpacity>
                <TouchableOpacity style={styles.rejectBtn} onPress={() => manage("reject")} disabled={actionLoading}><Text style={styles.rejectText}>Reject</Text></TouchableOpacity>
              </View>
              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.uploadBtn} onPress={() => manage("upload")} disabled={actionLoading}><Text style={styles.uploadText}>Upload Voucher/Ticket</Text></TouchableOpacity>
                <TouchableOpacity style={styles.approveBtn} onPress={() => manage("approve")} disabled={actionLoading}><Text style={styles.approveText}>Approve & Send Invoice</Text></TouchableOpacity>
              </View>
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
  badge: { backgroundColor: "rgba(255,215,0,0.12)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  badgeText: { color: GOLD, fontSize: 12 },
  tabsRow: { marginBottom: 12 },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.04)", marginRight: 8 },
  tabActive: { backgroundColor: GOLD },
  tabText: { color: "#AAA" },
  tabTextActive: { color: BG, fontFamily: "Inter_700Bold" },
  card: { borderWidth: 1, borderColor: "rgba(255,215,0,0.12)", backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 16, padding: 14, marginBottom: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  user: { color: "#FFF", fontSize: 15, fontFamily: "Inter_700Bold" },
  sub: { color: "#888", fontSize: 11 },
  status: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14 },
  statusText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  details: { color: "#DDD", marginTop: 8 },
  price: { color: GOLD, marginTop: 4, fontFamily: "Inter_700Bold" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", padding: 20 },
  modalSheet: { backgroundColor: "#0A0A0A", borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,215,0,0.16)", padding: 16, gap: 10 },
  modalTitle: { color: "#FFF", fontSize: 18, fontFamily: "Inter_700Bold" },
  modalSub: { color: "#888", fontSize: 12 },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  checkBox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: GOLD, alignItems: "center", justifyContent: "center" },
  checkMark: { color: GOLD, fontFamily: "Inter_700Bold" },
  checkLabel: { color: "#EEE", flex: 1 },
  input: { borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", borderRadius: 12, padding: 12, color: "#FFF" },
  msg: { color: GOLD },
  btnRow: { flexDirection: "row", gap: 10 },
  ghostBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: "#333", alignItems: "center" },
  ghostText: { color: "#AAA" },
  rejectBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: RED, alignItems: "center" },
  rejectText: { color: "#FFF", fontFamily: "Inter_700Bold" },
  uploadBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: BLUE, alignItems: "center" },
  uploadText: { color: "#FFF", fontFamily: "Inter_700Bold" },
  approveBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: GOLD, alignItems: "center" },
  approveText: { color: BG, fontFamily: "Inter_700Bold" },
});