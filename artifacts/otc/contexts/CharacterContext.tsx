import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useAuth } from "./AuthContext";

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

export function CharacterProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<CharacterProfile>({
    credits: 12,
    tier: "Pioneer",
    totalRides: 0,
    avgRating: 5.0,
    equityPoints: 0,
    discountRate: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const storageKey = user ? `${STORAGE_KEY}_${user.id}` : null;

  useEffect(() => {
    if (!storageKey) {
      setIsLoading(false);
      return;
    }
    AsyncStorage.getItem(storageKey)
      .then((data) => {
        if (data) {
          const parsed = JSON.parse(data);
          setProfile(parsed);
        } else {
          const initial: CharacterProfile = {
            credits: 12,
            tier: "Pioneer",
            totalRides: 0,
            avgRating: 5.0,
            equityPoints: 0,
            discountRate: 0,
          };
          setProfile(initial);
          AsyncStorage.setItem(storageKey, JSON.stringify(initial)).catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [storageKey]);

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
        if (storageKey) {
          AsyncStorage.setItem(storageKey, JSON.stringify(updated)).catch(() => {});
        }
        return updated;
      });
    },
    [storageKey]
  );

  const getPersonalizedPrice = useCallback(
    (basePrice: number) => {
      return Math.round(basePrice * (1 - profile.discountRate));
    },
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
