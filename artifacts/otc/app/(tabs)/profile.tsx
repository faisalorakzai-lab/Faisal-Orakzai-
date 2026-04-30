import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CoinBadge } from "@/components/CoinBadge";
import { GlassCard } from "@/components/GlassCard";
import { OTCLogo } from "@/components/OTCLogo";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/contexts/WalletContext";
import { useColors } from "@/hooks/useColors";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout, updateUser } = useAuth();
  const { balance } = useWallet();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(user?.name ?? "");
  const [copiedCode, setCopiedCode] = useState(false);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 16);

  async function handleCopyReferral() {
    if (!user?.referralCode) return;
    await Clipboard.setStringAsync(user.referralCode);
    setCopiedCode(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => setCopiedCode(false), 2000);
  }

  function handleSaveName() {
    const trimmed = nameInput.trim();
    if (trimmed) {
      updateUser({ name: trimmed });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setEditingName(false);
  }

  function handleLogout() {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          logout();
        },
      },
    ]);
  }

  const menuItems = [
    { icon: "bell", label: "Notifications", action: () => {} },
    { icon: "shield", label: "Privacy & Security", action: () => {} },
    { icon: "help-circle", label: "Help & Support", action: () => {} },
    { icon: "info", label: "About OTC", action: () => {} },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: topPad,
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 90),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>
          Profile
        </Text>

        <GlassCard variant="gold" style={styles.profileCard}>
          <View style={styles.profileTop}>
            <View
              style={[
                styles.avatar,
                {
                  backgroundColor: "rgba(255,215,0,0.15)",
                  borderColor: colors.gold,
                  borderRadius: 40,
                },
              ]}
            >
              <OTCLogo size="sm" />
            </View>
            <View style={styles.profileInfo}>
              {editingName ? (
                <View style={styles.nameEditRow}>
                  <TextInput
                    style={[
                      styles.nameInput,
                      {
                        color: colors.foreground,
                        backgroundColor: colors.input,
                        borderColor: colors.gold,
                        borderRadius: 8,
                      },
                    ]}
                    value={nameInput}
                    onChangeText={setNameInput}
                    placeholder="Your name"
                    placeholderTextColor={colors.mutedForeground}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={handleSaveName}
                  />
                  <TouchableOpacity onPress={handleSaveName}>
                    <Feather name="check" size={20} color={colors.gold} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.nameRow}
                  onPress={() => {
                    setNameInput(user?.name ?? "");
                    setEditingName(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.userName, { color: colors.foreground }]}>
                    {user?.name ?? "Tap to add name"}
                  </Text>
                  <Feather name="edit-2" size={14} color={colors.mutedForeground} />
                </TouchableOpacity>
              )}
              <Text style={[styles.userPhone, { color: colors.mutedForeground }]}>
                {user?.phone
                  ? `+92 ${user.phone.slice(0, 3)}-${user.phone.slice(3, 6)}-${user.phone.slice(6)}`
                  : "—"}
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.glassBorder }]} />

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <CoinBadge amount={balance} size="md" />
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                OTC Coins
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.glassBorder }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.foreground }]}>0</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                Rides
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.glassBorder }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.foreground }]}>0</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                Referrals
              </Text>
            </View>
          </View>
        </GlassCard>

        <GlassCard style={styles.referralCard}>
          <View style={styles.referralTop}>
            <Feather name="gift" size={20} color={colors.gold} />
            <Text style={[styles.referralTitle, { color: colors.foreground }]}>
              Your Referral Code
            </Text>
          </View>
          <View style={styles.referralCodeRow}>
            <Text style={[styles.referralCode, { color: colors.gold }]}>
              {user?.referralCode ?? "—"}
            </Text>
            <TouchableOpacity
              onPress={handleCopyReferral}
              style={[
                styles.copyBtn,
                {
                  backgroundColor: copiedCode
                    ? "rgba(34,197,94,0.15)"
                    : "rgba(255,215,0,0.12)",
                  borderRadius: 8,
                },
              ]}
              activeOpacity={0.8}
            >
              <Feather
                name={copiedCode ? "check" : "copy"}
                size={16}
                color={copiedCode ? colors.success : colors.gold}
              />
            </TouchableOpacity>
          </View>
          <Text style={[styles.referralDesc, { color: colors.mutedForeground }]}>
            Share your code — you earn{" "}
            <Text style={{ color: colors.gold }}>5 OTC Coins</Text>, they earn{" "}
            <Text style={{ color: colors.gold }}>10 OTC Coins</Text>
          </Text>
        </GlassCard>

        <View style={styles.menuSection}>
          {menuItems.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              style={[
                styles.menuItem,
                {
                  borderBottomColor: colors.border,
                  borderBottomWidth: idx < menuItems.length - 1 ? 1 : 0,
                },
              ]}
              onPress={item.action}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.menuIcon,
                  {
                    backgroundColor: "rgba(255,215,0,0.06)",
                    borderRadius: 8,
                  },
                ]}
              >
                <Feather name={item.icon as any} size={18} color={colors.gold} />
              </View>
              <Text style={[styles.menuLabel, { color: colors.foreground }]}>
                {item.label}
              </Text>
              <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.logoutBtn,
            {
              borderColor: colors.destructive,
              borderRadius: colors.radius,
            },
          ]}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Feather name="log-out" size={18} color={colors.destructive} />
          <Text style={[styles.logoutText, { color: colors.destructive }]}>
            Log Out
          </Text>
        </TouchableOpacity>

        <Text style={[styles.version, { color: colors.mutedForeground }]}>
          OTC Super App v1.0.0
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20, gap: 16 },
  screenTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  profileCard: {
    padding: 20,
    gap: 16,
  },
  profileTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  profileInfo: { flex: 1, gap: 6 },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  userName: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
  },
  nameEditRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  nameInput: {
    flex: 1,
    height: 36,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontSize: 16,
    fontFamily: "Inter_500Medium",
  },
  userPhone: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  statItem: {
    alignItems: "center",
    gap: 4,
  },
  statDivider: {
    width: 1,
    height: 32,
  },
  statValue: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  referralCard: {
    padding: 18,
    gap: 12,
  },
  referralTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  referralTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  referralCodeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  referralCode: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    flex: 1,
  },
  copyBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  referralDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  menuSection: {
    backgroundColor: "rgba(255,215,0,0.04)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.1)",
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 15,
    gap: 14,
  },
  menuIcon: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 52,
    borderWidth: 1,
    marginTop: 4,
  },
  logoutText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  version: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingVertical: 8,
  },
});
