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
    title: 'Sample: Plavix 75 mg',
    hint: 'Rx Label: PLAVIX (clopidogrel) 75 MG tablet. Take 1 tablet by mouth every morning. Round pink tablet imprinted 75. Qty: 30.',
  },
  {
    title: 'Sample: Toprol-XL 25 mg',
    hint: 'Discharge Medication: Toprol-XL (metoprolol succinate ER) 25 mg extended-release oval white tablet imprinted A MO. Take 1 tablet daily with morning meal. Qty: 30.',
  },
];

export default function AddPillScreen() {
  const theme = useHarborTheme();
  const router = useRouter();
  const activeProfile = useActiveProfile();
  const addMedicationToProfile = useHarborStore(
    (s) => s.addMedicationToProfile
  );

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);

  const [manualOpen, setManualOpen] = useState(false);
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
    const text = `${scanResult.medication.name}, ${scanResult.medication.dosage}. ${scanResult.medication.plainEnglishPurpose} ${scanResult.medication.foodRules}`;
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
      <View style={styles.maxWidthWrap}>
        <Text
          style={{
            fontSize: theme.font.hero,
            lineHeight: theme.lineHeight.hero,
            fontWeight: '800',
            color: theme.colors.textPrimary,
            letterSpacing: -0.5,
          }}
        >
          Add a Medication
        </Text>
        <Text
          style={{
            fontSize: theme.font.body,
            lineHeight: theme.lineHeight.body,
            color: theme.colors.textSecondary,
            marginTop: 6,
            marginBottom: 18,
          }}
        >
          Snap a photo of any prescription bottle or discharge paper. We’ll read
          the label and check safety with your current pills.
        </Text>

        {/* Clean Two-Button Camera Card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.xl,
              padding: theme.spacing.lg,
            },
          ]}
        >
          <View style={styles.captureRow}>
            <Pressable
              onPress={handleOpenCamera}
              style={({ pressed }) => [
                styles.primaryBtn,
                {
                  minHeight: Math.max(theme.minTouchTarget, 58),
                  backgroundColor: theme.colors.accentPrimary,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <Ionicons
                name="camera-outline"
                size={22}
                color={theme.colors.white}
              />
              <Text
                style={{
                  fontSize: theme.font.body,
                  fontWeight: '700',
                  color: theme.colors.white,
                }}
              >
                Take Photo
              </Text>
            </Pressable>

            <Pressable
              onPress={handlePickImage}
              style={({ pressed }) => [
                styles.secondaryBtn,
                {
                  minHeight: Math.max(theme.minTouchTarget, 58),
                  backgroundColor: theme.colors.backgroundPrimary,
                  borderColor: theme.colors.borderStrong,
                  opacity: pressed ? 0.88 : 1,
                },
              ]}
            >
              <Ionicons
                name="image-outline"
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
                Upload Photo
              </Text>
            </Pressable>
          </View>

          {/* Progressive Disclosure for Typing / Demo Samples */}
          <Pressable
            onPress={() => {
              triggerSoftImpactHaptic();
              setManualOpen((v) => !v);
            }}
            style={styles.manualToggle}
          >
            <Text
              style={{
                fontSize: theme.font.sm,
                fontWeight: '600',
                color: theme.colors.textSecondary,
              }}
            >
              No bottle nearby? Type a pill name or try a sample
            </Text>
            <Ionicons
              name={manualOpen ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={theme.colors.textSecondary}
            />
          </Pressable>

          {manualOpen && (
            <View style={styles.manualDrawer}>
              <View style={styles.hintRow}>
                <TextInput
                  value={labelHint}
                  onChangeText={setLabelHint}
                  onSubmitEditing={() => {
                    if (labelHint.trim()) runGeminiScan({ hint: labelHint });
                  }}
                  placeholder="e.g., Metoprolol 25mg every morning"
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
                    Add
                  </Text>
                </Pressable>
              </View>

              <View style={styles.sampleRow}>
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
                      styles.sampleChip,
                      {
                        minHeight: theme.brainFogMode ? 64 : 40,
                        backgroundColor: theme.colors.accentSoft,
                        borderColor: theme.colors.accentBorder,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: theme.font.xs,
                        fontWeight: '700',
                        color: theme.colors.accentPrimary,
                      }}
                    >
                      {sample.title}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </View>

        {previewUri && (
          <Image source={{ uri: previewUri }} style={styles.imagePreview} />
        )}

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
                fontWeight: '600',
                color: theme.colors.textPrimary,
                marginTop: 12,
              }}
            >
              Reading label & checking safety...
            </Text>
          </View>
        )}

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
                    fontSize: theme.font.title,
                    fontWeight: '800',
                    color: theme.colors.textPrimary,
                  }}
                >
                  {scanResult.medication.name} ({scanResult.medication.dosage})
                </Text>
                <Text
                  style={{
                    fontSize: theme.font.body,
                    color: theme.colors.textSecondary,
                    fontWeight: '600',
                    marginTop: 2,
                  }}
                >
                  {scanResult.medication.timeWindows.join(' & ')}
                </Text>
              </View>
              <PillIllustration
                visual={scanResult.medication.pillVisual}
                size="md"
              />
            </View>

            <Text
              style={{
                fontSize: theme.font.body,
                lineHeight: theme.lineHeight.body,
                color: theme.colors.textPrimary,
              }}
            >
              {scanResult.medication.plainEnglishPurpose}
            </Text>

            <Text
              style={{
                fontSize: theme.font.sm,
                color: theme.colors.textSecondary,
              }}
            >
              {scanResult.medication.foodRules}
            </Text>

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
                color={
                  speaking ? theme.colors.white : theme.colors.accentPrimary
                }
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
                {speaking ? 'Stop Audio' : 'Listen Aloud'}
              </Text>
            </Pressable>

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
                </View>
              );
            })}

            {savedBanner ? (
              <Pressable
                onPress={() => router.push('/(tabs)')}
                style={[
                  styles.saveBtn,
                  {
                    minHeight: Math.max(theme.minTouchTarget, 56),
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
                  Saved — View Today’s Schedule
                </Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={handleSaveMedication}
                style={[
                  styles.saveBtn,
                  {
                    minHeight: Math.max(theme.minTouchTarget, 56),
                    backgroundColor: theme.colors.accentPrimary,
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: theme.font.bodyLg,
                    fontWeight: '700',
                    color: theme.colors.white,
                  }}
                >
                  Save to My Schedule
                </Text>
              </Pressable>
            )}
          </View>
        )}

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
                <Text
                  style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 16 }}
                >
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handleCapturePhoto}
                style={styles.shutterOuter}
              >
                <View style={styles.shutterInner} />
              </Pressable>
              <View style={{ width: 70 }} />
            </View>
          </View>
        </Modal>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: 18,
    paddingBottom: 124,
  },
  maxWidthWrap: {
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
  },
  card: {
    borderWidth: 1,
    marginBottom: 18,
  },
  captureRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  manualToggle: {
    marginTop: 16,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  manualDrawer: {
    marginTop: 12,
    gap: 10,
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
  sampleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sampleChip: {
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePreview: {
    width: '100%',
    height: 180,
    borderRadius: 20,
    marginBottom: 16,
  },
  loadingCard: {
    padding: 28,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultCard: {
    borderWidth: 1,
    gap: 12,
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
  alertBox: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
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
