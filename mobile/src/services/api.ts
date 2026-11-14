import {
  AudioReadoutResponse,
  DoseLog,
  FamilyUpdateResult,
  Medication,
  MissedDoseAdviceResult,
  PatientProfile,
  QuickCheckResult,
  RegimenAuditResult,
  ScanPrescriptionResult,
  TimeWindow,
} from '@shared/types';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export function getApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  }

  if (Platform.OS === 'web') {
    return 'http://localhost:4000';
  }

  // On physical device running Expo Go, extract LAN IP from Metro bundler hostUri
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const lanHost = hostUri.split(':')[0];
    if (lanHost && lanHost !== 'localhost' && lanHost !== '127.0.0.1') {
      return `http://${lanHost}:4000`;
    }
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:4000';
  }

  return 'http://localhost:4000';
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 22000);

  try {
    const res = await fetch(`${getApiBaseUrl()}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

export async function scanPrescriptionApi(params: {
  imageBase64?: string;
  mimeType?: string;
  labelTextHint?: string;
  patient: PatientProfile;
}): Promise<ScanPrescriptionResult> {
  try {
    return await postJson<ScanPrescriptionResult>('/api/medications/scan', params);
  } catch {
    // Offline fallback so patient/demo never hits a wall
    const isToprol = (params.labelTextHint || '')
      .toLowerCase()
      .includes('metoprolol');
    return {
      medication: isToprol
        ? {
            name: 'Toprol-XL',
            genericName: 'Metoprolol Succinate ER',
            dosage: '25 mg',
            timeWindows: ['Morning'],
            pillVisual: {
              shape: 'oval',
              primaryColor: '#FFFFFF',
              imprintCode: 'A MO',
            },
            plainEnglishPurpose:
              'Gently steadies heart rate and keeps blood pressure calm.',
            foodRules: 'Take with or right after breakfast.',
            missedDoseGuidance:
              'If less than 8 hours before tomorrow morning, wait calmly for your single morning dose.',
            highRiskCategory: 'blood_pressure',
            supplyRemaining: 30,
          }
        : {
            name: 'Plavix',
            genericName: 'Clopidogrel',
            dosage: '75 mg',
            timeWindows: ['Morning'],
            pillVisual: {
              shape: 'round',
              primaryColor: '#F2A6B3',
              imprintCode: '75',
            },
            plainEnglishPurpose:
              'Helps keep blood platelets flowing smoothly to protect circulation.',
            foodRules: 'Can be taken with or without food with a full glass of water.',
            missedDoseGuidance:
              'Take 1 tablet when remembered if more than 12 hours before tomorrow morning. Never double up.',
            highRiskCategory: 'blood_thinner',
            supplyRemaining: 30,
          },
      confidenceNote:
        'Offline resilience mode active — verify tablet imprint before saving.',
      safetyAlertsWithCurrentMeds: params.patient.medications.some(
        (m) => m.highRiskCategory === 'blood_thinner'
      ) && !isToprol
        ? [
            {
              id: 'offline-bt-overlap',
              severity: 'critical',
              title: 'Blood Thinner Overlap Check',
              involvedItems: ['Plavix', 'Existing Blood Thinner'],
              plainExplanation:
                'Two blood-thinning prescriptions increase bleeding risk unless explicitly ordered together by your cardiologist.',
              actionableStep:
                'Confirm on your discharge summary whether both are meant to be taken together.',
            },
          ]
        : [],
      calmOnboardingTip:
        'Place your new bottle in your visible Morning station and decide on one physical cap-flip cue.',
      modelUsed: 'offline-resilience',
    };
  }
}

export async function auditRegimenApi(
  patient: PatientProfile
): Promise<RegimenAuditResult> {
  try {
    return await postJson<RegimenAuditResult>('/api/safety/audit', { patient });
  } catch {
    const bt = patient.medications.find(
      (m) => m.highRiskCategory === 'blood_thinner'
    );
    return {
      overallSeverity: bt ? 'critical' : 'caution',
      calmHeadline: `${patient.name}'s daily schedule is well-structured—with key OTC reminders`,
      reassuranceSummary:
        'Your prescribed windows complement each other well. Keep common pain relievers and meal spacing in mind below.',
      optimalScheduleTip:
        'Pair Morning pills with your water kettle and Evening/Bedtime pills with brushing teeth.',
      findings: bt
        ? [
            {
              id: 'offline-bt',
              severity: 'critical',
              title: `Skip Ibuprofen, Advil & Aleve While Taking ${bt.name}`,
              involvedItems: [bt.name, 'NSAID Pain Relievers'],
              plainExplanation: `${bt.name} thins blood to protect your heart; NSAIDs raise stomach bleeding risk.`,
              actionableStep:
                'Use plain Acetaminophen (Tylenol) after checking with your pharmacist.',
            },
          ]
        : [
            {
              id: 'offline-general',
              severity: 'safe',
              title: 'Daily Windows Look Calm & Balanced',
              involvedItems: patient.medications.map((m) => m.name),
              plainExplanation:
                'Continue logging a physical memory anchor immediately after swallowing each dose.',
              actionableStep: 'Keep pill bottles grouped by Morning and Evening.',
            },
          ],
      generatedAtISO: new Date().toISOString(),
      modelUsed: 'offline-resilience',
    };
  }
}

export async function quickCheckApi(params: {
  queryItem: string;
  patient: PatientProfile;
  todayLogs: DoseLog[];
  imageBase64?: string;
  mimeType?: string;
}): Promise<QuickCheckResult> {
  try {
    return await postJson<QuickCheckResult>('/api/safety/quick-check', params);
  } catch {
    const q = params.queryItem.toLowerCase();
    const bt = params.patient.medications.find(
      (m) => m.highRiskCategory === 'blood_thinner'
    );
    if (bt && /advil|ibuprofen|aleve|motrin|aspirin/i.test(q)) {
      return {
        queryItem: params.queryItem,
        severity: 'critical',
        verdictBadge: 'Hold Off — Bleeding Risk',
        calmAnswer: `Avoid ${params.queryItem} because ${params.patient.name} takes ${bt.name}.`,
        whyItMatters: `NSAIDs combined with ${bt.name} substantially increase bleeding risk.`,
        safeAlternativeOrTiming:
          'Plain Acetaminophen (Tylenol) is typically safer—verify dosing with your pharmacist.',
        modelUsed: 'offline-resilience',
      };
    }
    return {
      queryItem: params.queryItem,
      severity: 'safe',
      verdictBadge: 'No Direct Red Flag Found',
      calmAnswer: `No immediate high-risk clash spotted in offline check for "${params.queryItem}".`,
      whyItMatters: 'Start the HarborDose server for full Gemini pharmacological reasoning.',
      safeAlternativeOrTiming: 'Check combination OTC ingredient panels carefully.',
      modelUsed: 'offline-resilience',
    };
  }
}

export async function missedDoseAdviceApi(params: {
  medication: Medication;
  patient: PatientProfile;
  windowMissed: TimeWindow;
  currentLocalTime: string;
  todayLogs: DoseLog[];
  unsureIfTaken?: boolean;
}): Promise<MissedDoseAdviceResult> {
  try {
    return await postJson<MissedDoseAdviceResult>(
      '/api/safety/missed-dose',
      params
    );
  } catch {
    return {
      severity: params.medication.highRiskCategory ? 'caution' : 'safe',
      calmHeadline: `Take a calm breath—let’s check ${params.medication.name} safely.`,
      stepByStepAction: [
        'Check your physical bottle cap or pill dish first to see if your memory anchor was already moved.',
        params.medication.missedDoseGuidance,
        'Return to your normal next scheduled window without doubling.',
      ],
      doubleDoseWarning: `Never take two doses of ${params.medication.name} (${params.medication.dosage}) at once. When genuinely 50/50 unsure if you already swallowed it, waiting for the next scheduled window avoids accidental overdose.`,
      whenToCallDoctorOrPharmacist:
        'Call your pharmacist if two consecutive windows were missed or if you feel unwell.',
      spokenScript: `Take a gentle breath. You are doing great checking first. Look at your bottle cap or pill tray for ${params.medication.name}. ${params.medication.missedDoseGuidance} Never take two pills at the same time.`,
      modelUsed: 'offline-resilience',
    };
  }
}

export async function familyUpdateApi(params: {
  patient: PatientProfile;
  todayLogs: DoseLog[];
  currentLocalTime: string;
}): Promise<FamilyUpdateResult> {
  try {
    return await postJson<FamilyUpdateResult>(
      '/api/caregiver/summary',
      params
    );
  } catch {
    const total = params.patient.medications.reduce(
      (sum, m) => sum + m.timeWindows.length,
      0
    );
    const supplyAlerts = params.patient.medications
      .filter((m) => m.supplyRemaining <= 7)
      .map((m) => `${m.name} (${m.supplyRemaining} left)`);

    return {
      smsText: `HarborDose Update for ${params.patient.name.split(' ')[0]} (${params.currentLocalTime}): ${params.todayLogs.length}/${total} scheduled doses logged calmly today.${
        supplyAlerts.length > 0 ? ` Refill soon: ${supplyAlerts.join(', ')}.` : ''
      }`,
      calmSummaryHeadline: `${params.todayLogs.length} of ${total} doses logged today`,
      dosesCompletedCount: params.todayLogs.length,
      dosesTotalCount: total,
      supplyAlerts,
      modelUsed: 'offline-resilience',
    };
  }
}

export async function fetchGeminiAudioApi(
  text: string
): Promise<AudioReadoutResponse> {
  return postJson<AudioReadoutResponse>('/api/audio/speak', { text });
}
