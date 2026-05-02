import React, {
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";
import { useAuth } from "@/contexts/AuthContext";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN ?? "";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TravelType  = "domestic" | "international";
export type TravelClass = "economy" | "business" | "first_class";

export const DOMESTIC_CITIES = [
  "Karachi (KHI)",
  "Lahore (LHE)",
  "Islamabad (ISB)",
  "Peshawar (PEW)",
  "Quetta (UET)",
  "Multan (MUX)",
  "Faisalabad (LYP)",
  "Sialkot (SKT)",
  "Gwadar (GWD)",
  "Turbat (TUK)",
];

export const INTERNATIONAL_CITIES = [
  "Dubai (DXB)",
  "London (LHR)",
  "New York (JFK)",
  "Toronto (YYZ)",
  "Riyadh (RUH)",
  "Abu Dhabi (AUH)",
  "Doha (DOH)",
  "Frankfurt (FRA)",
  "Paris (CDG)",
  "Beijing (PEK)",
  "Istanbul (IST)",
  "Kuala Lumpur (KUL)",
  "Bangkok (BKK)",
  "Amsterdam (AMS)",
  "Manchester (MAN)",
];

// Suggested fares: domestic PKR, international PKR
const DOMESTIC_BASE: Record<string, number> = {
  default: 22000,
  "KHI-ISB": 25000, "ISB-KHI": 25000,
  "KHI-LHE": 22000, "LHE-KHI": 22000,
  "LHE-ISB": 18000, "ISB-LHE": 18000,
  "KHI-PEW": 28000, "PEW-KHI": 28000,
  "KHI-UET": 24000, "UET-KHI": 24000,
  "KHI-MUX": 20000, "MUX-KHI": 20000,
  "LHE-PEW": 21000, "PEW-LHE": 21000,
};

const INTERNATIONAL_BASE: Record<string, number> = {
  default:   100000,
  "DXB": 80000,  "LHR": 160000, "JFK": 200000, "YYZ": 195000,
  "RUH": 90000,  "AUH": 85000,  "DOH": 88000,  "FRA": 165000,
  "CDG": 168000, "PEK": 140000, "IST": 110000, "KUL": 125000,
  "BKK": 130000, "AMS": 170000, "MAN": 162000,
};

const CLASS_MULTIPLIER: Record<TravelClass, number> = {
  economy:     1,
  business:    2.6,
  first_class: 6.2,
};

export function getSuggestedFare(
  travelType: TravelType,
  from: string,
  to: string,
  cls: TravelClass,
): number {
  const extract = (city: string) => {
    const m = city.match(/\(([A-Z]+)\)/);
    return m ? m[1] : city.toUpperCase().slice(0, 3);
  };

  let base: number;
  if (travelType === "domestic") {
    const key = `${extract(from)}-${extract(to)}`;
    base = DOMESTIC_BASE[key] ?? DOMESTIC_BASE.default;
  } else {
    const toCode = extract(to);
    base = INTERNATIONAL_BASE[toCode] ?? INTERNATIONAL_BASE.default;
  }
  return Math.round((base * CLASS_MULTIPLIER[cls]) / 1000) * 1000;
}

export interface FlightBooking {
  id: string;
  user_id: string;
  travel_type: TravelType;
  from_city: string;
  to_city: string;
  departure_date: string;
  travel_class: TravelClass;
  passengers: number;
  suggested_fare: number;
  proposed_fare: number | null;
  visa_assistance: boolean;
  status: string;
  admin_note: string | null;
  final_fare: number | null;
  created_at: string;
}

interface SubmitPayload {
  travelType: TravelType;
  fromCity: string;
  toCity: string;
  departureDate: string;
  travelClass: TravelClass;
  passengers: number;
  suggestedFare: number;
  proposedFare: number | null;
  visaAssistance: boolean;
}

interface FlightContextValue {
  bookings: FlightBooking[];
  isLoadingBookings: boolean;
  isSubmitting: boolean;
  fetchBookings: () => Promise<void>;
  submitBooking: (payload: SubmitPayload) => Promise<FlightBooking>;
}

const FlightContext = createContext<FlightContextValue | null>(null);

export function FlightProvider({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuth();
  const [bookings, setBookings] = useState<FlightBooking[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchBookings = useCallback(async () => {
    if (!token || !user?.id) return;
    setIsLoadingBookings(true);
    try {
      const res = await fetch(`${API_BASE}/api/otc/flight/bookings/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("failed");
      const data = await res.json() as { bookings: FlightBooking[] };
      setBookings(data.bookings ?? []);
    } catch {
      setBookings([]);
    } finally {
      setIsLoadingBookings(false);
    }
  }, [token, user?.id]);

  const submitBooking = useCallback(async (payload: SubmitPayload): Promise<FlightBooking> => {
    if (!token) throw new Error("Not authenticated");
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/otc/flight/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          travel_type:      payload.travelType,
          from_city:        payload.fromCity,
          to_city:          payload.toCity,
          departure_date:   payload.departureDate,
          travel_class:     payload.travelClass,
          passengers:       payload.passengers,
          suggested_fare:   payload.suggestedFare,
          proposed_fare:    payload.proposedFare,
          visa_assistance:  payload.visaAssistance,
        }),
      });
      if (!res.ok) throw new Error("failed");
      const data = await res.json() as { booking: FlightBooking };
      return data.booking;
    } catch {
      return {
        id: `local-${Date.now()}`,
        user_id: user?.id ?? "",
        travel_type: payload.travelType,
        from_city: payload.fromCity,
        to_city: payload.toCity,
        departure_date: payload.departureDate,
        travel_class: payload.travelClass,
        passengers: payload.passengers,
        suggested_fare: payload.suggestedFare,
        proposed_fare: payload.proposedFare,
        visa_assistance: payload.visaAssistance,
        status: "pending_approval",
        admin_note: null,
        final_fare: null,
        created_at: new Date().toISOString(),
      };
    } finally {
      setIsSubmitting(false);
    }
  }, [token, user?.id]);

  return (
    <FlightContext.Provider value={{
      bookings, isLoadingBookings, isSubmitting,
      fetchBookings, submitBooking,
    }}>
      {children}
    </FlightContext.Provider>
  );
}

export function useFlight(): FlightContextValue {
  const ctx = useContext(FlightContext);
  if (!ctx) throw new Error("useFlight must be used inside FlightProvider");
  return ctx;
}
