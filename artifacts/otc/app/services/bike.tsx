import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const GOLD = "#FFD700";

export default function BikeDeliveryScreen() {
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 16);
  const [live, setLive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setLive((v) => (v + 1) % 4), 1400);
    return () => clearInterval(t);
  }, []);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: topPad, paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}><Feather name="arrow-left" size={22} color={GOLD} /></TouchableOpacity>
        <Text style={styles.title}>Bike Delivery</Text>
        <Text style={styles.sub}>Fast city runs · live rider dispatch</Text>
        <View style={styles.card}><Text style={styles.cardTitle}>Riders online</Text><Text style={styles.cardValue}>{12 + live}</Text></View>
        <View style={styles.card}><Text style={styles.cardTitle}>Avg pickup</Text><Text style={styles.cardValue}>3 mins</Text></View>
        <TouchableOpacity style={styles.cta} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/services/delivery"); }} activeOpacity={0.85}><Text style={styles.ctaText}>Book Delivery</Text></TouchableOpacity>
        <View style={styles.loadingRow}><ActivityIndicator color={GOLD} /><Text style={styles.loadingText}>Live dispatch enabled</Text></View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  scroll: { paddingHorizontal: 18, gap: 14 },
  backBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,215,0,0.15)", alignItems: "center", justifyContent: "center" },
  title: { color: "#fff", fontSize: 28, fontFamily: "Inter_700Bold" },
  sub: { color: "#777", fontSize: 13, fontFamily: "Inter_500Medium" },
  card: { backgroundColor: "#111", borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,215,0,0.12)", padding: 16 },
  cardTitle: { color: "#888", fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1.2 },
  cardValue: { color: GOLD, fontSize: 24, fontFamily: "Inter_700Bold", marginTop: 6 },
  cta: { height: 54, borderRadius: 16, backgroundColor: GOLD, alignItems: "center", justifyContent: "center" },
  ctaText: { color: "#000", fontFamily: "Inter_700Bold", fontSize: 15 },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  loadingText: { color: "#777", fontFamily: "Inter_500Medium" },
});
