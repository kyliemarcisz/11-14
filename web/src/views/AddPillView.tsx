import { ScanPrescriptionResult } from '@shared/types';
import {
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  ImagePlus,
  Square,
  Volume2,
  X,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { AuxLabel } from '../components/AuxLabel';
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
        'Camera permission was declined or unavailable. Upload an image file instead.'
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
      <div className="mb-5">
        <h1 className="page-title">Add a medication</h1>
        <p className="page-subtitle">
          Snap or upload a photo of a prescription bottle or discharge paper.
          We&rsquo;ll read the label and check it against your current pills.
        </p>
      </div>

      <div className="harbor-card">
        <div className="grid-2">
          <button
            type="button"
            className="btn-primary"
            onClick={handleOpenWebcam}
          >
            <Camera size={20} />
            <span>Take photo</span>
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              triggerGentleFeedback();
              fileInputRef.current?.click();
            }}
          >
            <ImagePlus size={20} />
            <span>Upload photo</span>
          </button>

          <input
            ref={fileInputRef}
            id="bottle-upload"
            type="file"
            accept="image/*"
            onChange={handleFileSelected}
            hidden
          />
        </div>

        <hr className="divider" />

        <button
          type="button"
          className="btn-ghost btn-ghost--wide btn-ghost--between"
          onClick={() => {
            triggerGentleFeedback();
            setManualOpen((v) => !v);
          }}
          aria-expanded={manualOpen}
        >
          <span>No bottle nearby? Type a pill name or try a sample</span>
          {manualOpen ? (
            <ChevronUp size={16} className="shrink-0" />
          ) : (
            <ChevronDown size={16} className="shrink-0" />
          )}
        </button>

        {manualOpen && (
          <div className="stack mt-3">
            <form
              className="row-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!labelHint.trim()) return;
                runGeminiScan({ hint: labelHint });
              }}
            >
              <input
                type="text"
                id="label-hint"
                value={labelHint}
                onChange={(e) => setLabelHint(e.target.value)}
                placeholder="Metoprolol 25 mg every morning"
                className="harbor-input"
              />
              <button
                type="submit"
                className="btn-primary btn-auto"
                data-tone="neutral"
              >
                Add
              </button>
            </form>

            <div className="row-wrap">
              {DEMO_LABELS.map((sample) => (
                <button
                  key={sample.title}
                  type="button"
                  className="chip-pill"
                  data-tone="accent"
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
        <div className="preview-frame">
          <img src={previewUrl} alt="The prescription you just captured" />
        </div>
      )}

      {scanning && (
        <div className="harbor-card harbor-card--pad-lg center-col stack-2">
          <div className="spinner" />
          <div className="t-cap ink-2">Reading label and checking safety…</div>
        </div>
      )}

      {scanResult && !scanning && (
        <div className="harbor-card stack">
          <div className="row-between">
            <div className="min-0">
              <h2 className="dose-name">
                {scanResult.medication.name} {scanResult.medication.dosage}
              </h2>
              <div className="dose-meta">
                {scanResult.medication.genericName} ·{' '}
                {scanResult.medication.timeWindows.join(' & ')}
              </div>
            </div>
            <div className="shrink-0">
              <PillIllustration
                visual={scanResult.medication.pillVisual}
                size="md"
              />
            </div>
          </div>

          <div className="t-body">
            {scanResult.medication.plainEnglishPurpose}
          </div>

          <AuxLabel line={scanResult.medication.foodRules} kind="info" />

          {scanResult.confidenceNote && (
            <AuxLabel line={scanResult.confidenceNote} kind="caution" />
          )}

          <button
            type="button"
            className="btn-quiet"
            data-active={speaking}
            onClick={handleReadSummary}
          >
            {speaking ? <Square size={16} /> : <Volume2 size={18} />}
            <span>{speaking ? 'Stop audio' : 'Listen aloud'}</span>
          </button>

          {scanResult.safetyAlertsWithCurrentMeds.map((alert) => (
            <div
              key={alert.id}
              className="alert-card stack-2"
              data-severity={alert.severity}
            >
              <div className="severity-head" data-severity={alert.severity}>
                {alert.title}
              </div>
              <div className="t-cap ink">{alert.plainExplanation}</div>
            </div>
          ))}

          {savedBanner ? (
            <button
              type="button"
              className="btn-primary"
              data-tone="done"
              onClick={() => setActiveTab('today')}
            >
              <Check size={20} />
              <span>Saved — open today&rsquo;s schedule</span>
            </button>
          ) : (
            <button type="button" className="btn-primary" onClick={handleSave}>
              Save to my schedule
            </button>
          )}
        </div>
      )}

      {/* Webcam */}
      {cameraModalOpen && (
        <div
          className="modal-backdrop"
          onClick={() => {
            stopCameraStream();
            setCameraModalOpen(false);
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="row-between mb-4">
              <h3 className="section-title">Scan the bottle</h3>
              <button
                type="button"
                className="icon-circle-btn"
                onClick={() => {
                  stopCameraStream();
                  setCameraModalOpen(false);
                }}
                aria-label="Close the scanner"
              >
                <X size={18} />
              </button>
            </div>

            {cameraError ? (
              <div className="alert-card" data-severity="caution">
                <div className="t-cap ink">{cameraError}</div>
              </div>
            ) : (
              <>
                <div className="camera-frame">
                  <video ref={videoRef} autoPlay playsInline muted />
                </div>
                <button
                  type="button"
                  className="btn-primary mt-4"
                  onClick={handleCaptureWebcamFrame}
                >
                  <Camera size={20} />
                  <span>Capture and read label</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
