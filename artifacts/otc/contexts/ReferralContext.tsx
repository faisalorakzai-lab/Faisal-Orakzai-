import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useAuth } from "./AuthContext";

const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

const DEVICE_ID_KEY = "@otc/device_id";

export interface ReferralStats {
  referral_code: string;
  successful_referrals: number;
  milestone_claimed: boolean;
  referred_by: string | null;
}

interface ReferralContextValue {
  stats: ReferralStats | null;
  isLoading: boolean;
  deviceId: string | null;
  applyReferralCode: (code: string) => Promise<{ ok: boolean; message: string }>;
  completeFirstRide: () => Promise<void>;
  refresh: () => Promise<void>;
}

const ReferralContext = createContext<ReferralContextValue | null>(null);

async function getOrCreateDeviceId(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (stored) return stored;
    const id =
      "dev_" +
      Date.now().toString(36) +
      Math.random().toString(36).substring(2, 10);
    await AsyncStorage.setItem(DEVICE_ID_KEY, id);
    return id;
  } catch {
    return "dev_fallback_" + Math.random().toString(36).substring(2, 10);
  }
}

export function ReferralProvider({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuth();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);

  useEffect(() => {
    getOrCreateDeviceId().then(setDeviceId);
  }, []);

  const fetchStats = useCallback(async () => {
    if (!user || !token) return;
    setIsLoading(true);
    try {
      const res = await fetch(
        `${BASE_URL}/api/otc/referral/stats/${user.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        const data = (await res.json()) as ReferralStats;
        setStats(data);
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  }, [user, token]);

  useEffect(() => {
    if (user && token) {
      fetchStats();
    } else {
      setStats(null);
    }
  }, [user, token, fetchStats]);

  const applyReferralCode = useCallback(
    async (code: string): Promise<{ ok: boolean; message: string }> => {
      if (!user || !token) return { ok: false, message: "Not authenticated" };
      const dId = deviceId ?? (await getOrCreateDeviceId());
      try {
        const res = await fetch(`${BASE_URL}/api/otc/referral/apply`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ referral_code: code, device_id: dId }),
        });
        const data = (await res.json()) as { message?: string; error?: string };
        if (res.ok) {
          await fetchStats();
          return { ok: true, message: data.message ?? "Referral applied!" };
        }
        return { ok: false, message: data.error ?? "Failed to apply code" };
      } catch {
        return { ok: false, message: "Network error" };
      }
    },
    [user, token, deviceId, fetchStats]
  );

  const completeFirstRide = useCallback(async () => {
    if (!user || !token) return;
    try {
      await fetch(`${BASE_URL}/api/otc/referral/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ user_id: user.id }),
      });
      await fetchStats();
    } catch {
    }
  }, [user, token, fetchStats]);

  return (
    <ReferralContext.Provider
      value={{
        stats,
        isLoading,
        deviceId,
        applyReferralCode,
        completeFirstRide,
        refresh: fetchStats,
      }}
    >
      {children}
    </ReferralContext.Provider>
  );
}

export function useReferral(): ReferralContextValue {
  const ctx = useContext(ReferralContext);
  if (!ctx) throw new Error("useReferral must be used inside ReferralProvider");
  return ctx;
}
