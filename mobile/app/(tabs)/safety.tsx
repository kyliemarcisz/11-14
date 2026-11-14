import { Ionicons } from '@expo/vector-icons';
import {
  QuickCheckResult,
  RegimenAuditResult,
  SafetySeverity,
} from '@shared/types';
import React, { useEffect, useMemo, useState } from 'react';
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

const QUICK_CHECK_CHIPS = [
  'Advil / Ibuprofen',
  'Grapefruit Juice',
  'Morning Coffee',
  'Calcium / Tums',
  'Sudafed Cold Med',
  'Plain Tylenol',
];

export default function SafetyLabScreen() {
  const theme = useHarborTheme();
  const activeProfile = useActiveProfile();
  const allLogs = useHarborStore((s) => s.doseLogs);

  const [queryText, setQueryText] = useState('');
  const [checkingQuick, setCheckingQuick] = useState(false);
  const [quickResult, setQuickResult] = useState<QuickCheckResult | null>(null);
  const [speakingQuick, setSpeakingQuick] = useState(false);

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

  useEffect(() => {
    let cancelled = false;
    setQuickResult(null);
    setAuditLoading(true);
    auditRegimenApi(activeProfile)
      .then((res) => {
        if (!cancelled) setAuditResult(res);
      })
      .finally(() => {
        if (!cancelled) setAuditLoading(false);
      });
    return () => {
      cancelled = true;
      stopCalmAudio();
    };
  }, [activeProfile]);

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
    const script = `${quickResult.verdictBadge}. ${quickResult.calmAnswer} ${quickResult.whyItMatters} ${quickResult.safeAlternativeOrTiming}`;
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
      {/* Section 1: "Can I Take This Right Now?" Checker */}
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
            fontSize: theme.font.title,
            fontWeight: '800',
            color: theme.colors.textPrimary,
          }}
        >
          “Can I have this right now?”
        </Text>
        <Text
          style={{
            fontSize: theme.font.sm,
            lineHeight: theme.lineHeight.sm,
            color: theme.colors.textSecondary,
            marginTop: 4,
          }}
        >
          Check any pain reliever, cold medicine, drink, or supplement against{' '}
          {activeProfile.name.split(' ')[0]}’s prescriptions.
        </Text>

        {/* One-Tap Quick Chips */}
        <View style={styles.chipGrid}>
          {QUICK_CHECK_CHIPS.map((chip) => {
            const active = queryText.toLowerCase() === chip.toLowerCase();
            return (
              <Pressable
                key={chip}
                onPress={() => handleRunQuickCheck(chip)}
                style={[
                  styles.quickChip,
                  {
                    minHeight: theme.brainFogMode ? 64 : 42,
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
                    fontWeight: '700',
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

        {/* Free-text input */}
        <View style={styles.searchRow}>
          <TextInput
            value={queryText}
            onChangeText={setQueryText}
            onSubmitEditing={() => handleRunQuickCheck(queryText)}
            placeholder="Ask about any food, vitamin, or OTC pill..."
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
              Check
            </Text>
          </Pressable>
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
              Gemini is checking interactions...
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
                size={24}
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

            <View
              style={[
                styles.safeAltBox,
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
                  color: theme.colors.accentPrimary,
                }}
              >
                Calm Next Step
              </Text>
              <Text
                style={{
                  fontSize: theme.font.sm,
                  lineHeight: theme.lineHeight.sm,
                  color: theme.colors.textPrimary,
                  marginTop: 2,
                }}
              >
                {quickResult.safeAlternativeOrTiming}
              </Text>
            </View>

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
                size={20}
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
                {speakingQuick ? 'Stop Audio' : 'Read Answer Aloud'}
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Section 2: Full Regimen Harmony & Interaction Audit */}
      <View style={styles.auditSectionHeader}>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: theme.font.subtitle,
              fontWeight: '800',
              color: theme.colors.textPrimary,
            }}
          >
            Daily Regimen Harmony Audit
          </Text>
          {theme.showSecondaryMetadata && (
            <Text
              style={{
                fontSize: theme.font.xs,
                color: theme.colors.textSecondary,
                marginTop: 2,
              }}
            >
              Powered by Gemini pharmacological reasoning for{' '}
              {activeProfile.name}
            </Text>
          )}
        </View>
        <Pressable
          onPress={() => {
            triggerSoftImpactHaptic();
            setAuditLoading(true);
            auditRegimenApi(activeProfile)
              .then(setAuditResult)
              .finally(() => setAuditLoading(false));
          }}
          style={[
            styles.refreshBtn,
            {
              minHeight: theme.minTouchTarget,
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Ionicons
            name="refresh"
            size={18}
            color={theme.colors.accentPrimary}
          />
        </Pressable>
      </View>

      {auditLoading || !auditResult ? (
        <View
          style={[
            styles.auditLoadingCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <ActivityIndicator size="large" color={theme.colors.accentPrimary} />
          <Text
            style={{
              marginTop: 12,
              fontSize: theme.font.sm,
              color: theme.colors.textSecondary,
            }}
          >
            Reviewing prescription spacing & interactions...
          </Text>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          <View
            style={[
              styles.summaryBanner,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text
              style={{
                fontSize: theme.font.bodyLg,
                fontWeight: '800',
                color: theme.colors.textPrimary,
              }}
            >
              {auditResult.calmHeadline}
            </Text>
            {theme.showSecondaryMetadata && (
              <Text
                style={{
                  fontSize: theme.font.sm,
                  lineHeight: theme.lineHeight.sm,
                  color: theme.colors.textSecondary,
                  marginTop: 6,
                }}
              >
                {auditResult.reassuranceSummary}
              </Text>
            )}
          </View>

          {auditResult.findings.map((finding) => {
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
                <View style={styles.findingTopRow}>
                  <Ionicons name={pal.icon} size={22} color={pal.fg} />
                  <Text
                    style={{
                      flex: 1,
                      fontSize: theme.font.body,
                      fontWeight: '800',
                      color: pal.fg,
                    }}
                  >
                    {finding.title}
                  </Text>
                </View>

                <Text
                  style={{
                    fontSize: theme.font.sm,
                    lineHeight: theme.lineHeight.sm,
                    color: theme.colors.textPrimary,
                    marginTop: 6,
                  }}
                >
                  {finding.plainExplanation}
                </Text>

                <Text
                  style={{
                    fontSize: theme.font.sm,
                    fontWeight: '700',
                    color: theme.colors.textPrimary,
                    marginTop: 8,
                  }}
                >
                  What to do: {finding.actionableStep}
                </Text>

                {finding.timingRecommendation && (
                  <Text
                    style={{
                      fontSize: theme.font.xs,
                      fontWeight: '600',
                      color: theme.colors.textSecondary,
                      marginTop: 4,
                    }}
                  >
                    Timing cue: {finding.timingRecommendation}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: 18,
    paddingBottom: 44,
  },
  card: {
    borderWidth: 1,
    marginBottom: 22,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  quickChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  searchInput: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  checkBtn: {
    paddingHorizontal: 18,
    borderRadius: 14,
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
  safeAltBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
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
  auditSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
  },
  refreshBtn: {
    width: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  auditLoadingCard: {
    padding: 28,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryBanner: {
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
  },
  findingCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
  },
  findingTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
