import { ScanPrescriptionResult } from '@shared/types';
import {
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ImagePlus,
  RefreshCw,
  Sparkles,
  Square,
  Volume2,
  X,
} from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PillIllustration } from '../components/PillIllustration';
import {
  isLiveGeminiModel,
  normalizeImageFileToJpegDataUrl,
  scanPrescriptionApi,
} from '../services/api';
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
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  const [manualOpen, setManualOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [labelHint, setLabelHint] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanPrescriptionResult | null>(
    null
  );
  const [savedBanner, setSavedBanner] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setActiveStream(null);
    setVideoReady(false);
    setCameraStarting(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCameraStream();
      stopCalmAudio();
    };
  }, [stopCameraStream]);

  // Attach activeStream to <video> reliably across Chrome, Safari, and mobile browsers
  const bindStreamToVideo = useCallback(
    (node: HTMLVideoElement | null, stream: MediaStream | null) => {
      if (!node || !stream) return;
      if (node.srcObject !== stream) {
        node.srcObject = stream;
      }
      node.muted = true;
      node.playsInline = true;
      node.setAttribute('playsinline', 'true');
      node.setAttribute('autoplay', 'true');

      const playPromise = node.play();
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise
          .then(() => {
            if (node.videoWidth > 0) {
              setVideoReady(true);
              setCameraStarting(false);
            }
          })
          .catch(() => {
            // Autoplay will retry on loadedmetadata
          });
      }
    },
    []
  );

  const setVideoNode = useCallback(
    (node: HTMLVideoElement | null) => {
      videoRef.current = node;
      if (node && activeStream) {
        bindStreamToVideo(node, activeStream);
      }
    },
    [activeStream, bindStreamToVideo]
  );

  useEffect(() => {
    if (cameraModalOpen && videoRef.current && activeStream) {
      bindStreamToVideo(videoRef.current, activeStream);
    }
  }, [cameraModalOpen, activeStream, bindStreamToVideo]);

  const startCameraStream = useCallback(
    async (preferredDeviceId?: string) => {
      setCameraError(null);
      setVideoReady(false);
      setCameraStarting(true);

      if (
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices ||
        typeof navigator.mediaDevices.getUserMedia !== 'function'
      ) {
        setCameraStarting(false);
        setCameraError(
          'Live webcam requires http://localhost:8081 (or HTTPS). Please open http://localhost:8081 or choose a photo file below.'
        );
        return;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      const isMobile = /Android|iPhone|iPad|iPod/i.test(
        navigator.userAgent || ''
      );

      // On laptops/desktops, avoid `facingMode: 'environment'` first so macOS doesn't stall trying to wake a locked Continuity Camera
      const primaryConstraints: MediaStreamConstraints = preferredDeviceId
        ? {
            video: {
              deviceId: { exact: preferredDeviceId },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          }
        : isMobile
          ? {
              video: {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
              audio: false,
            }
          : {
              video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
              audio: false,
            };

      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia(primaryConstraints);
        } catch {
          // Universal fallback to any available camera
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }

        streamRef.current = stream;
        setActiveStream(stream);

        const activeTrack = stream.getVideoTracks()[0];
        const currentDeviceId = activeTrack?.getSettings?.().deviceId || '';
        if (currentDeviceId) {
          setSelectedDeviceId(currentDeviceId);
        }

        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const cams = devices.filter((d) => d.kind === 'videoinput');
          setVideoDevices(cams);
          if (!currentDeviceId && cams[0]?.deviceId) {
            setSelectedDeviceId(cams[0].deviceId);
          }
        } catch {
          // Device enumeration optional
        }
      } catch (err) {
        setCameraStarting(false);
        const errName = err instanceof Error ? err.name : '';
        if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
          setCameraError(
            'Camera access was blocked by your browser. Click the camera/lock icon in your address bar to allow camera access, or upload a photo below.'
          );
        } else if (errName === 'NotFoundError') {
          setCameraError(
            'No webcam was detected on this device. You can upload a prescription photo file instead.'
          );
        } else {
          setCameraError(
            'Could not start the camera right now (it may be in use by another app). Try switching cameras or uploading a photo.'
          );
        }
      }
    },
    []
  );

  const handleOpenWebcam = async () => {
    triggerGentleFeedback();
    setCameraModalOpen(true);
    await startCameraStream();
  };

  const handleSwitchCamera = async () => {
    if (videoDevices.length < 2) return;
    triggerGentleFeedback();
    const idx = videoDevices.findIndex((d) => d.deviceId === selectedDeviceId);
    const nextCam = videoDevices[(idx + 1) % videoDevices.length];
    if (nextCam?.deviceId) {
      setSelectedDeviceId(nextCam.deviceId);
      await startCameraStream(nextCam.deviceId);
    }
  };

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

  const handleCaptureWebcamFrame = async () => {
    const video = videoRef.current;
    if (!video) return;

    const rawW = video.videoWidth || 1280;
    const rawH = video.videoHeight || 720;
    const maxDim = 1280;
    const scale = Math.min(1, maxDim / Math.max(rawW, rawH));
    const width = Math.max(1, Math.round(rawW * scale));
    const height = Math.max(1, Math.round(rawH * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    stopCameraStream();
    setCameraModalOpen(false);
    setPreviewUrl(dataUrl);

    await runGeminiScan({
      imageBase64: dataUrl,
      mimeType: 'image/jpeg',
    });
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    stopCameraStream();
    setCameraModalOpen(false);

    try {
      const jpegDataUrl = await normalizeImageFileToJpegDataUrl(file);
      setPreviewUrl(jpegDataUrl);
      await runGeminiScan({
        imageBase64: jpegDataUrl,
        mimeType: 'image/jpeg',
      });
    } catch {
      // Ignore canceled file read
    }
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

  const closeCameraModal = () => {
    stopCameraStream();
    setCameraModalOpen(false);
  };

  const cameraModalPortal =
    cameraModalOpen && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="modal-backdrop"
            style={{ zIndex: 9999 }}
            onClick={closeCameraModal}
            role="dialog"
            aria-modal="true"
            aria-label="Scan prescription bottle with camera"
          >
            <div
              className="modal-card"
              style={{ maxWidth: 560 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.6rem',
                  marginBottom: '0.85rem',
                }}
              >
                <div>
                  <h3 className="section-title">Scan Prescription Bottle</h3>
                  <div
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--text-secondary)',
                      marginTop: '0.15rem',
                    }}
                  >
                    Hold bottle label or discharge sheet clearly in frame
                  </div>
                </div>
                <button
                  type="button"
                  className="icon-circle-btn"
                  onClick={closeCameraModal}
                  aria-label="Close camera"
                >
                  <X size={18} />
                </button>
              </div>

              {videoDevices.length > 1 && !cameraError && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.75rem',
                  }}
                >
                  <select
                    value={selectedDeviceId}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      setSelectedDeviceId(nextId);
                      startCameraStream(nextId);
                    }}
                    className="harbor-input"
                    style={{
                      minHeight: '40px',
                      fontSize: '0.85rem',
                      padding: '0 0.75rem',
                    }}
                    aria-label="Select camera"
                  >
                    {videoDevices.map((cam, i) => (
                      <option key={cam.deviceId || i} value={cam.deviceId}>
                        {cam.label || `Camera ${i + 1}`}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="chip-pill"
                    onClick={handleSwitchCamera}
                    style={{ flexShrink: 0 }}
                  >
                    <RefreshCw size={14} />
                    <span>Flip</span>
                  </button>
                </div>
              )}

              {cameraError ? (
                <div style={{ display: 'grid', gap: '0.85rem' }}>
                  <div className="alert-card" data-severity="caution">
                    <div style={{ fontSize: '0.92rem', fontWeight: 600 }}>
                      {cameraError}
                    </div>
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
                      className="btn-secondary"
                      onClick={() => startCameraStream()}
                    >
                      <RefreshCw size={18} />
                      <span>Retry Camera</span>
                    </button>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImagePlus size={18} />
                      <span>Choose Photo</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div
                    style={{
                      position: 'relative',
                      borderRadius: '18px',
                      overflow: 'hidden',
                      background: '#0f172a',
                      aspectRatio: '4 / 3',
                      width: '100%',
                    }}
                  >
                    <video
                      ref={setVideoNode}
                      autoPlay
                      playsInline
                      muted
                      onLoadedMetadata={(e) => {
                        const el = e.currentTarget;
                        el.play().catch(() => {});
                        if (el.videoWidth > 0) {
                          setVideoReady(true);
                          setCameraStarting(false);
                        }
                      }}
                      onCanPlay={(e) => {
                        if (e.currentTarget.videoWidth > 0) {
                          setVideoReady(true);
                          setCameraStarting(false);
                        }
                      }}
                      onPlaying={() => {
                        setVideoReady(true);
                        setCameraStarting(false);
                      }}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />

                    {/* Subtle framing corner guide */}
                    {videoReady && (
                      <div
                        style={{
                          position: 'absolute',
                          inset: '14%',
                          border: '2px dashed rgba(255, 255, 255, 0.55)',
                          borderRadius: '16px',
                          pointerEvents: 'none',
                        }}
                      />
                    )}

                    {(cameraStarting || !videoReady) && (
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.7rem',
                          background: 'rgba(15, 23, 42, 0.78)',
                          color: '#ffffff',
                          padding: '1.25rem',
                          textAlign: 'center',
                        }}
                      >
                        <div
                          className="spinner"
                          style={{
                            borderColor: 'rgba(255,255,255,0.25)',
                            borderTopColor: '#ffffff',
                          }}
                        />
                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                          Starting live camera...
                        </div>
                        <div
                          style={{
                            fontSize: '0.8rem',
                            color: 'rgba(255,255,255,0.78)',
                          }}
                        >
                          Click “Allow” if your browser asks for camera
                          permission.
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    className="btn-primary"
                    style={{ marginTop: '1rem' }}
                    disabled={!videoReady}
                    onClick={handleCaptureWebcamFrame}
                  >
                    <Camera size={20} />
                    <span>
                      {videoReady
                        ? 'Capture & Read with Gemini AI'
                        : 'Waiting for Camera...'}
                    </span>
                  </button>
                </>
              )}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <section className="page-container">
      <div style={{ marginBottom: '1.15rem' }}>
        <h1 className="page-title">Add a Medication</h1>
        <p className="page-subtitle">
          Snap or upload a photo of any prescription bottle or discharge paper.
          Gemini Vision reads the label and checks safety with your current
          pills.
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
                setPreviewUrl(null);
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
              maxHeight: 220,
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
            Analyzing prescription with Gemini AI...
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
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              justifySelf: 'start',
              padding: '0.22rem 0.65rem',
              borderRadius: '999px',
              background: isLiveGeminiModel(scanResult.modelUsed)
                ? 'var(--accent-soft)'
                : 'var(--bg-secondary)',
              border: `1px solid ${
                isLiveGeminiModel(scanResult.modelUsed)
                  ? 'var(--accent-border)'
                  : 'var(--border)'
              }`,
              fontSize: '0.74rem',
              fontWeight: 700,
              color: isLiveGeminiModel(scanResult.modelUsed)
                ? 'var(--accent)'
                : 'var(--text-secondary)',
            }}
          >
            <Sparkles size={13} />
            <span>
              {isLiveGeminiModel(scanResult.modelUsed)
                ? `Gemini AI Live · ${scanResult.modelUsed}`
                : 'Offline Clinical Fallback'}
            </span>
          </div>

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

      {cameraModalPortal}
    </section>
  );
};
