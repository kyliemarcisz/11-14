import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  triggerSoftImpactHaptic,
  triggerSuccessHaptic,
} from '../services/haptics';
import {
  useActiveProfile,
  useHarborStore,
  useHarborTheme,
} from '../store/useHarborStore';

export const HarborHeader: React.FC = () => {
  const insets = useSafeAreaInsets();
  const theme = useHarborTheme();
  const profiles = useHarborStore((s) => s.profiles);
  const activeProfile = useActiveProfile();
  const setActiveProfile = useHarborStore((s) => s.setActiveProfile);
  const brainFogMode = useHarborStore((s) => s.brainFogMode);
  const toggleBrainFogMode = useHarborStore((s) => s.toggleBrainFogMode);

  const [switcherOpen, setSwitcherOpen] = useState(false);

  const handleToggleBrainFog = () => {
    triggerSuccessHaptic();
    toggleBrainFogMode();
  };

  const handleSelectProfile = (id: string) => {
    triggerSoftImpactHaptic();
    setActiveProfile(id);
    setSwitcherOpen(false);
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, 10) + 6,
          backgroundColor: theme.colors.backgroundPrimary,
          borderBottomColor: theme.colors.border,
        },
      ]}
    >
      <View style={styles.row}>
        {/* Left: Brand + Active Care Circle Switcher */}
        <Pressable
          onPress={() => {
            triggerSoftImpactHaptic();
            setSwitcherOpen(true);
          }}
          style={({ pressed }) => [
            styles.profileChip,
            {
              minHeight: theme.brainFogMode ? 64 : 44,
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Current Care Circle profile: ${activeProfile.name}. Tap to switch.`}
        >
          <View
            style={[
              styles.avatarCircle,
              { backgroundColor: theme.colors.accentSoft },
            ]}
          >
            <Text
              style={{
                color: theme.colors.accentPrimary,
                fontWeight: '700',
                fontSize: theme.font.sm,
              }}
            >
              {activeProfile.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)}
            </Text>
          </View>
          <View style={styles.profileTextCol}>
            {theme.showSecondaryMetadata && (
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '600',
                  letterSpacing: 0.4,
                  color: theme.colors.accentPrimary,
                  textTransform: 'uppercase',
                }}
              >
                HarborDose
              </Text>
            )}
            <Text
              numberOfLines={1}
              style={{
                fontSize: theme.font.sm,
                fontWeight: '700',
                color: theme.colors.textPrimary,
              }}
            >
              {activeProfile.name.split(' ')[0]}
            </Text>
          </View>
          <Ionicons
            name="chevron-down"
            size={theme.brainFogMode ? 20 : 16}
            color={theme.colors.textSecondary}
          />
        </Pressable>

        {/* Right: Persistent Global Brain-Fog Large Mode Toggle */}
        <Pressable
          onPress={handleToggleBrainFog}
          style={({ pressed }) => [
            styles.brainFogToggle,
            {
              minHeight: theme.brainFogMode ? 64 : 44,
              backgroundColor: brainFogMode
                ? theme.colors.accentPrimary
                : theme.colors.surface,
              borderColor: brainFogMode
                ? theme.colors.accentPrimary
                : theme.colors.borderStrong,
              opacity: pressed ? 0.88 : 1,
            },
          ]}
          accessibilityRole="switch"
          accessibilityState={{ checked: brainFogMode }}
          accessibilityLabel="Brain-Fog Large Mode toggle"
        >
          <Ionicons
            name={brainFogMode ? 'sparkles' : 'eye-outline'}
            size={brainFogMode ? 22 : 18}
            color={brainFogMode ? theme.colors.white : theme.colors.accentPrimary}
          />
          <Text
            style={{
              fontSize: theme.font.xs,
              fontWeight: '700',
              color: brainFogMode
                ? theme.colors.white
                : theme.colors.textPrimary,
            }}
          >
            {brainFogMode ? 'Calm XL: ON' : 'Brain-Fog XL'}
          </Text>
        </Pressable>
      </View>

      {/* Care Circle Switcher Modal */}
      <Modal
        visible={switcherOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSwitcherOpen(false)}
      >
        <Pressable
          style={[styles.modalBackdrop, { backgroundColor: theme.colors.overlay }]}
          onPress={() => setSwitcherOpen(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[
              styles.modalSheet,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text
              style={{
                fontSize: theme.font.subtitle,
                fontWeight: '700',
                color: theme.colors.textPrimary,
                marginBottom: 4,
              }}
            >
              Care Circle Profiles
            </Text>
            <Text
              style={{
                fontSize: theme.font.sm,
                color: theme.colors.textSecondary,
                marginBottom: 16,
              }}
            >
              Switch gently between family members you support.
            </Text>

            {profiles.map((profile) => {
              const isSelected = profile.id === activeProfile.id;
              return (
                <Pressable
                  key={profile.id}
                  onPress={() => handleSelectProfile(profile.id)}
                  style={[
                    styles.profileOption,
                    {
                      minHeight: theme.minTouchTarget,
                      backgroundColor: isSelected
                        ? theme.colors.accentSoft
                        : theme.colors.backgroundPrimary,
                      borderColor: isSelected
                        ? theme.colors.accentPrimary
                        : theme.colors.border,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: theme.font.body,
                        fontWeight: '700',
                        color: theme.colors.textPrimary,
                      }}
                    >
                      {profile.name} ({profile.age})
                    </Text>
                    <Text
                      style={{
                        fontSize: theme.font.sm,
                        color: theme.colors.textSecondary,
                        marginTop: 2,
                      }}
                    >
                      {profile.relation} • {profile.medications.length} active meds
                    </Text>
                  </View>
                  {isSelected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color={theme.colors.accentPrimary}
                    />
                  )}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  profileChip: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  avatarCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileTextCol: {
    flexShrink: 1,
  },
  brainFogToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 22,
  },
  modalSheet: {
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
  },
  profileOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 10,
    gap: 12,
  },
});
