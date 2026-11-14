import {
  QuickCheckResult,
  RegimenAuditResult,
  SafetySeverity,
} from '@shared/types';
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Square,
  Volume2,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { AuxLabel } from '../components/AuxLabel';
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

const QUICK_CHIPS = ['Advil', 'Coffee', 'Grapefruit', 'Cold medicine'];

const SEVERITY_ICON = {
  critical: AlertCircle,
  caution: Clock,
  safe: Check,
} as const;

const SeverityHead: React.FC<{ severity: SafetySeverity; label: string }> = ({
  severity,
  label,
}) => {
  const Icon = SEVERITY_ICON[severity];
  return (
    <div className="severity-head" data-severity={severity}>
      <Icon size={20} className="shrink-0" />
      <span>{label}</span>
    </div>
  );
};

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
      <div className="mb-5">
        <h1 className="page-title">Is it safe with my meds?</h1>
        <p className="page-subtitle">
          Ask about any painkiller, drink, vitamin, or cold medicine before you
          take it.
        </p>
      </div>

      <div className="harbor-card">
        <form
          className="row-2"
          onSubmit={(e) => {
            e.preventDefault();
            handleRunQuickCheck(queryText);
          }}
        >
          <input
            type="text"
            id="safety-query"
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder="Advil, Tylenol, melatonin…"
            className="harbor-input"
          />
          <button type="submit" className="btn-primary btn-auto">
            Ask
          </button>
        </form>

        <div className="row-wrap mt-3">
          {QUICK_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              className="chip-pill"
              data-active={queryText.toLowerCase() === chip.toLowerCase()}
              onClick={() => handleRunQuickCheck(chip)}
            >
              {chip}
            </button>
          ))}
        </div>

        {checkingQuick && (
          <div className="row-2 mt-4">
            <div className="spinner" />
            <span className="t-cap ink-2">
              Checking against your prescriptions…
            </span>
          </div>
        )}

        {quickResult && !checkingQuick && (
          <div
            className="alert-card stack-2 mt-4"
            data-severity={quickResult.severity}
          >
            <SeverityHead
              severity={quickResult.severity}
              label={quickResult.verdictBadge}
            />

            <div className="t-body w-500">{quickResult.calmAnswer}</div>

            {!brainFogMode && (
              <div className="t-cap ink-2">{quickResult.whyItMatters}</div>
            )}

            <AuxLabel
              line={`What to do instead — ${quickResult.safeAlternativeOrTiming}`}
              kind={quickResult.severity === 'safe' ? 'safe' : 'caution'}
            />

            {/* The grounded claim, printed the way the label prints it */}
            {!brainFogMode &&
              quickResult.labelVerified &&
              quickResult.sourceQuote && (
                <AuxLabel
                  line="Verified word-for-word on the FDA label"
                  kind="info"
                  quote={quickResult.sourceQuote}
                  source={
                    quickResult.sourceDrug
                      ? `openFDA · ${quickResult.sourceDrug}`
                      : 'openFDA'
                  }
                />
              )}

            <button
              type="button"
              className="btn-quiet"
              data-active={speakingQuick}
              onClick={handleSpeakQuick}
            >
              {speakingQuick ? <Square size={16} /> : <Volume2 size={17} />}
              <span>{speakingQuick ? 'Stop audio' : 'Read aloud'}</span>
            </button>
          </div>
        )}
      </div>

      {activeProfile.medications.length > 0 && (
        <div>
          <button
            type="button"
            className="harbor-card row"
            onClick={handleToggleFullAudit}
            aria-expanded={auditOpen}
          >
            <span className="flex-1 stack-1">
              <span className="t-body w-600">
                Review all my medications together
              </span>
              <span className="label">
                Checks spacing across {activeProfile.medications.length}{' '}
                prescriptions
              </span>
            </span>
            {auditOpen ? (
              <ChevronUp size={20} className="shrink-0" />
            ) : (
              <ChevronDown size={20} className="shrink-0" />
            )}
          </button>

          {auditOpen && (
            <div className="stack-2">
              {auditLoading || !auditResult ? (
                <div className="harbor-card harbor-card--pad-lg center-col stack-2">
                  <div className="spinner" />
                  <span className="t-cap ink-2">
                    Checking daily schedule harmony…
                  </span>
                </div>
              ) : (
                auditResult.findings.map((finding) => (
                  <div
                    key={finding.id}
                    className="alert-card stack-2"
                    data-severity={finding.severity}
                  >
                    <SeverityHead
                      severity={finding.severity}
                      label={finding.title}
                    />
                    <div className="t-cap ink">{finding.actionableStep}</div>
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
