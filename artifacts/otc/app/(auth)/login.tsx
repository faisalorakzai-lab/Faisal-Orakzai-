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
import {
  CountryPicker,
  COUNTRIES,
  type Country,
} from "@/components/auth/CountryPicker";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { setPendingPhone, setPendingCountry } = useAuth();
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]);
  const [pickerVisible, setPickerVisible] = useState(false);
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

  function handleCountrySelect(country: Country) {
    setSelectedCountry(country);
    setPhone("");
    setError("");
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  const digits = phone.replace(/\D/g, "");
  const phoneValid = digits.length >= 7;

  async function handleContinue() {
    if (!phoneValid) {
      setError("Please enter a valid phone number");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    setPendingPhone(digits);
    setPendingCountry(selectedCountry);
    setIsLoading(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push("/(auth)/otp");
  }

  return (
    <>
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
            <Text style={styles.title}>Enter your phone</Text>
            <Text style={styles.subtitle}>
              We'll send a verification code to log you in
            </Text>

            <View
              style={[
                styles.inputRow,
                {
                  borderColor: error
                    ? "#EF4444"
                    : phone
                    ? "#FFD700"
                    : "rgba(255,215,0,0.15)",
                },
              ]}
            >
              <TouchableOpacity
                style={styles.countryBtn}
                onPress={() => {
                  setPickerVisible(true);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                activeOpacity={0.75}
              >
                <Text style={styles.flagEmoji}>{selectedCountry.flag}</Text>
                <Text style={styles.dialCode}>{selectedCountry.dialCode}</Text>
                <Feather
                  name="chevron-down"
                  size={14}
                  color="rgba(255,215,0,0.5)"
                />
              </TouchableOpacity>

              <View style={styles.inputDivider} />

              <TextInput
                ref={inputRef}
                style={styles.input}
                placeholder="300-000-0000"
                placeholderTextColor="rgba(255,255,255,0.2)"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={handlePhoneChange}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleContinue}
              />
            </View>

            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : null}

            <TouchableOpacity
              style={[
                styles.btn,
                { backgroundColor: phoneValid ? "#FFD700" : "#1A1A1A" },
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
                      {
                        color: phoneValid
                          ? "#000000"
                          : "rgba(255,255,255,0.25)",
                      },
                    ]}
                  >
                    Send OTP
                  </Text>
                  <Feather
                    name="arrow-right"
                    size={18}
                    color={phoneValid ? "#000000" : "rgba(255,255,255,0.25)"}
                  />
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.hint}>
              Demo OTP:{" "}
              <Text style={{ color: "#FFD700", fontFamily: "Inter_600SemiBold" }}>
                123456
              </Text>
            </Text>
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

      <CountryPicker
        visible={pickerVisible}
        selected={selectedCountry}
        onSelect={handleCountrySelect}
        onClose={() => setPickerVisible(false)}
      />
    </>
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
    fontSize: 28,
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
  formSection: { gap: 12 },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.4)",
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0A0A0A",
    borderWidth: 1.5,
    borderRadius: 12,
    height: 56,
    overflow: "hidden",
  },
  countryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    height: "100%",
  },
  flagEmoji: { fontSize: 20 },
  dialCode: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,215,0,0.85)",
    minWidth: 32,
  },
  inputDivider: {
    width: 1,
    height: 22,
    backgroundColor: "rgba(255,215,0,0.12)",
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: "#FFFFFF",
    letterSpacing: 0.5,
    paddingHorizontal: 14,
  },
  errorText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#EF4444",
  },
  btn: {
    height: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  btnInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  btnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  hint: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.25)",
    textAlign: "center",
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
