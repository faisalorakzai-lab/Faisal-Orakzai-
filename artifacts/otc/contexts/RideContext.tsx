import React, {
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";

export type RideClass = "sovereign" | "autonomous" | "community";
export type RideStatus =
  | "idle"
  | "selecting"
  | "confirming"
  | "searching"
  | "en_route"
  | "in_ride"
  | "completed";

export interface Location {
  name: string;
  lat: number;
  lng: number;
}

export interface RideSession {
  id: string;
  proofHash: string;
  rideClass: RideClass;
  pickup: Location;
  dropoff: Location;
  distance: number;
  basePrice: number;
  finalPrice: number;
  discountApplied: number;
  coinsEarned: number;
  driverName: string;
  driverRating: number;
  driverEquityPoints: number;
  startedAt: number;
  completedAt?: number;
  gridNode: string;
}

interface RideContextValue {
  status: RideStatus;
  session: RideSession | null;
  pickup: Location | null;
  dropoff: Location | null;
  selectedClass: RideClass;
  setStatus: (s: RideStatus) => void;
  setPickup: (l: Location) => void;
  setDropoff: (l: Location) => void;
  setSelectedClass: (c: RideClass) => void;
  startRide: (session: RideSession) => void;
  completeRide: () => RideSession | null;
  cancelRide: () => void;
}

const RideContext = createContext<RideContextValue | null>(null);

const GRID_NODES = [
  "KHI-DELTA-7",
  "KHI-ALPHA-3",
  "ISB-GAMMA-9",
  "LHR-BETA-5",
  "PSH-SIGMA-2",
];

export function generateProofHash(session: Omit<RideSession, "proofHash" | "gridNode">): string {
  const seed = `${session.id}${session.rideClass}${session.pickup.name}${session.dropoff.name}${session.startedAt}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash + char) >>> 0;
  }
  const hex = hash.toString(16).padStart(8, "0");
  const extra = Math.random().toString(16).slice(2, 18);
  return `0x${hex}${extra}`.toUpperCase().slice(0, 26);
}

export function pickGridNode(): string {
  return GRID_NODES[Math.floor(Math.random() * GRID_NODES.length)];
}

export function RideProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<RideStatus>("idle");
  const [session, setSession] = useState<RideSession | null>(null);
  const [pickup, setPickup] = useState<Location | null>(null);
  const [dropoff, setDropoff] = useState<Location | null>(null);
  const [selectedClass, setSelectedClass] = useState<RideClass>("sovereign");

  const startRide = useCallback((s: RideSession) => {
    setSession(s);
    setStatus("in_ride");
  }, []);

  const completeRide = useCallback((): RideSession | null => {
    if (!session) return null;
    const completed = { ...session, completedAt: Date.now() };
    setSession(completed);
    setStatus("completed");
    return completed;
  }, [session]);

  const cancelRide = useCallback(() => {
    setSession(null);
    setStatus("idle");
    setPickup(null);
    setDropoff(null);
  }, []);

  return (
    <RideContext.Provider
      value={{
        status,
        session,
        pickup,
        dropoff,
        selectedClass,
        setStatus,
        setPickup,
        setDropoff,
        setSelectedClass,
        startRide,
        completeRide,
        cancelRide,
      }}
    >
      {children}
    </RideContext.Provider>
  );
}

export function useRide(): RideContextValue {
  const ctx = useContext(RideContext);
  if (!ctx) throw new Error("useRide must be inside RideProvider");
  return ctx;
}
