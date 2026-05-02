import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useSegments, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CharacterProvider } from "@/contexts/CharacterContext";
import { LocationProvider } from "@/contexts/LocationContext";
import { FlightProvider } from "@/contexts/FlightContext";
import { HotelProvider } from "@/contexts/HotelContext";
import { ReferralProvider } from "@/contexts/ReferralContext";
import { RentalProvider } from "@/contexts/RentalContext";
import { RideProvider } from "@/contexts/RideContext";
import { WalletProvider } from "@/contexts/WalletContext";

// SplashScreen only applies on native — skip on web to avoid white overlay
if (Platform.OS !== "web") {
  SplashScreen.preventAutoHideAsync();
}

const queryClient = new QueryClient();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, needsProfileSetup } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === "(auth)";
    const inProfileSetup =
      segments[0] === "(auth)" && segments[1] === "profile-setup";

    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (isAuthenticated && needsProfileSetup && !inProfileSetup) {
      router.replace("/(auth)/profile-setup");
    } else if (isAuthenticated && !needsProfileSetup && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, isLoading, segments, needsProfileSetup]);

  return <>{children}</>;
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="services/ride"
        options={{ presentation: "card", headerShown: false, animation: "slide_from_bottom" }}
      />
      <Stack.Screen
        name="services/sovereign-mode"
        options={{ presentation: "fullScreenModal", headerShown: false }}
      />
      <Stack.Screen
        name="services/[id]"
        options={{ presentation: "card", headerShown: false }}
      />
      <Stack.Screen
        name="services/rental-bookings"
        options={{ presentation: "card", headerShown: false, animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="services/hotel"
        options={{ presentation: "card", headerShown: false, animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="services/hotel-bookings"
        options={{ presentation: "card", headerShown: false, animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="services/flight"
        options={{ presentation: "card", headerShown: false, animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="services/flight-bookings"
        options={{ presentation: "card", headerShown: false, animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="services/history"
        options={{ presentation: "card", headerShown: false, animation: "slide_from_right" }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [forceReady, setForceReady] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "web" && (fontsLoaded || fontError)) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  // On web: render immediately — don't block on Google Fonts CDN
  // On native: safety net after 3 s in case fonts never resolve
  useEffect(() => {
    if (Platform.OS === "web") {
      setForceReady(true);
      return;
    }
    const t = setTimeout(() => {
      setForceReady(true);
      SplashScreen.hideAsync().catch(() => {});
    }, 3000);
    return () => clearTimeout(t);
  }, []);

  if (!forceReady && !fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <AuthProvider>
                <LocationProvider>
                  <WalletProvider>
                    <ReferralProvider>
                      <RentalProvider>
                        <HotelProvider>
                          <FlightProvider>
                            <CharacterProvider>
                              <RideProvider>
                                <AuthGate>
                                  <RootLayoutNav />
                                </AuthGate>
                              </RideProvider>
                            </CharacterProvider>
                          </FlightProvider>
                        </HotelProvider>
                      </RentalProvider>
                    </ReferralProvider>
                  </WalletProvider>
                </LocationProvider>
              </AuthProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
