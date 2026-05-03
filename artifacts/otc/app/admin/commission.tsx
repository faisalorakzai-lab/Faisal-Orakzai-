import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
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

const SAMPLE_AMOUNT = 1000;

type ServiceKey = "ride" | "delivery" | "hotel" | "rental" | "flight";

const SERVICE_META: Record<ServiceKey, { label: string; icon: Parameters<typeof Feather>[0]["name"]; color: string }> = {
  ride:     { label: "Ride-Hailing",         icon: "map-pin",       color: "#FFD700" },
  delivery: { label: "Delivery Services",    icon: "package",       color: "#00BCD4" },
  hotel:    { label: "Hotel Booking",        icon: "home",          color: "#AB47BC" },
  rental:   { label: "Rent-A-Car",           icon: "key",           color: "#FF7043" },
  flight:   { label: "Airline Ticket",       icon: "send",          color: "#42A5F5" },
};

const DEFAULT_RATES: Record<ServiceKey, number> = {
  ride: 0.20, delivery: 0.15, hotel: 0.10, rental: 0.12, flight: 0.05,
};

type HistoryRow = {
  id: string;
  key: string;
  old_value: number;
  new_value: number;
  admin_name: string;
  changed_at: string;
};

export default function CommissionScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 16 : insets.top;

  const [rates, setRates] = useState<Record<ServiceKey, number>>({ ...DEFAULT_RATES });
  const [draftRates, setDraftRates] = useState<Record<ServiceKey, string>>({
    ride: "20", delivery: "15", hotel: "10", rental: "12", flight: "5",
  });
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/otc/admin/commission`);
      const d = await r.json();
      if (d.rates) {
        const loaded = d.rates as Record<string, number>;
        const merged = { ...DEFAULT_RATES };
        for (const k of Object.keys(DEFAULT_RATES) as ServiceKey[]) {
          if (typeof loaded[k] === "number") merged[k] = loaded[k];
        }
        setRates(merged);
        setDraftRates({
          ride:     String(Math.round(merged.ride * 100)),
          delivery: String(Math.round(merged.delivery * 100)),
          hotel:    String(Math.round(merged.hotel * 100)),
          rental:   String(Math.round(merged.rental * 100)),
          flight:   String(Math.round(merged.flight * 100)),
        });
      }
      setHistory(d.history ?? []);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDraftChange = (key: ServiceKey, text: string) => {
    const cleaned = text.replace(/[^0-9.]/g, "");
    setDraftRates((prev) => ({ ...prev, [key]: cleaned }));
  };

  const saveRates = async () => {
    setSaving(true);
    setSaveMsg(null);
    const payload: Record<string, number> = {};
    for (const k of Object.keys(draftRates) as ServiceKey[]) {
      const v = parseFloat(draftRates[k]);
      if (isNaN(v) || v < 0 || v > 100) { setSaveMsg({ ok: false, text: `Invalid value for ${SERVICE_META[k].label}` }); setSaving(false); return; }
      payload[k] = v / 100;
    }
    try {
      const r = await fetch(`${API_BASE}/api/otc/admin/commission/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rates: payload, admin_name: "Admin" }),
      });
      const d = await r.json();
      if (r.ok) {
        setSaveMsg({ ok: true, text: "✓ Global rates updated successfully" });
        loadData();
      } else {
        setSaveMsg({ ok: false, text: d.error ?? "Update failed" });
      }
    } catch { setSaveMsg({ ok: false, text: "Network error" }); }
    finally { setSaving(false); }
  };

  const preview = (key: ServiceKey): string => {
    const v = parseFloat(draftRates[key]);
    if (isNaN(v)) return "—";
    return `₨ ${(SAMPLE_AMOUNT * v / 100).toFixed(0)}`;
  };

  return (
    <View style={[cs.root, { paddingTop: topPad }]}>
      <AdminSidebar activeKey="commission" topPad={topPad} />

      <ScrollView style={cs.main} contentContainerStyle={cs.mainContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={cs.header}>
          <View style={cs.headerIcon}>
            <Feather name="sliders" size={20} color={BG} />
          </View>
          <View style={{ marginLeft: 12 }}>
            <Text style={cs.title}>Commission Settings</Text>
            <Text style={cs.subtitle}>Configure global commission rates per service category</Text>
          </View>
          <TouchableOpacity style={cs.refreshBtn} onPress={loadData} activeOpacity={0.8}>
            <Feather name="refresh-cw" size={14} color={GOLD} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={GOLD} style={{ marginVertical: 40 }} />
        ) : (
          <>
            {/* Preview Banner */}
            <View style={cs.previewBanner}>
              <Feather name="eye" size={14} color={GOLD} />
              <Text style={cs.previewBannerText}>
                Live Preview — Company earnings on a <Text style={{ color: GOLD, fontFamily: "Inter_700Bold" }}>₨{SAMPLE_AMOUNT}</Text> transaction
              </Text>
            </View>

            {/* Commission Cards Grid */}
            <View style={cs.grid}>
              {(Object.keys(SERVICE_META) as ServiceKey[]).map((key) => {
                const meta = SERVICE_META[key];
                const isDirty = parseFloat(draftRates[key]) !== Math.round(rates[key] * 100);
                return (
                  <View key={key} style={[cs.serviceCard, { borderColor: isDirty ? GOLD + "50" : BORDER }]}>
                    {/* Service Header */}
                    <View style={cs.serviceCardHeader}>
                      <View style={[cs.serviceIcon, { backgroundColor: meta.color + "22" }]}>
                        <Feather name={meta.icon} size={16} color={meta.color} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={cs.serviceLabel}>{meta.label}</Text>
                        <Text style={cs.serviceCurrent}>Current: {Math.round(rates[key] * 100)}%</Text>
                      </View>
                      {isDirty && (
                        <View style={cs.dirtyBadge}>
                          <Text style={cs.dirtyBadgeText}>Modified</Text>
                        </View>
                      )}
                    </View>

                    {/* Input */}
                    <View style={cs.inputRow}>
                      <TextInput
                        style={[cs.percentInput, isDirty && { borderColor: GOLD + "80" }]}
                        value={draftRates[key]}
                        onChangeText={(t) => handleDraftChange(key, t)}
                        keyboardType="decimal-pad"
                        maxLength={5}
                      />
                      <View style={cs.percentSymbol}>
                        <Text style={cs.percentSymbolText}>%</Text>
                      </View>
                    </View>

                    {/* Preview */}
                    <View style={cs.previewRow}>
                      <Feather name="trending-up" size={12} color={meta.color} />
                      <Text style={cs.previewLabel}>Earn on ₨{SAMPLE_AMOUNT}:</Text>
                      <Text style={[cs.previewValue, { color: meta.color }]}>{preview(key)}</Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Save Button */}
            {saveMsg && (
              <Text style={[cs.saveMsg, { color: saveMsg.ok ? GREEN : RED }]}>{saveMsg.text}</Text>
            )}
            <TouchableOpacity style={cs.saveBtn} onPress={saveRates} activeOpacity={0.8} disabled={saving}>
              {saving
                ? <ActivityIndicator color={BG} size="small" />
                : (
                  <>
                    <Feather name="upload-cloud" size={16} color={BG} />
                    <Text style={cs.saveBtnText}>Update Global Rates</Text>
                  </>
                )}
            </TouchableOpacity>

            {/* History Log */}
            <View style={cs.card}>
              <Text style={cs.sectionLabel}>Change History</Text>
              {history.length === 0 ? (
                <Text style={cs.emptyText}>No changes recorded yet</Text>
              ) : (
                <View style={{ gap: 8 }}>
                  {history.map((h) => {
                    const svcLabel = SERVICE_META[h.key as ServiceKey]?.label ?? h.key;
                    const oldPct = Math.round(Number(h.old_value) * 100);
                    const newPct = Math.round(Number(h.new_value) * 100);
                    const increased = newPct > oldPct;
                    return (
                      <View key={h.id} style={cs.histRow}>
                        <Feather
                          name={increased ? "arrow-up-right" : "arrow-down-right"}
                          size={13}
                          color={increased ? GREEN : RED}
                        />
                        <View style={{ flex: 1, marginLeft: 8 }}>
                          <Text style={cs.histMain}>
                            <Text style={{ color: GOLD }}>{h.admin_name}</Text>
                            {" changed "}
                            <Text style={{ color: "#ddd" }}>{svcLabel}</Text>
                            {" from "}
                            <Text style={{ color: "#aaa" }}>{oldPct}%</Text>
                            {" → "}
                            <Text style={{ color: increased ? GREEN : RED, fontFamily: "Inter_700Bold" }}>{newPct}%</Text>
                          </Text>
                          <Text style={cs.histDate}>
                            {new Date(h.changed_at).toLocaleString()}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const cs = StyleSheet.create({
  root: { flex: 1, flexDirection: "row", backgroundColor: BG },
  main: { flex: 1 },
  mainContent: { padding: 20, gap: 16, paddingBottom: 60 },
  header: { flexDirection: "row", alignItems: "center", gap: 0, marginBottom: 4 },
  headerIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: GOLD, justifyContent: "center", alignItems: "center" },
  title: { color: GOLD, fontSize: 22, fontFamily: "Inter_700Bold" },
  subtitle: { color: "#666", fontSize: 12 },
  refreshBtn: { marginLeft: "auto", padding: 8 },
  previewBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: GOLD + "12", borderWidth: 1, borderColor: GOLD + "30", borderRadius: 10, padding: 11 },
  previewBannerText: { color: "#ccc", fontSize: 12, flex: 1 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  serviceCard: { width: "47%", backgroundColor: CARD, borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  serviceCardHeader: { flexDirection: "row", alignItems: "center" },
  serviceIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  serviceLabel: { color: "#ddd", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  serviceCurrent: { color: "#555", fontSize: 11, marginTop: 1 },
  dirtyBadge: { backgroundColor: GOLD + "22", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  dirtyBadgeText: { color: GOLD, fontSize: 9, fontFamily: "Inter_600SemiBold" },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 0 },
  percentInput: {
    flex: 1,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: BORDER,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    color: GOLD,
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    paddingHorizontal: 14,
    paddingVertical: 10,
    textAlign: "right",
  },
  percentSymbol: {
    backgroundColor: GOLD + "22",
    borderWidth: 1,
    borderColor: BORDER,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: "center",
  },
  percentSymbolText: { color: GOLD, fontSize: 18, fontFamily: "Inter_700Bold" },
  previewRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  previewLabel: { color: "#555", fontSize: 11 },
  previewValue: { fontSize: 13, fontFamily: "Inter_700Bold", marginLeft: "auto" },
  saveMsg: { fontSize: 13, fontFamily: "Inter_500Medium", textAlign: "center" },
  saveBtn: {
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  saveBtnText: { color: BG, fontSize: 15, fontFamily: "Inter_700Bold" },
  card: { backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 18, gap: 10 },
  sectionLabel: { color: GOLD, fontSize: 13, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
  emptyText: { color: "#444", fontSize: 13, textAlign: "center", paddingVertical: 16 },
  histRow: { flexDirection: "row", alignItems: "flex-start", borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)", paddingVertical: 8 },
  histMain: { fontSize: 12, lineHeight: 18, color: "#bbb" },
  histDate: { color: "#555", fontSize: 10, marginTop: 2 },
});
