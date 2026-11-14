import { ScanPrescriptionResult } from '@shared/types';
import {
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ImagePlus,
  Square,
  Volume2,
  X,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { PillIllustration } from '../components/PillIllustration';
import { scanPrescriptionApi } from '../services/api';
import {
  playCalmReadout,
  stopCalmAudio,
  triggerGentleFeedback,
} from '../services/audioService';
import { useActiveProfile, useHarborStore } from '../store/useHarborStore';

const DEMO_LABELS = [
  {
    title: 'Sample: Plavix 75 mg',
    hint: 'Rx Label: PLAVIX (clopidogrel) 75 MG tablet. Take 1 tablet by mouth every morning. Round pink tablet imprinted 75. Qty: 30.',
  },
  {
    title: 'Sample: Toprol-XL 25 mg',
    hint: 'Discharge Medication: Toprol-XL (metoprolol succinate ER) 25 mg extended-release oval white tablet imprinted A MO. Take 1 tablet daily with morning meal. Qty: 30.',
  },
];

export const AddPillView: React.FC = () => {
  const activeProfile = useActiveProfile();
  const addMedicationToProfile = useHarborStore(
    (s) => s.addMedicationToProfile
  );
  const setActiveTab = useHarborStore((s) => s.setActiveTab);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const [manualOpen, setManualOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [labelHint, setLabelHint] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanPrescriptionResult | null>(
    null
  );
  const [savedBanner, setSavedBanner] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopCameraStream();
      stopCalmAudio();
    };
  }, []);

  const runGeminiScan = async (params: {
    imageBase64?: string;
    mimeType?: string;
    hint?: string;
  }) => {
    setScanning(true);
    setSavedBanner(false);
    setScanResult(null);
    stopCalmAudio();
    setSpeaking(false);

    try {
      const result = await scanPrescriptionApi({
        imageBase64: params.imageBase64,
        mimeType: params.mimeType,
        labelTextHint: params.hint ?? labelHint,
        patient: activeProfile,
      });
      setScanResult(result);
      triggerGentleFeedback(15);
    } finally {
      setScanning(false);
    }
  };

  const handleOpenWebcam = async () => {
    triggerGentleFeedback();
    setCameraError(null);
    setCameraModalOpen(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setCameraError(
        'Camera permission was declined or unavailable. You can upload an image file instead.'
      );
    }
  };

  const handleCaptureWebcamFrame = async () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 540;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.78);
    stopCameraStream();
    setCameraModalOpen(false);
    setPreviewUrl(dataUrl);

    await runGeminiScan({
      imageBase64: dataUrl,
      mimeType: 'image/jpeg',
    });
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result || '');
      setPreviewUrl(dataUrl);
      await runGeminiScan({
        imageBase64: dataUrl,
        mimeType: file.type || 'image/jpeg',
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleReadSummary = async () => {
    if (!scanResult) return;
    if (speaking) {
      stopCalmAudio();
      setSpeaking(false);
      return;
    }
    const text = `${scanResult.medication.name}, ${scanResult.medication.dosage}. ${scanResult.medication.plainEnglishPurpose} ${scanResult.medication.foodRules}`;
    setSpeaking(true);
    await playCalmReadout(text, () => setSpeaking(false));
  };

  const handleSave = () => {
    if (!scanResult) return;
    triggerGentleFeedback([15, 30, 15]);
    addMedicationToProfile(activeProfile.id, scanResult.medication);
    setSavedBanner(true);
  };

  return (
    <section className="page-container">
      <div style={{ marginBottom: '1.15rem' }}>
        <h1 className="page-title">Add a Medication</h1>
        <p className="page-subtitle">
          Snap or upload a photo of any prescription bottle or discharge paper.
          We’ll read the label and check safety with your current pills.
        </p>
      </div>

      {/* Primary Capture Card */}
      <div className="harbor-card">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.65rem',
          }}
        >
          <button
            type="button"
            className="btn-primary"
            onClick={handleOpenWebcam}
          >
            <Camera size={20} />
            <span>Take Photo</span>
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              triggerGentleFeedback();
              fileInputRef.current?.click();
            }}
          >
            <ImagePlus size={20} color="var(--accent)" />
            <span>Upload Photo</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelected}
            style={{ display: 'none' }}
          />
        </div>

        {/* Collapsible Text / Sample Drawer */}
        <button
          type="button"
          onClick={() => {
            triggerGentleFeedback();
            setManualOpen((v) => !v);
          }}
          style={{
            width: '100%',
            marginTop: '1rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: 'var(--text-secondary)',
            fontSize: '0.88rem',
            fontWeight: 600,
          }}
        >
          <span>No bottle nearby? Type a pill name or try a sample</span>
          {manualOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {manualOpen && (
          <div
            style={{
              marginTop: '0.85rem',
              display: 'grid',
              gap: '0.65rem',
            }}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!labelHint.trim()) return;
                runGeminiScan({ hint: labelHint });
              }}
              style={{ display: 'flex', gap: '0.5rem' }}
            >
              <input
                type="text"
                value={labelHint}
                onChange={(e) => setLabelHint(e.target.value)}
                placeholder="e.g., Metoprolol 25mg every morning"
                className="harbor-input"
              />
              <button
                type="submit"
                className="btn-primary"
                style={{
                  width: 'auto',
                  padding: '0 1.25rem',
                  background: 'var(--text-primary)',
                }}
              >
                Add
              </button>
            </form>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
              {DEMO_LABELS.map((sample) => (
                <button
                  key={sample.title}
                  type="button"
                  className="chip-pill"
                  style={{
                    background: 'var(--accent-soft)',
                    borderColor: 'var(--accent-border)',
                    color: 'var(--accent)',
                  }}
                  onClick={() => {
                    triggerGentleFeedback();
                    setPreviewUrl(null);
                    setLabelHint(sample.hint);
                    runGeminiScan({ hint: sample.hint });
                  }}
                >
                  {sample.title}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {previewUrl && (
        <div
          style={{
            marginBottom: '1rem',
            borderRadius: '20px',
            overflow: 'hidden',
            border: '1px solid var(--border)',
          }}
        >
          <img
            src={previewUrl}
            alt="Prescription preview"
            style={{
              width: '100%',
              maxHeight: 210,
              objectFit: 'cover',
              display: 'block',
            }}
          />
        </div>
      )}

      {scanning && (
        <div
          className="harbor-card"
          style={{
            padding: '2rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <div className="spinner" />
          <div style={{ fontWeight: 600, fontSize: '0.96rem' }}>
            Reading label & checking safety...
          </div>
        </div>
      )}

      {scanResult && !scanning && (
        <div
          className="harbor-card"
          style={{ display: 'grid', gap: '0.9rem' }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.85rem',
            }}
          >
            <div>
              <h2 className="section-title" style={{ fontSize: '1.4rem' }}>
                {scanResult.medication.name} ({scanResult.medication.dosage})
              </h2>
              <div
                style={{
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  fontSize: '0.95rem',
                  marginTop: '0.15rem',
                }}
              >
                {scanResult.medication.genericName} •{' '}
                {scanResult.medication.timeWindows.join(' & ')}
              </div>
            </div>
            <PillIllustration
              visual={scanResult.medication.pillVisual}
              size="md"
            />
          </div>

          <div style={{ fontSize: '0.98rem', color: 'var(--text-primary)' }}>
            {scanResult.medication.plainEnglishPurpose}
          </div>
          <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            {scanResult.medication.foodRules}
          </div>

          <button
            type="button"
            onClick={handleReadSummary}
            style={{
              minHeight: 'var(--min-touch)',
              borderRadius: '14px',
              border: '1px solid var(--accent-border)',
              background: speaking ? 'var(--accent)' : 'var(--accent-soft)',
              color: speaking ? '#ffffff' : 'var(--accent)',
              fontWeight: 700,
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            {speaking ? <Square size={16} /> : <Volume2 size={18} />}
            <span>{speaking ? 'Stop Audio' : 'Listen Aloud'}</span>
          </button>

          {scanResult.safetyAlertsWithCurrentMeds.map((alert) => (
            <div
              key={alert.id}
              className="alert-card"
              data-severity={alert.severity}
            >
              <div
                style={{
                  fontWeight: 800,
                  color:
                    alert.severity === 'critical'
                      ? 'var(--critical)'
                      : 'var(--caution)',
                  fontSize: '0.98rem',
                }}
              >
                {alert.title}
              </div>
              <div
                style={{
                  fontSize: '0.88rem',
                  color: 'var(--text-primary)',
                  marginTop: '0.25rem',
                }}
              >
                {alert.plainExplanation}
              </div>
            </div>
          ))}

          {savedBanner ? (
            <button
              type="button"
              className="btn-primary btn-safe"
              onClick={() => setActiveTab('today')}
            >
              <CheckCircle2 size={20} />
              <span>Saved — View Today’s Schedule</span>
            </button>
          ) : (
            <button
              type="button"
              className="btn-primary"
              onClick={handleSave}
            >
              Save to My Schedule
            </button>
          )}
        </div>
      )}

      {/* Webcam Modal */}
      {cameraModalOpen && (
        <div
          className="modal-backdrop"
          onClick={() => {
            stopCameraStream();
            setCameraModalOpen(false);
          }}
        >
          <div
            className="modal-card"
            style={{ maxWidth: 540 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.85rem',
              }}
            >
              <h3 className="section-title">Scan Prescription Bottle</h3>
              <button
                type="button"
                className="icon-circle-btn"
                onClick={() => {
                  stopCameraStream();
                  setCameraModalOpen(false);
                }}
              >
                <X size={18} />
              </button>
            </div>

            {cameraError ? (
              <div className="alert-card" data-severity="caution">
                <div style={{ fontSize: '0.92rem' }}>{cameraError}</div>
              </div>
            ) : (
              <>
                <div
                  style={{
                    borderRadius: '18px',
                    overflow: 'hidden',
                    background: '#0f172a',
                    aspectRatio: '4 / 3',
                  }}
                >
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                </div>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ marginTop: '1rem' }}
                  onClick={handleCaptureWebcamFrame}
                >
                  <Camera size={20} />
                  <span>Capture & Read Label</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
