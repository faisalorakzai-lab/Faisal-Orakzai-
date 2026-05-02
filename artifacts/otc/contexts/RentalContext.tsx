import React, { createContext, useCallback, useContext, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

export interface Car {
  id: string;
  name: string;
  category: string;
  fuel_type: string;
  transmission: string;
  seats: number;
  base_rate: number;
  image_url: string;
  features: string[];
  available: boolean;
}

export interface RentalRequest {
  id: string;
  car_id: string;
  car_name: string;
  car_image_url: string;
  start_date: string;
  end_date: string;
  days: number;
  base_rate: number;
  proposed_rate: number | null;
  total_cost: number;
  status: "pending_approval" | "confirmed" | "negotiating" | "cancelled";
  admin_note: string | null;
  created_at: string;
}

const FALLBACK_CARS: Car[] = [
  {
    id: "land-cruiser-v8",
    name: "Toyota Land Cruiser V8",
    category: "Flagship SUV",
    fuel_type: "Diesel",
    transmission: "Automatic",
    seats: 8,
    base_rate: 45000,
    image_url: "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800&q=80",
    features: ["Full AC", "8-Seat Capacity", "4WD", "GPS Tracking", "Leather Interior", "Sunroof", "Dash Cam", "Insurance Included"],
    available: true,
  },
  {
    id: "prado-tx",
    name: "Toyota Land Prado TX",
    category: "Executive SUV",
    fuel_type: "Petrol",
    transmission: "Automatic",
    seats: 7,
    base_rate: 28000,
    image_url: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80",
    features: ["Full AC", "7-Seat Capacity", "4WD", "GPS Tracking", "Leather Interior", "Insurance Included", "Dash Cam"],
    available: true,
  },
  {
    id: "fortuner-sigma",
    name: "Toyota Fortuner Sigma 4",
    category: "Premium SUV",
    fuel_type: "Petrol",
    transmission: "Automatic",
    seats: 7,
    base_rate: 22000,
    image_url: "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&q=80",
    features: ["Full AC", "7-Seat Capacity", "GPS Tracking", "Leather Seats", "Music System", "Insurance Included"],
    available: true,
  },
  {
    id: "civic-rs",
    name: "Honda Civic RS Turbo",
    category: "Premium Sedan",
    fuel_type: "Petrol",
    transmission: "CVT Automatic",
    seats: 5,
    base_rate: 12000,
    image_url: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&q=80",
    features: ["Full AC", "GPS Tracking", "Apple CarPlay", "Sunroof", "Dash Cam", "Insurance Included"],
    available: true,
  },
  {
    id: "corolla-altis",
    name: "Toyota Corolla Altis",
    category: "Executive Sedan",
    fuel_type: "Petrol",
    transmission: "Automatic",
    seats: 5,
    base_rate: 9000,
    image_url: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80",
    features: ["Full AC", "GPS Tracking", "Music System", "Insurance Included", "Dash Cam"],
    available: true,
  },
  {
    id: "cultus-vxl",
    name: "Suzuki Cultus VXL",
    category: "Economy Hatchback",
    fuel_type: "Petrol",
    transmission: "Manual",
    seats: 5,
    base_rate: 5500,
    image_url: "https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=800&q=80",
    features: ["Full AC", "GPS Tracking", "Insurance Included", "Fuel Efficient"],
    available: true,
  },
];

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

interface RentalContextValue {
  cars: Car[];
  myBookings: RentalRequest[];
  isLoadingCars: boolean;
  isLoadingBookings: boolean;
  isSubmitting: boolean;
  fetchCars: () => Promise<void>;
  fetchMyBookings: () => Promise<void>;
  submitBooking: (data: {
    carId: string;
    startDate: string;
    endDate: string;
    days: number;
    baseRate: number;
    proposedRate: number | null;
  }) => Promise<RentalRequest>;
}

const RentalContext = createContext<RentalContextValue | null>(null);

export function RentalProvider({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuth();
  const [cars, setCars] = useState<Car[]>(FALLBACK_CARS);
  const [myBookings, setMyBookings] = useState<RentalRequest[]>([]);
  const [isLoadingCars, setIsLoadingCars] = useState(false);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCars = useCallback(async () => {
    setIsLoadingCars(true);
    try {
      const res = await fetch(`${API_BASE}/api/otc/cars`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json() as { cars: Car[] };
        if (Array.isArray(data.cars) && data.cars.length > 0) {
          setCars(data.cars);
        }
      }
    } catch {
      // keep fallback
    } finally {
      setIsLoadingCars(false);
    }
  }, [token]);

  const fetchMyBookings = useCallback(async () => {
    if (!user?.id || !token) return;
    setIsLoadingBookings(true);
    try {
      const res = await fetch(`${API_BASE}/api/otc/rental/bookings/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json() as { bookings: RentalRequest[] };
        setMyBookings(data.bookings ?? []);
      }
    } catch {
    } finally {
      setIsLoadingBookings(false);
    }
  }, [user?.id, token]);

  const submitBooking = useCallback(async (data: {
    carId: string;
    startDate: string;
    endDate: string;
    days: number;
    baseRate: number;
    proposedRate: number | null;
  }): Promise<RentalRequest> => {
    if (!user?.id || !token) throw new Error("Not authenticated");
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/otc/rental/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          car_id: data.carId,
          start_date: data.startDate,
          end_date: data.endDate,
          days: data.days,
          proposed_rate: data.proposedRate,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Booking failed");
      }
      const result = await res.json() as { booking: RentalRequest };
      setMyBookings((prev) => [result.booking, ...prev]);
      return result.booking;
    } finally {
      setIsSubmitting(false);
    }
  }, [user?.id, token]);

  return (
    <RentalContext.Provider value={{
      cars,
      myBookings,
      isLoadingCars,
      isLoadingBookings,
      isSubmitting,
      fetchCars,
      fetchMyBookings,
      submitBooking,
    }}>
      {children}
    </RentalContext.Provider>
  );
}

export function useRental(): RentalContextValue {
  const ctx = useContext(RentalContext);
  if (!ctx) throw new Error("useRental must be used inside RentalProvider");
  return ctx;
}
