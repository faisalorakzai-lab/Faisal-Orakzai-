import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN ?? "";
const STORAGE_KEY = "otc_driver_session";

export interface DriverProfile {
  id: string;
  name: string;
  phone: string;
  vehicle_model: string;
  plate_number: string;
  ride_type: string;
  rating: number;
  total_rides: number;
  is_online: boolean;
}

interface DriverAuthContextValue {
  driver: DriverProfile | null;
  token: string | null;
  isLoading: boolean;
  requestOtp: (phone: string) => Promise<{ demoOtp?: string; error?: string }>;
  verifyOtp: (phone: string, otp: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  setDriverOnline: (online: boolean, token: string) => void;
}

const DriverAuthContext = createContext<DriverAuthContextValue | null>(null);

export function DriverAuthProvider({ children }: { children: React.ReactNode }) {
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [token,  setToken]  = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const { token: t, driver: d } = JSON.parse(raw) as { token: string; driver: DriverProfile };
          setToken(t); setDriver(d);
        } catch { /* ignore corrupted */ }
      }
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, []);

  const requestOtp = useCallback(async (phone: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/otc/driver/otp-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json() as { demoOtp?: string; error?: string };
      if (!res.ok) return { error: data.error ?? "Failed to send OTP" };
      return { demoOtp: data.demoOtp };
    } catch {
      return { error: "Network error" };
    }
  }, []);

  const verifyOtp = useCallback(async (phone: string, otp: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/otc/driver/otp-verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp }),
      });
      const data = await res.json() as { token?: string; driver?: DriverProfile; error?: string };
      if (!res.ok || !data.token || !data.driver) return { error: data.error ?? "Invalid OTP" };
      setToken(data.token);
      setDriver(data.driver);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ token: data.token, driver: data.driver }));
      return {};
    } catch {
      return { error: "Network error" };
    }
  }, []);

  const logout = useCallback(async () => {
    setToken(null);
    setDriver(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  const setDriverOnline = useCallback((online: boolean, _token: string) => {
    setDriver((prev) => prev ? { ...prev, is_online: online } : prev);
    if (_token) {
      AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
        if (raw) {
          const parsed = JSON.parse(raw) as { token: string; driver: DriverProfile };
          parsed.driver.is_online = online;
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(parsed)).catch(() => {});
        }
      }).catch(() => {});
    }
  }, []);

  return (
    <DriverAuthContext.Provider value={{ driver, token, isLoading, requestOtp, verifyOtp, logout, setDriverOnline }}>
      {children}
    </DriverAuthContext.Provider>
  );
}

export function useDriverAuth(): DriverAuthContextValue {
  const ctx = useContext(DriverAuthContext);
  if (!ctx) throw new Error("useDriverAuth must be inside DriverAuthProvider");
  return ctx;
}
