import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { OTCLogo } from "@/components/OTCLogo";
import { useAuth } from "@/contexts/AuthContext";
import { useReferral } from "@/contexts/ReferralContext";

export default function ProfileSetupScreen() {
  const insets = useSafeAreaInsets();
  const { setupProfile } = useAuth();
  const { applyReferralCode } = useReferral();
  const [name, setName] = useState("");
  const [refCode, setRefCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [refMsg, setRefMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const inputRef = useRef<TextInput>(null);
  const refInputRef = useRef<TextInput>(null);

  const nameValid = name.trim().length >= 2;

  async function handleContinue() {
    if (!nameValid) {
      setError("Please enter your full name");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      await setupProfile(name.trim());
      // Apply referral code if entered (fire-and-forget after profile saved)
      if (refCode.trim().length >= 6) {
        applyReferralCode(refCode.trim().toUpperCase()).catch(() => {});
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    } catch {
      setError("Something went wrong. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View
        style={[
          styles.container,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 60),
            paddingBottom: insets.bottom + 40,
          },
        ]}
      >
        <View style={styles.header}>
          <OTCLogo size="lg" />
          <Text style={styles.brand}>OTC Super App</Text>
          <Text style={styles.tagline}>Orakzai Transport Corporation</Text>
        </View>

        <View style={styles.formSection}>
          <View style={styles.iconBadge}>
            <Feather name="user" size={28} color="#FFD700" />
          </View>

          <Text style={styles.title}>Create your profile</Text>
          <Text style={styles.subtitle}>
            How should we address you?
          </Text>

          <View
            style={[
              styles.inputWrapper,
              {
                borderColor: error
                  ? "#EF4444"
                  : name
                  ? "#FFD700"
                  : "rgba(255,215,0,0.15)",
              },
            ]}
          >
            <Feather
              name="user"
              size={18}
              color={name ? "#FFD700" : "rgba(255,255,255,0.25)"}
            />
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor="rgba(255,255,255,0.25)"
              value={name}
              onChangeText={(v) => {
                setName(v);
                setError("");
              }}
              autoFocus
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => refInputRef.current?.focus()}
            />
          </View>

          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}

          {/* Referral Code Input */}
          <View style={styles.refRow}>
            <View
              style={[
                styles.inputWrapper,
                {
                  flex: 1,
                  borderColor: refMsg
                    ? refMsg.ok
                      ? "#22C55E"
                      : "#EF4444"
                    : refCode
                    ? "#FFD700"
                    : "rgba(255,215,0,0.12)",
                },
              ]}
            >
              <Feather
                name="tag"
                size={16}
                color={refCode ? "#FFD700" : "rgba(255,255,255,0.2)"}
              />
              <TextInput
                ref={refInputRef}
                style={[styles.input, { letterSpacing: 1.5, fontSize: 14 }]}
                placeholder="Referral Code (optional)"
                placeholderTextColor="rgba(255,255,255,0.18)"
                value={refCode}
                onChangeText={(v) => {
                  setRefCode(v.toUpperCase());
                  setRefMsg(null);
                }}
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleContinue}
              />
            </View>
          </View>
          {refMsg ? (
            <Text style={[styles.errorText, { color: refMsg.ok ? "#22C55E" : "#EF4444" }]}>
              {refMsg.text}
            </Text>
          ) : (
            <Text style={styles.refHint}>
              Have a referral code? Get 10 bonus OTC Coins after your first ride.
            </Text>
          )}

          <TouchableOpacity
            style={[
              styles.btn,
              { backgroundColor: nameValid ? "#FFD700" : "#1A1A1A" },
            ]}
            onPress={handleContinue}
            activeOpacity={0.85}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#000000" />
            ) : (
              <View style={styles.btnInner}>
                <Text
                  style={[
                    styles.btnText,
                    { color: nameValid ? "#000000" : "rgba(255,255,255,0.25)" },
                  ]}
                >
                  Enter OTC
                </Text>
                <Feather
                  name="arrow-right"
                  size={18}
                  color={nameValid ? "#000000" : "rgba(255,255,255,0.25)"}
                />
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.walletHint}>
            <Feather name="star" size={13} color="rgba(255,215,0,0.6)" />
            <Text style={styles.walletHintText}>
              10 OTC Coins credited to your wallet on entry
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By continuing, you agree to OTC's{"\n"}
            <Text style={{ color: "#FFD700" }}>Terms of Service</Text> &{" "}
            <Text style={{ color: "#FFD700" }}>Privacy Policy</Text>
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000000" },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
  header: { alignItems: "center", gap: 8 },
  brand: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: "#FFD700",
    letterSpacing: 0.5,
    marginTop: 12,
  },
  tagline: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,215,0,0.4)",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  formSection: { gap: 16 },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "rgba(255,215,0,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.2)",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.4)",
    marginTop: -6,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    height: 56,
    backgroundColor: "#0A0A0A",
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  errorText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#EF4444",
    marginTop: -6,
  },
  btn: {
    height: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  btnInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  btnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  refRow: { flexDirection: "row", gap: 10 },
  refHint: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,215,0,0.4)",
    marginTop: -6,
  },
  walletHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    justifyContent: "center",
  },
  walletHintText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,215,0,0.5)",
  },
  footer: { alignItems: "center" },
  footerText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.25)",
    textAlign: "center",
    lineHeight: 18,
  },
});
