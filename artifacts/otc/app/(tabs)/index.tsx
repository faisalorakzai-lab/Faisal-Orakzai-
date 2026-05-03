import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, type Href } from "expo-router";
import React, { useRef } from "react";
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "@/contexts/LocationContext";
import { useWallet } from "@/contexts/WalletContext";

const GOLD = "#FFD700";
const CARD_BG = "#111111";
const SEARCH_BG = "#181818";

interface ServicePillar {
  id: string;
  label: string;
  sub: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  route: Href;
  active: boolean;
}

const PILLARS: ServicePillar[] = [
  { id: "ride", label: "Ride", sub: "Premium Cars", icon: "car-sports", route: "/services/ride", active: true },
  { id: "bike", label: "Bike Delivery", sub: "Fast Mobility", icon: "motorbike", route: "/services/bike", active: true },
  { id: "delivery", label: "Delivery", sub: "Logistics", icon: "package-variant", route: "/services/delivery", active: true },
  { id: "rental", label: "Rent A Car", sub: "Elite Fleet", icon: "car-key", route: "/services/rental", active: true },
  { id: "hotel", label: "Hotels", sub: "Luxury Stays", icon: "bed-king-outline", route: "/services/hotel", active: true },
  { id: "airlines", label: "Airplane", sub: "Global Travel", icon: "airplane", route: "/services/flight", active: true },
];

function ServiceTile({ pillar }: { pillar: ServicePillar }) {
  const glowAnim = useRef(new Animated.Value(0)).current;

  function handlePressIn() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.timing(glowAnim, { toValue: 1, duration: 120, useNativeDriver: true }).start();
  }

  function handlePressOut() {
    Animated.timing(glowAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
  }

  function handlePress() {
    router.push(pillar.route);
  }

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.18] });

  return (
    <Pressable style={styles.tileWrapper} onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={handlePress}>
      <View style={[styles.tile, !pillar.active && styles.tileDisabled]}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.tileGlow, { opacity: glowOpacity }]} />
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name={pillar.icon} size={32} color={pillar.active ? GOLD : "#555555"} />
        </View>
        <Text style={[styles.tileLabel, !pillar.active && styles.dimText]}>{pillar.label}</Text>
        <Text style={[styles.tileSub, !pillar.active && styles.dimText]}>{pillar.sub}</Text>
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { balance } = useWallet();
  const { city, district, isLoading } = useLocation();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const initials = user?.name ? user.name.slice(0, 2).toUpperCase() : (user?.phone ?? "OT").slice(-2);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: topPad + 16, paddingBottom: insets.bottom + (Platform.OS === "web" ? 40 : 90) }]} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.locationRow} onPress={() => {}} activeOpacity={0.7}>
            <MaterialCommunityIcons name="map-marker" size={16} color={GOLD} />
            <View style={styles.locationText}>
              <Text style={styles.locationLabel}>Your Location</Text>
              <Text style={styles.locationCity} numberOfLines={1}>{isLoading ? "Detecting..." : city}{!isLoading && district ? `, ${district}` : ""}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-down" size={14} color="#555" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.profileBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/(tabs)/profile"); }} activeOpacity={0.8}>
            <Text style={styles.profileInitials}>{initials}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.searchBar} activeOpacity={0.8} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
          <MaterialCommunityIcons name="magnify" size={20} color={GOLD} />
          <Text style={styles.searchPlaceholder}>Search OTC Services</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.walletStrip} onPress={() => router.push("/(tabs)/wallet")} activeOpacity={0.85}>
          <View style={styles.walletLeft}>
            <MaterialCommunityIcons name="star-circle" size={18} color={GOLD} />
            <Text style={styles.walletLabel}>OTC Coins</Text>
          </View>
          <Text style={styles.walletBalance}>{balance.toLocaleString()} coins</Text>
          <MaterialCommunityIcons name="chevron-right" size={16} color="#555" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.bidStrip} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/services/bid-ride"); }} activeOpacity={0.85}>
          <View style={styles.bidIconWrap}><MaterialCommunityIcons name="gavel" size={22} color="#000" /></View>
          <View style={styles.referText}>
            <Text style={styles.bidStripTitle}>BID A RIDE</Text>
            <Text style={styles.referSub}>Name your price · Drivers counter in real-time</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={18} color={GOLD} />
        </TouchableOpacity>

        <Text style={styles.sectionHeader}>OUR SERVICES</Text>
        <View style={styles.grid}>{PILLARS.map((p) => <ServiceTile key={p.id} pillar={p} />)}</View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  scroll: { paddingHorizontal: 16 },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  locationRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: SEARCH_BG, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10, marginRight: 12 },
  locationText: { flex: 1 },
  locationLabel: { fontSize: 10, color: "#777", fontFamily: "Inter_600SemiBold" },
  locationCity: { fontSize: 13, color: "#fff", fontFamily: "Inter_700Bold" },
  profileBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: CARD_BG, borderWidth: 1, borderColor: "rgba(255,215,0,0.2)", alignItems: "center", justifyContent: "center" },
  profileInitials: { color: GOLD, fontFamily: "Inter_700Bold" },
  searchBar: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: SEARCH_BG, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 14 },
  searchPlaceholder: { color: "#777", fontFamily: "Inter_500Medium" },
  walletStrip: { flexDirection: "row", alignItems: "center", backgroundColor: CARD_BG, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "rgba(255,215,0,0.12)", marginBottom: 14 },
  walletLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  walletLabel: { color: "#fff", fontFamily: "Inter_700Bold" },
  walletBalance: { color: GOLD, fontFamily: "Inter_700Bold", marginRight: 8 },
  bidStrip: { flexDirection: "row", alignItems: "center", backgroundColor: GOLD, borderRadius: 18, padding: 14, marginBottom: 18 },
  bidIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", marginRight: 12 },
  bidStripTitle: { color: "#000", fontFamily: "Inter_700Bold" },
  referText: { flex: 1 },
  referSub: { color: "rgba(0,0,0,0.72)", fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 2 },
  sectionHeader: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 14, letterSpacing: 1.2, marginBottom: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  tileWrapper: { width: "48%" },
  tile: { backgroundColor: CARD_BG, borderRadius: 18, padding: 14, minHeight: 132, borderWidth: 1, borderColor: "rgba(255,215,0,0.12)" },
  tileDisabled: { opacity: 0.7 },
  tileGlow: { backgroundColor: "rgba(255,215,0,0.1)", borderRadius: 18 },
  iconWrap: { width: 48, height: 48, borderRadius: 14, backgroundColor: "rgba(255,215,0,0.08)", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  tileLabel: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 15 },
  tileSub: { color: "#9A9A9A", fontFamily: "Inter_500Medium", fontSize: 11, marginTop: 4 },
  dimText: { opacity: 0.7 },
});
