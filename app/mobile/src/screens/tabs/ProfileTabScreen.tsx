import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { shadows, tokens } from '../../theme';

export default function ProfileTabScreen() {
  const navigation = useNavigation<any>();
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title} accessibilityRole="header">
            Profile
          </Text>

          {isAuthenticated ? (
            <>
              <Text style={styles.subtitle}>
                Signed in{user ? ` as ${user.username}` : ''}.
              </Text>
              {user ? (
                <>
                  <Pressable
                    onPress={() =>
                      navigation.navigate('Feed', {
                        screen: 'UserProfile',
                        params: { userId: user.id, username: user.username },
                      })
                    }
                    style={({ pressed }) => [styles.actionBtn, styles.myProfileBtn, pressed && styles.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel="View my profile"
                  >
                    <Text style={styles.myProfileBtnText}>My profile</Text>
                  </Pressable>
                  <View style={{ height: 12 }} />
                </>
              ) : null}
              <Pressable
                onPress={() => navigation.navigate('Feed', { screen: 'Inbox' })}
                style={({ pressed }) => [styles.actionBtn, styles.messagesBtn, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Open messages"
              >
                <Text style={styles.messagesBtnText}>Messages</Text>
              </Pressable>
              <View style={{ height: 12 }} />
              <Pressable
                onPress={() => navigation.navigate('Feed', { screen: 'Onboarding' })}
                style={({ pressed }) => [styles.actionBtn, styles.culturalBtn, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Update cultural preferences"
              >
                <Text style={styles.culturalBtnText}>Cultural preferences</Text>
              </Pressable>
              <View style={{ height: 12 }} />
              <Pressable
                onPress={() => void logout()}
                style={({ pressed }) => [styles.actionBtn, styles.logoutBtn, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Log out"
              >
                <Text style={styles.logoutBtnText}>Log out</Text>
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
                  style={({ pressed }) => [styles.registerBtn, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Go to Register"
                >
                  <Text style={styles.registerBtnText}>Register</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.colors.bg },
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  card: {
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    ...shadows.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: tokens.colors.text,
    marginBottom: 10,
    fontFamily: tokens.typography.display.fontFamily,
  },
  subtitle: { fontSize: 16, color: tokens.colors.textMuted, lineHeight: 22, marginBottom: 16 },
  row: { flexDirection: 'row', gap: 12 },
  primary: {
    flex: 1,
    backgroundColor: tokens.colors.accentGreen,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: tokens.radius.pill,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000000',
    ...shadows.md,
    maxWidth: 340,
    alignSelf: 'center',
  },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  secondary: {
    borderWidth: 2,
    borderColor: tokens.colors.surfaceDark,
    backgroundColor: tokens.colors.bg,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: tokens.radius.pill,
    alignItems: 'center',
    maxWidth: 340,
    alignSelf: 'center',
    width: '100%',
  },
  secondaryText: { color: tokens.colors.text, fontSize: 16, fontWeight: '800' },
  actionBtn: {
    borderWidth: 2,
    borderColor: tokens.colors.surfaceDark,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: tokens.radius.pill,
    alignItems: 'center',
    maxWidth: 340,
    alignSelf: 'center',
    width: '100%',
    ...shadows.md,
  },
  myProfileBtn: { backgroundColor: tokens.colors.accentMustard },
  myProfileBtnText: { color: tokens.colors.surfaceDark, fontSize: 16, fontWeight: '800' },
  messagesBtn: { backgroundColor: "#C8E5EB" },
  messagesBtnText: { color: tokens.colors.surfaceDark, fontSize: 16, fontWeight: '800' },
  culturalBtn: { backgroundColor: '#C8E5EB' },
  culturalBtnText: { color: tokens.colors.surfaceDark, fontSize: 16, fontWeight: '800' },
  logoutBtn: { backgroundColor: '#FC6C85' },
  logoutBtnText: { color: tokens.colors.surfaceDark, fontSize: 16, fontWeight: '800' },
  registerBtn: {
    flex: 1,
    backgroundColor: '#EFBF04',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: tokens.radius.pill,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000000',
    ...shadows.md,
    maxWidth: 340,
    alignSelf: 'center',
  },
  registerBtnText: { color: '#000000', fontSize: 16, fontWeight: '800' },
  pressed: { opacity: 0.9 },
});

