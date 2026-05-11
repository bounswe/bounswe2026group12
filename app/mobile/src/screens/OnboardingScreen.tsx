import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { updateMe } from '../services/authService';
import { tokens } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

const SKIP_FLAG = 'onboarding_skipped';

type StepKey =
  | 'cultural_interests'
  | 'regional_ties'
  | 'religious_preferences'
  | 'event_interests';

type Step = {
  key: StepKey;
  title: string;
  description: string;
  options: string[];
};

const STEPS: Step[] = [
  {
    key: 'cultural_interests',
    title: 'Cultural Interests',
    description: 'Choose cuisines and traditions you want to explore.',
    options: ['Ottoman', 'Anatolian', 'Balkan', 'Levantine', 'Mediterranean', 'Central Asian'],
  },
  {
    key: 'regional_ties',
    title: 'Regional Ties',
    description: 'Select regions connected to your family or roots.',
    options: ['Aegean', 'Marmara', 'Central Anatolia', 'Black Sea', 'Mediterranean', 'Southeastern Anatolia'],
  },
  {
    key: 'religious_preferences',
    title: 'Dietary / Religious Preferences',
    description: 'Pick preferences to personalize recommendations.',
    options: ['Halal', 'Kosher', 'Vegetarian', 'Vegan', 'Pescetarian', 'No Preference'],
  },
  {
    key: 'event_interests',
    title: 'Event Interests',
    description: 'Choose occasions you cook for most often.',
    options: ['Ramadan', 'Eid', 'Weddings', 'Family Gatherings', 'Religious Holidays', 'Weeknight Meals'],
  },
];

function normalizeList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v) => typeof v === 'string') : [];
}

export default function OnboardingScreen({ navigation }: Props) {
  const { user, updateUser } = useAuth();
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [values, setValues] = useState<Record<StepKey, string[]>>(() => ({
    cultural_interests: normalizeList(user?.cultural_interests),
    regional_ties: normalizeList(user?.regional_ties),
    religious_preferences: normalizeList(user?.religious_preferences),
    event_interests: normalizeList(user?.event_interests),
  }));

  const current = STEPS[stepIndex];
  const progress = Math.round(((stepIndex + 1) / STEPS.length) * 100);

  // Onboarding is intentionally lenient: users may skip without selecting
  // anything on any step. The product preference is to lower the friction of
  // signup; empty preferences are valid and culture cards still surface
  // useful content without explicit picks.
  const isComplete = useMemo(
    () => STEPS.every((step) => Array.isArray(values[step.key])),
    [values],
  );

  const toggleValue = (option: string) => {
    setValues((prev) => {
      const currentValues = prev[current.key];
      const exists = currentValues.includes(option);
      const next = exists
        ? currentValues.filter((item) => item !== option)
        : [...currentValues, option];
      return { ...prev, [current.key]: next };
    });
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem(SKIP_FLAG, 'true');
    navigation.popToTop();
  };

  const handleFinish = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateMe(values);
      await updateUser({ ...(user ?? ({} as never)), ...updated });
      await AsyncStorage.removeItem(SKIP_FLAG);
      navigation.popToTop();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save onboarding preferences.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.heading} accessibilityRole="header">
            Cultural Onboarding
          </Text>
          <Text style={styles.subheading}>
            Help us personalize recipes, stories, and recommendations for you.
          </Text>
          <View style={styles.progressTrack} accessibilityLabel="Onboarding progress">
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.stepLabel}>
            Step {stepIndex + 1} of {STEPS.length}
          </Text>
        </View>

        <View style={styles.stepCard}>
          <Text style={styles.stepTitle}>{current.title}</Text>
          <Text style={styles.stepDesc}>{current.description}</Text>
          <View style={styles.options}>
            {current.options.map((option) => {
              const checked = values[current.key].includes(option);
              return (
                <Pressable
                  key={option}
                  onPress={() => toggleValue(option)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked }}
                  accessibilityLabel={option}
                  style={({ pressed }) => [
                    styles.chip,
                    checked && styles.chipActive,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Text style={[styles.chipText, checked && styles.chipTextActive]}>{option}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.actions}>
          <Pressable
            onPress={() => setStepIndex((prev) => Math.max(0, prev - 1))}
            disabled={stepIndex === 0 || saving}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={({ pressed }) => [
              styles.btn,
              styles.btnOutline,
              (stepIndex === 0 || saving) && styles.btnDisabled,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={styles.btnOutlineText}>Back</Text>
          </Pressable>

          <View style={styles.rightActions}>
            <Pressable
              onPress={handleSkip}
              disabled={saving}
              accessibilityRole="button"
              accessibilityLabel="Skip onboarding for now"
              style={({ pressed }) => [
                styles.btn,
                styles.btnOutline,
                saving && styles.btnDisabled,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={styles.btnOutlineText}>Skip for now</Text>
            </Pressable>

            {stepIndex < STEPS.length - 1 ? (
              <Pressable
                onPress={() => setStepIndex((prev) => Math.min(STEPS.length - 1, prev + 1))}
                disabled={saving}
                accessibilityRole="button"
                accessibilityLabel="Next step"
                style={({ pressed }) => [
                  styles.btn,
                  styles.btnPrimary,
                  saving && styles.btnDisabled,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text style={styles.btnPrimaryText}>Next</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={handleFinish}
                disabled={!isComplete || saving}
                accessibilityRole="button"
                accessibilityLabel="Finish onboarding"
                style={({ pressed }) => [
                  styles.btn,
                  styles.btnPrimary,
                  (!isComplete || saving) && styles.btnDisabled,
                  pressed && { opacity: 0.85 },
                ]}
              >
                {saving ? (
                  <ActivityIndicator color="#FAF7EF" />
                ) : (
                  <Text style={styles.btnPrimaryText}>Finish</Text>
                )}
              </Pressable>
            )}
          </View>
        </View>

        <Text style={styles.helpText}>
          You can update these preferences later from your profile.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.colors.surface },
  container: { padding: 16, gap: 18, paddingBottom: 40 },
  header: { gap: 8 },
  heading: { fontSize: 24, fontWeight: '900', color: tokens.colors.text },
  subheading: { fontSize: 14, color: tokens.colors.textMuted, lineHeight: 20 },
  progressTrack: {
    height: 8,
    borderRadius: tokens.radius.pill,
    backgroundColor: 'rgba(0,0,0,0.12)',
    overflow: 'hidden',
    marginTop: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: tokens.colors.accentGreen,
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: tokens.colors.surfaceDark,
    letterSpacing: 0.4,
  },
  stepCard: {
    padding: 16,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.surfaceInput,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    gap: 12,
  },
  stepTitle: { fontSize: 18, fontWeight: '900', color: tokens.colors.text },
  stepDesc: { fontSize: 14, color: tokens.colors.textMuted, lineHeight: 20 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: tokens.radius.pill,
    borderWidth: 1.5,
    borderColor: '#000000',
    backgroundColor: tokens.colors.accentMustard,
  },
  chipActive: {
    backgroundColor: tokens.colors.accentGreen,
    borderColor: '#000000',
  },
  chipText: { fontSize: 13, fontWeight: '800', color: '#000000' },
  chipTextActive: { color: '#FAF7EF' },
  errorText: { color: '#991b1b', fontSize: 13, fontWeight: '700' },
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  rightActions: { flexDirection: 'row', gap: 8 },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: tokens.radius.pill,
    minWidth: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: tokens.colors.surfaceDark,
  },
  btnOutlineText: { color: tokens.colors.surfaceDark, fontWeight: '800', fontSize: 14 },
  btnPrimary: {
    backgroundColor: tokens.colors.accentGreen,
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  btnPrimaryText: { color: '#FAF7EF', fontWeight: '800', fontSize: 14 },
  btnDisabled: { opacity: 0.5 },
  helpText: { fontSize: 12, color: tokens.colors.textMuted, textAlign: 'center', marginTop: 4 },
});
