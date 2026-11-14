import {
  ArrowRight,
  Camera,
  CheckCircle2,
  Circle,
  Eye,
  Hand,
  Heart,
} from 'lucide-react';
import React, { useState } from 'react';
import { PillIllustration } from '../components/PillIllustration';
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
    <main
      className="app-shell"
      style={{
        justifyContent: 'center',
        padding: '2rem 1.25rem',
      }}
    >
      <div style={{ width: '100%', maxWidth: 540, margin: '0 auto' }}>
        {/* Progress Dots */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.4rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {[0, 1, 2].map((idx) => (
              <span
                key={idx}
                style={{
                  height: 8,
                  width: step === idx ? 28 : 8,
                  borderRadius: 4,
                  background:
                    step >= idx ? 'var(--accent)' : 'var(--border-strong)',
                  transition: 'all 200ms ease',
                }}
              />
            ))}
          </div>
          <span
            style={{
              fontSize: '0.8rem',
              fontWeight: 600,
              color: 'var(--text-secondary)',
            }}
          >
            Step {step + 1} of 3 • Saved locally
          </span>
        </div>

        {/* STEP 1: WHAT HARBORDOSE DOES */}
        {step === 0 && (
          <section style={{ animation: 'fadeSlideUp 220ms ease' }}>
            <div
              style={{
                display: 'inline-flex',
                padding: '0.7rem 1.1rem',
                borderRadius: '22px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <PillIllustration
                visual={{
                  shape: 'capsule',
                  primaryColor: '#2A7B6F',
                  secondaryColor: '#FFFDF8',
                  imprintCode: 'HARBOR',
                }}
                size="lg"
              />
            </div>

            <h1 className="page-title" style={{ marginTop: '1.25rem' }}>
              Welcome to HarborDose
            </h1>
            <p className="page-subtitle">
              A calm prescription tracker & safety companion built for ADHD
              working memory and family peace of mind.
            </p>

            <div
              className="harbor-card"
              style={{
                marginTop: '1.35rem',
                display: 'grid',
                gap: '1.1rem',
              }}
            >
              {[
                {
                  Icon: Eye,
                  bg: 'var(--accent-soft)',
                  fg: 'var(--accent)',
                  title: '1. Visual Pill Verification',
                  desc: 'Match the shape, color, and imprint code before swallowing.',
                },
                {
                  Icon: Hand,
                  bg: 'var(--safe-soft)',
                  fg: 'var(--safe)',
                  title: '2. Anti-Double-Dose Habit Cue',
                  desc: 'Log a physical habit (like flipping the cap) so you never take two.',
                },
                {
                  Icon: Camera,
                  bg: 'var(--accent-soft)',
                  fg: 'var(--accent)',
                  title: '3. AI Bottle Scanner & Safety Check',
                  desc: 'Snap any bottle or ask if Advil, coffee, or vitamins mix safely.',
                },
                {
                  Icon: Heart,
                  bg: 'var(--caution-soft)',
                  fg: 'var(--caution)',
                  title: '4. 1-Tap Caregiver Text Update',
                  desc: 'Share daily peace-of-mind updates without nagging phone calls.',
                },
              ].map(({ Icon, bg, fg, title, desc }) => (
                <div
                  key={title}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.9rem',
                  }}
                >
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: '50%',
                      background: bg,
                      color: fg,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    <Icon size={19} />
                  </div>
                  <div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: '0.98rem',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {title}
                    </div>
                    <div
                      style={{
                        fontSize: '0.88rem',
                        color: 'var(--text-secondary)',
                        marginTop: 2,
                      }}
                    >
                      {desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* STEP 2: ENTER YOUR NAME & PROFILE INFO */}
        {step === 1 && (
          <form
            onSubmit={handleNext}
            style={{ animation: 'fadeSlideUp 220ms ease' }}
          >
            <h1 className="page-title">Tell us about yourself</h1>
            <p className="page-subtitle">
              Stored privately in your browser—you can log out and clear it
              anytime.
            </p>

            <div
              className="harbor-card"
              style={{
                marginTop: '1.25rem',
                display: 'grid',
                gap: '1.15rem',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr',
                  gap: '0.75rem',
                }}
              >
                <div>
                  <label
                    htmlFor="onboard-name"
                    style={{
                      display: 'block',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      marginBottom: '0.4rem',
                    }}
                  >
                    Your Name *
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
                    placeholder="e.g., Nikhil"
                    className={`harbor-input ${
                      nameError ? 'harbor-input--error' : ''
                    }`}
                  />
                  {nameError && (
                    <div
                      style={{
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        color: 'var(--critical)',
                        marginTop: '0.3rem',
                      }}
                    >
                      Please enter your name to create your profile.
                    </div>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="onboard-age"
                    style={{
                      display: 'block',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      marginBottom: '0.4rem',
                    }}
                  >
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
                    className="harbor-input"
                  />
                </div>
              </div>

              {/* Role */}
              <div>
                <div
                  style={{
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    marginBottom: '0.45rem',
                  }}
                >
                  How are you using HarborDose?
                </div>
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  {ROLE_OPTIONS.map((role) => {
                    const active = userRole === role;
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => {
                          triggerGentleFeedback();
                          setUserRole(role);
                        }}
                        style={{
                          minHeight: 'var(--min-touch)',
                          padding: '0.65rem 0.95rem',
                          borderRadius: '14px',
                          border: `1.5px solid ${
                            active ? 'var(--accent)' : 'var(--border)'
                          }`,
                          background: active
                            ? 'var(--accent-soft)'
                            : 'var(--bg-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.65rem',
                          fontWeight: 600,
                          fontSize: '0.95rem',
                          color: 'var(--text-primary)',
                          textAlign: 'left',
                        }}
                      >
                        {active ? (
                          <CheckCircle2 size={19} color="var(--accent)" />
                        ) : (
                          <Circle size={19} color="var(--text-muted)" />
                        )}
                        <span>{role}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Health Focus Chips */}
              <div>
                <div
                  style={{
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    marginBottom: '0.45rem',
                  }}
                >
                  Health focus areas (helps tailor safety checks)
                </div>
                <div
                  style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}
                >
                  {CONDITION_CHIPS.map((chip) => {
                    const selected = selectedConditions.includes(chip);
                    return (
                      <button
                        key={chip}
                        type="button"
                        className="chip-pill"
                        data-active={selected}
                        onClick={() => toggleCondition(chip)}
                      >
                        {selected ? `✓ ${chip}` : chip}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </form>
        )}

        {/* STEP 3: CUSTOMIZE ROUTINE */}
        {step === 2 && (
          <section style={{ animation: 'fadeSlideUp 220ms ease' }}>
            <h1 className="page-title">
              Hi {userName.trim() || 'there'}, set your calm routine
            </h1>
            <p className="page-subtitle">
              Choose a tiny physical habit to pair with taking your pills so you
              never second-guess yourself:
            </p>

            <div
              className="harbor-card"
              style={{
                marginTop: '1.25rem',
                display: 'grid',
                gap: '1.1rem',
              }}
            >
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {MEMORY_ANCHOR_PRESETS.slice(0, 3).map((cue) => {
                  const chosen = !customCue.trim() && selectedCue === cue;
                  return (
                    <button
                      key={cue}
                      type="button"
                      onClick={() => {
                        triggerGentleFeedback();
                        setCustomCue('');
                        setSelectedCue(cue);
                      }}
                      style={{
                        minHeight: 'var(--min-touch)',
                        padding: '0.7rem 0.95rem',
                        borderRadius: '14px',
                        border: `1.5px solid ${
                          chosen ? 'var(--accent)' : 'var(--border)'
                        }`,
                        background: chosen
                          ? 'var(--accent-soft)'
                          : 'var(--bg-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.65rem',
                        fontWeight: 600,
                        fontSize: '0.95rem',
                        color: 'var(--text-primary)',
                        textAlign: 'left',
                      }}
                    >
                      {chosen ? (
                        <CheckCircle2 size={20} color="var(--accent)" />
                      ) : (
                        <Circle size={20} color="var(--text-muted)" />
                      )}
                      <span>{cue}</span>
                    </button>
                  );
                })}

                <input
                  type="text"
                  value={customCue}
                  onChange={(e) => setCustomCue(e.target.value)}
                  placeholder="Or type your own habit (e.g., Move bottle to left side)"
                  className="harbor-input"
                />
              </div>

              {/* Display Comfort */}
              <div>
                <div
                  style={{
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    marginBottom: '0.45rem',
                  }}
                >
                  Display comfort
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.6rem',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      triggerGentleFeedback();
                      setBrainFogMode(false);
                    }}
                    style={{
                      minHeight: 'var(--min-touch)',
                      borderRadius: '14px',
                      border: `1.5px solid ${
                        !brainFogMode ? 'var(--accent)' : 'var(--border)'
                      }`,
                      background: !brainFogMode
                        ? 'var(--accent)'
                        : 'var(--bg-primary)',
                      color: !brainFogMode ? '#ffffff' : 'var(--text-primary)',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                    }}
                  >
                    Standard
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      triggerGentleFeedback();
                      setBrainFogMode(true);
                    }}
                    style={{
                      minHeight: 'var(--min-touch)',
                      borderRadius: '14px',
                      border: `1.5px solid ${
                        brainFogMode ? 'var(--accent)' : 'var(--border)'
                      }`,
                      background: brainFogMode
                        ? 'var(--accent)'
                        : 'var(--bg-primary)',
                      color: brainFogMode ? '#ffffff' : 'var(--text-primary)',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                    }}
                  >
                    Aa Large & Simple
                  </button>
                </div>
              </div>

              {/* Starter Meds Toggle */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  padding: '0.85rem 1rem',
                  borderRadius: '16px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                }}
              >
                <div>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      color: 'var(--text-primary)',
                    }}
                  >
                    Include sample medications
                  </div>
                  <div
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--text-secondary)',
                      marginTop: '0.1rem',
                    }}
                  >
                    Uncheck to start with 0 pills and scan your own bottles.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={includeStarterMeds}
                  onChange={(e) => {
                    triggerGentleFeedback();
                    setIncludeStarterMeds(e.target.checked);
                  }}
                  style={{
                    width: 22,
                    height: 22,
                    accentColor: 'var(--accent)',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                />
              </label>
            </div>
          </section>
        )}

        {/* Navigation Footer */}
        <div
          style={{
            display: 'flex',
            gap: '0.65rem',
            marginTop: '1.1rem',
          }}
        >
          {step > 0 && (
            <button
              type="button"
              className="btn-secondary"
              style={{ width: 'auto', padding: '0 1.35rem' }}
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
            <span>
              {step < 2 ? 'Continue' : 'Save Profile & Open Harbor'}
            </span>
            <ArrowRight size={19} />
          </button>
        </div>
      </div>
    </main>
  );
};
