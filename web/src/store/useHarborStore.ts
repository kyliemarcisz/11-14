import {
  DoseLog,
  Medication,
  PatientProfile,
  TimeWindow,
} from '@shared/types';
import { useMemo } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  createInitialDemoLogs,
  DEMO_PROFILES,
  MEMORY_ANCHOR_PRESETS,
} from '../data/demoProfiles';

export const HARBOR_STORAGE_KEY = 'harbordose-web-v1';

export type HarborTab = 'today' | 'scan' | 'safety' | 'care';

export interface CompleteOnboardingParams {
  userName: string;
  userAge: number;
  userRole: string;
  conditions: string[];
  includeStarterMeds: boolean;
  brainFogMode: boolean;
  defaultMemoryCue: string;
}

interface HarborState {
  activeTab: HarborTab;
  hasCompletedOnboarding: boolean;
  currentUserName: string;
  defaultMemoryCue: string;
  profiles: PatientProfile[];
  activeProfileId: string;
  doseLogs: DoseLog[];
  brainFogMode: boolean;

  // Navigation & Onboarding
  setActiveTab: (tab: HarborTab) => void;
  completeOnboarding: (params: CompleteOnboardingParams) => void;
  reopenOnboarding: () => void;
  logoutCurrentPerson: () => void;
  removeProfileById: (profileId: string) => void;

  // Core Actions
  setActiveProfile: (profileId: string) => void;
  toggleBrainFogMode: () => void;
  setBrainFogMode: (enabled: boolean) => void;
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
  addPatientProfile: (params: {
    name: string;
    relation: string;
    age: number;
    conditions: string[];
  }) => PatientProfile;
  loadSampleProfiles: () => void;
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
      activeTab: 'today',
      hasCompletedOnboarding: false,
      currentUserName: '',
      defaultMemoryCue: MEMORY_ANCHOR_PRESETS[0],
      profiles: [],
      activeProfileId: '',
      doseLogs: [],
      brainFogMode: false,

      setActiveTab: (tab) => set({ activeTab: tab }),

      completeOnboarding: ({
        userName,
        userAge,
        userRole,
        conditions,
        includeStarterMeds,
        brainFogMode,
        defaultMemoryCue,
      }) => {
        const cleanName = userName.trim() || 'My Schedule';
        const userProfileId = `profile-user-${Date.now()}`;

        const starterMeds = includeStarterMeds
          ? DEMO_PROFILES[0].medications.map((m) => ({ ...m }))
          : [];

        const primaryProfile: PatientProfile = {
          id: userProfileId,
          name: cleanName,
          relation: userRole || 'For Myself',
          age: userAge || 65,
          conditions:
            conditions.length > 0 ? conditions : ['Daily Medication Routine'],
          medications: starterMeds,
          caregiverNotes: [
            `Default physical habit after swallowing a dose: ${defaultMemoryCue}`,
          ],
        };

        const profilesToSave: PatientProfile[] = includeStarterMeds
          ? [primaryProfile, DEMO_PROFILES[1]]
          : [primaryProfile];

        const initialLogs: DoseLog[] = includeStarterMeds
          ? createInitialDemoLogs(userProfileId).map((l, idx) =>
              idx === 0 ? { ...l, memoryAnchorCue: defaultMemoryCue } : l
            )
          : [];

        set({
          activeTab: 'today',
          hasCompletedOnboarding: true,
          currentUserName: cleanName,
          brainFogMode,
          defaultMemoryCue,
          profiles: profilesToSave,
          activeProfileId: userProfileId,
          doseLogs: initialLogs,
        });
      },

      reopenOnboarding: () => {
        set({ hasCompletedOnboarding: false });
      },

      logoutCurrentPerson: () => {
        set({
          activeTab: 'today',
          hasCompletedOnboarding: false,
          currentUserName: '',
          defaultMemoryCue: MEMORY_ANCHOR_PRESETS[0],
          profiles: [],
          activeProfileId: '',
          doseLogs: [],
          brainFogMode: false,
        });
        try {
          window.localStorage.removeItem(HARBOR_STORAGE_KEY);
          window.localStorage.removeItem('harbordose-storage-v2');
          window.localStorage.removeItem('harbordose-storage-v1');
        } catch {
          // Ignore storage cleanup error
        }
      },

      removeProfileById: (profileId) => {
        const remaining = get().profiles.filter((p) => p.id !== profileId);
        const remainingLogs = get().doseLogs.filter(
          (l) => l.profileId !== profileId
        );

        if (remaining.length === 0) {
          get().logoutCurrentPerson();
          return;
        }

        const nextActiveId =
          get().activeProfileId === profileId
            ? remaining[0].id
            : get().activeProfileId;

        set({
          profiles: remaining,
          activeProfileId: nextActiveId,
          doseLogs: remainingLogs,
        });
      },

      setActiveProfile: (profileId) => set({ activeProfileId: profileId }),

      toggleBrainFogMode: () =>
        set((state) => ({ brainFogMode: !state.brainFogMode })),

      setBrainFogMode: (enabled) => set({ brainFogMode: enabled }),

      logDose: ({ medicationId, profileId, timeWindow, memoryAnchorCue }) => {
        const chosenCue = memoryAnchorCue || get().defaultMemoryCue;

        const existing = get().doseLogs.find(
          (l) =>
            l.profileId === profileId &&
            l.medicationId === medicationId &&
            l.timeWindow === timeWindow &&
            isSameLocalDay(l.takenAtISO)
        );

        if (existing) {
          if (chosenCue && chosenCue !== existing.memoryAnchorCue) {
            get().updateDoseAnchor(existing.id, chosenCue);
          }
          return existing;
        }

        const newLog: DoseLog = {
          id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          medicationId,
          profileId,
          timeWindow,
          takenAtISO: new Date().toISOString(),
          memoryAnchorCue: chosenCue,
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

      addPatientProfile: ({ name, relation, age, conditions }) => {
        const created: PatientProfile = {
          id: `profile-${Date.now()}`,
          name: name.trim(),
          relation: relation.trim() || 'Family Member',
          age: Number(age) || 65,
          conditions: conditions.length > 0 ? conditions : ['Daily Meds'],
          medications: [],
          caregiverNotes: [],
        };

        set((state) => ({
          profiles: [...state.profiles, created],
          activeProfileId: created.id,
        }));

        return created;
      },

      loadSampleProfiles: () => {
        const active = get().profiles.find(
          (p) => p.id === get().activeProfileId
        );
        if (active) {
          set((state) => ({
            profiles: state.profiles.map((p) =>
              p.id === active.id
                ? {
                    ...p,
                    medications: DEMO_PROFILES[0].medications.map((m) => ({
                      ...m,
                    })),
                  }
                : p
            ),
            doseLogs: createInitialDemoLogs(active.id),
          }));
        } else {
          set({
            profiles: DEMO_PROFILES,
            activeProfileId: DEMO_PROFILES[0].id,
            doseLogs: createInitialDemoLogs(DEMO_PROFILES[0].id),
          });
        }
      },
    }),
    {
      name: HARBOR_STORAGE_KEY,
    }
  )
);

const FALLBACK_EMPTY_PROFILE: PatientProfile = {
  id: 'fallback-empty',
  name: 'Guest',
  relation: 'My Schedule',
  age: 65,
  conditions: [],
  medications: [],
  caregiverNotes: [],
};

export function useActiveProfile(): PatientProfile {
  const profiles = useHarborStore((s) => s.profiles);
  const activeProfileId = useHarborStore((s) => s.activeProfileId);
  return useMemo(
    () =>
      profiles.find((p) => p.id === activeProfileId) ||
      profiles[0] ||
      FALLBACK_EMPTY_PROFILE,
    [profiles, activeProfileId]
  );
}
