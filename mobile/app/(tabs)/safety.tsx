import { Ionicons } from '@expo/vector-icons';
import {
  QuickCheckResult,
  RegimenAuditResult,
  SafetySeverity,
} from '@shared/types';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { auditRegimenApi, quickCheckApi } from '../../src/services/api';
import { playCalmReadout, stopCalmAudio } from '../../src/services/audioService';
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

const QUICK_CHIPS = ['Advil', 'Coffee', 'Grapefruit', 'Cold Medicine'];

export default function AskSafetyScreen() {
  const theme = useHarborTheme();
  const activeProfile = useActiveProfile();
  const allLogs = useHarborStore((s) => s.doseLogs);

  const [queryText, setQueryText] = useState('');
  const [checkingQuick, setCheckingQuick] = useState(false);
  const [quickResult, setQuickResult] = useState<QuickCheckResult | null>(null);
  const [speakingQuick, setSpeakingQuick] = useState(false);

  const [auditOpen, setAuditOpen] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditResult, setAuditResult] = useState<RegimenAuditResult | null>(
    null
  );

  const todayLogs = useMemo(
    () =>
      allLogs.filter(
        (l) => l.profileId === activeProfile.id && isSameLocalDay(l.takenAtISO)
      ),
    [allLogs, activeProfile.id]
  );

  const handleRunQuickCheck = async (itemText: string) => {
    const trimmed = itemText.trim();
    if (!trimmed) return;
    triggerSoftImpactHaptic();
    setQueryText(trimmed);
    setCheckingQuick(true);
    setSpeakingQuick(false);
    await stopCalmAudio();

    try {
      const res = await quickCheckApi({
        queryItem: trimmed,
        patient: activeProfile,
        todayLogs,
      });
      setQuickResult(res);
      if (res.severity === 'critical') {
        triggerWarningHaptic();
      } else {
        triggerSuccessHaptic();
      }
    } finally {
      setCheckingQuick(false);
    }
  };

  const handleToggleFullAudit = async () => {
    triggerSoftImpactHaptic();
    if (auditOpen) {
      setAuditOpen(false);
      return;
    }
    setAuditOpen(true);
    setAuditLoading(true);
    try {
      const res = await auditRegimenApi(activeProfile);
      setAuditResult(res);
    } finally {
      setAuditLoading(false);
    }
  };

  const severityPalette = (sev: SafetySeverity) => {
    if (sev === 'critical') {
      return {
        fg: theme.colors.critical,
        bg: theme.colors.criticalSoft,
        border: theme.colors.criticalBorder,
        icon: 'alert-circle' as const,
      };
    }
    if (sev === 'caution') {
      return {
        fg: theme.colors.caution,
        bg: theme.colors.cautionSoft,
        border: theme.colors.cautionBorder,
        icon: 'time' as const,
      };
    }
    return {
      fg: theme.colors.safe,
      bg: theme.colors.safeSoft,
      border: theme.colors.safeBorder,
      icon: 'checkmark-circle' as const,
    };
  };

  const handleSpeakQuick = async () => {
    if (!quickResult) return;
    if (speakingQuick) {
      await stopCalmAudio();
      setSpeakingQuick(false);
      return;
    }
    setSpeakingQuick(true);
    const script = `${quickResult.verdictBadge}. ${quickResult.calmAnswer} ${quickResult.safeAlternativeOrTiming}`;
    await playCalmReadout(script, () => setSpeakingQuick(false));
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
          }}
        >
          Is it safe with my meds?
        </Text>
        <Text
          style={{
            fontSize: theme.font.body,
            lineHeight: theme.lineHeight.body,
            color: theme.colors.textSecondary,
            marginTop: 6,
            marginBottom: 18,
          }}
        >
          Ask about any painkiller, drink, vitamin, or cold medicine before
          taking it.
        </Text>

        {/* Primary Search Card */}
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
          <View style={styles.searchRow}>
            <TextInput
              value={queryText}
              onChangeText={setQueryText}
              onSubmitEditing={() => handleRunQuickCheck(queryText)}
              placeholder="Type e.g. Advil, Tylenol, melatonin..."
              placeholderTextColor={theme.colors.textMuted}
              style={[
                styles.searchInput,
                {
                  minHeight: theme.minTouchTarget,
                  fontSize: theme.font.body,
                  color: theme.colors.textPrimary,
                  backgroundColor: theme.colors.backgroundPrimary,
                  borderColor: theme.colors.border,
                },
              ]}
            />
            <Pressable
              onPress={() => handleRunQuickCheck(queryText)}
              style={[
                styles.checkBtn,
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
                Ask
              </Text>
            </Pressable>
          </View>

          {/* 4 Simple Tap Suggestions */}
          <View style={styles.chipRow}>
            {QUICK_CHIPS.map((chip) => {
              const active = queryText.toLowerCase() === chip.toLowerCase();
              return (
                <Pressable
                  key={chip}
                  onPress={() => handleRunQuickCheck(chip)}
                  style={[
                    styles.quickChip,
                    {
                      minHeight: theme.brainFogMode ? 64 : 38,
                      backgroundColor: active
                        ? theme.colors.accentPrimary
                        : theme.colors.backgroundPrimary,
                      borderColor: active
                        ? theme.colors.accentPrimary
                        : theme.colors.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: theme.font.sm,
                      fontWeight: '600',
                      color: active
                        ? theme.colors.white
                        : theme.colors.textPrimary,
                    }}
                  >
                    {chip}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {checkingQuick && (
            <View style={styles.inlineLoader}>
              <ActivityIndicator color={theme.colors.accentPrimary} />
              <Text
                style={{
                  fontSize: theme.font.sm,
                  color: theme.colors.textSecondary,
                  fontWeight: '600',
                }}
              >
                Checking against your prescriptions...
              </Text>
            </View>
          )}

          {quickResult && !checkingQuick && (
            <View
              style={[
                styles.verdictBox,
                {
                  backgroundColor: severityPalette(quickResult.severity).bg,
                  borderColor: severityPalette(quickResult.severity).border,
                },
              ]}
            >
              <View style={styles.verdictHeader}>
                <Ionicons
                  name={severityPalette(quickResult.severity).icon}
                  size={22}
                  color={severityPalette(quickResult.severity).fg}
                />
                <Text
                  style={{
                    flex: 1,
                    fontSize: theme.font.bodyLg,
                    fontWeight: '800',
                    color: severityPalette(quickResult.severity).fg,
                  }}
                >
                  {quickResult.verdictBadge}
                </Text>
              </View>

              <Text
                style={{
                  fontSize: theme.font.body,
                  lineHeight: theme.lineHeight.body,
                  fontWeight: '700',
                  color: theme.colors.textPrimary,
                  marginTop: 8,
                }}
              >
                {quickResult.calmAnswer}
              </Text>

              {theme.showSecondaryMetadata && (
                <Text
                  style={{
                    fontSize: theme.font.sm,
                    lineHeight: theme.lineHeight.sm,
                    color: theme.colors.textPrimary,
                    marginTop: 6,
                  }}
                >
                  {quickResult.whyItMatters}
                </Text>
              )}

              <Text
                style={{
                  fontSize: theme.font.sm,
                  lineHeight: theme.lineHeight.sm,
                  fontWeight: '600',
                  color: theme.colors.accentPrimary,
                  marginTop: 10,
                }}
              >
                What to do instead: {quickResult.safeAlternativeOrTiming}
              </Text>

              {theme.showSecondaryMetadata &&
                quickResult.labelVerified &&
                Boolean(quickResult.sourceQuote) && (
                  <View
                    style={[
                      styles.fdaCitationBox,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border,
                      },
                    ]}
                  >
                    <View style={styles.fdaCitationHeader}>
                      <Ionicons
                        name="shield-checkmark-outline"
                        size={14}
                        color={theme.colors.accentPrimary}
                      />
                      <Text
                        style={{
                          fontSize: theme.font.xs,
                          fontWeight: '800',
                          color: theme.colors.accentPrimary,
                          textTransform: 'uppercase',
                          letterSpacing: 0.4,
                        }}
                      >
                        FDA Label Verified
                        {quickResult.sourceDrug
                          ? ` · ${quickResult.sourceDrug}`
                          : ''}
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontSize: theme.font.xs,
                        lineHeight: theme.lineHeight.sm,
                        fontStyle: 'italic',
                        color: theme.colors.textSecondary,
                        marginTop: 4,
                      }}
                    >
                      &ldquo;{quickResult.sourceQuote}&rdquo;
                    </Text>
                  </View>
                )}

              <Pressable
                onPress={handleSpeakQuick}
                style={[
                  styles.speakBtn,
                  {
                    minHeight: theme.minTouchTarget,
                    backgroundColor: speakingQuick
                      ? theme.colors.accentPrimary
                      : theme.colors.surface,
                    borderColor: theme.colors.borderStrong,
                  },
                ]}
              >
                <Ionicons
                  name={
                    speakingQuick ? 'stop-circle-outline' : 'volume-high-outline'
                  }
                  size={18}
                  color={
                    speakingQuick
                      ? theme.colors.white
                      : theme.colors.accentPrimary
                  }
                />
                <Text
                  style={{
                    fontSize: theme.font.sm,
                    fontWeight: '700',
                    color: speakingQuick
                      ? theme.colors.white
                      : theme.colors.textPrimary,
                  }}
                >
                  {speakingQuick ? 'Stop Audio' : 'Read Aloud'}
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Progressive Disclosure: Full Schedule Interaction Check */}
        {activeProfile.medications.length > 0 && (
          <View>
            <Pressable
              onPress={handleToggleFullAudit}
              style={[
                styles.auditToggleCard,
                {
                  minHeight: theme.minTouchTarget,
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Ionicons
                name="sparkles-outline"
                size={20}
                color={theme.colors.accentPrimary}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: theme.font.body,
                    fontWeight: '700',
                    color: theme.colors.textPrimary,
                  }}
                >
                  Review all my medications together
                </Text>
                <Text
                  style={{
                    fontSize: theme.font.xs,
                    color: theme.colors.textSecondary,
                    marginTop: 2,
                  }}
                >
                  Checks spacing rules across your {activeProfile.medications.length}{' '}
                  prescriptions
                </Text>
              </View>
              <Ionicons
                name={auditOpen ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={theme.colors.textSecondary}
              />
            </Pressable>

            {auditOpen && (
              <View style={{ marginTop: 12, gap: 10 }}>
                {auditLoading || !auditResult ? (
                  <View
                    style={[
                      styles.auditLoader,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border,
                      },
                    ]}
                  >
                    <ActivityIndicator color={theme.colors.accentPrimary} />
                    <Text
                      style={{
                        fontSize: theme.font.sm,
                        color: theme.colors.textSecondary,
                        marginTop: 8,
                      }}
                    >
                      Checking daily schedule harmony...
                    </Text>
                  </View>
                ) : (
                  auditResult.findings.map((finding) => {
                    const pal = severityPalette(finding.severity);
                    return (
                      <View
                        key={finding.id}
                        style={[
                          styles.findingCard,
                          {
                            backgroundColor: pal.bg,
                            borderColor: pal.border,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            fontSize: theme.font.body,
                            fontWeight: '800',
                            color: pal.fg,
                          }}
                        >
                          {finding.title}
                        </Text>
                        <Text
                          style={{
                            fontSize: theme.font.sm,
                            lineHeight: theme.lineHeight.sm,
                            color: theme.colors.textPrimary,
                            marginTop: 4,
                          }}
                        >
                          {finding.actionableStep}
                        </Text>
                      </View>
                    );
                  })
                )}
              </View>
            )}
          </View>
        )}
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
  searchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  checkBtn: {
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  quickChip: {
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
  },
  verdictBox: {
    marginTop: 16,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
  },
  verdictHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fdaCitationBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  fdaCitationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  speakBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  auditToggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  auditLoader: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
  },
  findingCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
  },
});
