import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useHarborStore } from '../src/store/useHarborStore';
import { HarborPalette } from '../src/theme/theme';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const hasHydrated = useHarborStore((s) => s.hasHydrated);
  const hasCompletedOnboarding = useHarborStore(
    (s) => s.hasCompletedOnboarding
  );

  useEffect(() => {
    if (!hasHydrated) return;

    const inOnboarding = segments[0] === 'onboarding';
    if (!hasCompletedOnboarding && !inOnboarding) {
      router.replace('/onboarding');
    } else if (hasCompletedOnboarding && inOnboarding) {
      router.replace('/(tabs)');
    }
  }, [hasHydrated, hasCompletedOnboarding, segments, router]);

  if (!hasHydrated) {
    return (
      <SafeAreaProvider>
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: HarborPalette.backgroundPrimary,
          }}
        >
          <ActivityIndicator size="large" color={HarborPalette.accentPrimary} />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar
        style="dark"
        backgroundColor={HarborPalette.backgroundPrimary}
      />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: HarborPalette.backgroundPrimary },
        }}
      >
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </SafeAreaProvider>
  );
}
