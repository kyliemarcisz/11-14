import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { checkGeminiHealthApi, GeminiHealthStatus } from '../services/api';
import {
  triggerSoftImpactHaptic,
  triggerSuccessHaptic,
  triggerWarningHaptic,
} from '../services/haptics';
import {
  useActiveProfile,
  useHarborStore,
  useHarborTheme,
} from '../store/useHarborStore';

export const HarborHeader: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useHarborTheme();
  const profiles = useHarborStore((s) => s.profiles);
  const activeProfile = useActiveProfile();
  const setActiveProfile = useHarborStore((s) => s.setActiveProfile);
  const brainFogMode = useHarborStore((s) => s.brainFogMode);
  const toggleBrainFogMode = useHarborStore((s) => s.toggleBrainFogMode);
  const reopenOnboarding = useHarborStore((s) => s.reopenOnboarding);
  const logoutCurrentPerson = useHarborStore((s) => s.logoutCurrentPerson);

  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [aiStatus, setAiStatus] = useState<GeminiHealthStatus | null>(null);

  useEffect(() => {
    let mounted = true;
    checkGeminiHealthApi().then((s) => {
      if (mounted) setAiStatus(s);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = async () => {
    triggerWarningHaptic();
    setSwitcherOpen(false);
    await logoutCurrentPerson();
    router.replace('/onboarding');
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, 10) + 4,
          backgroundColor: theme.colors.backgroundPrimary,
        },
      ]}
    >
      <View style={styles.maxWidthRow}>
        {/* Left: Person Switcher & Account Menu */}
        <Pressable
          onPress={() => {
            triggerSoftImpactHaptic();
            setSwitcherOpen(true);
          }}
          style={({ pressed }) => [
            styles.profileChip,
            {
              minHeight: theme.brainFogMode ? 64 : 42,
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <View
            style={[
              styles.avatarDot,
              { backgroundColor: theme.colors.accentSoft },
            ]}
          >
            <Text
              style={{
                color: theme.colors.accentPrimary,
                fontWeight: '700',
                fontSize: theme.font.xs,
              }}
            >
              {activeProfile.name[0]?.toUpperCase() || 'M'}
            </Text>
          </View>
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
          <Ionicons
            name="chevron-down"
            size={15}
            color={theme.colors.textSecondary}
          />
        </Pressable>

        {/* Right: Gemini Live Pill + ? Quick Guide + Aa Large Toggle */}
        <View style={styles.rightRow}>
          {!brainFogMode && aiStatus && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                paddingHorizontal: 9,
                paddingVertical: 4,
                borderRadius: 999,
                borderWidth: 1,
                backgroundColor: aiStatus.geminiConfigured
                  ? theme.colors.safeSoft
                  : theme.colors.cautionSoft,
                borderColor: aiStatus.geminiConfigured
                  ? theme.colors.safeBorder
                  : theme.colors.cautionBorder,
              }}
            >
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 999,
                  backgroundColor: aiStatus.geminiConfigured
                    ? theme.colors.safe
                    : theme.colors.caution,
                }}
              />
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  color: aiStatus.geminiConfigured
                    ? theme.colors.safe
                    : theme.colors.caution,
                }}
              >
                {aiStatus.geminiConfigured ? 'Gemini Live' : 'Offline'}
              </Text>
            </View>
          )}
          <Pressable
            onPress={() => {
              triggerSoftImpactHaptic();
              setGuideOpen(true);
            }}
            style={[
              styles.helpCircle,
              {
                width: theme.brainFogMode ? 64 : 42,
                height: theme.brainFogMode ? 64 : 42,
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
            accessibilityLabel="How HarborDose works"
          >
            <Ionicons
              name="help"
              size={theme.brainFogMode ? 22 : 18}
              color={theme.colors.textSecondary}
            />
          </Pressable>

          <Pressable
            onPress={() => {
              triggerSuccessHaptic();
              toggleBrainFogMode();
            }}
            style={({ pressed }) => [
              styles.aaToggle,
              {
                minHeight: theme.brainFogMode ? 64 : 42,
                backgroundColor: brainFogMode
                  ? theme.colors.accentPrimary
                  : theme.colors.surface,
                borderColor: brainFogMode
                  ? theme.colors.accentPrimary
                  : theme.colors.border,
                opacity: pressed ? 0.88 : 1,
              },
            ]}
            accessibilityRole="switch"
            accessibilityState={{ checked: brainFogMode }}
            accessibilityLabel="Large simple text mode"
          >
            <Text
              style={{
                fontSize: theme.font.sm,
                fontWeight: '800',
                color: brainFogMode
                  ? theme.colors.white
                  : theme.colors.textPrimary,
              }}
            >
              Aa {brainFogMode ? 'Large ON' : 'Large'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Switch Person & Log Out Sheet */}
      <Modal
        visible={switcherOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSwitcherOpen(false)}
      >
        <Pressable
          style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]}
          onPress={() => setSwitcherOpen(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[
              styles.sheet,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text
              style={{
                fontSize: theme.font.subtitle,
                fontWeight: '800',
                color: theme.colors.textPrimary,
                marginBottom: 12,
              }}
            >
              Active Profile
            </Text>

            {profiles.map((profile) => {
              const selected = profile.id === activeProfile.id;
              return (
                <Pressable
                  key={profile.id}
                  onPress={() => {
                    triggerSoftImpactHaptic();
                    setActiveProfile(profile.id);
                    setSwitcherOpen(false);
                  }}
                  style={[
                    styles.profileRow,
                    {
                      minHeight: theme.minTouchTarget,
                      backgroundColor: selected
                        ? theme.colors.accentSoft
                        : theme.colors.backgroundPrimary,
                      borderColor: selected
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
                      {profile.name}
                    </Text>
                    <Text
                      style={{
                        fontSize: theme.font.xs,
                        color: theme.colors.textSecondary,
                        marginTop: 2,
                      }}
                    >
                      {profile.relation} • {profile.medications.length} meds
                    </Text>
                  </View>
                  {selected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color={theme.colors.accentPrimary}
                    />
                  )}
                </Pressable>
              );
            })}

            <View
              style={[
                styles.divider,
                { backgroundColor: theme.colors.border },
              ]}
            />

            <Pressable
              onPress={handleLogout}
              style={[
                styles.logoutBtn,
                {
                  minHeight: theme.minTouchTarget,
                  backgroundColor: theme.colors.criticalSoft,
                  borderColor: theme.colors.criticalBorder,
                },
              ]}
            >
              <Ionicons
                name="log-out-outline"
                size={20}
                color={theme.colors.critical}
              />
              <Text
                style={{
                  fontSize: theme.font.body,
                  fontWeight: '700',
                  color: theme.colors.critical,
                }}
              >
                Log Out & Clear Profile
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Quick Help Cheat-Sheet Modal */}
      <Modal
        visible={guideOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setGuideOpen(false)}
      >
        <Pressable
          style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]}
          onPress={() => setGuideOpen(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[
              styles.sheet,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text
              style={{
                fontSize: theme.font.title,
                fontWeight: '800',
                color: theme.colors.textPrimary,
              }}
            >
              Quick Guide
            </Text>
            <Text
              style={{
                fontSize: theme.font.sm,
                color: theme.colors.textSecondary,
                marginTop: 4,
                marginBottom: 16,
              }}
            >
              HarborDose helps you take daily prescriptions safely without
              second-guessing.
            </Text>

            <View style={{ gap: 12 }}>
              {[
                [
                  'Today',
                  'Tap "Take Dose" as you swallow each pill. It records the time + a physical habit so you never take two by mistake.',
                ],
                [
                  'Add Pill',
                  'Snap a photo of any prescription bottle to add it automatically.',
                ],
                [
                  'Ask Safety',
                  'Check if painkillers (like Advil), coffee, or foods are safe with your meds.',
                ],
                [
                  'Family',
                  'Copy a 1-tap text update for family, manage profiles, or log out.',
                ],
              ].map(([title, desc]) => (
                <View key={title}>
                  <Text
                    style={{
                      fontSize: theme.font.body,
                      fontWeight: '700',
                      color: theme.colors.textPrimary,
                    }}
                  >
                    • {title}
                  </Text>
                  <Text
                    style={{
                      fontSize: theme.font.sm,
                      lineHeight: theme.lineHeight.sm,
                      color: theme.colors.textSecondary,
                      marginLeft: 12,
                    }}
                  >
                    {desc}
                  </Text>
                </View>
              ))}
            </View>

            <View style={{ marginTop: 20, gap: 10 }}>
              <Pressable
                onPress={() => setGuideOpen(false)}
                style={[
                  styles.sheetPrimaryBtn,
                  {
                    minHeight: theme.minTouchTarget,
                    backgroundColor: theme.colors.accentPrimary,
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: theme.font.body,
                    fontWeight: '700',
                    color: theme.colors.white,
                  }}
                >
                  Got It
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setGuideOpen(false);
                  reopenOnboarding();
                }}
                style={[
                  styles.sheetSecondaryBtn,
                  {
                    minHeight: theme.minTouchTarget,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: theme.font.sm,
                    fontWeight: '600',
                    color: theme.colors.textSecondary,
                  }}
                >
                  Replay Setup Walkthrough
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  maxWidthRow: {
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  profileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  avatarDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  helpCircle: {
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aaToggle: {
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 22,
  },
  sheet: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  sheetPrimaryBtn: {
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetSecondaryBtn: {
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
