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
import { validateRegisterForm } from '../lib/authValidation';
import type { RootStackParamList } from '../navigation/types';
import { mockRegisterRequest } from '../services/mockAuthService';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const errs = validateRegisterForm(username, email, password);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setApiError('');
    setSubmitting(true);
    try {
      const data = await mockRegisterRequest(username, email, password);
      await login(data.user, data.access);
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        })
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
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
            Register
          </Text>

          <View style={styles.field}>
            <Text style={styles.label} nativeID="register-username-label">
              Username
            </Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!submitting}
              accessibilityLabel="Username"
              accessibilityLabelledBy="register-username-label"
            />
            {errors.username ? (
              <Text style={styles.fieldError}>{errors.username}</Text>
            ) : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label} nativeID="register-email-label">
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
              accessibilityLabelledBy="register-email-label"
            />
            {errors.email ? <Text style={styles.fieldError}>{errors.email}</Text> : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label} nativeID="register-password-label">
              Password
            </Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!submitting}
              accessibilityLabel="Password"
              accessibilityLabelledBy="register-password-label"
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
            accessibilityLabel="Submit registration"
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Register</Text>
            )}
          </Pressable>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Pressable
              onPress={() => navigation.navigate('Login')}
              accessibilityRole="button"
              accessibilityLabel="Go to Log In"
            >
              <Text style={styles.link}>Log In</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  flex: { flex: 1 },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 24,
  },
  field: { marginBottom: 16 },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  fieldError: { color: '#b91c1c', marginTop: 6, fontSize: 14 },
  apiError: { color: '#b91c1c', marginBottom: 12, fontSize: 15 },
  primaryButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonPressed: { opacity: 0.88 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: { fontSize: 15, color: '#64748b' },
  link: { fontSize: 15, color: '#2563eb', fontWeight: '600' },
});
