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
import { useColors } from "@/hooks/useColors";

const OTP_LENGTH = 4;

export default function OTPScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { pendingPhone, login } = useAuth();
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
      router.replace("/(tabs)");
    } catch (e: any) {
      setError(e.message ?? "Verification failed");
      setOtp("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  }

  const maskedPhone = pendingPhone
    ? pendingPhone.slice(0, 4) + "-***-" + pendingPhone.slice(-4)
    : "your phone";

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View
        style={[
          styles.container,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 60),
            paddingBottom: insets.bottom + 34,
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
            <Feather name="arrow-left" size={20} color={colors.gold} />
          </TouchableOpacity>

          <Text style={[styles.title, { color: colors.foreground }]}>
            Verify OTP
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Enter the 4-digit code sent to{"\n"}
            <Text style={{ color: colors.foreground }}>{maskedPhone}</Text>
          </Text>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => inputRef.current?.focus()}
          >
            <View style={styles.dotsRow}>
              {Array.from({ length: OTP_LENGTH }).map((_, i) => {
                const filled = i < otp.length;
                const active = i === otp.length;
                return (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      {
                        borderColor: filled
                          ? colors.gold
                          : active
                          ? colors.gold
                          : colors.border,
                        backgroundColor: filled
                          ? "rgba(255,215,0,0.12)"
                          : colors.input,
                        borderRadius: colors.radius / 2,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dotText,
                        { color: filled ? colors.gold : "transparent" },
                      ]}
                    >
                      {filled ? otp[i] : "0"}
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
            <Text style={[styles.errorText, { color: colors.destructive }]}>
              {error}
            </Text>
          ) : null}

          <TouchableOpacity
            style={[
              styles.btn,
              {
                backgroundColor:
                  otp.length === OTP_LENGTH ? colors.primary : colors.muted,
                borderRadius: colors.radius,
              },
            ]}
            onPress={() => handleVerify()}
            activeOpacity={0.8}
            disabled={isLoading || otp.length < OTP_LENGTH}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text
                style={[
                  styles.btnText,
                  {
                    color:
                      otp.length === OTP_LENGTH
                        ? colors.primaryForeground
                        : colors.mutedForeground,
                  },
                ]}
              >
                Verify & Continue
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.resendRow}>
            {countdown > 0 ? (
              <Text style={[styles.resendText, { color: colors.mutedForeground }]}>
                Resend in{" "}
                <Text style={{ color: colors.gold }}>{countdown}s</Text>
              </Text>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  setCountdown(30);
                  setOtp("");
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={[styles.resendText, { color: colors.gold }]}>
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
  root: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
  header: {
    alignItems: "center",
    gap: 8,
  },
  brand: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: "#FFD700",
    marginTop: 12,
  },
  backBtn: {
    alignSelf: "flex-start",
    padding: 4,
    marginBottom: 8,
  },
  formSection: {
    gap: 16,
  },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginTop: 8,
  },
  dot: {
    width: 64,
    height: 72,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  dotText: {
    fontSize: 28,
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
    textAlign: "center",
  },
  btn: {
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  btnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  resendRow: {
    alignItems: "center",
  },
  resendText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
});
