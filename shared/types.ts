export type TimeWindow = 'Morning' | 'Midday' | 'Evening' | 'Bedtime';

export interface PillVisual {
  shape: 'capsule' | 'oval' | 'round' | 'octagon';
  primaryColor: string; // Hex code
  secondaryColor?: string; // Hex code for two-tone capsules
  imprintCode: string; // e.g., "894", "10", "L484"
}

export type HighRiskCategory =
  | 'blood_thinner'
  | 'statin'
  | 'stimulant'
  | 'blood_pressure'
  | 'thyroid';

export interface Medication {
  id: string;
  name: string;
  genericName: string;
  dosage: string;
  timeWindows: TimeWindow[];
  pillVisual: PillVisual;
  plainEnglishPurpose: string;
  foodRules: string;
  missedDoseGuidance: string; // Zero-shame clinical guidance
  highRiskCategory?: HighRiskCategory;
  supplyRemaining: number;
}

export interface DoseLog {
  id: string;
  medicationId: string;
  profileId: string;
  timeWindow: TimeWindow;
  takenAtISO: string;
  memoryAnchorCue?: string; // e.g., "Flipped bottle cap face-down", "Moved pill to green tray"
}

export interface PatientProfile {
  id: string;
  name: string;
  relation: string;
  age: number;
  conditions: string[];
  medications: Medication[];
  caregiverNotes: string[];
}

export type SafetySeverity = 'safe' | 'caution' | 'critical';

export interface SafetyFinding {
  id: string;
  severity: SafetySeverity;
  title: string;
  involvedItems: string[];
  plainExplanation: string;
  actionableStep: string;
  timingRecommendation?: string;
}

export interface RegimenAuditResult {
  overallSeverity: SafetySeverity;
  calmHeadline: string;
  reassuranceSummary: string;
  optimalScheduleTip: string;
  findings: SafetyFinding[];
  generatedAtISO: string;
  modelUsed: string;
}

export interface QuickCheckResult {
  queryItem: string;
  severity: SafetySeverity;
  verdictBadge: string;
  calmAnswer: string;
  whyItMatters: string;
  safeAlternativeOrTiming: string;
  modelUsed: string;
}

export interface ScanPrescriptionResult {
  medication: Omit<Medication, 'id'>;
  confidenceNote: string;
  safetyAlertsWithCurrentMeds: SafetyFinding[];
  calmOnboardingTip: string;
  modelUsed: string;
}

export interface MissedDoseAdviceResult {
  severity: SafetySeverity;
  calmHeadline: string;
  stepByStepAction: string[];
  doubleDoseWarning: string;
  whenToCallDoctorOrPharmacist: string;
  spokenScript: string;
  modelUsed: string;
}

export interface FamilyUpdateResult {
  smsText: string;
  calmSummaryHeadline: string;
  dosesCompletedCount: number;
  dosesTotalCount: number;
  supplyAlerts: string[];
  modelUsed: string;
}

export interface AudioReadoutResponse {
  audioBase64?: string;
  mimeType?: string;
  fallbackText: string;
  modelUsed: string;
}
