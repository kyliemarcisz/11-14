import { TimeWindow } from '@shared/types';
import { Camera, Coffee, Plus } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { DoseCard } from '../components/DoseCard';
import { TIME_WINDOWS } from '../data/demoProfiles';
import { triggerGentleFeedback } from '../services/audioService';
import {
  getSuggestedTimeWindow,
  isSameLocalDay,
  useActiveProfile,
  useHarborStore,
} from '../store/useHarborStore';

export const TodayView: React.FC = () => {
  const activeProfile = useActiveProfile();
  const allLogs = useHarborStore((s) => s.doseLogs);
  const setActiveTab = useHarborStore((s) => s.setActiveTab);
  const loadSampleProfiles = useHarborStore((s) => s.loadSampleProfiles);

  const [selectedWindow, setSelectedWindow] = useState<TimeWindow>(() => {
    const suggested = getSuggestedTimeWindow();
    const hasSuggested = activeProfile.medications.some((m) =>
      m.timeWindows.includes(suggested)
    );
    return hasSuggested ? suggested : 'Morning';
  });

  const todayLogs = useMemo(
    () =>
      allLogs.filter(
        (l) => l.profileId === activeProfile.id && isSameLocalDay(l.takenAtISO)
      ),
    [allLogs, activeProfile.id]
  );

  const totalScheduledToday = useMemo(
    () =>
      activeProfile.medications.reduce(
        (acc, med) => acc + med.timeWindows.length,
        0
      ),
    [activeProfile.medications]
  );

  const windowMeds = useMemo(
    () =>
      activeProfile.medications.filter((m) =>
        m.timeWindows.includes(selectedWindow)
      ),
    [activeProfile.medications, selectedWindow]
  );

  const progressRatio =
    totalScheduledToday > 0
      ? Math.min(1, todayLogs.length / totalScheduledToday)
      : 0;

  return (
    <section className="page-container">
      <div style={{ marginBottom: '1rem' }}>
        <h1 className="page-title">{selectedWindow} Pills</h1>

        {totalScheduledToday > 0 && (
          <div style={{ marginTop: '0.55rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.88rem',
                fontWeight: 600,
                color: 'var(--text-secondary)',
              }}
            >
              <span>
                {todayLogs.length} of {totalScheduledToday} taken today
              </span>
              {progressRatio >= 1 && (
                <span style={{ color: 'var(--safe)', fontWeight: 700 }}>
                  All complete ✓
                </span>
              )}
            </div>
            <div className="progress-track">
              <div
                className="progress-fill"
                data-complete={progressRatio >= 1}
                style={{ width: `${Math.round(progressRatio * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {activeProfile.medications.length === 0 ? (
        <div
          className="harbor-card"
          style={{
            padding: '2rem 1.5rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: '50%',
              background: 'var(--accent-soft)',
              color: 'var(--accent)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '0.9rem',
            }}
          >
            <Camera size={26} />
          </div>
          <h2 className="section-title" style={{ fontSize: '1.35rem' }}>
            Your schedule is ready
          </h2>
          <p className="page-subtitle" style={{ maxWidth: 400 }}>
            Snap or upload a photo of your first pill bottle and we’ll set up
            its time of day and visual match automatically.
          </p>

          <button
            type="button"
            className="btn-primary"
            style={{ marginTop: '1.25rem' }}
            onClick={() => setActiveTab('scan')}
          >
            <Plus size={20} />
            <span>Add First Medication</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerGentleFeedback();
              loadSampleProfiles();
            }}
            style={{
              marginTop: '0.85rem',
              fontSize: '0.88rem',
              fontWeight: 600,
              color: 'var(--accent)',
              padding: '0.4rem',
            }}
          >
            Or load sample prescriptions to explore
          </button>
        </div>
      ) : (
        <>
          {/* Segmented Time-Window Bar */}
          <div className="segmented-bar" role="tablist">
            {TIME_WINDOWS.map((win) => {
              const medsForWin = activeProfile.medications.filter((m) =>
                m.timeWindows.includes(win.key)
              );
              const allDone =
                medsForWin.length > 0 &&
                medsForWin.every((m) =>
                  todayLogs.some(
                    (l) => l.medicationId === m.id && l.timeWindow === win.key
                  )
                );
              const selected = selectedWindow === win.key;

              return (
                <button
                  key={win.key}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  className="segment-btn"
                  data-active={selected}
                  data-empty={!selected && medsForWin.length === 0}
                  onClick={() => {
                    triggerGentleFeedback();
                    setSelectedWindow(win.key);
                  }}
                >
                  <span>
                    {win.label}
                    {allDone ? ' ✓' : ''}
                  </span>
                </button>
              );
            })}
          </div>

          {windowMeds.length === 0 ? (
            <div
              className="harbor-card"
              style={{
                padding: '2.2rem 1.5rem',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <Coffee size={28} color="var(--accent)" />
              <div
                style={{
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  marginTop: '0.6rem',
                }}
              >
                No pills in the {selectedWindow}
              </div>
              <div
                style={{
                  fontSize: '0.9rem',
                  color: 'var(--text-secondary)',
                  marginTop: '0.25rem',
                }}
              >
                Select another time of day above whenever you need it.
              </div>
            </div>
          ) : (
            windowMeds.map((med) => {
              const logForWindow = todayLogs.find(
                (l) =>
                  l.medicationId === med.id && l.timeWindow === selectedWindow
              );
              return (
                <DoseCard
                  key={med.id}
                  medication={med}
                  patient={activeProfile}
                  timeWindow={selectedWindow}
                  existingLog={logForWindow}
                  todayLogs={todayLogs}
                />
              );
            })
          )}
        </>
      )}
    </section>
  );
};
