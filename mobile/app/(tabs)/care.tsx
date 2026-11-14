import { Ionicons } from '@expo/vector-icons';
import { FamilyUpdateResult } from '@shared/types';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { PillIllustration } from '../../src/components/PillIllustration';
import { familyUpdateApi } from '../../src/services/api';
import {
  triggerSoftImpactHaptic,
  triggerSuccessHaptic,
  triggerWarningHaptic,
} from '../../src/services/haptics';
import {
  isSameLocalDay,
  useActiveProfile,
  useHarborStore,
  useHarborTheme,
} from '../../src/store/useHarborStore';

export default function FamilyScreen() {
  const router = useRouter();
  const theme = useHarborTheme();
  const activeProfile = useActiveProfile();
  const profiles = useHarborStore((s) => s.profiles);
  const setActiveProfile = useHarborStore((s) => s.setActiveProfile);
  const allLogs = useHarborStore((s) => s.doseLogs);
  const refillMedication = useHarborStore((s) => s.refillMedication);
  const addPatientProfile = useHarborStore((s) => s.addPatientProfile);
  const removeProfileById = useHarborStore((s) => s.removeProfileById);
  const reopenOnboarding = useHarborStore((s) => s.reopenOnboarding);
  const logoutCurrentPerson = useHarborStore((s) => s.logoutCurrentPerson);

  const [generatingSms, setGeneratingSms] = useState(false);
  const [familyUpdate, setFamilyUpdate] = useState<FamilyUpdateResult | null>(
    null
  );
  const [copiedJustNow, setCopiedJustNow] = useState(false);

  const [newProfileModalOpen, setNewProfileModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRelation, setNewRelation] = useState('');

  const todayLogs = useMemo(
    () =>
      allLogs.filter(
        (l) => l.profileId === activeProfile.id && isSameLocalDay(l.takenAtISO)
      ),
    [allLogs, activeProfile.id]
  );

  const handleGenerateAndCopyUpdate = async () => {
    triggerSoftImpactHaptic();
    setGeneratingSms(true);
    setCopiedJustNow(false);
    try {
      const result = await familyUpdateApi({
        patient: activeProfile,
        todayLogs,
        currentLocalTime: new Date().toLocaleTimeString([], {
          hour: 'numeric',
          minute: '2-digit',
        }),
      });
      setFamilyUpdate(result);
      await Clipboard.setStringAsync(result.smsText);
      triggerSuccessHaptic();
      setCopiedJustNow(true);
      setTimeout(() => setCopiedJustNow(false), 3500);
    } finally {
      setGeneratingSms(false);
    }
  };

  const handleCreateProfile = () => {
    if (!newName.trim()) return;
    triggerSuccessHaptic();
    addPatientProfile({
      name: newName,
      relation: newRelation || 'Family Member',
      age: 68,
      conditions: ['Daily Meds'],
    });
    setNewName('');
    setNewRelation('');
    setNewProfileModalOpen(false);
  };

  const handleLogout = async () => {
    triggerWarningHaptic();
    await logoutCurrentPerson();
    router.replace('/onboarding');
  };

  return (
    <ScrollView
      style={[
        styles.screen,
        { backgroundColor: theme.colors.backgroundPrimary },
      ]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.maxWidthWrap}>
        <Text
          style={{
            fontSize: theme.font.hero,
            lineHeight: theme.lineHeight.hero,
            fontWeight: '800',
            color: theme.colors.textPrimary,
            letterSpacing: -0.5,
            marginBottom: 16,
          }}
        >
          Family & Profile
        </Text>

        {/* 1. 1-Click Family Text Update */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.xl,
              padding: theme.spacing.lg,
            },
          ]}
        >
          <Text
            style={{
              fontSize: theme.font.subtitle,
              fontWeight: '800',
              color: theme.colors.textPrimary,
            }}
          >
            Share Today’s Update
          </Text>
          <Text
            style={{
              fontSize: theme.font.sm,
              lineHeight: theme.lineHeight.sm,
              color: theme.colors.textSecondary,
              marginTop: 4,
            }}
          >
            Copies a calm text message summarizing today’s taken doses so you
            can paste it into iMessage or WhatsApp.
          </Text>

          <Pressable
            onPress={handleGenerateAndCopyUpdate}
            disabled={generatingSms}
            style={({ pressed }) => [
              styles.primaryBtn,
              {
                minHeight: Math.max(theme.minTouchTarget, 56),
                backgroundColor: copiedJustNow
                  ? theme.colors.safe
                  : theme.colors.accentPrimary,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            {generatingSms ? (
              <ActivityIndicator color={theme.colors.white} />
            ) : (
              <Ionicons
                name={copiedJustNow ? 'checkmark-circle' : 'copy-outline'}
                size={20}
                color={theme.colors.white}
              />
            )}
            <Text
              style={{
                fontSize: theme.font.body,
                fontWeight: '700',
                color: theme.colors.white,
              }}
            >
              {generatingSms
                ? 'Creating Text...'
                : copiedJustNow
                  ? 'Copied to Clipboard!'
                  : 'Copy Family Text Update'}
            </Text>
          </Pressable>

          {familyUpdate && (
            <View
              style={[
                styles.smsPreviewBox,
                {
                  backgroundColor: theme.colors.backgroundPrimary,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Text
                style={{
                  fontSize: theme.font.sm,
                  lineHeight: theme.lineHeight.sm,
                  color: theme.colors.textPrimary,
                }}
              >
                {familyUpdate.smsText}
              </Text>
            </View>
          )}
        </View>

        {/* 2. Simple Refill Count */}
        {activeProfile.medications.length > 0 && (
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                borderRadius: theme.radius.xl,
                padding: theme.spacing.lg,
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
              Pills Remaining
            </Text>

            <View style={{ gap: 10 }}>
              {activeProfile.medications.map((med) => {
                const isLow = med.supplyRemaining <= 7;
                return (
                  <View
                    key={med.id}
                    style={[
                      styles.supplyRow,
                      {
                        backgroundColor: isLow
                          ? theme.colors.cautionSoft
                          : theme.colors.backgroundPrimary,
                        borderColor: isLow
                          ? theme.colors.cautionBorder
                          : theme.colors.border,
                      },
                    ]}
                  >
                    <PillIllustration visual={med.pillVisual} size="sm" />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: theme.font.body,
                          fontWeight: '700',
                          color: theme.colors.textPrimary,
                        }}
                      >
                        {med.name}
                      </Text>
                      <Text
                        style={{
                          fontSize: theme.font.xs,
                          fontWeight: isLow ? '700' : '500',
                          color: isLow
                            ? theme.colors.caution
                            : theme.colors.textSecondary,
                        }}
                      >
                        {med.supplyRemaining} left
                        {isLow ? ' • Refill soon' : ''}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => {
                        triggerSuccessHaptic();
                        refillMedication(activeProfile.id, med.id, 30);
                      }}
                      style={[
                        styles.refillBtn,
                        {
                          minHeight: theme.brainFogMode ? 64 : 38,
                          backgroundColor: theme.colors.surface,
                          borderColor: theme.colors.borderStrong,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          fontSize: theme.font.xs,
                          fontWeight: '700',
                          color: theme.colors.accentPrimary,
                        }}
                      >
                        +30
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* 3. People & Account Logout */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.xl,
              padding: theme.spacing.lg,
            },
          ]}
        >
          <View style={styles.rosterHeader}>
            <Text
              style={{
                fontSize: theme.font.subtitle,
                fontWeight: '800',
                color: theme.colors.textPrimary,
              }}
            >
              Saved Profiles
            </Text>
            <Pressable
              onPress={() => {
                triggerSoftImpactHaptic();
                setNewProfileModalOpen(true);
              }}
              style={[
                styles.addPersonBtn,
                {
                  minHeight: theme.brainFogMode ? 64 : 38,
                  backgroundColor: theme.colors.accentSoft,
                  borderColor: theme.colors.accentBorder,
                },
              ]}
            >
              <Ionicons
                name="add"
                size={18}
                color={theme.colors.accentPrimary}
              />
              <Text
                style={{
                  fontSize: theme.font.xs,
                  fontWeight: '700',
                  color: theme.colors.accentPrimary,
                }}
              >
                Add Person
              </Text>
            </Pressable>
          </View>

          <View style={{ gap: 8, marginTop: 12 }}>
            {profiles.map((prof) => {
              const selected = prof.id === activeProfile.id;
              return (
                <View
                  key={prof.id}
                  style={[
                    styles.memberRow,
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
                  <Pressable
                    onPress={() => {
                      triggerSoftImpactHaptic();
                      setActiveProfile(prof.id);
                    }}
                    style={styles.memberInfoTap}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: theme.font.body,
                          fontWeight: '700',
                          color: theme.colors.textPrimary,
                        }}
                      >
                        {prof.name}
                      </Text>
                      <Text
                        style={{
                          fontSize: theme.font.xs,
                          color: theme.colors.textSecondary,
                        }}
                      >
                        {prof.relation} • {prof.medications.length} meds
                      </Text>
                    </View>
                    {selected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={theme.colors.accentPrimary}
                      />
                    )}
                  </Pressable>

                  {profiles.length > 1 && (
                    <Pressable
                      onPress={() => {
                        triggerWarningHaptic();
                        removeProfileById(prof.id);
                      }}
                      hitSlop={10}
                      accessibilityLabel={`Remove ${prof.name}`}
                      style={styles.removePersonIcon}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color={theme.colors.textMuted}
                      />
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>

          {/* Walkthrough & Log Out */}
          <View style={styles.footerLinks}>
            <Pressable
              onPress={() => {
                triggerSoftImpactHaptic();
                reopenOnboarding();
              }}
              style={[
                styles.outlineBtn,
                {
                  minHeight: theme.minTouchTarget,
                  borderColor: theme.colors.borderStrong,
                },
              ]}
            >
              <Ionicons
                name="compass-outline"
                size={18}
                color={theme.colors.accentPrimary}
              />
              <Text
                style={{
                  fontSize: theme.font.sm,
                  fontWeight: '700',
                  color: theme.colors.textPrimary,
                }}
              >
                Replay Welcome Walkthrough
              </Text>
            </Pressable>

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
                Log Out & Remove My Profile
              </Text>
            </Pressable>
          </View>
        </View>

        <Modal
          visible={newProfileModalOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setNewProfileModalOpen(false)}
        >
          <Pressable
            style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]}
            onPress={() => setNewProfileModalOpen(false)}
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
                  fontSize: theme.font.title,
                  fontWeight: '800',
                  color: theme.colors.textPrimary,
                  marginBottom: 12,
                }}
              >
                Add Person
              </Text>

              <View style={{ gap: 10 }}>
                <TextInput
                  value={newName}
                  onChangeText={setNewName}
                  placeholder="Name (e.g., Dad or Elena)"
                  placeholderTextColor={theme.colors.textMuted}
                  style={[
                    styles.modalInput,
                    {
                      minHeight: theme.minTouchTarget,
                      color: theme.colors.textPrimary,
                      backgroundColor: theme.colors.backgroundPrimary,
                      borderColor: theme.colors.border,
                    },
                  ]}
                />
                <TextInput
                  value={newRelation}
                  onChangeText={setNewRelation}
                  placeholder="Note (e.g., Family Schedule)"
                  placeholderTextColor={theme.colors.textMuted}
                  style={[
                    styles.modalInput,
                    {
                      minHeight: theme.minTouchTarget,
                      color: theme.colors.textPrimary,
                      backgroundColor: theme.colors.backgroundPrimary,
                      borderColor: theme.colors.border,
                    },
                  ]}
                />
              </View>

              <Pressable
                onPress={handleCreateProfile}
                style={[
                  styles.primaryBtn,
                  {
                    minHeight: theme.minTouchTarget,
                    backgroundColor: theme.colors.accentPrimary,
                    marginTop: 16,
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
                  Save Person
                </Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: 18,
    paddingBottom: 124,
  },
  maxWidthWrap: {
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
  },
  card: {
    borderWidth: 1,
    marginBottom: 16,
  },
  primaryBtn: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  smsPreviewBox: {
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  supplyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  refillBtn: {
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rosterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addPersonBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 8,
  },
  memberInfoTap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  removePersonIcon: {
    paddingLeft: 8,
    paddingVertical: 4,
  },
  footerLinks: {
    marginTop: 18,
    gap: 10,
  },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 22,
  },
  modalSheet: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
  },
  modalInput: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 16,
  },
});
