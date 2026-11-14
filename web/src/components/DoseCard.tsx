import {
  DoseLog,
  Medication,
  MissedDoseAdviceResult,
  PatientProfile,
  TimeWindow,
} from '@shared/types';
import {
  Check,
  CheckCircle2,
  Hand,
  Square,
  Volume2,
} from 'lucide-react';
import React, { useState } from 'react';
import { MEMORY_ANCHOR_PRESETS } from '../data/demoProfiles';
import { missedDoseAdviceApi } from '../services/api';
import {
  playCalmReadout,
  stopCalmAudio,
  triggerGentleFeedback,
} from '../services/audioService';
import { useHarborStore } from '../store/useHarborStore';
import { PillIllustration } from './PillIllustration';

interface DoseCardProps {
  medication: Medication;
  patient: PatientProfile;
  timeWindow: TimeWindow;
  existingLog?: DoseLog;
  todayLogs: DoseLog[];
}

export const DoseCard: React.FC<DoseCardProps> = ({
  medication,
  patient,
  timeWindow,
  existingLog,
  todayLogs,
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
    ? new Date(existingLog.takenAtISO).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      })
    : '';

  return (
    <>
      <article
        className={`harbor-card ${isTaken ? 'harbor-card--taken' : ''}`}
      >
        {/* Top Row: SVG Pill + Name/Dosage */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.95rem',
          }}
        >
          <button
            type="button"
            onClick={() => {
              triggerGentleFeedback();
              setInspectModalOpen(true);
            }}
            style={{
              padding: '0.5rem 0.65rem',
              borderRadius: '16px',
              border: '1px solid var(--border)',
              background: 'var(--bg-primary)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
            title={`Inspect ${medication.name} pill`}
          >
            <PillIllustration visual={medication.pillVisual} size="sm" />
          </button>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h3
              style={{
                margin: 0,
                fontSize: '1.35rem',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: 'var(--text-primary)',
              }}
            >
              {medication.name}
            </h3>
            <div
              style={{
                fontSize: '0.96rem',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginTop: '0.1rem',
              }}
            >
              {medication.dosage}
              {showSecondary ? ` • ${medication.genericName}` : ''}
            </div>
            {showSecondary && !isTaken && (
              <div
                style={{
                  fontSize: '0.82rem',
                  color: 'var(--text-secondary)',
                  marginTop: '0.28rem',
                }}
              >
                {medication.foodRules}
              </div>
            )}
          </div>
        </div>

        {/* Taken Confirmation OR Primary Take Button */}
        {isTaken && existingLog ? (
          <div style={{ marginTop: '0.95rem', display: 'grid', gap: '0.55rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  color: 'var(--safe)',
                  fontWeight: 700,
                  fontSize: '0.98rem',
                }}
              >
                <CheckCircle2 size={20} />
                <span>Taken at {takenTimeFormatted}</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  triggerGentleFeedback();
                  undoDoseLog(existingLog.id);
                }}
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  padding: '0.25rem 0.4rem',
                }}
              >
                Undo
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                triggerGentleFeedback();
                setShowCueModal(true);
              }}
              style={{
                minHeight: 'var(--min-touch)',
                padding: '0.5rem 0.85rem',
                borderRadius: '12px',
                border: '1px solid var(--safe-border)',
                background: 'var(--surface)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.55rem',
                textAlign: 'left',
              }}
            >
              <Hand size={16} color="var(--safe)" />
              <span
                style={{
                  flex: 1,
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                }}
              >
                {existingLog.memoryAnchorCue || defaultMemoryCue}
              </span>
              <span
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: 'var(--accent)',
                }}
              >
                Change
              </span>
            </button>
          </div>
        ) : (
          <div style={{ marginTop: '1rem' }}>
            <button
              type="button"
              className="btn-primary"
              onClick={handleTakeDose}
            >
              <Check size={20} strokeWidth={2.6} />
              <span>Take Dose</span>
            </button>

            <button
              type="button"
              onClick={openGentleRecovery}
              style={{
                width: '100%',
                minHeight: brainFogMode ? '64px' : '36px',
                marginTop: '0.4rem',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                textAlign: 'center',
              }}
            >
              Running late or not sure if you already took this?
            </button>
          </div>
        )}
      </article>

      {/* Change Physical Habit Cue Modal */}
      {showCueModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowCueModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="section-title">Which physical habit did you do?</h3>
            <p className="page-subtitle" style={{ marginBottom: '1rem' }}>
              Helps you verify later without guessing.
            </p>
            <div style={{ display: 'grid', gap: '0.55rem' }}>
              {MEMORY_ANCHOR_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    triggerGentleFeedback();
                    if (existingLog) {
                      updateDoseAnchor(existingLog.id, preset);
                    }
                    setShowCueModal(false);
                  }}
                  style={{
                    minHeight: 'var(--min-touch)',
                    padding: '0.75rem 1rem',
                    borderRadius: '14px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-primary)',
                    textAlign: 'left',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    color: 'var(--text-primary)',
                  }}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Pill Visual Zoom Modal */}
      {inspectModalOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setInspectModalOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="page-title" style={{ fontSize: '1.4rem' }}>
              {medication.name} ({medication.dosage})
            </h3>
            <p className="page-subtitle" style={{ marginBottom: '1.1rem' }}>
              {medication.plainEnglishPurpose}
            </p>

            <div
              style={{
                padding: '1.25rem',
                borderRadius: '18px',
                border: '1px solid var(--border)',
                background: 'var(--bg-primary)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <PillIllustration visual={medication.pillVisual} size="lg" />
              <div
                style={{
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  color: 'var(--text-primary)',
                  marginTop: '0.5rem',
                }}
              >
                {medication.pillVisual.shape.toUpperCase()} • Imprint “
                {medication.pillVisual.imprintCode}”
              </div>
            </div>

            <button
              type="button"
              className="btn-primary"
              style={{ marginTop: '1.15rem' }}
              onClick={() => setInspectModalOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Calm Zero-Shame Gemini Recovery Modal */}
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
            <h3 className="page-title" style={{ fontSize: '1.4rem' }}>
              {medication.name} — Calm Next Step
            </h3>

            {recoveryLoading || !recoveryAdvice ? (
              <div
                style={{
                  padding: '2rem 0',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.75rem',
                }}
              >
                <div className="spinner" />
                <span
                  style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}
                >
                  Checking safe guidance...
                </span>
              </div>
            ) : (
              <div
                style={{
                  marginTop: '0.9rem',
                  display: 'grid',
                  gap: '0.85rem',
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: '1rem',
                    color: 'var(--text-primary)',
                  }}
                >
                  {recoveryAdvice.calmHeadline}
                </div>

                <button
                  type="button"
                  onClick={() => handleSpeakAdvice(recoveryAdvice.spokenScript)}
                  style={{
                    minHeight: 'var(--min-touch)',
                    borderRadius: '14px',
                    border: '1px solid var(--accent-border)',
                    background: isSpeaking
                      ? 'var(--accent)'
                      : 'var(--accent-soft)',
                    color: isSpeaking ? '#ffffff' : 'var(--accent)',
                    fontWeight: 700,
                    fontSize: '0.92rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                  }}
                >
                  {isSpeaking ? <Square size={16} /> : <Volume2 size={18} />}
                  <span>{isSpeaking ? 'Stop Audio' : 'Read Aloud Gently'}</span>
                </button>

                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  {recoveryAdvice.stepByStepAction.map((step, idx) => (
                    <div
                      key={idx}
                      style={{
                        fontSize: '0.92rem',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <strong>{idx + 1}. </strong>
                      {step}
                    </div>
                  ))}
                </div>

                <div className="alert-card" data-severity="caution">
                  <div
                    style={{
                      fontSize: '0.88rem',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {recoveryAdvice.doubleDoseWarning}
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              className="btn-primary"
              style={{
                marginTop: '1.15rem',
                background: 'var(--text-primary)',
              }}
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
