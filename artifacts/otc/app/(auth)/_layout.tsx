import { Stack } from "expo-router";
import React from "react";

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="otp" />
      <Stack.Screen
        name="profile-setup"
        options={{ animation: "slide_from_right" }}
      />
    </Stack>
  );
}
