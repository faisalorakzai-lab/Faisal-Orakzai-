import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

export type ServiceMode = "silent" | "business" | "social";

export interface WealthInvestment {
  id: string;
  rideId: string;
  fare: number;
  amount: number;
  assetType: "digital_asset";
  createdAt: number;
}

interface WealthContextValue {
  serviceMode: ServiceMode;
  setServiceMode: (mode: ServiceMode) => void;
  trunkSpaceLiters: number;
  setTrunkSpaceLiters: (value: number) => void;
  investments: WealthInvestment[];
  addInvestment: (investment: Omit<WealthInvestment, "id" | "createdAt">) => void;
}

const WealthContext = createContext<WealthContextValue | null>(null);

export function WealthProvider({ children }: { children: React.ReactNode }) {
  const [serviceMode, setServiceMode] = useState<ServiceMode>("business");
  const [trunkSpaceLiters, setTrunkSpaceLiters] = useState(0);
  const [investments, setInvestments] = useState<WealthInvestment[]>([]);

  const addInvestment = useCallback((investment: Omit<WealthInvestment, "id" | "createdAt">) => {
    setInvestments((prev) => [
      {
        ...investment,
        id: `inv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        createdAt: Date.now(),
      },
      ...prev,
    ]);
  }, []);

  const value = useMemo(() => ({
    serviceMode,
    setServiceMode,
    trunkSpaceLiters,
    setTrunkSpaceLiters,
    investments,
    addInvestment,
  }), [serviceMode, trunkSpaceLiters, investments, addInvestment]);

  return <WealthContext.Provider value={value}>{children}</WealthContext.Provider>;
}

export function useWealth() {
  const ctx = useContext(WealthContext);
  if (!ctx) throw new Error("useWealth must be inside WealthProvider");
  return ctx;
}
