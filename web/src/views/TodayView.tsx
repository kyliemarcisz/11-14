import { Medication, TimeWindow } from '@shared/types';
import { Camera, Plus } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { AuxLabel } from '../components/AuxLabel';
import { DoseCard } from '../components/DoseCard';
import { TideStrip, TideWindow } from '../components/TideStrip';
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

  /** Which dose holds the hero slot. Null means "the first one still due". */
  const [focusedMedId, setFocusedMedId] = useState<string | null>(null);

  const todayLogs = useMemo(
    () =>
      allLogs.filter(
        (l) => l.profileId === activeProfile.id && isSameLocalDay(l.takenAtISO)
      ),
    [allLogs, activeProfile.id]
  );

  const windowMeds = useMemo(
    () =>
      activeProfile.medications.filter((m) =>
        m.timeWindows.includes(selectedWindow)
      ),
    [activeProfile.medications, selectedWindow]
  );

  const logFor = (med: Medication) =>
    todayLogs.find(
      (l) => l.medicationId === med.id && l.timeWindow === selectedWindow
    );

  const stillDue = windowMeds.filter((m) => !logFor(m));
  const alreadyTaken = windowMeds.filter((m) => logFor(m));

  /* The hero is the focused dose if it is still in this window, otherwise the
     first one still due, otherwise the first one taken — so a finished window
     shows an empty compartment rather than nothing at all. */
  const heroMed =
    windowMeds.find((m) => m.id === focusedMedId) ??
    stillDue[0] ??
    alreadyTaken[0];

  const queueMeds = windowMeds.filter((m) => m.id !== heroMed?.id);

  const tideWindows: TideWindow[] = useMemo(
    () =>
      TIME_WINDOWS.map((win) => {
        const meds = activeProfile.medications.filter((m) =>
          m.timeWindows.includes(win.key)
        );
        return {
          key: win.key,
          label: win.label,
          total: meds.length,
          done: meds.filter((m) =>
            todayLogs.some(
              (l) => l.medicationId === m.id && l.timeWindow === win.key
            )
          ).length,
        };
      }),
    [activeProfile.medications, todayLogs]
  );

  const totalScheduledToday = tideWindows.reduce((n, w) => n + w.total, 0);
  const totalTakenToday = tideWindows.reduce((n, w) => n + w.done, 0);
  const windowMeta = TIME_WINDOWS.find((w) => w.key === selectedWindow);

  const handleSelectWindow = (win: TimeWindow) => {
    triggerGentleFeedback();
    setSelectedWindow(win);
    setFocusedMedId(null);
  };

  /* ---- Nothing added yet ---- */
  if (activeProfile.medications.length === 0) {
    return (
      <section className="page-container">
        <div className="harbor-card harbor-card--pad-lg center-col">
          <div className="empty-badge">
            <Camera size={26} />
          </div>
          <h1 className="section-title mt-3">Your schedule is ready</h1>
          <p className="page-subtitle">
            Snap or upload a photo of your first pill bottle. We&rsquo;ll read
            the label and set its time of day for you.
          </p>

          <button
            type="button"
            className="btn-primary mt-5"
            onClick={() => setActiveTab('scan')}
          >
            <Plus size={20} />
            <span>Add first medication</span>
          </button>

          <button
            type="button"
            className="btn-ghost mt-2"
            onClick={() => {
              triggerGentleFeedback();
              loadSampleProfiles();
            }}
          >
            Or load sample prescriptions to explore
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="page-container">
      <div className="row-between mb-3">
        <h1 className="label">
          {windowMeta?.label ?? selectedWindow}
          {windowMeta ? ` · ${windowMeta.timeRange}` : ''}
        </h1>
        <span className="label nums shrink-0">
          {totalTakenToday} / {totalScheduledToday} today
        </span>
      </div>

      <div className="mb-5">
        <TideStrip
          windows={tideWindows}
          selected={selectedWindow}
          onSelect={handleSelectWindow}
        />
      </div>

      {windowMeds.length === 0 ? (
        <div className="harbor-card harbor-card--pad-lg center-col">
          <div className="section-title">
            Nothing scheduled this {windowMeta?.label.toLowerCase()}
          </div>
          <p className="page-subtitle">
            Pick another time of day above whenever you need it.
          </p>
        </div>
      ) : (
        <>
          {stillDue.length === 0 && (
            <div className="mb-3">
              <AuxLabel
                line={`All ${windowMeta?.label ?? selectedWindow} doses taken`}
                kind="safe"
              />
            </div>
          )}

          {heroMed && (
            <DoseCard
              key={`${heroMed.id}-${selectedWindow}`}
              medication={heroMed}
              patient={activeProfile}
              timeWindow={selectedWindow}
              existingLog={logFor(heroMed)}
              todayLogs={todayLogs}
              variant="hero"
              onTaken={(id) => setFocusedMedId(id)}
            />
          )}

          {/* The compartment stays empty in front of you until you move on. */}
          {heroMed && logFor(heroMed) && stillDue.length > 0 && (
            <button
              type="button"
              className="btn-primary mb-3"
              onClick={() => {
                triggerGentleFeedback();
                setFocusedMedId(stillDue[0].id);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              Next — {stillDue[0].name} {stillDue[0].dosage}
            </button>
          )}

          {queueMeds.length > 0 && (
            <div className="harbor-card">
              <div className="label mb-3">
                Also this {windowMeta?.label.toLowerCase()}
              </div>
              <div className="queue queue--flush">
                {queueMeds.map((med) => (
                  <DoseCard
                    key={`${med.id}-${selectedWindow}`}
                    medication={med}
                    patient={activeProfile}
                    timeWindow={selectedWindow}
                    existingLog={logFor(med)}
                    todayLogs={todayLogs}
                    variant="row"
                    onFocus={() => setFocusedMedId(med.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
};
