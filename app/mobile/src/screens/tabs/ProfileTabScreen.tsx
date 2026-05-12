import React from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { shadows, tokens } from '../../theme';

type ActionRowProps = {
  icon: string;
  label: string;
  onPress: () => void;
  accessibilityLabel: string;
  danger?: boolean;
};

function ActionRow({ icon, label, onPress, accessibilityLabel, danger }: ActionRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        danger ? styles.rowDanger : null,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Text style={styles.rowIcon}>{icon}</Text>
      <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.rowChevron, danger && styles.rowLabelDanger]}>{'→'}</Text>
    </Pressable>
  );
}

export default function ProfileTabScreen() {
  const navigation = useNavigation<any>();
  const { user, isAuthenticated, logout } = useAuth();

  const openUserProfile = () => {
    if (!user) return;
    navigation.navigate('Feed', {
      screen: 'UserProfile',
      params: { userId: user.id, username: user.username },
    });
  };

  const initial = (user?.username ?? 'U').slice(0, 1).toUpperCase();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.title} accessibilityRole="header">
            Profile
          </Text>

          {isAuthenticated && user ? (
            <>
              <Pressable
                onPress={openUserProfile}
                style={({ pressed }) => [styles.header, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={`Open profile for ${user.username}`}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initial}</Text>
                </View>
                <View style={styles.headerText}>
                  <Text style={styles.username} numberOfLines={1}>
                    @{user.username}
                  </Text>
                  {user.email ? (
                    <Text style={styles.email} numberOfLines={1}>
                      {user.email}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.headerChevron}>{'→'}</Text>
              </Pressable>

              <View style={styles.list}>
                <ActionRow
                  icon="\u{1F373}"
                  label="My recipes"
                  onPress={openUserProfile}
                  accessibilityLabel="View my recipes"
                />
                <ActionRow
                  icon="\u{1F4DC}"
                  label="My stories"
                  onPress={openUserProfile}
                  accessibilityLabel="View my stories"
                />
                <ActionRow
                  icon="\u{1F516}"
                  label="Saved recipes"
                  onPress={openUserProfile}
                  accessibilityLabel="View saved recipes"
                />
                <ActionRow
                  icon="✉️"
                  label="Messages"
                  onPress={() => navigation.navigate('Feed', { screen: 'Inbox' })}
                  accessibilityLabel="Open messages"
                />
                <ActionRow
                  icon="\u{1F30D}"
                  label="Cultural preferences"
                  onPress={() => navigation.navigate('Feed', { screen: 'Onboarding' })}
                  accessibilityLabel="Update cultural preferences"
                />
                <ActionRow
                  icon="✏️"
                  label="Edit profile"
                  onPress={() => navigation.navigate('Feed', { screen: 'EditProfile' })}
                  accessibilityLabel="Edit profile"
                />
                <ActionRow
                  icon="\u{1F6AA}"
                  label="Log out"
                  onPress={() => void logout()}
                  accessibilityLabel="Log out"
                  danger
                />
              </View>
            </>
          ) : (
            <>
              <Text style={styles.greeting}>
                Welcome, traveller. Sign in to share recipes and stories from your culture.
              </Text>
              <Text style={styles.subtitle}>
                No profile yet. Log in or register to continue.
              </Text>
              <View style={styles.authRow}>
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.colors.bg },
  container: { padding: 20, paddingBottom: 32 },
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
    marginBottom: 14,
    fontFamily: tokens.typography.display.fontFamily,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: tokens.radius.xl,
    borderWidth: 2,
    borderColor: tokens.colors.surfaceDark,
    backgroundColor: tokens.colors.bg,
    marginBottom: 16,
    ...shadows.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 999,
    backgroundColor: tokens.colors.accentGreenTint,
    borderWidth: 2,
    borderColor: tokens.colors.surfaceDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 22, fontWeight: '900', color: tokens.colors.text },
  headerText: { flex: 1, minWidth: 0 },
  username: {
    fontSize: 20,
    fontWeight: '800',
    color: tokens.colors.text,
    fontFamily: tokens.typography.display.fontFamily,
  },
  email: { fontSize: 14, color: tokens.colors.textMuted, marginTop: 2 },
  headerChevron: { fontSize: 22, fontWeight: '800', color: tokens.colors.text, marginLeft: 4 },
  list: { gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: tokens.radius.xl,
    borderWidth: 2,
    borderColor: tokens.colors.surfaceDark,
    backgroundColor: tokens.colors.bg,
    ...shadows.md,
  },
  rowDanger: { backgroundColor: '#FC6C85' },
  rowIcon: { fontSize: 18 },
  rowLabel: { flex: 1, fontSize: 16, fontWeight: '800', color: tokens.colors.text },
  rowLabelDanger: { color: tokens.colors.surfaceDark },
  rowChevron: { fontSize: 18, fontWeight: '800', color: tokens.colors.text },
  greeting: {
    fontSize: 16,
    color: tokens.colors.text,
    lineHeight: 22,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  subtitle: { fontSize: 16, color: tokens.colors.textMuted, lineHeight: 22, marginBottom: 16 },
  authRow: { flexDirection: 'row', gap: 12 },
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
