import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
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
import { useColors } from "@/hooks/useColors";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN ?? "";
const GOLD = "#C9A84C";
const GOLD_BRIGHT = "#FFD700";

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = "user" | "assistant";

interface ChatMessage {
  id: string;
  role: Role;
  text: string;
  ts: number;
}

const QUICK_ACTIONS = [
  { id: "ride",    label: "Report a Ride Issue",  icon: "navigation" as const, prompt: "I have an issue with a recent ride." },
  { id: "payment", label: "Payment Problem",       icon: "credit-card" as const, prompt: "I'm having a payment or wallet problem." },
  { id: "okbond",  label: "How to use OKBOND?",   icon: "star" as const,        prompt: "How does OKBOND work and how do I earn points?" },
];

// ── Pulsing Sphere ──────────────────────────────────────────────────────────

function MarcusSphere({ thinking }: { thinking: boolean }) {
  const pulse1 = useRef(new Animated.Value(1)).current;
  const pulse2 = useRef(new Animated.Value(1)).current;
  const glow   = useRef(new Animated.Value(0.4)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (thinking) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse1, { toValue: 1.18, duration: 700, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
          Animated.timing(pulse1, { toValue: 1,    duration: 700, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        ]),
      ).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse2, { toValue: 1.34, duration: 1100, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
          Animated.timing(pulse2, { toValue: 1,    duration: 1100, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        ]),
      ).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(glow,   { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(glow,   { toValue: 0.4, duration: 800, useNativeDriver: true }),
        ]),
      ).start();
      Animated.loop(
        Animated.timing(rotate, { toValue: 1, duration: 3000, useNativeDriver: true, easing: Easing.linear }),
      ).start();
    } else {
      pulse1.stopAnimation(); pulse1.setValue(1);
      pulse2.stopAnimation(); pulse2.setValue(1);
      glow.stopAnimation();   glow.setValue(0.4);
      rotate.stopAnimation(); rotate.setValue(0);
    }
  }, [thinking, pulse1, pulse2, glow, rotate]);

  const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <View style={styles.sphereWrap}>
      <Animated.View style={[styles.sphereRing2, { opacity: thinking ? glow : 0.15, transform: [{ scale: pulse2 }] }]} />
      <Animated.View style={[styles.sphereRing1, { opacity: thinking ? glow : 0.3,  transform: [{ scale: pulse1 }] }]} />
      <Animated.View style={[styles.sphereCore, { transform: [{ rotate: spin }] }]}>
        <View style={styles.sphereShine} />
        <Text style={styles.sphereM}>M</Text>
      </Animated.View>
    </View>
  );
}

// ── Chat Bubble ─────────────────────────────────────────────────────────────

function Bubble({ msg }: { msg: ChatMessage }) {
  const colors = useColors();
  const isUser = msg.role === "user";
  return (
    <View style={[styles.bubbleRow, isUser && styles.bubbleRowUser]}>
      {!isUser && (
        <View style={[styles.bubbleAvatar, { backgroundColor: "rgba(201,168,76,0.12)", borderColor: "rgba(201,168,76,0.3)" }]}>
          <Text style={[styles.bubbleAvatarText, { color: GOLD }]}>M</Text>
        </View>
      )}
      <View style={[
        styles.bubble,
        isUser
          ? { backgroundColor: GOLD, borderBottomRightRadius: 4 }
          : { backgroundColor: "#111111", borderColor: "rgba(201,168,76,0.15)", borderWidth: 1, borderBottomLeftRadius: 4 },
      ]}>
        <Text style={[styles.bubbleText, { color: isUser ? "#050505" : "#EEEEEE" }]}>
          {msg.text}
        </Text>
        <Text style={[styles.bubbleTime, { color: isUser ? "rgba(0,0,0,0.45)" : colors.mutedForeground }]}>
          {new Date(msg.ts).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit", hour12: true })}
        </Text>
      </View>
    </View>
  );
}

// ── Typing indicator ────────────────────────────────────────────────────────

function TypingIndicator() {
  const d1 = useRef(new Animated.Value(0)).current;
  const d2 = useRef(new Animated.Value(0)).current;
  const d3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = (v: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(v, { toValue: -5, duration: 300, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0,  duration: 300, useNativeDriver: true }),
          Animated.delay(400),
        ]),
      );
    Animated.parallel([anim(d1, 0), anim(d2, 160), anim(d3, 320)]).start();
  }, [d1, d2, d3]);

  return (
    <View style={styles.bubbleRow}>
      <View style={[styles.bubbleAvatar, { backgroundColor: "rgba(201,168,76,0.12)", borderColor: "rgba(201,168,76,0.3)" }]}>
        <Text style={[styles.bubbleAvatarText, { color: GOLD }]}>M</Text>
      </View>
      <View style={[styles.bubble, { backgroundColor: "#111111", borderColor: "rgba(201,168,76,0.15)", borderWidth: 1, borderBottomLeftRadius: 4 }]}>
        <View style={styles.typingDots}>
          {[d1, d2, d3].map((d, i) => (
            <Animated.View key={i} style={[styles.typingDot, { backgroundColor: GOLD, transform: [{ translateY: d }] }]} />
          ))}
        </View>
      </View>
    </View>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function SupportScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token, user } = useAuth();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 16);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Hello! I'm Marcus, your OTC concierge. I can help with rides, bookings, wallet, OKBOND, and more. How can I assist you today?",
      ts: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [escalating, setEscalating] = useState(false);
  const [escalated, setEscalated] = useState(false);
  const [showQuick, setShowQuick] = useState(true);
  const scrollRef = useRef<ScrollView>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, thinking, scrollToBottom]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || thinking) return;
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", text: text.trim(), ts: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setThinking(true);
    setShowQuick(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const history = messages
      .filter((m) => m.id !== "welcome")
      .map((m) => ({ role: m.role, text: m.text }));

    try {
      const res = await fetch(`${API_BASE}/api/otc/marcus/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: text.trim(), history }),
      });
      const data = await res.json() as { reply?: string; error?: string };
      const reply = data.reply ?? "I apologize — I'm having trouble connecting right now. Please try again or escalate to an Orakzai Executive.";
      setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: "assistant", text: reply, ts: Date.now() }]);
    } catch {
      setMessages((prev) => [...prev, {
        id: `a-err-${Date.now()}`, role: "assistant",
        text: "Connection issue. Please check your internet or escalate to an Orakzai Executive.",
        ts: Date.now(),
      }]);
    } finally {
      setThinking(false);
    }
  }, [thinking, messages, token]);

  const escalateToHuman = useCallback(async () => {
    if (!token || !user?.id || escalating) return;
    setEscalating(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.text ?? "Escalation from Marcus AI";
    try {
      await fetch(`${API_BASE}/api/otc/support/ticket`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          category: "marcus_escalation",
          subject: "Escalated from Marcus AI",
          message: lastUserMsg,
        }),
      });
    } catch { /* silent — ticket creation best-effort */ }
    setMessages((prev) => [...prev, {
      id: `esc-${Date.now()}`, role: "assistant",
      text: "I've raised a ticket for an Orakzai Executive to contact you. Our team will reach out to you shortly. Is there anything else I can help with in the meantime?",
      ts: Date.now(),
    }]);
    setEscalated(true);
    setEscalating(false);
  }, [token, user?.id, escalating, messages]);

  return (
    <View style={[styles.root, { backgroundColor: "#000000" }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad, borderBottomColor: "rgba(201,168,76,0.12)" }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={GOLD_BRIGHT} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <MarcusSphere thinking={thinking} />
          <View>
            <Text style={styles.headerTitle}>Marcus AI</Text>
            <View style={styles.headerStatus}>
              <View style={[styles.onlineDot, { backgroundColor: thinking ? GOLD : "#34C759" }]} />
              <Text style={[styles.headerStatusText, { color: colors.mutedForeground }]}>
                {thinking ? "Thinking…" : "Online · OTC Concierge"}
              </Text>
            </View>
          </View>
        </View>
        <View style={{ width: 34 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={0}>
        <ScrollView
          ref={scrollRef}
          style={styles.chatScroll}
          contentContainerStyle={[
            styles.chatContent,
            { paddingBottom: insets.bottom + (Platform.OS === "web" ? 24 : 100) },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Quick Actions */}
          {showQuick && (
            <View style={styles.quickSection}>
              <Text style={[styles.quickLabel, { color: colors.mutedForeground }]}>QUICK ACTIONS</Text>
              <View style={styles.quickGrid}>
                {QUICK_ACTIONS.map((qa) => (
                  <TouchableOpacity
                    key={qa.id}
                    style={[styles.quickCard, { backgroundColor: "#0D0D0D", borderColor: "rgba(201,168,76,0.2)" }]}
                    onPress={() => sendMessage(qa.prompt)}
                    activeOpacity={0.82}
                  >
                    <View style={[styles.quickIcon, { backgroundColor: "rgba(201,168,76,0.1)" }]}>
                      <Feather name={qa.icon} size={14} color={GOLD} />
                    </View>
                    <Text style={[styles.quickText, { color: "#FFFFFF" }]}>{qa.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Messages */}
          <View style={styles.messageList}>
            {messages.map((msg) => <Bubble key={msg.id} msg={msg} />)}
            {thinking && <TypingIndicator />}
          </View>

          {/* Escalation */}
          {!escalated && messages.length > 3 && (
            <View style={styles.escalateSection}>
              <View style={[styles.escalateDivider, { backgroundColor: "rgba(201,168,76,0.12)" }]} />
              <TouchableOpacity
                style={[styles.escalateBtn, { borderColor: "rgba(201,168,76,0.35)", backgroundColor: "rgba(201,168,76,0.07)" }]}
                onPress={escalateToHuman}
                disabled={escalating}
                activeOpacity={0.85}
              >
                {escalating ? (
                  <ActivityIndicator color={GOLD} size="small" />
                ) : (
                  <Feather name="user-check" size={15} color={GOLD} />
                )}
                <Text style={[styles.escalateBtnText, { color: GOLD }]}>
                  {escalating ? "Connecting…" : "Talk to Orakzai Executive"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={[
          styles.inputBar,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 20 : 12), borderTopColor: "rgba(201,168,76,0.1)", backgroundColor: "#000000" },
        ]}>
          <View style={[styles.inputWrap, { backgroundColor: "#0D0D0D", borderColor: "rgba(201,168,76,0.2)" }]}>
            <TextInput
              style={[styles.input, { color: "#FFFFFF" }]}
              value={input}
              onChangeText={setInput}
              placeholder="Ask Marcus anything…"
              placeholderTextColor="#444444"
              multiline
              maxLength={500}
              onSubmitEditing={() => sendMessage(input)}
              blurOnSubmit={false}
            />
            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: input.trim() && !thinking ? GOLD : "#1A1A1A" }]}
              onPress={() => sendMessage(input)}
              disabled={!input.trim() || thinking}
              activeOpacity={0.85}
            >
              <Feather name="send" size={16} color={input.trim() && !thinking ? "#050505" : "#444444"} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1,
  },
  backBtn: { padding: 4, width: 34 },
  headerCenter: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  headerStatus: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  onlineDot: { width: 7, height: 7, borderRadius: 4 },
  headerStatusText: { fontSize: 11, fontFamily: "Inter_400Regular" },

  // Sphere
  sphereWrap: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  sphereRing2: {
    position: "absolute", width: 44, height: 44, borderRadius: 22,
    borderWidth: 1, borderColor: GOLD,
  },
  sphereRing1: {
    position: "absolute", width: 36, height: 36, borderRadius: 18,
    borderWidth: 1, borderColor: GOLD,
  },
  sphereCore: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: GOLD, alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  sphereShine: {
    position: "absolute", top: 4, left: 6, width: 10, height: 6,
    borderRadius: 5, backgroundColor: "rgba(255,255,255,0.35)",
  },
  sphereM: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#050505" },

  // Chat
  chatScroll: { flex: 1 },
  chatContent: { paddingHorizontal: 16, paddingTop: 18, gap: 0 },

  // Quick actions
  quickSection: { marginBottom: 20, gap: 10 },
  quickLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.5, textTransform: "uppercase" },
  quickGrid: { gap: 8 },
  quickCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 12, borderWidth: 1, padding: 13,
  },
  quickIcon: { width: 34, height: 34, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  quickText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },

  // Messages
  messageList: { gap: 12 },
  bubbleRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, maxWidth: "100%" },
  bubbleRowUser: { flexDirection: "row-reverse" },
  bubbleAvatar: {
    width: 28, height: 28, borderRadius: 14, borderWidth: 1,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  bubbleAvatarText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  bubble: {
    maxWidth: "78%", padding: 12, borderRadius: 16, gap: 4,
  },
  bubbleText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21 },
  bubbleTime: { fontSize: 10, fontFamily: "Inter_400Regular", alignSelf: "flex-end" },

  // Typing
  typingDots: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 4 },
  typingDot: { width: 7, height: 7, borderRadius: 4 },

  // Escalation
  escalateSection: { marginTop: 20, gap: 14, alignItems: "center" },
  escalateDivider: { width: "100%", height: 1 },
  escalateBtn: {
    flexDirection: "row", alignItems: "center", gap: 9,
    borderRadius: 14, borderWidth: 1, paddingHorizontal: 20, paddingVertical: 13,
  },
  escalateBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },

  // Input
  inputBar: { paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1 },
  inputWrap: {
    flexDirection: "row", alignItems: "flex-end", gap: 10,
    borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8,
  },
  input: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", maxHeight: 100, paddingVertical: 4 },
  sendBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
});
