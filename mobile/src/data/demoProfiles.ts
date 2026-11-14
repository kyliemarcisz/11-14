import { DoseLog, PatientProfile, TimeWindow } from '@shared/types';

export const MEMORY_ANCHOR_PRESETS: string[] = [
  'Flipped bottle cap upside-down',
  'Moved pill to green dish',
  'Turned weekly pill slider',
  'Set water mug on left coaster',
];

export const TIME_WINDOWS: Array<{
  key: TimeWindow;
  label: string;
  timeRange: string;
  gentleCue: string;
}> = [
  {
    key: 'Morning',
    label: 'Morning',
    timeRange: '7:00 – 10:00 AM',
    gentleCue: 'First glass of water & breakfast ritual',
  },
  {
    key: 'Midday',
    label: 'Midday',
    timeRange: '12:00 – 2:00 PM',
    gentleCue: 'Lunch break check-in',
  },
  {
    key: 'Evening',
    label: 'Evening',
    timeRange: '5:30 – 8:00 PM',
    gentleCue: 'Dinner table ritual',
  },
  {
    key: 'Bedtime',
    label: 'Bedtime',
    timeRange: '9:30 – 11:00 PM',
    gentleCue: 'Brush teeth & bedside lamp cue',
  },
];

export const DEMO_PROFILES: PatientProfile[] = [
  {
    id: 'profile-arthur',
    name: 'Arthur Pendelton',
    relation: 'Self • Shared with Daughter Maya',
    age: 72,
    conditions: [
      'Severe ADHD (Inattentive)',
      'Atrial Fibrillation',
      'Hypertension',
      'High Cholesterol',
    ],
    caregiverNotes: [
      'Morning bottles live on the walnut tray right beside the electric kettle.',
      'After taking Eliquis, flip the white cap upside-down immediately so there is zero doubt.',
      'Keep Tylenol (not Advil/Ibuprofen) in the top kitchen drawer for back aches.',
    ],
    medications: [
      {
        id: 'med-eliquis',
        name: 'Eliquis',
        genericName: 'Apixaban',
        dosage: '5 mg',
        timeWindows: ['Morning', 'Evening'],
        pillVisual: {
          shape: 'oval',
          primaryColor: '#F4A7B9',
          imprintCode: '894',
        },
        plainEnglishPurpose:
          'Keeps blood flowing smoothly to protect against stroke with atrial fibrillation.',
        foodRules: 'With or without food. Avoid NSAIDs like Advil, Motrin, or Aleve.',
        missedDoseGuidance:
          'If within 6 hours of your usual window, take 1 tablet calmly and lock your memory anchor. If closer to your next window, wait and take your single normal dose—never take two tablets together.',
        highRiskCategory: 'blood_thinner',
        supplyRemaining: 18,
      },
      {
        id: 'med-lisinopril',
        name: 'Zestril',
        genericName: 'Lisinopril',
        dosage: '20 mg',
        timeWindows: ['Morning'],
        pillVisual: {
          shape: 'round',
          primaryColor: '#F5C3A6',
          imprintCode: '20',
        },
        plainEnglishPurpose:
          'Relaxes blood vessels so blood pressure stays calm and steady all day.',
        foodRules: 'Take with a full glass of water, with or without breakfast.',
        missedDoseGuidance:
          'Take when remembered during the daytime. If it is already evening, gently wait until tomorrow morning—never double up.',
        highRiskCategory: 'blood_pressure',
        supplyRemaining: 24,
      },
      {
        id: 'med-vyvanse',
        name: 'Vyvanse',
        genericName: 'Lisdexamfetamine',
        dosage: '30 mg',
        timeWindows: ['Morning'],
        pillVisual: {
          shape: 'capsule',
          primaryColor: '#E67A45',
          secondaryColor: '#FFFDF8',
          imprintCode: 'S489 30',
        },
        plainEnglishPurpose:
          'Supports steady ADHD working memory, focus, and calm follow-through.',
        foodRules:
          'Best paired with a protein breakfast. Take before 10:30 AM to protect nighttime sleep.',
        missedDoseGuidance:
          'If it is past 12:30 PM, skip gently for today so tonight’s sleep stays restful, and resume tomorrow morning.',
        highRiskCategory: 'stimulant',
        supplyRemaining: 6,
      },
      {
        id: 'med-lipitor',
        name: 'Lipitor',
        genericName: 'Atorvastatin',
        dosage: '40 mg',
        timeWindows: ['Bedtime'],
        pillVisual: {
          shape: 'oval',
          primaryColor: '#F7F8FA',
          imprintCode: 'PD 157',
        },
        plainEnglishPurpose:
          'Gently lowers LDL cholesterol overnight to protect heart and arteries.',
        foodRules: 'Avoid grapefruit and grapefruit juice (orange juice is completely fine).',
        missedDoseGuidance:
          'If less than 12 hours until your next bedtime window, simply wait for tonight’s single tablet.',
        highRiskCategory: 'statin',
        supplyRemaining: 28,
      },
    ],
  },
  {
    id: 'profile-elena',
    name: 'Elena Rostova',
    relation: 'Mom • Care Circle',
    age: 68,
    conditions: [
      'ADHD Executive Fatigue',
      'Hypothyroidism',
      'Hypertension',
      'Deep Vein Thrombosis History',
    ],
    caregiverNotes: [
      'Synthroid sits on Mom’s nightstand with a covered water carafe—take first before morning coffee.',
      'Calcium chew stays in the lunch basket so it never collides with morning thyroid absorption.',
    ],
    medications: [
      {
        id: 'med-synthroid',
        name: 'Synthroid',
        genericName: 'Levothyroxine',
        dosage: '75 mcg',
        timeWindows: ['Morning'],
        pillVisual: {
          shape: 'round',
          primaryColor: '#C9B5E8',
          imprintCode: '75',
        },
        plainEnglishPurpose:
          'Restores steady thyroid hormone for daily energy, warmth, and mental clarity.',
        foodRules:
          'Empty stomach with plain water 45 minutes before coffee/breakfast; keep 4 hours away from calcium or iron.',
        missedDoseGuidance:
          'Take as soon as remembered if still morning or early afternoon; if near evening, check with pharmacist rather than doubling tomorrow.',
        highRiskCategory: 'thyroid',
        supplyRemaining: 21,
      },
      {
        id: 'med-amlodipine',
        name: 'Norvasc',
        genericName: 'Amlodipine',
        dosage: '5 mg',
        timeWindows: ['Morning'],
        pillVisual: {
          shape: 'octagon',
          primaryColor: '#F8FAFC',
          imprintCode: 'AML 5',
        },
        plainEnglishPurpose:
          'Keeps arterial pressure relaxed and gentle on the heart over 24 hours.',
        foodRules: 'Can be taken with breakfast once your Synthroid waiting window finishes.',
        missedDoseGuidance:
          'If more than 12 hours late, skip calmly and take your normal single tablet tomorrow morning.',
        highRiskCategory: 'blood_pressure',
        supplyRemaining: 5,
      },
      {
        id: 'med-warfarin',
        name: 'Coumadin',
        genericName: 'Warfarin Sodium',
        dosage: '2 mg',
        timeWindows: ['Evening'],
        pillVisual: {
          shape: 'oval',
          primaryColor: '#B89AD9',
          imprintCode: '2',
        },
        plainEnglishPurpose:
          'Prevents dangerous blood clots from forming in veins and circulation.',
        foodRules:
          'Keep leafy greens (spinach, kale, broccoli) steady week-to-week; avoid NSAID painkillers.',
        missedDoseGuidance:
          'If remembered the same evening, take 1 dose gently. If discovered the next day, do NOT double up—log a note and check with your clinic.',
        highRiskCategory: 'blood_thinner',
        supplyRemaining: 19,
      },
      {
        id: 'med-crestor',
        name: 'Crestor',
        genericName: 'Rosuvastatin',
        dosage: '10 mg',
        timeWindows: ['Evening'],
        pillVisual: {
          shape: 'round',
          primaryColor: '#F3B4C3',
          imprintCode: 'ZD4522',
        },
        plainEnglishPurpose:
          'Supports healthy cholesterol balance and long-term vascular health.',
        foodRules: 'With or without dinner. Avoid aluminum/magnesium antacids within 2 hours.',
        missedDoseGuidance:
          'Wait calmly for tomorrow evening’s normal tablet if less than 12 hours remain.',
        highRiskCategory: 'statin',
        supplyRemaining: 26,
      },
    ],
  },
];

export function createInitialDemoLogs(): DoseLog[] {
  const now = new Date();
  const todayEightFifteen = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    8,
    15,
    0
  );

  // If current local hour is past 8:30 AM, pre-log 1 morning dose with a memory anchor so users immediately see how anti-double-dose anchors look alongside open doses!
  const anchorTimestamp =
    now.getHours() >= 9
      ? todayEightFifteen.toISOString()
      : new Date(now.getTime() - 25 * 60 * 1000).toISOString();

  return [
    {
      id: 'demo-log-1',
      medicationId: 'med-lisinopril',
      profileId: 'profile-arthur',
      timeWindow: 'Morning',
      takenAtISO: anchorTimestamp,
      memoryAnchorCue: 'Flipped bottle cap upside-down',
    },
    {
      id: 'demo-log-2',
      medicationId: 'med-synthroid',
      profileId: 'profile-elena',
      timeWindow: 'Morning',
      takenAtISO: anchorTimestamp,
      memoryAnchorCue: 'Set water mug on left coaster',
    },
  ];
}
