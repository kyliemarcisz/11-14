import { Ionicons } from '@expo/vector-icons';
import { TimeWindow } from '@shared/types';
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

export default function HarborTodayScreen() {
  const theme = useHarborTheme();
  const activeProfile = useActiveProfile();
  const allLogs = useHarborStore((s) => s.doseLogs);

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

  const selectedWindowMeta =
    TIME_WINDOWS.find((w) => w.key === selectedWindow) || TIME_WINDOWS[0];

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
      {/* Calm Hero Summary Card */}
      <View
        style={[
          styles.heroCard,
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
            fontSize: theme.font.hero,
            lineHeight: theme.lineHeight.hero,
            fontWeight: '800',
            color: theme.colors.textPrimary,
            letterSpacing: -0.5,
          }}
        >
          One calm window at a time, {activeProfile.name.split(' ')[0]}.
        </Text>

        {theme.showSecondaryMetadata && (
          <Text
            style={{
              fontSize: theme.font.body,
              lineHeight: theme.lineHeight.body,
              color: theme.colors.textSecondary,
              marginTop: 6,
            }}
          >
            Every logged dose locks a physical memory anchor so you never have
            to second-guess whether you already took a pill.
          </Text>
        )}

        {/* Serene Progress Bar */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text
              style={{
                fontSize: theme.font.sm,
                fontWeight: '700',
                color: theme.colors.accentPrimary,
              }}
            >
              {todayLogs.length} of {totalScheduledToday} daily doses anchored
            </Text>
            {todayLogs.length === totalScheduledToday &&
              totalScheduledToday > 0 && (
                <Text
                  style={{
                    fontSize: theme.font.xs,
                    fontWeight: '700',
                    color: theme.colors.safe,
                  }}
                >
                  All complete today
                </Text>
              )}
          </View>
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
      </View>

      {/* Time Window Selector */}
      <View style={styles.windowSection}>
        <Text
          style={{
            fontSize: theme.font.sm,
            fontWeight: '700',
            color: theme.colors.textSecondary,
            marginBottom: 10,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          Choose Time Window
        </Text>

        <View style={styles.windowGrid}>
          {TIME_WINDOWS.map((win) => {
            const medsForWin = activeProfile.medications.filter((m) =>
              m.timeWindows.includes(win.key)
            );
            const takenForWin = medsForWin.filter((m) =>
              todayLogs.some(
                (l) => l.medicationId === m.id && l.timeWindow === win.key
              )
            );
            const isSelected = selectedWindow === win.key;
            const allDone =
              medsForWin.length > 0 && takenForWin.length === medsForWin.length;

            return (
              <Pressable
                key={win.key}
                onPress={() => {
                  triggerSoftImpactHaptic();
                  setSelectedWindow(win.key);
                }}
                style={[
                  styles.windowTab,
                  {
                    minHeight: theme.minTouchTarget,
                    backgroundColor: isSelected
                      ? theme.colors.accentPrimary
                      : theme.colors.surface,
                    borderColor: isSelected
                      ? theme.colors.accentPrimary
                      : allDone
                        ? theme.colors.safeBorder
                        : theme.colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: theme.font.sm,
                    fontWeight: '700',
                    color: isSelected
                      ? theme.colors.white
                      : theme.colors.textPrimary,
                  }}
                >
                  {win.label}
                </Text>
                <Text
                  style={{
                    fontSize: theme.font.xs,
                    fontWeight: '600',
                    color: isSelected
                      ? 'rgba(255,255,255,0.88)'
                      : allDone
                        ? theme.colors.safe
                        : theme.colors.textSecondary,
                    marginTop: 2,
                  }}
                >
                  {medsForWin.length === 0
                    ? 'Rest'
                    : allDone
                      ? `✓ ${medsForWin.length} done`
                      : `${takenForWin.length}/${medsForWin.length} ready`}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Active Window Heading */}
      <View style={styles.activeWindowHeader}>
        <Text
          style={{
            fontSize: theme.font.subtitle,
            fontWeight: '800',
            color: theme.colors.textPrimary,
          }}
        >
          {selectedWindowMeta.label} Window
        </Text>
        {theme.showSecondaryMetadata && (
          <Text
            style={{
              fontSize: theme.font.sm,
              color: theme.colors.textSecondary,
              marginTop: 2,
            }}
          >
            {selectedWindowMeta.timeRange} • {selectedWindowMeta.gentleCue}
          </Text>
        )}
      </View>

      {/* Medication Cards */}
      {windowMeds.length === 0 ? (
        <View
          style={[
            styles.emptyWindowCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Ionicons
            name="cafe-outline"
            size={32}
            color={theme.colors.accentPrimary}
          />
          <Text
            style={{
              fontSize: theme.font.bodyLg,
              fontWeight: '700',
              color: theme.colors.textPrimary,
              marginTop: 10,
              textAlign: 'center',
            }}
          >
            Nothing scheduled in the {selectedWindow} window
          </Text>
          <Text
            style={{
              fontSize: theme.font.sm,
              color: theme.colors.textSecondary,
              marginTop: 4,
              textAlign: 'center',
            }}
          >
            Enjoy a calm pause—your other time windows are ready above whenever
            needed.
          </Text>
        </View>
      ) : (
        windowMeds.map((med, idx) => {
          const logForWindow = todayLogs.find(
            (l) => l.medicationId === med.id && l.timeWindow === selectedWindow
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

      {/* Environmental Care Cue Card (hidden in Brain-Fog Large Mode) */}
      {theme.showSecondaryMetadata && activeProfile.caregiverNotes.length > 0 && (
        <View
          style={[
            styles.stationCueCard,
            {
              backgroundColor: theme.colors.accentSoft,
              borderColor: theme.colors.accentBorder,
            },
          ]}
        >
          <View style={styles.stationCueHeader}>
            <Ionicons
              name="compass-outline"
              size={20}
              color={theme.colors.accentPrimary}
            />
            <Text
              style={{
                fontSize: theme.font.sm,
                fontWeight: '700',
                color: theme.colors.accentPrimary,
              }}
            >
              Home Station Memory Cue
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
            {activeProfile.caregiverNotes[0]}
          </Text>
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
    paddingBottom: 42,
  },
  heroCard: {
    borderWidth: 1,
    marginBottom: 20,
  },
  progressSection: {
    marginTop: 16,
    gap: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  windowSection: {
    marginBottom: 18,
  },
  windowGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  windowTab: {
    flexGrow: 1,
    flexBasis: '22%',
    minWidth: 78,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeWindowHeader: {
    marginBottom: 14,
  },
  emptyWindowCard: {
    padding: 28,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  stationCueCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 6,
  },
  stationCueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
