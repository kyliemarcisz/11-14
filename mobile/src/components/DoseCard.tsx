import { Ionicons } from '@expo/vector-icons';
import {
  DoseLog,
  Medication,
  MissedDoseAdviceResult,
  PatientProfile,
  TimeWindow,
} from '@shared/types';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  FadeInDown,
  LinearTransition,
} from 'react-native-reanimated';
import { MEMORY_ANCHOR_PRESETS } from '../data/demoProfiles';
import { missedDoseAdviceApi } from '../services/api';
import { playCalmReadout, stopCalmAudio } from '../services/audioService';
import {
  triggerSoftImpactHaptic,
  triggerSuccessHaptic,
} from '../services/haptics';
import { useHarborStore, useHarborTheme } from '../store/useHarborStore';
import { PillIllustration } from './PillIllustration';

interface DoseCardProps {
  medication: Medication;
  patient: PatientProfile;
  timeWindow: TimeWindow;
  existingLog?: DoseLog;
  todayLogs: DoseLog[];
  index: number;
}

export const DoseCard: React.FC<DoseCardProps> = ({
  medication,
  patient,
  timeWindow,
  existingLog,
  todayLogs,
  index,
}) => {
  const theme = useHarborTheme();
  const logDose = useHarborStore((s) => s.logDose);
  const defaultMemoryCue = useHarborStore((s) => s.defaultMemoryCue);
  const updateDoseAnchor = useHarborStore((s) => s.updateDoseAnchor);
  const undoDoseLog = useHarborStore((s) => s.undoDoseLog);

  const [showCueModal, setShowCueModal] = useState(false);
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [recoveryModalOpen, setRecoveryModalOpen] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryAdvice, setRecoveryAdvice] =
    useState<MissedDoseAdviceResult | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const isTaken = Boolean(existingLog);

  const handleTakeDose = () => {
    triggerSuccessHaptic();
    logDose({
      medicationId: medication.id,
      profileId: patient.id,
      timeWindow,
      memoryAnchorCue: defaultMemoryCue,
    });
  };

  const openGentleRecovery = async () => {
    triggerSoftImpactHaptic();
    setRecoveryModalOpen(true);
    setRecoveryLoading(true);
    try {
      const advice = await missedDoseAdviceApi({
        medication,
        patient,
        windowMissed: timeWindow,
        currentLocalTime: new Date().toLocaleTimeString([], {
          hour: 'numeric',
          minute: '2-digit',
        }),
        todayLogs,
        unsureIfTaken: true,
      });
      setRecoveryAdvice(advice);
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleSpeakAdvice = async (script: string) => {
    if (isSpeaking) {
      await stopCalmAudio();
      setIsSpeaking(false);
      return;
    }
    setIsSpeaking(true);
    await playCalmReadout(script, () => setIsSpeaking(false));
  };

  const takenTimeFormatted = existingLog
    ? new Date(existingLog.takenAtISO).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      })
    : '';

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 55).duration(280)}
      layout={LinearTransition.springify().damping(20).stiffness(170)}
      style={[
        styles.card,
        {
          backgroundColor: isTaken
            ? theme.colors.safeSoft
            : theme.colors.surface,
          borderColor: isTaken ? theme.colors.safeBorder : theme.colors.border,
          borderRadius: theme.radius.lg,
          padding: theme.spacing.lg,
        },
      ]}
    >
      {/* Clean Single Row: SVG Pill + Name/Dosage */}
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => {
            triggerSoftImpactHaptic();
            setInspectModalOpen(true);
          }}
          style={[
            styles.pillTile,
            {
              backgroundColor: theme.colors.backgroundPrimary,
              borderColor: theme.colors.border,
            },
          ]}
          accessibilityLabel={`Inspect ${medication.name} pill`}
        >
          <PillIllustration visual={medication.pillVisual} size="sm" />
        </Pressable>

        <View style={styles.metaCol}>
          <Text
            style={{
              fontSize: theme.font.title,
              fontWeight: '800',
              color: theme.colors.textPrimary,
              letterSpacing: -0.3,
            }}
          >
            {medication.name}
          </Text>
          <Text
            style={{
              fontSize: theme.font.body,
              fontWeight: '600',
              color: theme.colors.textSecondary,
              marginTop: 2,
            }}
          >
            {medication.dosage}
            {theme.showSecondaryMetadata ? ` • ${medication.genericName}` : ''}
          </Text>
          {theme.showSecondaryMetadata && !isTaken && (
            <Text
              numberOfLines={2}
              style={{
                fontSize: theme.font.xs,
                lineHeight: 18,
                color: theme.colors.textSecondary,
                marginTop: 4,
              }}
            >
              {medication.foodRules}
            </Text>
          )}
        </View>
      </View>

      {/* Action or Calm Taken Confirmation */}
      {isTaken && existingLog ? (
        <View style={styles.takenWrap}>
          <View style={styles.takenTopRow}>
            <View style={styles.takenCheckRow}>
              <Ionicons
                name="checkmark-circle"
                size={22}
                color={theme.colors.safe}
              />
              <Text
                style={{
                  fontSize: theme.font.body,
                  fontWeight: '700',
                  color: theme.colors.safe,
                }}
              >
                Taken at {takenTimeFormatted}
              </Text>
            </View>

            <Pressable
              onPress={() => {
                triggerSoftImpactHaptic();
                undoDoseLog(existingLog.id);
              }}
              hitSlop={10}
            >
              <Text
                style={{
                  fontSize: theme.font.xs,
                  fontWeight: '600',
                  color: theme.colors.textSecondary,
                }}
              >
                Undo
              </Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => {
              triggerSoftImpactHaptic();
              setShowCueModal(true);
            }}
            style={[
              styles.cueChip,
              {
                minHeight: theme.brainFogMode ? 64 : 40,
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.safeBorder,
              },
            ]}
          >
            <Ionicons
              name="hand-left-outline"
              size={16}
              color={theme.colors.safe}
            />
            <Text
              numberOfLines={1}
              style={{
                flex: 1,
                fontSize: theme.font.sm,
                fontWeight: '600',
                color: theme.colors.textPrimary,
              }}
            >
              {existingLog.memoryAnchorCue || defaultMemoryCue}
            </Text>
            <Text
              style={{
                fontSize: theme.font.xs,
                fontWeight: '700',
                color: theme.colors.accentPrimary,
              }}
            >
              Change
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.openActions}>
          <Pressable
            onPress={handleTakeDose}
            style={({ pressed }) => [
              styles.takeButton,
              {
                minHeight: Math.max(theme.minTouchTarget, 56),
                backgroundColor: theme.colors.accentPrimary,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Ionicons
              name="checkmark"
              size={22}
              color={theme.colors.white}
            />
            <Text
              style={{
                fontSize: theme.font.bodyLg,
                fontWeight: '700',
                color: theme.colors.white,
              }}
            >
              Take Dose
            </Text>
          </Pressable>

          <Pressable
            onPress={openGentleRecovery}
            style={[
              styles.unsureLink,
              { minHeight: theme.brainFogMode ? 64 : 36 },
            ]}
          >
            <Text
              style={{
                fontSize: theme.font.xs,
                fontWeight: '600',
                color: theme.colors.textSecondary,
              }}
            >
              Running late or not sure if you already took this?
            </Text>
          </Pressable>
        </View>
      )}

      {/* Change Physical Habit Modal */}
      <Modal
        visible={showCueModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCueModal(false)}
      >
        <Pressable
          style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]}
          onPress={() => setShowCueModal(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[
              styles.modalCard,
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
                marginBottom: 6,
              }}
            >
              Which physical habit did you do?
            </Text>
            <Text
              style={{
                fontSize: theme.font.sm,
                color: theme.colors.textSecondary,
                marginBottom: 14,
              }}
            >
              Helps you verify later without guessing.
            </Text>
            {MEMORY_ANCHOR_PRESETS.map((preset) => (
              <Pressable
                key={preset}
                onPress={() => {
                  triggerSuccessHaptic();
                  if (existingLog) {
                    updateDoseAnchor(existingLog.id, preset);
                  }
                  setShowCueModal(false);
                }}
                style={[
                  styles.presetBtn,
                  {
                    minHeight: theme.minTouchTarget,
                    backgroundColor: theme.colors.backgroundPrimary,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: theme.font.body,
                    fontWeight: '600',
                    color: theme.colors.textPrimary,
                  }}
                >
                  {preset}
                </Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Pill Visual Zoom Modal */}
      <Modal
        visible={inspectModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setInspectModalOpen(false)}
      >
        <Pressable
          style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]}
          onPress={() => setInspectModalOpen(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[
              styles.modalCard,
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
              {medication.name} ({medication.dosage})
            </Text>
            <Text
              style={{
                fontSize: theme.font.sm,
                color: theme.colors.textSecondary,
                marginTop: 2,
                marginBottom: 16,
              }}
            >
              {medication.plainEnglishPurpose}
            </Text>

            <View
              style={[
                styles.pillZoomStage,
                {
                  backgroundColor: theme.colors.backgroundPrimary,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <PillIllustration visual={medication.pillVisual} size="lg" />
              <Text
                style={{
                  fontSize: theme.font.sm,
                  fontWeight: '700',
                  color: theme.colors.textPrimary,
                  marginTop: 8,
                }}
              >
                {medication.pillVisual.shape.toUpperCase()} • Imprint “
                {medication.pillVisual.imprintCode}”
              </Text>
            </View>

            <Pressable
              onPress={() => setInspectModalOpen(false)}
              style={[
                styles.closeBtn,
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
                Close
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Calm Recovery Modal */}
      <Modal
        visible={recoveryModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          stopCalmAudio();
          setIsSpeaking(false);
          setRecoveryModalOpen(false);
        }}
      >
        <View
          style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]}
        >
          <View
            style={[
              styles.modalCard,
              {
                maxHeight: '84%',
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text
                style={{
                  fontSize: theme.font.title,
                  fontWeight: '800',
                  color: theme.colors.textPrimary,
                }}
              >
                {medication.name} — Calm Next Step
              </Text>

              {recoveryLoading || !recoveryAdvice ? (
                <View style={{ paddingVertical: 28, alignItems: 'center' }}>
                  <ActivityIndicator
                    size="large"
                    color={theme.colors.accentPrimary}
                  />
                  <Text
                    style={{
                      marginTop: 10,
                      fontSize: theme.font.sm,
                      color: theme.colors.textSecondary,
                    }}
                  >
                    Checking safe guidance...
                  </Text>
                </View>
              ) : (
                <View style={{ marginTop: 12, gap: 12 }}>
                  <Text
                    style={{
                      fontSize: theme.font.body,
                      fontWeight: '700',
                      color: theme.colors.textPrimary,
                    }}
                  >
                    {recoveryAdvice.calmHeadline}
                  </Text>

                  <Pressable
                    onPress={() =>
                      handleSpeakAdvice(recoveryAdvice.spokenScript)
                    }
                    style={[
                      styles.audioBtn,
                      {
                        minHeight: theme.minTouchTarget,
                        backgroundColor: isSpeaking
                          ? theme.colors.accentPrimary
                          : theme.colors.accentSoft,
                        borderColor: theme.colors.accentBorder,
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        isSpeaking ? 'stop-circle-outline' : 'volume-high-outline'
                      }
                      size={20}
                      color={
                        isSpeaking
                          ? theme.colors.white
                          : theme.colors.accentPrimary
                      }
                    />
                    <Text
                      style={{
                        fontSize: theme.font.sm,
                        fontWeight: '700',
                        color: isSpeaking
                          ? theme.colors.white
                          : theme.colors.accentPrimary,
                      }}
                    >
                      {isSpeaking ? 'Stop Audio' : 'Read Aloud Gently'}
                    </Text>
                  </Pressable>

                  <View style={{ gap: 8 }}>
                    {recoveryAdvice.stepByStepAction.map((step, idx) => (
                      <Text
                        key={idx}
                        style={{
                          fontSize: theme.font.sm,
                          lineHeight: theme.lineHeight.sm,
                          color: theme.colors.textPrimary,
                        }}
                      >
                        <Text style={{ fontWeight: '800' }}>{idx + 1}. </Text>
                        {step}
                      </Text>
                    ))}
                  </View>

                  <View
                    style={[
                      styles.cautionBox,
                      {
                        backgroundColor: theme.colors.cautionSoft,
                        borderColor: theme.colors.cautionBorder,
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
                      {recoveryAdvice.doubleDoseWarning}
                    </Text>
                  </View>
                </View>
              )}

              <Pressable
                onPress={() => {
                  stopCalmAudio();
                  setIsSpeaking(false);
                  setRecoveryModalOpen(false);
                }}
                style={[
                  styles.closeBtn,
                  {
                    minHeight: theme.minTouchTarget,
                    backgroundColor: theme.colors.textPrimary,
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
                  Done
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  pillTile: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaCol: {
    flex: 1,
  },
  openActions: {
    marginTop: 14,
  },
  takeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
  },
  unsureLink: {
    marginTop: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  takenWrap: {
    marginTop: 14,
    gap: 8,
  },
  takenTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  takenCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cueChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 22,
  },
  modalCard: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
  },
  presetBtn: {
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  pillZoomStage: {
    alignItems: 'center',
    paddingVertical: 18,
    borderRadius: 18,
    borderWidth: 1,
  },
  closeBtn: {
    marginTop: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  cautionBox: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
});
