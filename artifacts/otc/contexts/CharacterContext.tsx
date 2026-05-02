import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "@/lib/supabase";

export interface CharacterProfile {
  credits: number;
  tier: "Pioneer" | "Elite" | "Sovereign" | "Apex";
  totalRides: number;
  avgRating: number;
  equityPoints: number;
  discountRate: number;
}

interface CharacterContextValue {
  profile: CharacterProfile;
  addRide: (rating: number) => void;
  getPersonalizedPrice: (basePrice: number) => number;
  isLoading: boolean;
}

const CharacterContext = createContext<CharacterContextValue | null>(null);

const STORAGE_KEY = "@otc/character";

function creditToTier(credits: number): CharacterProfile["tier"] {
  if (credits >= 500) return "Apex";
  if (credits >= 200) return "Sovereign";
  if (credits >= 80) return "Elite";
  return "Pioneer";
}

function creditToDiscount(credits: number): number {
  if (credits >= 500) return 0.15;
  if (credits >= 200) return 0.1;
  if (credits >= 80) return 0.05;
  if (credits >= 30) return 0.02;
  return 0;
}

const DEFAULT_PROFILE: CharacterProfile = {
  credits: 12,
  tier: "Pioneer",
  totalRides: 0,
  avgRating: 5.0,
  equityPoints: 0,
  discountRate: 0,
};

export function CharacterProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<CharacterProfile>(DEFAULT_PROFILE);
  const [isLoading, setIsLoading] = useState(true);

  const storageKey = user ? `${STORAGE_KEY}_${user.id}` : null;

  useEffect(() => {
    if (!storageKey || !user) {
      setIsLoading(false);
      return;
    }

    async function load() {
      try {
        if (supabase) {
          const { data, error } = await supabase
            .from("otc_character_profiles")
            .select("*")
            .eq("user_id", user!.id)
            .maybeSingle();

          if (!error && data) {
            const p: CharacterProfile = {
              credits: data.credits ?? DEFAULT_PROFILE.credits,
              tier: (data.tier as CharacterProfile["tier"]) ?? DEFAULT_PROFILE.tier,
              totalRides: data.total_rides ?? DEFAULT_PROFILE.totalRides,
              avgRating: data.avg_rating ?? DEFAULT_PROFILE.avgRating,
              equityPoints: data.equity_points ?? DEFAULT_PROFILE.equityPoints,
              discountRate: data.discount_rate ?? DEFAULT_PROFILE.discountRate,
            };
            setProfile(p);
            await AsyncStorage.setItem(storageKey!, JSON.stringify(p)).catch(() => {});
            return;
          }
        }
      } catch {
      }

      try {
        const local = await AsyncStorage.getItem(storageKey!);
        if (local) {
          setProfile(JSON.parse(local));
        } else {
          setProfile(DEFAULT_PROFILE);
          await AsyncStorage.setItem(storageKey!, JSON.stringify(DEFAULT_PROFILE)).catch(() => {});
        }
      } catch {
        setProfile(DEFAULT_PROFILE);
      }
    }

    load().finally(() => setIsLoading(false));
  }, [storageKey, user]);

  const persistProfile = useCallback(
    async (updated: CharacterProfile) => {
      if (!user) return;
      if (storageKey) {
        AsyncStorage.setItem(storageKey, JSON.stringify(updated)).catch(() => {});
      }
      if (supabase) {
        supabase
          .from("otc_character_profiles")
          .upsert({
            user_id: user.id,
            credits: updated.credits,
            tier: updated.tier,
            total_rides: updated.totalRides,
            avg_rating: updated.avgRating,
            equity_points: updated.equityPoints,
            discount_rate: updated.discountRate,
            updated_at: new Date().toISOString(),
          })
          .then(() => {})
          .catch(() => {});
      }
    },
    [storageKey, user]
  );

  const addRide = useCallback(
    (rating: number) => {
      setProfile((prev) => {
        const earned = Math.round(rating * 2 + 5);
        const newCredits = prev.credits + earned;
        const newTotal = prev.totalRides + 1;
        const newAvgRating =
          (prev.avgRating * prev.totalRides + rating) / newTotal;
        const newEquity = prev.equityPoints + Math.round(rating * 10);
        const updated: CharacterProfile = {
          credits: newCredits,
          tier: creditToTier(newCredits),
          totalRides: newTotal,
          avgRating: parseFloat(newAvgRating.toFixed(2)),
          equityPoints: newEquity,
          discountRate: creditToDiscount(newCredits),
        };
        persistProfile(updated);
        return updated;
      });
    },
    [persistProfile]
  );

  const getPersonalizedPrice = useCallback(
    (basePrice: number) => Math.round(basePrice * (1 - profile.discountRate)),
    [profile.discountRate]
  );

  return (
    <CharacterContext.Provider
      value={{ profile, addRide, getPersonalizedPrice, isLoading }}
    >
      {children}
    </CharacterContext.Provider>
  );
}

export function useCharacter(): CharacterContextValue {
  const ctx = useContext(CharacterContext);
  if (!ctx) throw new Error("useCharacter must be inside CharacterProvider");
  return ctx;
}
