import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
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
import { useRental, type Car, type RentalRequest } from "@/contexts/RentalContext";
import { useColors } from "@/hooks/useColors";

const GOLD = "#FFD700";
const SUCCESS = "#34C759";
const DURATION_OPTIONS = [1, 2, 3, 5, 7, 14, 30];

type Step = "catalog" | "detail" | "submitted";

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toISODate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function formatDisplay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-PK", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function CarCard({ car, onSelect }: { car: Car; onSelect: (car: Car) => void }) {
  const colors = useColors();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  function handlePressIn() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(scaleAnim, { toValue: 0.975, useNativeDriver: true, speed: 20 }).start();
  }

  function handlePressOut() {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 14 }).start();
  }

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={() => onSelect(car)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        disabled={!car.available}
      >
        <View style={[
          styles.carCard,
          { borderColor: car.available ? "rgba(255,215,0,0.25)" : "#1A1A1A" },
        ]}>
          <View style={styles.carImageWrap}>
            <Image
              source={{ uri: car.image_url }}
              style={styles.carImage}
              resizeMode="cover"
            />
            <View style={styles.carImageGradient} />
            <View style={styles.carCategoryBadge}>
              <Text style={styles.carCategoryText}>{car.category}</Text>
            </View>
            {!car.available && (
              <View style={styles.unavailableOverlay}>
                <Text style={styles.unavailableText}>Unavailable</Text>
              </View>
            )}
          </View>

          <View style={styles.carCardBody}>
            <View style={styles.carCardTop}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.carName, { color: "#FFFFFF" }]}>{car.name}</Text>
                <View style={styles.specRow}>
                  <View style={styles.specPill}>
                    <Feather name="users" size={10} color={colors.mutedForeground} />
                    <Text style={[styles.specPillText, { color: colors.mutedForeground }]}>
                      {car.seats} seats
                    </Text>
                  </View>
                  <View style={styles.specPill}>
                    <Feather name="settings" size={10} color={colors.mutedForeground} />
                    <Text style={[styles.specPillText, { color: colors.mutedForeground }]}>
                      {car.transmission}
                    </Text>
                  </View>
                  <View style={styles.specPill}>
                    <Feather name="droplet" size={10} color={colors.mutedForeground} />
                    <Text style={[styles.specPillText, { color: colors.mutedForeground }]}>
                      {car.fuel_type}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.rateBox}>
                <Text style={styles.ratePkr}>PKR</Text>
                <Text style={styles.rateAmount}>{(car.base_rate / 1000).toFixed(0)}k</Text>
                <Text style={styles.rateDay}>/day</Text>
              </View>
            </View>

            <View style={[styles.selectBtn, { borderColor: "rgba(255,215,0,0.4)" }]}>
              <Text style={styles.selectBtnText}>View Details & Book</Text>
              <Feather name="arrow-right" size={13} color={GOLD} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function CatalogScreen({
  cars,
  isLoading,
  onSelect,
  onViewBookings,
}: {
  cars: Car[];
  isLoading: boolean;
  onSelect: (car: Car) => void;
  onViewBookings: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 16);

  return (
    <ScrollView
      contentContainerStyle={[
        styles.catalogScroll,
        { paddingTop: topPad, paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 110) },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => router.back()}
        activeOpacity={0.7}
      >
        <Feather name="arrow-left" size={22} color={GOLD} />
      </TouchableOpacity>

      <View style={styles.catalogHeader}>
        <View style={styles.headerBadge}>
          <Feather name="star" size={11} color={GOLD} />
          <Text style={styles.headerBadgeText}>OTC ELITE FLEET</Text>
        </View>
        <Text style={styles.catalogTitle}>Rent A Car</Text>
        <Text style={[styles.catalogSub, { color: colors.mutedForeground }]}>
          Premium vehicles. Negotiable rates. Admin-approved bookings.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.myBookingsStrip}
        onPress={onViewBookings}
        activeOpacity={0.85}
      >
        <View style={styles.myBookingsLeft}>
          <Feather name="clock" size={15} color={GOLD} />
          <Text style={styles.myBookingsText}>My Bookings</Text>
        </View>
        <Text style={[styles.myBookingsHint, { color: colors.mutedForeground }]}>
          Track rental requests
        </Text>
        <Feather name="chevron-right" size={15} color={GOLD} />
      </TouchableOpacity>

      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={GOLD} size="large" />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Loading fleet...
          </Text>
        </View>
      ) : (
        <View style={{ gap: 16 }}>
          {cars.map((car) => (
            <CarCard key={car.id} car={car} onSelect={onSelect} />
          ))}
        </View>
      )}

      <GlassCard variant="gold" style={styles.inclusionsCard}>
        <Text style={styles.inclusionsTitle}>All Rentals Include</Text>
        <View style={styles.inclusionsList}>
          {["Full insurance coverage", "GPS tracking device", "24/7 roadside support", "Free cancellation (24h notice)"].map((item) => (
            <View key={item} style={styles.inclusionRow}>
              <View style={styles.inclusionDot} />
              <Text style={[styles.inclusionText, { color: "#CCCCCC" }]}>{item}</Text>
            </View>
          ))}
        </View>
      </GlassCard>
    </ScrollView>
  );
}

function DetailScreen({
  car,
  onBack,
  onSubmit,
  isSubmitting,
}: {
  car: Car;
  onBack: () => void;
  onSubmit: (startDate: string, endDate: string, days: number, proposedRate: number | null) => void;
  isSubmitting: boolean;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const today = new Date();
  const [startOffset, setStartOffset] = useState(0);
  const [duration, setDuration] = useState(3);
  const [proposedText, setProposedText] = useState(car.base_rate.toString());
  const [useProposed, setUseProposed] = useState(false);

  const startDate = addDays(today, startOffset);
  const endDate = addDays(startDate, duration);
  const startISO = toISODate(startDate);
  const endISO = toISODate(endDate);

  const proposedRate = useProposed
    ? parseInt(proposedText.replace(/[^0-9]/g, ""), 10) || car.base_rate
    : null;
  const effectiveRate = proposedRate ?? car.base_rate;
  const totalCost = effectiveRate * duration;

  function handleBook() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSubmit(startISO, endISO, duration, proposedRate);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.detailScroll,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 120) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingTop: topPad }}>
          <TouchableOpacity
            style={styles.detailBack}
            onPress={onBack}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={22} color={GOLD} />
          </TouchableOpacity>
        </View>

        <View style={styles.heroWrap}>
          <Image
            source={{ uri: car.image_url }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <View style={styles.heroGradient} />
          <View style={styles.heroMeta}>
            <View style={styles.heroCatBadge}>
              <Text style={styles.heroCatText}>{car.category}</Text>
            </View>
            <Text style={styles.heroName}>{car.name}</Text>
            <Text style={styles.heroRate}>
              PKR {car.base_rate.toLocaleString()}
              <Text style={styles.heroRateDay}>/day base rate</Text>
            </Text>
          </View>
        </View>

        <View style={styles.detailBody}>
          <View style={styles.specsGrid}>
            {[
              { icon: "users" as const,    label: "Seats",        value: `${car.seats} persons` },
              { icon: "settings" as const, label: "Transmission", value: car.transmission },
              { icon: "droplet" as const,  label: "Fuel Type",    value: car.fuel_type },
              { icon: "shield" as const,   label: "Insurance",    value: "Included" },
            ].map((spec) => (
              <View key={spec.label} style={[styles.specBox, { borderColor: "rgba(255,215,0,0.15)", backgroundColor: "#111111" }]}>
                <View style={styles.specBoxIcon}>
                  <Feather name={spec.icon} size={16} color={GOLD} />
                </View>
                <Text style={[styles.specBoxLabel, { color: colors.mutedForeground }]}>
                  {spec.label}
                </Text>
                <Text style={[styles.specBoxValue, { color: "#FFFFFF" }]}>{spec.value}</Text>
              </View>
            ))}
          </View>

          <GlassCard style={styles.featuresSection}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              INCLUDED FEATURES
            </Text>
            <View style={styles.featuresGrid}>
              {car.features.map((f) => (
                <View key={f} style={styles.featureChip}>
                  <View style={[styles.featureCheckBox, { backgroundColor: "rgba(52,199,89,0.15)" }]}>
                    <Feather name="check" size={11} color={SUCCESS} />
                  </View>
                  <Text style={[styles.featureChipText, { color: "#DDDDDD" }]}>{f}</Text>
                </View>
              ))}
            </View>
          </GlassCard>

          <GlassCard style={styles.datePicker}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              RENTAL PERIOD
            </Text>

            <View style={styles.dateRow}>
              <View style={styles.dateField}>
                <Text style={[styles.dateFieldLabel, { color: colors.mutedForeground }]}>
                  Pickup Date
                </Text>
                <View style={styles.dateControl}>
                  <TouchableOpacity
                    style={[styles.dateBtn, { borderColor: "rgba(255,215,0,0.25)" }]}
                    onPress={() => { if (startOffset > 0) { setStartOffset((p) => p - 1); Haptics.selectionAsync(); } }}
                    activeOpacity={0.7}
                    disabled={startOffset === 0}
                  >
                    <Feather name="chevron-left" size={16} color={startOffset === 0 ? "#333" : GOLD} />
                  </TouchableOpacity>
                  <Text style={[styles.dateValue, { color: "#FFFFFF" }]}>
                    {startOffset === 0 ? "Today" : startOffset === 1 ? "Tomorrow" : formatDisplay(startISO)}
                  </Text>
                  <TouchableOpacity
                    style={[styles.dateBtn, { borderColor: "rgba(255,215,0,0.25)" }]}
                    onPress={() => { setStartOffset((p) => p + 1); Haptics.selectionAsync(); }}
                    activeOpacity={0.7}
                  >
                    <Feather name="chevron-right" size={16} color={GOLD} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.durationSection}>
              <Text style={[styles.dateFieldLabel, { color: colors.mutedForeground }]}>
                Duration (Days)
              </Text>
              <View style={styles.durationGrid}>
                {DURATION_OPTIONS.map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[
                      styles.durationChip,
                      {
                        backgroundColor: duration === d ? GOLD : "#111111",
                        borderColor: duration === d ? GOLD : "rgba(255,215,0,0.2)",
                      },
                    ]}
                    onPress={() => { setDuration(d); Haptics.selectionAsync(); }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.durationChipNum, { color: duration === d ? "#050505" : "#FFFFFF" }]}>
                      {d}
                    </Text>
                    <Text style={[styles.durationChipUnit, { color: duration === d ? "#333333" : colors.mutedForeground }]}>
                      {d === 1 ? "day" : "days"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={[styles.returnRow, { borderTopColor: "rgba(255,215,0,0.1)" }]}>
              <Feather name="calendar" size={13} color={colors.mutedForeground} />
              <Text style={[styles.returnText, { color: colors.mutedForeground }]}>
                Return: <Text style={{ color: GOLD }}>{formatDisplay(endISO)}</Text>
              </Text>
            </View>
          </GlassCard>

          <GlassCard variant="gold" style={styles.negotiateCard}>
            <View style={styles.negotiateHeader}>
              <View>
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                  OTC SIGNATURE OFFER
                </Text>
                <Text style={[styles.negotiateTitle, { color: "#FFFFFF" }]}>
                  Propose Your Rate
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.negotiateToggle, { backgroundColor: useProposed ? GOLD : "#222222", borderColor: useProposed ? GOLD : "#333333" }]}
                onPress={() => { setUseProposed((v) => !v); Haptics.selectionAsync(); }}
                activeOpacity={0.8}
              >
                <Text style={[styles.negotiateToggleText, { color: useProposed ? "#050505" : colors.mutedForeground }]}>
                  {useProposed ? "ON" : "OFF"}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.negotiateSub, { color: colors.mutedForeground }]}>
              Name your daily rate. Admin will review and approve or negotiate.
            </Text>

            {useProposed && (
              <View style={[styles.proposedInputWrap, { borderColor: GOLD, backgroundColor: "rgba(255,215,0,0.06)" }]}>
                <Text style={[styles.proposedCurrency, { color: GOLD }]}>PKR</Text>
                <TextInput
                  style={[styles.proposedInput, { color: "#FFFFFF" }]}
                  value={proposedText}
                  onChangeText={setProposedText}
                  keyboardType="numeric"
                  placeholderTextColor="#444444"
                  placeholder={car.base_rate.toString()}
                />
                <Text style={[styles.proposedPerDay, { color: colors.mutedForeground }]}>/day</Text>
              </View>
            )}
          </GlassCard>

          <GlassCard style={styles.summaryCard}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              BOOKING SUMMARY
            </Text>
            {[
              { label: "Vehicle", value: car.name },
              { label: "Pickup", value: formatDisplay(startISO) },
              { label: "Return", value: formatDisplay(endISO) },
              { label: "Duration", value: `${duration} ${duration === 1 ? "day" : "days"}` },
              { label: useProposed ? "Proposed Rate" : "Rate", value: `PKR ${effectiveRate.toLocaleString()}/day` },
            ].map(({ label, value }) => (
              <View key={label} style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>{label}</Text>
                <Text style={[styles.summaryValue, { color: "#FFFFFF" }]}>{value}</Text>
              </View>
            ))}
            <View style={[styles.summaryTotal, { borderTopColor: "rgba(255,215,0,0.2)" }]}>
              <Text style={[styles.summaryTotalLabel, { color: "#FFFFFF" }]}>Total Estimated</Text>
              <Text style={styles.summaryTotalValue}>PKR {totalCost.toLocaleString()}</Text>
            </View>
            {useProposed && (
              <Text style={[styles.negotiateNote, { color: colors.mutedForeground }]}>
                * Final amount subject to admin approval
              </Text>
            )}
          </GlassCard>
        </View>
      </ScrollView>

      <View style={[styles.bookingBar, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 24 : 16), borderTopColor: "rgba(255,215,0,0.12)" }]}>
        <TouchableOpacity
          style={[styles.bookBtn, { backgroundColor: isSubmitting ? "#333333" : GOLD }]}
          onPress={handleBook}
          activeOpacity={0.88}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.bookBtnText}>Request Booking</Text>
              <Feather name="send" size={17} color="#050505" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function SubmittedScreen({
  booking,
  onViewBookings,
  onBackToFleet,
}: {
  booking: RentalRequest;
  onViewBookings: () => void;
  onBackToFleet: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, speed: 12 }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  return (
    <ScrollView
      contentContainerStyle={[
        styles.submittedScroll,
        { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 },
      ]}
    >
      <Animated.View style={[styles.submittedContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={[styles.submittedIcon, { borderColor: "rgba(255,215,0,0.3)", backgroundColor: "rgba(255,215,0,0.08)" }]}>
          <Text style={styles.submittedEmoji}>🟠</Text>
        </View>
        <Text style={styles.submittedTitle}>Booking Requested!</Text>
        <Text style={[styles.submittedSub, { color: colors.mutedForeground }]}>
          Your request is with our admin team. You'll be notified once it's reviewed.
        </Text>

        <GlassCard variant="gold" style={styles.submittedCard}>
          <View style={styles.submittedRow}>
            <Text style={[styles.submittedLabel, { color: colors.mutedForeground }]}>Vehicle</Text>
            <Text style={[styles.submittedValue, { color: "#FFFFFF" }]}>{booking.car_name}</Text>
          </View>
          <View style={styles.submittedRow}>
            <Text style={[styles.submittedLabel, { color: colors.mutedForeground }]}>Pickup</Text>
            <Text style={[styles.submittedValue, { color: "#FFFFFF" }]}>{formatDisplay(booking.start_date)}</Text>
          </View>
          <View style={styles.submittedRow}>
            <Text style={[styles.submittedLabel, { color: colors.mutedForeground }]}>Return</Text>
            <Text style={[styles.submittedValue, { color: "#FFFFFF" }]}>{formatDisplay(booking.end_date)}</Text>
          </View>
          <View style={styles.submittedRow}>
            <Text style={[styles.submittedLabel, { color: colors.mutedForeground }]}>Duration</Text>
            <Text style={[styles.submittedValue, { color: "#FFFFFF" }]}>
              {booking.days} {booking.days === 1 ? "day" : "days"}
            </Text>
          </View>
          <View style={[styles.submittedTotalRow, { borderTopColor: "rgba(255,215,0,0.2)" }]}>
            <Text style={[styles.submittedLabel, { color: colors.mutedForeground }]}>Est. Total</Text>
            <Text style={styles.submittedTotal}>PKR {booking.total_cost.toLocaleString()}</Text>
          </View>
        </GlassCard>

        <View style={styles.statusFlow}>
          {[
            { icon: "send" as const,        label: "Submitted",      done: true  },
            { icon: "clock" as const,       label: "Admin Review",   done: false },
            { icon: "check-circle" as const,label: "Confirmed",      done: false },
          ].map((step, i) => (
            <React.Fragment key={step.label}>
              <View style={styles.statusStep}>
                <View style={[styles.statusStepDot, { backgroundColor: step.done ? GOLD : "#222222", borderColor: step.done ? GOLD : "#333333" }]}>
                  <Feather name={step.icon} size={13} color={step.done ? "#050505" : "#555555"} />
                </View>
                <Text style={[styles.statusStepLabel, { color: step.done ? GOLD : "#555555" }]}>
                  {step.label}
                </Text>
              </View>
              {i < 2 && <View style={[styles.statusLine, { backgroundColor: "#222222" }]} />}
            </React.Fragment>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.viewBookingsBtn, { backgroundColor: GOLD }]}
          onPress={onViewBookings}
          activeOpacity={0.88}
        >
          <Feather name="list" size={16} color="#050505" />
          <Text style={styles.viewBookingsBtnText}>View My Bookings</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.backFleetBtn, { borderColor: "rgba(255,215,0,0.3)" }]}
          onPress={onBackToFleet}
          activeOpacity={0.85}
        >
          <Text style={[styles.backFleetBtnText, { color: GOLD }]}>Back to Fleet</Text>
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );
}

export default function RentalScreen() {
  const colors = useColors();
  const { cars, isLoadingCars, isSubmitting, fetchCars, submitBooking } = useRental();
  const [step, setStep] = useState<Step>("catalog");
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [submittedBooking, setSubmittedBooking] = useState<RentalRequest | null>(null);

  useEffect(() => {
    fetchCars();
  }, [fetchCars]);

  const handleSelectCar = useCallback((car: Car) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedCar(car);
    setStep("detail");
  }, []);

  const handleSubmit = useCallback(async (
    startDate: string,
    endDate: string,
    days: number,
    proposedRate: number | null,
  ) => {
    if (!selectedCar) return;
    try {
      const booking = await submitBooking({
        carId: selectedCar.id,
        startDate,
        endDate,
        days,
        baseRate: selectedCar.base_rate,
        proposedRate,
      });
      setSubmittedBooking(booking);
      setStep("submitted");
    } catch {
      setSubmittedBooking({
        id: `local-${Date.now()}`,
        car_id: selectedCar.id,
        car_name: selectedCar.name,
        car_image_url: selectedCar.image_url,
        start_date: startDate,
        end_date: endDate,
        days,
        base_rate: selectedCar.base_rate,
        proposed_rate: proposedRate,
        total_cost: (proposedRate ?? selectedCar.base_rate) * days,
        status: "pending_approval",
        admin_note: null,
        created_at: new Date().toISOString(),
      });
      setStep("submitted");
    }
  }, [selectedCar, submitBooking]);

  return (
    <View style={[styles.root, { backgroundColor: "#000000" }]}>
      {step === "catalog" && (
        <CatalogScreen
          cars={cars}
          isLoading={isLoadingCars}
          onSelect={handleSelectCar}
          onViewBookings={() => router.push("/services/rental-bookings")}
        />
      )}
      {step === "detail" && selectedCar && (
        <DetailScreen
          car={selectedCar}
          onBack={() => setStep("catalog")}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      )}
      {step === "submitted" && submittedBooking && (
        <SubmittedScreen
          booking={submittedBooking}
          onViewBookings={() => router.push("/services/rental-bookings")}
          onBackToFleet={() => { setStep("catalog"); setSelectedCar(null); setSubmittedBooking(null); }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  backBtn: { alignSelf: "flex-start", padding: 4, marginBottom: 12 },

  catalogScroll: { paddingHorizontal: 20, gap: 0 },
  catalogHeader: { gap: 6, marginBottom: 20 },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,215,0,0.08)",
    borderRadius: 6,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.2)",
    marginBottom: 6,
  },
  headerBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold", color: GOLD, letterSpacing: 1.5 },
  catalogTitle: { fontSize: 30, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  catalogSub: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },

  myBookingsStrip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111111",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.15)",
    gap: 10,
  },
  myBookingsLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  myBookingsText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
  myBookingsHint: { fontSize: 12, fontFamily: "Inter_400Regular" },

  loadingBox: { alignItems: "center", gap: 12, paddingVertical: 60 },
  loadingText: { fontSize: 14, fontFamily: "Inter_400Regular" },

  carCard: {
    backgroundColor: "#0D0D0D",
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 16,
  },
  carImageWrap: { width: "100%", height: 200, position: "relative" },
  carImage: { width: "100%", height: "100%" },
  carImageGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  carCategoryBadge: {
    position: "absolute",
    top: 14,
    left: 14,
    backgroundColor: "rgba(255,215,0,0.15)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.35)",
  },
  carCategoryText: { fontSize: 10, fontFamily: "Inter_700Bold", color: GOLD, letterSpacing: 0.8 },
  unavailableOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
  unavailableText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#666666" },
  carCardBody: { padding: 16, gap: 12 },
  carCardTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  carName: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 6 },
  specRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  specPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#1A1A1A",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  specPillText: { fontSize: 10, fontFamily: "Inter_400Regular" },
  rateBox: { alignItems: "flex-end", gap: 0 },
  ratePkr: { fontSize: 10, fontFamily: "Inter_500Medium", color: "#888888" },
  rateAmount: { fontSize: 22, fontFamily: "Inter_700Bold", color: GOLD },
  rateDay: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#888888" },
  selectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
  },
  selectBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: GOLD },

  inclusionsCard: { padding: 18, marginTop: 8, gap: 12 },
  inclusionsTitle: { fontSize: 13, fontFamily: "Inter_700Bold", color: GOLD, letterSpacing: 0.5 },
  inclusionsList: { gap: 8 },
  inclusionRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  inclusionDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: GOLD },
  inclusionText: { fontSize: 13, fontFamily: "Inter_400Regular" },

  detailScroll: { gap: 0 },
  detailBack: { padding: 4, marginLeft: 20, alignSelf: "flex-start" },

  heroWrap: { width: "100%", height: 260, position: "relative" },
  heroImage: { width: "100%", height: "100%" },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  heroMeta: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, gap: 4 },
  heroCatBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,215,0,0.2)",
    borderRadius: 6,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.4)",
    marginBottom: 4,
  },
  heroCatText: { fontSize: 10, fontFamily: "Inter_700Bold", color: GOLD, letterSpacing: 1 },
  heroName: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  heroRate: { fontSize: 14, fontFamily: "Inter_700Bold", color: GOLD },
  heroRateDay: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#AAAAAA" },

  detailBody: { padding: 20, gap: 16 },

  specsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  specBox: {
    width: "47%",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 6,
    alignItems: "flex-start",
  },
  specBoxIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(255,215,0,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  specBoxLabel: { fontSize: 10, fontFamily: "Inter_400Regular", textTransform: "uppercase", letterSpacing: 0.5 },
  specBoxValue: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  featuresSection: { padding: 16, gap: 12 },
  sectionLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.5, textTransform: "uppercase" },
  featuresGrid: { gap: 8 },
  featureChip: { flexDirection: "row", alignItems: "center", gap: 10 },
  featureCheckBox: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  featureChipText: { fontSize: 13, fontFamily: "Inter_500Medium" },

  datePicker: { padding: 18, gap: 16 },
  dateRow: {},
  dateField: { gap: 8 },
  dateFieldLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1, textTransform: "uppercase" },
  dateControl: { flexDirection: "row", alignItems: "center", gap: 12 },
  dateBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dateValue: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1, textAlign: "center" },
  durationSection: { gap: 10 },
  durationGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  durationChip: {
    width: 68,
    height: 60,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  durationChipNum: { fontSize: 20, fontFamily: "Inter_700Bold" },
  durationChipUnit: { fontSize: 10, fontFamily: "Inter_400Regular" },
  returnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderTopWidth: 1,
    paddingTop: 12,
  },
  returnText: { fontSize: 13, fontFamily: "Inter_500Medium" },

  negotiateCard: { padding: 18, gap: 12 },
  negotiateHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  negotiateTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginTop: 4 },
  negotiateToggle: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  negotiateToggleText: { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  negotiateSub: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  proposedInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    marginTop: 4,
  },
  proposedCurrency: { fontSize: 14, fontFamily: "Inter_700Bold" },
  proposedInput: { flex: 1, fontSize: 22, fontFamily: "Inter_700Bold" },
  proposedPerDay: { fontSize: 13, fontFamily: "Inter_400Regular" },

  summaryCard: { padding: 18, gap: 10 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  summaryValue: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  summaryTotal: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, paddingTop: 12, marginTop: 4 },
  summaryTotalLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  summaryTotalValue: { fontSize: 20, fontFamily: "Inter_700Bold", color: GOLD },
  negotiateNote: { fontSize: 11, fontFamily: "Inter_400Regular", fontStyle: "italic" },

  bookingBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: "#000000",
    borderTopWidth: 1,
  },
  bookBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 16,
    paddingVertical: 16,
  },
  bookBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#050505" },

  submittedScroll: { flexGrow: 1, justifyContent: "center" },
  submittedContent: { paddingHorizontal: 28, gap: 20, alignItems: "center" },
  submittedIcon: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  submittedEmoji: { fontSize: 40 },
  submittedTitle: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#FFFFFF", textAlign: "center" },
  submittedSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 21 },
  submittedCard: { width: "100%", padding: 18, gap: 12 },
  submittedRow: { flexDirection: "row", justifyContent: "space-between" },
  submittedLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  submittedValue: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  submittedTotalRow: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, paddingTop: 12 },
  submittedTotal: { fontSize: 18, fontFamily: "Inter_700Bold", color: GOLD },
  statusFlow: { flexDirection: "row", alignItems: "center", gap: 0, width: "100%" },
  statusStep: { flex: 1, alignItems: "center", gap: 6 },
  statusStepDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  statusStepLabel: { fontSize: 10, fontFamily: "Inter_500Medium", textAlign: "center" },
  statusLine: { flex: 1, height: 2, marginBottom: 22 },
  viewBookingsBtn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 15,
  },
  viewBookingsBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#050505" },
  backFleetBtn: {
    width: "100%",
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: "center",
  },
  backFleetBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
