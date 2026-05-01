import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CommonActions } from '@react-navigation/native';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { validateLoginForm } from '../lib/authValidation';
import type { RootStackParamList } from '../navigation/types';
import { loginRequest } from '../services/authService';
import { shadows, tokens } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const errs = validateLoginForm(email, password);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setApiError('');
    setSubmitting(true);
    try {
      const data = await loginRequest(email, password);
      await login(data.user, data.access);
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        })
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setApiError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          <Text style={styles.heading} accessibilityRole="header">
            Log In
          </Text>

          <View style={styles.field}>
            <Text style={styles.label} nativeID="login-email-label">
              Email
            </Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!submitting}
              accessibilityLabel="Email"
              accessibilityLabelledBy="login-email-label"
            />
            {errors.email ? <Text style={styles.fieldError}>{errors.email}</Text> : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label} nativeID="login-password-label">
              Password
            </Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!submitting}
              accessibilityLabel="Password"
              accessibilityLabelledBy="login-password-label"
            />
            {errors.password ? (
              <Text style={styles.fieldError}>{errors.password}</Text>
            ) : null}
          </View>

          {apiError ? <Text style={styles.apiError}>{apiError}</Text> : null}

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              (pressed || submitting) && styles.primaryButtonPressed,
            ]}
            onPress={handleSubmit}
            disabled={submitting}
            accessibilityRole="button"
            accessibilityLabel="Submit log in"
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Log In</Text>
            )}
          </Pressable>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don&apos;t have an account? </Text>
            <Pressable
              onPress={() => navigation.navigate('Register')}
              accessibilityRole="button"
              accessibilityLabel="Go to Register"
            >
              <Text style={styles.link}>Register</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.colors.bg },
  flex: { flex: 1 },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 24,
    color: tokens.colors.text,
    fontFamily: tokens.typography.display.fontFamily,
  },
  field: { marginBottom: 16 },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 6, color: tokens.colors.text },
  input: {
    borderWidth: 2,
    borderColor: tokens.colors.primaryBorder,
    borderRadius: tokens.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: tokens.colors.surfaceInput,
    color: tokens.colors.text,
    ...shadows.sm,
  },
  fieldError: { color: tokens.colors.error, marginTop: 6, fontSize: 14 },
  apiError: { color: tokens.colors.error, marginBottom: 12, fontSize: 15 },
  primaryButton: {
    backgroundColor: tokens.colors.accentGreen,
    paddingVertical: 14,
    borderRadius: tokens.radius.pill,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 2,
    borderColor: tokens.colors.primary,
    ...shadows.md,
  },
  primaryButtonPressed: { opacity: 0.88 },
  primaryButtonText: { color: tokens.colors.text, fontSize: 16, fontWeight: '700' },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: { fontSize: 15, color: tokens.colors.text },
  link: { fontSize: 15, color: tokens.colors.text, fontWeight: '800' },
});
