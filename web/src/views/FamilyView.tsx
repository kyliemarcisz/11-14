import { FamilyUpdateResult } from '@shared/types';
import { Check, Compass, Copy, LogOut, Plus, Trash2 } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { PillIllustration } from '../components/PillIllustration';
import { familyUpdateApi } from '../services/api';
import { triggerGentleFeedback } from '../services/audioService';
import {
  isSameLocalDay,
  useActiveProfile,
  useHarborStore,
} from '../store/useHarborStore';

export const FamilyView: React.FC = () => {
  const activeProfile = useActiveProfile();
  const profiles = useHarborStore((s) => s.profiles);
  const setActiveProfile = useHarborStore((s) => s.setActiveProfile);
  const allLogs = useHarborStore((s) => s.doseLogs);
  const refillMedication = useHarborStore((s) => s.refillMedication);
  const addPatientProfile = useHarborStore((s) => s.addPatientProfile);
  const removeProfileById = useHarborStore((s) => s.removeProfileById);
  const reopenOnboarding = useHarborStore((s) => s.reopenOnboarding);
  const logoutCurrentPerson = useHarborStore((s) => s.logoutCurrentPerson);

  const [generatingSms, setGeneratingSms] = useState(false);
  const [familyUpdate, setFamilyUpdate] = useState<FamilyUpdateResult | null>(
    null
  );
  const [copiedJustNow, setCopiedJustNow] = useState(false);

  const [newProfileModalOpen, setNewProfileModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRelation, setNewRelation] = useState('');

  const todayLogs = useMemo(
    () =>
      allLogs.filter(
        (l) => l.profileId === activeProfile.id && isSameLocalDay(l.takenAtISO)
      ),
    [allLogs, activeProfile.id]
  );

  const handleGenerateAndCopyUpdate = async () => {
    triggerGentleFeedback();
    setGeneratingSms(true);
    setCopiedJustNow(false);

    try {
      const result = await familyUpdateApi({
        patient: activeProfile,
        todayLogs,
        currentLocalTime: new Date().toLocaleTimeString([], {
          hour: 'numeric',
          minute: '2-digit',
        }),
      });
      setFamilyUpdate(result);

      try {
        await navigator.clipboard.writeText(result.smsText);
      } catch {
        // The text stays on screen to copy by hand.
      }

      triggerGentleFeedback([15, 30, 15]);
      setCopiedJustNow(true);
      window.setTimeout(() => setCopiedJustNow(false), 3500);
    } finally {
      setGeneratingSms(false);
    }
  };

  const handleCreateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    triggerGentleFeedback();
    addPatientProfile({
      name: newName,
      relation: newRelation || 'Family Member',
      age: 68,
      conditions: ['Daily Meds'],
    });
    setNewName('');
    setNewRelation('');
    setNewProfileModalOpen(false);
  };

  return (
    <section className="page-container">
      <h1 className="page-title mb-5">Family and profile</h1>

      {/* Share today's update */}
      <div className="harbor-card">
        <h2 className="section-title">Share today&rsquo;s update</h2>
        <p className="page-subtitle">
          Copies a short text summarizing the doses taken today, ready to paste
          into Messages or WhatsApp.
        </p>

        <button
          type="button"
          className="btn-primary mt-4"
          data-tone={copiedJustNow ? 'done' : undefined}
          disabled={generatingSms}
          onClick={handleGenerateAndCopyUpdate}
        >
          {generatingSms ? (
            <div className="spinner" data-on-accent="true" />
          ) : copiedJustNow ? (
            <Check size={19} />
          ) : (
            <Copy size={19} />
          )}
          <span>
            {generatingSms
              ? 'Writing the text…'
              : copiedJustNow
                ? 'Copied'
                : 'Copy family text update'}
          </span>
        </button>

        {familyUpdate && (
          <div className="transcript mt-3">{familyUpdate.smsText}</div>
        )}
      </div>

      {/* Pills remaining */}
      {activeProfile.medications.length > 0 && (
        <div className="harbor-card">
          <h2 className="section-title mb-4">Pills remaining</h2>

          <div className="stack-2">
            {activeProfile.medications.map((med) => {
              const isLow = med.supplyRemaining <= 7;
              return (
                <div
                  key={med.id}
                  className="supply-row"
                  data-low={isLow}
                >
                  <PillIllustration visual={med.pillVisual} size="sm" />
                  <div className="flex-1 stack-1">
                    <div className="t-cap w-600">{med.name}</div>
                    <div className="label nums">
                      {med.supplyRemaining} left{isLow ? ' · refill soon' : ''}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="chip-pill shrink-0"
                    onClick={() => {
                      triggerGentleFeedback();
                      refillMedication(activeProfile.id, med.id, 30);
                    }}
                    aria-label={`Add 30 tablets of ${med.name}`}
                  >
                    +30
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Saved profiles */}
      <div className="harbor-card">
        <div className="row-between mb-4">
          <h2 className="section-title">Saved profiles</h2>
          <button
            type="button"
            className="chip-pill shrink-0"
            data-tone="accent"
            onClick={() => {
              triggerGentleFeedback();
              setNewProfileModalOpen(true);
            }}
          >
            <Plus size={16} />
            <span>Add person</span>
          </button>
        </div>

        <div className="stack-2">
          {profiles.map((prof) => {
            const selected = prof.id === activeProfile.id;
            return (
              <div
                key={prof.id}
                className="profile-row"
                data-selected={selected}
              >
                <button
                  type="button"
                  className="profile-row__main"
                  onClick={() => {
                    triggerGentleFeedback();
                    setActiveProfile(prof.id);
                  }}
                >
                  <span className="flex-1 stack-1">
                    <span className="t-cap w-600">{prof.name}</span>
                    <span className="label">
                      {prof.relation} · {prof.medications.length} meds
                    </span>
                  </span>
                  {selected && <Check size={18} className="shrink-0" />}
                </button>

                {profiles.length > 1 && (
                  <button
                    type="button"
                    className="icon-btn-quiet"
                    onClick={() => {
                      triggerGentleFeedback();
                      removeProfileById(prof.id);
                    }}
                    aria-label={`Remove ${prof.name}`}
                  >
                    <Trash2 size={17} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="stack-2 mt-5">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              triggerGentleFeedback();
              reopenOnboarding();
            }}
          >
            <Compass size={18} />
            <span>Replay the welcome walkthrough</span>
          </button>

          <button
            type="button"
            className="btn-danger-soft"
            onClick={() => {
              triggerGentleFeedback([20, 40]);
              logoutCurrentPerson();
            }}
          >
            <LogOut size={18} />
            <span>Log out and remove my profile</span>
          </button>
        </div>
      </div>

      {/* Add person */}
      {newProfileModalOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setNewProfileModalOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <form
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleCreateProfile}
          >
            <h3 className="section-title">Add person</h3>
            <div className="stack mt-4">
              <div>
                <label className="field-label" htmlFor="new-person-name">
                  Name
                </label>
                <input
                  id="new-person-name"
                  type="text"
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Dad, or Elena"
                  className="harbor-input"
                />
              </div>
              <div>
                <label className="field-label" htmlFor="new-person-note">
                  Note
                </label>
                <input
                  id="new-person-note"
                  type="text"
                  value={newRelation}
                  onChange={(e) => setNewRelation(e.target.value)}
                  placeholder="Family schedule"
                  className="harbor-input"
                />
              </div>
            </div>

            <button type="submit" className="btn-primary mt-4">
              Save person
            </button>
          </form>
        </div>
      )}
    </section>
  );
};
