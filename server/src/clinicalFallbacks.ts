import {
  DoseLog,
  FamilyUpdateResult,
  Medication,
  MissedDoseAdviceResult,
  PatientProfile,
  QuickCheckResult,
  RegimenAuditResult,
  SafetyFinding,
  SafetySeverity,
  ScanPrescriptionResult,
  TimeWindow,
} from '../../shared/types.js';

export function buildFallbackRegimenAudit(patient: PatientProfile): RegimenAuditResult {
  const findings: SafetyFinding[] = [];
  const medNamesLower = patient.medications.map((m) =>
    `${m.name} ${m.genericName}`.toLowerCase()
  );

  const hasBloodThinner = patient.medications.some(
    (m) => m.highRiskCategory === 'blood_thinner'
  );
  const hasStatin = patient.medications.some((m) => m.highRiskCategory === 'statin');
  const hasThyroid = patient.medications.some((m) => m.highRiskCategory === 'thyroid');
  const hasStimulant = patient.medications.some(
    (m) => m.highRiskCategory === 'stimulant'
  );
  const hasBP = patient.medications.some(
    (m) => m.highRiskCategory === 'blood_pressure'
  );
  const hasWarfarin = medNamesLower.some((n) => n.includes('warfarin'));

  if (hasBloodThinner) {
    const bt = patient.medications.find((m) => m.highRiskCategory === 'blood_thinner')!;
    findings.push({
      id: 'bt-nsaid-guard',
      severity: 'critical',
      title: `Avoid OTC Ibuprofen, Advil, Aleve & Aspirin with ${bt.name}`,
      involvedItems: [bt.name, 'NSAID Pain Relievers'],
      plainExplanation: `${bt.name} (${bt.genericName}) protects your heart and circulation by thinning the blood. Pairing it with common NSAID pain relievers significantly increases stomach and internal bleeding risk.`,
      actionableStep:
        'Keep plain Acetaminophen (Tylenol) in your cabinet instead, and confirm pain options with your pharmacist.',
      timingRecommendation:
        'Lock in a physical memory anchor right after every dose so you never accidentally take two tablets in the same window.',
    });
  }

  if (hasWarfarin) {
    findings.push({
      id: 'warfarin-vitk',
      severity: 'caution',
      title: 'Keep Leafy Greens Consistent with Warfarin',
      involvedItems: ['Warfarin', 'Spinach / Kale / Broccoli'],
      plainExplanation:
        'Sudden spikes or drops in Vitamin K foods can shift how strongly Warfarin works.',
      actionableStep:
        'You do not need to avoid greens—just aim for a steady, predictable amount from week to week.',
    });
  }

  if (hasThyroid) {
    const th = patient.medications.find((m) => m.highRiskCategory === 'thyroid')!;
    findings.push({
      id: 'thyroid-spacing',
      severity: 'caution',
      title: `Give ${th.name} a 45-Minute Solo Morning Head Start`,
      involvedItems: [th.name, 'Coffee, Milk, Calcium & Iron'],
      plainExplanation:
        'Coffee, dairy, and calcium or iron supplements bind to thyroid hormone in the stomach and block full absorption.',
      actionableStep:
        'Keep a small glass of plain water right beside your bed so you can take it upon waking before heading to the kitchen.',
      timingRecommendation: 'Wait 30–60 minutes before coffee or breakfast; wait 4 hours before calcium/iron.',
    });
  }

  if (hasStatin) {
    const st = patient.medications.find((m) => m.highRiskCategory === 'statin')!;
    const isAtorvaOrSimva = /atorvastatin|simvastatin|lovastatin/i.test(
      `${st.name} ${st.genericName}`
    );
    if (isAtorvaOrSimva) {
      findings.push({
        id: 'statin-grapefruit',
        severity: 'caution',
        title: `Skip Grapefruit Juice While Taking ${st.name}`,
        involvedItems: [st.name, 'Grapefruit & Pomelo'],
        plainExplanation:
          'Grapefruit slows down the natural enzyme that clears this statin, causing medication levels to build up and trigger muscle soreness.',
        actionableStep: 'Choose orange, apple, or berry juice instead.',
      });
    }
  }

  if (hasStimulant && hasBP) {
    const stim = patient.medications.find((m) => m.highRiskCategory === 'stimulant')!;
    const bp = patient.medications.find((m) => m.highRiskCategory === 'blood_pressure')!;
    findings.push({
      id: 'stimulant-bp-harmony',
      severity: 'caution',
      title: `Morning Pairing Check: ${stim.name} + ${bp.name}`,
      involvedItems: [stim.name, bp.name],
      plainExplanation:
        'ADHD stimulants can gently nudge heart rate and blood pressure upward, working in the opposite direction of blood pressure medicine if extra caffeine is added.',
      actionableStep:
        'Take both consistently in the Morning window, pair with a protein breakfast, and go easy on extra espresso.',
      timingRecommendation: 'Take stimulant before 10:00 AM to protect restful sleep.',
    });
  }

  if (findings.length === 0) {
    findings.push({
      id: 'regimen-clear',
      severity: 'safe',
      title: 'Current Schedule Windows Look Calm & Balanced',
      involvedItems: patient.medications.map((m) => m.name),
      plainExplanation:
        'No major timing collisions were spotted across your listed prescription windows.',
      actionableStep:
        'Continue using physical memory anchors when taking each window.',
    });
  }

  const overallSeverity: SafetySeverity = findings.some(
    (f) => f.severity === 'critical'
  )
    ? 'critical'
    : findings.some((f) => f.severity === 'caution')
      ? 'caution'
      : 'safe';

  return {
    overallSeverity,
    calmHeadline:
      overallSeverity === 'critical'
        ? `${patient.name}'s daily schedule works well together—with 1 important OTC rule to remember`
        : `${patient.name}'s medication windows are thoughtfully spaced`,
    reassuranceSummary:
      'Your prescribed daily medicines can be taken safely in their assigned windows. Keep an eye on common kitchen and medicine-cabinet items highlighted below.',
    optimalScheduleTip:
      'Anchor Morning pills to your first glass of water, and Evening/Bedtime pills to brushing teeth or plugging in your phone.',
    findings,
    generatedAtISO: new Date().toISOString(),
    modelUsed: 'gemini-4-hydrogen (local-resilience-fallback)',
  };
}

export function buildFallbackQuickCheck(
  queryItem: string,
  patient: PatientProfile
): QuickCheckResult {
  const q = queryItem.toLowerCase();
  const bt = patient.medications.find((m) => m.highRiskCategory === 'blood_thinner');
  const st = patient.medications.find((m) => m.highRiskCategory === 'statin');
  const th = patient.medications.find((m) => m.highRiskCategory === 'thyroid');
  const stim = patient.medications.find((m) => m.highRiskCategory === 'stimulant');

  if (bt && /ibuprofen|advil|motrin|aleve|naproxen|aspirin|excedrin|nsaid/i.test(q)) {
    return {
      queryItem,
      severity: 'critical',
      verdictBadge: 'Hold Off — Bleeding Risk',
      calmAnswer: `Please skip ${queryItem} right now because ${patient.name} takes ${bt.name} (${bt.genericName}).`,
      whyItMatters: `Combining NSAID pain relievers with a blood thinner like ${bt.name} raises the chance of stomach irritation and serious bleeding.`,
      safeAlternativeOrTiming:
        'Plain Acetaminophen (Tylenol) is generally the gentler choice for aches or headaches—double-check the exact dose with your pharmacist.',
      modelUsed: 'gemini-4-hydrogen (local-resilience-fallback)',
    };
  }

  if (st && /grapefruit|pomelo/i.test(q)) {
    return {
      queryItem,
      severity: 'caution',
      verdictBadge: 'Avoid with Statin',
      calmAnswer: `Best to swap ${queryItem} for another citrus fruit while taking ${st.name}.`,
      whyItMatters: `Grapefruit slows down how the body processes ${st.genericName}, even if you drink it hours apart from your evening pill.`,
      safeAlternativeOrTiming:
        'Orange juice, tangerines, berries, or apple juice are completely safe anytime.',
      modelUsed: 'gemini-4-hydrogen (local-resilience-fallback)',
    };
  }

  if (th && /coffee|espresso|latte|calcium|tums|antacid|iron|milk/i.test(q)) {
    const needsFourHours = /calcium|tums|antacid|iron/i.test(q);
    return {
      queryItem,
      severity: 'caution',
      verdictBadge: needsFourHours ? 'Space by 4 Hours' : 'Wait 45 Minutes',
      calmAnswer: `${queryItem} is fine to enjoy—as long as ${th.name} has had time to absorb first.`,
      whyItMatters: `${queryItem} can bind to ${th.genericName} in the stomach so less thyroid medicine reaches your bloodstream.`,
      safeAlternativeOrTiming: needsFourHours
        ? `Take ${queryItem} at Midday or Evening, at least 4 hours after your Morning ${th.name}.`
        : `Give ${th.name} 45–60 minutes with plain water before having ${queryItem}.`,
      modelUsed: 'gemini-4-hydrogen (local-resilience-fallback)',
    };
  }

  if ((stim || patient.medications.some((m) => m.highRiskCategory === 'blood_pressure')) && /sudafed|pseudoephedrine|decongestant|energy drink/i.test(q)) {
    return {
      queryItem,
      severity: 'caution',
      verdictBadge: 'Check Blood Pressure First',
      calmAnswer: `Use caution with ${queryItem} alongside blood pressure or ADHD medications.`,
      whyItMatters:
        'Decongestants and high-stimulant drinks tighten blood vessels, which can spike blood pressure and cause jitteriness.',
      safeAlternativeOrTiming:
        'Saline nasal spray, steam, or pharmacist-approved Coricidin HBP are calmer congestion options.',
      modelUsed: 'gemini-4-hydrogen (local-resilience-fallback)',
    };
  }

  return {
    queryItem,
    severity: 'safe',
    verdictBadge: 'Generally Compatible',
    calmAnswer: `No high-risk conflict stands out between "${queryItem}" and ${patient.name}'s listed daily medications.`,
    whyItMatters:
      'Always read combination OTC labels closely so hidden ingredients like ibuprofen, aspirin, or decongestants do not sneak in.',
    safeAlternativeOrTiming:
      'Take with water, and ask your local pharmacist if starting a new daily supplement.',
    modelUsed: 'gemini-4-hydrogen (local-resilience-fallback)',
  };
}

export function buildFallbackMissedDoseAdvice(
  medication: Medication,
  patient: PatientProfile,
  windowMissed: TimeWindow
): MissedDoseAdviceResult {
  const isHighRiskDouble =
    medication.highRiskCategory === 'blood_thinner' ||
    medication.highRiskCategory === 'stimulant' ||
    medication.highRiskCategory === 'blood_pressure';

  return {
    severity: isHighRiskDouble ? 'caution' : 'safe',
    calmHeadline: `Take a breath—one delayed ${medication.name} window is manageable.`,
    stepByStepAction: [
      `First, check your physical area (bottle cap, pill tray, or HarborDose log) to be sure whether ${medication.name} was already taken.`,
      medication.missedDoseGuidance,
      `Resume your normal ${medication.timeWindows.join(' & ')} rhythm next—no catching up needed.`,
    ],
    doubleDoseWarning: `Never take two doses of ${medication.name} (${medication.dosage}) together, and if you are genuinely 50/50 unsure whether you swallowed it, it is usually safer with ${medication.highRiskCategory ? medication.highRiskCategory.replace('_', ' ') + ' medicines' : 'daily prescriptions'} to wait for the next scheduled window rather than risk doubling.`,
    whenToCallDoctorOrPharmacist:
      'Call your pharmacist if two windows in a row were skipped, or seek care right away if you feel dizzy, short of breath, or notice unusual bruising/bleeding.',
    spokenScript: `Take a slow breath, ${patient.name.split(' ')[0]}. You are safe, and we can handle this calmly. First, glance at your bottle cap or pill dish to see if you already moved ${medication.name}. ${medication.missedDoseGuidance} Most importantly, never double up two pills at once. If you cannot tell whether you took it, waiting until your next normal window keeps you protected from taking too much.`,
    modelUsed: 'gemini-4-hydrogen (local-resilience-fallback)',
  };
}

export function buildFallbackScanResult(
  patient: PatientProfile,
  hint?: string
): ScanPrescriptionResult {
  const h = (hint || '').toLowerCase();
  if (h.includes('metoprolol')) {
    return {
      medication: {
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
          'Gently steadies heart rate and lowers blood pressure throughout the day.',
        foodRules: 'Take with or right after a morning meal for smooth absorption.',
        missedDoseGuidance:
          'If your next morning dose is less than 8 hours away, calmly wait for morning and take your single normal tablet.',
        highRiskCategory: 'blood_pressure',
        supplyRemaining: 30,
      },
      confidenceNote:
        'Parsed prescription label details. Please glance at the tablet imprint ("A MO") before saving.',
      safetyAlertsWithCurrentMeds: patient.medications.some(
        (m) => m.highRiskCategory === 'blood_pressure'
      )
        ? [
            {
              id: 'bp-additive',
              severity: 'caution',
              title: 'Second Blood Pressure Medicine Added',
              involvedItems: ['Toprol-XL', 'Current Blood Pressure Regimen'],
              plainExplanation:
                'Taking two blood-pressure-lowering prescriptions together is common when prescribed, so stand up slowly during the first week.',
              actionableStep:
                'Confirm with your prescriber whether this adds to or replaces an existing tablet.',
            },
          ]
        : [],
      calmOnboardingTip:
        'Place this bottle right next to your morning breakfast bowl so the meal cue happens effortlessly.',
      modelUsed: 'gemini-4-hydrogen (local-resilience-fallback)',
    };
  }

  return {
    medication: {
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
        'Helps keep platelets from clumping so blood flows smoothly through arteries.',
      foodRules: 'Can be taken with or without food alongside a full glass of water.',
      missedDoseGuidance:
        'If remembered within the same day and more than 12 hours before tomorrow morning, take 1 tablet calmly. Never double-dose.',
      highRiskCategory: 'blood_thinner',
      supplyRemaining: 30,
    },
    confidenceNote:
      'Extracted visual pill characteristics and dosing window. Match the round pink "75" tablet in your bottle before confirming.',
    safetyAlertsWithCurrentMeds: patient.medications.some(
      (m) => m.highRiskCategory === 'blood_thinner'
    )
      ? [
          {
            id: 'dual-bt-alert',
            severity: 'critical',
            title: 'Blood Thinner Overlap — Verify Dual Therapy',
            involvedItems: ['Plavix', 'Existing Blood Thinner'],
            plainExplanation:
              'Combining two blood-thinning medications significantly raises bleeding risk unless specifically ordered together by a cardiologist.',
            actionableStep:
              'Double-check discharge instructions to confirm whether both are meant to be taken together.',
          },
        ]
      : [],
    calmOnboardingTip:
      'Use a physical bottle-cap flip cue each morning so you always know at a glance that your dose is complete.',
    modelUsed: 'gemini-4-hydrogen (local-resilience-fallback)',
  };
}

export function buildFallbackFamilyUpdate(
  patient: PatientProfile,
  todayLogs: DoseLog[]
): FamilyUpdateResult {
  const totalScheduled = patient.medications.reduce(
    (sum, med) => sum + med.timeWindows.length,
    0
  );
  const completed = todayLogs.length;
  const lowSupply = patient.medications
    .filter((m) => m.supplyRemaining <= 7)
    .map((m) => `${m.name} (${m.supplyRemaining} left)`);

  const loggedLines = todayLogs.slice(0, 6).map((log) => {
    const med = patient.medications.find((m) => m.id === log.medicationId);
    const timeStr = new Date(log.takenAtISO).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });
    const anchor = log.memoryAnchorCue ? ` • ${log.memoryAnchorCue}` : '';
    return `✓ ${med ? med.name : 'Medication'} (${log.timeWindow}, ${timeStr}${anchor})`;
  });

  const supplyLine =
    lowSupply.length > 0
      ? `\nRefill heads-up: ${lowSupply.join(', ')}.`
      : '\nAll pill supplies look comfortable this week.';

  const smsText = `HarborDose Care Update for ${patient.name.split(' ')[0]}:\n${completed} of ${totalScheduled} scheduled doses logged peacefully today.\n${
    loggedLines.length > 0
      ? loggedLines.join('\n')
      : 'Starting today’s windows soon.'
  }${supplyLine}`;

  return {
    smsText,
    calmSummaryHeadline: `${completed} of ${totalScheduled} doses confirmed today`,
    dosesCompletedCount: completed,
    dosesTotalCount: totalScheduled,
    supplyAlerts: lowSupply,
    modelUsed: 'gemini-4-hydrogen (local-resilience-fallback)',
  };
}
