import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LoadingView } from '../components/ui/LoadingView';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  fetchOwnProfile,
  updateOwnProfile,
  type UpdateProfilePayload,
  type UserProfile,
} from '../services/profileService';
import { shadows, tokens } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'EditProfile'>;

const BIO_MAX = 500;
const REGION_MAX = 100;

type FormState = {
  bio: string;
  region: string;
};

function toForm(profile: UserProfile | null): FormState {
  return {
    bio: typeof profile?.bio === 'string' ? profile.bio : '',
    region: typeof profile?.region === 'string' ? profile.region : '',
  };
}

export default function EditProfileScreen({ navigation }: Props) {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [form, setForm] = useState<FormState>({ bio: '', region: '' });
  const [initial, setInitial] = useState<FormState>({ bio: '', region: '' });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await fetchOwnProfile();
        if (cancelled) return;
        const next = toForm(data);
        setProfile(data);
        setForm(next);
        setInitial(next);
      } catch (e) {
        if (cancelled) return;
        setLoadError(e instanceof Error ? e.message : 'Could not load profile.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const isDirty = useMemo(
    () => form.bio !== initial.bio || form.region !== initial.region,
    [form, initial],
  );

  const bioOver = form.bio.length > BIO_MAX;
  const canSave = !saving && !bioOver && isDirty;

  const tryGoBack = useCallback(() => {
    if (!isDirty) {
      navigation.goBack();
      return;
    }
    Alert.alert(
      'Discard changes?',
      'You have unsaved changes. Are you sure you want to leave?',
      [
        { text: 'Keep editing', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => navigation.goBack(),
        },
      ],
    );
  }, [isDirty, navigation]);

  const handleSave = useCallback(async () => {
    if (bioOver) {
      setSaveError(`Bio must be ${BIO_MAX} characters or fewer.`);
      return;
    }
    setSaving(true);
    setSaveError(null);
    const payload: UpdateProfilePayload = {};
    if (form.bio !== initial.bio) payload.bio = form.bio;
    if (form.region !== initial.region) payload.region = form.region;
    try {
      const updated = await updateOwnProfile(payload);
      // Mirror the fields AuthContext cares about so the rest of the app sees
      // the change immediately (UserProfile is a superset of AuthUser).
      if (user) {
        await updateUser({
          ...user,
          bio: updated.bio ?? null,
          region: updated.region ?? null,
          preferred_language: updated.preferred_language ?? user.preferred_language ?? null,
          cultural_interests: updated.cultural_interests ?? user.cultural_interests,
          regional_ties: updated.regional_ties ?? user.regional_ties,
          religious_preferences: updated.religious_preferences ?? user.religious_preferences,
          event_interests: updated.event_interests ?? user.event_interests,
          is_contactable:
            typeof updated.is_contactable === 'boolean'
              ? updated.is_contactable
              : user.is_contactable,
        });
      }
      setProfile(updated);
      const nextForm = toForm(updated);
      setForm(nextForm);
      setInitial(nextForm);
      showToast('Profile updated', 'success');
      navigation.goBack();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Could not save profile.');
    } finally {
      setSaving(false);
    }
  }, [bioOver, form, initial, navigation, showToast, updateUser, user]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.topBar}>
        <Pressable
          onPress={tryGoBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        >
          <Text style={styles.backBtnText}>{'←'}</Text>
        </Pressable>
        <Text style={styles.title} accessibilityRole="header">
          Edit profile
        </Text>
        <View style={styles.backBtnSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {loading ? (
          <LoadingView message="Loading profile…" />
        ) : loadError ? (
          <View style={styles.errorBox} accessibilityRole="alert">
            <Text style={styles.errorTitle}>Couldn’t load profile</Text>
            <Text style={styles.errorBody}>{loadError}</Text>
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Username</Text>
              <View style={styles.readOnlyField}>
                <Text style={styles.readOnlyText} accessibilityLabel={`Username ${profile?.username ?? ''}`}>
                  @{profile?.username ?? ''}
                </Text>
              </View>
              <Text style={styles.helpText}>
                Contact support to change your username or email.
              </Text>

              <Text style={[styles.sectionLabel, styles.sectionLabelTop]}>Email</Text>
              <View style={styles.readOnlyField}>
                <Text style={styles.readOnlyText} numberOfLines={1}>
                  {profile?.email ?? ''}
                </Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Bio</Text>
              <TextInput
                value={form.bio}
                onChangeText={(v) => setForm((p) => ({ ...p, bio: v }))}
                multiline
                placeholder="Tell others about your cooking and cultural background…"
                placeholderTextColor={tokens.colors.textMuted}
                style={styles.textArea}
                accessibilityLabel="Bio"
                editable={!saving}
              />
              <Text
                style={[styles.counter, bioOver && styles.counterOver]}
                accessibilityLabel={`Bio character count ${form.bio.length} of ${BIO_MAX}`}
              >
                {form.bio.length}/{BIO_MAX}
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Region</Text>
              <TextInput
                value={form.region}
                onChangeText={(v) =>
                  setForm((p) => ({ ...p, region: v.slice(0, REGION_MAX) }))
                }
                placeholder="e.g. Black Sea"
                placeholderTextColor={tokens.colors.textMuted}
                style={styles.input}
                accessibilityLabel="Region"
                editable={!saving}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Cultural preferences</Text>
              <Pressable
                onPress={() => navigation.navigate('Onboarding')}
                accessibilityRole="button"
                accessibilityLabel="Edit cultural preferences"
                style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}
              >
                <Text style={styles.linkRowLabel}>Edit cultural preferences</Text>
                <Text style={styles.linkRowChevron}>{'→'}</Text>
              </Pressable>
              <Text style={styles.helpText}>
                Update cultural interests, regional ties, dietary preferences, and event interests.
              </Text>
            </View>

            {saveError ? (
              <Text style={styles.errorText} accessibilityRole="alert">
                {saveError}
              </Text>
            ) : null}

            <Pressable
              onPress={handleSave}
              disabled={!canSave}
              accessibilityRole="button"
              accessibilityLabel="Save profile"
              style={({ pressed }) => [
                styles.saveBtn,
                !canSave && styles.saveBtnDisabled,
                pressed && styles.pressed,
              ]}
            >
              {saving ? (
                <ActivityIndicator color="#FAF7EF" />
              ) : (
                <Text style={styles.saveBtnText}>Save changes</Text>
              )}
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.colors.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 8,
    gap: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: tokens.colors.surfaceDark,
    backgroundColor: tokens.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnSpacer: { width: 40, height: 40 },
  backBtnText: { fontSize: 20, fontWeight: '900', color: tokens.colors.text },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '800',
    color: tokens.colors.text,
    fontFamily: tokens.typography.display.fontFamily,
  },
  container: { padding: 16, paddingBottom: 40, gap: 14 },
  section: {
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    gap: 8,
    ...shadows.md,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '900',
    color: tokens.colors.surfaceDark,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  sectionLabelTop: { marginTop: 10 },
  readOnlyField: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.surfaceInput,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  readOnlyText: { fontSize: 15, fontWeight: '700', color: tokens.colors.text },
  helpText: { fontSize: 12, color: tokens.colors.textMuted, lineHeight: 18 },
  input: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.surfaceInput,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    fontSize: 15,
    color: tokens.colors.text,
  },
  textArea: {
    minHeight: 110,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.surfaceInput,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    fontSize: 15,
    color: tokens.colors.text,
    textAlignVertical: 'top',
  },
  counter: {
    alignSelf: 'flex-end',
    fontSize: 12,
    color: tokens.colors.textMuted,
    fontWeight: '700',
  },
  counterOver: { color: tokens.colors.error },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surfaceInput,
  },
  linkRowLabel: { flex: 1, fontSize: 15, fontWeight: '700', color: tokens.colors.text },
  linkRowChevron: { fontSize: 18, fontWeight: '900', color: tokens.colors.text },
  errorBox: {
    padding: 14,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.error,
    gap: 4,
  },
  errorTitle: { fontSize: 14, fontWeight: '800', color: tokens.colors.error },
  errorBody: { fontSize: 13, color: tokens.colors.text },
  errorText: { color: tokens.colors.error, fontSize: 13, fontWeight: '700' },
  saveBtn: {
    backgroundColor: tokens.colors.accentGreen,
    paddingVertical: 14,
    borderRadius: tokens.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000000',
    marginTop: 4,
    ...shadows.md,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#FAF7EF', fontWeight: '900', fontSize: 16, letterSpacing: 0.3 },
  pressed: { opacity: 0.85 },
});
