import {
  CheckCircle2,
  ChevronDown,
  HelpCircle,
  LogOut,
  Sparkles,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  checkGeminiHealthApi,
  GeminiHealthStatus,
} from '../services/api';
import { triggerGentleFeedback } from '../services/audioService';
import { useActiveProfile, useHarborStore } from '../store/useHarborStore';

export const HarborHeader: React.FC = () => {
  const profiles = useHarborStore((s) => s.profiles);
  const activeProfile = useActiveProfile();
  const setActiveProfile = useHarborStore((s) => s.setActiveProfile);
  const brainFogMode = useHarborStore((s) => s.brainFogMode);
  const toggleBrainFogMode = useHarborStore((s) => s.toggleBrainFogMode);
  const reopenOnboarding = useHarborStore((s) => s.reopenOnboarding);
  const logoutCurrentPerson = useHarborStore((s) => s.logoutCurrentPerson);

  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [aiStatus, setAiStatus] = useState<GeminiHealthStatus | null>(null);

  useEffect(() => {
    let mounted = true;
    checkGeminiHealthApi().then((status) => {
      if (mounted) setAiStatus(status);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <>
      <header className="harbor-header">
        <div className="harbor-header-inner">
          {/* Left: Active Profile Menu */}
          <button
            type="button"
            className="profile-trigger"
            onClick={() => {
              triggerGentleFeedback();
              setSwitcherOpen(true);
            }}
            aria-label={`Active profile: ${activeProfile.name}`}
          >
            <span className="avatar-badge">
              {activeProfile.name[0]?.toUpperCase() || 'M'}
            </span>
            <span>{activeProfile.name.split(' ')[0]}</span>
            <ChevronDown size={15} color="var(--text-secondary)" />
          </button>

          {/* Right: Gemini Live Pill + Quick Guide + Aa Large Mode */}
          <div className="header-actions">
            {!brainFogMode && aiStatus && (
              <span
                title={
                  aiStatus.geminiConfigured
                    ? `Connected to Google Gemini (${aiStatus.model})`
                    : 'Offline Resilience Mode'
                }
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.28rem 0.65rem',
                  borderRadius: '999px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  background: aiStatus.geminiConfigured
                    ? 'var(--safe-soft)'
                    : 'var(--caution-soft)',
                  border: `1px solid ${
                    aiStatus.geminiConfigured
                      ? 'var(--safe-border)'
                      : 'var(--caution-border)'
                  }`,
                  color: aiStatus.geminiConfigured
                    ? 'var(--safe)'
                    : 'var(--caution)',
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: aiStatus.geminiConfigured
                      ? 'var(--safe)'
                      : 'var(--caution)',
                  }}
                />
                <span>
                  {aiStatus.geminiConfigured ? 'Gemini Live' : 'Offline Mode'}
                </span>
              </span>
            )}

            <button
              type="button"
              className="icon-circle-btn"
              onClick={() => {
                triggerGentleFeedback();
                setGuideOpen(true);
              }}
              aria-label="How HarborDose works"
              title="Quick Guide"
            >
              <HelpCircle size={18} />
            </button>

            <button
              type="button"
              className="aa-toggle-btn"
              data-active={brainFogMode}
              onClick={() => {
                triggerGentleFeedback(18);
                toggleBrainFogMode();
              }}
              aria-pressed={brainFogMode}
            >
              {brainFogMode && <Sparkles size={15} />}
              <span>Aa {brainFogMode ? 'Large ON' : 'Large'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Switch Profile & Log Out Modal */}
      {switcherOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="modal-backdrop"
            onClick={() => setSwitcherOpen(false)}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <h2 className="section-title" style={{ marginBottom: '0.9rem' }}>
                Active Profile
              </h2>

              <div style={{ display: 'grid', gap: '0.55rem' }}>
                {profiles.map((profile) => {
                  const selected = profile.id === activeProfile.id;
                  return (
                    <button
                      key={profile.id}
                      type="button"
                      onClick={() => {
                        triggerGentleFeedback();
                        setActiveProfile(profile.id);
                        setSwitcherOpen(false);
                      }}
                      style={{
                        minHeight: 'var(--min-touch)',
                        padding: '0.85rem 1rem',
                        borderRadius: '16px',
                        border: `1.5px solid ${
                          selected ? 'var(--accent)' : 'var(--border)'
                        }`,
                        background: selected
                          ? 'var(--accent-soft)'
                          : 'var(--bg-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        textAlign: 'left',
                        gap: '0.75rem',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: '1rem',
                            color: 'var(--text-primary)',
                          }}
                        >
                          {profile.name}
                        </div>
                        <div
                          style={{
                            fontSize: '0.8rem',
                            color: 'var(--text-secondary)',
                            marginTop: '0.15rem',
                          }}
                        >
                          {profile.relation} • {profile.medications.length} meds
                        </div>
                      </div>
                      {selected && (
                        <CheckCircle2 size={21} color="var(--accent)" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div
                style={{
                  height: 1,
                  background: 'var(--border)',
                  margin: '1rem 0',
                }}
              />

              <button
                type="button"
                className="btn-danger-soft"
                onClick={() => {
                  triggerGentleFeedback([20, 40]);
                  setSwitcherOpen(false);
                  logoutCurrentPerson();
                }}
              >
                <LogOut size={18} />
                <span>Log Out & Clear Profile</span>
              </button>
            </div>
          </div>,
          document.body
        )}

      {/* Quick Help Cheat Sheet */}
      {guideOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="modal-backdrop"
            onClick={() => setGuideOpen(false)}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <h2 className="page-title" style={{ fontSize: '1.45rem' }}>
                Quick Guide
              </h2>
              <p className="page-subtitle" style={{ marginBottom: '1.1rem' }}>
                HarborDose helps you take daily prescriptions safely without
                second-guessing.
              </p>

              <div style={{ display: 'grid', gap: '0.85rem' }}>
                {[
                  [
                    'Today',
                    'Tap "Take Dose" as you swallow each pill. It records the time + a physical habit so you never take two by mistake.',
                  ],
                  [
                    'Add Pill',
                    'Snap or upload a photo of any prescription bottle to add it automatically.',
                  ],
                  [
                    'Ask Safety',
                    'Check if painkillers (like Advil), coffee, or foods are safe with your meds.',
                  ],
                  [
                    'Family',
                    'Copy a 1-tap text update for family, manage profiles, or log out.',
                  ],
                ].map(([title, desc]) => (
                  <div key={title}>
                    <div
                      style={{
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        fontSize: '0.98rem',
                      }}
                    >
                      • {title}
                    </div>
                    <div
                      style={{
                        fontSize: '0.88rem',
                        color: 'var(--text-secondary)',
                        marginLeft: '0.85rem',
                        marginTop: '0.1rem',
                      }}
                    >
                      {desc}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gap: '0.6rem', marginTop: '1.35rem' }}>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setGuideOpen(false)}
                >
                  Got It
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setGuideOpen(false);
                    reopenOnboarding();
                  }}
                >
                  Replay Setup Walkthrough
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
