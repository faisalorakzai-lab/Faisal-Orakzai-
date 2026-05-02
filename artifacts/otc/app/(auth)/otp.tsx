import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
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

const OTP_LENGTH = 6;

export default function OTPScreen() {
  const insets = useSafeAreaInsets();
  const { pendingPhone, pendingCountry, login } = useAuth();
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(30);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  function handleOtpChange(val: string) {
    const digits = val.replace(/\D/g, "").slice(0, OTP_LENGTH);
    setOtp(digits);
    setError("");
    if (digits.length === OTP_LENGTH) {
      handleVerify(digits);
    }
  }

  async function handleVerify(code?: string) {
    const toVerify = code ?? otp;
    if (toVerify.length < OTP_LENGTH) return;
    setIsLoading(true);
    setError("");
    try {
      await login(pendingPhone, toVerify);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Verification failed";
      setError(msg);
      setOtp("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  }

  const dialCode = pendingCountry?.dialCode ?? "+92";
  const maskedPhone = pendingPhone
    ? pendingPhone.slice(0, 3) + "****" + pendingPhone.slice(-3)
    : "your phone";

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
        </View>

        <View style={styles.formSection}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Feather name="arrow-left" size={20} color="#FFD700" />
          </TouchableOpacity>

          <Text style={styles.title}>Verify OTP</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit code sent to{"\n"}
            <Text style={styles.phoneText}>
              {dialCode} {maskedPhone}
            </Text>
          </Text>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => inputRef.current?.focus()}
          >
            <View style={styles.dotsRow}>
              {Array.from({ length: OTP_LENGTH }).map((_, i) => {
                const filled = i < otp.length;
                const active = i === otp.length && !isLoading;
                return (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      {
                        borderColor: error
                          ? "#EF4444"
                          : filled
                          ? "#FFD700"
                          : active
                          ? "rgba(255,215,0,0.5)"
                          : "rgba(255,255,255,0.1)",
                        backgroundColor: filled
                          ? "rgba(255,215,0,0.08)"
                          : "#0A0A0A",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dotText,
                        { color: filled ? "#FFD700" : "transparent" },
                      ]}
                    >
                      {filled ? "•" : "0"}
                    </Text>
                  </View>
                );
              })}
            </View>
          </TouchableOpacity>

          <TextInput
            ref={inputRef}
            style={styles.hiddenInput}
            value={otp}
            onChangeText={handleOtpChange}
            keyboardType="number-pad"
            maxLength={OTP_LENGTH}
            autoFocus
          />

          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}

          <TouchableOpacity
            style={[
              styles.btn,
              {
                backgroundColor:
                  otp.length === OTP_LENGTH && !isLoading
                    ? "#FFD700"
                    : "#1A1A1A",
              },
            ]}
            onPress={() => handleVerify()}
            activeOpacity={0.85}
            disabled={isLoading || otp.length < OTP_LENGTH}
          >
            {isLoading ? (
              <ActivityIndicator color="#000000" />
            ) : (
              <Text
                style={[
                  styles.btnText,
                  {
                    color:
                      otp.length === OTP_LENGTH
                        ? "#000000"
                        : "rgba(255,255,255,0.2)",
                  },
                ]}
              >
                Verify & Continue
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.resendRow}>
            {countdown > 0 ? (
              <Text style={styles.resendText}>
                Resend in{" "}
                <Text style={{ color: "#FFD700" }}>{countdown}s</Text>
              </Text>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  setCountdown(30);
                  setOtp("");
                  setError("");
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={[styles.resendText, { color: "#FFD700" }]}>
                  Resend OTP
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View />
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
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: "#FFD700",
    marginTop: 12,
  },
  backBtn: { alignSelf: "flex-start", padding: 4, marginBottom: 8 },
  formSection: { gap: 18 },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.4)",
    lineHeight: 22,
  },
  phoneText: {
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 4,
  },
  dot: {
    flex: 1,
    height: 64,
    borderWidth: 1.5,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  dotText: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  hiddenInput: {
    position: "absolute",
    opacity: 0,
    width: 1,
    height: 1,
  },
  errorText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#EF4444",
    textAlign: "center",
    marginTop: -6,
  },
  btn: {
    height: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  resendRow: { alignItems: "center" },
  resendText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.3)",
  },
});
