import React, {
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
const API_BASE = process.env.EXPO_PUBLIC_DOMAIN ?? "";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RoomType {
  id: string;
  name: string;
  rate: number;
  description: string;
  max_guests: number;
}

export interface Hotel {
  id: string;
  name: string;
  city: string;
  stars: number;
  description: string;
  cover_image_url: string;
  images: string[];
  starting_rate: number;
  room_types: RoomType[];
  amenities: string[];
  available: boolean;
}

export interface HotelBooking {
  id: string;
  user_id: string;
  hotel_id: string;
  hotel_name: string;
  hotel_image_url: string;
  room_type: string;
  check_in: string;
  check_out: string;
  nights: number;
  room_rate: number;
  proposed_rate: number | null;
  total_cost: number;
  status: string;
  admin_note: string | null;
  created_at: string;
}

// ─── Fallback Data ─────────────────────────────────────────────────────────────

const ROOM_TYPES_LUXURY: RoomType[] = [
  { id: "executive-suite",   name: "Executive Suite",   rate: 35000, description: "Panoramic city views, king bed, private lounge",     max_guests: 2 },
  { id: "deluxe-room",       name: "Deluxe Room",        rate: 22000, description: "Elegant interiors with premium king or twin beds",    max_guests: 2 },
  { id: "business-studio",   name: "Business Studio",   rate: 16000, description: "Compact luxury for solo travelers & executives",       max_guests: 1 },
];

const ROOM_TYPES_PREMIUM: RoomType[] = [
  { id: "executive-suite",   name: "Executive Suite",   rate: 28000, description: "Floor-to-ceiling windows, premium amenities",         max_guests: 2 },
  { id: "deluxe-room",       name: "Deluxe Room",        rate: 18000, description: "Spacious rooms with stunning skyline views",          max_guests: 2 },
  { id: "business-studio",   name: "Business Studio",   rate: 12000, description: "Smart workspace with high-speed business suite",      max_guests: 1 },
];

const ROOM_TYPES_STANDARD: RoomType[] = [
  { id: "executive-suite",   name: "Executive Suite",   rate: 20000, description: "Premium suite with exclusive lounge access",          max_guests: 2 },
  { id: "deluxe-room",       name: "Deluxe Room",        rate: 13000, description: "Comfortable rooms with modern amenities",            max_guests: 2 },
  { id: "business-studio",   name: "Business Studio",   rate: 9000,  description: "Efficient studio for the modern executive",          max_guests: 1 },
];

export const FALLBACK_HOTELS: Hotel[] = [
  {
    id: "serena-islamabad",
    name: "Islamabad Serena Hotel",
    city: "Islamabad",
    stars: 5,
    description: "Pakistan's most iconic luxury retreat — nestled in the heart of the capital with impeccable Mughal-inspired architecture, lush gardens, and world-class service.",
    cover_image_url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=900&q=85",
    images: [
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=900&q=85",
      "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=900&q=85",
      "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=900&q=85",
    ],
    starting_rate: 16000,
    room_types: ROOM_TYPES_LUXURY,
    amenities: ["Wi-Fi", "Pool", "Gym", "Spa", "Restaurant", "24/7 Security", "Concierge", "Valet"],
    available: true,
  },
  {
    id: "pc-lahore",
    name: "Pearl Continental Lahore",
    city: "Lahore",
    stars: 5,
    description: "Lahore's crown jewel of hospitality. A landmark of elegance since 1976, offering timeless luxury with legendary banquets and breathtaking rooftop views.",
    cover_image_url: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=900&q=85",
    images: [
      "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=900&q=85",
      "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=900&q=85",
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=900&q=85",
    ],
    starting_rate: 13000,
    room_types: ROOM_TYPES_PREMIUM,
    amenities: ["Wi-Fi", "Pool", "Gym", "Restaurant", "24/7 Security", "Business Center", "Concierge"],
    available: true,
  },
  {
    id: "marriott-islamabad",
    name: "Islamabad Marriott Hotel",
    city: "Islamabad",
    stars: 5,
    description: "Diplomatic quarter's finest — synonymous with elegance, security, and world-class dining. The preferred address of heads of state and global executives.",
    cover_image_url: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=900&q=85",
    images: [
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=900&q=85",
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=900&q=85",
      "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=900&q=85",
    ],
    starting_rate: 18000,
    room_types: ROOM_TYPES_LUXURY,
    amenities: ["Wi-Fi", "Pool", "Gym", "Spa", "Restaurant", "24/7 Security", "Business Center"],
    available: true,
  },
  {
    id: "avari-lahore",
    name: "Avari Towers Lahore",
    city: "Lahore",
    stars: 4,
    description: "Where contemporary meets classic. Avari Towers commands the Lahore skyline with sophisticated interiors, award-winning cuisine, and seamless business facilities.",
    cover_image_url: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=900&q=85",
    images: [
      "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=900&q=85",
      "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=900&q=85",
      "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=900&q=85",
    ],
    starting_rate: 9000,
    room_types: ROOM_TYPES_STANDARD,
    amenities: ["Wi-Fi", "Pool", "Gym", "Restaurant", "24/7 Security", "Business Center"],
    available: true,
  },
  {
    id: "pc-peshawar",
    name: "Pearl Continental Peshawar",
    city: "Peshawar",
    stars: 5,
    description: "The gateway to the Khyber — a fortress of luxury in the ancient city. Unmatched security, warm Pashtun hospitality, and contemporary five-star amenities.",
    cover_image_url: "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=900&q=85",
    images: [
      "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=900&q=85",
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=900&q=85",
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=900&q=85",
    ],
    starting_rate: 10000,
    room_types: ROOM_TYPES_PREMIUM,
    amenities: ["Wi-Fi", "Pool", "Gym", "Restaurant", "24/7 Security", "Concierge"],
    available: true,
  },
  {
    id: "movenpick-karachi",
    name: "Mövenpick Hotel Karachi",
    city: "Karachi",
    stars: 5,
    description: "Swiss luxury on the Arabian Sea. Contemporary design, rooftop pool, and the finest Swiss-curated dining experience on Karachi's prestigious Clifton corridor.",
    cover_image_url: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=900&q=85",
    images: [
      "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=900&q=85",
      "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=900&q=85",
      "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=900&q=85",
    ],
    starting_rate: 15000,
    room_types: ROOM_TYPES_LUXURY,
    amenities: ["Wi-Fi", "Pool", "Gym", "Spa", "Restaurant", "24/7 Security", "Sea View", "Valet"],
    available: true,
  },
];

// ─── Context ───────────────────────────────────────────────────────────────────

interface SubmitPayload {
  hotelId: string;
  roomType: string;
  roomRate: number;
  checkIn: string;
  checkOut: string;
  nights: number;
  proposedRate: number | null;
}

interface HotelContextValue {
  hotels: Hotel[];
  bookings: HotelBooking[];
  isLoadingHotels: boolean;
  isLoadingBookings: boolean;
  isSubmitting: boolean;
  fetchHotels: () => Promise<void>;
  fetchBookings: () => Promise<void>;
  submitBooking: (payload: SubmitPayload) => Promise<HotelBooking>;
}

const HotelContext = createContext<HotelContextValue | null>(null);

export function HotelProvider({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuth();
  const [hotels, setHotels] = useState<Hotel[]>(FALLBACK_HOTELS);
  const [bookings, setBookings] = useState<HotelBooking[]>([]);
  const [isLoadingHotels, setIsLoadingHotels] = useState(false);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchHotels = useCallback(async () => {
    setIsLoadingHotels(true);
    try {
      const res = await fetch(`${API_BASE}/api/otc/hotels`);
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json() as { hotels: Hotel[] };
      if (data.hotels?.length) setHotels(data.hotels);
    } catch {
      setHotels(FALLBACK_HOTELS);
    } finally {
      setIsLoadingHotels(false);
    }
  }, []);

  const fetchBookings = useCallback(async () => {
    if (!token || !user?.id) return;
    setIsLoadingBookings(true);
    try {
      const res = await fetch(`${API_BASE}/api/otc/hotel/bookings/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json() as { bookings: HotelBooking[] };
      setBookings(data.bookings ?? []);
    } catch {
      setBookings([]);
    } finally {
      setIsLoadingBookings(false);
    }
  }, [token, user?.id]);

  const submitBooking = useCallback(async (payload: SubmitPayload): Promise<HotelBooking> => {
    if (!token) throw new Error("Not authenticated");
    setIsSubmitting(true);
    try {
      const hotel = hotels.find((h) => h.id === payload.hotelId);
      const res = await fetch(`${API_BASE}/api/otc/hotel/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          hotel_id:      payload.hotelId,
          room_type:     payload.roomType,
          room_rate:     payload.roomRate,
          check_in:      payload.checkIn,
          check_out:     payload.checkOut,
          nights:        payload.nights,
          proposed_rate: payload.proposedRate,
        }),
      });
      if (!res.ok) throw new Error("submit failed");
      const data = await res.json() as { booking: HotelBooking };
      return data.booking;
    } catch {
      const hotel = hotels.find((h) => h.id === payload.hotelId);
      const effectiveRate = payload.proposedRate ?? payload.roomRate;
      const fallback: HotelBooking = {
        id: `local-${Date.now()}`,
        user_id: user?.id ?? "",
        hotel_id: payload.hotelId,
        hotel_name: hotel?.name ?? payload.hotelId,
        hotel_image_url: hotel?.cover_image_url ?? "",
        room_type: payload.roomType,
        check_in: payload.checkIn,
        check_out: payload.checkOut,
        nights: payload.nights,
        room_rate: payload.roomRate,
        proposed_rate: payload.proposedRate,
        total_cost: effectiveRate * payload.nights,
        status: "pending_approval",
        admin_note: null,
        created_at: new Date().toISOString(),
      };
      return fallback;
    } finally {
      setIsSubmitting(false);
    }
  }, [token, user?.id, hotels]);

  return (
    <HotelContext.Provider value={{
      hotels, bookings,
      isLoadingHotels, isLoadingBookings, isSubmitting,
      fetchHotels, fetchBookings, submitBooking,
    }}>
      {children}
    </HotelContext.Provider>
  );
}

export function useHotel(): HotelContextValue {
  const ctx = useContext(HotelContext);
  if (!ctx) throw new Error("useHotel must be used inside HotelProvider");
  return ctx;
}
