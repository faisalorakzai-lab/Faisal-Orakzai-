import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
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
import { GlassCard } from "@/components/GlassCard";
import {
  useHotel,
  type Hotel,
  type HotelBooking,
  type RoomType,
} from "@/contexts/HotelContext";
import { useColors } from "@/hooks/useColors";

const GOLD = "#C9A84C";
const GOLD_BRIGHT = "#FFD700";
const { width: SCREEN_W } = Dimensions.get("window");

type Step = "gallery" | "detail" | "submitted";

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
function toISODate(d: Date) {
  return d.toISOString().split("T")[0];
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-PK", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
function nightsBetween(a: string, b: string) {
  return Math.max(
    1,
    Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000),
  );
}

const AMENITY_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  "Wi-Fi":           "wifi",
  Pool:              "droplet",
  Gym:               "activity",
  Spa:               "star",
  Restaurant:        "coffee",
  "24/7 Security":   "shield",
  Concierge:         "bell",
  Valet:             "key",
  "Business Center": "briefcase",
  Butler:            "user",
  "Sea View":        "wind",
};

function StarRow({ count }: { count: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 3 }}>
      {Array.from({ length: count }).map((_, i) => (
        <Feather key={i} name="star" size={10} color={GOLD} />
      ))}
    </View>
  );
}

// ── Hotel Card ──────────────────────────────────────────────────────────────

function HotelCard({ hotel, onSelect }: { hotel: Hotel; onSelect: (h: Hotel) => void }) {
  const colors = useColors();
  const scale = useRef(new Animated.Value(1)).current;

  function pressIn() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(scale, { toValue: 0.975, useNativeDriver: true, speed: 22 }).start();
  }
  function pressOut() {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 14 }).start();
  }

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={() => onSelect(hotel)}
        onPressIn={pressIn}
        onPressOut={pressOut}
        activeOpacity={1}
        disabled={!hotel.available}
      >
        <View style={[styles.hotelCard, { borderColor: "rgba(201,168,76,0.22)" }]}>
          <View style={styles.hotelImageWrap}>
            <Image source={{ uri: hotel.cover_image_url }} style={styles.hotelImage} resizeMode="cover" />
            <View style={styles.imageScrim} />
            <View style={styles.cardOverlay}>
              <StarRow count={hotel.stars} />
              <View style={styles.cityBadge}>
                <Feather name="map-pin" size={9} color={GOLD} />
                <Text style={styles.cityBadgeText}>{hotel.city}</Text>
              </View>
            </View>
            {!hotel.available && (
              <View style={styles.unavailOverlay}>
                <Text style={styles.unavailText}>Fully Booked</Text>
              </View>
            )}
          </View>

          <View style={styles.hotelCardBody}>
            <View style={styles.hotelCardRow}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.hotelName} numberOfLines={1}>{hotel.name}</Text>
                <Text style={[styles.hotelDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
                  {hotel.description}
                </Text>
              </View>
              <View style={styles.priceTag}>
                <Text style={styles.priceFrom}>FROM</Text>
                <Text style={styles.priceAmount}>{(hotel.starting_rate / 1000).toFixed(0)}k</Text>
                <Text style={styles.priceNight}>/night</Text>
              </View>
            </View>

            <View style={styles.amenityRow}>
              {hotel.amenities.slice(0, 4).map((a) => (
                <View key={a} style={styles.amenityChip}>
                  <Feather name={AMENITY_ICONS[a] ?? "check"} size={9} color={GOLD} />
                  <Text style={[styles.amenityChipText, { color: colors.mutedForeground }]}>{a}</Text>
                </View>
              ))}
              {hotel.amenities.length > 4 && (
                <View style={styles.amenityChip}>
                  <Text style={[styles.amenityChipText, { color: colors.mutedForeground }]}>
                    +{hotel.amenities.length - 4} more
                  </Text>
                </View>
              )}
            </View>

            <View style={[styles.selectBtn, { borderColor: "rgba(201,168,76,0.35)" }]}>
              <Text style={styles.selectBtnText}>View Property & Book</Text>
              <Feather name="arrow-right" size={13} color={GOLD} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Gallery Screen ──────────────────────────────────────────────────────────

function GalleryScreen({
  hotels,
  isLoading,
  onSelect,
}: {
  hotels: Hotel[];
  isLoading: boolean;
  onSelect: (h: Hotel) => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 16);

  return (
    <ScrollView
      contentContainerStyle={[
        styles.galleryScroll,
        { paddingTop: topPad, paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 110) },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
        <Feather name="arrow-left" size={22} color={GOLD_BRIGHT} />
      </TouchableOpacity>

      <View style={styles.galleryHeader}>
        <View style={styles.collectionBadge}>
          <Feather name="star" size={10} color={GOLD} />
          <Text style={styles.collectionBadgeText}>OTC CONCIERGE COLLECTION</Text>
        </View>
        <Text style={styles.galleryTitle}>Hotel & Residency</Text>
        <Text style={[styles.gallerySub, { color: colors.mutedForeground }]}>
          Curated luxury properties across Pakistan. Negotiate your rate. Admin-confirmed bookings.
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.myResStrip, { borderColor: "rgba(201,168,76,0.15)" }]}
        onPress={() => router.push("/services/hotel-bookings")}
        activeOpacity={0.85}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
          <Feather name="calendar" size={15} color={GOLD} />
          <Text style={styles.myResText}>My Reservations</Text>
        </View>
        <Text style={[styles.myResHint, { color: colors.mutedForeground }]}>Track status & passes</Text>
        <Feather name="chevron-right" size={15} color={GOLD} />
      </TouchableOpacity>

      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={GOLD} size="large" />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading properties…</Text>
        </View>
      ) : (
        <View style={{ gap: 20 }}>
          {hotels.map((h) => (
            <HotelCard key={h.id} hotel={h} onSelect={onSelect} />
          ))}
        </View>
      )}

      <GlassCard variant="gold" style={styles.promiseCard}>
        <Text style={styles.promiseTitle}>The OTC Promise</Text>
        {[
          "Best-rate guarantee on every property",
          "Free cancellation up to 48 hours before check-in",
          "24/7 concierge support throughout your stay",
          "Complimentary airport transfer on Executive Suites",
        ].map((line) => (
          <View key={line} style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
            <View style={styles.promiseDot} />
            <Text style={[styles.promiseLine, { color: "#CCCCCC" }]}>{line}</Text>
          </View>
        ))}
      </GlassCard>
    </ScrollView>
  );
}

// ── Image Carousel ──────────────────────────────────────────────────────────

function ImageCarousel({ images }: { images: string[] }) {
  const [active, setActive] = useState(0);

  return (
    <View style={{ width: "100%", height: 290 }}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          setActive(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W));
        }}
      >
        {images.map((uri, i) => (
          <View key={i} style={{ width: SCREEN_W, height: 290 }}>
            <Image source={{ uri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
            <View style={styles.imageScrim} />
          </View>
        ))}
      </ScrollView>
      <View style={styles.dotRow}>
        {images.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i === active ? GOLD_BRIGHT : "rgba(255,255,255,0.35)",
                width: i === active ? 20 : 6,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

// ── Detail Screen ───────────────────────────────────────────────────────────

function DetailScreen({
  hotel,
  onBack,
  onSubmit,
  isSubmitting,
}: {
  hotel: Hotel;
  onBack: () => void;
  onSubmit: (
    roomType: string, roomRate: number,
    checkIn: string, checkOut: string,
    nights: number, proposedRate: number | null,
  ) => void;
  isSubmitting: boolean;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const today = new Date();
  const [selectedRoom, setSelectedRoom] = useState<RoomType>(hotel.room_types[0]);
  const [checkInOffset, setCheckInOffset]   = useState(0);
  const [checkOutOffset, setCheckOutOffset] = useState(2);
  const [proposedText, setProposedText]     = useState(hotel.room_types[0].rate.toString());
  const [useProposed, setUseProposed]       = useState(false);

  const checkInDate  = addDays(today, checkInOffset);
  const checkOutDate = addDays(today, Math.max(checkInOffset + 1, checkOutOffset));
  const checkInISO   = toISODate(checkInDate);
  const checkOutISO  = toISODate(checkOutDate);
  const nights       = nightsBetween(checkInISO, checkOutISO);

  const proposedRate  = useProposed
    ? parseInt(proposedText.replace(/[^0-9]/g, ""), 10) || selectedRoom.rate
    : null;
  const effectiveRate = proposedRate ?? selectedRoom.rate;
  const totalCost     = effectiveRate * nights;

  function handleBook() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSubmit(selectedRoom.name, selectedRoom.rate, checkInISO, checkOutISO, nights, proposedRate);
  }

  const shortDate = (iso: string) => {
    const parts = formatDate(iso).split(", ");
    return parts.length > 1 ? parts[1] : formatDate(iso);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 120) }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingTop: topPad }}>
          <TouchableOpacity
            style={[styles.backBtn, { paddingHorizontal: 20 }]}
            onPress={onBack}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={22} color={GOLD_BRIGHT} />
          </TouchableOpacity>
        </View>

        <ImageCarousel images={hotel.images} />

        <View style={styles.detailMeta}>
          <StarRow count={hotel.stars} />
          <Text style={styles.detailName}>{hotel.name}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Feather name="map-pin" size={13} color={GOLD} />
            <Text style={[styles.detailCity, { color: colors.mutedForeground }]}>{hotel.city}</Text>
          </View>
        </View>

        <View style={styles.detailBody}>
          <Text style={[styles.detailDesc, { color: "#BBBBBB" }]}>{hotel.description}</Text>

          {/* Room Categories */}
          <View style={{ gap: 10 }}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ROOM CATEGORIES</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingRight: 4 }}
            >
              {hotel.room_types.map((rt) => {
                const active = rt.id === selectedRoom.id;
                return (
                  <TouchableOpacity
                    key={rt.id}
                    style={[
                      styles.roomChip,
                      {
                        backgroundColor: active ? GOLD : "#111111",
                        borderColor: active ? GOLD : "rgba(201,168,76,0.22)",
                      },
                    ]}
                    onPress={() => {
                      setSelectedRoom(rt);
                      setProposedText(rt.rate.toString());
                      Haptics.selectionAsync();
                    }}
                    activeOpacity={0.82}
                  >
                    <Text style={[styles.roomChipName, { color: active ? "#050505" : "#FFFFFF" }]}>
                      {rt.name}
                    </Text>
                    <Text style={[styles.roomChipRate, { color: active ? "#333333" : GOLD }]}>
                      PKR {rt.rate.toLocaleString()}/night
                    </Text>
                    <Text
                      style={[styles.roomChipDesc, { color: active ? "#444444" : colors.mutedForeground }]}
                      numberOfLines={2}
                    >
                      {rt.description}
                    </Text>
                    <Text style={[styles.roomChipGuests, { color: active ? "#555555" : "#666666" }]}>
                      Up to {rt.max_guests} {rt.max_guests === 1 ? "guest" : "guests"}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Amenities */}
          <GlassCard style={styles.amenitiesCard}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>PROPERTY AMENITIES</Text>
            <View style={styles.amenitiesGrid}>
              {hotel.amenities.map((a) => (
                <View key={a} style={styles.amenityItem}>
                  <View style={styles.amenityIconBox}>
                    <Feather name={AMENITY_ICONS[a] ?? "check"} size={16} color={GOLD} />
                  </View>
                  <Text style={[styles.amenityItemText, { color: "#DDDDDD" }]}>{a}</Text>
                </View>
              ))}
            </View>
          </GlassCard>

          {/* Date Picker */}
          <GlassCard style={styles.datePicker}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>YOUR STAY</Text>

            <View style={styles.dateGrid}>
              {/* Check-in */}
              <View style={styles.dateField}>
                <Text style={[styles.dateFieldLabel, { color: colors.mutedForeground }]}>CHECK-IN</Text>
                <View style={styles.dateControl}>
                  <TouchableOpacity
                    style={[styles.dateArrowBtn, { borderColor: "rgba(201,168,76,0.25)" }]}
                    onPress={() => { if (checkInOffset > 0) { setCheckInOffset((p) => p - 1); Haptics.selectionAsync(); } }}
                    disabled={checkInOffset === 0}
                    activeOpacity={0.7}
                  >
                    <Feather name="chevron-left" size={14} color={checkInOffset === 0 ? "#333" : GOLD} />
                  </TouchableOpacity>
                  <View style={{ flex: 1, alignItems: "center" }}>
                    <Text style={[styles.dateVal, { color: "#FFFFFF" }]}>
                      {checkInOffset === 0 ? "Today" : checkInOffset === 1 ? "Tomorrow" : shortDate(checkInISO)}
                    </Text>
                    <Text style={[styles.dateSub, { color: colors.mutedForeground }]}>
                      {formatDate(checkInISO).split(", ")[0]}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.dateArrowBtn, { borderColor: "rgba(201,168,76,0.25)" }]}
                    onPress={() => { setCheckInOffset((p) => p + 1); Haptics.selectionAsync(); }}
                    activeOpacity={0.7}
                  >
                    <Feather name="chevron-right" size={14} color={GOLD} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[styles.dateSeparator, { backgroundColor: "rgba(201,168,76,0.15)" }]} />

              {/* Check-out */}
              <View style={styles.dateField}>
                <Text style={[styles.dateFieldLabel, { color: colors.mutedForeground }]}>CHECK-OUT</Text>
                <View style={styles.dateControl}>
                  <TouchableOpacity
                    style={[styles.dateArrowBtn, { borderColor: "rgba(201,168,76,0.25)" }]}
                    onPress={() => {
                      if (checkOutOffset > checkInOffset + 1) { setCheckOutOffset((p) => p - 1); Haptics.selectionAsync(); }
                    }}
                    disabled={checkOutOffset <= checkInOffset + 1}
                    activeOpacity={0.7}
                  >
                    <Feather name="chevron-left" size={14} color={checkOutOffset <= checkInOffset + 1 ? "#333" : GOLD} />
                  </TouchableOpacity>
                  <View style={{ flex: 1, alignItems: "center" }}>
                    <Text style={[styles.dateVal, { color: "#FFFFFF" }]}>{shortDate(checkOutISO)}</Text>
                    <Text style={[styles.dateSub, { color: colors.mutedForeground }]}>
                      {formatDate(checkOutISO).split(", ")[0]}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.dateArrowBtn, { borderColor: "rgba(201,168,76,0.25)" }]}
                    onPress={() => { setCheckOutOffset((p) => p + 1); Haptics.selectionAsync(); }}
                    activeOpacity={0.7}
                  >
                    <Feather name="chevron-right" size={14} color={GOLD} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={[styles.nightsBadge, { backgroundColor: "rgba(201,168,76,0.08)", borderColor: "rgba(201,168,76,0.2)" }]}>
              <Feather name="moon" size={13} color={GOLD} />
              <Text style={[styles.nightsBadgeText, { color: GOLD }]}>
                {nights} {nights === 1 ? "night" : "nights"}
              </Text>
            </View>
          </GlassCard>

          {/* Negotiation */}
          <GlassCard variant="gold" style={styles.negotiateCard}>
            <View style={styles.negotiateHeader}>
              <View>
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>OTC CONCIERGE OFFER</Text>
                <Text style={[styles.negotiateTitle, { color: "#FFFFFF" }]}>Propose Your Rate</Text>
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
              Name your nightly rate. Our concierge team reviews all offers personally.
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
                  placeholder={selectedRoom.rate.toString()}
                />
                <Text style={[styles.proposedUnit, { color: colors.mutedForeground }]}>/night</Text>
              </View>
            )}
          </GlassCard>

          {/* Booking Summary */}
          <GlassCard style={styles.summaryCard}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>RESERVATION SUMMARY</Text>
            {[
              { label: "Property",  value: hotel.name },
              { label: "Room",      value: selectedRoom.name },
              { label: "Check-in",  value: formatDate(checkInISO) },
              { label: "Check-out", value: formatDate(checkOutISO) },
              { label: "Nights",    value: `${nights} nights` },
              {
                label: useProposed ? "Proposed Rate" : "Rate",
                value: `PKR ${effectiveRate.toLocaleString()}/night`,
              },
            ].map(({ label, value }) => (
              <View key={label} style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>{label}</Text>
                <Text style={[styles.summaryValue, { color: "#FFFFFF" }]} numberOfLines={1}>{value}</Text>
              </View>
            ))}
            <View style={[styles.summaryTotal, { borderTopColor: "rgba(201,168,76,0.2)" }]}>
              <Text style={[styles.summaryTotalLabel, { color: "#FFFFFF" }]}>Estimated Total</Text>
              <Text style={styles.summaryTotalValue}>PKR {totalCost.toLocaleString()}</Text>
            </View>
            {useProposed && (
              <Text style={[styles.summaryNote, { color: colors.mutedForeground }]}>
                * Final amount subject to concierge approval
              </Text>
            )}
          </GlassCard>
        </View>
      </ScrollView>

      <View style={[styles.ctaBar, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 24 : 16), borderTopColor: "rgba(201,168,76,0.12)" }]}>
        <TouchableOpacity
          style={[styles.ctaBtn, { backgroundColor: isSubmitting ? "#1A1A1A" : GOLD }]}
          onPress={handleBook}
          activeOpacity={0.88}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Feather name="send" size={17} color="#050505" />
              <Text style={styles.ctaBtnText}>Send Booking Request</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Submitted / Digital Pass ────────────────────────────────────────────────

function SubmittedScreen({
  booking,
  onViewBookings,
  onBackToGallery,
}: {
  booking: HotelBooking;
  onViewBookings: () => void;
  onBackToGallery: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const fade  = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slide, { toValue: 0, useNativeDriver: true, speed: 12 }),
    ]).start();
  }, [fade, slide]);

  return (
    <ScrollView
      contentContainerStyle={[
        styles.submittedScroll,
        { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 },
      ]}
    >
      <Animated.View style={[styles.submittedContent, { opacity: fade, transform: [{ translateY: slide }] }]}>
        <View style={[styles.submittedIcon, { borderColor: "rgba(201,168,76,0.3)", backgroundColor: "rgba(201,168,76,0.07)" }]}>
          <Text style={{ fontSize: 42 }}>🏨</Text>
        </View>
        <Text style={styles.submittedTitle}>Request Submitted!</Text>
        <Text style={[styles.submittedSub, { color: colors.mutedForeground }]}>
          Your reservation is with our concierge team. You'll be notified once confirmed.
        </Text>

        {/* Digital Pass */}
        <View style={[styles.passCard, { borderColor: "rgba(201,168,76,0.28)", backgroundColor: "#0A0A0A" }]}>
          <View style={styles.passTop}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Feather name="star" size={10} color={GOLD} />
              <Text style={styles.passLabel}>OTC CONCIERGE PASS</Text>
            </View>
            <View style={[styles.pendingBadge, { backgroundColor: "rgba(255,149,0,0.12)", borderColor: "rgba(255,149,0,0.28)" }]}>
              <View style={[styles.statusDot, { backgroundColor: "#FF9500" }]} />
              <Text style={[styles.pendingText, { color: "#FF9500" }]}>PENDING REVIEW</Text>
            </View>
          </View>

          <View style={[styles.passDivider, { backgroundColor: "rgba(201,168,76,0.12)" }]} />

          <View style={styles.passBody}>
            <Text style={styles.passHotelName} numberOfLines={1}>{booking.hotel_name}</Text>
            <Text style={[styles.passRoomType, { color: GOLD }]}>{booking.room_type}</Text>

            <View style={styles.passDates}>
              <View style={styles.passDateCol}>
                <Text style={[styles.passDateLabel, { color: colors.mutedForeground }]}>CHECK-IN</Text>
                <Text style={styles.passDateVal}>{formatDate(booking.check_in).replace(/^\w+, /, "")}</Text>
              </View>
              <View style={styles.passArrowWrap}>
                <View style={[styles.passArrowLine, { backgroundColor: "rgba(201,168,76,0.3)" }]} />
                <Feather name="moon" size={12} color={GOLD} />
                <Text style={[{ fontSize: 10, fontFamily: "Inter_600SemiBold", color: GOLD }]}>
                  {booking.nights}n
                </Text>
                <View style={[styles.passArrowLine, { backgroundColor: "rgba(201,168,76,0.3)" }]} />
              </View>
              <View style={[styles.passDateCol, { alignItems: "flex-end" }]}>
                <Text style={[styles.passDateLabel, { color: colors.mutedForeground }]}>CHECK-OUT</Text>
                <Text style={styles.passDateVal}>{formatDate(booking.check_out).replace(/^\w+, /, "")}</Text>
              </View>
            </View>

            <View style={[styles.passTotalRow, { borderTopColor: "rgba(201,168,76,0.12)" }]}>
              <Text style={[styles.passTotalLabel, { color: colors.mutedForeground }]}>Estimated Total</Text>
              <Text style={styles.passTotalVal}>PKR {booking.total_cost.toLocaleString()}</Text>
            </View>
          </View>
          <Text style={[styles.passNote, { color: colors.mutedForeground }]}>
            * Pass activates upon admin confirmation
          </Text>
        </View>

        {/* Status flow */}
        <View style={styles.statusFlow}>
          {[
            { icon: "send" as const,          label: "Submitted",         done: true  },
            { icon: "clock" as const,         label: "Concierge\nReview", done: false },
            { icon: "check-circle" as const,  label: "Ready for\nCheck-in", done: false },
          ].map((s, i) => (
            <React.Fragment key={s.label}>
              <View style={styles.statusStep}>
                <View style={[styles.statusDotBox, {
                  backgroundColor: s.done ? GOLD : "#1A1A1A",
                  borderColor: s.done ? GOLD : "#333333",
                }]}>
                  <Feather name={s.icon} size={13} color={s.done ? "#050505" : "#555555"} />
                </View>
                <Text style={[styles.statusStepLabel, { color: s.done ? GOLD : "#555555" }]}>
                  {s.label}
                </Text>
              </View>
              {i < 2 && <View style={[styles.statusLine, { backgroundColor: "#222222" }]} />}
            </React.Fragment>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.viewResBtn, { backgroundColor: GOLD }]}
          onPress={onViewBookings}
          activeOpacity={0.88}
        >
          <Feather name="list" size={16} color="#050505" />
          <Text style={styles.viewResBtnText}>View My Reservations</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.backBtn2, { borderColor: "rgba(201,168,76,0.3)" }]}
          onPress={onBackToGallery}
          activeOpacity={0.85}
        >
          <Text style={[styles.backBtn2Text, { color: GOLD }]}>Back to Collection</Text>
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );
}

// ── Root ────────────────────────────────────────────────────────────────────

export default function HotelScreen() {
  const { hotels, isLoadingHotels, isSubmitting, fetchHotels, submitBooking } = useHotel();
  const [step, setStep] = useState<Step>("gallery");
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [submittedBooking, setSubmittedBooking] = useState<HotelBooking | null>(null);

  useEffect(() => { fetchHotels(); }, [fetchHotels]);

  const handleSelectHotel = useCallback((h: Hotel) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedHotel(h);
    setStep("detail");
  }, []);

  const handleSubmit = useCallback(async (
    roomType: string, roomRate: number,
    checkIn: string, checkOut: string,
    nights: number, proposedRate: number | null,
  ) => {
    if (!selectedHotel) return;
    const booking = await submitBooking({
      hotelId: selectedHotel.id, roomType, roomRate,
      checkIn, checkOut, nights, proposedRate,
    });
    setSubmittedBooking(booking);
    setStep("submitted");
  }, [selectedHotel, submitBooking]);

  return (
    <View style={[styles.root, { backgroundColor: "#000000" }]}>
      {step === "gallery" && (
        <GalleryScreen hotels={hotels} isLoading={isLoadingHotels} onSelect={handleSelectHotel} />
      )}
      {step === "detail" && selectedHotel && (
        <DetailScreen
          hotel={selectedHotel}
          onBack={() => setStep("gallery")}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      )}
      {step === "submitted" && submittedBooking && (
        <SubmittedScreen
          booking={submittedBooking}
          onViewBookings={() => router.push("/services/hotel-bookings")}
          onBackToGallery={() => {
            setStep("gallery");
            setSelectedHotel(null);
            setSubmittedBooking(null);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backBtn: { alignSelf: "flex-start", padding: 4, marginBottom: 12 },

  // Gallery
  galleryScroll: { paddingHorizontal: 20, gap: 0 },
  galleryHeader: { gap: 6, marginBottom: 20 },
  collectionBadge: {
    flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start",
    backgroundColor: "rgba(201,168,76,0.08)", borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: "rgba(201,168,76,0.2)", marginBottom: 6,
  },
  collectionBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold", color: GOLD, letterSpacing: 1.5 },
  galleryTitle: { fontSize: 30, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  gallerySub: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },

  myResStrip: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#0D0D0D",
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13,
    marginBottom: 24, borderWidth: 1, gap: 10,
  },
  myResText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
  myResHint: { fontSize: 12, fontFamily: "Inter_400Regular" },

  loadingBox: { alignItems: "center", gap: 12, paddingVertical: 60 },
  loadingText: { fontSize: 13, fontFamily: "Inter_400Regular" },

  // Hotel Card
  hotelCard: { backgroundColor: "#0A0A0A", borderRadius: 20, borderWidth: 1, overflow: "hidden" },
  hotelImageWrap: { width: "100%", height: 215, position: "relative" },
  hotelImage: { width: "100%", height: "100%" },
  imageScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.38)" },
  cardOverlay: {
    position: "absolute", top: 14, left: 14, right: 14,
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
  },
  cityBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 7,
    paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: "rgba(201,168,76,0.25)",
  },
  cityBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: "#EEEEEE" },
  unavailOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center", justifyContent: "center",
  },
  unavailText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#666666" },
  hotelCardBody: { padding: 16, gap: 12 },
  hotelCardRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  hotelName: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#FFFFFF", marginBottom: 3 },
  hotelDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  priceTag: { alignItems: "flex-end" },
  priceFrom: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#888888", letterSpacing: 1 },
  priceAmount: { fontSize: 22, fontFamily: "Inter_700Bold", color: GOLD_BRIGHT },
  priceNight: { fontSize: 9, fontFamily: "Inter_400Regular", color: "#888888" },
  amenityRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  amenityChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#1A1A1A", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3,
  },
  amenityChipText: { fontSize: 9, fontFamily: "Inter_400Regular" },
  selectBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, borderWidth: 1, borderRadius: 10, paddingVertical: 10,
  },
  selectBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: GOLD },

  // Promise
  promiseCard: { padding: 18, marginTop: 8, gap: 12 },
  promiseTitle: { fontSize: 13, fontFamily: "Inter_700Bold", color: GOLD, letterSpacing: 0.5 },
  promiseDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: GOLD },
  promiseLine: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },

  // Carousel
  dotRow: {
    position: "absolute", bottom: 14, left: 0, right: 0,
    flexDirection: "row", justifyContent: "center", gap: 5,
  },
  dot: { height: 6, borderRadius: 3 },

  // Detail
  detailMeta: { padding: 20, paddingBottom: 4, gap: 6 },
  detailName: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  detailCity: { fontSize: 13, fontFamily: "Inter_400Regular" },
  detailBody: { paddingHorizontal: 20, paddingBottom: 20, gap: 18 },
  detailDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  sectionLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 2 },

  // Room chips
  roomChip: { width: 175, borderRadius: 14, borderWidth: 1, padding: 14, gap: 4 },
  roomChipName: { fontSize: 14, fontFamily: "Inter_700Bold" },
  roomChipRate: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  roomChipDesc: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16, marginTop: 4 },
  roomChipGuests: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 2 },

  // Amenities
  amenitiesCard: { padding: 16, gap: 14 },
  amenitiesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  amenityItem: { width: "44%", flexDirection: "row", alignItems: "center", gap: 10 },
  amenityIconBox: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: "rgba(201,168,76,0.08)", alignItems: "center", justifyContent: "center",
  },
  amenityItemText: { fontSize: 12, fontFamily: "Inter_500Medium", flex: 1 },

  // Date picker
  datePicker: { padding: 18, gap: 16 },
  dateGrid: { flexDirection: "row", gap: 10 },
  dateField: { flex: 1, gap: 8 },
  dateFieldLabel: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1.2, textTransform: "uppercase", textAlign: "center" },
  dateControl: { flexDirection: "row", alignItems: "center", gap: 4 },
  dateArrowBtn: { width: 30, height: 30, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  dateVal: { fontSize: 12, fontFamily: "Inter_700Bold", textAlign: "center" },
  dateSub: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 2, textAlign: "center" },
  dateSeparator: { width: 1, alignSelf: "stretch", marginTop: 20 },
  nightsBadge: {
    flexDirection: "row", alignItems: "center", gap: 7, alignSelf: "center",
    paddingHorizontal: 18, paddingVertical: 9, borderRadius: 20, borderWidth: 1,
  },
  nightsBadgeText: { fontSize: 13, fontFamily: "Inter_700Bold" },

  // Negotiation
  negotiateCard: { padding: 18, gap: 10 },
  negotiateHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  negotiateTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginTop: 4 },
  negotiateSub: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  toggle: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  toggleText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  proposedWrap: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, gap: 8, marginTop: 4,
  },
  proposedCurrency: { fontSize: 14, fontFamily: "Inter_700Bold" },
  proposedInput: { flex: 1, fontSize: 22, fontFamily: "Inter_700Bold" },
  proposedUnit: { fontSize: 13, fontFamily: "Inter_400Regular" },

  // Summary
  summaryCard: { padding: 18, gap: 10 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  summaryValue: { fontSize: 13, fontFamily: "Inter_600SemiBold", maxWidth: "55%", textAlign: "right" },
  summaryTotal: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, paddingTop: 12, marginTop: 4 },
  summaryTotalLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  summaryTotalValue: { fontSize: 20, fontFamily: "Inter_700Bold", color: GOLD_BRIGHT },
  summaryNote: { fontSize: 11, fontFamily: "Inter_400Regular", fontStyle: "italic" },

  // CTA bar
  ctaBar: { paddingHorizontal: 20, paddingTop: 12, backgroundColor: "#000000", borderTopWidth: 1 },
  ctaBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 16, paddingVertical: 16 },
  ctaBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#050505" },

  // Submitted
  submittedScroll: { flexGrow: 1, justifyContent: "center" },
  submittedContent: { paddingHorizontal: 24, gap: 20, alignItems: "center" },
  submittedIcon: { width: 90, height: 90, borderRadius: 45, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  submittedTitle: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#FFFFFF", textAlign: "center" },
  submittedSub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },

  // Digital Pass
  passCard: { width: "100%", borderRadius: 18, borderWidth: 1, overflow: "hidden" },
  passTop: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 16, paddingBottom: 12,
  },
  passLabel: { fontSize: 10, fontFamily: "Inter_700Bold", color: GOLD, letterSpacing: 1.5 },
  pendingBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  pendingText: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  passDivider: { height: 1, marginHorizontal: 16 },
  passBody: { padding: 16, gap: 10 },
  passHotelName: { fontSize: 19, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  passRoomType: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  passDates: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  passDateCol: { flex: 1, gap: 3 },
  passDateLabel: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1, textTransform: "uppercase" },
  passDateVal: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
  passArrowWrap: { flexDirection: "row", alignItems: "center", gap: 4 },
  passArrowLine: { width: 16, height: 1 },
  passTotalRow: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, paddingTop: 12 },
  passTotalLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  passTotalVal: { fontSize: 18, fontFamily: "Inter_700Bold", color: GOLD_BRIGHT },
  passNote: { fontSize: 10, fontFamily: "Inter_400Regular", fontStyle: "italic", paddingHorizontal: 16, paddingBottom: 14 },

  // Status flow
  statusFlow: { flexDirection: "row", alignItems: "center", width: "100%" },
  statusStep: { flex: 1, alignItems: "center", gap: 6 },
  statusDotBox: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  statusStepLabel: { fontSize: 10, fontFamily: "Inter_500Medium", textAlign: "center" },
  statusLine: { flex: 1, height: 2, marginBottom: 22 },

  viewResBtn: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, paddingVertical: 15 },
  viewResBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#050505" },
  backBtn2: { width: "100%", borderRadius: 14, borderWidth: 1, paddingVertical: 14, alignItems: "center" },
  backBtn2Text: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
