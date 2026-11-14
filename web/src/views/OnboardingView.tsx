import { ArrowRight, Camera, Check, Circle, Eye, Hand, Heart } from 'lucide-react';
import React, { useState } from 'react';
import { DoseWell } from '../components/DoseWell';
import { MEMORY_ANCHOR_PRESETS } from '../data/demoProfiles';
import { triggerGentleFeedback } from '../services/audioService';
import { useHarborStore } from '../store/useHarborStore';

const ROLE_OPTIONS = [
  'For Myself',
  'Helping a Parent / Loved One',
  'Shared With Family',
];

const CONDITION_CHIPS = [
  'ADHD / Working Memory',
  'Blood Thinners',
  'Blood Pressure',
  'Cholesterol',
  'Thyroid',
  'Daily Supplements',
];

const FEATURES: Array<{
  Icon: typeof Eye;
  tone: 'accent' | 'safe' | 'caution' | 'neutral';
  title: string;
  desc: string;
}> = [
  {
    Icon: Eye,
    tone: 'accent',
    title: 'Visual pill verification',
    desc: 'Match the shape, colour, and imprint code before you swallow it.',
  },
  {
    Icon: Hand,
    tone: 'safe',
    title: 'Anti-double-dose habit cue',
    desc: 'Log a physical habit — flipping the cap — so you never take two.',
  },
  {
    Icon: Camera,
    tone: 'accent',
    title: 'Bottle scanner and safety check',
    desc: 'Snap any bottle, or ask whether Advil, coffee, or vitamins mix safely.',
  },
  {
    Icon: Heart,
    tone: 'caution',
    title: 'One-tap caregiver update',
    desc: 'Share a daily update without the nagging phone call.',
  },
];

export const OnboardingView: React.FC = () => {
  const completeOnboarding = useHarborStore((s) => s.completeOnboarding);
  const brainFogMode = useHarborStore((s) => s.brainFogMode);
  const setBrainFogMode = useHarborStore((s) => s.setBrainFogMode);

  const [step, setStep] = useState<0 | 1 | 2>(0);

  const [userName, setUserName] = useState('');
  const [nameError, setNameError] = useState(false);
  const [userAge, setUserAge] = useState('');
  const [userRole, setUserRole] = useState(ROLE_OPTIONS[0]);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([
    'ADHD / Working Memory',
  ]);

  const [selectedCue, setSelectedCue] = useState(MEMORY_ANCHOR_PRESETS[0]);
  const [customCue, setCustomCue] = useState('');
  const [includeStarterMeds, setIncludeStarterMeds] = useState(true);

  const toggleCondition = (chip: string) => {
    triggerGentleFeedback();
    setSelectedConditions((prev) =>
      prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip]
    );
  };

  const handleNext = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (step === 0) {
      triggerGentleFeedback();
      setStep(1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (step === 1) {
      if (!userName.trim()) {
        triggerGentleFeedback([25, 30]);
        setNameError(true);
        return;
      }
      triggerGentleFeedback();
      setNameError(false);
      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    triggerGentleFeedback([15, 30, 15]);
    const parsedAge = parseInt(userAge, 10);
    completeOnboarding({
      userName: userName.trim(),
      userAge: !Number.isNaN(parsedAge) && parsedAge > 0 ? parsedAge : 65,
      userRole,
      conditions: selectedConditions,
      includeStarterMeds,
      brainFogMode,
      defaultMemoryCue: customCue.trim() || selectedCue,
    });
  };

  return (
    <main className="onboard-shell">
      <div className="onboard-inner">
        <div className="row-between mb-5">
          <div className="row-2" aria-hidden="true">
            {[0, 1, 2].map((idx) => (
              <span
                key={idx}
                className="step-dot"
                data-state={
                  step === idx ? 'active' : step > idx ? 'done' : 'todo'
                }
              />
            ))}
          </div>
          <span className="label shrink-0">
            Step {step + 1} of 3 · saved locally
          </span>
        </div>

        {/* 1 — what this does */}
        {step === 0 && (
          <section>
            <DoseWell
              visual={{
                shape: 'capsule',
                primaryColor: '#C06A14',
                secondaryColor: '#FFFDF8',
                imprintCode: 'HARBOR',
              }}
              taken={false}
              size="hero"
            />

            <h1 className="page-title mt-5">Welcome to HarborDose</h1>
            <p className="page-subtitle">
              A calm prescription tracker and safety companion, built for ADHD
              working memory and family peace of mind.
            </p>

            <div className="harbor-card stack-4 mt-5">
              {FEATURES.map(({ Icon, tone, title, desc }) => (
                <div key={title} className="row-top">
                  <div className="feature-badge" data-tone={tone}>
                    <Icon size={19} />
                  </div>
                  <div className="min-0">
                    <div className="t-body w-600">{title}</div>
                    <div className="t-cap ink-2 mt-1">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 2 — who you are */}
        {step === 1 && (
          <form onSubmit={handleNext}>
            <h1 className="page-title">Tell us about yourself</h1>
            <p className="page-subtitle">
              Stored privately in this browser. You can log out and clear it
              whenever you like.
            </p>

            <div className="harbor-card stack-5 mt-5">
              <div className="name-age-grid">
                <div>
                  <label className="field-label" htmlFor="onboard-name">
                    Your name
                  </label>
                  <input
                    id="onboard-name"
                    type="text"
                    autoFocus
                    value={userName}
                    onChange={(e) => {
                      setUserName(e.target.value);
                      if (nameError && e.target.value.trim()) {
                        setNameError(false);
                      }
                    }}
                    placeholder="Nikhil"
                    className={`harbor-input${
                      nameError ? ' harbor-input--error' : ''
                    }`}
                    aria-invalid={nameError}
                    aria-describedby={nameError ? 'onboard-name-error' : undefined}
                  />
                  {nameError && (
                    <div className="field-error" id="onboard-name-error">
                      Enter your name to create the profile.
                    </div>
                  )}
                </div>

                <div>
                  <label className="field-label" htmlFor="onboard-age">
                    Age
                  </label>
                  <input
                    id="onboard-age"
                    type="number"
                    min={1}
                    max={120}
                    value={userAge}
                    onChange={(e) => setUserAge(e.target.value)}
                    placeholder="68"
                    className="harbor-input nums"
                  />
                </div>
              </div>

              <div>
                <div className="field-label">How are you using HarborDose?</div>
                <div className="stack-2">
                  {ROLE_OPTIONS.map((role) => {
                    const active = userRole === role;
                    return (
                      <button
                        key={role}
                        type="button"
                        className="option"
                        data-selected={active}
                        onClick={() => {
                          triggerGentleFeedback();
                          setUserRole(role);
                        }}
                      >
                        {active ? (
                          <Check size={19} className="shrink-0" />
                        ) : (
                          <Circle size={19} className="shrink-0 ink-3" />
                        )}
                        <span>{role}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="field-label">
                  Health focus areas — tailors the safety checks
                </div>
                <div className="row-wrap">
                  {CONDITION_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      className="chip-pill"
                      data-active={selectedConditions.includes(chip)}
                      aria-pressed={selectedConditions.includes(chip)}
                      onClick={() => toggleCondition(chip)}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </form>
        )}

        {/* 3 — the routine */}
        {step === 2 && (
          <section>
            <h1 className="page-title">
              Hi {userName.trim() || 'there'}, set your routine
            </h1>
            <p className="page-subtitle">
              Pick a small physical habit to pair with taking your pills, so you
              never have to second-guess yourself.
            </p>

            <div className="harbor-card stack-5 mt-5">
              <div className="stack-2">
                {MEMORY_ANCHOR_PRESETS.slice(0, 3).map((cue) => {
                  const chosen = !customCue.trim() && selectedCue === cue;
                  return (
                    <button
                      key={cue}
                      type="button"
                      className="option"
                      data-selected={chosen}
                      onClick={() => {
                        triggerGentleFeedback();
                        setCustomCue('');
                        setSelectedCue(cue);
                      }}
                    >
                      {chosen ? (
                        <Check size={20} className="shrink-0" />
                      ) : (
                        <Circle size={20} className="shrink-0 ink-3" />
                      )}
                      <span>{cue}</span>
                    </button>
                  );
                })}

                <input
                  type="text"
                  id="custom-cue"
                  value={customCue}
                  onChange={(e) => setCustomCue(e.target.value)}
                  placeholder="Or type your own — move the bottle to the left"
                  className="harbor-input"
                />
              </div>

              <div>
                <div className="field-label">Display comfort</div>
                <div className="grid-2">
                  <button
                    type="button"
                    className="option"
                    data-selected={!brainFogMode}
                    onClick={() => {
                      triggerGentleFeedback();
                      setBrainFogMode(false);
                    }}
                  >
                    Standard
                  </button>
                  <button
                    type="button"
                    className="option"
                    data-selected={brainFogMode}
                    onClick={() => {
                      triggerGentleFeedback();
                      setBrainFogMode(true);
                    }}
                  >
                    Aa Large
                  </button>
                </div>
              </div>

              <label className="toggle-row" htmlFor="starter-meds">
                <span className="min-0 stack-1">
                  <span className="t-cap w-600">Include sample medications</span>
                  <span className="label">
                    Uncheck to start empty and scan your own bottles
                  </span>
                </span>
                <input
                  id="starter-meds"
                  type="checkbox"
                  className="harbor-check"
                  checked={includeStarterMeds}
                  onChange={(e) => {
                    triggerGentleFeedback();
                    setIncludeStarterMeds(e.target.checked);
                  }}
                />
              </label>
            </div>
          </section>
        )}

        <div className="row-2 mt-4">
          {step > 0 && (
            <button
              type="button"
              className="btn-secondary btn-auto"
              onClick={() => {
                triggerGentleFeedback();
                setStep((s) => (s - 1) as 0 | 1 | 2);
              }}
            >
              Back
            </button>
          )}
          <button
            type="button"
            className="btn-primary"
            onClick={() => handleNext()}
          >
            <span>{step < 2 ? 'Continue' : 'Save and open Harbor'}</span>
            <ArrowRight size={19} />
          </button>
        </div>
      </div>
    </main>
  );
};
