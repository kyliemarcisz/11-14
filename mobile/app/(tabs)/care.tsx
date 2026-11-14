import { Ionicons } from '@expo/vector-icons';
import { FamilyUpdateResult } from '@shared/types';
import * as Clipboard from 'expo-clipboard';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { PillIllustration } from '../../src/components/PillIllustration';
import { familyUpdateApi } from '../../src/services/api';
import {
  triggerSoftImpactHaptic,
  triggerSuccessHaptic,
} from '../../src/services/haptics';
import {
  isSameLocalDay,
  useActiveProfile,
  useHarborStore,
  useHarborTheme,
} from '../../src/store/useHarborStore';

export default function CareCircleScreen() {
  const theme = useHarborTheme();
  const activeProfile = useActiveProfile();
  const profiles = useHarborStore((s) => s.profiles);
  const setActiveProfile = useHarborStore((s) => s.setActiveProfile);
  const allLogs = useHarborStore((s) => s.doseLogs);
  const refillMedication = useHarborStore((s) => s.refillMedication);
  const addCaregiverNote = useHarborStore((s) => s.addCaregiverNote);
  const removeCaregiverNote = useHarborStore((s) => s.removeCaregiverNote);
  const addPatientProfile = useHarborStore((s) => s.addPatientProfile);
  const resetDemoState = useHarborStore((s) => s.resetDemoState);

  const [generatingSms, setGeneratingSms] = useState(false);
  const [familyUpdate, setFamilyUpdate] = useState<FamilyUpdateResult | null>(
    null
  );
  const [copiedJustNow, setCopiedJustNow] = useState(false);

  const [newNote, setNewNote] = useState('');
  const [newProfileModalOpen, setNewProfileModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRelation, setNewRelation] = useState('');
  const [newAge, setNewAge] = useState('70');
  const [newConditions, setNewConditions] = useState('ADHD, Hypertension');

  const todayLogs = useMemo(
    () =>
      allLogs.filter(
        (l) => l.profileId === activeProfile.id && isSameLocalDay(l.takenAtISO)
      ),
    [allLogs, activeProfile.id]
  );

  const handleGenerateAndCopyUpdate = async () => {
    triggerSoftImpactHaptic();
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
      await Clipboard.setStringAsync(result.smsText);
      triggerSuccessHaptic();
      setCopiedJustNow(true);
      setTimeout(() => setCopiedJustNow(false), 3500);
    } finally {
      setGeneratingSms(false);
    }
  };

  const handleCopyAgain = async () => {
    if (!familyUpdate) return;
    await Clipboard.setStringAsync(familyUpdate.smsText);
    triggerSuccessHaptic();
    setCopiedJustNow(true);
    setTimeout(() => setCopiedJustNow(false), 3000);
  };

  const handleCreateProfile = () => {
    if (!newName.trim()) return;
    triggerSuccessHaptic();
    addPatientProfile({
      name: newName,
      relation: newRelation || 'Care Circle Member',
      age: parseInt(newAge, 10) || 68,
      conditions: newConditions
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean),
    });
    setNewName('');
    setNewRelation('');
    setNewProfileModalOpen(false);
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
      {/* 1. 1-Click Family Update Card */}
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
        <View style={styles.badgeRow}>
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={18}
            color={theme.colors.accentPrimary}
          />
          <Text
            style={{
              fontSize: theme.font.xs,
              fontWeight: '700',
              color: theme.colors.accentPrimary,
              textTransform: 'uppercase',
            }}
          >
            Zero-Nagging Caregiver Peace of Mind
          </Text>
        </View>

        <Text
          style={{
            fontSize: theme.font.title,
            fontWeight: '800',
            color: theme.colors.textPrimary,
            marginTop: 4,
          }}
        >
          1-Click Family Update
        </Text>
        <Text
          style={{
            fontSize: theme.font.sm,
            lineHeight: theme.lineHeight.sm,
            color: theme.colors.textSecondary,
            marginTop: 4,
          }}
        >
          Gemini writes a warm text message with {activeProfile.name.split(' ')[0]}
          ’s anchored doses and refill status—and copies it straight to your
          clipboard.
        </Text>

        <Pressable
          onPress={handleGenerateAndCopyUpdate}
          disabled={generatingSms}
          style={({ pressed }) => [
            styles.primaryExportBtn,
            {
              minHeight: Math.max(theme.minTouchTarget, 58),
              backgroundColor: copiedJustNow
                ? theme.colors.safe
                : theme.colors.accentPrimary,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          {generatingSms ? (
            <ActivityIndicator color={theme.colors.white} />
          ) : (
            <Ionicons
              name={copiedJustNow ? 'checkmark-circle' : 'copy-outline'}
              size={22}
              color={theme.colors.white}
            />
          )}
          <Text
            style={{
              fontSize: theme.font.bodyLg,
              fontWeight: '700',
              color: theme.colors.white,
            }}
          >
            {generatingSms
              ? 'Drafting Warm Summary...'
              : copiedJustNow
                ? 'Copied to Clipboard!'
                : 'Generate & Copy Family Text'}
          </Text>
        </Pressable>

        {familyUpdate && (
          <View
            style={[
              styles.smsPreviewBox,
              {
                backgroundColor: theme.colors.backgroundPrimary,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text
              style={{
                fontSize: theme.font.sm,
                lineHeight: theme.lineHeight.sm,
                color: theme.colors.textPrimary,
              }}
            >
              {familyUpdate.smsText}
            </Text>
            <Pressable onPress={handleCopyAgain} style={styles.copyAgainBtn}>
              <Ionicons
                name="clipboard-outline"
                size={16}
                color={theme.colors.accentPrimary}
              />
              <Text
                style={{
                  fontSize: theme.font.xs,
                  fontWeight: '700',
                  color: theme.colors.accentPrimary,
                }}
              >
                Copy text again
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* 2. Refill Runway Watch */}
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
        <Text
          style={{
            fontSize: theme.font.subtitle,
            fontWeight: '800',
            color: theme.colors.textPrimary,
          }}
        >
          Refill Runway Watch
        </Text>
        {theme.showSecondaryMetadata && (
          <Text
            style={{
              fontSize: theme.font.sm,
              color: theme.colors.textSecondary,
              marginTop: 4,
              marginBottom: 12,
            }}
          >
            Gentle early heads-up when 7 or fewer doses remain so pharmacy runs
            never become emergencies.
          </Text>
        )}

        <View style={{ gap: 10, marginTop: 8 }}>
          {activeProfile.medications.map((med) => {
            const isLow = med.supplyRemaining <= 7;
            return (
              <View
                key={med.id}
                style={[
                  styles.supplyRow,
                  {
                    backgroundColor: isLow
                      ? theme.colors.cautionSoft
                      : theme.colors.backgroundPrimary,
                    borderColor: isLow
                      ? theme.colors.cautionBorder
                      : theme.colors.border,
                  },
                ]}
              >
                <PillIllustration visual={med.pillVisual} size="sm" />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: theme.font.body,
                      fontWeight: '700',
                      color: theme.colors.textPrimary,
                    }}
                  >
                    {med.name} ({med.dosage})
                  </Text>
                  <Text
                    style={{
                      fontSize: theme.font.sm,
                      fontWeight: isLow ? '700' : '500',
                      color: isLow
                        ? theme.colors.caution
                        : theme.colors.textSecondary,
                    }}
                  >
                    {med.supplyRemaining} pills remaining
                    {isLow ? ' • Refill soon' : ''}
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    triggerSuccessHaptic();
                    refillMedication(activeProfile.id, med.id, 30);
                  }}
                  style={[
                    styles.refillBtn,
                    {
                      minHeight: theme.minTouchTarget,
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.borderStrong,
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
                    +30 Refill
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      </View>

      {/* 3. Shared Caregiver Environmental Notes */}
      {theme.showSecondaryMetadata && (
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
          <Text
            style={{
              fontSize: theme.font.subtitle,
              fontWeight: '800',
              color: theme.colors.textPrimary,
            }}
          >
            Home Station Memory Cues
          </Text>
          <Text
            style={{
              fontSize: theme.font.sm,
              color: theme.colors.textSecondary,
              marginTop: 4,
              marginBottom: 12,
            }}
          >
            Shared family notes on where bottles live and how physical anchors
            are set up.
          </Text>

          <View style={styles.noteInputRow}>
            <TextInput
              value={newNote}
              onChangeText={setNewNote}
              placeholder="Add a calm home cue (e.g., Beside tea kettle)..."
              placeholderTextColor={theme.colors.textMuted}
              style={[
                styles.noteInput,
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
                if (!newNote.trim()) return;
                triggerSuccessHaptic();
                addCaregiverNote(activeProfile.id, newNote);
                setNewNote('');
              }}
              style={[
                styles.addNoteBtn,
                {
                  minHeight: theme.minTouchTarget,
                  backgroundColor: theme.colors.accentPrimary,
                },
              ]}
            >
              <Ionicons name="add" size={22} color={theme.colors.white} />
            </Pressable>
          </View>

          <View style={{ gap: 8, marginTop: 12 }}>
            {activeProfile.caregiverNotes.map((note, idx) => (
              <View
                key={`${idx}-${note.slice(0, 12)}`}
                style={[
                  styles.noteItem,
                  {
                    backgroundColor: theme.colors.backgroundPrimary,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="pin-outline"
                  size={18}
                  color={theme.colors.accentPrimary}
                />
                <Text
                  style={{
                    flex: 1,
                    fontSize: theme.font.sm,
                    lineHeight: theme.lineHeight.sm,
                    color: theme.colors.textPrimary,
                  }}
                >
                  {note}
                </Text>
                <Pressable
                  onPress={() => {
                    triggerSoftImpactHaptic();
                    removeCaregiverNote(activeProfile.id, idx);
                  }}
                  hitSlop={10}
                >
                  <Ionicons
                    name="close-circle-outline"
                    size={20}
                    color={theme.colors.textMuted}
                  />
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* 4. Care Circle Roster & Add Profile */}
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
        <View style={styles.rosterHeader}>
          <Text
            style={{
              fontSize: theme.font.subtitle,
              fontWeight: '800',
              color: theme.colors.textPrimary,
            }}
          >
            Care Circle Members
          </Text>
          <Pressable
            onPress={() => {
              triggerSoftImpactHaptic();
              setNewProfileModalOpen(true);
            }}
            style={[
              styles.newProfileBtn,
              {
                minHeight: theme.minTouchTarget,
                backgroundColor: theme.colors.accentSoft,
                borderColor: theme.colors.accentBorder,
              },
            ]}
          >
            <Ionicons
              name="person-add-outline"
              size={16}
              color={theme.colors.accentPrimary}
            />
            <Text
              style={{
                fontSize: theme.font.xs,
                fontWeight: '700',
                color: theme.colors.accentPrimary,
              }}
            >
              Add Member
            </Text>
          </Pressable>
        </View>

        <View style={{ gap: 10, marginTop: 12 }}>
          {profiles.map((prof) => {
            const selected = prof.id === activeProfile.id;
            return (
              <Pressable
                key={prof.id}
                onPress={() => {
                  triggerSoftImpactHaptic();
                  setActiveProfile(prof.id);
                }}
                style={[
                  styles.memberRow,
                  {
                    minHeight: theme.minTouchTarget,
                    backgroundColor: selected
                      ? theme.colors.accentSoft
                      : theme.colors.backgroundPrimary,
                    borderColor: selected
                      ? theme.colors.accentPrimary
                      : theme.colors.border,
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
                    {prof.name} ({prof.age})
                  </Text>
                  <Text
                    style={{
                      fontSize: theme.font.xs,
                      color: theme.colors.textSecondary,
                      marginTop: 2,
                    }}
                  >
                    {prof.relation} • {prof.conditions.join(' • ')}
                  </Text>
                </View>
                {selected && (
                  <Ionicons
                    name="checkmark-circle"
                    size={22}
                    color={theme.colors.accentPrimary}
                  />
                )}
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={() => {
            triggerSoftImpactHaptic();
            resetDemoState();
          }}
          style={[
            styles.resetBtn,
            {
              minHeight: theme.minTouchTarget,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Ionicons
            name="refresh-circle-outline"
            size={18}
            color={theme.colors.textSecondary}
          />
          <Text
            style={{
              fontSize: theme.font.xs,
              fontWeight: '600',
              color: theme.colors.textSecondary,
            }}
          >
            Reset Demo Care Circle & Dose Logs
          </Text>
        </Pressable>
      </View>

      {/* Add Care Circle Member Modal */}
      <Modal
        visible={newProfileModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setNewProfileModalOpen(false)}
      >
        <Pressable
          style={[styles.modalBackdrop, { backgroundColor: theme.colors.overlay }]}
          onPress={() => setNewProfileModalOpen(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[
              styles.modalSheet,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text
              style={{
                fontSize: theme.font.title,
                fontWeight: '800',
                color: theme.colors.textPrimary,
                marginBottom: 12,
              }}
            >
              Add Care Circle Member
            </Text>

            <View style={{ gap: 10 }}>
              <TextInput
                value={newName}
                onChangeText={setNewName}
                placeholder="Full Name (e.g., Robert Chen)"
                placeholderTextColor={theme.colors.textMuted}
                style={[
                  styles.modalInput,
                  {
                    minHeight: theme.minTouchTarget,
                    color: theme.colors.textPrimary,
                    backgroundColor: theme.colors.backgroundPrimary,
                    borderColor: theme.colors.border,
                  },
                ]}
              />
              <TextInput
                value={newRelation}
                onChangeText={setNewRelation}
                placeholder="Relation (e.g., Uncle • Care Circle)"
                placeholderTextColor={theme.colors.textMuted}
                style={[
                  styles.modalInput,
                  {
                    minHeight: theme.minTouchTarget,
                    color: theme.colors.textPrimary,
                    backgroundColor: theme.colors.backgroundPrimary,
                    borderColor: theme.colors.border,
                  },
                ]}
              />
              <TextInput
                value={newAge}
                onChangeText={setNewAge}
                keyboardType="number-pad"
                placeholder="Age"
                placeholderTextColor={theme.colors.textMuted}
                style={[
                  styles.modalInput,
                  {
                    minHeight: theme.minTouchTarget,
                    color: theme.colors.textPrimary,
                    backgroundColor: theme.colors.backgroundPrimary,
                    borderColor: theme.colors.border,
                  },
                ]}
              />
              <TextInput
                value={newConditions}
                onChangeText={setNewConditions}
                placeholder="Conditions (comma-separated)"
                placeholderTextColor={theme.colors.textMuted}
                style={[
                  styles.modalInput,
                  {
                    minHeight: theme.minTouchTarget,
                    color: theme.colors.textPrimary,
                    backgroundColor: theme.colors.backgroundPrimary,
                    borderColor: theme.colors.border,
                  },
                ]}
              />
            </View>

            <Pressable
              onPress={handleCreateProfile}
              style={[
                styles.primaryExportBtn,
                {
                  minHeight: theme.minTouchTarget,
                  backgroundColor: theme.colors.accentPrimary,
                  marginTop: 16,
                },
              ]}
            >
              <Text
                style={{
                  fontSize: theme.font.body,
                  fontWeight: '700',
                  color: theme.colors.white,
                }}
              >
                Create Profile
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
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
  card: {
    borderWidth: 1,
    marginBottom: 18,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  primaryExportBtn: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  smsPreviewBox: {
    marginTop: 14,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  copyAgainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-end',
  },
  supplyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  refillBtn: {
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  noteInput: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  addNoteBtn: {
    width: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  rosterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  newProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  resetBtn: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 22,
  },
  modalSheet: {
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
  },
  modalInput: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 16,
  },
});
