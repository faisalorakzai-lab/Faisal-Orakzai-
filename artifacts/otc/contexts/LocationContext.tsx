import * as ExpoLocation from "expo-location";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export interface LocationState {
  city: string;
  district: string;
  coordinates: { lat: number; lng: number } | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

const LocationContext = createContext<LocationState | null>(null);

export function useLocation(): LocationState {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useLocation must be used within LocationProvider");
  return ctx;
}

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [city, setCity] = useState("Locating...");
  const [district, setDistrict] = useState("");
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const detect = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setCity("Pakistan");
        setDistrict("Location off");
        setIsLoading(false);
        return;
      }
      const pos = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.Balanced,
      });
      setCoordinates({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      const [geo] = await ExpoLocation.reverseGeocodeAsync({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
      if (geo) {
        setCity(geo.city ?? geo.subregion ?? geo.region ?? "Unknown");
        setDistrict(geo.district ?? geo.subregion ?? "");
      }
    } catch {
      setCity("Pakistan");
      setDistrict("");
      setError("Could not detect location");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { detect(); }, [detect]);

  return (
    <LocationContext.Provider
      value={{ city, district, coordinates, isLoading, error, refresh: detect }}
    >
      {children}
    </LocationContext.Provider>
  );
}
