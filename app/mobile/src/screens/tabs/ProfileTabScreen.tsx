import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';

export default function ProfileTabScreen() {
  const navigation = useNavigation<any>();
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <Text style={styles.title} accessibilityRole="header">
          Profile
        </Text>

        {isAuthenticated ? (
          <>
            <Text style={styles.subtitle}>
              Signed in{user ? ` as ${user.username}` : ''}.
            </Text>
            <Pressable
              onPress={() => void logout()}
              style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Log out"
            >
              <Text style={styles.primaryText}>Log out</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.subtitle}>
              No profile yet. Log in or register to continue.
            </Text>
            <View style={styles.row}>
              <Pressable
                onPress={() => navigation.navigate('Feed', { screen: 'Login' })}
                style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Go to Log In"
              >
                <Text style={styles.primaryText}>Log In</Text>
              </Pressable>
              <Pressable
                onPress={() => navigation.navigate('Feed', { screen: 'Register' })}
                style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Go to Register"
              >
                <Text style={styles.secondaryText}>Register</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '800', color: '#0f172a', marginBottom: 10 },
  subtitle: { fontSize: 16, color: '#64748b', lineHeight: 22, marginBottom: 16 },
  row: { flexDirection: 'row', gap: 12 },
  primary: {
    flex: 1,
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  secondary: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondaryText: { color: '#0f172a', fontSize: 16, fontWeight: '800' },
  pressed: { opacity: 0.9 },
});

