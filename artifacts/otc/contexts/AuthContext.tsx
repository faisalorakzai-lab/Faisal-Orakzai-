import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";
import type { Country } from "@/components/auth/CountryPicker";

export interface User {
  id: string;
  phone: string;
  name?: string;
  referralCode: string;
  countryCode?: string;
  dialCode?: string;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  needsProfileSetup: boolean;
  login: (phone: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  setupProfile: (name: string) => Promise<void>;
  pendingPhone: string;
  setPendingPhone: (phone: string) => void;
  pendingCountry: Country | null;
  setPendingCountry: (country: Country) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEYS = {
  TOKEN: "@otc/token",
  USER: "@otc/user",
};

// Derive the API base URL: on Expo web the shared proxy is the same origin;
// on native the EXPO_PUBLIC_DOMAIN env var points to the Replit dev domain.
const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

async function syncProfileNameToSupabase(user: User): Promise<void> {
  if (!supabase) return;
  try {
    await supabase
      .from("profiles")
      .update({ name: user.name ?? null })
      .eq("user_id", user.id);
  } catch {
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false);
  const [pendingPhone, setPendingPhone] = useState("");
  const [pendingCountry, setPendingCountry] = useState<Country | null>(null);

  useEffect(() => {
    async function loadStoredAuth() {
      try {
        const [storedToken, storedUser] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.TOKEN),
          AsyncStorage.getItem(STORAGE_KEYS.USER),
        ]);
        if (storedToken && storedUser) {
          const parsed: User = JSON.parse(storedUser);
          setToken(storedToken);
          setUser(parsed);
          setNeedsProfileSetup(!parsed.name);
        }
      } catch {
      } finally {
        setIsLoading(false);
      }
    }
    loadStoredAuth();
  }, []);

  const login = useCallback(async (phone: string, otp: string) => {
    // Request a server-signed token — the server validates the OTP and
    // signs the token with SESSION_SECRET. Clients never mint their own tokens.
    const response = await fetch(`${API_BASE}/api/otc/auth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: phone.trim(), otp }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({})) as { error?: string };
      throw new Error(err.error ?? "Authentication failed");
    }

    const data = await response.json() as {
      token: string;
      user_id: string;
      name: string | null;
      referral_code: string;
    };

    const newUser: User = {
      id:           data.user_id,
      phone:        phone.trim(),
      name:         data.name ?? undefined,
      referralCode: data.referral_code,
      countryCode:  pendingCountry?.code,
      dialCode:     pendingCountry?.dialCode,
    };

    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.TOKEN, data.token),
      AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(newUser)),
    ]);

    setToken(data.token);
    setUser(newUser);
    setNeedsProfileSetup(!newUser.name);
  }, [pendingCountry]);

  const setupProfile = useCallback(
    async (name: string) => {
      if (!user) throw new Error("No active session");
      const updated: User = { ...user, name };
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updated));
      setUser(updated);
      setNeedsProfileSetup(false);
      syncProfileNameToSupabase(updated).catch(() => {});
    },
    [user]
  );

  const logout = useCallback(async () => {
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.TOKEN),
      AsyncStorage.removeItem(STORAGE_KEYS.USER),
    ]);
    setToken(null);
    setUser(null);
    setNeedsProfileSetup(false);
  }, []);

  const updateUser = useCallback(
    (updates: Partial<User>) => {
      if (!user) return;
      const updated = { ...user, ...updates };
      setUser(updated);
      AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updated)).catch(
        () => {}
      );
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token && !!user,
        needsProfileSetup,
        login,
        logout,
        updateUser,
        setupProfile,
        pendingPhone,
        setPendingPhone,
        pendingCountry,
        setPendingCountry,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
