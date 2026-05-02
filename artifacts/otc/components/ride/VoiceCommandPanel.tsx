import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";

const VOICE_SUGGESTIONS = [
  "Book a Sovereign to DHA Phase 2",
  "Take me to Karachi Airport",
  "Autonomous ride to Clifton Block 5",
  "Community ride to Saddar",
  "Book Sovereign to Dolmen Mall",
  "Autonomous to PECHS Block 2",
];

const FALLBACK_DESTINATIONS: Record<string, string> = {
  "dha phase 2": "DHA Phase 2",
  "karachi airport": "Karachi Airport",
  "clifton block 5": "Clifton Block 5",
  saddar: "Saddar",
  "dolmen mall": "Dolmen Mall",
  "pechs block 2": "PECHS Block 2",
  "gulshan": "Gulshan-e-Iqbal",
  "north nazimabad": "North Nazimabad",
  korangi: "Korangi",
  "bahria": "Bahria Town",
};

const CLASS_KEYWORDS: Record<string, string> = {
  sovereign: "sovereign",
  autonomous: "autonomous",
  community: "community",
};

interface ParsedCommand {
  destination: string;
  rideClass: "sovereign" | "autonomous" | "community" | null;
}

function localParse(cmd: string): ParsedCommand {
  const lower = cmd.toLowerCase();
  let destination = "";
  let rideClass: ParsedCommand["rideClass"] = null;
  for (const [key, val] of Object.entries(FALLBACK_DESTINATIONS)) {
    if (lower.includes(key)) { destination = val; break; }
  }
  for (const [key, val] of Object.entries(CLASS_KEYWORDS)) {
    if (lower.includes(key)) { rideClass = val as ParsedCommand["rideClass"]; break; }
  }
  return { destination, rideClass };
}

async function parseCommand(command: string): Promise<ParsedCommand> {
  return localParse(command);
}

interface VoiceCommandPanelProps {
  onParsed: (
    destination: string,
    rideClass?: "sovereign" | "autonomous" | "community"
  ) => void;
  onDismiss: () => void;
}

export function VoiceCommandPanel({ onParsed, onDismiss }: VoiceCommandPanelProps) {
  const colors = useColors();
  const [active, setActive] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [displayText, setDisplayText] = useState("");
  const [phase, setPhase] = useState<"idle" | "listening" | "processing" | "done">("idle");
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnim1 = useRef(new Animated.Value(0.3)).current;
  const waveAnim2 = useRef(new Animated.Value(0.3)).current;
  const waveAnim3 = useRef(new Animated.Value(0.3)).current;
  const typeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (active) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
      Animated.loop(
        Animated.stagger(100, [
          Animated.sequence([
            Animated.timing(waveAnim1, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(waveAnim1, { toValue: 0.3, duration: 400, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(waveAnim2, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(waveAnim2, { toValue: 0.3, duration: 400, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(waveAnim3, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(waveAnim3, { toValue: 0.3, duration: 400, useNativeDriver: true }),
          ]),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
      waveAnim1.setValue(0.3);
      waveAnim2.setValue(0.3);
      waveAnim3.setValue(0.3);
    }
  }, [active, pulseAnim, waveAnim1, waveAnim2, waveAnim3]);

  async function processCommand(command: string) {
    setPhase("listening");
    setActive(true);
    setTranscript("");
    setDisplayText("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    let i = 0;
    await new Promise<void>((resolve) => {
      function typeChar() {
        if (i <= command.length) {
          setDisplayText(command.slice(0, i));
          i++;
          typeTimeout.current = setTimeout(typeChar, 30 + Math.random() * 20);
        } else {
          resolve();
        }
      }
      typeChar();
    });

    setActive(false);
    setTranscript(command);

    setPhase("processing");

    try {
      const parsed = await parseCommand(command);
      setPhase("done");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => {
        if (parsed.destination) {
          onParsed(parsed.destination, parsed.rideClass ?? undefined);
        }
      }, 700);
    } catch {
      const fallback = localParse(command);
      setPhase("done");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => {
        if (fallback.destination) {
          onParsed(fallback.destination, fallback.rideClass ?? undefined);
        }
      }, 700);
    }
  }

  function handleSuggestion(cmd: string) {
    if (typeTimeout.current) clearTimeout(typeTimeout.current);
    processCommand(cmd);
  }

  return (
    <View
      style={[
        styles.panel,
        {
          backgroundColor: "rgba(5,5,5,0.97)",
          borderColor: colors.glassBorder,
          borderRadius: colors.radius,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Feather name="mic" size={18} color={colors.gold} />
          <Text style={[styles.title, { color: colors.foreground }]}>
            Voice Command
          </Text>
        </View>
        <TouchableOpacity onPress={onDismiss}>
          <Feather name="x" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <View style={styles.micArea}>
        {active ? (
          <View style={styles.waveRow}>
            <Animated.View
              style={[
                styles.bar,
                {
                  height: waveAnim1.interpolate({
                    inputRange: [0.3, 1],
                    outputRange: [10, 28],
                  }),
                  backgroundColor: colors.gold,
                },
              ]}
            />
            <Animated.View
              style={[
                styles.bar,
                {
                  height: waveAnim2.interpolate({
                    inputRange: [0.3, 1],
                    outputRange: [14, 36],
                  }),
                  backgroundColor: colors.gold,
                },
              ]}
            />
            <Animated.View
              style={[
                styles.bar,
                {
                  height: waveAnim3.interpolate({
                    inputRange: [0.3, 1],
                    outputRange: [10, 28],
                  }),
                  backgroundColor: colors.gold,
                },
              ]}
            />
            <Animated.View
              style={[
                styles.bar,
                {
                  height: waveAnim2.interpolate({
                    inputRange: [0.3, 1],
                    outputRange: [8, 24],
                  }),
                  backgroundColor: colors.gold,
                },
              ]}
            />
            <Animated.View
              style={[
                styles.bar,
                {
                  height: waveAnim1.interpolate({
                    inputRange: [0.3, 1],
                    outputRange: [12, 30],
                  }),
                  backgroundColor: colors.gold,
                },
              ]}
            />
          </View>
        ) : phase === "processing" ? (
          <Text style={[styles.processing, { color: colors.mutedForeground }]}>
            Processing...
          </Text>
        ) : phase === "done" ? (
          <View style={styles.doneRow}>
            <Feather name="check-circle" size={20} color="#22C55E" />
            <Text style={[styles.doneText, { color: "#22C55E" }]}>
              Command Recognized
            </Text>
          </View>
        ) : (
          <Text style={[styles.idle, { color: colors.mutedForeground }]}>
            Tap a command below
          </Text>
        )}

        {displayText || transcript ? (
          <Text style={[styles.transcript, { color: colors.foreground }]}>
            "{displayText || transcript}"
          </Text>
        ) : null}
      </View>

      <Text style={[styles.suggestionsLabel, { color: colors.mutedForeground }]}>
        Suggestions
      </Text>
      <View style={styles.suggestions}>
        {VOICE_SUGGESTIONS.map((cmd, i) => (
          <TouchableOpacity
            key={i}
            style={[
              styles.chip,
              { borderColor: colors.glassBorder, borderRadius: 20 },
            ]}
            onPress={() => handleSuggestion(cmd)}
            activeOpacity={0.7}
          >
            <Feather name="mic" size={12} color={colors.gold} />
            <Text style={[styles.chipText, { color: colors.foreground }]}>
              {cmd}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderWidth: 1, padding: 16, gap: 14 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  aiBadge: {
    backgroundColor: "rgba(255,215,0,0.12)",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.3)",
  },
  aiBadgeText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: "#FFD700",
    letterSpacing: 0.5,
  },
  micArea: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 60,
    gap: 10,
  },
  waveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 40,
  },
  bar: { width: 4, borderRadius: 2 },
  processing: { fontSize: 13, fontFamily: "Inter_400Regular" },
  aiRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  aiSpinner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#FFD700",
    borderTopColor: "transparent",
  },
  doneRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  doneText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  idle: { fontSize: 13, fontFamily: "Inter_400Regular" },
  transcript: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    fontStyle: "italic",
    paddingHorizontal: 8,
  },
  suggestionsLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  suggestions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 6,
  },
  chipText: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
