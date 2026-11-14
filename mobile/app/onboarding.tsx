import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PillIllustration } from '../src/components/PillIllustration';
import { MEMORY_ANCHOR_PRESETS } from '../src/data/demoProfiles';
import {
  triggerSoftImpactHaptic,
  triggerSuccessHaptic,
  triggerWarningHaptic,
} from '../src/services/haptics';
import { useHarborStore, useHarborTheme } from '../src/store/useHarborStore';

const ROLE_OPTIONS = [
  'For Myself',
  'Helping a Parent / Loved One',
  'Shared With Family',
];

const CONDITION_CHIPS = [
  'ADHD / Working Memory',
  'Blood Thinners',
  'Blood Pressure',
  'Cholesterol',
  'Thyroid',
  'Daily Supplements',
];

export default function OnboardingScreen() {
  const router = useRouter();
  const theme = useHarborTheme();
  const completeOnboarding = useHarborStore((s) => s.completeOnboarding);
  const brainFogMode = useHarborStore((s) => s.brainFogMode);
  const setBrainFogMode = useHarborStore((s) => s.setBrainFogMode);

  const [step, setStep] = useState<0 | 1 | 2>(0);

  // Personal Profile Inputs
  const [userName, setUserName] = useState('');
  const [nameError, setNameError] = useState(false);
  const [userAge, setUserAge] = useState('');
  const [userRole, setUserRole] = useState(ROLE_OPTIONS[0]);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([
    'ADHD / Working Memory',
  ]);

  // Routine & Preferences
  const [selectedCue, setSelectedCue] = useState(MEMORY_ANCHOR_PRESETS[0]);
  const [customCue, setCustomCue] = useState('');
  const [includeStarterMeds, setIncludeStarterMeds] = useState(true);

  const toggleCondition = (item: string) => {
    triggerSoftImpactHaptic();
    setSelectedConditions((prev) =>
      prev.includes(item) ? prev.filter((c) => c !== item) : [...prev, item]
    );
  };

  const handleNext = () => {
    if (step === 0) {
      triggerSoftImpactHaptic();
      setStep(1);
      return;
    }

    if (step === 1) {
      if (!userName.trim()) {
        triggerWarningHaptic();
        setNameError(true);
        return;
      }
      triggerSoftImpactHaptic();
      setNameError(false);
      setStep(2);
      return;
    }

    triggerSuccessHaptic();
    const parsedAge = parseInt(userAge, 10);
    completeOnboarding({
      userName: userName.trim(),
      userAge: !Number.isNaN(parsedAge) && parsedAge > 0 ? parsedAge : 65,
      userRole,
      conditions: selectedConditions,
      includeStarterMeds,
      brainFogMode,
      defaultMemoryCue: customCue.trim() || selectedCue,
    });
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView
      style={[
        styles.safe,
        { backgroundColor: theme.colors.backgroundPrimary },
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.maxWidthWrap}>
          {/* Step Progress Bar */}
          <View style={styles.topBar}>
            <View style={styles.dotsRow}>
              {[0, 1, 2].map((idx) => (
                <View
                  key={idx}
                  style={[
                    styles.dot,
                    {
                      width: step === idx ? 28 : 8,
                      backgroundColor:
                        step >= idx
                          ? theme.colors.accentPrimary
                          : theme.colors.borderStrong,
                    },
                  ]}
                />
              ))}
            </View>
            <Text
              style={{
                fontSize: theme.font.xs,
                color: theme.colors.textSecondary,
                fontWeight: '600',
              }}
            >
              Step {step + 1} of 3 • Saved locally
            </Text>
          </View>

          {/* STEP 1: WHAT HARBORDOSE DOES */}
          {step === 0 && (
            <View style={styles.stepBody}>
              <View
                style={[
                  styles.pillHeroBadge,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <PillIllustration
                  visual={{
                    shape: 'capsule',
                    primaryColor: '#2A7B6F',
                    secondaryColor: '#FFFDF8',
                    imprintCode: 'HARBOR',
                  }}
                  size="lg"
                />
              </View>

              <Text
                style={{
                  fontSize: theme.font.hero,
                  lineHeight: theme.lineHeight.hero,
                  fontWeight: '800',
                  color: theme.colors.textPrimary,
                  marginTop: 20,
                  letterSpacing: -0.5,
                }}
              >
                Welcome to HarborDose
              </Text>

              <Text
                style={{
                  fontSize: theme.font.body,
                  lineHeight: theme.lineHeight.body,
                  color: theme.colors.textSecondary,
                  marginTop: 8,
                }}
              >
                A calm prescription tracker & safety companion built for ADHD
                working memory and family peace of mind.
              </Text>

              <View
                style={[
                  styles.featureListCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                {[
                  {
                    icon: 'eye-outline',
                    bg: theme.colors.accentSoft,
                    fg: theme.colors.accentPrimary,
                    title: '1. Visual Pill Verification',
                    desc: 'Match the shape, color, and imprint code before swallowing.',
                  },
                  {
                    icon: 'hand-left-outline',
                    bg: theme.colors.safeSoft,
                    fg: theme.colors.safe,
                    title: '2. Anti-Double-Dose Habit Cue',
                    desc: 'Log a physical cue (like flipping the cap) so you never take two.',
                  },
                  {
                    icon: 'camera-outline',
                    bg: theme.colors.accentSoft,
                    fg: theme.colors.accentPrimary,
                    title: '3. AI Bottle Scanner & Safety Check',
                    desc: 'Snap any bottle or ask if Advil, coffee, or vitamins mix safely.',
                  },
                  {
                    icon: 'heart-outline',
                    bg: theme.colors.cautionSoft,
                    fg: theme.colors.caution,
                    title: '4. 1-Tap Caregiver Text Update',
                    desc: 'Share daily peace-of-mind updates without nagging phone calls.',
                  },
                ].map((item) => (
                  <View key={item.title} style={styles.featureRow}>
                    <View
                      style={[styles.iconCircle, { backgroundColor: item.bg }]}
                    >
                      <Ionicons
                        name={item.icon as any}
                        size={20}
                        color={item.fg}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: theme.font.body,
                          fontWeight: '700',
                          color: theme.colors.textPrimary,
                        }}
                      >
                        {item.title}
                      </Text>
                      <Text
                        style={{
                          fontSize: theme.font.sm,
                          color: theme.colors.textSecondary,
                          marginTop: 2,
                        }}
                      >
                        {item.desc}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* STEP 2: ENTER YOUR NAME & PROFILE INFO */}
          {step === 1 && (
            <View style={styles.stepBody}>
              <Text
                style={{
                  fontSize: theme.font.hero,
                  lineHeight: theme.lineHeight.hero,
                  fontWeight: '800',
                  color: theme.colors.textPrimary,
                  letterSpacing: -0.5,
                }}
              >
                Tell us about yourself
              </Text>
              <Text
                style={{
                  fontSize: theme.font.body,
                  lineHeight: theme.lineHeight.body,
                  color: theme.colors.textSecondary,
                  marginTop: 6,
                }}
              >
                Stored privately on this device—you can log out and clear it
                anytime.
              </Text>

              <View style={{ marginTop: 20, gap: 18 }}>
                {/* Name & Age Row */}
                <View style={styles.nameAgeRow}>
                  <View style={{ flex: 2 }}>
                    <Text
                      style={{
                        fontSize: theme.font.sm,
                        fontWeight: '700',
                        color: theme.colors.textPrimary,
                        marginBottom: 6,
                      }}
                    >
                      Your Name *
                    </Text>
                    <TextInput
                      value={userName}
                      onChangeText={(txt) => {
                        setUserName(txt);
                        if (nameError && txt.trim()) setNameError(false);
                      }}
                      placeholder="e.g., Nikhil"
                      placeholderTextColor={theme.colors.textMuted}
                      style={[
                        styles.input,
                        {
                          minHeight: theme.minTouchTarget,
                          fontSize: theme.font.body,
                          color: theme.colors.textPrimary,
                          backgroundColor: theme.colors.surface,
                          borderColor: nameError
                            ? theme.colors.critical
                            : theme.colors.borderStrong,
                        },
                      ]}
                    />
                    {nameError && (
                      <Text
                        style={{
                          fontSize: theme.font.xs,
                          color: theme.colors.critical,
                          fontWeight: '600',
                          marginTop: 4,
                        }}
                      >
                        Please enter your name to create your profile.
                      </Text>
                    )}
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: theme.font.sm,
                        fontWeight: '700',
                        color: theme.colors.textPrimary,
                        marginBottom: 6,
                      }}
                    >
                      Age
                    </Text>
                    <TextInput
                      value={userAge}
                      onChangeText={setUserAge}
                      keyboardType="number-pad"
                      placeholder="68"
                      placeholderTextColor={theme.colors.textMuted}
                      style={[
                        styles.input,
                        {
                          minHeight: theme.minTouchTarget,
                          fontSize: theme.font.body,
                          color: theme.colors.textPrimary,
                          backgroundColor: theme.colors.surface,
                          borderColor: theme.colors.borderStrong,
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* Who is this schedule for? */}
                <View>
                  <Text
                    style={{
                      fontSize: theme.font.sm,
                      fontWeight: '700',
                      color: theme.colors.textPrimary,
                      marginBottom: 8,
                    }}
                  >
                    How are you using HarborDose?
                  </Text>
                  <View style={{ gap: 8 }}>
                    {ROLE_OPTIONS.map((role) => {
                      const active = userRole === role;
                      return (
                        <Pressable
                          key={role}
                          onPress={() => {
                            triggerSoftImpactHaptic();
                            setUserRole(role);
                          }}
                          style={[
                            styles.rolePill,
                            {
                              minHeight: theme.minTouchTarget,
                              backgroundColor: active
                                ? theme.colors.accentSoft
                                : theme.colors.surface,
                              borderColor: active
                                ? theme.colors.accentPrimary
                                : theme.colors.border,
                            },
                          ]}
                        >
                          <Ionicons
                            name={
                              active ? 'radio-button-on' : 'radio-button-off'
                            }
                            size={20}
                            color={theme.colors.accentPrimary}
                          />
                          <Text
                            style={{
                              fontSize: theme.font.body,
                              fontWeight: '600',
                              color: theme.colors.textPrimary,
                            }}
                          >
                            {role}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Health Focus Chips */}
                <View>
                  <Text
                    style={{
                      fontSize: theme.font.sm,
                      fontWeight: '700',
                      color: theme.colors.textPrimary,
                      marginBottom: 8,
                    }}
                  >
                    Health focus areas (helps tailor safety checks)
                  </Text>
                  <View style={styles.chipsWrap}>
                    {CONDITION_CHIPS.map((chip) => {
                      const selected = selectedConditions.includes(chip);
                      return (
                        <Pressable
                          key={chip}
                          onPress={() => toggleCondition(chip)}
                          style={[
                            styles.conditionChip,
                            {
                              minHeight: theme.brainFogMode ? 60 : 40,
                              backgroundColor: selected
                                ? theme.colors.accentPrimary
                                : theme.colors.surface,
                              borderColor: selected
                                ? theme.colors.accentPrimary
                                : theme.colors.border,
                            },
                          ]}
                        >
                          <Text
                            style={{
                              fontSize: theme.font.xs,
                              fontWeight: '700',
                              color: selected
                                ? theme.colors.white
                                : theme.colors.textPrimary,
                            }}
                          >
                            {selected ? `✓ ${chip}` : chip}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* STEP 3: CUSTOMIZE ROUTINE & PREFERENCES */}
          {step === 2 && (
            <View style={styles.stepBody}>
              <Text
                style={{
                  fontSize: theme.font.hero,
                  lineHeight: theme.lineHeight.hero,
                  fontWeight: '800',
                  color: theme.colors.textPrimary,
                  letterSpacing: -0.5,
                }}
              >
                Hi {userName.trim() || 'there'}, set your calm routine
              </Text>
              <Text
                style={{
                  fontSize: theme.font.body,
                  lineHeight: theme.lineHeight.body,
                  color: theme.colors.textSecondary,
                  marginTop: 6,
                }}
              >
                Choose a tiny physical habit to pair with taking your pills so
                you never second-guess yourself:
              </Text>

              <View style={{ marginTop: 16, gap: 8 }}>
                {MEMORY_ANCHOR_PRESETS.slice(0, 3).map((cue) => {
                  const chosen = !customCue.trim() && selectedCue === cue;
                  return (
                    <Pressable
                      key={cue}
                      onPress={() => {
                        triggerSoftImpactHaptic();
                        setCustomCue('');
                        setSelectedCue(cue);
                      }}
                      style={[
                        styles.cueOption,
                        {
                          minHeight: theme.minTouchTarget,
                          backgroundColor: chosen
                            ? theme.colors.accentSoft
                            : theme.colors.surface,
                          borderColor: chosen
                            ? theme.colors.accentPrimary
                            : theme.colors.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name={chosen ? 'checkmark-circle' : 'ellipse-outline'}
                        size={22}
                        color={
                          chosen
                            ? theme.colors.accentPrimary
                            : theme.colors.textMuted
                        }
                      />
                      <Text
                        style={{
                          flex: 1,
                          fontSize: theme.font.body,
                          fontWeight: '600',
                          color: theme.colors.textPrimary,
                        }}
                      >
                        {cue}
                      </Text>
                    </Pressable>
                  );
                })}

                <TextInput
                  value={customCue}
                  onChangeText={setCustomCue}
                  placeholder="Or type your own habit (e.g., Move bottle to left side)"
                  placeholderTextColor={theme.colors.textMuted}
                  style={[
                    styles.input,
                    {
                      minHeight: theme.minTouchTarget,
                      fontSize: theme.font.sm,
                      color: theme.colors.textPrimary,
                      backgroundColor: theme.colors.surface,
                      borderColor: customCue.trim()
                        ? theme.colors.accentPrimary
                        : theme.colors.border,
                    },
                  ]}
                />
              </View>

              {/* Text Size */}
              <View style={{ marginTop: 18 }}>
                <Text
                  style={{
                    fontSize: theme.font.sm,
                    fontWeight: '700',
                    color: theme.colors.textPrimary,
                    marginBottom: 8,
                  }}
                >
                  Display comfort
                </Text>
                <View style={styles.sizeToggleRow}>
                  <Pressable
                    onPress={() => {
                      triggerSoftImpactHaptic();
                      setBrainFogMode(false);
                    }}
                    style={[
                      styles.sizeOption,
                      {
                        minHeight: theme.minTouchTarget,
                        backgroundColor: !brainFogMode
                          ? theme.colors.accentPrimary
                          : theme.colors.surface,
                        borderColor: !brainFogMode
                          ? theme.colors.accentPrimary
                          : theme.colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: theme.font.body,
                        fontWeight: '700',
                        color: !brainFogMode
                          ? theme.colors.white
                          : theme.colors.textPrimary,
                      }}
                    >
                      Standard
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      triggerSoftImpactHaptic();
                      setBrainFogMode(true);
                    }}
                    style={[
                      styles.sizeOption,
                      {
                        minHeight: theme.minTouchTarget,
                        backgroundColor: brainFogMode
                          ? theme.colors.accentPrimary
                          : theme.colors.surface,
                        borderColor: brainFogMode
                          ? theme.colors.accentPrimary
                          : theme.colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: theme.font.body,
                        fontWeight: '700',
                        color: brainFogMode
                          ? theme.colors.white
                          : theme.colors.textPrimary,
                      }}
                    >
                      Aa Large & Simple
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Starter Sample Meds Switch */}
              <View
                style={[
                  styles.switchCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: theme.font.body,
                      fontWeight: '700',
                      color: theme.colors.textPrimary,
                    }}
                  >
                    Include sample medications
                  </Text>
                  <Text
                    style={{
                      fontSize: theme.font.xs,
                      color: theme.colors.textSecondary,
                      marginTop: 2,
                    }}
                  >
                    Turn off if you prefer starting with 0 pills and scanning
                    your own bottles.
                  </Text>
                </View>
                <Switch
                  value={includeStarterMeds}
                  onValueChange={(val) => {
                    triggerSoftImpactHaptic();
                    setIncludeStarterMeds(val);
                  }}
                  trackColor={{
                    false: theme.colors.borderStrong,
                    true: theme.colors.accentPrimary,
                  }}
                />
              </View>
            </View>
          )}

          {/* Bottom Navigation Buttons */}
          <View style={styles.bottomRow}>
            {step > 0 && (
              <Pressable
                onPress={() => {
                  triggerSoftImpactHaptic();
                  setStep((s) => (s - 1) as 0 | 1 | 2);
                }}
                style={[
                  styles.backBtn,
                  {
                    minHeight: Math.max(theme.minTouchTarget, 56),
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.borderStrong,
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: theme.font.body,
                    fontWeight: '700',
                    color: theme.colors.textPrimary,
                  }}
                >
                  Back
                </Text>
              </Pressable>
            )}

            <Pressable
              onPress={handleNext}
              style={[
                styles.nextBtn,
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
                {step < 2 ? 'Continue' : 'Save Profile & Open Harbor'}
              </Text>
              <Ionicons
                name="arrow-forward"
                size={20}
                color={theme.colors.white}
              />
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 22,
    justifyContent: 'center',
  },
  maxWidthWrap: {
    width: '100%',
    maxWidth: 540,
    alignSelf: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  stepBody: {
    marginBottom: 24,
  },
  pillHeroBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 22,
    borderWidth: 1,
  },
  featureListCard: {
    marginTop: 20,
    padding: 18,
    borderRadius: 22,
    borderWidth: 1,
    gap: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  nameAgeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 16,
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  conditionChip: {
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cueOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  sizeToggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  sizeOption: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  switchCard: {
    marginTop: 18,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bottomRow: {
    flexDirection: 'row',
    gap: 10,
  },
  backBtn: {
    paddingHorizontal: 22,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    paddingHorizontal: 20,
  },
});
