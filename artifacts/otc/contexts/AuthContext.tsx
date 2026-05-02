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

function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "OTC";
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function buildSessionToken(userId: string, phone: string): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(
    JSON.stringify({
      sub: userId,
      phone,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      iss: "otc-super-app",
    })
  );
  const sig = btoa(`${userId}.${phone}.otc_sovereign_secret`);
  return `${header}.${payload}.${sig}`;
}

async function syncProfileToSupabase(user: User): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from("profiles").upsert(
      {
        user_id: user.id,
        name: user.name ?? null,
        phone: user.phone,
        wallet_balance: 0,
        okbond_coins: 0,
      },
      { onConflict: "phone", ignoreDuplicates: false }
    );
  } catch {
  }
}

async function fetchProfileFromSupabase(
  phone: string
): Promise<{ name?: string; user_id?: string } | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase
      .from("profiles")
      .select("user_id, name")
      .eq("phone", phone)
      .maybeSingle();
    return data ?? null;
  } catch {
    return null;
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
    if (otp !== "123456" && otp !== "000000") {
      throw new Error("Invalid OTP. Use 123456 for demo.");
    }

    const existing = await fetchProfileFromSupabase(phone);

    const userId =
      existing?.user_id ??
      Date.now().toString(36) + Math.random().toString(36).substring(2, 9);

    const newUser: User = {
      id: userId,
      phone,
      name: existing?.name ?? undefined,
      referralCode: generateReferralCode(),
      countryCode: pendingCountry?.code,
      dialCode: pendingCountry?.dialCode,
    };

    const sessionToken = buildSessionToken(userId, phone);

    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.TOKEN, sessionToken),
      AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(newUser)),
    ]);

    setToken(sessionToken);
    setUser(newUser);
    setNeedsProfileSetup(!newUser.name);

    if (!existing) {
      syncProfileToSupabase(newUser).catch(() => {});
    }
  }, [pendingCountry]);

  const setupProfile = useCallback(
    async (name: string) => {
      if (!user) throw new Error("No active session");
      const updated: User = { ...user, name };
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updated));
      setUser(updated);
      setNeedsProfileSetup(false);
      syncProfileToSupabase(updated).catch(() => {});
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
