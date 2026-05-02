import { Stack } from "expo-router";
import { DriverAuthProvider } from "@/contexts/DriverAuthContext";

export default function DriverLayout() {
  return (
    <DriverAuthProvider>
      <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="index" />
      </Stack>
    </DriverAuthProvider>
  );
}
