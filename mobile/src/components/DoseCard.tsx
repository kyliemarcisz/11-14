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

const HIGH_RISK_LABELS: Record<string, string> = {
  blood_thinner: 'Blood Thinner • Single-Dose Guard',
  statin: 'Cholesterol Care',
  stimulant: 'ADHD Focus Support',
  blood_pressure: 'Blood Pressure Care',
  thyroid: 'Thyroid Hormone',
};

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
  const updateDoseAnchor = useHarborStore((s) => s.updateDoseAnchor);
  const undoDoseLog = useHarborStore((s) => s.undoDoseLog);

  const [showAnchorPicker, setShowAnchorPicker] = useState(false);
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [recoveryModalOpen, setRecoveryModalOpen] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryAdvice, setRecoveryAdvice] =
    useState<MissedDoseAdviceResult | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const isTaken = Boolean(existingLog);

  const handleLogDoseWithAnchor = (anchorCue?: string) => {
    triggerSuccessHaptic();
    logDose({
      medicationId: medication.id,
      profileId: patient.id,
      timeWindow,
      memoryAnchorCue: anchorCue || MEMORY_ANCHOR_PRESETS[0],
    });
    setShowAnchorPicker(false);
  };

  const handleSelectAnchor = (cue: string) => {
    triggerSuccessHaptic();
    if (existingLog) {
      updateDoseAnchor(existingLog.id, cue);
    } else {
      logDose({
        medicationId: medication.id,
        profileId: patient.id,
        timeWindow,
        memoryAnchorCue: cue,
      });
    }
    setShowAnchorPicker(false);
  };

  const openGentleRecovery = async (unsureIfTaken: boolean) => {
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
        unsureIfTaken,
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
      entering={FadeInDown.delay(index * 65).duration(320)}
      layout={LinearTransition.springify().damping(19).stiffness(160)}
      style={[
        styles.card,
        {
          backgroundColor: isTaken
            ? theme.colors.safeSoft
            : theme.colors.surface,
          borderColor: isTaken
            ? theme.colors.safeBorder
            : theme.colors.border,
          borderRadius: theme.radius.lg,
          padding: theme.spacing.lg,
        },
      ]}
    >
      {/* Top Row: Medication Identity + Tactile SVG Pill */}
      <View style={styles.topRow}>
        <View style={styles.titleCol}>
          {theme.showSecondaryMetadata && medication.highRiskCategory && (
            <View
              style={[
                styles.categoryBadge,
                {
                  backgroundColor:
                    medication.highRiskCategory === 'blood_thinner'
                      ? theme.colors.cautionSoft
                      : theme.colors.accentSoft,
                  borderColor:
                    medication.highRiskCategory === 'blood_thinner'
                      ? theme.colors.cautionBorder
                      : theme.colors.accentBorder,
                },
              ]}
            >
              <Text
                style={{
                  fontSize: theme.font.xs,
                  fontWeight: '700',
                  color:
                    medication.highRiskCategory === 'blood_thinner'
                      ? theme.colors.caution
                      : theme.colors.accentPrimary,
                }}
              >
                {HIGH_RISK_LABELS[medication.highRiskCategory]}
              </Text>
            </View>
          )}

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
            {medication.genericName} • {medication.dosage}
          </Text>
        </View>

        <Pressable
          onPress={() => {
            triggerSoftImpactHaptic();
            setInspectModalOpen(true);
          }}
          style={({ pressed }) => [
            styles.pillPreviewBox,
            {
              backgroundColor: theme.colors.backgroundPrimary,
              borderColor: theme.colors.border,
              opacity: pressed ? 0.82 : 1,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Inspect ${medication.name} pill visual`}
        >
          <PillIllustration
            visual={medication.pillVisual}
            size={theme.brainFogMode ? 'md' : 'sm'}
          />
          {theme.showSecondaryMetadata && (
            <Text
              style={{
                fontSize: 11,
                fontWeight: '600',
                color: theme.colors.textSecondary,
                marginTop: 2,
              }}
            >
              Tap to verify
            </Text>
          )}
        </Pressable>
      </View>

      {/* Plain-English Purpose & Food Rule (Hidden in Brain-Fog Large Mode to keep cognitive load minimal) */}
      {theme.showSecondaryMetadata && !isTaken && (
        <View
          style={[
            styles.infoBox,
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
            {medication.plainEnglishPurpose}
          </Text>
          <View style={styles.foodRuleRow}>
            <Ionicons
              name="restaurant-outline"
              size={15}
              color={theme.colors.accentPrimary}
            />
            <Text
              style={{
                flex: 1,
                fontSize: theme.font.xs,
                color: theme.colors.textSecondary,
                fontWeight: '500',
              }}
            >
              {medication.foodRules}
            </Text>
          </View>
        </View>
      )}

      {/* Taken State: Anti-Double-Dose Reassurance Banner */}
      {isTaken && existingLog ? (
        <View style={styles.takenContainer}>
          <View style={styles.takenHeaderRow}>
            <Ionicons
              name="checkmark-circle"
              size={theme.brainFogMode ? 28 : 22}
              color={theme.colors.safe}
            />
            <Text
              style={{
                flex: 1,
                fontSize: theme.font.bodyLg,
                fontWeight: '700',
                color: theme.colors.safe,
              }}
            >
              Safely Taken at {takenTimeFormatted}
            </Text>
          </View>

          <Pressable
            onPress={() => {
              triggerSoftImpactHaptic();
              setShowAnchorPicker((v) => !v);
            }}
            style={[
              styles.anchorLockedPill,
              {
                minHeight: theme.minTouchTarget,
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.safeBorder,
              },
            ]}
          >
            <Ionicons
              name="locate-outline"
              size={20}
              color={theme.colors.safe}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: theme.font.xs,
                  color: theme.colors.textSecondary,
                  fontWeight: '600',
                }}
              >
                Physical Memory Anchor (Anti-Double-Dose Proof)
              </Text>
              <Text
                style={{
                  fontSize: theme.font.sm,
                  color: theme.colors.textPrimary,
                  fontWeight: '700',
                  marginTop: 2,
                }}
              >
                {existingLog.memoryAnchorCue || 'Tap to lock a physical cue'}
              </Text>
            </View>
            <Ionicons
              name="create-outline"
              size={18}
              color={theme.colors.textSecondary}
            />
          </Pressable>

          {theme.showSecondaryMetadata && (
            <Pressable
              onPress={() => {
                triggerSoftImpactHaptic();
                undoDoseLog(existingLog.id);
              }}
              style={styles.undoBtn}
            >
              <Text
                style={{
                  fontSize: theme.font.xs,
                  color: theme.colors.textSecondary,
                  fontWeight: '600',
                }}
              >
                Tapped by mistake? Undo gently
              </Text>
            </Pressable>
          )}
        </View>
      ) : (
        /* Open Dose Actions */
        <View style={styles.actionsCol}>
          <Pressable
            onPress={() => handleLogDoseWithAnchor(MEMORY_ANCHOR_PRESETS[0])}
            style={({ pressed }) => [
              styles.primaryTakeButton,
              {
                minHeight: Math.max(theme.minTouchTarget, 58),
                backgroundColor: theme.colors.accentPrimary,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Log ${medication.name} ${medication.dosage} as taken`}
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={theme.brainFogMode ? 28 : 22}
              color={theme.colors.white}
            />
            <Text
              style={{
                fontSize: theme.font.bodyLg,
                fontWeight: '700',
                color: theme.colors.white,
              }}
            >
              Log 1 Dose Taken
            </Text>
          </Pressable>

          <View style={styles.secondaryActionsRow}>
            <Pressable
              onPress={() => {
                triggerSoftImpactHaptic();
                setShowAnchorPicker((v) => !v);
              }}
              style={[
                styles.secondaryBtn,
                {
                  minHeight: theme.minTouchTarget,
                  backgroundColor: theme.colors.backgroundPrimary,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Ionicons
                name="hand-left-outline"
                size={18}
                color={theme.colors.accentPrimary}
              />
              <Text
                style={{
                  fontSize: theme.font.sm,
                  fontWeight: '600',
                  color: theme.colors.textPrimary,
                }}
              >
                Pick Anchor
              </Text>
            </Pressable>

            <Pressable
              onPress={() => openGentleRecovery(true)}
              style={[
                styles.secondaryBtn,
                {
                  minHeight: theme.minTouchTarget,
                  backgroundColor: theme.colors.cautionSoft,
                  borderColor: theme.colors.cautionBorder,
                },
              ]}
            >
              <Ionicons
                name="help-buoy-outline"
                size={18}
                color={theme.colors.caution}
              />
              <Text
                style={{
                  fontSize: theme.font.sm,
                  fontWeight: '700',
                  color: theme.colors.caution,
                }}
              >
                Late or Unsure?
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Expandable Physical Memory Anchor Drawer */}
      {showAnchorPicker && (
        <View
          style={[
            styles.anchorDrawer,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text
            style={{
              fontSize: theme.font.sm,
              fontWeight: '700',
              color: theme.colors.textPrimary,
              marginBottom: 8,
            }}
          >
            Lock a physical memory cue right as you swallow:
          </Text>
          {MEMORY_ANCHOR_PRESETS.map((preset) => (
            <Pressable
              key={preset}
              onPress={() => handleSelectAnchor(preset)}
              style={[
                styles.anchorChoice,
                {
                  minHeight: theme.minTouchTarget,
                  backgroundColor: theme.colors.backgroundPrimary,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Ionicons
                name="sparkles-outline"
                size={18}
                color={theme.colors.accentPrimary}
              />
              <Text
                style={{
                  flex: 1,
                  fontSize: theme.font.sm,
                  fontWeight: '600',
                  color: theme.colors.textPrimary,
                }}
              >
                {preset}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Visual Pill Check Modal */}
      <Modal
        visible={inspectModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setInspectModalOpen(false)}
      >
        <Pressable
          style={[styles.modalBackdrop, { backgroundColor: theme.colors.overlay }]}
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
                fontSize: theme.font.xs,
                fontWeight: '700',
                color: theme.colors.accentPrimary,
                textTransform: 'uppercase',
                letterSpacing: 0.6,
              }}
            >
              Visual Pill Match Check
            </Text>
            <Text
              style={{
                fontSize: theme.font.title,
                fontWeight: '800',
                color: theme.colors.textPrimary,
                marginTop: 4,
              }}
            >
              {medication.name} ({medication.dosage})
            </Text>
            <Text
              style={{
                fontSize: theme.font.sm,
                color: theme.colors.textSecondary,
                marginBottom: 16,
              }}
            >
              Generic: {medication.genericName}
            </Text>

            <View
              style={[
                styles.largePillStage,
                {
                  backgroundColor: theme.colors.backgroundPrimary,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <PillIllustration visual={medication.pillVisual} size="lg" />
              <Text
                style={{
                  fontSize: theme.font.body,
                  fontWeight: '700',
                  color: theme.colors.textPrimary,
                  marginTop: 10,
                }}
              >
                Shape: {medication.pillVisual.shape.toUpperCase()} • Imprint: &ldquo;
                {medication.pillVisual.imprintCode}&rdquo;
              </Text>
            </View>

            <Text
              style={{
                fontSize: theme.font.sm,
                lineHeight: theme.lineHeight.sm,
                color: theme.colors.textSecondary,
                marginTop: 14,
              }}
            >
              If the pill in your hand has a different shape, color, or imprint
              number than shown above, pause before swallowing and check the bottle
              label.
            </Text>

            <Pressable
              onPress={() => setInspectModalOpen(false)}
              style={[
                styles.modalCloseBtn,
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
                Looks Right — Close
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Zero-Shame Gemini Recovery Advisor Modal */}
      <Modal
        visible={recoveryModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => {
          stopCalmAudio();
          setIsSpeaking(false);
          setRecoveryModalOpen(false);
        }}
      >
        <View
          style={[styles.modalBackdrop, { backgroundColor: theme.colors.overlay }]}
        >
          <View
            style={[
              styles.modalCard,
              {
                maxHeight: '86%',
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.recoveryBadgeRow}>
                <Ionicons
                  name="leaf-outline"
                  size={20}
                  color={theme.colors.accentPrimary}
                />
                <Text
                  style={{
                    fontSize: theme.font.xs,
                    fontWeight: '700',
                    color: theme.colors.accentPrimary,
                    textTransform: 'uppercase',
                  }}
                >
                  Zero-Shame Calm Recovery • Gemini
                </Text>
              </View>

              <Text
                style={{
                  fontSize: theme.font.title,
                  fontWeight: '800',
                  color: theme.colors.textPrimary,
                  marginTop: 6,
                }}
              >
                {medication.name} ({medication.dosage})
              </Text>

              {recoveryLoading || !recoveryAdvice ? (
                <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                  <ActivityIndicator
                    size="large"
                    color={theme.colors.accentPrimary}
                  />
                  <Text
                    style={{
                      marginTop: 12,
                      fontSize: theme.font.sm,
                      color: theme.colors.textSecondary,
                    }}
                  >
                    Checking calm clinical next steps with Gemini...
                  </Text>
                </View>
              ) : (
                <View style={{ marginTop: 14, gap: 12 }}>
                  <Text
                    style={{
                      fontSize: theme.font.bodyLg,
                      fontWeight: '700',
                      color: theme.colors.textPrimary,
                    }}
                  >
                    {recoveryAdvice.calmHeadline}
                  </Text>

                  {/* Empathetic Audio Readout Button */}
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
                      name={isSpeaking ? 'stop-circle-outline' : 'volume-high-outline'}
                      size={22}
                      color={
                        isSpeaking
                          ? theme.colors.white
                          : theme.colors.accentPrimary
                      }
                    />
                    <Text
                      style={{
                        fontSize: theme.font.body,
                        fontWeight: '700',
                        color: isSpeaking
                          ? theme.colors.white
                          : theme.colors.accentPrimary,
                      }}
                    >
                      {isSpeaking ? 'Stop Audio Readout' : 'Listen Gently Aloud'}
                    </Text>
                  </Pressable>

                  {/* Step-by-step gentle actions */}
                  <View
                    style={[
                      styles.stepsContainer,
                      {
                        backgroundColor: theme.colors.backgroundPrimary,
                        borderColor: theme.colors.border,
                      },
                    ]}
                  >
                    {recoveryAdvice.stepByStepAction.map((step, idx) => (
                      <View key={idx} style={styles.stepRow}>
                        <View
                          style={[
                            styles.stepNumber,
                            { backgroundColor: theme.colors.accentPrimary },
                          ]}
                        >
                          <Text
                            style={{
                              color: theme.colors.white,
                              fontWeight: '700',
                              fontSize: 12,
                            }}
                          >
                            {idx + 1}
                          </Text>
                        </View>
                        <Text
                          style={{
                            flex: 1,
                            fontSize: theme.font.body,
                            lineHeight: theme.lineHeight.body,
                            color: theme.colors.textPrimary,
                          }}
                        >
                          {step}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Double-Dose Guard Box */}
                  <View
                    style={[
                      styles.warningBox,
                      {
                        backgroundColor: theme.colors.cautionSoft,
                        borderColor: theme.colors.cautionBorder,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: theme.font.sm,
                        fontWeight: '700',
                        color: theme.colors.caution,
                        marginBottom: 4,
                      }}
                    >
                      Single-Dose Protection Rule
                    </Text>
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

                  <Text
                    style={{
                      fontSize: theme.font.xs,
                      color: theme.colors.textSecondary,
                      lineHeight: 18,
                    }}
                  >
                    {recoveryAdvice.whenToCallDoctorOrPharmacist}
                  </Text>
                </View>
              )}

              <Pressable
                onPress={() => {
                  stopCalmAudio();
                  setIsSpeaking(false);
                  setRecoveryModalOpen(false);
                }}
                style={[
                  styles.modalCloseBtn,
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
                  Got It — Return to Harbor
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
    borderWidth: 1.5,
    marginBottom: 16,
    shadowColor: '#132238',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  titleCol: {
    flex: 1,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 8,
  },
  pillPreviewBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  infoBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  foodRuleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionsCol: {
    marginTop: 16,
    gap: 10,
  },
  primaryTakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 16,
    paddingHorizontal: 18,
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 10,
  },
  takenContainer: {
    marginTop: 14,
    gap: 10,
  },
  takenHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  anchorLockedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  undoBtn: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
  },
  anchorDrawer: {
    marginTop: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  anchorChoice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 26,
    padding: 22,
    borderWidth: 1,
  },
  largePillStage: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  modalCloseBtn: {
    marginTop: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  recoveryBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  audioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  stepsContainer: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  warningBox: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
});
