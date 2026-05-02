import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassCard } from "@/components/GlassCard";
import {
  DOMESTIC_CITIES,
  INTERNATIONAL_CITIES,
  getSuggestedFare,
  useFlight,
  type FlightBooking,
  type TravelClass,
  type TravelType,
} from "@/contexts/FlightContext";
import { useColors } from "@/hooks/useColors";

const GOLD = "#C9A84C";
const GOLD_BRIGHT = "#FFD700";
const SUCCESS = "#34C759";

type Step = "search" | "submitted";

function addDays(d: Date, n: number) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}
function toISO(d: Date) { return d.toISOString().split("T")[0]; }
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-PK", {
    weekday: "short", day: "2-digit", month: "short", year: "numeric",
  });
}
function cityCode(city: string) {
  const m = city.match(/\(([A-Z]+)\)/); return m ? m[1] : city.slice(0, 3).toUpperCase();
}
function cityName(city: string) {
  return city.replace(/\s*\([A-Z]+\)/, "").trim();
}
function classLabel(c: TravelClass) {
  return c === "economy" ? "Economy" : c === "business" ? "Business" : "First Class";
}

// ── City Picker Modal ──────────────────────────────────────────────────────

function CityPicker({
  visible,
  cities,
  title,
  onSelect,
  onClose,
}: {
  visible: boolean;
  cities: string[];
  title: string;
  onSelect: (c: string) => void;
  onClose: () => void;
}) {
  const colors = useColors();
  const [query, setQuery] = useState("");
  const filtered = cities.filter((c) =>
    c.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: "#0A0A0A" }]}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>{title}</Text>

          <View style={[styles.searchBox, { borderColor: "rgba(201,168,76,0.3)", backgroundColor: "#111111" }]}>
            <Feather name="search" size={15} color={colors.mutedForeground} />
            <TextInput
              style={[styles.searchInput, { color: "#FFFFFF" }]}
              value={query}
              onChangeText={setQuery}
              placeholder="Search city or airport…"
              placeholderTextColor="#444444"
              autoFocus
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery("")} activeOpacity={0.7}>
                <Feather name="x" size={15} color={colors.mutedForeground} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
            {filtered.map((city) => (
              <TouchableOpacity
                key={city}
                style={styles.cityRow}
                onPress={() => { onSelect(city); setQuery(""); onClose(); Haptics.selectionAsync(); }}
                activeOpacity={0.75}
              >
                <View style={[styles.cityCodeBox, { backgroundColor: "rgba(201,168,76,0.1)", borderColor: "rgba(201,168,76,0.2)" }]}>
                  <Text style={[styles.cityCodeText, { color: GOLD }]}>{cityCode(city)}</Text>
                </View>
                <Text style={[styles.cityNameText, { color: "#FFFFFF" }]}>{cityName(city)}</Text>
                <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity style={[styles.modalClose, { borderColor: "rgba(255,255,255,0.1)" }]} onPress={onClose} activeOpacity={0.8}>
            <Text style={[styles.modalCloseText, { color: colors.mutedForeground }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Search Screen ──────────────────────────────────────────────────────────

function SearchScreen({
  onSubmit,
  isSubmitting,
}: {
  onSubmit: (
    travelType: TravelType, fromCity: string, toCity: string,
    departureDate: string, travelClass: TravelClass,
    passengers: number, suggestedFare: number,
    proposedFare: number | null, visaAssistance: boolean,
  ) => void;
  isSubmitting: boolean;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 16);

  const [travelType, setTravelType]   = useState<TravelType>("domestic");
  const [fromCity,   setFromCity]     = useState("");
  const [toCity,     setToCity]       = useState("");
  const [dateOffset, setDateOffset]   = useState(1);
  const [cls,        setCls]          = useState<TravelClass>("economy");
  const [passengers, setPassengers]   = useState(1);
  const [proposedText, setProposedText] = useState("");
  const [useProposed, setUseProposed] = useState(false);
  const [visaAssist, setVisaAssist]   = useState(false);
  const [fromOpen,   setFromOpen]     = useState(false);
  const [toOpen,     setToOpen]       = useState(false);

  const today = new Date();
  const depDate = addDays(today, dateOffset);
  const depISO  = toISO(depDate);

  const cities = travelType === "domestic" ? DOMESTIC_CITIES : INTERNATIONAL_CITIES;

  const suggestedFare = fromCity && toCity
    ? getSuggestedFare(travelType, fromCity, toCity, cls)
    : 0;

  const proposedFare = useProposed
    ? parseInt(proposedText.replace(/[^0-9]/g, ""), 10) || null
    : null;

  function swapCities() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const tmp = fromCity; setFromCity(toCity); setToCity(tmp);
  }

  function handleTypeSwitch(t: TravelType) {
    setTravelType(t);
    setFromCity("");
    setToCity("");
    setVisaAssist(false);
    Haptics.selectionAsync();
  }

  function handleSubmit() {
    if (!fromCity || !toCity) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSubmit(travelType, fromCity, toCity, depISO, cls, passengers, suggestedFare, proposedFare, visaAssist);
  }

  const canSubmit = !!fromCity && !!toCity && fromCity !== toCity;

  const CLASSES: { key: TravelClass; label: string }[] = [
    { key: "economy",     label: "Economy"     },
    { key: "business",    label: "Business"    },
    { key: "first_class", label: "First Class" },
  ];

  return (
    <>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={[
            styles.searchScroll,
            { paddingTop: topPad, paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 120) },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Feather name="arrow-left" size={22} color={GOLD_BRIGHT} />
          </TouchableOpacity>

          <View style={styles.headerArea}>
            <View style={styles.headerBadge}>
              <Feather name="send" size={10} color={GOLD} style={{ transform: [{ rotate: "-45deg" }] }} />
              <Text style={styles.headerBadgeText}>OTC GLOBAL TRAVEL</Text>
            </View>
            <Text style={styles.headerTitle}>Airlines & Travel</Text>
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
              Domestic & international flights. Negotiate your fare. Admin-confirmed tickets.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.myTicketsStrip, { borderColor: "rgba(201,168,76,0.15)" }]}
            onPress={() => router.push("/services/flight-bookings")}
            activeOpacity={0.85}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
              <Feather name="bookmark" size={15} color={GOLD} />
              <Text style={styles.myTicketsText}>My Tickets</Text>
            </View>
            <Text style={[{ fontSize: 12, fontFamily: "Inter_400Regular" }, { color: colors.mutedForeground }]}>Track status</Text>
            <Feather name="chevron-right" size={15} color={GOLD} />
          </TouchableOpacity>

          {/* Travel Type Toggle */}
          <View style={[styles.typeToggle, { backgroundColor: "#0D0D0D", borderColor: "rgba(201,168,76,0.15)" }]}>
            {(["domestic", "international"] as TravelType[]).map((t) => (
              <TouchableOpacity
                key={t}
                style={[
                  styles.typeBtn,
                  { backgroundColor: travelType === t ? GOLD : "transparent" },
                ]}
                onPress={() => handleTypeSwitch(t)}
                activeOpacity={0.82}
              >
                <Feather
                  name={t === "domestic" ? "map" : "globe"}
                  size={13}
                  color={travelType === t ? "#050505" : colors.mutedForeground}
                />
                <Text style={[styles.typeBtnText, { color: travelType === t ? "#050505" : colors.mutedForeground }]}>
                  {t === "domestic" ? "Domestic" : "International"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* From / To */}
          <GlassCard style={styles.routeCard}>
            <TouchableOpacity
              style={styles.routeField}
              onPress={() => setFromOpen(true)}
              activeOpacity={0.8}
            >
              <View style={styles.routeIconBox}>
                <Feather name="navigation" size={14} color={GOLD} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.routeFieldLabel, { color: colors.mutedForeground }]}>FROM</Text>
                {fromCity ? (
                  <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
                    <Text style={[styles.routeCode, { color: GOLD_BRIGHT }]}>{cityCode(fromCity)}</Text>
                    <Text style={[styles.routeName, { color: "#FFFFFF" }]}>{cityName(fromCity)}</Text>
                  </View>
                ) : (
                  <Text style={[styles.routePlaceholder, { color: "#444444" }]}>Select departure city</Text>
                )}
              </View>
              <Feather name="chevron-down" size={15} color={colors.mutedForeground} />
            </TouchableOpacity>

            {/* Swap */}
            <View style={styles.swapRow}>
              <View style={[styles.swapLine, { backgroundColor: "rgba(201,168,76,0.12)" }]} />
              <TouchableOpacity
                style={[styles.swapBtn, { backgroundColor: "#1A1A1A", borderColor: "rgba(201,168,76,0.3)" }]}
                onPress={swapCities}
                activeOpacity={0.8}
              >
                <Feather name="repeat" size={14} color={GOLD} />
              </TouchableOpacity>
              <View style={[styles.swapLine, { backgroundColor: "rgba(201,168,76,0.12)" }]} />
            </View>

            <TouchableOpacity
              style={styles.routeField}
              onPress={() => setToOpen(true)}
              activeOpacity={0.8}
            >
              <View style={styles.routeIconBox}>
                <Feather name="map-pin" size={14} color={GOLD} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.routeFieldLabel, { color: colors.mutedForeground }]}>TO</Text>
                {toCity ? (
                  <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
                    <Text style={[styles.routeCode, { color: GOLD_BRIGHT }]}>{cityCode(toCity)}</Text>
                    <Text style={[styles.routeName, { color: "#FFFFFF" }]}>{cityName(toCity)}</Text>
                  </View>
                ) : (
                  <Text style={[styles.routePlaceholder, { color: "#444444" }]}>Select arrival city</Text>
                )}
              </View>
              <Feather name="chevron-down" size={15} color={colors.mutedForeground} />
            </TouchableOpacity>
          </GlassCard>

          {/* Departure Date */}
          <GlassCard style={styles.dateCard}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>DEPARTURE DATE</Text>
            <View style={styles.dateRow}>
              <TouchableOpacity
                style={[styles.dateArrow, { borderColor: "rgba(201,168,76,0.25)" }]}
                onPress={() => { if (dateOffset > 0) { setDateOffset((p) => p - 1); Haptics.selectionAsync(); } }}
                disabled={dateOffset === 0}
                activeOpacity={0.7}
              >
                <Feather name="chevron-left" size={16} color={dateOffset === 0 ? "#333" : GOLD} />
              </TouchableOpacity>
              <View style={styles.dateCenter}>
                <Text style={[styles.dateMain, { color: "#FFFFFF" }]}>
                  {dateOffset === 0 ? "Today" : dateOffset === 1 ? "Tomorrow" : fmtDate(depISO).split(", ")[0]}
                </Text>
                <Text style={[styles.dateSub, { color: colors.mutedForeground }]}>
                  {fmtDate(depISO).replace(/^\w+, /, "")}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.dateArrow, { borderColor: "rgba(201,168,76,0.25)" }]}
                onPress={() => { setDateOffset((p) => p + 1); Haptics.selectionAsync(); }}
                activeOpacity={0.7}
              >
                <Feather name="chevron-right" size={16} color={GOLD} />
              </TouchableOpacity>
            </View>
          </GlassCard>

          {/* Class + Passengers */}
          <GlassCard style={styles.classCard}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>CABIN CLASS</Text>
            <View style={styles.classRow}>
              {CLASSES.map(({ key, label }) => {
                const active = cls === key;
                const isFirst = key === "first_class";
                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.classChip,
                      {
                        backgroundColor: active ? GOLD : "#111111",
                        borderColor: active ? GOLD : isFirst ? "rgba(201,168,76,0.4)" : "rgba(255,255,255,0.08)",
                        flex: 1,
                      },
                    ]}
                    onPress={() => { setCls(key); Haptics.selectionAsync(); }}
                    activeOpacity={0.82}
                  >
                    {isFirst && !active && (
                      <Feather name="star" size={9} color={GOLD} />
                    )}
                    <Text style={[
                      styles.classChipText,
                      {
                        color: active ? "#050505" : isFirst ? GOLD : "#AAAAAA",
                        fontSize: isFirst ? 10 : 11,
                      },
                    ]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={[styles.passengersRow, { borderTopColor: "rgba(255,255,255,0.06)" }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Feather name="users" size={14} color={GOLD} />
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginBottom: 0 }]}>PASSENGERS</Text>
              </View>
              <View style={styles.passengerControl}>
                <TouchableOpacity
                  style={[styles.passengerBtn, { borderColor: "rgba(201,168,76,0.25)" }]}
                  onPress={() => { if (passengers > 1) { setPassengers((p) => p - 1); Haptics.selectionAsync(); } }}
                  disabled={passengers === 1}
                  activeOpacity={0.7}
                >
                  <Feather name="minus" size={14} color={passengers === 1 ? "#333" : GOLD} />
                </TouchableOpacity>
                <Text style={[styles.passengerCount, { color: "#FFFFFF" }]}>{passengers}</Text>
                <TouchableOpacity
                  style={[styles.passengerBtn, { borderColor: "rgba(201,168,76,0.25)" }]}
                  onPress={() => { if (passengers < 9) { setPassengers((p) => p + 1); Haptics.selectionAsync(); } }}
                  disabled={passengers === 9}
                  activeOpacity={0.7}
                >
                  <Feather name="plus" size={14} color={passengers === 9 ? "#333" : GOLD} />
                </TouchableOpacity>
              </View>
            </View>
          </GlassCard>

          {/* Suggested Fare + Negotiation */}
          {canSubmit && suggestedFare > 0 && (
            <GlassCard variant="gold" style={styles.fareCard}>
              <View style={styles.fareTopRow}>
                <View>
                  <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>SUGGESTED FARE</Text>
                  <Text style={styles.fareAmount}>PKR {suggestedFare.toLocaleString()}</Text>
                  {passengers > 1 && (
                    <Text style={[styles.farePerPax, { color: colors.mutedForeground }]}>
                      × {passengers} pax = PKR {(suggestedFare * passengers).toLocaleString()}
                    </Text>
                  )}
                </View>
                <View style={styles.fareRouteBadge}>
                  <Text style={[styles.fareRouteText, { color: GOLD }]}>{cityCode(fromCity)}</Text>
                  <Feather name="arrow-right" size={12} color={GOLD} />
                  <Text style={[styles.fareRouteText, { color: GOLD }]}>{cityCode(toCity)}</Text>
                </View>
              </View>

              <View style={[styles.fareDivider, { backgroundColor: "rgba(201,168,76,0.15)" }]} />

              <View style={styles.negotiateHeader}>
                <View>
                  <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>OTC SIGNATURE OFFER</Text>
                  <Text style={[styles.negotiateTitle, { color: "#FFFFFF" }]}>Propose Your Fare</Text>
                </View>
                <TouchableOpacity
                  style={[styles.toggle, {
                    backgroundColor: useProposed ? GOLD : "#1A1A1A",
                    borderColor: useProposed ? GOLD : "#333333",
                  }]}
                  onPress={() => { setUseProposed((v) => !v); Haptics.selectionAsync(); }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.toggleText, { color: useProposed ? "#050505" : colors.mutedForeground }]}>
                    {useProposed ? "ON" : "OFF"}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.negotiateSub, { color: colors.mutedForeground }]}>
                For group bookings or corporate rates — name your price per person.
              </Text>
              {useProposed && (
                <View style={[styles.proposedWrap, { borderColor: GOLD, backgroundColor: "rgba(201,168,76,0.06)" }]}>
                  <Text style={[styles.proposedCurrency, { color: GOLD }]}>PKR</Text>
                  <TextInput
                    style={[styles.proposedInput, { color: "#FFFFFF" }]}
                    value={proposedText}
                    onChangeText={setProposedText}
                    keyboardType="numeric"
                    placeholderTextColor="#444444"
                    placeholder={suggestedFare.toString()}
                  />
                  <Text style={[{ fontSize: 12, fontFamily: "Inter_400Regular" }, { color: colors.mutedForeground }]}>
                    /person
                  </Text>
                </View>
              )}
            </GlassCard>
          )}

          {/* Visa Assistance */}
          {travelType === "international" && (
            <TouchableOpacity
              style={[
                styles.visaBtn,
                {
                  backgroundColor: visaAssist ? "rgba(201,168,76,0.12)" : "#0A0A0A",
                  borderColor: visaAssist ? GOLD : "rgba(201,168,76,0.3)",
                },
              ]}
              onPress={() => { setVisaAssist((v) => !v); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
              activeOpacity={0.85}
            >
              <View style={[styles.visaIconBox, { backgroundColor: visaAssist ? GOLD : "rgba(201,168,76,0.1)" }]}>
                <Feather name="credit-card" size={16} color={visaAssist ? "#050505" : GOLD} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.visaTitle, { color: visaAssist ? GOLD_BRIGHT : "#FFFFFF" }]}>
                  {visaAssist ? "Visa Assistance Requested ✓" : "Need Visa Assistance?"}
                </Text>
                <Text style={[styles.visaSub, { color: colors.mutedForeground }]}>
                  {visaAssist
                    ? "Our team will contact you to assist with your visa application."
                    : "Our concierge team will guide you through the visa process."}
                </Text>
              </View>
              <View style={[styles.visaToggleDot, {
                backgroundColor: visaAssist ? GOLD : "#333333",
                borderColor: visaAssist ? GOLD : "#444444",
              }]}>
                {visaAssist && <Feather name="check" size={11} color="#050505" />}
              </View>
            </TouchableOpacity>
          )}

          {/* Summary */}
          {canSubmit && (
            <GlassCard style={styles.summaryCard}>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>BOOKING SUMMARY</Text>
              {[
                { label: "Route",      value: `${cityCode(fromCity)} → ${cityCode(toCity)}` },
                { label: "Type",       value: travelType === "domestic" ? "Domestic" : "International" },
                { label: "Date",       value: fmtDate(depISO) },
                { label: "Class",      value: classLabel(cls) },
                { label: "Passengers", value: `${passengers} person${passengers > 1 ? "s" : ""}` },
                {
                  label: useProposed && proposedFare ? "Proposed Fare" : "Fare (per pax)",
                  value: `PKR ${(useProposed && proposedFare ? proposedFare : suggestedFare).toLocaleString()}`,
                },
              ].map(({ label, value }) => (
                <View key={label} style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>{label}</Text>
                  <Text style={[styles.summaryValue, { color: "#FFFFFF" }]}>{value}</Text>
                </View>
              ))}
              <View style={[styles.summaryTotal, { borderTopColor: "rgba(201,168,76,0.2)" }]}>
                <Text style={[styles.summaryTotalLabel, { color: "#FFFFFF" }]}>Est. Total</Text>
                <Text style={styles.summaryTotalValue}>
                  PKR {((useProposed && proposedFare ? proposedFare : suggestedFare) * passengers).toLocaleString()}
                </Text>
              </View>
              {visaAssist && (
                <View style={[styles.visaFlag, { backgroundColor: "rgba(201,168,76,0.08)", borderColor: "rgba(201,168,76,0.2)" }]}>
                  <Feather name="credit-card" size={12} color={GOLD} />
                  <Text style={[styles.visaFlagText, { color: GOLD }]}>Visa assistance flagged for admin</Text>
                </View>
              )}
            </GlassCard>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.ctaBar, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 24 : 16), borderTopColor: "rgba(201,168,76,0.12)" }]}>
        <TouchableOpacity
          style={[
            styles.ctaBtn,
            { backgroundColor: !canSubmit || isSubmitting ? "#1A1A1A" : GOLD },
          ]}
          onPress={handleSubmit}
          activeOpacity={0.88}
          disabled={!canSubmit || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Feather name="send" size={17} color={canSubmit ? "#050505" : "#555555"} style={{ transform: [{ rotate: "-45deg" }] }} />
              <Text style={[styles.ctaBtnText, { color: canSubmit ? "#050505" : "#555555" }]}>
                {canSubmit ? "Request Flight Booking" : "Select departure & arrival"}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <CityPicker
        visible={fromOpen}
        cities={cities}
        title={`Departure — ${travelType === "domestic" ? "Pakistan" : "International"}`}
        onSelect={setFromCity}
        onClose={() => setFromOpen(false)}
      />
      <CityPicker
        visible={toOpen}
        cities={cities}
        title={`Arrival — ${travelType === "domestic" ? "Pakistan" : "International"}`}
        onSelect={setToCity}
        onClose={() => setToOpen(false)}
      />
    </>
  );
}

// ── Submitted / Boarding Pass ──────────────────────────────────────────────

function SubmittedScreen({
  booking,
  onViewTickets,
  onNewSearch,
}: {
  booking: FlightBooking;
  onViewTickets: () => void;
  onNewSearch: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const fade  = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(32)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slide, { toValue: 0, useNativeDriver: true, speed: 11 }),
    ]).start();
  }, [fade, slide]);

  function fmtClass(c: string) {
    return c === "economy" ? "Economy" : c === "business" ? "Business Class" : "First Class";
  }

  return (
    <ScrollView
      contentContainerStyle={[
        styles.submittedScroll,
        { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 },
      ]}
    >
      <Animated.View style={[styles.submittedContent, { opacity: fade, transform: [{ translateY: slide }] }]}>
        <View style={[styles.submittedIcon, { borderColor: "rgba(201,168,76,0.3)", backgroundColor: "rgba(201,168,76,0.07)" }]}>
          <Text style={{ fontSize: 42 }}>✈️</Text>
        </View>
        <Text style={styles.submittedTitle}>Booking Requested!</Text>
        <Text style={[styles.submittedSub, { color: colors.mutedForeground }]}>
          Our travel team is reviewing your request and will confirm the final fare.
        </Text>

        {/* Boarding Pass */}
        <View style={[styles.boardingPass, { backgroundColor: "#0A0A0A", borderColor: "rgba(201,168,76,0.3)" }]}>
          {/* Header */}
          <View style={styles.passHeader}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Feather name="send" size={10} color={GOLD} style={{ transform: [{ rotate: "-45deg" }] }} />
              <Text style={styles.passHeaderLabel}>OTC GLOBAL TRAVEL</Text>
            </View>
            <View style={[styles.pendingBadge, { backgroundColor: "rgba(255,149,0,0.12)", borderColor: "rgba(255,149,0,0.28)" }]}>
              <View style={[styles.statusDot, { backgroundColor: "#FF9500" }]} />
              <Text style={[styles.pendingText, { color: "#FF9500" }]}>PENDING</Text>
            </View>
          </View>

          {/* Perforation */}
          <View style={styles.perforationRow}>
            <View style={[styles.perforationCircle, { backgroundColor: "#000000" }]} />
            <View style={styles.perforationLine}>
              {Array.from({ length: 18 }).map((_, i) => (
                <View key={i} style={[styles.perforationDash, { backgroundColor: "rgba(201,168,76,0.2)" }]} />
              ))}
            </View>
            <View style={[styles.perforationCircle, { backgroundColor: "#000000" }]} />
          </View>

          {/* Route */}
          <View style={styles.passRouteRow}>
            <View style={styles.passCity}>
              <Text style={styles.passCityCode}>{cityCode(booking.from_city)}</Text>
              <Text style={[styles.passCityName, { color: colors.mutedForeground }]} numberOfLines={1}>
                {cityName(booking.from_city)}
              </Text>
            </View>
            <View style={styles.passAirplaneWrap}>
              <View style={[styles.passRouteLine, { backgroundColor: "rgba(201,168,76,0.2)" }]} />
              <Feather name="send" size={20} color={GOLD} style={{ transform: [{ rotate: "-45deg" }] }} />
              <View style={[styles.passRouteLine, { backgroundColor: "rgba(201,168,76,0.2)" }]} />
            </View>
            <View style={[styles.passCity, { alignItems: "flex-end" }]}>
              <Text style={styles.passCityCode}>{cityCode(booking.to_city)}</Text>
              <Text style={[styles.passCityName, { color: colors.mutedForeground }]} numberOfLines={1}>
                {cityName(booking.to_city)}
              </Text>
            </View>
          </View>

          {/* Details */}
          <View style={styles.passDetails}>
            {[
              { label: "DATE",       value: fmtDate(booking.departure_date).replace(/^\w+, /, "") },
              { label: "CLASS",      value: fmtClass(booking.travel_class) },
              { label: "PAX",        value: `${booking.passengers}` },
              { label: "TYPE",       value: booking.travel_type === "domestic" ? "Domestic" : "International" },
            ].map(({ label, value }) => (
              <View key={label} style={styles.passDetailItem}>
                <Text style={[styles.passDetailLabel, { color: colors.mutedForeground }]}>{label}</Text>
                <Text style={[styles.passDetailValue, { color: "#FFFFFF" }]}>{value}</Text>
              </View>
            ))}
          </View>

          {/* Perforation */}
          <View style={styles.perforationRow}>
            <View style={[styles.perforationCircle, { backgroundColor: "#000000" }]} />
            <View style={styles.perforationLine}>
              {Array.from({ length: 18 }).map((_, i) => (
                <View key={i} style={[styles.perforationDash, { backgroundColor: "rgba(201,168,76,0.2)" }]} />
              ))}
            </View>
            <View style={[styles.perforationCircle, { backgroundColor: "#000000" }]} />
          </View>

          {/* Fare + Visa */}
          <View style={styles.passFareRow}>
            <View>
              <Text style={[styles.passDetailLabel, { color: colors.mutedForeground }]}>SUGGESTED FARE</Text>
              <Text style={styles.passFareValue}>PKR {booking.suggested_fare.toLocaleString()}</Text>
              {booking.proposed_fare && (
                <Text style={[styles.passProposed, { color: GOLD }]}>
                  Proposed: PKR {booking.proposed_fare.toLocaleString()}
                </Text>
              )}
            </View>
            {booking.visa_assistance && (
              <View style={[styles.visaFlag, { backgroundColor: "rgba(201,168,76,0.1)", borderColor: "rgba(201,168,76,0.25)" }]}>
                <Feather name="credit-card" size={11} color={GOLD} />
                <Text style={[styles.visaFlagText, { color: GOLD, fontSize: 10 }]}>Visa Assist</Text>
              </View>
            )}
          </View>
        </View>

        {/* Status Flow */}
        <View style={styles.statusFlow}>
          {[
            { icon: "send" as const,         label: "Requested",     done: true },
            { icon: "clock" as const,        label: "Admin\nReview", done: false },
            { icon: "check-circle" as const, label: "Ticket\nIssued", done: false },
          ].map((s, i) => (
            <React.Fragment key={s.label}>
              <View style={styles.statusStep}>
                <View style={[styles.statusDotBox, {
                  backgroundColor: s.done ? GOLD : "#1A1A1A",
                  borderColor: s.done ? GOLD : "#333333",
                }]}>
                  <Feather name={s.icon} size={13} color={s.done ? "#050505" : "#555555"} />
                </View>
                <Text style={[styles.statusLabel, { color: s.done ? GOLD : "#555555" }]}>
                  {s.label}
                </Text>
              </View>
              {i < 2 && <View style={[styles.statusLine, { backgroundColor: "#222222" }]} />}
            </React.Fragment>
          ))}
        </View>

        <TouchableOpacity style={[styles.viewTicketsBtn, { backgroundColor: GOLD }]} onPress={onViewTickets} activeOpacity={0.88}>
          <Feather name="bookmark" size={16} color="#050505" />
          <Text style={styles.viewTicketsBtnText}>View My Tickets</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.newSearchBtn, { borderColor: "rgba(201,168,76,0.3)" }]} onPress={onNewSearch} activeOpacity={0.85}>
          <Text style={[styles.newSearchBtnText, { color: GOLD }]}>New Search</Text>
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );
}

// ── Root ────────────────────────────────────────────────────────────────────

export default function FlightScreen() {
  const { isSubmitting, submitBooking } = useFlight();
  const [step, setStep] = useState<Step>("search");
  const [submittedBooking, setSubmittedBooking] = useState<FlightBooking | null>(null);

  const handleSubmit = useCallback(async (
    travelType: TravelType, fromCity: string, toCity: string,
    departureDate: string, travelClass: TravelClass,
    passengers: number, suggestedFare: number,
    proposedFare: number | null, visaAssistance: boolean,
  ) => {
    const booking = await submitBooking({
      travelType, fromCity, toCity, departureDate,
      travelClass, passengers, suggestedFare, proposedFare, visaAssistance,
    });
    setSubmittedBooking(booking);
    setStep("submitted");
  }, [submitBooking]);

  return (
    <View style={[styles.root, { backgroundColor: "#000000" }]}>
      {step === "search" && (
        <SearchScreen onSubmit={handleSubmit} isSubmitting={isSubmitting} />
      )}
      {step === "submitted" && submittedBooking && (
        <SubmittedScreen
          booking={submittedBooking}
          onViewTickets={() => router.push("/services/flight-bookings")}
          onNewSearch={() => { setStep("search"); setSubmittedBooking(null); }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backBtn: { alignSelf: "flex-start", padding: 4, marginBottom: 12 },

  searchScroll: { paddingHorizontal: 20, gap: 0 },

  headerArea: { gap: 6, marginBottom: 20 },
  headerBadge: {
    flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start",
    backgroundColor: "rgba(201,168,76,0.08)", borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: "rgba(201,168,76,0.2)", marginBottom: 6,
  },
  headerBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold", color: GOLD, letterSpacing: 1.5 },
  headerTitle: { fontSize: 30, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  headerSub: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },

  myTicketsStrip: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#0D0D0D", borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 13, marginBottom: 20,
    borderWidth: 1, gap: 10,
  },
  myTicketsText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },

  // Travel Type
  typeToggle: {
    flexDirection: "row", borderRadius: 14, borderWidth: 1,
    padding: 4, marginBottom: 16, gap: 4,
  },
  typeBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 7, borderRadius: 10, paddingVertical: 11,
  },
  typeBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  // Route card
  routeCard: { padding: 0, overflow: "hidden", marginBottom: 12 },
  routeField: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  routeIconBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "rgba(201,168,76,0.08)", alignItems: "center", justifyContent: "center",
  },
  routeFieldLabel: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 4 },
  routeCode: { fontSize: 24, fontFamily: "Inter_700Bold" },
  routeName: { fontSize: 14, fontFamily: "Inter_500Medium" },
  routePlaceholder: { fontSize: 14, fontFamily: "Inter_400Regular" },
  swapRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, gap: 10 },
  swapLine: { flex: 1, height: 1 },
  swapBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: "center", justifyContent: "center" },

  // Date
  dateCard: { padding: 16, marginBottom: 12 },
  sectionLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  dateArrow: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  dateCenter: { flex: 1, alignItems: "center" },
  dateMain: { fontSize: 16, fontFamily: "Inter_700Bold" },
  dateSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },

  // Class
  classCard: { padding: 16, marginBottom: 12, gap: 14 },
  classRow: { flexDirection: "row", gap: 8 },
  classChip: {
    borderRadius: 10, borderWidth: 1, paddingVertical: 10,
    alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 4,
  },
  classChipText: { fontFamily: "Inter_600SemiBold" },
  passengersRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, paddingTop: 12 },
  passengerControl: { flexDirection: "row", alignItems: "center", gap: 14 },
  passengerBtn: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  passengerCount: { fontSize: 18, fontFamily: "Inter_700Bold", minWidth: 24, textAlign: "center" },

  // Fare
  fareCard: { padding: 18, marginBottom: 12, gap: 14 },
  fareTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  fareAmount: { fontSize: 26, fontFamily: "Inter_700Bold", color: GOLD_BRIGHT, marginTop: 4 },
  farePerPax: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  fareRouteBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(201,168,76,0.1)", borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  fareRouteText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  fareDivider: { height: 1 },
  negotiateHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  negotiateTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginTop: 3 },
  negotiateSub: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  toggle: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  toggleText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  proposedWrap: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  proposedCurrency: { fontSize: 14, fontFamily: "Inter_700Bold" },
  proposedInput: { flex: 1, fontSize: 22, fontFamily: "Inter_700Bold" },

  // Visa
  visaBtn: {
    flexDirection: "row", alignItems: "center", gap: 14,
    borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12,
  },
  visaIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  visaTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 3 },
  visaSub: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  visaToggleDot: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, alignItems: "center", justifyContent: "center" },

  // Summary
  summaryCard: { padding: 18, marginBottom: 12, gap: 10 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  summaryValue: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  summaryTotal: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, paddingTop: 12, marginTop: 4 },
  summaryTotalLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  summaryTotalValue: { fontSize: 20, fontFamily: "Inter_700Bold", color: GOLD_BRIGHT },
  visaFlag: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, marginTop: 4,
  },
  visaFlagText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  // CTA
  ctaBar: { paddingHorizontal: 20, paddingTop: 12, backgroundColor: "#000000", borderTopWidth: 1 },
  ctaBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 16, paddingVertical: 16 },
  ctaBtnText: { fontSize: 16, fontFamily: "Inter_700Bold" },

  // City picker
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "flex-end" },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingTop: 12 },
  modalHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: "#333333", alignSelf: "center", marginBottom: 16 },
  modalTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#FFFFFF", marginBottom: 14 },
  searchBox: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  cityRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" },
  cityCodeBox: { width: 44, height: 32, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  cityCodeText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  cityNameText: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  modalClose: { marginTop: 14, borderWidth: 1, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  modalCloseText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },

  // Submitted
  submittedScroll: { flexGrow: 1, justifyContent: "center" },
  submittedContent: { paddingHorizontal: 24, gap: 20, alignItems: "center" },
  submittedIcon: { width: 90, height: 90, borderRadius: 45, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  submittedTitle: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#FFFFFF", textAlign: "center" },
  submittedSub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },

  // Boarding Pass
  boardingPass: { width: "100%", borderRadius: 18, borderWidth: 1, overflow: "hidden" },
  passHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, paddingBottom: 12 },
  passHeaderLabel: { fontSize: 10, fontFamily: "Inter_700Bold", color: GOLD, letterSpacing: 1.5 },
  pendingBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  pendingText: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  perforationRow: { flexDirection: "row", alignItems: "center", marginHorizontal: -1 },
  perforationCircle: { width: 16, height: 16, borderRadius: 8 },
  perforationLine: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-around", paddingHorizontal: 8 },
  perforationDash: { width: 6, height: 2, borderRadius: 1 },
  passRouteRow: { flexDirection: "row", alignItems: "center", padding: 16, paddingVertical: 20, gap: 8 },
  passCity: { flex: 1, gap: 4 },
  passCityCode: { fontSize: 34, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  passCityName: { fontSize: 11, fontFamily: "Inter_400Regular" },
  passAirplaneWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  passRouteLine: { flex: 1, height: 1 },
  passDetails: { flexDirection: "row", flexWrap: "wrap", gap: 0, paddingHorizontal: 16, paddingBottom: 12 },
  passDetailItem: { width: "50%", gap: 3, paddingVertical: 6 },
  passDetailLabel: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1, textTransform: "uppercase" },
  passDetailValue: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  passFareRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", padding: 16, paddingTop: 12 },
  passFareValue: { fontSize: 20, fontFamily: "Inter_700Bold", color: GOLD_BRIGHT, marginTop: 4 },
  passProposed: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 2 },

  // Status flow
  statusFlow: { flexDirection: "row", alignItems: "center", width: "100%" },
  statusStep: { flex: 1, alignItems: "center", gap: 6 },
  statusDotBox: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  statusLabel: { fontSize: 10, fontFamily: "Inter_500Medium", textAlign: "center" },
  statusLine: { flex: 1, height: 2, marginBottom: 22 },

  viewTicketsBtn: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, paddingVertical: 15 },
  viewTicketsBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#050505" },
  newSearchBtn: { width: "100%", borderRadius: 14, borderWidth: 1, paddingVertical: 14, alignItems: "center" },
  newSearchBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
