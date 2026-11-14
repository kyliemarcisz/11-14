import { Ionicons } from '@expo/vector-icons';
import { ScanPrescriptionResult } from '@shared/types';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { PillIllustration } from '../../src/components/PillIllustration';
import { scanPrescriptionApi } from '../../src/services/api';
import { playCalmReadout, stopCalmAudio } from '../../src/services/audioService';
import {
  triggerSoftImpactHaptic,
  triggerSuccessHaptic,
  triggerWarningHaptic,
} from '../../src/services/haptics';
import {
  useActiveProfile,
  useHarborStore,
  useHarborTheme,
} from '../../src/store/useHarborStore';

const DEMO_LABELS = [
  {
    title: 'Sample Bottle: Plavix 75 mg',
    subtitle: 'Tests critical blood-thinner overlap detection',
    hint: 'Rx Label: PLAVIX (clopidogrel) 75 MG tablet. Take 1 tablet by mouth every morning. Round pink tablet imprinted 75. Qty: 30.',
  },
  {
    title: 'Hospital Discharge: Toprol-XL 25 mg',
    subtitle: 'Tests morning blood-pressure beta-blocker parsing',
    hint: 'Discharge Medication: Toprol-XL (metoprolol succinate ER) 25 mg extended-release oval white tablet imprinted A MO. Take 1 tablet daily with morning meal. Qty: 30.',
  },
];

export default function ScanPrescriptionScreen() {
  const theme = useHarborTheme();
  const router = useRouter();
  const activeProfile = useActiveProfile();
  const addMedicationToProfile = useHarborStore(
    (s) => s.addMedicationToProfile
  );

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);

  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [labelHint, setLabelHint] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanPrescriptionResult | null>(
    null
  );
  const [savedBanner, setSavedBanner] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const runGeminiScan = async (params: {
    imageBase64?: string;
    mimeType?: string;
    hint?: string;
  }) => {
    setScanning(true);
    setSavedBanner(false);
    setScanResult(null);
    try {
      const result = await scanPrescriptionApi({
        imageBase64: params.imageBase64,
        mimeType: params.mimeType,
        labelTextHint: params.hint ?? labelHint,
        patient: activeProfile,
      });
      setScanResult(result);
      if (
        result.safetyAlertsWithCurrentMeds.some(
          (a) => a.severity === 'critical'
        )
      ) {
        triggerWarningHaptic();
      } else {
        triggerSuccessHaptic();
      }
    } finally {
      setScanning(false);
    }
  };

  const handleOpenCamera = async () => {
    triggerSoftImpactHaptic();
    if (!cameraPermission?.granted) {
      const res = await requestCameraPermission();
      if (!res.granted) return;
    }
    setCameraModalOpen(true);
  };

  const handleCapturePhoto = async () => {
    if (!cameraRef.current) return;
    triggerSoftImpactHaptic();
    const photo = await cameraRef.current.takePictureAsync({
      base64: true,
      quality: 0.65,
    });
    setCameraModalOpen(false);
    if (photo?.uri) {
      setPreviewUri(photo.uri);
      await runGeminiScan({
        imageBase64: photo.base64,
        mimeType: 'image/jpeg',
      });
    }
  };

  const handlePickImage = async () => {
    triggerSoftImpactHaptic();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      base64: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setPreviewUri(asset.uri);
      await runGeminiScan({
        imageBase64: asset.base64 || undefined,
        mimeType: asset.mimeType || 'image/jpeg',
      });
    }
  };

  const handleSaveMedication = () => {
    if (!scanResult) return;
    triggerSuccessHaptic();
    addMedicationToProfile(activeProfile.id, scanResult.medication);
    setSavedBanner(true);
  };

  const handleReadSummary = async () => {
    if (!scanResult) return;
    if (speaking) {
      await stopCalmAudio();
      setSpeaking(false);
      return;
    }
    const text = `${scanResult.medication.name}, ${scanResult.medication.dosage}. ${scanResult.medication.plainEnglishPurpose} ${scanResult.medication.foodRules} ${scanResult.calmOnboardingTip}`;
    setSpeaking(true);
    await playCalmReadout(text, () => setSpeaking(false));
  };

  return (
    <ScrollView
      style={[
        styles.screen,
        { backgroundColor: theme.colors.backgroundPrimary },
      ]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header Card */}
      <View
        style={[
          styles.heroCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.xl,
            padding: theme.spacing.lg,
          },
        ]}
      >
        <Text
          style={{
            fontSize: theme.font.title,
            fontWeight: '800',
            color: theme.colors.textPrimary,
          }}
        >
          Scan Bottle or Discharge Sheet
        </Text>
        <Text
          style={{
            fontSize: theme.font.body,
            lineHeight: theme.lineHeight.body,
            color: theme.colors.textSecondary,
            marginTop: 6,
          }}
        >
          Gemini reads fine-print pharmacy labels for{' '}
          <Text style={{ fontWeight: '700', color: theme.colors.textPrimary }}>
            {activeProfile.name.split(' ')[0]}
          </Text>
          , builds a visual pill match, and checks interactions automatically.
        </Text>

        {/* Primary Capture Buttons */}
        <View style={styles.captureRow}>
          <Pressable
            onPress={handleOpenCamera}
            style={({ pressed }) => [
              styles.primaryActionBtn,
              {
                minHeight: Math.max(theme.minTouchTarget, 58),
                backgroundColor: theme.colors.accentPrimary,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Ionicons name="camera-outline" size={22} color={theme.colors.white} />
            <Text
              style={{
                fontSize: theme.font.body,
                fontWeight: '700',
                color: theme.colors.white,
              }}
            >
              Open Camera
            </Text>
          </Pressable>

          <Pressable
            onPress={handlePickImage}
            style={({ pressed }) => [
              styles.secondaryActionBtn,
              {
                minHeight: Math.max(theme.minTouchTarget, 58),
                backgroundColor: theme.colors.backgroundPrimary,
                borderColor: theme.colors.borderStrong,
                opacity: pressed ? 0.88 : 1,
              },
            ]}
          >
            <Ionicons
              name="images-outline"
              size={22}
              color={theme.colors.accentPrimary}
            />
            <Text
              style={{
                fontSize: theme.font.body,
                fontWeight: '700',
                color: theme.colors.textPrimary,
              }}
            >
              Photo Library
            </Text>
          </Pressable>
        </View>

        {/* Optional Label Text / Note Input */}
        {theme.showSecondaryMetadata && (
          <View style={{ marginTop: 16, gap: 8 }}>
            <Text
              style={{
                fontSize: theme.font.xs,
                fontWeight: '700',
                color: theme.colors.textSecondary,
                textTransform: 'uppercase',
              }}
            >
              Or paste / type a label note for Gemini
            </Text>
            <View style={styles.hintRow}>
              <TextInput
                value={labelHint}
                onChangeText={setLabelHint}
                placeholder="e.g., Metoprolol ER 25mg every morning..."
                placeholderTextColor={theme.colors.textMuted}
                style={[
                  styles.input,
                  {
                    minHeight: theme.minTouchTarget,
                    fontSize: theme.font.sm,
                    color: theme.colors.textPrimary,
                    backgroundColor: theme.colors.backgroundPrimary,
                    borderColor: theme.colors.border,
                  },
                ]}
              />
              <Pressable
                onPress={() => {
                  if (!labelHint.trim()) return;
                  triggerSoftImpactHaptic();
                  runGeminiScan({ hint: labelHint });
                }}
                style={[
                  styles.parseBtn,
                  {
                    minHeight: theme.minTouchTarget,
                    backgroundColor: theme.colors.textPrimary,
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: theme.font.sm,
                    fontWeight: '700',
                    color: theme.colors.white,
                  }}
                >
                  Parse
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      {/* Instant Demo Sample Presets (great for simulator / web testing) */}
      <View style={styles.sampleSection}>
        <Text
          style={{
            fontSize: theme.font.xs,
            fontWeight: '700',
            color: theme.colors.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            marginBottom: 8,
          }}
        >
          Instant Demo Bottle & Discharge Samples
        </Text>
        {DEMO_LABELS.map((sample) => (
          <Pressable
            key={sample.title}
            onPress={() => {
              triggerSoftImpactHaptic();
              setPreviewUri(null);
              setLabelHint(sample.hint);
              runGeminiScan({ hint: sample.hint });
            }}
            style={[
              styles.sampleCard,
              {
                minHeight: theme.minTouchTarget,
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Ionicons
              name="sparkles-outline"
              size={20}
              color={theme.colors.accentPrimary}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: theme.font.body,
                  fontWeight: '700',
                  color: theme.colors.textPrimary,
                }}
              >
                {sample.title}
              </Text>
              {theme.showSecondaryMetadata && (
                <Text
                  style={{
                    fontSize: theme.font.xs,
                    color: theme.colors.textSecondary,
                    marginTop: 2,
                  }}
                >
                  {sample.subtitle}
                </Text>
              )}
            </View>
            <Ionicons
              name="arrow-forward-circle-outline"
              size={22}
              color={theme.colors.accentPrimary}
            />
          </Pressable>
        ))}
      </View>

      {/* Image Preview */}
      {previewUri && (
        <Image source={{ uri: previewUri }} style={styles.imagePreview} />
      )}

      {/* Loading Indicator */}
      {scanning && (
        <View
          style={[
            styles.loadingCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <ActivityIndicator size="large" color={theme.colors.accentPrimary} />
          <Text
            style={{
              fontSize: theme.font.body,
              fontWeight: '700',
              color: theme.colors.textPrimary,
              marginTop: 12,
            }}
          >
            Gemini is reading label & checking interactions...
          </Text>
        </View>
      )}

      {/* Parsed Gemini Result Card */}
      {scanResult && !scanning && (
        <View
          style={[
            styles.resultCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.xl,
              padding: theme.spacing.lg,
            },
          ]}
        >
          <View style={styles.resultTopRow}>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: theme.font.xs,
                  fontWeight: '700',
                  color: theme.colors.accentPrimary,
                  textTransform: 'uppercase',
                }}
              >
                Parsed by {scanResult.modelUsed}
              </Text>
              <Text
                style={{
                  fontSize: theme.font.title,
                  fontWeight: '800',
                  color: theme.colors.textPrimary,
                  marginTop: 4,
                }}
              >
                {scanResult.medication.name} ({scanResult.medication.dosage})
              </Text>
              <Text
                style={{
                  fontSize: theme.font.body,
                  color: theme.colors.textSecondary,
                  fontWeight: '600',
                }}
              >
                {scanResult.medication.genericName} •{' '}
                {scanResult.medication.timeWindows.join(' & ')}
              </Text>
            </View>
            <PillIllustration
              visual={scanResult.medication.pillVisual}
              size="md"
            />
          </View>

          <Pressable
            onPress={handleReadSummary}
            style={[
              styles.listenBtn,
              {
                minHeight: theme.minTouchTarget,
                backgroundColor: speaking
                  ? theme.colors.accentPrimary
                  : theme.colors.accentSoft,
                borderColor: theme.colors.accentBorder,
              },
            ]}
          >
            <Ionicons
              name={speaking ? 'stop-circle-outline' : 'volume-high-outline'}
              size={20}
              color={speaking ? theme.colors.white : theme.colors.accentPrimary}
            />
            <Text
              style={{
                fontSize: theme.font.sm,
                fontWeight: '700',
                color: speaking
                  ? theme.colors.white
                  : theme.colors.accentPrimary,
              }}
            >
              {speaking ? 'Stop Reading' : 'Read Plain-English Guide Aloud'}
            </Text>
          </Pressable>

          <View
            style={[
              styles.detailBox,
              {
                backgroundColor: theme.colors.backgroundPrimary,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text
              style={{
                fontSize: theme.font.body,
                lineHeight: theme.lineHeight.body,
                color: theme.colors.textPrimary,
              }}
            >
              <Text style={{ fontWeight: '700' }}>What it does: </Text>
              {scanResult.medication.plainEnglishPurpose}
            </Text>
            <Text
              style={{
                fontSize: theme.font.sm,
                lineHeight: theme.lineHeight.sm,
                color: theme.colors.textSecondary,
                marginTop: 8,
              }}
            >
              <Text style={{ fontWeight: '700', color: theme.colors.textPrimary }}>
                Food rule:{' '}
              </Text>
              {scanResult.medication.foodRules}
            </Text>
          </View>

          {/* Interaction Alerts with Current Regimen */}
          {scanResult.safetyAlertsWithCurrentMeds.map((alert) => {
            const isCrit = alert.severity === 'critical';
            return (
              <View
                key={alert.id}
                style={[
                  styles.alertBox,
                  {
                    backgroundColor: isCrit
                      ? theme.colors.criticalSoft
                      : theme.colors.cautionSoft,
                    borderColor: isCrit
                      ? theme.colors.criticalBorder
                      : theme.colors.cautionBorder,
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: theme.font.body,
                    fontWeight: '800',
                    color: isCrit
                      ? theme.colors.critical
                      : theme.colors.caution,
                  }}
                >
                  {alert.title}
                </Text>
                <Text
                  style={{
                    fontSize: theme.font.sm,
                    lineHeight: theme.lineHeight.sm,
                    color: theme.colors.textPrimary,
                    marginTop: 4,
                  }}
                >
                  {alert.plainExplanation}
                </Text>
                <Text
                  style={{
                    fontSize: theme.font.sm,
                    fontWeight: '700',
                    color: theme.colors.textPrimary,
                    marginTop: 6,
                  }}
                >
                  Next step: {alert.actionableStep}
                </Text>
              </View>
            );
          })}

          {savedBanner ? (
            <Pressable
              onPress={() => router.push('/(tabs)')}
              style={[
                styles.saveBtn,
                {
                  minHeight: Math.max(theme.minTouchTarget, 58),
                  backgroundColor: theme.colors.safe,
                },
              ]}
            >
              <Ionicons
                name="checkmark-circle"
                size={22}
                color={theme.colors.white}
              />
              <Text
                style={{
                  fontSize: theme.font.bodyLg,
                  fontWeight: '700',
                  color: theme.colors.white,
                }}
              >
                Added to {activeProfile.name.split(' ')[0]}’s Harbor — View Schedule
              </Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={handleSaveMedication}
              style={[
                styles.saveBtn,
                {
                  minHeight: Math.max(theme.minTouchTarget, 58),
                  backgroundColor: theme.colors.accentPrimary,
                },
              ]}
            >
              <Ionicons
                name="add-circle-outline"
                size={22}
                color={theme.colors.white}
              />
              <Text
                style={{
                  fontSize: theme.font.bodyLg,
                  fontWeight: '700',
                  color: theme.colors.white,
                }}
              >
                Add to {activeProfile.name.split(' ')[0]}’s Daily Harbor
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Live Camera Viewfinder Modal */}
      <Modal
        visible={cameraModalOpen}
        animationType="slide"
        onRequestClose={() => setCameraModalOpen(false)}
      >
        <View style={styles.cameraFullscreen}>
          <CameraView ref={cameraRef} style={styles.cameraView} facing="back" />
          <View style={styles.cameraControls}>
            <Pressable
              onPress={() => setCameraModalOpen(false)}
              style={[
                styles.cameraCancelBtn,
                { minHeight: theme.minTouchTarget },
              ]}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 16 }}>
                Cancel
              </Text>
            </Pressable>
            <Pressable
              onPress={handleCapturePhoto}
              style={styles.shutterOuter}
              accessibilityLabel="Capture prescription bottle photo"
            >
              <View style={styles.shutterInner} />
            </Pressable>
            <View style={{ width: 70 }} />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: 18,
    paddingBottom: 44,
  },
  heroCard: {
    borderWidth: 1,
    marginBottom: 18,
  },
  captureRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    paddingHorizontal: 12,
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 12,
  },
  hintRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  parseBtn: {
    paddingHorizontal: 18,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sampleSection: {
    marginBottom: 18,
    gap: 8,
  },
  sampleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  imagePreview: {
    width: '100%',
    height: 190,
    borderRadius: 20,
    marginBottom: 16,
  },
  loadingCard: {
    padding: 28,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  resultCard: {
    borderWidth: 1,
    gap: 14,
  },
  resultTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  listenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  detailBox: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  alertBox: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 16,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  cameraFullscreen: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraView: {
    flex: 1,
  },
  cameraControls: {
    position: 'absolute',
    bottom: 42,
    left: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cameraCancelBtn: {
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  shutterOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFFFFF',
  },
});
