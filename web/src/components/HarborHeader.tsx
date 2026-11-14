import { Check, ChevronDown, HelpCircle, LogOut } from 'lucide-react';
import React, { useState } from 'react';
import { triggerGentleFeedback } from '../services/audioService';
import { useActiveProfile, useHarborStore } from '../store/useHarborStore';

const GUIDE_ENTRIES: Array<[string, string]> = [
  [
    'Today',
    'Tap “Took it” as you swallow each pill. It records the time and a physical habit, so you never take two by mistake.',
  ],
  [
    'Add Pill',
    'Snap or upload a photo of any prescription bottle to add it automatically.',
  ],
  [
    'Ask Safety',
    'Check whether a painkiller, coffee, or food is safe alongside your prescriptions.',
  ],
  ['Family', 'Copy a one-tap text update, manage profiles, or log out.'],
];

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

  return (
    <>
      <header className="harbor-header">
        <div className="harbor-header-inner">
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
            <span className="truncate">{activeProfile.name.split(' ')[0]}</span>
            <ChevronDown size={15} />
          </button>

          <div className="header-actions">
            <button
              type="button"
              className="icon-circle-btn"
              onClick={() => {
                triggerGentleFeedback();
                setGuideOpen(true);
              }}
              aria-label="How HarborDose works"
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
              <span>Aa {brainFogMode ? 'Large on' : 'Large'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Switch profile, or log out */}
      {switcherOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setSwitcherOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 className="section-title mb-4">Active profile</h2>

            <div className="stack-2">
              {profiles.map((profile) => {
                const selected = profile.id === activeProfile.id;
                return (
                  <button
                    key={profile.id}
                    type="button"
                    className="option"
                    data-selected={selected}
                    onClick={() => {
                      triggerGentleFeedback();
                      setActiveProfile(profile.id);
                      setSwitcherOpen(false);
                    }}
                  >
                    <span className="flex-1 stack-1">
                      <span className="t-body w-600">{profile.name}</span>
                      <span className="label">
                        {profile.relation} · {profile.medications.length} meds
                      </span>
                    </span>
                    {selected && <Check size={20} className="shrink-0" />}
                  </button>
                );
              })}
            </div>

            <hr className="divider" />

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
              <span>Log out and clear this profile</span>
            </button>
          </div>
        </div>
      )}

      {/* Quick guide */}
      {guideOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setGuideOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 className="section-title">Quick guide</h2>
            <p className="page-subtitle mb-5">
              HarborDose helps you take daily prescriptions without
              second-guessing yourself.
            </p>

            <div className="stack-4">
              {GUIDE_ENTRIES.map(([title, desc]) => (
                <div key={title}>
                  <div className="label">{title}</div>
                  <div className="t-cap ink-2 mt-2">{desc}</div>
                </div>
              ))}
            </div>

            <div className="stack-2 mt-5">
              <button
                type="button"
                className="btn-primary"
                onClick={() => setGuideOpen(false)}
              >
                Got it
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setGuideOpen(false);
                  reopenOnboarding();
                }}
              >
                Replay the setup walkthrough
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
