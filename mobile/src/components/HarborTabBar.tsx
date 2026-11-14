import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { triggerSoftImpactHaptic } from '../services/haptics';
import { useHarborTheme } from '../store/useHarborStore';

const TAB_CONFIG: Record<
  string,
  {
    label: string;
    activeIcon: keyof typeof Ionicons.glyphMap;
    inactiveIcon: keyof typeof Ionicons.glyphMap;
  }
> = {
  index: {
    label: 'Today',
    activeIcon: 'sunny',
    inactiveIcon: 'sunny-outline',
  },
  scan: {
    label: 'Add Pill',
    activeIcon: 'camera',
    inactiveIcon: 'camera-outline',
  },
  safety: {
    label: 'Ask Safety',
    activeIcon: 'shield-checkmark',
    inactiveIcon: 'shield-checkmark-outline',
  },
  care: {
    label: 'Family',
    activeIcon: 'heart',
    inactiveIcon: 'heart-outline',
  },
};

export const HarborTabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const theme = useHarborTheme();

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.outerContainer,
        {
          paddingBottom: Math.max(
            insets.bottom,
            Platform.OS === 'ios' ? 18 : 14
          ),
        },
      ]}
    >
      <View
        style={[
          styles.floatingDock,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
        ]}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const cfg = TAB_CONFIG[route.name] || {
            label: options.title || route.name,
            activeIcon: 'ellipse',
            inactiveIcon: 'ellipse-outline',
          };

          const onPress = () => {
            triggerSoftImpactHaptic();
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={cfg.label}
              onPress={onPress}
              style={({ pressed }) => [
                styles.tabItem,
                {
                  minHeight: theme.brainFogMode ? 64 : 52,
                  backgroundColor: isFocused
                    ? theme.colors.accentSoft
                    : 'transparent',
                  borderColor: isFocused
                    ? theme.colors.accentBorder
                    : 'transparent',
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Ionicons
                name={isFocused ? cfg.activeIcon : cfg.inactiveIcon}
                size={theme.brainFogMode ? 24 : 20}
                color={
                  isFocused
                    ? theme.colors.accentPrimary
                    : theme.colors.textSecondary
                }
              />
              <Text
                numberOfLines={1}
                style={{
                  fontSize: theme.brainFogMode ? 13 : 11.5,
                  fontWeight: isFocused ? '800' : '600',
                  color: isFocused
                    ? theme.colors.accentPrimary
                    : theme.colors.textSecondary,
                  marginTop: 3,
                }}
              >
                {cfg.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  floatingDock: {
    width: '100%',
    maxWidth: 520,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 6,
    borderRadius: 28,
    borderWidth: 1.5,
    shadowColor: '#1A2630',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 8,
    gap: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRadius: 22,
    borderWidth: 1,
  },
});
