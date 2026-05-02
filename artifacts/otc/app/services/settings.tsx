import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

const GOLD = "#C9A84C";
const GOLD_BRIGHT = "#FFD700";
const DANGER = "#FF3B30";

type Language = "en" | "ur";
type Theme = "dark" | "gold";

// ─── Row helpers ──────────────────────────────────────────────────────────────

function SettingRow({
  icon,
  label,
  value,
  onPress,
  danger,
  rightElement,
  subtitle,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  rightElement?: React.ReactNode;
  subtitle?: string;
}) {
  const colors = useColors();
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={onPress ? 0.75 : 1}
      disabled={!onPress && !rightElement}
    >
      <View style={[styles.rowIcon, { backgroundColor: danger ? "rgba(255,59,48,0.1)" : "rgba(201,168,76,0.08)", borderColor: danger ? "rgba(255,59,48,0.2)" : "rgba(201,168,76,0.2)" }]}>
        <Feather name={icon} size={15} color={danger ? DANGER : GOLD} />
      </View>
      <View style={{ flex: 1, gap: subtitle ? 2 : 0 }}>
        <Text style={[styles.rowLabel, { color: danger ? DANGER : "#FFFFFF" }]}>{label}</Text>
        {subtitle && <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>{subtitle}</Text>}
      </View>
      {value && <Text style={[styles.rowValue, { color: colors.mutedForeground }]}>{value}</Text>}
      {rightElement ?? null}
      {onPress && !rightElement && (
        <Feather name="chevron-right" size={15} color={danger ? DANGER : colors.mutedForeground} />
      )}
    </TouchableOpacity>
  );
}

function SectionHeader({ title }: { title: string }) {
  const colors = useColors();
  return (
    <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>{title}</Text>
  );
}

function Divider() {
  return <View style={[styles.divider, { backgroundColor: "rgba(255,255,255,0.05)" }]} />;
}

// ─── Edit Profile Modal ───────────────────────────────────────────────────────

function EditProfileModal({
  visible,
  initialName,
  initialPhone,
  onClose,
  onSave,
}: {
  visible: boolean;
  initialName: string;
  initialPhone: string;
  onClose: () => void;
  onSave: (name: string, phone: string) => void;
}) {
  const colors = useColors();
  const [name,  setName]  = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: "#0A0A0A" }]}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Edit Profile</Text>

          <View style={styles.fieldWrap}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>FULL NAME</Text>
            <View style={[styles.field, { borderColor: "rgba(201,168,76,0.25)", backgroundColor: "#111111" }]}>
              <Feather name="user" size={14} color={GOLD} />
              <TextInput
                style={[styles.fieldInput, { color: "#FFFFFF" }]}
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor="#444444"
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.fieldWrap}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>PHONE NUMBER</Text>
            <View style={[styles.field, { borderColor: "rgba(201,168,76,0.25)", backgroundColor: "#111111" }]}>
              <Feather name="phone" size={14} color={GOLD} />
              <TextInput
                style={[styles.fieldInput, { color: "#FFFFFF" }]}
                value={phone}
                onChangeText={setPhone}
                placeholder="+92 300 000 0000"
                placeholderTextColor="#444444"
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <TouchableOpacity style={[styles.saveBtn, { backgroundColor: GOLD }]} onPress={() => { onSave(name, phone); onClose(); }} activeOpacity={0.88}>
            <Text style={styles.saveBtnText}>Save Changes</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.cancelBtn, { borderColor: "rgba(255,255,255,0.1)" }]} onPress={onClose} activeOpacity={0.8}>
            <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 16);

  const [editOpen,    setEditOpen]    = useState(false);
  const [displayName, setDisplayName] = useState(user?.name ?? "OTC Member");
  const [phone,       setPhone]       = useState(user?.phone ?? "—");
  const [biometric,   setBiometric]   = useState(false);
  const [language,    setLanguage]    = useState<Language>("en");
  const [theme,       setTheme]       = useState<Theme>("dark");
  const [notifs,      setNotifs]      = useState(true);

  function handleDeleteAccount() {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to permanently delete your OTC account? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Alert.alert("Request Submitted", "Your account deletion request has been sent. Our team will process it within 48 hours.");
          },
        },
      ],
    );
  }

  function handleChangePin() {
    Alert.alert("Change PIN", "A PIN reset link will be sent to your registered phone number.", [{ text: "OK" }]);
  }

  function handleBiometric(val: boolean) {
    Haptics.selectionAsync();
    setBiometric(val);
    if (val) Alert.alert("Biometric Login", "Biometric authentication has been enabled.");
  }

  function handleLanguage(l: Language) {
    Haptics.selectionAsync();
    setLanguage(l);
    if (l === "ur") Alert.alert("زبان", "اردو سپورٹ جلد آ رہی ہے۔\nUrdu support coming soon.");
  }

  function handleTheme(t: Theme) {
    Haptics.selectionAsync();
    setTheme(t);
  }

  const initials = displayName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <>
      <ScrollView
        style={[styles.root, { backgroundColor: "#000000" }]}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPad, paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 120) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={GOLD_BRIGHT} />
        </TouchableOpacity>

        <View style={styles.pageHeader}>
          <View style={styles.headerBadge}>
            <Feather name="settings" size={10} color={GOLD} />
            <Text style={styles.headerBadgeText}>SETTINGS</Text>
          </View>
          <Text style={styles.pageTitle}>Settings & Privacy</Text>
        </View>

        {/* Profile Card */}
        <TouchableOpacity
          style={[styles.profileCard, { backgroundColor: "#0A0A0A", borderColor: "rgba(201,168,76,0.2)" }]}
          onPress={() => setEditOpen(true)}
          activeOpacity={0.88}
        >
          <View style={[styles.avatar, { backgroundColor: GOLD }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.profileName, { color: "#FFFFFF" }]}>{displayName}</Text>
            <Text style={[styles.profileSub, { color: colors.mutedForeground }]}>{phone}</Text>
          </View>
          <View style={[styles.editBadge, { backgroundColor: "rgba(201,168,76,0.1)", borderColor: "rgba(201,168,76,0.25)" }]}>
            <Feather name="edit-3" size={12} color={GOLD} />
            <Text style={[styles.editBadgeText, { color: GOLD }]}>Edit</Text>
          </View>
        </TouchableOpacity>

        {/* ── Profile Management ──────────────────────────────────────────── */}
        <SectionHeader title="PROFILE" />
        <View style={[styles.group, { backgroundColor: "#0A0A0A", borderColor: "rgba(255,255,255,0.06)" }]}>
          <SettingRow icon="user"  label="Name"         value={displayName} onPress={() => setEditOpen(true)} />
          <Divider />
          <SettingRow icon="phone" label="Phone Number" value={phone}       onPress={() => setEditOpen(true)} />
          <Divider />
          <SettingRow
            icon="image"
            label="Profile Picture"
            subtitle="Upload a photo from your gallery"
            onPress={() => Alert.alert("Profile Picture", "Photo upload coming in the next update.")}
          />
        </View>

        {/* ── Security ───────────────────────────────────────────────────── */}
        <SectionHeader title="SECURITY" />
        <View style={[styles.group, { backgroundColor: "#0A0A0A", borderColor: "rgba(255,255,255,0.06)" }]}>
          <SettingRow
            icon="lock"
            label="Change PIN / Password"
            subtitle="Reset your login credentials"
            onPress={handleChangePin}
          />
          <Divider />
          <SettingRow
            icon="cpu"
            label="Face ID / Fingerprint"
            subtitle="Use biometrics to log in"
            rightElement={
              <Switch
                value={biometric}
                onValueChange={handleBiometric}
                trackColor={{ false: "#2A2A2A", true: GOLD }}
                thumbColor={biometric ? "#050505" : "#888888"}
                ios_backgroundColor="#2A2A2A"
              />
            }
          />
        </View>

        {/* ── Notifications ──────────────────────────────────────────────── */}
        <SectionHeader title="NOTIFICATIONS" />
        <View style={[styles.group, { backgroundColor: "#0A0A0A", borderColor: "rgba(255,255,255,0.06)" }]}>
          <SettingRow
            icon="bell"
            label="Push Notifications"
            subtitle="Ride updates, booking confirmations"
            rightElement={
              <Switch
                value={notifs}
                onValueChange={(v) => { Haptics.selectionAsync(); setNotifs(v); }}
                trackColor={{ false: "#2A2A2A", true: GOLD }}
                thumbColor={notifs ? "#050505" : "#888888"}
                ios_backgroundColor="#2A2A2A"
              />
            }
          />
        </View>

        {/* ── Language & Theme ───────────────────────────────────────────── */}
        <SectionHeader title="LANGUAGE & THEME" />
        <View style={[styles.group, { backgroundColor: "#0A0A0A", borderColor: "rgba(255,255,255,0.06)" }]}>
          <View style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: "rgba(201,168,76,0.08)", borderColor: "rgba(201,168,76,0.2)" }]}>
              <Feather name="globe" size={15} color={GOLD} />
            </View>
            <Text style={[styles.rowLabel, { color: "#FFFFFF", flex: 1 }]}>Language</Text>
            <View style={[styles.segControl, { backgroundColor: "#1A1A1A", borderColor: "#333333" }]}>
              {(["en", "ur"] as Language[]).map((l) => (
                <TouchableOpacity
                  key={l}
                  style={[styles.segBtn, language === l && { backgroundColor: GOLD }]}
                  onPress={() => handleLanguage(l)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.segText, { color: language === l ? "#050505" : colors.mutedForeground }]}>
                    {l === "en" ? "EN" : "اردو"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <Divider />
          <View style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: "rgba(201,168,76,0.08)", borderColor: "rgba(201,168,76,0.2)" }]}>
              <Feather name="moon" size={15} color={GOLD} />
            </View>
            <Text style={[styles.rowLabel, { color: "#FFFFFF", flex: 1 }]}>Theme</Text>
            <View style={[styles.segControl, { backgroundColor: "#1A1A1A", borderColor: "#333333" }]}>
              {(["dark", "gold"] as Theme[]).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.segBtn, theme === t && { backgroundColor: t === "gold" ? GOLD : "#333333" }]}
                  onPress={() => handleTheme(t)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.segText, { color: theme === t ? (t === "gold" ? "#050505" : "#FFFFFF") : colors.mutedForeground }]}>
                    {t === "dark" ? "Dark" : "Gold"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* ── Support ────────────────────────────────────────────────────── */}
        <SectionHeader title="SUPPORT" />
        <View style={[styles.group, { backgroundColor: "#0A0A0A", borderColor: "rgba(255,255,255,0.06)" }]}>
          <SettingRow
            icon="message-circle"
            label="Chat with Marcus AI"
            subtitle="24/7 AI concierge support"
            onPress={() => router.push("/services/support")}
          />
        </View>

        {/* ── Legal & Privacy ────────────────────────────────────────────── */}
        <SectionHeader title="LEGAL & PRIVACY" />
        <View style={[styles.group, { backgroundColor: "#0A0A0A", borderColor: "rgba(255,255,255,0.06)" }]}>
          <SettingRow
            icon="file-text"
            label="Terms of Service"
            onPress={() => Linking.openURL("https://orakzaiservices.com/terms").catch(() => {})}
          />
          <Divider />
          <SettingRow
            icon="shield"
            label="Privacy Policy"
            onPress={() => Linking.openURL("https://orakzaiservices.com/privacy").catch(() => {})}
          />
          <Divider />
          <SettingRow
            icon="info"
            label="App Version"
            value="1.0.0"
          />
        </View>

        {/* ── Account Control ────────────────────────────────────────────── */}
        <SectionHeader title="ACCOUNT" />
        <View style={[styles.group, { backgroundColor: "#0A0A0A", borderColor: "rgba(255,255,255,0.06)" }]}>
          <SettingRow
            icon="log-out"
            label="Sign Out"
            onPress={() => {
              Alert.alert("Sign Out", "Are you sure you want to sign out?", [
                { text: "Cancel", style: "cancel" },
                { text: "Sign Out", style: "destructive", onPress: () => logout?.() },
              ]);
            }}
          />
          <Divider />
          <SettingRow
            icon="trash-2"
            label="Delete Account"
            subtitle="Permanently remove your data"
            danger
            onPress={handleDeleteAccount}
          />
        </View>

        <Text style={[styles.footer, { color: colors.mutedForeground }]}>
          OTC Super App · Orakzai Services{"\n"}
          Built with precision. Delivered with trust.
        </Text>
      </ScrollView>

      <EditProfileModal
        visible={editOpen}
        initialName={displayName}
        initialPhone={phone}
        onClose={() => setEditOpen(false)}
        onSave={(n, p) => { setDisplayName(n); setPhone(p); }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  backBtn: { alignSelf: "flex-start", padding: 4, marginBottom: 12 },

  pageHeader: { gap: 6, marginBottom: 20 },
  headerBadge: {
    flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start",
    backgroundColor: "rgba(201,168,76,0.08)", borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1,
    borderColor: "rgba(201,168,76,0.2)", marginBottom: 4,
  },
  headerBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold", color: GOLD, letterSpacing: 1.5 },
  pageTitle: { fontSize: 30, fontFamily: "Inter_700Bold", color: "#FFFFFF" },

  profileCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 24,
  },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#050505" },
  profileName: { fontSize: 16, fontFamily: "Inter_700Bold" },
  profileSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  editBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1,
  },
  editBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  sectionHeader: {
    fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.5,
    textTransform: "uppercase", marginBottom: 8, marginTop: 20, marginLeft: 4,
  },
  group: { borderRadius: 16, borderWidth: 1, overflow: "hidden", marginBottom: 4 },

  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  rowIcon: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  rowLabel: { fontSize: 14, fontFamily: "Inter_500Medium", flex: 1 },
  rowSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  rowValue: { fontSize: 13, fontFamily: "Inter_400Regular", maxWidth: 140 },
  divider: { height: 1, marginLeft: 62 },

  segControl: { flexDirection: "row", borderRadius: 8, borderWidth: 1, overflow: "hidden", gap: 0 },
  segBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  segText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  footer: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18, marginTop: 32, marginBottom: 8 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "flex-end" },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingTop: 12, gap: 14 },
  modalHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: "#333333", alignSelf: "center", marginBottom: 8 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  fieldWrap: { gap: 6 },
  fieldLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.2, textTransform: "uppercase" },
  field: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  fieldInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  saveBtn: { borderRadius: 14, paddingVertical: 15, alignItems: "center" },
  saveBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#050505" },
  cancelBtn: { borderRadius: 14, borderWidth: 1, paddingVertical: 13, alignItems: "center" },
  cancelBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
