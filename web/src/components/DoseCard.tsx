import {
  DoseLog,
  HighRiskCategory,
  Medication,
  MissedDoseAdviceResult,
  PatientProfile,
  TimeWindow,
} from '@shared/types';
import { Hand, Square, Volume2 } from 'lucide-react';
import React, { useState } from 'react';
import { MEMORY_ANCHOR_PRESETS } from '../data/demoProfiles';
import { missedDoseAdviceApi } from '../services/api';
import {
  playCalmReadout,
  stopCalmAudio,
  triggerGentleFeedback,
} from '../services/audioService';
import { useHarborStore } from '../store/useHarborStore';
import { AuxKind, AuxLabel } from './AuxLabel';
import { DoseWell } from './DoseWell';
import { PillIllustration } from './PillIllustration';

interface DoseCardProps {
  medication: Medication;
  patient: PatientProfile;
  timeWindow: TimeWindow;
  existingLog?: DoseLog;
  todayLogs: DoseLog[];
  /** 'hero' is the one dose in focus; 'row' is a demoted queue entry. */
  variant?: 'hero' | 'row';
  /** Promote this dose to the hero slot. */
  onFocus?: () => void;
  /** Fired after logging, so the hero can stay put and show the empty compartment. */
  onTaken?: (medicationId: string) => void;
}

/**
 * A high-risk sticker earns its place only when the directions line does not
 * already say the same thing. Printing "avoid Advil" twice is noise.
 */
const RISK_OVERLAP: Record<HighRiskCategory, RegExp> = {
  blood_thinner: /advil|ibuprofen|nsaid|motrin|aleve/i,
  statin: /grapefruit/i,
  stimulant: /sleep|before \d|a\.?m\.?\b/i,
  blood_pressure: /dizz|stand|rise/i,
  thyroid: /calcium|iron|empty stomach/i,
};

/** The auxiliary sticker a high-risk class earns, in a pharmacist's words. */
const RISK_STICKERS: Record<
  HighRiskCategory,
  { line: string; kind: AuxKind }
> = {
  blood_thinner: {
    line: 'Bleeding risk — avoid Advil, Motrin and Aleve',
    kind: 'critical',
  },
  statin: {
    line: 'Avoid grapefruit and grapefruit juice',
    kind: 'caution',
  },
  stimulant: {
    line: 'May affect sleep — take early in the day',
    kind: 'caution',
  },
  blood_pressure: {
    line: 'Rise slowly from sitting to avoid dizziness',
    kind: 'caution',
  },
  thyroid: {
    line: 'Empty stomach — space 4 hours from calcium and iron',
    kind: 'caution',
  },
};

/** Directions that tell you to avoid something get the warning bar. */
function kindForFoodRules(foodRules: string): AuxKind {
  return /\b(avoid|never|don.?t|do not|skip)\b/i.test(foodRules)
    ? 'caution'
    : 'info';
}

function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export const DoseCard: React.FC<DoseCardProps> = ({
  medication,
  patient,
  timeWindow,
  existingLog,
  todayLogs,
  variant = 'hero',
  onFocus,
  onTaken,
}) => {
  const brainFogMode = useHarborStore((s) => s.brainFogMode);
  const logDose = useHarborStore((s) => s.logDose);
  const defaultMemoryCue = useHarborStore((s) => s.defaultMemoryCue);
  const updateDoseAnchor = useHarborStore((s) => s.updateDoseAnchor);
  const undoDoseLog = useHarborStore((s) => s.undoDoseLog);

  const [showCueModal, setShowCueModal] = useState(false);
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [recoveryModalOpen, setRecoveryModalOpen] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryAdvice, setRecoveryAdvice] =
    useState<MissedDoseAdviceResult | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const isTaken = Boolean(existingLog);
  const showSecondary = !brainFogMode;

  const handleTakeDose = () => {
    triggerGentleFeedback([15, 30, 15]);
    logDose({
      medicationId: medication.id,
      profileId: patient.id,
      timeWindow,
      memoryAnchorCue: defaultMemoryCue,
    });
    onTaken?.(medication.id);
  };

  const openGentleRecovery = async () => {
    triggerGentleFeedback();
    setRecoveryModalOpen(true);
    setRecoveryLoading(true);
    try {
      const advice = await missedDoseAdviceApi({
        medication,
        patient,
        windowMissed: timeWindow,
        currentLocalTime: new Date().toLocaleTimeString([], {
          hour: 'numeric',
          minute: '2-digit',
        }),
        todayLogs,
        unsureIfTaken: true,
      });
      setRecoveryAdvice(advice);
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleSpeakAdvice = async (script: string) => {
    if (isSpeaking) {
      stopCalmAudio();
      setIsSpeaking(false);
      return;
    }
    setIsSpeaking(true);
    await playCalmReadout(script, () => setIsSpeaking(false));
  };

  const takenTimeFormatted = existingLog
    ? formatClock(existingLog.takenAtISO)
    : '';

  /* ---------------------------------------------------------
     Queue row: a demoted entry. Tapping it takes the hero slot.
     --------------------------------------------------------- */
  if (variant === 'row') {
    return (
      <button
        type="button"
        className="queue__row"
        data-taken={isTaken}
        onClick={() => {
          triggerGentleFeedback();
          onFocus?.();
        }}
      >
        <span
          className="pill-dot"
          style={{ background: medication.pillVisual.primaryColor }}
          aria-hidden="true"
        />
        <span className="queue__name">
          {medication.name} {medication.dosage}
        </span>
        <span className="queue__when">
          {isTaken ? `Taken ${takenTimeFormatted}` : 'Due'}
        </span>
      </button>
    );
  }

  /* ---------------------------------------------------------
     Hero: the one dose the screen is about.
     --------------------------------------------------------- */
  const riskCategory = medication.highRiskCategory;
  const riskSticker =
    riskCategory && !RISK_OVERLAP[riskCategory].test(medication.foodRules)
      ? RISK_STICKERS[riskCategory]
      : null;

  return (
    <>
      <article className="harbor-card">
        <DoseWell
          visual={medication.pillVisual}
          taken={isTaken}
          size="hero"
          onClick={() => {
            triggerGentleFeedback();
            setInspectModalOpen(true);
          }}
          actionLabel={`Inspect the ${medication.name} tablet up close`}
        />

        <div className="mt-4">
          <h2 className="dose-name">{medication.name}</h2>
          <div className="dose-meta">
            {medication.dosage}
            {showSecondary ? ` · ${medication.genericName}` : ''}
            {medication.pillVisual.imprintCode
              ? ` · ${medication.pillVisual.imprintCode}`
              : ''}
          </div>
        </div>

        {isTaken && existingLog ? (
          <div className="stack-2 mt-4">
            <div className="aux" data-kind="safe">
              <div className="aux__bar" />
              <div className="aux__body">
                <div className="aux__line">
                  Logged {takenTimeFormatted}
                </div>
              </div>
            </div>

            <button
              type="button"
              className="btn-quiet"
              onClick={() => {
                triggerGentleFeedback();
                setShowCueModal(true);
              }}
            >
              <Hand size={16} />
              <span className="flex-1 truncate">
                {existingLog.memoryAnchorCue || defaultMemoryCue}
              </span>
              <span className="label">Change</span>
            </button>

            <button
              type="button"
              className="btn-ghost btn-ghost--wide"
              onClick={() => {
                triggerGentleFeedback();
                undoDoseLog(existingLog.id);
              }}
            >
              Undo this dose
            </button>
          </div>
        ) : (
          <>
            <div className="stack-2 mt-3">
              <AuxLabel
                line={medication.foodRules}
                kind={kindForFoodRules(medication.foodRules)}
              />
              {showSecondary && riskSticker && (
                <AuxLabel line={riskSticker.line} kind={riskSticker.kind} />
              )}
            </div>

            <button type="button" className="btn-primary mt-4" onClick={handleTakeDose}>
              Took it
            </button>

            <button
              type="button"
              className="btn-ghost btn-ghost--wide mt-2"
              onClick={openGentleRecovery}
            >
              Running late, or not sure if you already took this?
            </button>
          </>
        )}
      </article>

      {/* Which physical habit did you do? */}
      {showCueModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowCueModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="section-title">
              Which physical habit did you do?
            </h3>
            <p className="page-subtitle mb-4">
              Helps you verify later without guessing.
            </p>
            <div className="stack-2">
              {MEMORY_ANCHOR_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className="option"
                  data-selected={existingLog?.memoryAnchorCue === preset}
                  onClick={() => {
                    triggerGentleFeedback();
                    if (existingLog) {
                      updateDoseAnchor(existingLog.id, preset);
                    }
                    setShowCueModal(false);
                  }}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* The tablet, up close */}
      {inspectModalOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setInspectModalOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="section-title">
              {medication.name} {medication.dosage}
            </h3>
            <p className="page-subtitle mb-4">
              {medication.plainEnglishPurpose}
            </p>

            <div className="well">
              <div className="well__content">
                <PillIllustration visual={medication.pillVisual} size="lg" />
              </div>
            </div>

            <div className="label mt-3">
              {medication.pillVisual.shape} · imprint{' '}
              {medication.pillVisual.imprintCode || 'none'}
            </div>

            <button
              type="button"
              className="btn-secondary mt-4"
              onClick={() => setInspectModalOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Calm next step */}
      {recoveryModalOpen && (
        <div
          className="modal-backdrop"
          onClick={() => {
            stopCalmAudio();
            setIsSpeaking(false);
            setRecoveryModalOpen(false);
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="section-title">
              {medication.name} — calm next step
            </h3>

            {recoveryLoading || !recoveryAdvice ? (
              <div className="center-col stack-2 mt-5">
                <div className="spinner" />
                <span className="t-cap ink-2">Checking safe guidance…</span>
              </div>
            ) : (
              <div className="stack mt-4">
                <div className="t-body w-600">
                  {recoveryAdvice.calmHeadline}
                </div>

                <button
                  type="button"
                  className="btn-quiet"
                  data-active={isSpeaking}
                  onClick={() => handleSpeakAdvice(recoveryAdvice.spokenScript)}
                >
                  {isSpeaking ? <Square size={16} /> : <Volume2 size={18} />}
                  <span>{isSpeaking ? 'Stop audio' : 'Read aloud gently'}</span>
                </button>

                <ol className="recovery-steps">
                  {recoveryAdvice.stepByStepAction.map((step, idx) => (
                    <li key={idx} className="t-cap ink">
                      {step}
                    </li>
                  ))}
                </ol>

                <AuxLabel
                  line={recoveryAdvice.doubleDoseWarning}
                  kind="critical"
                />
              </div>
            )}

            <button
              type="button"
              className="btn-primary mt-4"
              data-tone="neutral"
              onClick={() => {
                stopCalmAudio();
                setIsSpeaking(false);
                setRecoveryModalOpen(false);
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
};
