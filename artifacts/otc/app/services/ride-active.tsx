import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
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

import { RideCompletedModal } from "@/components/ride/RideCompletedModal";
import { RideProgressBar, type LivePhase } from "@/components/ride/RideProgressBar";
import { RideMapFull } from "@/components/ride/RideMapFull";
import { clearActiveRide, getActiveRide } from "@/lib/activeRideStore";
import { supabase } from "@/lib/supabase";
import { useReferral } from "@/contexts/ReferralContext";

const { height: SCREEN_H } = Dimensions.get("window");
const GOLD = "#FFD700";
const GOLD_DIM = "rgba(255,215,0,0.2)";
const CHAT_QUICK = [
  "I am outside",
  "In heavy traffic",
  "Please share exact location",
] as const;

type ChatMessage = {
  id: string;
  role: "driver" | "user";
  text: string;
  ts: number;
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function CommunicationHub({ onOpenChat }: { onOpenChat: () => void }) {
  return (
    <View style={styles.commsRow}>
      <TouchableOpacity style={styles.commIcon} activeOpacity={0.8} onPress={onOpenChat}>
        <Feather name="message-circle" size={18} color={GOLD} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.commIcon} activeOpacity={0.8} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}>
        <Feather name="phone" size={18} color={GOLD} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.commIcon} activeOpacity={0.8} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}>
        <Feather name="mic" size={18} color={GOLD} />
      </TouchableOpacity>
    </View>
  );
}

function ChatModal({ visible, onClose, messages, onSend }: { visible: boolean; onClose: () => void; messages: ChatMessage[]; onSend: (text: string) => void; }) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState("");
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.chatBackdrop}>
        <View style={[styles.chatSheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatTitle}>Chat</Text>
            <TouchableOpacity onPress={onClose} style={styles.chatClose} activeOpacity={0.8}>
              <Feather name="x" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.chatScroll} contentContainerStyle={styles.chatScrollContent} showsVerticalScrollIndicator={false}>
            {messages.map((msg) => (
              <View key={msg.id} style={[styles.bubble, msg.role === "driver" ? styles.driverBubble : styles.userBubble]}>
                <Text style={[styles.bubbleText, msg.role === "driver" ? styles.driverBubbleText : styles.userBubbleText]}>{msg.text}</Text>
              </View>
            ))}
          </ScrollView>
          <View style={styles.quickRow}>
            {CHAT_QUICK.map((item) => (
              <TouchableOpacity key={item} style={styles.quickChip} activeOpacity={0.85} onPress={() => onSend(item)}>
                <Text style={styles.quickChipText}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.chatComposer}>
            <TextInput value={draft} onChangeText={setDraft} placeholder="Message user…" placeholderTextColor="#666" style={styles.chatInput} />
            <TouchableOpacity
              style={styles.chatSend}
              activeOpacity={0.85}
              onPress={() => {
                if (!draft.trim()) return;
                onSend(draft.trim());
                setDraft("");
              }}
            >
              <Feather name="send" size={16} color="#050505" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function RideActiveScreen() {
  const insets = useSafeAreaInsets();
  const rideData = getActiveRide();
  const { completeFirstRide } = useReferral();

  const [phase, setPhase] = useState<LivePhase>("assigned");
  const [carLat, setCarLat] = useState<number | null>(null);
  const [carLng, setCarLng] = useState<number | null>(null);
  const [etaSeconds, setEtaSeconds] = useState((rideData?.driver.eta ?? 5) * 60);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "u1", role: "user", text: "Need help finding the car.", ts: Date.now() - 20000 },
    { id: "d1", role: "driver", text: "I am outside.", ts: Date.now() - 12000 },
  ]);

  const realtimeRef = useRef<ReturnType<NonNullable<typeof supabase>["channel"]> | null>(null);
  const chatRef = useRef<ReturnType<NonNullable<typeof supabase>["channel"]> | null>(null);
  const carIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const etaIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const handledRef = useRef<Record<string, boolean>>({});
  const chatTopupRef = useRef(0);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 16);
  const rideId = rideData?.rideId ?? null;

  useEffect(() => {
    if (!rideData) {
      router.replace("/(tabs)");
      return;
    }
    etaIntervalRef.current = setInterval(() => setEtaSeconds((s) => Math.max(0, s - 1)), 1000);
    startCarAnimation("assigned");

    if (supabase) {
      const ch = supabase
        .channel(`ride-live-${rideData.rideId}`)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "ride_requests", filter: `id=eq.${rideData.rideId}` }, (payload) => {
          const row = payload.new as Record<string, unknown>;
          const status = String(row.status ?? "").toLowerCase();
          if (status === "ongoing" && !handledRef.current.ongoing) transitionTo("ongoing");
          if (status === "completed" && !handledRef.current.completed) transitionTo("completed");
        })
        .subscribe();
      realtimeRef.current = ch;

      const chatChannel = supabase
        .channel(`ride-chat-${rideData.rideId}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "ride_chat_messages", filter: `ride_id=eq.${rideData.rideId}` }, (payload) => {
          const row = payload.new as { id: string; sender: string; message: string; created_at?: string };
          setMessages((prev) => [...prev, { id: row.id, role: row.sender === "driver" ? "driver" : "user", text: row.message, ts: row.created_at ? Date.parse(row.created_at) : Date.now() }]);
        })
        .subscribe();
      chatRef.current = chatChannel;
    }

    return cleanup;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function cleanup() {
    if (carIntervalRef.current) clearInterval(carIntervalRef.current);
    if (etaIntervalRef.current) clearInterval(etaIntervalRef.current);
    if (realtimeRef.current && supabase) void supabase.removeChannel(realtimeRef.current);
    if (chatRef.current && supabase) void supabase.removeChannel(chatRef.current);
  }

  function transitionTo(next: LivePhase) {
    handledRef.current[next] = true;
    setPhase(next);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (carIntervalRef.current) clearInterval(carIntervalRef.current);
    if (next === "ongoing") {
      setEtaSeconds((rideData?.driver.eta ?? 5) * 60 + 480);
      startCarAnimation("ongoing");
    }
    if (next === "completed") {
      if (etaIntervalRef.current) clearInterval(etaIntervalRef.current);
      setEtaSeconds(0);
      setShowCompleted(true);
      completeFirstRide().catch(() => {});
    }
  }

  function startCarAnimation(p: LivePhase) {
    if (!rideData) return;
    const { pickup, dropoff } = rideData;
    const driverLat = pickup.lat + 0.018;
    const driverLng = pickup.lng - 0.014;
    const fromLat = p === "assigned" ? driverLat : pickup.lat;
    const fromLng = p === "assigned" ? driverLng : pickup.lng;
    const toLat = p === "assigned" ? pickup.lat : dropoff.lat;
    const toLng = p === "assigned" ? pickup.lng : dropoff.lng;
    const steps = p === "assigned" ? 40 : 60;
    const interval = p === "assigned" ? 500 : 400;
    let step = 0;
    setCarLat(fromLat);
    setCarLng(fromLng);
    carIntervalRef.current = setInterval(() => {
      step += 1;
      const t = Math.min(step / steps, 1);
      setCarLat(lerp(fromLat, toLat, t));
      setCarLng(lerp(fromLng, toLng, t));
      if (step >= steps && carIntervalRef.current) clearInterval(carIntervalRef.current);
    }, interval);
  }

  function updateRideStatus(next: "arrived" | "ongoing" | "completed") {
    if (!rideId) return;
    if (next === "arrived") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (supabase) {
        supabase.from("ride_requests").update({ status: "arrived" }).eq("id", rideId).then(() => {});
      }
      return;
    }
    if (next === "ongoing") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (supabase) {
        supabase.from("ride_requests").update({ status: "ongoing" }).eq("id", rideId).then(() => {});
      }
      transitionTo("ongoing");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (supabase) {
      supabase.from("ride_requests").update({ status: "completed" }).eq("id", rideId).then(() => {});
    }
    transitionTo("completed");
  }

  async function sendChat(text: string) {
    if (!rideId) return;
    const message = { id: `m-${Date.now()}`, role: "driver" as const, text, ts: Date.now() };
    setMessages((prev) => [...prev, message]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (supabase) {
      await supabase.from("ride_chat_messages").insert({
        ride_id: rideId,
        sender: "driver",
        message: text,
        created_at: new Date().toISOString(),
      });
      if (chatTopupRef.current === 0) {
        chatTopupRef.current = 1;
      }
    }
  }

  function handleBackToHome() {
    cleanup();
    clearActiveRide();
    router.replace("/(tabs)");
  }

  if (!rideData) return null;

  const { driver, pickup, dropoff, totalFare, offeredPrice } = rideData;
  const etaMins = Math.ceil(etaSeconds / 60);
  const etaSecs = etaSeconds % 60;
  const etaDisplay = `${etaMins}:${etaSecs.toString().padStart(2, "0")}`;
  const carCoord = carLat != null && carLng != null ? { lat: carLat, lng: carLng } : null;
  const primaryLabel = phase === "assigned" ? "Arrived at Pickup" : phase === "ongoing" ? "Complete Ride" : "Complete Ride";

  return (
    <View style={styles.root}>
      <RideMapFull pickup={pickup} dropoff={phase !== "assigned" ? dropoff : undefined} carPosition={carCoord} style={StyleSheet.absoluteFill} />

      <View style={[styles.topBar, { paddingTop: topPad, paddingHorizontal: 20 }]}> 
        <TouchableOpacity style={styles.backBtn} onPress={handleBackToHome} activeOpacity={0.8}>
          <Feather name="arrow-left" size={20} color="#FFD700" />
        </TouchableOpacity>
        <View style={[styles.statusBadge, phase === "ongoing" && styles.badgeOngoing, phase === "completed" && styles.badgeDone]}>
          <View style={[styles.statusDot, phase === "ongoing" && { backgroundColor: "#22C55E" }, phase === "completed" && { backgroundColor: "#FFD700" }]} />
          <Text style={styles.statusText}>{phase === "assigned" ? "DRIVER ARRIVING" : phase === "ongoing" ? "EN ROUTE" : "COMPLETED"}</Text>
        </View>
        <CommunicationHub onOpenChat={() => setShowChat(true)} />
      </View>

      <View style={[styles.panel, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 24 : 16) }]}>
        <View style={styles.dragHandle} />
        <RideProgressBar phase={phase} />
        <View style={styles.panelDivider} />

        {phase === "assigned" && (
          <View style={styles.content}>
            <View style={styles.contentHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.phaseTitle}>Navigation to Pickup</Text>
                <Text style={styles.phaseSub} numberOfLines={1}>{driver.name}{driver.vehicleModel ? ` · ${driver.vehicleModel}` : ""}</Text>
              </View>
              {driver.plate && <View style={styles.plateBadge}><Text style={styles.plateText}>{driver.plate}</Text></View>}
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}><Feather name="clock" size={16} color="#FFD700" /><Text style={styles.statValue}>{etaDisplay}</Text><Text style={styles.statLabel}>ETA</Text></View>
              <View style={styles.statSep} />
              <View style={styles.statItem}><Feather name="star" size={16} color="#FFD700" /><Text style={styles.statValue}>{driver.rating.toFixed(1)}</Text><Text style={styles.statLabel}>Rating</Text></View>
              <View style={styles.statSep} />
              <View style={styles.statItem}><Feather name="credit-card" size={16} color="#FFD700" /><Text style={styles.statValue}>{totalFare > 0 ? `${totalFare.toLocaleString()}` : `${offeredPrice.toLocaleString()}`}</Text><Text style={styles.statLabel}>PKR</Text></View>
            </View>
            <View style={styles.routeRow}>
              <View style={styles.routePoint}><View style={[styles.routeDot, { backgroundColor: "#FFD700" }]} /><Text style={styles.routeLabel} numberOfLines={1}>{pickup.name ?? "Pickup"}</Text></View>
              <Feather name="arrow-right" size={14} color="#444" style={{ marginHorizontal: 8 }} />
              <View style={styles.routePoint}><View style={[styles.routeDot, { backgroundColor: "#22C55E" }]} /><Text style={styles.routeLabel} numberOfLines={1}>{dropoff.name ?? "Destination"}</Text></View>
            </View>
          </View>
        )}

        {phase === "ongoing" && (
          <View style={styles.content}>
            <View style={styles.contentHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.phaseTitle}>You're on the way</Text>
                <Text style={styles.phaseSub} numberOfLines={1}>To <Text style={{ color: GOLD }}>{dropoff.name ?? "Destination"}</Text></Text>
              </View>
              <View style={styles.liveIndicator}><View style={styles.liveDot} /><Text style={styles.liveText}>LIVE</Text></View>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}><Feather name="clock" size={16} color="#FFD700" /><Text style={styles.statValue}>{etaDisplay}</Text><Text style={styles.statLabel}>Arrival</Text></View>
              <View style={styles.statSep} />
              <View style={styles.statItem}><Feather name="user" size={16} color="#FFD700" /><Text style={styles.statValue}>{driver.name.split(" ")[0]}</Text><Text style={styles.statLabel}>Driver</Text></View>
              <View style={styles.statSep} />
              <View style={styles.statItem}><Feather name="dollar-sign" size={16} color="#FFD700" /><Text style={styles.statValue}>{totalFare > 0 ? totalFare.toLocaleString() : offeredPrice.toLocaleString()}</Text><Text style={styles.statLabel}>PKR</Text></View>
            </View>
            <View style={styles.routeRow}>
              <View style={styles.routePoint}><View style={[styles.routeDot, { backgroundColor: "#FFD700" }]} /><Text style={styles.routeLabel} numberOfLines={1}>{pickup.name ?? "Pickup"}</Text></View>
              <Feather name="arrow-right" size={14} color="#444" style={{ marginHorizontal: 8 }} />
              <View style={styles.routePoint}><View style={[styles.routeDot, { backgroundColor: "#22C55E" }]} /><Text style={styles.routeLabel} numberOfLines={1}>{dropoff.name ?? "Destination"}</Text></View>
            </View>
          </View>
        )}

        {phase === "completed" && (
          <View style={styles.content}>
            <Text style={styles.phaseTitle}>Ride completed</Text>
            <Text style={styles.phaseSub}>Safe travels confirmed.</Text>
          </View>
        )}

        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.9} onPress={() => updateRideStatus(phase === "assigned" ? "arrived" : phase === "ongoing" ? "completed" : "completed")}>
          <Text style={styles.actionBtnText}>{primaryLabel}</Text>
        </TouchableOpacity>
      </View>

      <ChatModal visible={showChat} onClose={() => setShowChat(false)} messages={messages} onSend={sendChat} />
      {showCompleted && <RideCompletedModal totalFare={totalFare > 0 ? totalFare : offeredPrice} offeredPrice={offeredPrice} rideTypeLabel={rideData.rideTypeLabel} paymentMethod={rideData.paymentMethod} onBackToHome={handleBackToHome} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  topBar: { position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 12, zIndex: 10 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.72)", borderWidth: 1, borderColor: "rgba(255,215,0,0.25)", alignItems: "center", justifyContent: "center" },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(0,0,0,0.72)", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: "rgba(255,215,0,0.25)" },
  badgeOngoing: { borderColor: "rgba(34,197,94,0.4)" },
  badgeDone: { borderColor: "rgba(255,215,0,0.5)" },
  statusDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#FFD700" },
  statusText: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: 1.2 },
  commsRow: { flexDirection: "row", gap: 8 },
  commIcon: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.72)", borderWidth: 1, borderColor: GOLD_DIM },
  panel: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(8,8,8,0.97)", borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: "rgba(255,215,0,0.12)", paddingTop: 10, paddingHorizontal: 20 },
  dragHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(255,215,0,0.25)", alignSelf: "center", marginBottom: 4 },
  panelDivider: { height: 1, backgroundColor: "rgba(255,215,0,0.08)", marginBottom: 14 },
  content: { gap: 14, paddingBottom: 4 },
  contentHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  phaseTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: 0.2 },
  phaseSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#666", marginTop: 3 },
  plateBadge: { backgroundColor: "#fff", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 },
  plateText: { fontSize: 12, fontFamily: "Inter_700Bold", color: "#000", letterSpacing: 1 },
  statsRow: { flexDirection: "row", backgroundColor: "#111", borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,215,0,0.1)", padding: 14, alignItems: "center" },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statValue: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#555", letterSpacing: 0.5 },
  statSep: { width: 1, height: 36, backgroundColor: "rgba(255,215,0,0.1)" },
  liveIndicator: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(34,197,94,0.1)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: "rgba(34,197,94,0.3)" },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#22C55E" },
  liveText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#22C55E", letterSpacing: 1 },
  routeRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#111", borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)", padding: 12 },
  routePoint: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  routeDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  routeLabel: { fontSize: 12, color: "#fff", fontFamily: "Inter_500Medium" },
  actionBtn: { marginTop: 14, borderRadius: 18, backgroundColor: GOLD, paddingVertical: 18, alignItems: "center", shadowColor: GOLD, shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 0 } },
  actionBtnText: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#050505", letterSpacing: 1.1 },
  chatBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.72)", justifyContent: "flex-end" },
  chatSheet: { backgroundColor: "#060606", borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: "rgba(255,215,0,0.15)", padding: 16, gap: 12, maxHeight: SCREEN_H * 0.74 },
  chatHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  chatTitle: { color: "#fff", fontSize: 20, fontFamily: "Inter_700Bold" },
  chatClose: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.08)" },
  chatScroll: { flex: 1 },
  chatScrollContent: { gap: 10, paddingVertical: 4 },
  bubble: { maxWidth: "84%", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10 },
  driverBubble: { alignSelf: "flex-end", backgroundColor: GOLD },
  userBubble: { alignSelf: "flex-start", backgroundColor: "#111", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  bubbleText: { fontSize: 14, fontFamily: "Inter_500Medium", lineHeight: 20 },
  driverBubbleText: { color: "#050505" },
  userBubbleText: { color: "#fff" },
  quickRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quickChip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: "rgba(255,215,0,0.08)", borderWidth: 1, borderColor: "rgba(255,215,0,0.18)" },
  quickChipText: { color: GOLD, fontSize: 12, fontFamily: "Inter_700Bold" },
  chatComposer: { flexDirection: "row", alignItems: "center", gap: 10 },
  chatInput: { flex: 1, height: 48, borderRadius: 14, backgroundColor: "#111", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", paddingHorizontal: 14, color: "#fff" },
  chatSend: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: GOLD },
});