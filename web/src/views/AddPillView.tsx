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
  Video,
  Volume2,
  X,
} from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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

function isVirtualOrContinuityLabel(label: string): boolean {
  return /iphone|ipad|continuity|desk view|obs|virtual|mmhmm|camo|epoccam/i.test(
    label
  );
}

function isPreferredBuiltInDesktopCamera(label: string): boolean {
  return (
    /facetime|built-in|integrated|internal|macbook|imac|webcam|usb/i.test(
      label
    ) && !isVirtualOrContinuityLabel(label)
  );
}

export const AddPillView: React.FC = () => {
  const activeProfile = useActiveProfile();
  const addMedicationToProfile = useHarborStore(
    (s) => s.addMedicationToProfile
  );
  const setActiveTab = useHarborStore((s) => s.setActiveTab);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [activeCameraLabel, setActiveCameraLabel] = useState<string>('');

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

  // Stable <video> binding: never recreates ref callbacks, never detaches <video>, and polls readiness
  useEffect(() => {
    const video = videoRef.current;
    if (!cameraOpen || !video || !activeStream) return;

    if (video.srcObject !== activeStream) {
      video.srcObject = activeStream;
    }
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('muted', '');

    const tryPlay = () => {
      const p = video.play();
      if (p && typeof p.catch === 'function') {
        p.catch(() => {
          // Will retry on next readiness tick
        });
      }
    };
    tryPlay();

    const timer = window.setInterval(() => {
      if (video.paused && activeStream.active) {
        tryPlay();
      }
      if (video.videoWidth > 0 && video.readyState >= 2) {
        setVideoReady(true);
        setCameraStarting(false);
      }
    }, 150);

    return () => {
      window.clearInterval(timer);
    };
  }, [cameraOpen, activeStream]);

  const startCameraStream = useCallback(
    async (explicitDeviceId?: string) => {
      setCameraError(null);
      setVideoReady(false);
      setCameraStarting(true);

      // 1. Check secure context / browser support
      if (
        typeof window !== 'undefined' &&
        !window.isSecureContext &&
        window.location.hostname !== 'localhost' &&
        window.location.hostname !== '127.0.0.1'
      ) {
        setCameraStarting(false);
        setCameraError(
          `Browsers block live camera on non-HTTPS network addresses (${window.location.origin}). Open http://localhost:8081 in your browser, or click "Upload Photo" to pick an image.`
        );
        return;
      }

      if (
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices ||
        typeof navigator.mediaDevices.getUserMedia !== 'function'
      ) {
        setCameraStarting(false);
        setCameraError(
          'Your current browser view does not support live webcam access. Open http://localhost:8081 directly in Chrome or Safari, or use "Upload Photo".'
        );
        return;
      }

      // Stop any existing camera tracks first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      const isMobile = /Android|iPhone|iPad|iPod/i.test(
        navigator.userAgent || ''
      );

      try {
        let targetDeviceId = explicitDeviceId;

        // If permission was already granted previously, pick the built-in MacBook FaceTime camera right away
        if (!targetDeviceId && !isMobile) {
          try {
            const preDevices = await navigator.mediaDevices.enumerateDevices();
            const preCams = preDevices.filter(
              (d) => d.kind === 'videoinput' && d.label
            );
            const builtIn = preCams.find((d) =>
              isPreferredBuiltInDesktopCamera(d.label)
            );
            if (builtIn?.deviceId) {
              targetDeviceId = builtIn.deviceId;
            }
          } catch {
            // Ignore pre-enumeration failure
          }
        }

        const buildConstraints = (devId?: string): MediaStreamConstraints => {
          if (devId) {
            return {
              video: {
                deviceId: { exact: devId },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
              audio: false,
            };
          }
          if (isMobile) {
            return {
              video: {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
              audio: false,
            };
          }
          return {
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          };
        };

        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia(
            buildConstraints(targetDeviceId)
          );
        } catch {
          // Universal fallback to basic `{ video: true }`
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }

        // Now that permission is unlocked, enumerate all cameras with full labels
        let cams: MediaDeviceInfo[] = [];
        try {
          const allDevices = await navigator.mediaDevices.enumerateDevices();
          cams = allDevices.filter((d) => d.kind === 'videoinput');
          setVideoDevices(cams);
        } catch {
          // Ignore enumeration error
        }

        let firstTrack = stream.getVideoTracks()[0];
        let trackLabel = firstTrack?.label || '';

        // Crucial macOS fix: if user didn't explicitly pick a camera and macOS auto-routed to a sleeping iPhone Continuity Camera / virtual camera while FaceTime HD Camera exists, switch immediately to FaceTime HD Camera!
        if (
          !explicitDeviceId &&
          !isMobile &&
          isVirtualOrContinuityLabel(trackLabel)
        ) {
          const builtInCam = cams.find((c) =>
            isPreferredBuiltInDesktopCamera(c.label)
          );
          if (builtInCam?.deviceId) {
            try {
              const builtInStream = await navigator.mediaDevices.getUserMedia(
                buildConstraints(builtInCam.deviceId)
              );
              stream.getTracks().forEach((t) => t.stop());
              stream = builtInStream;
              firstTrack = stream.getVideoTracks()[0];
              trackLabel = firstTrack?.label || builtInCam.label;
            } catch {
              // Keep initial stream if switch fails
            }
          }
        }

        const activeDevId =
          firstTrack?.getSettings?.().deviceId ||
          explicitDeviceId ||
          cams[0]?.deviceId ||
          '';

        streamRef.current = stream;
        setSelectedDeviceId(activeDevId);
        setActiveCameraLabel(trackLabel || 'Live Camera');
        setActiveStream(stream);
        setCameraStarting(false);
      } catch (err) {
        setCameraStarting(false);
        const errName = err instanceof Error ? err.name : 'CameraError';
        const errMsg = err instanceof Error ? err.message : '';
        const inIframe =
          typeof window !== 'undefined' && window.self !== window.top;

        if (inIframe) {
          setCameraError(
            'Embedded preview panels block webcam hardware. Open http://localhost:8081 directly in Chrome or Safari to use your live camera, or click "Upload Photo".'
          );
        } else if (
          errName === 'NotAllowedError' ||
          errName === 'PermissionDeniedError' ||
          errName === 'SecurityError'
        ) {
          setCameraError(
            'Camera permission is blocked. Click the Camera / Tune icon in your browser address bar to Allow camera access (and check macOS System Settings → Privacy & Security → Camera).'
          );
        } else if (
          errName === 'NotFoundError' ||
          errName === 'DevicesNotFoundError'
        ) {
          setCameraError(
            'No camera was found on this device. Please use "Upload Photo" to select an image.'
          );
        } else if (
          errName === 'NotReadableError' ||
          errName === 'TrackStartError'
        ) {
          setCameraError(
            `Your camera is currently busy or locked by another app (${errMsg || errName}). Close other video apps or select another camera.`
          );
        } else {
          setCameraError(
            `Could not open camera (${errName}${errMsg ? `: ${errMsg}` : ''}). Try opening http://localhost:8081 in Chrome/Safari or click "Upload Photo".`
          );
        }
      }
    },
    []
  );

  const handleOpenWebcam = async () => {
    triggerGentleFeedback();
    if (cameraOpen) {
      stopCameraStream();
      setCameraOpen(false);
      return;
    }
    setCameraOpen(true);
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
    const dataUrl = canvas.toDataURL('image/jpeg', 0.86);
    stopCameraStream();
    setCameraOpen(false);
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
    setCameraOpen(false);

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

      {/* Primary Capture Card (with Inline Live Camera Viewfinder!) */}
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
            style={
              cameraOpen
                ? { background: 'var(--text-primary)' }
                : undefined
            }
            onClick={handleOpenWebcam}
          >
            {cameraOpen ? <X size={20} /> : <Camera size={20} />}
            <span>{cameraOpen ? 'Close Camera' : 'Take Photo'}</span>
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

        {/* INLINE LIVE CAMERA VIEWFINDER (No portal/modal clipping, stable ref) */}
        {cameraOpen && (
          <div
            style={{
              marginTop: '1rem',
              paddingTop: '1rem',
              borderTop: '1px solid var(--border)',
              display: 'grid',
              gap: '0.75rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  color: activeStream ? 'var(--safe)' : 'var(--text-secondary)',
                }}
              >
                <Video size={16} />
                <span>
                  {activeStream
                    ? `Live: ${activeCameraLabel}`
                    : cameraStarting
                      ? 'Requesting camera access...'
                      : 'Camera unavailable'}
                </span>
              </div>

              {videoDevices.length > 1 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
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
                      minHeight: '36px',
                      width: 'auto',
                      fontSize: '0.8rem',
                      padding: '0 0.6rem',
                    }}
                    aria-label="Choose camera device"
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
                    style={{ minHeight: '36px', padding: '0 0.65rem' }}
                    onClick={handleSwitchCamera}
                  >
                    <RefreshCw size={13} />
                    <span>Switch</span>
                  </button>
                </div>
              )}
            </div>

            {cameraError ? (
              <div style={{ display: 'grid', gap: '0.7rem' }}>
                <div className="alert-card" data-severity="caution">
                  <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>
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
                    <span>Choose Photo File</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: 320,
                    borderRadius: '18px',
                    overflow: 'hidden',
                    background: '#0f172a',
                    border: '1.5px solid var(--border-strong)',
                  }}
                >
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    onLoadedMetadata={(e) => {
                      e.currentTarget.play().catch(() => {});
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

                  {/* Subtle dashed framing guide — never obscures the video */}
                  {activeStream && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: '12%',
                        border: '2px dashed rgba(255, 255, 255, 0.5)',
                        borderRadius: '14px',
                        pointerEvents: 'none',
                      }}
                    />
                  )}

                  {/* Only shown BEFORE getUserMedia returns a stream */}
                  {!activeStream && cameraStarting && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.65rem',
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
                        Waiting for camera permission...
                      </div>
                      <div
                        style={{
                          fontSize: '0.8rem',
                          color: 'rgba(255,255,255,0.8)',
                        }}
                      >
                        Click “Allow” in the browser prompt at the top of your
                        window.
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="btn-primary btn-safe"
                  disabled={!activeStream && !videoReady}
                  onClick={handleCaptureWebcamFrame}
                >
                  <Camera size={20} />
                  <span>
                    {activeStream || videoReady
                      ? 'Snap Photo & Read with Gemini AI'
                      : 'Starting Camera...'}
                  </span>
                </button>
              </>
            )}
          </div>
        )}

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
            alt="Captured prescription"
            style={{
              width: '100%',
              maxHeight: 240,
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
    </section>
  );
};
