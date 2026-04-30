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
import { useColors } from "@/hooks/useColors";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { setPendingPhone } = useAuth();
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<TextInput>(null);

  function formatPhone(raw: string): string {
    const digits = raw.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 4) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
    return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  function handlePhoneChange(val: string) {
    setError("");
    setPhone(formatPhone(val));
  }

  async function handleContinue() {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      setError("Please enter a valid phone number");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setPendingPhone(digits);
    setIsLoading(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push("/(auth)/otp");
  }

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
          <Text style={styles.tagline}>
            Orakzai Transport Corporation
          </Text>
        </View>

        <View style={styles.formSection}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Enter your phone
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            We'll send a verification code to log you in
          </Text>

          <View
            style={[
              styles.inputRow,
              {
                backgroundColor: colors.input,
                borderColor: error ? colors.destructive : phone ? colors.gold : colors.border,
                borderRadius: colors.radius,
              },
            ]}
          >
            <View style={styles.flag}>
              <Text style={styles.flagText}>🇵🇰</Text>
              <Text style={[styles.dialCode, { color: colors.mutedForeground }]}>
                +92
              </Text>
            </View>
            <View style={styles.divider} />
            <TextInput
              ref={inputRef}
              style={[styles.input, { color: colors.foreground }]}
              placeholder="0300-000-0000"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={handlePhoneChange}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleContinue}
            />
          </View>

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
                  phone.replace(/\D/g, "").length >= 10
                    ? colors.primary
                    : colors.muted,
                borderRadius: colors.radius,
              },
            ]}
            onPress={handleContinue}
            activeOpacity={0.8}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <View style={styles.btnInner}>
                <Text
                  style={[
                    styles.btnText,
                    {
                      color:
                        phone.replace(/\D/g, "").length >= 10
                          ? colors.primaryForeground
                          : colors.mutedForeground,
                    },
                  ]}
                >
                  Send OTP
                </Text>
                <Feather
                  name="arrow-right"
                  size={18}
                  color={
                    phone.replace(/\D/g, "").length >= 10
                      ? colors.primaryForeground
                      : colors.mutedForeground
                  }
                />
              </View>
            )}
          </TouchableOpacity>

          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            Demo OTP: <Text style={{ color: colors.gold }}>1234</Text>
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            By continuing, you agree to OTC's{"\n"}
            <Text style={{ color: colors.gold }}>Terms of Service</Text> &{" "}
            <Text style={{ color: colors.gold }}>Privacy Policy</Text>
          </Text>
        </View>
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
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#FFD700",
    letterSpacing: 0.5,
    marginTop: 12,
  },
  tagline: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#8A8060",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  formSection: {
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    height: 56,
    paddingHorizontal: 16,
    gap: 12,
  },
  flag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  flagText: { fontSize: 20 },
  dialCode: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: "rgba(255,215,0,0.15)",
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.5,
  },
  errorText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  btn: {
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  btnInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  btnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  hint: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  footer: {
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 18,
  },
});
