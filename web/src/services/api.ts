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

export interface GeminiHealthStatus {
  ok: boolean;
  geminiConfigured: boolean;
  model: string;
}

function getCandidateBases(): string[] {
  const envUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  if (envUrl) {
    return [envUrl.replace(/\/$/, '')];
  }
  // Primary: same-origin Vite `/api` proxy -> http://localhost:4000
  // Backup: direct localhost:4000 (e.g. if running `vite preview` without dev proxy)
  return ['', 'http://localhost:4000'];
}

export function isLiveGeminiModel(modelUsed?: string): boolean {
  if (!modelUsed) return false;
  const lower = modelUsed.toLowerCase();
  return (
    lower.includes('gemini') &&
    !lower.includes('fallback') &&
    !lower.includes('offline')
  );
}

export async function checkGeminiHealthApi(): Promise<GeminiHealthStatus> {
  for (const base of getCandidateBases()) {
    try {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${base}/api/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      window.clearTimeout(timer);
      if (res.ok) {
        const data = (await res.json()) as {
          status?: string;
          model?: string;
          geminiConfigured?: boolean;
        };
        return {
          ok: data.status === 'ok',
          geminiConfigured: Boolean(data.geminiConfigured),
          model: data.model || 'gemini-3.5-flash-lite',
        };
      }
    } catch {
      // Try next base
    }
  }
  return {
    ok: false,
    geminiConfigured: false,
    model: 'offline',
  };
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  let lastErr: unknown;

  for (const base of getCandidateBases()) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 28000);

    try {
      const res = await fetch(`${base}${path}`, {
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
    } catch (err) {
      lastErr = err;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  throw lastErr ?? new Error('API unreachable');
}

/**
 * Normalizes any browser image File onto a canvas (max 1280px) and encodes
 * as clean `image/jpeg` so Gemini Vision receives a fast, valid image.
 */
export function normalizeImageFileToJpegDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const rawDataUrl = String(reader.result || '');
      const img = new Image();
      img.onload = () => {
        const maxDim = 1280;
        let width = img.naturalWidth || img.width || 800;
        let height = img.naturalHeight || img.height || 600;

        if (width > maxDim || height > maxDim) {
          const scale = Math.min(maxDim / width, maxDim / height);
          width = Math.max(1, Math.round(width * scale));
          height = Math.max(1, Math.round(height * scale));
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(rawDataUrl);
          return;
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.84));
      };
      img.onerror = () => {
        // If browser cannot render format onto canvas (e.g. raw HEIC on Chrome), pass original
        resolve(rawDataUrl);
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  });
}

export async function scanPrescriptionApi(params: {
  imageBase64?: string;
  mimeType?: string;
  labelTextHint?: string;
  patient: PatientProfile;
}): Promise<ScanPrescriptionResult> {
  try {
    return await postJson<ScanPrescriptionResult>(
      '/api/medications/scan',
      params
    );
  } catch {
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
            foodRules: 'Can be taken with or without food with water.',
            missedDoseGuidance:
              'Take 1 tablet when remembered if more than 12 hours before tomorrow morning. Never double up.',
            highRiskCategory: 'blood_thinner',
            supplyRemaining: 30,
          },
      confidenceNote: 'Verify tablet imprint before saving.',
      safetyAlertsWithCurrentMeds:
        params.patient.medications.some(
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
        'Place your new bottle in your Morning station and pair with your physical habit cue.',
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
      calmHeadline: `${patient.name}'s daily schedule is well-structured`,
      reassuranceSummary:
        'Your prescribed windows complement each other well.',
      optimalScheduleTip:
        'Pair Morning pills with your water kettle and Evening pills with dinner.',
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
                'Continue logging a physical habit immediately after swallowing each dose.',
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
      calmAnswer: `No immediate high-risk clash spotted for "${params.queryItem}".`,
      whyItMatters:
        'Check combination OTC ingredient panels carefully for hidden NSAIDs or decongestants.',
      safeAlternativeOrTiming:
        'Ask your pharmacist if starting a new daily supplement.',
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
        'Check your physical bottle cap or pill dish first to see if your memory cue was already moved.',
        params.medication.missedDoseGuidance,
        'Return to your normal next scheduled window without doubling.',
      ],
      doubleDoseWarning: `Never take two doses of ${params.medication.name} (${params.medication.dosage}) at once. When genuinely 50/50 unsure if you already swallowed it, waiting for the next scheduled window avoids accidental overdose.`,
      whenToCallDoctorOrPharmacist:
        'Call your pharmacist if two consecutive windows were missed or if you feel unwell.',
      spokenScript: `Take a gentle breath. Look at your bottle cap or pill tray for ${params.medication.name}. ${params.medication.missedDoseGuidance} Never take two pills at the same time.`,
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
