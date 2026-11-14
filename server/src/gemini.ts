import { GoogleGenAI, Schema, Type } from '@google/genai';
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
} from '../../shared/types.js';
import {
  buildFallbackFamilyUpdate,
  buildFallbackMissedDoseAdvice,
  buildFallbackQuickCheck,
  buildFallbackRegimenAudit,
  buildFallbackScanResult,
} from './clinicalFallbacks.js';
import { ensurePlayableAudio } from './wavUtils.js';
import { formatLabelsForPrompt, getDrugLabels, quoteIsInLabel } from './openfda.js';

// Ultra-low-latency Gemini Flash-Lite models (~1.5-3s live response time)
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
export const GEMINI_FAST_BACKUP_MODEL = 'gemini-3.1-flash-lite';

const HARBOR_SYSTEM_INSTRUCTION = `You are HarborDose Clinical & ADHD Companion AI.
You assist adults living with ADHD (including older adults managing blood thinners, statins, thyroid medications, stimulants, and blood pressure medications) alongside their family caregivers.
Rules:
1. Zero-Shame Tone: Never scold, alarm unnecessarily, or use harsh words like "FAILED", "NON-COMPLIANT", or "MISSED!". Speak like a calm, experienced clinical pharmacist.
2. Cognitive Clarity: Keep sentences concise, scannable, concrete, and unambiguous for someone experiencing ADHD brain fog.
3. High-Stakes Safety First: Always guard against accidental double-dosing (especially blood thinners, blood pressure meds, stimulants, and thyroid meds) and flag major drug-drug or food-drug interactions clearly.
4. Encourage Physical Memory Anchors: Suggest tactile real-world cues (flipping a bottle cap, moving a pill dish, placing water beside a kettle).`;

function getClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return null;
  }
  return new GoogleGenAI({ apiKey });
}

export function isGeminiConfigured(): boolean {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  return Boolean(apiKey && apiKey !== 'your_gemini_api_key_here');
}

async function generateFastStructuredJson<T>(
  ai: GoogleGenAI,
  contents: any,
  responseSchema: Schema,
  temperature = 0.2
): Promise<{ data: T; modelUsed: string }> {
  const modelsToTry = [GEMINI_MODEL, GEMINI_FAST_BACKUP_MODEL];
  let lastError: unknown;

  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: HARBOR_SYSTEM_INSTRUCTION,
          temperature,
          responseMimeType: 'application/json',
          responseSchema,
          ...(model === 'gemini-3.1-flash-lite'
            ? { thinkingConfig: { thinkingBudget: 0 } }
            : {}),
        },
      });

      const parsed = JSON.parse(response.text || '{}') as T;
      return { data: parsed, modelUsed: model };
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError;
}

const safetyFindingSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING },
    severity: {
      type: Type.STRING,
      enum: ['safe', 'caution', 'critical'],
    },
    title: { type: Type.STRING },
    involvedItems: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    plainExplanation: { type: Type.STRING },
    actionableStep: { type: Type.STRING },
    timingRecommendation: { type: Type.STRING },
  },
  required: [
    'id',
    'severity',
    'title',
    'involvedItems',
    'plainExplanation',
    'actionableStep',
  ],
};

export async function scanPrescriptionWithGemini(params: {
  imageBase64?: string;
  mimeType?: string;
  labelTextHint?: string;
  patient: PatientProfile;
}): Promise<ScanPrescriptionResult> {
  const ai = getClient();
  if (!ai) {
    return buildFallbackScanResult(params.patient, params.labelTextHint);
  }

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      medication: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          genericName: { type: Type.STRING },
          dosage: { type: Type.STRING },
          timeWindows: {
            type: Type.ARRAY,
            items: {
              type: Type.STRING,
              enum: ['Morning', 'Midday', 'Evening', 'Bedtime'],
            },
          },
          pillVisual: {
            type: Type.OBJECT,
            properties: {
              shape: {
                type: Type.STRING,
                enum: ['capsule', 'oval', 'round', 'octagon'],
              },
              primaryColor: {
                type: Type.STRING,
                description: 'Valid 6-digit CSS hex color e.g. #F4A7B9',
              },
              secondaryColor: {
                type: Type.STRING,
                description:
                  'Optional 6-digit CSS hex color for two-tone capsules',
              },
              imprintCode: { type: Type.STRING },
            },
            required: ['shape', 'primaryColor', 'imprintCode'],
          },
          plainEnglishPurpose: { type: Type.STRING },
          foodRules: { type: Type.STRING },
          missedDoseGuidance: { type: Type.STRING },
          highRiskCategory: {
            type: Type.STRING,
            enum: [
              'blood_thinner',
              'statin',
              'stimulant',
              'blood_pressure',
              'thyroid',
            ],
          },
          supplyRemaining: { type: Type.INTEGER },
        },
        required: [
          'name',
          'genericName',
          'dosage',
          'timeWindows',
          'pillVisual',
          'plainEnglishPurpose',
          'foodRules',
          'missedDoseGuidance',
          'supplyRemaining',
        ],
      },
      confidenceNote: { type: Type.STRING },
      safetyAlertsWithCurrentMeds: {
        type: Type.ARRAY,
        items: safetyFindingSchema,
      },
      calmOnboardingTip: { type: Type.STRING },
    },
    required: [
      'medication',
      'confidenceNote',
      'safetyAlertsWithCurrentMeds',
      'calmOnboardingTip',
    ],
  };

  const parts: Array<
    { text: string } | { inlineData: { data: string; mimeType: string } }
  > = [];

  if (params.imageBase64) {
    const cleanBase64 = params.imageBase64.replace(
      /^data:image\/[a-zA-Z0-9+.-]+;base64,/,
      ''
    );
    parts.push({
      inlineData: {
        data: cleanBase64,
        mimeType: params.mimeType || 'image/jpeg',
      },
    });
  }

  parts.push({
    text: `Parse this prescription bottle photo, pill photo, or hospital discharge note for patient ${params.patient.name} (age ${params.patient.age}, conditions: ${params.patient.conditions.join(', ')}).
Existing active medications: ${JSON.stringify(
      params.patient.medications.map((m) => ({
        name: m.name,
        genericName: m.genericName,
        dosage: m.dosage,
        timeWindows: m.timeWindows,
        highRiskCategory: m.highRiskCategory,
      }))
    )}.
${params.labelTextHint ? `Additional text/label hint from user: "${params.labelTextHint}"` : ''}

Extract accurate structured medication details including realistic FDA-accurate visual appearance (shape, hex colors, imprint code), concise plain-English purpose, food rules, calm zero-shame missed-dose guidance, supply count (default 30 if not visible), and check for any clinical interactions or duplicate therapy against existing medications.`,
  });

  try {
    const { data, modelUsed } = await generateFastStructuredJson<
      Omit<ScanPrescriptionResult, 'modelUsed'>
    >(ai, [{ role: 'user', parts }], responseSchema, 0.2);

    return {
      ...data,
      modelUsed,
    };
  } catch (err) {
    console.error('[Gemini scan error, using resilient clinical fallback]:', err);
    return buildFallbackScanResult(params.patient, params.labelTextHint);
  }
}

export async function auditRegimenWithGemini(
  patient: PatientProfile
): Promise<RegimenAuditResult> {
  const ai = getClient();
  if (!ai) {
    return buildFallbackRegimenAudit(patient);
  }

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      overallSeverity: {
        type: Type.STRING,
        enum: ['safe', 'caution', 'critical'],
      },
      calmHeadline: { type: Type.STRING },
      reassuranceSummary: { type: Type.STRING },
      optimalScheduleTip: { type: Type.STRING },
      findings: {
        type: Type.ARRAY,
        items: safetyFindingSchema,
      },
    },
    required: [
      'overallSeverity',
      'calmHeadline',
      'reassuranceSummary',
      'optimalScheduleTip',
      'findings',
    ],
  };

  try {
    const { data, modelUsed } = await generateFastStructuredJson<
      Omit<RegimenAuditResult, 'generatedAtISO' | 'modelUsed'>
    >(
      ai,
      `Perform a concise, calm pharmacological interaction, food-rule, and timing-harmony review for:
Patient: ${patient.name}, Age ${patient.age}, Conditions: ${patient.conditions.join(', ')}.
Medications: ${JSON.stringify(patient.medications)}

Return 2 to 4 concise, high-impact findings covering major OTC dangers (e.g. NSAIDs with blood thinners), food spacing (e.g. grapefruit or coffee/calcium), and habit bundling.`,
      responseSchema,
      0.2
    );

    return {
      ...data,
      generatedAtISO: new Date().toISOString(),
      modelUsed,
    };
  } catch (err) {
    console.error('[Gemini audit error, using resilient clinical fallback]:', err);
    return buildFallbackRegimenAudit(patient);
  }
}

export async function quickSafetyCheckWithGemini(params: {
  queryItem: string;
  patient: PatientProfile;
  todayLogs: DoseLog[];
  imageBase64?: string;
  mimeType?: string;
}): Promise<QuickCheckResult> {
  const ai = getClient();
  if (!ai) {
    return buildFallbackQuickCheck(params.queryItem, params.patient);
  }

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      queryItem: { type: Type.STRING },
      severity: {
        type: Type.STRING,
        enum: ['safe', 'caution', 'critical'],
      },
      verdictBadge: { type: Type.STRING },
      calmAnswer: { type: Type.STRING },
      whyItMatters: { type: Type.STRING },
      safeAlternativeOrTiming: { type: Type.STRING },
      sourceQuote: { type: Type.STRING },
      sourceDrug: { type: Type.STRING },
    },
    required: [
      'queryItem',
      'severity',
      'verdictBadge',
      'calmAnswer',
      'whyItMatters',
      'safeAlternativeOrTiming',
      'sourceQuote',
      'sourceDrug',
    ],
  };

  const labels = await getDrugLabels(
    params.patient.medications.map((m) => m.genericName || m.name)
  );

  const parts: Array<
    { text: string } | { inlineData: { data: string; mimeType: string } }
  > = [];

  if (params.imageBase64) {
    const cleanBase64 = params.imageBase64.replace(
      /^data:image\/[a-zA-Z0-9+.-]+;base64,/,
      ''
    );
    parts.push({
      inlineData: {
        data: cleanBase64,
        mimeType: params.mimeType || 'image/jpeg',
      },
    });
  }

  parts.push({
    text: `Patient ${params.patient.name} (Age ${params.patient.age}, Conditions: ${params.patient.conditions.join(', ')}) asks:
"Can I safely take or have '${params.queryItem}' right now?"

Active Medications: ${JSON.stringify(params.patient.medications)}
Today's Logged Doses so far: ${JSON.stringify(params.todayLogs)}

OFFICIAL FDA LABELS (your ONLY allowed source of drug-safety facts):
${formatLabelsForPrompt(labels)}

Rules for this answer:
- Base the verdict ONLY on the FDA label text above. Do not use outside knowledge.
- Copy into "sourceQuote" ONE sentence, word for word, from the label that supports your verdict, and put that label's drug name in "sourceDrug".
- If the labels do not address '${params.queryItem}', set severity to 'caution', set sourceQuote and sourceDrug to empty strings, and say plainly that the label doesn't cover it and they should ask their pharmacist.
- Never tell anyone to change, skip, or double a dose. Point them to their pharmacist or doctor.

Give a crystal-clear, ADHD-friendly verdict ('safe', 'caution', or 'critical'), plain-English explanation, and a safe alternative or exact spacing instruction.`,
  });

  try {
    const { data, modelUsed } = await generateFastStructuredJson<
      Omit<QuickCheckResult, 'modelUsed' | 'labelVerified'>
    >(ai, [{ role: 'user', parts }], responseSchema, 0.2);

    const labelVerified = quoteIsInLabel(
      data.sourceQuote || '',
      data.sourceDrug || '',
      labels
    );

    return {
      ...data,
      // Never show a quote we couldn't find in the real label.
      sourceQuote: labelVerified ? data.sourceQuote : '',
      sourceDrug: labelVerified ? data.sourceDrug : '',
      labelVerified,
      modelUsed,
    };
  } catch (err) {
    console.error('[Gemini quick-check error, using resilient clinical fallback]:', err);
    return buildFallbackQuickCheck(params.queryItem, params.patient);
  }
}

export async function getMissedDoseGuidanceWithGemini(params: {
  medication: Medication;
  patient: PatientProfile;
  windowMissed: TimeWindow;
  currentLocalTime: string;
  todayLogs: DoseLog[];
  unsureIfTaken?: boolean;
}): Promise<MissedDoseAdviceResult> {
  const ai = getClient();
  if (!ai) {
    return buildFallbackMissedDoseAdvice(
      params.medication,
      params.patient,
      params.windowMissed
    );
  }

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      severity: {
        type: Type.STRING,
        enum: ['safe', 'caution', 'critical'],
      },
      calmHeadline: { type: Type.STRING },
      stepByStepAction: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
      doubleDoseWarning: { type: Type.STRING },
      whenToCallDoctorOrPharmacist: { type: Type.STRING },
      spokenScript: {
        type: Type.STRING,
        description:
          'A warm, soothing 3-sentence spoken readout suitable for text-to-speech.',
      },
    },
    required: [
      'severity',
      'calmHeadline',
      'stepByStepAction',
      'doubleDoseWarning',
      'whenToCallDoctorOrPharmacist',
      'spokenScript',
    ],
  };

  try {
    const { data, modelUsed } = await generateFastStructuredJson<
      Omit<MissedDoseAdviceResult, 'modelUsed'>
    >(
      ai,
      `Patient ${params.patient.name} (Age ${params.patient.age}) needs zero-shame, high-safety support for ${params.medication.name} (${params.medication.genericName} ${params.medication.dosage}) scheduled for ${params.windowMissed}.
Current local time: ${params.currentLocalTime}.
Situation: ${
        params.unsureIfTaken
          ? 'Patient has ADHD working-memory fog and is UNSURE whether they already swallowed this pill.'
          : 'Patient realized the usual time window ran late.'
      }
Medication details: ${JSON.stringify(params.medication)}

Provide 3 short step-by-step actions, explicit anti-double-dose guidance, and a soothing spokenScript.`,
      responseSchema,
      0.25
    );

    return {
      ...data,
      modelUsed,
    };
  } catch (err) {
    console.error('[Gemini missed-dose error, using resilient clinical fallback]:', err);
    return buildFallbackMissedDoseAdvice(
      params.medication,
      params.patient,
      params.windowMissed
    );
  }
}

export async function generateFamilyUpdateWithGemini(params: {
  patient: PatientProfile;
  todayLogs: DoseLog[];
  currentLocalTime: string;
}): Promise<FamilyUpdateResult> {
  const ai = getClient();
  if (!ai) {
    return buildFallbackFamilyUpdate(params.patient, params.todayLogs);
  }

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      smsText: {
        type: Type.STRING,
        description:
          'Ready-to-paste warm family text message under 400 characters with checkmarks, timestamps, memory anchors used, and any gentle refill note.',
      },
      calmSummaryHeadline: { type: Type.STRING },
      dosesCompletedCount: { type: Type.INTEGER },
      dosesTotalCount: { type: Type.INTEGER },
      supplyAlerts: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
    },
    required: [
      'smsText',
      'calmSummaryHeadline',
      'dosesCompletedCount',
      'dosesTotalCount',
      'supplyAlerts',
    ],
  };

  try {
    const { data, modelUsed } = await generateFastStructuredJson<
      Omit<FamilyUpdateResult, 'modelUsed'>
    >(
      ai,
      `Create a warm, dignified 1-click Family Care Circle SMS update for ${params.patient.name} (${params.patient.relation}, age ${params.patient.age}) at ${params.currentLocalTime}.
Medications & Supply: ${JSON.stringify(
        params.patient.medications.map((m) => ({
          id: m.id,
          name: m.name,
          dosage: m.dosage,
          timeWindows: m.timeWindows,
          supplyRemaining: m.supplyRemaining,
        }))
      )}
Today's Dose Logs: ${JSON.stringify(params.todayLogs)}

Never sound controlling or judgmental. Highlight completed windows, physical memory cues used, and any medication with supplyRemaining <= 7.`,
      responseSchema,
      0.3
    );

    return {
      ...data,
      modelUsed,
    };
  } catch (err) {
    console.error('[Gemini family-update error, using resilient fallback]:', err);
    return buildFallbackFamilyUpdate(params.patient, params.todayLogs);
  }
}

export async function generateEmpatheticAudioWithGemini(
  textToSpeak: string
): Promise<AudioReadoutResponse> {
  const cleanText = textToSpeak.trim().slice(0, 900);
  const ai = getClient();

  if (!ai) {
    return {
      fallbackText: cleanText,
      modelUsed: 'expo-speech-offline-fallback',
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: `Read the following medication guidance aloud in a calm, warm, reassuring pace:\n\n"${cleanText}"`,
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: 'Aoede',
            },
          },
        },
        httpOptions: {
          timeout: 6000,
        },
      },
    });

    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        const playable = ensurePlayableAudio(
          part.inlineData.data,
          part.inlineData.mimeType || 'audio/L16;rate=24000'
        );
        return {
          audioBase64: playable.audioBase64,
          mimeType: playable.mimeType,
          fallbackText: cleanText,
          modelUsed: GEMINI_MODEL,
        };
      }
    }

    return {
      fallbackText: cleanText,
      modelUsed: `${GEMINI_MODEL} (text-fallback)`,
    };
  } catch {
    return {
      fallbackText: cleanText,
      modelUsed: 'expo-speech-fallback',
    };
  }
}
