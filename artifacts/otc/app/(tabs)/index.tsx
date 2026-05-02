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
  { id: "ride",     label: "Ride",        sub: "Premium Cars",   icon: "car-sports",     route: "/services/ride",    active: true  },
  { id: "bike",     label: "Bike",        sub: "Fast Mobility",  icon: "motorbike",      route: "/services/bike",    active: false },
  { id: "delivery", label: "Delivery",    sub: "Logistics",      icon: "package-variant",route: "/services/delivery",active: true  },
  { id: "rental",   label: "Rent A Car",  sub: "Elite Fleet",    icon: "car-key",        route: "/services/rental",  active: true  },
  { id: "hotel",    label: "Hotels",      sub: "Luxury Stays",   icon: "bed-king-outline",route: "/services/hotel",  active: false },
  { id: "airlines", label: "Airlines",    sub: "Global Travel",  icon: "airplane",       route: "/services/airlines",active: false },
];

function ServiceTile({ pillar }: { pillar: ServicePillar }) {
  const glowAnim = useRef(new Animated.Value(0)).current;

  function handlePressIn() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.timing(glowAnim, {
      toValue: 1,
      duration: 120,
      useNativeDriver: true,
    }).start();
  }

  function handlePressOut() {
    Animated.timing(glowAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }

  function handlePress() {
    if (!pillar.active) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    router.push(pillar.route);
  }

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.18],
  });

  return (
    <Pressable
      style={styles.tileWrapper}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
    >
      <View
        style={[
          styles.tile,
          !pillar.active && styles.tileDisabled,
        ]}
      >
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.tileGlow,
            { opacity: glowOpacity },
          ]}
        />

        <View style={styles.iconWrap}>
          <MaterialCommunityIcons
            name={pillar.icon}
            size={32}
            color={pillar.active ? GOLD : "#555555"}
          />
        </View>

        <Text style={[styles.tileLabel, !pillar.active && styles.dimText]}>
          {pillar.label}
        </Text>
        <Text style={[styles.tileSub, !pillar.active && styles.dimText]}>
          {pillar.active ? pillar.sub : "Coming Soon"}
        </Text>

        {!pillar.active && (
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonText}>SOON</Text>
          </View>
        )}
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
  const initials = user?.name
    ? user.name.slice(0, 2).toUpperCase()
    : (user?.phone ?? "OT").slice(-2);

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: topPad + 16,
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 40 : 90),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── TOP BAR ── */}
        <View style={styles.topBar}>
          {/* Location */}
          <TouchableOpacity
            style={styles.locationRow}
            onPress={() => {}}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="map-marker"
              size={16}
              color={GOLD}
            />
            <View style={styles.locationText}>
              <Text style={styles.locationLabel}>Your Location</Text>
              <Text style={styles.locationCity} numberOfLines={1}>
                {isLoading ? "Detecting..." : city}
                {!isLoading && district ? `, ${district}` : ""}
              </Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-down"
              size={14}
              color="#555"
            />
          </TouchableOpacity>

          {/* Profile */}
          <TouchableOpacity
            style={styles.profileBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/(tabs)/profile");
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.profileInitials}>{initials}</Text>
          </TouchableOpacity>
        </View>

        {/* ── SEARCH BAR ── */}
        <TouchableOpacity
          style={styles.searchBar}
          activeOpacity={0.8}
          onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
        >
          <MaterialCommunityIcons name="magnify" size={20} color={GOLD} />
          <Text style={styles.searchPlaceholder}>Search OTC Services</Text>
        </TouchableOpacity>

        {/* ── WALLET STRIP ── */}
        <TouchableOpacity
          style={styles.walletStrip}
          onPress={() => router.push("/(tabs)/wallet")}
          activeOpacity={0.85}
        >
          <View style={styles.walletLeft}>
            <MaterialCommunityIcons name="star-circle" size={18} color={GOLD} />
            <Text style={styles.walletLabel}>OTC Coins</Text>
          </View>
          <Text style={styles.walletBalance}>{balance.toLocaleString()} coins</Text>
          <MaterialCommunityIcons name="chevron-right" size={16} color="#555" />
        </TouchableOpacity>

        {/* ── SERVICES HEADER ── */}
        <Text style={styles.sectionHeader}>OUR SERVICES</Text>

        {/* ── 6-PILLAR GRID ── */}
        <View style={styles.grid}>
          {PILLARS.map((p) => (
            <ServiceTile key={p.id} pillar={p} />
          ))}
        </View>

        {/* ── REFER STRIP ── */}
        <TouchableOpacity
          style={styles.referStrip}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/(tabs)/profile");
          }}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="gift-outline" size={20} color={GOLD} />
          <View style={styles.referText}>
            <Text style={styles.referTitle}>Refer & Earn OTC Coins</Text>
            <Text style={styles.referSub}>
              You earn 5 · Friends get 10 free coins
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={18} color={GOLD} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000000",
  },
  scroll: {
    paddingHorizontal: 18,
  },

  /* Top bar */
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  locationText: { flex: 1 },
  locationLabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: "#666",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  locationCity: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
    marginTop: 1,
  },
  profileBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,215,0,0.06)",
  },
  profileInitials: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: GOLD,
    letterSpacing: 0.5,
  },

  /* Search */
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: SEARCH_BG,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#222222",
  },
  searchPlaceholder: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: GOLD,
    opacity: 0.7,
    flex: 1,
  },

  /* Wallet strip */
  walletStrip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD_BG,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.15)",
    gap: 10,
  },
  walletLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  walletLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#AAAAAA",
  },
  walletBalance: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: GOLD,
  },

  /* Section header */
  sectionHeader: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "#444444",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 14,
  },

  /* Grid */
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  tileWrapper: {
    width: "47.5%",
  },
  tile: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1E1E1E",
    padding: 18,
    minHeight: 148,
    overflow: "hidden",
    gap: 8,
  },
  tileDisabled: {
    borderColor: "#161616",
  },
  tileGlow: {
    backgroundColor: GOLD,
    borderRadius: 16,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "rgba(255,215,0,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  tileLabel: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  tileSub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#666666",
    lineHeight: 15,
  },
  dimText: {
    color: "#444444",
  },
  comingSoonBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(255,215,0,0.08)",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.12)",
  },
  comingSoonText: {
    fontSize: 8,
    fontFamily: "Inter_700Bold",
    color: "#555555",
    letterSpacing: 0.8,
  },

  /* Refer strip */
  referStrip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.12)",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  referText: { flex: 1 },
  referTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  referSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#666666",
    marginTop: 2,
  },
});
