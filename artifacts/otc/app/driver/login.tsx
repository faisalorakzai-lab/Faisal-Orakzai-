import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
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
import { useDriverAuth } from "@/contexts/DriverAuthContext";

const GOLD = "#C9A84C";
const GOLD_BRIGHT = "#FFD700";

type Step = "phone" | "otp";

export default function DriverLoginScreen() {
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 24);
  const { requestOtp, verifyOtp } = useDriverAuth();

  const [step,     setStep]     = useState<Step>("phone");
  const [phone,    setPhone]    = useState("");
  const [otp,      setOtp]      = useState("");
  const [demoOtp,  setDemoOtp]  = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const otpRef = useRef<TextInput>(null);

  async function handlePhoneSubmit() {
    if (phone.replace(/\D/g, "").length < 10) {
      setError("Enter a valid phone number"); return;
    }
    setLoading(true); setError("");
    const result = await requestOtp(phone.trim());
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    if (result.demoOtp) setDemoOtp(result.demoOtp);
    setStep("otp");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => otpRef.current?.focus(), 300);
  }

  async function handleOtpSubmit() {
    if (otp.length !== 6) { setError("Enter the 6-digit OTP"); return; }
    setLoading(true); setError("");
    const result = await verifyOtp(phone.trim(), otp);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace("/driver");
  }

  return (
    <KeyboardAvoidingView style={[styles.root, { backgroundColor: "#000000" }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPad, paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo / Brand */}
        <View style={styles.brandWrap}>
          <View style={[styles.logoBox, { borderColor: "rgba(201,168,76,0.3)", backgroundColor: "rgba(201,168,76,0.07)" }]}>
            <Text style={styles.logoText}>🚗</Text>
          </View>
          <View style={[styles.brandBadge, { backgroundColor: "rgba(201,168,76,0.08)", borderColor: "rgba(201,168,76,0.2)" }]}>
            <Text style={[styles.brandBadgeText, { color: GOLD }]}>OTC DRIVER PORTAL</Text>
          </View>
          <Text style={styles.brandTitle}>Driver Login</Text>
          <Text style={[styles.brandSub, { color: "#777777" }]}>
            {step === "phone"
              ? "Enter your registered mobile number to continue."
              : `OTP sent to ${phone}. Enter below to verify.`}
          </Text>
        </View>

        {/* Demo OTP notice */}
        {step === "otp" && demoOtp && (
          <View style={[styles.demoBanner, { backgroundColor: "rgba(201,168,76,0.08)", borderColor: "rgba(201,168,76,0.25)" }]}>
            <Feather name="info" size={14} color={GOLD} />
            <Text style={[styles.demoBannerText, { color: GOLD }]}>
              Demo OTP: <Text style={{ fontFamily: "Inter_700Bold" }}>{demoOtp}</Text>
            </Text>
          </View>
        )}

        {step === "phone" ? (
          <View style={styles.formCard}>
            <Text style={[styles.fieldLabel, { color: "#888888" }]}>MOBILE NUMBER</Text>
            <View style={[styles.field, { borderColor: phone.length > 0 ? GOLD : "rgba(255,255,255,0.1)", backgroundColor: "#0D0D0D" }]}>
              <Text style={[styles.fieldPrefix, { color: GOLD }]}>+92</Text>
              <View style={[styles.fieldSep, { backgroundColor: "rgba(201,168,76,0.25)" }]} />
              <TextInput
                style={[styles.fieldInput, { color: "#FFFFFF" }]}
                value={phone}
                onChangeText={(t) => { setPhone(t); setError(""); }}
                placeholder="3XX XXX XXXX"
                placeholderTextColor="#444444"
                keyboardType="phone-pad"
                maxLength={15}
                autoFocus
                onSubmitEditing={handlePhoneSubmit}
              />
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: phone.length >= 10 && !loading ? GOLD : "#1A1A1A" }]}
              onPress={handlePhoneSubmit}
              disabled={loading || phone.length < 10}
              activeOpacity={0.88}
            >
              {loading
                ? <ActivityIndicator color="#FFFFFF" />
                : <Text style={[styles.submitBtnText, { color: phone.length >= 10 ? "#050505" : "#555555" }]}>Send OTP</Text>
              }
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.formCard}>
            <Text style={[styles.fieldLabel, { color: "#888888" }]}>VERIFICATION CODE</Text>
            <View style={[styles.field, { borderColor: otp.length > 0 ? GOLD : "rgba(255,255,255,0.1)", backgroundColor: "#0D0D0D" }]}>
              <Feather name="shield" size={16} color={GOLD} />
              <TextInput
                ref={otpRef}
                style={[styles.otpInput, { color: "#FFFFFF" }]}
                value={otp}
                onChangeText={(t) => { setOtp(t.replace(/\D/g, "").slice(0, 6)); setError(""); }}
                placeholder="000000"
                placeholderTextColor="#444444"
                keyboardType="number-pad"
                maxLength={6}
                onSubmitEditing={handleOtpSubmit}
              />
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: otp.length === 6 && !loading ? GOLD : "#1A1A1A" }]}
              onPress={handleOtpSubmit}
              disabled={loading || otp.length !== 6}
              activeOpacity={0.88}
            >
              {loading
                ? <ActivityIndicator color="#FFFFFF" />
                : <Text style={[styles.submitBtnText, { color: otp.length === 6 ? "#050505" : "#555555" }]}>Verify & Login</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity style={styles.resendBtn} onPress={() => { setStep("phone"); setOtp(""); setError(""); }} activeOpacity={0.8}>
              <Text style={[styles.resendText, { color: "#666666" }]}>← Change number</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={[styles.footerNote, { color: "#444444" }]}>
          Only registered OTC drivers can access this portal.{"\n"}Contact Orakzai Services to register.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 28, gap: 0 },
  brandWrap: { alignItems: "center", gap: 12, marginBottom: 36 },
  logoBox: { width: 88, height: 88, borderRadius: 24, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  logoText: { fontSize: 42 },
  brandBadge: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, borderWidth: 1,
  },
  brandBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  brandTitle: { fontSize: 32, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  brandSub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20, maxWidth: 280 },
  demoBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 16,
  },
  demoBannerText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  formCard: { gap: 14 },
  fieldLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.5, textTransform: "uppercase" },
  field: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
  },
  fieldPrefix: { fontSize: 17, fontFamily: "Inter_700Bold" },
  fieldSep: { width: 1, height: 20 },
  fieldInput: { flex: 1, fontSize: 17, fontFamily: "Inter_500Medium" },
  otpInput: { flex: 1, fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: 8, textAlign: "center" },
  submitBtn: { borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  submitBtnText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  resendBtn: { alignItems: "center", paddingVertical: 4 },
  resendText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#FF3B30" },
  footerNote: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18, marginTop: 36 },
});
