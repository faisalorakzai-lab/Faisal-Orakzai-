import type { DriverInfo } from "@/components/ride/DriverFoundCard";
import type { MapCoord } from "@/components/ride/RideMapFull";

export interface ActiveRideData {
  rideId: string;
  driver: DriverInfo;
  pickup: MapCoord;
  dropoff: MapCoord;
  rideTypeLabel: string;
  totalFare: number;
  offeredPrice: number;
}

let _store: ActiveRideData | null = null;

export function setActiveRide(data: ActiveRideData): void {
  _store = data;
}

export function getActiveRide(): ActiveRideData | null {
  return _store;
}

export function clearActiveRide(): void {
  _store = null;
}
