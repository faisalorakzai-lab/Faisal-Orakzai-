import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CoinBadge } from "@/components/CoinBadge";
import { GlassCard } from "@/components/GlassCard";
import { useWallet } from "@/contexts/WalletContext";
import { useColors } from "@/hooks/useColors";

type Step = "browse" | "room" | "confirm";

interface Hotel {
  id: string;
  name: string;
  location: string;
  stars: number;
  tag: string;
  pricePerNight: number;
  rating: number;
  amenities: string[];
  description: string;
}

type FeatherIconName = React.ComponentProps<typeof Feather>["name"];

interface RoomType {
  id: string;
  label: string;
  icon: FeatherIconName;
  description: string;
  multiplier: number;
  beds: string;
}

const HOTELS: Hotel[] = [
  {
    id: "orakzai-grand",
    name: "Orakzai Grand",
    location: "Karachi, DHA Phase 5",
    stars: 5,
    tag: "OTC Partner",
    pricePerNight: 15000,
    rating: 4.9,
    amenities: ["Free WiFi", "Pool", "Spa", "Restaurant", "Gym"],
    description: "Flagship partner property — OTC's premier hotel in Karachi with exclusive rates for app users.",
  },
  {
    id: "orakzai-towers",
    name: "Orakzai Towers",
    location: "Lahore, Gulberg III",
    stars: 5,
    tag: "OTC Partner",
    pricePerNight: 18000,
    rating: 4.8,
    amenities: ["Free WiFi", "Pool", "Business Center", "Restaurant", "Rooftop Bar"],
    description: "Modern 5-star business hotel in the heart of Lahore's business district.",
  },
  {
    id: "orakzai-suites",
    name: "Orakzai Suites",
    location: "Islamabad, F-6",
    stars: 4,
    tag: "OTC Partner",
    pricePerNight: 9500,
    rating: 4.7,
    amenities: ["Free WiFi", "Restaurant", "Gym", "Conference Rooms"],
    description: "Boutique all-suites property close to the diplomatic enclave with OTC exclusive pricing.",
  },
  {
    id: "orakzai-resort",
    name: "Orakzai Resort & Spa",
    location: "Murree, Kashmir Point",
    stars: 4,
    tag: "OTC Partner",
    pricePerNight: 12000,
    rating: 4.6,
    amenities: ["Free WiFi", "Spa", "Mountain View", "Restaurant", "Hiking Trails"],
    description: "Hillside retreat with panoramic views, ideal for weekend escapes from the city.",
  },
];

const ROOM_TYPES: RoomType[] = [
  {
    id: "standard",
    label: "Standard Room",
    icon: "square",
    description: "Comfortable king/queen bed, city view",
    multiplier: 1,
    beds: "1 King Bed",
  },
  {
    id: "deluxe",
    label: "Deluxe Room",
    icon: "maximize",
    description: "Spacious room with premium furnishings",
    multiplier: 1.4,
    beds: "1 King Bed",
  },
  {
    id: "suite",
    label: "Executive Suite",
    icon: "star",
    description: "Separate lounge, panoramic views",
    multiplier: 2,
    beds: "1 King + Sofa Bed",
  },
  {
    id: "penthouse",
    label: "Presidential Suite",
    icon: "award",
    description: "Full floor, private dining, butler",
    multiplier: 3.5,
    beds: "2 King Beds",
  },
];

const COIN_REWARD = 15;
const COINS_PER_PKR = 50;

export default function HotelScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addTransaction, balance } = useWallet();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 16);

  const [step, setStep] = useState<Step>("browse");
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<RoomType | null>(null);
  const [nights, setNights] = useState(1);
  const [coinsToRedeem, setCoinsToRedeem] = useState(0);
  const [confirmed, setConfirmed] = useState(false);

  const roomBasePrice = selectedHotel ? Math.round(selectedHotel.pricePerNight * (selectedRoom?.multiplier ?? 1)) : 0;
  const totalBeforeDiscount = roomBasePrice * nights;
  const maxRedeemable = Math.min(balance, Math.floor(totalBeforeDiscount / COINS_PER_PKR));
  const coinDiscount = coinsToRedeem * COINS_PER_PKR;
  const finalTotal = Math.max(0, totalBeforeDiscount - coinDiscount);

  function handleHotelContinue() {
    if (!selectedHotel) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep("room");
  }

  function handleRoomContinue() {
    if (!selectedRoom) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep("confirm");
  }

  function handleConfirm() {
    if (confirmed) return;
    setConfirmed(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (coinsToRedeem > 0) {
      addTransaction({
        type: "debit",
        amount: coinsToRedeem,
        description: `OTC Coins redeemed — ${selectedHotel?.name}`,
        category: "hotel",
      });
    }
    addTransaction({
      type: "credit",
      amount: COIN_REWARD,
      description: `Hotel booking reward — ${selectedHotel?.name}`,
      category: "hotel",
    });
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: topPad,
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 100),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            if (step === "room") { setStep("browse"); return; }
            if (step === "confirm" && !confirmed) { setStep("room"); return; }
            router.back();
          }}
          activeOpacity={0.8}
        >
          <Feather name="arrow-left" size={22} color={colors.gold} />
        </TouchableOpacity>

        <View style={styles.headerRow}>
          <View style={[styles.heroIcon, { backgroundColor: "rgba(255,215,0,0.08)", borderColor: colors.glassBorder }]}>
            <Feather name="home" size={36} color={colors.gold} />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.screenTitle, { color: colors.foreground }]}>Hotel Booking</Text>
            <Text style={[styles.screenSub, { color: colors.mutedForeground }]}>Orakzai partner hotels</Text>
          </View>
        </View>

        <View style={styles.stepPills}>
          {(["browse", "room", "confirm"] as Step[]).map((s, i) => (
            <View key={s} style={styles.pillRow}>
              <View style={[
                styles.pill,
                {
                  backgroundColor: step === s ? colors.gold : (
                    (["browse", "room", "confirm"].indexOf(step) > i) ? "rgba(255,215,0,0.3)" : colors.muted
                  ),
                },
              ]}>
                <Text style={[styles.pillText, { color: step === s ? "#050505" : colors.mutedForeground }]}>
                  {i + 1}
                </Text>
              </View>
              {i < 2 && <View style={[styles.pillLine, { backgroundColor: colors.border }]} />}
            </View>
          ))}
        </View>

        {step === "browse" && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Partner Properties</Text>
            <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>Exclusive OTC rates across Pakistan</Text>

            {HOTELS.map((hotel) => (
              <TouchableOpacity
                key={hotel.id}
                onPress={() => {
                  setSelectedHotel(hotel);
                  Haptics.selectionAsync();
                }}
                activeOpacity={0.85}
              >
                <GlassCard
                  variant={selectedHotel?.id === hotel.id ? "gold" : "default"}
                  style={[styles.hotelCard, selectedHotel?.id === hotel.id && { borderColor: colors.gold }]}
                >
                  <View style={styles.hotelTop}>
                    <View style={[styles.hotelThumb, { backgroundColor: "rgba(255,215,0,0.06)", borderRadius: 12 }]}>
                      <Feather name="home" size={24} color={colors.gold} />
                    </View>
                    <View style={styles.hotelInfo}>
                      <View style={styles.hotelNameRow}>
                        <Text style={[styles.hotelName, { color: colors.foreground }]}>{hotel.name}</Text>
                        {selectedHotel?.id === hotel.id && (
                          <View style={[styles.checkBadge, { backgroundColor: colors.gold, borderRadius: 12 }]}>
                            <Feather name="check" size={12} color="#050505" />
                          </View>
                        )}
                      </View>
                      <View style={styles.hotelMeta}>
                        <Feather name="map-pin" size={11} color={colors.mutedForeground} />
                        <Text style={[styles.hotelLocation, { color: colors.mutedForeground }]}>{hotel.location}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.hotelRatingRow}>
                    <View style={styles.starsRow}>
                      {Array.from({ length: hotel.stars }).map((_, i) => (
                        <Feather key={i} name="star" size={11} color={colors.gold} />
                      ))}
                    </View>
                    <View style={[styles.tagBadge, { backgroundColor: "rgba(255,215,0,0.12)", borderRadius: 8 }]}>
                      <Text style={[styles.tagText, { color: colors.gold }]}>{hotel.tag}</Text>
                    </View>
                    <View style={styles.ratingBadge}>
                      <Feather name="star" size={11} color={colors.gold} />
                      <Text style={[styles.ratingText, { color: colors.foreground }]}>{hotel.rating}</Text>
                    </View>
                  </View>

                  <Text style={[styles.hotelDesc, { color: colors.mutedForeground }]} numberOfLines={2}>{hotel.description}</Text>

                  <View style={[styles.hotelFooter, { borderTopColor: colors.border }]}>
                    <View style={styles.amenitiesRow}>
                      {hotel.amenities.slice(0, 3).map((a) => (
                        <View key={a} style={[styles.amenityBadge, { backgroundColor: colors.glassBackground, borderColor: colors.glassBorder, borderRadius: 8 }]}>
                          <Text style={[styles.amenityText, { color: colors.mutedForeground }]}>{a}</Text>
                        </View>
                      ))}
                      {hotel.amenities.length > 3 && (
                        <Text style={[styles.amenityMore, { color: colors.mutedForeground }]}>+{hotel.amenities.length - 3}</Text>
                      )}
                    </View>
                    <Text style={[styles.hotelPrice, { color: colors.gold }]}>
                      PKR {hotel.pricePerNight.toLocaleString()}<Text style={{ fontSize: 11 }}>/night</Text>
                    </Text>
                  </View>
                </GlassCard>
              </TouchableOpacity>
            ))}

            <GlassCard variant="gold" style={styles.coinsNote}>
              <Feather name="star" size={14} color={colors.gold} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.rewardText, { color: colors.foreground }]}>
                  Earn <Text style={{ color: colors.gold, fontFamily: "Inter_700Bold" }}>+{COIN_REWARD} OTC Coins</Text> on every booking
                </Text>
                <Text style={[styles.coinsSub, { color: colors.mutedForeground }]}>
                  Redeem coins to discount your stay (1 coin = PKR {COINS_PER_PKR} off)
                </Text>
              </View>
            </GlassCard>
          </View>
        )}

        {step === "room" && selectedHotel && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Room Type</Text>
            <GlassCard style={styles.selectedHotelCard}>
              <View style={styles.selectedHotelRow}>
                <Feather name="home" size={18} color={colors.gold} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.selHotelName, { color: colors.foreground }]}>{selectedHotel.name}</Text>
                  <Text style={[styles.selHotelLoc, { color: colors.mutedForeground }]}>{selectedHotel.location}</Text>
                </View>
              </View>
            </GlassCard>

            <View style={styles.nightsRow}>
              <Text style={[styles.nightsLabel, { color: colors.foreground }]}>Nights</Text>
              <View style={styles.nightsControl}>
                <TouchableOpacity
                  style={[styles.nightsBtn, { backgroundColor: colors.glassBackground, borderColor: colors.glassBorder }]}
                  onPress={() => setNights(Math.max(1, nights - 1))}
                  activeOpacity={0.8}
                >
                  <Feather name="minus" size={16} color={colors.foreground} />
                </TouchableOpacity>
                <Text style={[styles.nightsNum, { color: colors.foreground }]}>{nights}</Text>
                <TouchableOpacity
                  style={[styles.nightsBtn, { backgroundColor: colors.glassBackground, borderColor: colors.glassBorder }]}
                  onPress={() => setNights(Math.min(30, nights + 1))}
                  activeOpacity={0.8}
                >
                  <Feather name="plus" size={16} color={colors.foreground} />
                </TouchableOpacity>
              </View>
            </View>

            {ROOM_TYPES.map((room) => {
              const price = Math.round(selectedHotel.pricePerNight * room.multiplier);
              return (
                <TouchableOpacity
                  key={room.id}
                  onPress={() => {
                    setSelectedRoom(room);
                    Haptics.selectionAsync();
                  }}
                  activeOpacity={0.85}
                >
                  <GlassCard
                    variant={selectedRoom?.id === room.id ? "gold" : "default"}
                    style={[styles.roomCard, selectedRoom?.id === room.id && { borderColor: colors.gold }]}
                  >
                    <View style={[styles.roomIcon, { backgroundColor: "rgba(255,215,0,0.08)", borderRadius: 12 }]}>
                      <Feather name={room.icon} size={22} color={colors.gold} />
                    </View>
                    <View style={styles.roomInfo}>
                      <Text style={[styles.roomLabel, { color: colors.foreground }]}>{room.label}</Text>
                      <Text style={[styles.roomDesc, { color: colors.mutedForeground }]}>{room.description}</Text>
                      <View style={styles.roomBed}>
                        <Feather name="moon" size={11} color={colors.mutedForeground} />
                        <Text style={[styles.roomBedText, { color: colors.mutedForeground }]}>{room.beds}</Text>
                      </View>
                    </View>
                    <View style={styles.roomPrice}>
                      <Text style={[styles.roomRate, { color: colors.gold }]}>PKR {price.toLocaleString()}</Text>
                      <Text style={[styles.roomRateUnit, { color: colors.mutedForeground }]}>/night</Text>
                      {selectedRoom?.id === room.id && (
                        <View style={[styles.checkBadge, { backgroundColor: colors.gold, borderRadius: 12, marginTop: 6 }]}>
                          <Feather name="check" size={12} color="#050505" />
                        </View>
                      )}
                    </View>
                  </GlassCard>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {step === "confirm" && selectedHotel && selectedRoom && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              {confirmed ? "Booking Confirmed!" : "Review & Pay"}
            </Text>

            <GlassCard style={styles.summaryCard}>
              <Text style={[styles.summaryHeader, { color: colors.mutedForeground }]}>Booking Details</Text>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Property</Text>
                <Text style={[styles.summaryVal, { color: colors.foreground }]}>{selectedHotel.name}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Location</Text>
                <Text style={[styles.summaryVal, { color: colors.foreground }]}>{selectedHotel.location}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Room</Text>
                <Text style={[styles.summaryVal, { color: colors.foreground }]}>{selectedRoom.label}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Nights</Text>
                <Text style={[styles.summaryVal, { color: colors.foreground }]}>{nights}</Text>
              </View>
              <View style={[styles.summaryDivider, { borderColor: colors.border }]} />
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Subtotal</Text>
                <Text style={[styles.summaryVal, { color: colors.foreground }]}>PKR {totalBeforeDiscount.toLocaleString()}</Text>
              </View>
              {coinsToRedeem > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Coins Discount</Text>
                  <Text style={[styles.summaryVal, { color: "#4CAF50" }]}>- PKR {coinDiscount.toLocaleString()}</Text>
                </View>
              )}
              <View style={styles.summaryRow}>
                <Text style={[styles.totalLabel, { color: colors.foreground }]}>Total</Text>
                <Text style={[styles.totalVal, { color: colors.gold }]}>PKR {finalTotal.toLocaleString()}</Text>
              </View>
            </GlassCard>

            {!confirmed && (
              <GlassCard variant="gold" style={styles.coinsRedeemCard}>
                <View style={styles.coinsRedeemHeader}>
                  <Feather name="star" size={16} color={colors.gold} />
                  <Text style={[styles.coinsRedeemTitle, { color: colors.foreground }]}>Redeem OTC Coins</Text>
                  <CoinBadge amount={balance} size="sm" />
                </View>
                <Text style={[styles.coinsRedeemSub, { color: colors.mutedForeground }]}>
                  Each coin = PKR {COINS_PER_PKR} off your stay
                </Text>
                <View style={styles.coinsSlider}>
                  <TouchableOpacity
                    style={[styles.coinBtn, { backgroundColor: colors.glassBackground, borderColor: colors.glassBorder }]}
                    onPress={() => setCoinsToRedeem(0)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.coinBtnText, { color: colors.foreground }]}>None</Text>
                  </TouchableOpacity>
                  {[Math.floor(maxRedeemable * 0.25), Math.floor(maxRedeemable * 0.5), Math.floor(maxRedeemable * 0.75), maxRedeemable].filter((v, i, arr) => v > 0 && arr.indexOf(v) === i).map((val) => (
                    <TouchableOpacity
                      key={val}
                      style={[
                        styles.coinBtn,
                        {
                          backgroundColor: coinsToRedeem === val ? colors.gold : colors.glassBackground,
                          borderColor: coinsToRedeem === val ? colors.gold : colors.glassBorder,
                        },
                      ]}
                      onPress={() => {
                        setCoinsToRedeem(val);
                        Haptics.selectionAsync();
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.coinBtnText, { color: coinsToRedeem === val ? "#050505" : colors.foreground }]}>
                        {val}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {coinsToRedeem > 0 && (
                  <Text style={[styles.coinsSaving, { color: "#4CAF50" }]}>
                    Saving PKR {coinDiscount.toLocaleString()} with {coinsToRedeem} coins
                  </Text>
                )}
                {maxRedeemable === 0 && (
                  <Text style={[styles.coinsSaving, { color: colors.mutedForeground }]}>
                    You don't have enough coins to redeem yet
                  </Text>
                )}
              </GlassCard>
            )}

            {confirmed && (
              <GlassCard variant="gold" style={styles.confirmedCard}>
                <View style={[styles.confirmedIcon, { backgroundColor: "rgba(76,175,80,0.15)", borderRadius: 32 }]}>
                  <Feather name="check-circle" size={32} color="#4CAF50" />
                </View>
                <Text style={[styles.confirmedTitle, { color: colors.foreground }]}>Booking Confirmed</Text>
                <Text style={[styles.confirmedSub, { color: colors.mutedForeground }]}>
                  Your stay at {selectedHotel.name} has been confirmed.
                  {coinsToRedeem > 0 ? ` ${coinsToRedeem} coins redeemed.` : ""}
                </Text>
                <View style={styles.confirmedReward}>
                  <Feather name="star" size={14} color={colors.gold} />
                  <Text style={[styles.confirmedRewardText, { color: colors.gold }]}>
                    +{COIN_REWARD} OTC Coins earned
                  </Text>
                </View>
              </GlassCard>
            )}
          </View>
        )}
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 16), backgroundColor: colors.background, borderTopColor: colors.border }]}>
        {step === "browse" && (
          <TouchableOpacity
            style={[styles.cta, { backgroundColor: selectedHotel ? colors.gold : colors.muted, borderRadius: colors.radius }]}
            onPress={handleHotelContinue}
            activeOpacity={0.85}
            disabled={!selectedHotel}
          >
            <Text style={[styles.ctaText, { color: selectedHotel ? "#050505" : colors.mutedForeground }]}>
              {selectedHotel ? `View ${selectedHotel.name}` : "Select a Property"}
            </Text>
            <Feather name="arrow-right" size={18} color={selectedHotel ? "#050505" : colors.mutedForeground} />
          </TouchableOpacity>
        )}
        {step === "room" && (
          <TouchableOpacity
            style={[styles.cta, { backgroundColor: selectedRoom ? colors.gold : colors.muted, borderRadius: colors.radius }]}
            onPress={handleRoomContinue}
            activeOpacity={0.85}
            disabled={!selectedRoom}
          >
            <Text style={[styles.ctaText, { color: selectedRoom ? "#050505" : colors.mutedForeground }]}>
              {selectedRoom ? `Continue · PKR ${(Math.round(selectedHotel!.pricePerNight * selectedRoom.multiplier) * nights).toLocaleString()}` : "Choose a Room"}
            </Text>
            <Feather name="arrow-right" size={18} color={selectedRoom ? "#050505" : colors.mutedForeground} />
          </TouchableOpacity>
        )}
        {step === "confirm" && !confirmed && (
          <TouchableOpacity
            style={[styles.cta, { backgroundColor: colors.gold, borderRadius: colors.radius }]}
            onPress={handleConfirm}
            activeOpacity={0.85}
          >
            <Text style={[styles.ctaText, { color: "#050505" }]}>
              Confirm Booking · PKR {finalTotal.toLocaleString()}
            </Text>
            <Feather name="check" size={18} color="#050505" />
          </TouchableOpacity>
        )}
        {step === "confirm" && confirmed && (
          <TouchableOpacity
            style={[styles.cta, { backgroundColor: colors.gold, borderRadius: colors.radius }]}
            onPress={() => router.back()}
            activeOpacity={0.85}
          >
            <Text style={[styles.ctaText, { color: "#050505" }]}>Back to Home</Text>
            <Feather name="home" size={18} color="#050505" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20, gap: 16 },
  backBtn: { alignSelf: "flex-start", padding: 4, marginBottom: 4 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1 },
  screenTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  screenSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  stepPills: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  pillRow: { flexDirection: "row", alignItems: "center" },
  pill: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  pillText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  pillLine: { width: 40, height: 2 },
  section: { gap: 14 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  sectionSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: -8 },
  hotelCard: { padding: 16, gap: 10 },
  hotelTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  hotelThumb: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  hotelInfo: { flex: 1 },
  hotelNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  hotelName: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1 },
  checkBadge: { width: 24, height: 24, alignItems: "center", justifyContent: "center" },
  hotelMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  hotelLocation: { fontSize: 12, fontFamily: "Inter_400Regular" },
  hotelRatingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  starsRow: { flexDirection: "row", gap: 2 },
  tagBadge: { paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.3 },
  ratingBadge: { flexDirection: "row", alignItems: "center", gap: 4, marginLeft: "auto" },
  ratingText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  hotelDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  hotelFooter: { flexDirection: "row", alignItems: "center", borderTopWidth: 1, paddingTop: 10 },
  amenitiesRow: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 6 },
  amenityBadge: { paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1 },
  amenityText: { fontSize: 10, fontFamily: "Inter_400Regular" },
  amenityMore: { fontSize: 11, fontFamily: "Inter_500Medium", alignSelf: "center" },
  hotelPrice: { fontSize: 14, fontFamily: "Inter_700Bold", marginLeft: 8 },
  coinsNote: { padding: 14, flexDirection: "row", gap: 10, alignItems: "flex-start" },
  rewardText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  coinsSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  selectedHotelCard: { padding: 14 },
  selectedHotelRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  selHotelName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  selHotelLoc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  nightsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  nightsLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  nightsControl: { flexDirection: "row", alignItems: "center", gap: 16 },
  nightsBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  nightsNum: { fontSize: 20, fontFamily: "Inter_700Bold", minWidth: 30, textAlign: "center" },
  roomCard: { padding: 14, flexDirection: "row", alignItems: "flex-start", gap: 12 },
  roomIcon: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  roomInfo: { flex: 1, gap: 4 },
  roomLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  roomDesc: { fontSize: 12, fontFamily: "Inter_400Regular" },
  roomBed: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  roomBedText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  roomPrice: { alignItems: "flex-end" },
  roomRate: { fontSize: 14, fontFamily: "Inter_700Bold" },
  roomRateUnit: { fontSize: 11, fontFamily: "Inter_400Regular" },
  summaryCard: { padding: 16, gap: 10 },
  summaryHeader: { fontSize: 11, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  summaryVal: { fontSize: 13, fontFamily: "Inter_500Medium" },
  summaryDivider: { borderTopWidth: 1, marginVertical: 4 },
  totalLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  totalVal: { fontSize: 18, fontFamily: "Inter_700Bold" },
  coinsRedeemCard: { padding: 16, gap: 10 },
  coinsRedeemHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  coinsRedeemTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1 },
  coinsRedeemSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  coinsSlider: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  coinBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
  },
  coinBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  coinsSaving: { fontSize: 13, fontFamily: "Inter_500Medium" },
  confirmedCard: { padding: 24, alignItems: "center", gap: 12 },
  confirmedIcon: { width: 64, height: 64, alignItems: "center", justifyContent: "center" },
  confirmedTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  confirmedSub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  confirmedReward: { flexDirection: "row", alignItems: "center", gap: 6 },
  confirmedRewardText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  bottomBar: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 56,
    gap: 8,
  },
  ctaText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
