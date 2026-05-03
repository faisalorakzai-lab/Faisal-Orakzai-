import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
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
import { getAblyClient } from "@/lib/ablyClient";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

const GOLD = "#FFD700";
const POLL_MS = 6000;

interface NearbyBid {
  id: string;
  pickup_name: string;
  dropoff_name: string;
  distance_km: number;
  suggested_fare: number;
  expires_at: string;
  created_at: string;
}

function getApiUrl(path: string): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}${path}`;
  }
  return API_BASE ? `${API_BASE}${path}` : path;
}

function timeLeft(expiresAt: string): number {
  return Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 1000));
}

function CountdownPill({ expiresAt }: { expiresAt: string }) {
  const [secs, setSecs] = useState(() => timeLeft(expiresAt));

  useEffect(() => {
    const t = setInterval(() => setSecs(timeLeft(expiresAt)), 1000);
    return () => clearInterval(t);
  }, [expiresAt]);

  const color = secs > 120 ? GOLD : secs > 30 ? "#F59E0B" : "#F87171";
  const mins = Math.floor(secs / 60);
  const s = secs % 60;
  const label = secs <= 0 ? "EXPIRED" : `${mins}:${String(s).padStart(2, "0")}`;

  return (
    <View style={[styles.countdownPill, { borderColor: color + "44" }]}>
      <Feather name="clock" size={10} color={color} />
      <Text style={[styles.countdownText, { color }]}>{label}</Text>
    </View>
  );
}

interface OfferModalProps {
  visible: boolean;
  bid: NearbyBid | null;
  onClose: () => void;
  onSubmit: (offeredFare: number, eta: number) => Promise<void>;
  submitting: boolean;
}

function OfferModal({ visible, bid, onClose, onSubmit, submitting }: OfferModalProps) {
  const [fare, setFare] = useState("");
  const [eta, setEta] = useState("5");

  useEffect(() => {
    if (bid && visible) {
      setFare(String(bid.suggested_fare));
      setEta("5");
    }
  }, [bid, visible]);

  if (!bid) return null;

  const parsedFare = parseInt(fare, 10);
  const parsedEta = parseInt(eta, 10);
  const diff = parsedFare - bid.suggested_fare;
  const diffPct = Math.round((diff / bid.suggested_fare) * 100);
  const valid = parsedFare > 0 && parsedEta > 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Place Your Offer</Text>

          <View style={styles.modalRouteCard}>
            <View style={styles.modalRouteRow}>
              <View style={[styles.routeDot, { backgroundColor: GOLD }]} />
              <Text style={styles.modalRouteText} numberOfLines={1}>
                {bid.pickup_name}
              </Text>
            </View>
            <View style={styles.routeDotLine} />
            <View style={styles.modalRouteRow}>
              <View style={[styles.routeDot, { backgroundColor: "#22C55E" }]} />
              <Text style={styles.modalRouteText} numberOfLines={1}>
                {bid.dropoff_name}
              </Text>
            </View>
            <View style={styles.modalRouteMeta}>
              <Text style={styles.modalRouteDist}>{bid.distance_km} km</Text>
              <Text style={styles.modalRouteSugg}>Suggested: PKR {bid.suggested_fare.toLocaleString()}</Text>
            </View>
          </View>

          <View style={styles.modalFieldGroup}>
            <Text style={styles.modalFieldLabel}>YOUR FARE (PKR)</Text>
            <TextInput
              style={styles.modalInput}
              value={fare}
              onChangeText={setFare}
              keyboardType="numeric"
              selectTextOnFocus
              placeholder="Enter fare"
              placeholderTextColor="#444"
            />
            {diff !== 0 && parsedFare > 0 && (
              <Text style={[styles.diffHint, { color: diff < 0 ? "#22C55E" : "#F87171" }]}>
                {diff < 0 ? `PKR ${Math.abs(diff)} below suggested (${Math.abs(diffPct)}% lower)` : `PKR ${diff} above suggested (+${diffPct}%)`}
              </Text>
            )}
          </View>

          <View style={styles.modalFieldGroup}>
            <Text style={styles.modalFieldLabel}>ETA (MINUTES)</Text>
            <TextInput
              style={styles.modalInput}
              value={eta}
              onChangeText={setEta}
              keyboardType="numeric"
              selectTextOnFocus
              placeholder="Minutes to arrive"
              placeholderTextColor="#444"
            />
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalSubmitBtn, !valid && styles.modalSubmitDisabled]}
              onPress={() => valid && onSubmit(parsedFare, parsedEta)}
              disabled={!valid || submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color="#000" size="small" />
              ) : (
                <Feather name="zap" size={16} color="#000" />
              )}
              <Text style={styles.modalSubmitText}>
                {submitting ? "Sending…" : `Send Offer · PKR ${parsedFare > 0 ? parsedFare.toLocaleString() : "—"}`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function DriverBidsScreen() {
  const insets = useSafeAreaInsets();
  const { driver, token } = useDriverAuth();
  const [bids, setBids] = useState<NearbyBid[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBid, setSelectedBid] = useState<NearbyBid | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedBids, setSubmittedBids] = useState<Set<string>>(new Set());

  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 16);

  const fetchBids = useCallback(async (quiet = false) => {
    if (!quiet) setRefreshing(true);
    try {
      const resp = await fetch(getApiUrl("/api/otc/driver/bids/nearby"), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (resp.ok) {
        const json = (await resp.json()) as { bids: NearbyBid[] };
        setBids((json.bids ?? []).filter((b) => timeLeft(b.expires_at) > 0));
      }
    } catch {}
    if (!quiet) setRefreshing(false);
    setLoading(false);
  }, [token]);

  // Initial fetch
  useEffect(() => {
    fetchBids();
    pollTimer.current = setInterval(() => fetchBids(true), POLL_MS);
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, [fetchBids]);

  // Subscribe to Ably for real-time new bids
  useEffect(() => {
    const client = getAblyClient();
    if (!client) return;

    const channel = client.channels.get("drivers:nearby");
    channel.subscribe("bid:new", (msg) => {
      const newBid = msg.data as NearbyBid;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setBids((prev) => {
        const existing = prev.find((b) => b.id === newBid.id);
        if (existing) return prev;
        return [newBid, ...prev];
      });
    });

    return () => {
      channel.unsubscribe("bid:new");
      channel.detach().catch(() => {});
    };
  }, []);

  async function handleSendOffer(offeredFare: number, eta: number) {
    if (!selectedBid || !token) return;
    setSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      const resp = await fetch(getApiUrl(`/api/otc/bid/${selectedBid.id}/driver-offer`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ offered_fare: offeredFare, eta }),
      });

      if (resp.ok) {
        setSubmittedBids((prev) => new Set([...prev, selectedBid.id]));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setModalVisible(false);
        setSelectedBid(null);
      }
    } catch {}

    setSubmitting(false);
  }

  function handleOpenOffer(bid: NearbyBid) {
    if (submittedBids.has(bid.id)) return;
    setSelectedBid(bid);
    setModalVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  const activeBids = bids.filter((b) => timeLeft(b.expires_at) > 0);

  return (
    <View style={[styles.root, { paddingTop: topPad }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Feather name="arrow-left" size={20} color={GOLD} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>NEARBY BIDS</Text>
          {driver && (
            <Text style={styles.headerSub} numberOfLines={1}>
              {driver.name} · {driver.vehicle_model}
            </Text>
          )}
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={() => fetchBids()} activeOpacity={0.8}>
          <Feather name="refresh-cw" size={16} color={GOLD} />
        </TouchableOpacity>
      </View>

      {/* Realtime badge */}
      <View style={styles.realtimeBadge}>
        <Animated.View style={styles.realtimeDot} />
        <Text style={styles.realtimeText}>
          Real-time via Ably · Auto-refresh every {POLL_MS / 1000}s
        </Text>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={GOLD} size="large" />
          <Text style={styles.loadingText}>Finding nearby bids…</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={() => fetchBids()}
        >
          {activeBids.length === 0 ? (
            <View style={styles.emptyCard}>
              <Feather name="search" size={32} color="#333" />
              <Text style={styles.emptyTitle}>No Active Bids</Text>
              <Text style={styles.emptyText}>
                Users haven't posted any ride bids nearby yet.{"\n"}Pull down to refresh.
              </Text>
            </View>
          ) : (
            activeBids.map((bid) => {
              const sent = submittedBids.has(bid.id);
              return (
                <TouchableOpacity
                  key={bid.id}
                  style={[styles.bidCard, sent && styles.bidCardSent]}
                  onPress={() => handleOpenOffer(bid)}
                  activeOpacity={sent ? 1 : 0.85}
                >
                  {sent && (
                    <View style={styles.sentOverlay}>
                      <Feather name="check-circle" size={13} color="#22C55E" />
                      <Text style={styles.sentText}>OFFER SENT</Text>
                    </View>
                  )}

                  <View style={styles.bidCardHeader}>
                    <View style={styles.bidIdBadge}>
                      <Text style={styles.bidIdText}>#{bid.id.slice(-8)}</Text>
                    </View>
                    <CountdownPill expiresAt={bid.expires_at} />
                  </View>

                  <View style={styles.routeSection}>
                    <View style={styles.routeRow}>
                      <View style={[styles.dot, { backgroundColor: GOLD }]} />
                      <Text style={styles.routeAddr} numberOfLines={1}>
                        {bid.pickup_name}
                      </Text>
                    </View>
                    <View style={styles.dotConnector} />
                    <View style={styles.routeRow}>
                      <View style={[styles.dot, { backgroundColor: "#22C55E" }]} />
                      <Text style={styles.routeAddr} numberOfLines={1}>
                        {bid.dropoff_name}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <Feather name="map" size={11} color="#666" />
                      <Text style={styles.metaText}>{bid.distance_km} km</Text>
                    </View>
                    <View style={styles.fareChip}>
                      <Text style={styles.fareChipLabel}>USER BID</Text>
                      <Text style={styles.fareChipAmt}>
                        PKR {bid.suggested_fare.toLocaleString()}
                      </Text>
                    </View>
                  </View>

                  {!sent && (
                    <View style={styles.offerBtn}>
                      <Feather name="zap" size={14} color="#000" />
                      <Text style={styles.offerBtnText}>Counter Offer</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      <OfferModal
        visible={modalVisible}
        bid={selectedBid}
        onClose={() => { setModalVisible(false); setSelectedBid(null); }}
        onSubmit={handleSendOffer}
        submitting={submitting}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 14,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,215,0,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: { flex: 1 },
  headerTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: GOLD,
    letterSpacing: 2,
  },
  headerSub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#666",
    marginTop: 1,
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,215,0,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },

  realtimeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  realtimeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#22C55E",
  },
  realtimeText: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: "#555",
  },

  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  loadingText: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#666" },

  list: { gap: 14, paddingHorizontal: 20, paddingBottom: 32 },

  emptyCard: {
    backgroundColor: "#111",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.08)",
    padding: 40,
    alignItems: "center",
    gap: 12,
    marginTop: 20,
  },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#444" },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#555", textAlign: "center", lineHeight: 20 },

  bidCard: {
    backgroundColor: "#111",
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "rgba(255,215,0,0.18)",
    padding: 18,
    gap: 14,
  },
  bidCardSent: {
    borderColor: "rgba(34,197,94,0.25)",
    opacity: 0.7,
  },
  sentOverlay: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  sentText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "#22C55E",
    letterSpacing: 1.2,
  },
  bidCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bidIdBadge: {
    backgroundColor: "rgba(255,215,0,0.08)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  bidIdText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: "#888",
    letterSpacing: 0.5,
  },
  countdownPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  countdownText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },

  routeSection: { gap: 4 },
  routeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotConnector: {
    width: 1.5,
    height: 14,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginLeft: 3.25,
  },
  routeAddr: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#ddd",
    flex: 1,
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#666" },
  fareChip: {
    alignItems: "flex-end",
    gap: 1,
  },
  fareChipLabel: {
    fontSize: 8,
    fontFamily: "Inter_700Bold",
    color: "#555",
    letterSpacing: 1.2,
  },
  fareChipAmt: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: GOLD,
  },

  offerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: 12,
  },
  offerBtnText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#000",
    letterSpacing: 0.3,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#111",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1.5,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "rgba(255,215,0,0.2)",
    padding: 24,
    gap: 18,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,215,0,0.3)",
    alignSelf: "center",
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 0.2,
  },
  modalRouteCard: {
    backgroundColor: "#0A0A0A",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.1)",
    padding: 14,
    gap: 8,
  },
  modalRouteRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  routeDot: { width: 8, height: 8, borderRadius: 4 },
  routeDotLine: { width: 1, height: 10, backgroundColor: "rgba(255,255,255,0.1)", marginLeft: 3.5 },
  modalRouteText: { fontSize: 13, fontFamily: "Inter_500Medium", color: "#ccc", flex: 1 },
  modalRouteMeta: { flexDirection: "row", justifyContent: "space-between", paddingTop: 4 },
  modalRouteDist: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#666" },
  modalRouteSugg: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: GOLD },

  modalFieldGroup: { gap: 6 },
  modalFieldLabel: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#555", letterSpacing: 1.4 },
  modalInput: {
    backgroundColor: "#0A0A0A",
    borderWidth: 1.5,
    borderColor: "rgba(255,215,0,0.2)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: GOLD,
  },
  diffHint: { fontSize: 11, fontFamily: "Inter_500Medium" },

  modalActions: { flexDirection: "row", gap: 10 },
  modalCancelBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "#0A0A0A",
  },
  modalCancelText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#888" },
  modalSubmitBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: 14,
    backgroundColor: GOLD,
  },
  modalSubmitDisabled: { backgroundColor: "#333" },
  modalSubmitText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#000" },
});
