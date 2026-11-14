import { Tabs } from 'expo-router';
import React from 'react';
import { HarborHeader } from '../../src/components/HarborHeader';
import { HarborTabBar } from '../../src/components/HarborTabBar';
import { HarborPalette } from '../../src/theme/theme';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <HarborTabBar {...props} />}
      screenOptions={{
        header: () => <HarborHeader />,
        sceneStyle: {
          backgroundColor: HarborPalette.backgroundPrimary,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today' }} />
      <Tabs.Screen name="scan" options={{ title: 'Add Pill' }} />
      <Tabs.Screen name="safety" options={{ title: 'Ask Safety' }} />
      <Tabs.Screen name="care" options={{ title: 'Family' }} />
    </Tabs>
  );
}
