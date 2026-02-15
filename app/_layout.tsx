import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/query-client";
import { AuthProvider } from "@/lib/AuthContext";
import { StatusBar } from "expo-status-bar";
import {
  useFonts,
  Outfit_300Light,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from "@expo-google-fonts/outfit";

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#0B1026" } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding" options={{ presentation: "fullScreenModal", animation: "fade" }} />
      <Stack.Screen name="auth" options={{ presentation: "fullScreenModal", animation: "fade" }} />
      <Stack.Screen name="friends" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="line-detail" options={{ presentation: "modal" }} />
      <Stack.Screen name="city-detail" options={{ presentation: "modal" }} />
      <Stack.Screen name="bond-results" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Outfit_300Light,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <StatusBar style="light" />
              <RootLayoutNav />
            </KeyboardProvider>
          </GestureHandlerRootView>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

