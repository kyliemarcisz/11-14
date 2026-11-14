import {
  QuickCheckResult,
  RegimenAuditResult,
  SafetySeverity,
} from '@shared/types';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  ShieldCheck,
  Sparkles,
  Square,
  Volume2,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { auditRegimenApi, quickCheckApi } from '../services/api';
import {
  playCalmReadout,
  stopCalmAudio,
  triggerGentleFeedback,
} from '../services/audioService';
import {
  isSameLocalDay,
  useActiveProfile,
  useHarborStore,
} from '../store/useHarborStore';

const QUICK_CHIPS = ['Advil', 'Coffee', 'Grapefruit', 'Cold Medicine'];

export const AskSafetyView: React.FC = () => {
  const activeProfile = useActiveProfile();
  const allLogs = useHarborStore((s) => s.doseLogs);
  const brainFogMode = useHarborStore((s) => s.brainFogMode);

  const [queryText, setQueryText] = useState('');
  const [checkingQuick, setCheckingQuick] = useState(false);
  const [quickResult, setQuickResult] = useState<QuickCheckResult | null>(null);
  const [speakingQuick, setSpeakingQuick] = useState(false);

  const [auditOpen, setAuditOpen] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditResult, setAuditResult] = useState<RegimenAuditResult | null>(
    null
  );

  const todayLogs = useMemo(
    () =>
      allLogs.filter(
        (l) => l.profileId === activeProfile.id && isSameLocalDay(l.takenAtISO)
      ),
    [allLogs, activeProfile.id]
  );

  const handleRunQuickCheck = async (itemText: string) => {
    const trimmed = itemText.trim();
    if (!trimmed) return;
    triggerGentleFeedback();
    setQueryText(trimmed);
    setCheckingQuick(true);
    setSpeakingQuick(false);
    stopCalmAudio();

    try {
      const res = await quickCheckApi({
        queryItem: trimmed,
        patient: activeProfile,
        todayLogs,
      });
      setQuickResult(res);
    } finally {
      setCheckingQuick(false);
    }
  };

  const handleToggleFullAudit = async () => {
    triggerGentleFeedback();
    if (auditOpen) {
      setAuditOpen(false);
      return;
    }
    setAuditOpen(true);
    setAuditLoading(true);
    try {
      const res = await auditRegimenApi(activeProfile);
      setAuditResult(res);
    } finally {
      setAuditLoading(false);
    }
  };

  const renderSeverityHeader = (sev: SafetySeverity, label: string) => {
    const color =
      sev === 'critical'
        ? 'var(--critical)'
        : sev === 'caution'
          ? 'var(--caution)'
          : 'var(--safe)';
    const Icon =
      sev === 'critical'
        ? AlertCircle
        : sev === 'caution'
          ? Clock
          : CheckCircle2;

    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          color,
          fontWeight: 800,
          fontSize: '1.08rem',
        }}
      >
        <Icon size={21} />
        <span>{label}</span>
      </div>
    );
  };

  const handleSpeakQuick = async () => {
    if (!quickResult) return;
    if (speakingQuick) {
      stopCalmAudio();
      setSpeakingQuick(false);
      return;
    }
    setSpeakingQuick(true);
    const script = `${quickResult.verdictBadge}. ${quickResult.calmAnswer} ${quickResult.safeAlternativeOrTiming}`;
    await playCalmReadout(script, () => setSpeakingQuick(false));
  };

  return (
    <section className="page-container">
      <div style={{ marginBottom: '1.15rem' }}>
        <h1 className="page-title">Is it safe with my meds?</h1>
        <p className="page-subtitle">
          Ask about any painkiller, drink, vitamin, or cold medicine before
          taking it.
        </p>
      </div>

      {/* Quick Search Card */}
      <div className="harbor-card">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleRunQuickCheck(queryText);
          }}
          style={{ display: 'flex', gap: '0.5rem' }}
        >
          <input
            type="text"
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder="Type e.g. Advil, Tylenol, melatonin..."
            className="harbor-input"
          />
          <button
            type="submit"
            className="btn-primary"
            style={{ width: 'auto', padding: '0 1.35rem' }}
          >
            Ask
          </button>
        </form>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.45rem',
            marginTop: '0.75rem',
          }}
        >
          {QUICK_CHIPS.map((chip) => {
            const active = queryText.toLowerCase() === chip.toLowerCase();
            return (
              <button
                key={chip}
                type="button"
                className="chip-pill"
                data-active={active}
                onClick={() => handleRunQuickCheck(chip)}
              >
                {chip}
              </button>
            );
          })}
        </div>

        {checkingQuick && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              marginTop: '1rem',
              color: 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.92rem',
            }}
          >
            <div className="spinner" />
            <span>Checking against your prescriptions...</span>
          </div>
        )}

        {quickResult && !checkingQuick && (
          <div
            className="alert-card"
            data-severity={quickResult.severity}
            style={{ marginTop: '1rem', display: 'grid', gap: '0.55rem' }}
          >
            {renderSeverityHeader(
              quickResult.severity,
              quickResult.verdictBadge
            )}

            <div
              style={{
                fontWeight: 700,
                fontSize: '1rem',
                color: 'var(--text-primary)',
              }}
            >
              {quickResult.calmAnswer}
            </div>

            {!brainFogMode && (
              <div
                style={{
                  fontSize: '0.9rem',
                  color: 'var(--text-primary)',
                }}
              >
                {quickResult.whyItMatters}
              </div>
            )}

            <div
              style={{
                fontSize: '0.9rem',
                fontWeight: 600,
                color: 'var(--accent)',
                marginTop: '0.15rem',
              }}
            >
              What to do instead: {quickResult.safeAlternativeOrTiming}
            </div>

            {!brainFogMode &&
              quickResult.labelVerified &&
              quickResult.sourceQuote && (
                <div
                  style={{
                    marginTop: '0.25rem',
                    padding: '0.65rem 0.75rem',
                    borderRadius: '12px',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    display: 'grid',
                    gap: '0.25rem',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      letterSpacing: '0.03em',
                      textTransform: 'uppercase',
                      color: 'var(--accent)',
                    }}
                  >
                    <ShieldCheck size={14} />
                    <span>
                      FDA Label Verified
                      {quickResult.sourceDrug
                        ? ` · ${quickResult.sourceDrug}`
                        : ''}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: '0.8rem',
                      fontStyle: 'italic',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.45,
                    }}
                  >
                    &ldquo;{quickResult.sourceQuote}&rdquo;
                  </div>
                </div>
              )}

            <button
              type="button"
              onClick={handleSpeakQuick}
              style={{
                minHeight: 'var(--min-touch)',
                marginTop: '0.35rem',
                borderRadius: '14px',
                border: '1px solid var(--border-strong)',
                background: speakingQuick ? 'var(--accent)' : 'var(--surface)',
                color: speakingQuick ? '#ffffff' : 'var(--text-primary)',
                fontWeight: 700,
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
              }}
            >
              {speakingQuick ? (
                <Square size={16} />
              ) : (
                <Volume2 size={17} color="var(--accent)" />
              )}
              <span>{speakingQuick ? 'Stop Audio' : 'Read Aloud'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Expandable Full Regimen Harmony Audit */}
      {activeProfile.medications.length > 0 && (
        <div>
          <button
            type="button"
            className="harbor-card"
            onClick={handleToggleFullAudit}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              textAlign: 'left',
              marginBottom: '0.75rem',
            }}
          >
            <Sparkles size={20} color="var(--accent)" />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: '1rem',
                  color: 'var(--text-primary)',
                }}
              >
                Review all my medications together
              </div>
              <div
                style={{
                  fontSize: '0.82rem',
                  color: 'var(--text-secondary)',
                  marginTop: '0.1rem',
                }}
              >
                Checks spacing rules across your{' '}
                {activeProfile.medications.length} prescriptions
              </div>
            </div>
            {auditOpen ? (
              <ChevronUp size={20} color="var(--text-secondary)" />
            ) : (
              <ChevronDown size={20} color="var(--text-secondary)" />
            )}
          </button>

          {auditOpen && (
            <div style={{ display: 'grid', gap: '0.65rem' }}>
              {auditLoading || !auditResult ? (
                <div
                  className="harbor-card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '1.75rem',
                  }}
                >
                  <div className="spinner" />
                  <span
                    style={{
                      fontSize: '0.9rem',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    Checking daily schedule harmony...
                  </span>
                </div>
              ) : (
                auditResult.findings.map((finding) => (
                  <div
                    key={finding.id}
                    className="alert-card"
                    data-severity={finding.severity}
                  >
                    {renderSeverityHeader(finding.severity, finding.title)}
                    <div
                      style={{
                        fontSize: '0.9rem',
                        color: 'var(--text-primary)',
                        marginTop: '0.35rem',
                      }}
                    >
                      {finding.actionableStep}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
