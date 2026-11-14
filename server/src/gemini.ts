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

export const GEMINI_MODEL = 'gemini-4-hydrogen';

const HARBOR_SYSTEM_INSTRUCTION = `You are HarborDose Clinical & ADHD Companion AI.
You assist adults living with severe ADHD (including older adults managing blood thinners, statins, thyroid medications, stimulants, and blood pressure medications) alongside their loving family caregivers.
Rules:
1. Zero-Shame Tone: Never scold, alarm unnecessarily, or use harsh words like "FAILED", "NON-COMPLIANT", or "MISSED!". Speak like a calm, experienced clinical pharmacist sitting beside a warm cup of tea.
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
                description: 'Optional 6-digit CSS hex color for two-tone capsules',
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

Extract accurate structured medication details including realistic FDA-accurate visual appearance (shape, hex colors, imprint code) if recognizable or printed on the label, plain-English purpose, food rules, calm zero-shame missed-dose guidance, supply count (default 30 if not visible), and check for any clinical interactions or duplicate therapy against existing medications.`,
  });

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: 'user', parts }],
      config: {
        systemInstruction: HARBOR_SYSTEM_INSTRUCTION,
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseSchema,
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return {
      ...parsed,
      modelUsed: GEMINI_MODEL,
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
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: `Perform a comprehensive, calm pharmacological interaction, food-rule, and timing-harmony review for:
Patient: ${patient.name}, Age ${patient.age}, Conditions: ${patient.conditions.join(', ')}.
Medications: ${JSON.stringify(patient.medications, null, 2)}

Evaluate:
1. Drug-drug interactions & additive blood pressure / bleeding / CNS effects.
2. Important OTC dangers to avoid (e.g., NSAIDs like ibuprofen/naproxen with blood thinners; decongestants with hypertension/stimulants).
3. Food & beverage spacing rules (e.g., grapefruit with certain statins, Vitamin K consistency with warfarin, coffee/calcium spacing with levothyroxine).
4. Practical ADHD-friendly daily habit bundling tips.`,
      config: {
        systemInstruction: HARBOR_SYSTEM_INSTRUCTION,
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseSchema,
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return {
      ...parsed,
      generatedAtISO: new Date().toISOString(),
      modelUsed: GEMINI_MODEL,
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
    },
    required: [
      'queryItem',
      'severity',
      'verdictBadge',
      'calmAnswer',
      'whyItMatters',
      'safeAlternativeOrTiming',
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
    text: `Patient ${params.patient.name} (Age ${params.patient.age}, Conditions: ${params.patient.conditions.join(', ')}) asks:
"Can I safely take or have '${params.queryItem}' right now?"

Active Medications: ${JSON.stringify(params.patient.medications)}
Today's Logged Doses so far: ${JSON.stringify(params.todayLogs)}

Give a crystal-clear, ADHD-friendly verdict ('safe', 'caution', or 'critical'), plain-English explanation, and a safe alternative or exact spacing instruction.`,
  });

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: 'user', parts }],
      config: {
        systemInstruction: HARBOR_SYSTEM_INSTRUCTION,
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseSchema,
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return {
      ...parsed,
      modelUsed: GEMINI_MODEL,
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
          'A warm, soothing 3-4 sentence spoken readout suitable for text-to-speech for an overwhelmed patient.',
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
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: `Patient ${params.patient.name} (Age ${params.patient.age}) needs zero-shame, high-safety support for ${params.medication.name} (${params.medication.genericName} ${params.medication.dosage}) scheduled for the ${params.windowMissed} window.
Current local time: ${params.currentLocalTime}.
Situation: ${
        params.unsureIfTaken
          ? 'Patient has ADHD working-memory fog and is UNSURE whether they already swallowed this pill a few minutes ago.'
          : 'Patient realized the usual time window ran late and wants to know the safest next step.'
      }
Medication details: ${JSON.stringify(params.medication)}
Today's logged doses: ${JSON.stringify(params.todayLogs)}

Provide calm, concrete step-by-step actions, explicit anti-double-dose guidance tailored to ${params.medication.genericName}, red-flag symptoms that warrant calling a pharmacist/doctor, and a soothing spokenScript.`,
      config: {
        systemInstruction: HARBOR_SYSTEM_INSTRUCTION,
        temperature: 0.25,
        responseMimeType: 'application/json',
        responseSchema,
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return {
      ...parsed,
      modelUsed: GEMINI_MODEL,
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
          'Ready-to-paste warm family text message under 450 characters with checkmarks, timestamps, memory anchors used, and any gentle refill note.',
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
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: `Create a warm, dignified 1-click Family Care Circle SMS update for ${params.patient.name} (${params.patient.relation}, age ${params.patient.age}) at ${params.currentLocalTime}.
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
Caregiver Notes: ${JSON.stringify(params.patient.caregiverNotes)}

Never sound controlling or judgmental. Highlight completed windows, any physical memory anchors logged, remaining upcoming windows, and flag any medication with supplyRemaining <= 7.`,
      config: {
        systemInstruction: HARBOR_SYSTEM_INSTRUCTION,
        temperature: 0.35,
        responseMimeType: 'application/json',
        responseSchema,
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return {
      ...parsed,
      modelUsed: GEMINI_MODEL,
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
      contents: `Read the following medication guidance aloud in a calm, warm, reassuring, unhurried pace for a patient who wants gentle clarity:\n\n"${cleanText}"`,
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: 'Aoede',
            },
          },
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
  } catch (err) {
    console.warn(
      '[Gemini audio modality unavailable or errored; client will use instant expo-speech fallback]:',
      err
    );
    return {
      fallbackText: cleanText,
      modelUsed: 'expo-speech-fallback',
    };
  }
}
