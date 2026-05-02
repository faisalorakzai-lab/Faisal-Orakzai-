import type { DriverInfo } from "@/components/ride/DriverFoundCard";
import type { MapCoord } from "@/components/ride/RideMapFull";
import type { PaymentMethod } from "@/components/ride/PaymentSelector";

export interface ActiveRideData {
  rideId: string;
  driver: DriverInfo;
  pickup: MapCoord;
  dropoff: MapCoord;
  rideTypeLabel: string;
  totalFare: number;
  offeredPrice: number;
  paymentMethod: PaymentMethod;
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
