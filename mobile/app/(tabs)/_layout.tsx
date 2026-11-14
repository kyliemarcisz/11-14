import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { HarborHeader } from '../../src/components/HarborHeader';
import { useHarborTheme } from '../../src/store/useHarborStore';

export default function TabLayout() {
  const theme = useHarborTheme();

  return (
    <Tabs
      screenOptions={{
        header: () => <HarborHeader />,
        tabBarActiveTintColor: theme.colors.accentPrimary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          height: theme.brainFogMode
            ? Platform.OS === 'ios'
              ? 96
              : 80
            : Platform.OS === 'ios'
              ? 84
              : 66,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 22 : 10,
        },
        tabBarLabelStyle: {
          fontSize: theme.brainFogMode ? 14 : 12,
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Harbor',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'sunny' : 'sunny-outline'}
              size={theme.brainFogMode ? 28 : 23}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan Rx',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'scan-circle' : 'scan-outline'}
              size={theme.brainFogMode ? 28 : 23}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="safety"
        options={{
          title: 'Safety Lab',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'shield-checkmark' : 'shield-checkmark-outline'}
              size={theme.brainFogMode ? 28 : 23}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="care"
        options={{
          title: 'Care Circle',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'heart' : 'heart-outline'}
              size={theme.brainFogMode ? 28 : 23}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
