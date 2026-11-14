import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DoseLog,
  Medication,
  PatientProfile,
  TimeWindow,
} from '@shared/types';
import { useMemo } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  createInitialDemoLogs,
  DEMO_PROFILES,
} from '../data/demoProfiles';
import { buildHarborTheme, HarborTheme } from '../theme/theme';

interface HarborState {
  profiles: PatientProfile[];
  activeProfileId: string;
  doseLogs: DoseLog[];
  brainFogMode: boolean;

  // Actions
  setActiveProfile: (profileId: string) => void;
  toggleBrainFogMode: () => void;
  logDose: (params: {
    medicationId: string;
    profileId: string;
    timeWindow: TimeWindow;
    memoryAnchorCue?: string;
  }) => DoseLog;
  updateDoseAnchor: (logId: string, memoryAnchorCue: string) => void;
  undoDoseLog: (logId: string) => void;
  addMedicationToProfile: (
    profileId: string,
    medication: Omit<Medication, 'id'>
  ) => Medication;
  refillMedication: (
    profileId: string,
    medicationId: string,
    addedCount?: number
  ) => void;
  addCaregiverNote: (profileId: string, note: string) => void;
  removeCaregiverNote: (profileId: string, noteIndex: number) => void;
  addPatientProfile: (params: {
    name: string;
    relation: string;
    age: number;
    conditions: string[];
  }) => PatientProfile;
  resetDemoState: () => void;
}

export function isSameLocalDay(isoA: string, dateB: Date = new Date()): boolean {
  const a = new Date(isoA);
  return (
    a.getFullYear() === dateB.getFullYear() &&
    a.getMonth() === dateB.getMonth() &&
    a.getDate() === dateB.getDate()
  );
}

export function getSuggestedTimeWindow(now: Date = new Date()): TimeWindow {
  const hr = now.getHours();
  if (hr < 11) return 'Morning';
  if (hr < 16) return 'Midday';
  if (hr < 21) return 'Evening';
  return 'Bedtime';
}

export const useHarborStore = create<HarborState>()(
  persist(
    (set, get) => ({
      profiles: DEMO_PROFILES,
      activeProfileId: DEMO_PROFILES[0].id,
      doseLogs: createInitialDemoLogs(),
      brainFogMode: false,

      setActiveProfile: (profileId) => {
        set({ activeProfileId: profileId });
      },

      toggleBrainFogMode: () => {
        set((state) => ({ brainFogMode: !state.brainFogMode }));
      },

      logDose: ({ medicationId, profileId, timeWindow, memoryAnchorCue }) => {
        // Prevent accidental duplicate log in the same day + timeWindow
        const existing = get().doseLogs.find(
          (l) =>
            l.profileId === profileId &&
            l.medicationId === medicationId &&
            l.timeWindow === timeWindow &&
            isSameLocalDay(l.takenAtISO)
        );
        if (existing) {
          if (memoryAnchorCue && memoryAnchorCue !== existing.memoryAnchorCue) {
            get().updateDoseAnchor(existing.id, memoryAnchorCue);
          }
          return existing;
        }

        const newLog: DoseLog = {
          id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          medicationId,
          profileId,
          timeWindow,
          takenAtISO: new Date().toISOString(),
          memoryAnchorCue,
        };

        set((state) => ({
          doseLogs: [newLog, ...state.doseLogs],
          profiles: state.profiles.map((p) =>
            p.id === profileId
              ? {
                  ...p,
                  medications: p.medications.map((m) =>
                    m.id === medicationId
                      ? {
                          ...m,
                          supplyRemaining: Math.max(0, m.supplyRemaining - 1),
                        }
                      : m
                  ),
                }
              : p
          ),
        }));

        return newLog;
      },

      updateDoseAnchor: (logId, memoryAnchorCue) => {
        set((state) => ({
          doseLogs: state.doseLogs.map((l) =>
            l.id === logId ? { ...l, memoryAnchorCue } : l
          ),
        }));
      },

      undoDoseLog: (logId) => {
        const target = get().doseLogs.find((l) => l.id === logId);
        if (!target) return;

        set((state) => ({
          doseLogs: state.doseLogs.filter((l) => l.id !== logId),
          profiles: state.profiles.map((p) =>
            p.id === target.profileId
              ? {
                  ...p,
                  medications: p.medications.map((m) =>
                    m.id === target.medicationId
                      ? { ...m, supplyRemaining: m.supplyRemaining + 1 }
                      : m
                  ),
                }
              : p
          ),
        }));
      },

      addMedicationToProfile: (profileId, medicationInput) => {
        const created: Medication = {
          ...medicationInput,
          id: `med-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        };

        set((state) => ({
          profiles: state.profiles.map((p) =>
            p.id === profileId
              ? { ...p, medications: [...p.medications, created] }
              : p
          ),
        }));

        return created;
      },

      refillMedication: (profileId, medicationId, addedCount = 30) => {
        set((state) => ({
          profiles: state.profiles.map((p) =>
            p.id === profileId
              ? {
                  ...p,
                  medications: p.medications.map((m) =>
                    m.id === medicationId
                      ? { ...m, supplyRemaining: m.supplyRemaining + addedCount }
                      : m
                  ),
                }
              : p
          ),
        }));
      },

      addCaregiverNote: (profileId, note) => {
        const trimmed = note.trim();
        if (!trimmed) return;
        set((state) => ({
          profiles: state.profiles.map((p) =>
            p.id === profileId
              ? { ...p, caregiverNotes: [trimmed, ...p.caregiverNotes] }
              : p
          ),
        }));
      },

      removeCaregiverNote: (profileId, noteIndex) => {
        set((state) => ({
          profiles: state.profiles.map((p) =>
            p.id === profileId
              ? {
                  ...p,
                  caregiverNotes: p.caregiverNotes.filter(
                    (_, idx) => idx !== noteIndex
                  ),
                }
              : p
          ),
        }));
      },

      addPatientProfile: ({ name, relation, age, conditions }) => {
        const created: PatientProfile = {
          id: `profile-${Date.now()}`,
          name: name.trim(),
          relation: relation.trim() || 'Care Circle Member',
          age: Number(age) || 65,
          conditions: conditions.length > 0 ? conditions : ['Medication Support'],
          medications: [],
          caregiverNotes: [
            'Keep daily medications in one calm, visible home station.',
          ],
        };

        set((state) => ({
          profiles: [...state.profiles, created],
          activeProfileId: created.id,
        }));

        return created;
      },

      resetDemoState: () => {
        set({
          profiles: DEMO_PROFILES,
          activeProfileId: DEMO_PROFILES[0].id,
          doseLogs: createInitialDemoLogs(),
          brainFogMode: false,
        });
      },
    }),
    {
      name: 'harbordose-storage-v1',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export function useActiveProfile(): PatientProfile {
  const profiles = useHarborStore((s) => s.profiles);
  const activeProfileId = useHarborStore((s) => s.activeProfileId);
  return useMemo(
    () => profiles.find((p) => p.id === activeProfileId) || profiles[0],
    [profiles, activeProfileId]
  );
}

export function useHarborTheme(): HarborTheme {
  const brainFogMode = useHarborStore((s) => s.brainFogMode);
  return useMemo(() => buildHarborTheme(brainFogMode), [brainFogMode]);
}
