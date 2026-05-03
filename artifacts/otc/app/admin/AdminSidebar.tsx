import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const GOLD = "#FFD700";
const BG = "#050505";

export const ADMIN_NAV_ITEMS = [
  { key: "overview", label: "Overview", icon: "grid" as const, route: "/admin" },
  { key: "drivers", label: "Driver Verification", icon: "shield" as const, route: "/admin/drivers" },
  { key: "rides", label: "Ride Ledger", icon: "map" as const, route: "/admin/rides" },
  { key: "users", label: "Users", icon: "users" as const, route: "/admin/users" },
  { key: "rentals", label: "Rentals", icon: "key" as const, route: "/admin/rentals" },
  { key: "hotels", label: "Hotels", icon: "home" as const, route: "/admin/hotels" },
  { key: "flights", label: "Flights", icon: "send" as const, route: "/admin/flights" },
  { key: "financials", label: "Financials", icon: "dollar-sign" as const, route: "/admin" },
] as const;

type NavKey = typeof ADMIN_NAV_ITEMS[number]["key"];

export function AdminSidebar({ activeKey, topPad }: { activeKey: NavKey; topPad: number }) {
  return (
    <View style={[styles.root, { paddingTop: topPad }]}>
      <Text style={styles.brand}>ORAKZAI</Text>
      <Text style={styles.brandSub}>Command Center</Text>
      {ADMIN_NAV_ITEMS.map((item) => {
        const active = item.key === activeKey;
        return (
          <TouchableOpacity
            key={item.key}
            style={[styles.navItem, active && styles.navItemActive]}
            onPress={() => { if (!active) router.push(item.route as never); }}
            activeOpacity={0.8}
          >
            <Feather name={item.icon} size={15} color={active ? BG : GOLD} />
            <Text style={[styles.navText, active && styles.navTextActive]}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
        <Feather name="arrow-left" size={14} color="#666" />
        <Text style={styles.backText}>Exit Admin</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: 200, borderRightWidth: 1, borderRightColor: "rgba(255,215,0,0.10)", paddingHorizontal: 14, backgroundColor: "#070707", gap: 6 },
  brand: { color: GOLD, fontSize: 18, fontFamily: "Inter_700Bold", letterSpacing: 2, marginBottom: 2 },
  brandSub: { color: "#6A6A6A", fontSize: 10, textTransform: "uppercase", letterSpacing: 2, marginBottom: 10 },
  navItem: { flexDirection: "row", alignItems: "center", gap: 9, paddingVertical: 11, paddingHorizontal: 11, borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,215,0,0.07)", backgroundColor: "rgba(255,255,255,0.02)" },
  navItemActive: { backgroundColor: GOLD, borderColor: GOLD },
  navText: { color: "#E0E0E0", fontSize: 12, fontFamily: "Inter_500Medium", flex: 1 },
  navTextActive: { color: BG, fontFamily: "Inter_700Bold" },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: "auto", paddingVertical: 12, paddingHorizontal: 11 },
  backText: { color: "#555", fontSize: 12 },
});