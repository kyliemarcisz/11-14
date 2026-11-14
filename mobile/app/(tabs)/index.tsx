import { Ionicons } from '@expo/vector-icons';
import { TimeWindow } from '@shared/types';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { DoseCard } from '../../src/components/DoseCard';
import { TIME_WINDOWS } from '../../src/data/demoProfiles';
import { triggerSoftImpactHaptic } from '../../src/services/haptics';
import {
  getSuggestedTimeWindow,
  isSameLocalDay,
  useActiveProfile,
  useHarborStore,
  useHarborTheme,
} from '../../src/store/useHarborStore';

export default function TodayScreen() {
  const router = useRouter();
  const theme = useHarborTheme();
  const activeProfile = useActiveProfile();
  const allLogs = useHarborStore((s) => s.doseLogs);
  const loadSampleProfiles = useHarborStore((s) => s.loadSampleProfiles);

  const [selectedWindow, setSelectedWindow] = useState<TimeWindow>(() => {
    const suggested = getSuggestedTimeWindow();
    const hasSuggested = activeProfile.medications.some((m) =>
      m.timeWindows.includes(suggested)
    );
    return hasSuggested ? suggested : 'Morning';
  });

  const todayLogs = useMemo(
    () =>
      allLogs.filter(
        (l) => l.profileId === activeProfile.id && isSameLocalDay(l.takenAtISO)
      ),
    [allLogs, activeProfile.id]
  );

  const totalScheduledToday = useMemo(
    () =>
      activeProfile.medications.reduce(
        (acc, med) => acc + med.timeWindows.length,
        0
      ),
    [activeProfile.medications]
  );

  const windowMeds = useMemo(
    () =>
      activeProfile.medications.filter((m) =>
        m.timeWindows.includes(selectedWindow)
      ),
    [activeProfile.medications, selectedWindow]
  );

  const progressRatio =
    totalScheduledToday > 0
      ? Math.min(1, todayLogs.length / totalScheduledToday)
      : 0;

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
        {/* Clean Minimal Title + Calm Progress */}
        <View style={styles.topHeader}>
          <Text
            style={{
              fontSize: theme.font.hero,
              lineHeight: theme.lineHeight.hero,
              fontWeight: '800',
              color: theme.colors.textPrimary,
              letterSpacing: -0.5,
            }}
          >
            {selectedWindow} Pills
          </Text>

          {totalScheduledToday > 0 && (
            <View style={styles.progressWrap}>
              <Text
                style={{
                  fontSize: theme.font.sm,
                  fontWeight: '600',
                  color: theme.colors.textSecondary,
                }}
              >
                {todayLogs.length} of {totalScheduledToday} taken today
              </Text>
              <View
                style={[
                  styles.progressTrack,
                  { backgroundColor: theme.colors.backgroundSecondary },
                ]}
              >
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.round(progressRatio * 100)}%`,
                      backgroundColor:
                        progressRatio >= 1
                          ? theme.colors.safe
                          : theme.colors.accentPrimary,
                    },
                  ]}
                />
              </View>
            </View>
          )}
        </View>

        {/* Empty Fresh Profile State */}
        {activeProfile.medications.length === 0 ? (
          <View
            style={[
              styles.emptyScheduleCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.emptyIconCircle,
                { backgroundColor: theme.colors.accentSoft },
              ]}
            >
              <Ionicons
                name="camera-outline"
                size={28}
                color={theme.colors.accentPrimary}
              />
            </View>
            <Text
              style={{
                fontSize: theme.font.title,
                fontWeight: '800',
                color: theme.colors.textPrimary,
                marginTop: 14,
                textAlign: 'center',
              }}
            >
              Your schedule is ready
            </Text>
            <Text
              style={{
                fontSize: theme.font.body,
                lineHeight: theme.lineHeight.body,
                color: theme.colors.textSecondary,
                marginTop: 6,
                textAlign: 'center',
              }}
            >
              Snap a photo of your first pill bottle and we’ll set up its
              time of day and visual match automatically.
            </Text>

            <Pressable
              onPress={() => router.push('/(tabs)/scan')}
              style={[
                styles.emptyPrimaryBtn,
                {
                  minHeight: Math.max(theme.minTouchTarget, 56),
                  backgroundColor: theme.colors.accentPrimary,
                },
              ]}
            >
              <Ionicons name="add" size={22} color={theme.colors.white} />
              <Text
                style={{
                  fontSize: theme.font.bodyLg,
                  fontWeight: '700',
                  color: theme.colors.white,
                }}
              >
                Add First Medication
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                triggerSoftImpactHaptic();
                loadSampleProfiles();
              }}
              style={{ marginTop: 14, paddingVertical: 8 }}
            >
              <Text
                style={{
                  fontSize: theme.font.sm,
                  fontWeight: '600',
                  color: theme.colors.accentPrimary,
                }}
              >
                Or load sample prescriptions to explore
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Clean Segmented Time Selector */}
            <View
              style={[
                styles.segmentedBar,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              {TIME_WINDOWS.map((win) => {
                const medsForWin = activeProfile.medications.filter((m) =>
                  m.timeWindows.includes(win.key)
                );
                const allDone =
                  medsForWin.length > 0 &&
                  medsForWin.every((m) =>
                    todayLogs.some(
                      (l) => l.medicationId === m.id && l.timeWindow === win.key
                    )
                  );
                const selected = selectedWindow === win.key;

                return (
                  <Pressable
                    key={win.key}
                    onPress={() => {
                      triggerSoftImpactHaptic();
                      setSelectedWindow(win.key);
                    }}
                    style={[
                      styles.segmentBtn,
                      {
                        minHeight: theme.brainFogMode ? 64 : 42,
                        backgroundColor: selected
                          ? theme.colors.accentPrimary
                          : 'transparent',
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: theme.font.sm,
                        fontWeight: '700',
                        color: selected
                          ? theme.colors.white
                          : medsForWin.length === 0
                            ? theme.colors.textMuted
                            : theme.colors.textPrimary,
                      }}
                    >
                      {win.label}
                      {allDone ? ' ✓' : ''}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Medication Cards */}
            {windowMeds.length === 0 ? (
              <View
                style={[
                  styles.restCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="cafe-outline"
                  size={28}
                  color={theme.colors.accentPrimary}
                />
                <Text
                  style={{
                    fontSize: theme.font.bodyLg,
                    fontWeight: '700',
                    color: theme.colors.textPrimary,
                    marginTop: 8,
                  }}
                >
                  No pills in the {selectedWindow}
                </Text>
                <Text
                  style={{
                    fontSize: theme.font.sm,
                    color: theme.colors.textSecondary,
                    marginTop: 2,
                  }}
                >
                  Tap another time of day above whenever you need it.
                </Text>
              </View>
            ) : (
              windowMeds.map((med, idx) => {
                const logForWindow = todayLogs.find(
                  (l) =>
                    l.medicationId === med.id && l.timeWindow === selectedWindow
                );
                return (
                  <DoseCard
                    key={med.id}
                    medication={med}
                    patient={activeProfile}
                    timeWindow={selectedWindow}
                    existingLog={logForWindow}
                    todayLogs={todayLogs}
                    index={idx}
                  />
                );
              })
            )}
          </>
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
  topHeader: {
    marginBottom: 16,
  },
  progressWrap: {
    marginTop: 8,
    gap: 6,
  },
  progressTrack: {
    height: 7,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  segmentedBar: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 18,
  },
  segmentBtn: {
    flex: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  restCard: {
    padding: 28,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyScheduleCard: {
    padding: 28,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPrimaryBtn: {
    marginTop: 20,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
  },
});
