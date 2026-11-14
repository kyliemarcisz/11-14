import { FamilyUpdateResult } from '@shared/types';
import {
  CheckCircle2,
  Compass,
  Copy,
  LogOut,
  Plus,
  Trash2,
} from 'lucide-react';
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
        // Ignore clipboard fallback
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
      <div style={{ marginBottom: '1.15rem' }}>
        <h1 className="page-title">Family & Profile</h1>
      </div>

      {/* 1. Share Today's Update */}
      <div className="harbor-card">
        <h2 className="section-title">Share Today’s Update</h2>
        <p className="page-subtitle" style={{ fontSize: '0.92rem' }}>
          Copies a calm text message summarizing today’s taken doses so you can
          paste it into iMessage or WhatsApp.
        </p>

        <button
          type="button"
          className={`btn-primary ${copiedJustNow ? 'btn-safe' : ''}`}
          style={{ marginTop: '1rem' }}
          disabled={generatingSms}
          onClick={handleGenerateAndCopyUpdate}
        >
          {generatingSms ? (
            <div
              className="spinner"
              style={{
                width: 18,
                height: 18,
                borderWidth: 2,
                borderTopColor: '#ffffff',
              }}
            />
          ) : copiedJustNow ? (
            <CheckCircle2 size={19} />
          ) : (
            <Copy size={19} />
          )}
          <span>
            {generatingSms
              ? 'Creating Text...'
              : copiedJustNow
                ? 'Copied to Clipboard!'
                : 'Copy Family Text Update'}
          </span>
        </button>

        {familyUpdate && (
          <div
            style={{
              marginTop: '0.9rem',
              padding: '0.9rem 1rem',
              borderRadius: '14px',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              whiteSpace: 'pre-wrap',
              fontSize: '0.9rem',
              color: 'var(--text-primary)',
            }}
          >
            {familyUpdate.smsText}
          </div>
        )}
      </div>

      {/* 2. Pills Remaining */}
      {activeProfile.medications.length > 0 && (
        <div className="harbor-card">
          <h2 className="section-title" style={{ marginBottom: '0.85rem' }}>
            Pills Remaining
          </h2>

          <div style={{ display: 'grid', gap: '0.6rem' }}>
            {activeProfile.medications.map((med) => {
              const isLow = med.supplyRemaining <= 7;
              return (
                <div
                  key={med.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.65rem 0.8rem',
                    borderRadius: '16px',
                    background: isLow
                      ? 'var(--caution-soft)'
                      : 'var(--bg-primary)',
                    border: `1px solid ${
                      isLow ? 'var(--caution-border)' : 'var(--border)'
                    }`,
                  }}
                >
                  <PillIllustration visual={med.pillVisual} size="sm" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: '0.98rem',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {med.name}
                    </div>
                    <div
                      style={{
                        fontSize: '0.8rem',
                        fontWeight: isLow ? 700 : 500,
                        color: isLow
                          ? 'var(--caution)'
                          : 'var(--text-secondary)',
                      }}
                    >
                      {med.supplyRemaining} left
                      {isLow ? ' • Refill soon' : ''}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      triggerGentleFeedback();
                      refillMedication(activeProfile.id, med.id, 30);
                    }}
                    style={{
                      minHeight: 'calc(var(--min-touch) - 6px)',
                      padding: '0 0.85rem',
                      borderRadius: '12px',
                      border: '1px solid var(--border-strong)',
                      background: 'var(--surface)',
                      color: 'var(--accent)',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                    }}
                  >
                    +30
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Saved Profiles & Account */}
      <div className="harbor-card">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '0.85rem',
          }}
        >
          <h2 className="section-title">Saved Profiles</h2>
          <button
            type="button"
            className="chip-pill"
            style={{
              background: 'var(--accent-soft)',
              borderColor: 'var(--accent-border)',
              color: 'var(--accent)',
              fontWeight: 700,
            }}
            onClick={() => {
              triggerGentleFeedback();
              setNewProfileModalOpen(true);
            }}
          >
            <Plus size={16} />
            <span>Add Person</span>
          </button>
        </div>

        <div style={{ display: 'grid', gap: '0.55rem' }}>
          {profiles.map((prof) => {
            const selected = prof.id === activeProfile.id;
            return (
              <div
                key={prof.id}
                style={{
                  minHeight: 'var(--min-touch)',
                  padding: '0.6rem 0.9rem',
                  borderRadius: '14px',
                  border: `1.5px solid ${
                    selected ? 'var(--accent)' : 'var(--border)'
                  }`,
                  background: selected
                    ? 'var(--accent-soft)'
                    : 'var(--bg-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    triggerGentleFeedback();
                    setActiveProfile(prof.id);
                  }}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    textAlign: 'left',
                    padding: '0.15rem 0',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: '0.98rem',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {prof.name}
                    </div>
                    <div
                      style={{
                        fontSize: '0.78rem',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {prof.relation} • {prof.medications.length} meds
                    </div>
                  </div>
                  {selected && <CheckCircle2 size={19} color="var(--accent)" />}
                </button>

                {profiles.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      triggerGentleFeedback();
                      removeProfileById(prof.id);
                    }}
                    aria-label={`Remove ${prof.name}`}
                    style={{
                      padding: '0.4rem',
                      color: 'var(--text-muted)',
                      display: 'inline-flex',
                    }}
                  >
                    <Trash2 size={17} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div
          style={{
            marginTop: '1.15rem',
            display: 'grid',
            gap: '0.6rem',
          }}
        >
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              triggerGentleFeedback();
              reopenOnboarding();
            }}
          >
            <Compass size={18} color="var(--accent)" />
            <span>Replay Welcome Walkthrough</span>
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
            <span>Log Out & Remove My Profile</span>
          </button>
        </div>
      </div>

      {/* Add Person Modal */}
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
            <h3 className="page-title" style={{ fontSize: '1.4rem' }}>
              Add Person
            </h3>
            <div
              style={{
                display: 'grid',
                gap: '0.75rem',
                marginTop: '0.95rem',
              }}
            >
              <input
                type="text"
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Name (e.g., Dad or Elena)"
                className="harbor-input"
              />
              <input
                type="text"
                value={newRelation}
                onChange={(e) => setNewRelation(e.target.value)}
                placeholder="Note (e.g., Family Schedule)"
                className="harbor-input"
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{ marginTop: '1.1rem' }}
            >
              Save Person
            </button>
          </form>
        </div>
      )}
    </section>
  );
};
