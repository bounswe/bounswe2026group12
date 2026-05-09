import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { LoadingView } from '../../components/ui/LoadingView';
import { shadows, tokens } from '../../theme';

export default function ShareTabScreen() {
  const navigation = useNavigation<any>();
  const { isAuthenticated, isReady } = useAuth();

  if (!isReady) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.centered}>
          <LoadingView message="Loading…" />
        </View>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.container}>
          <Text style={styles.title} accessibilityRole="header">
            Sign in to share
          </Text>
          <Text style={styles.subtitle}>
            Sharing stories and recipes is available only for authenticated users.
          </Text>

          <View style={styles.grid}>
            <Pressable
              onPress={() => navigation.navigate('Feed', { screen: 'Login' })}
              style={({ pressed }) => [styles.box, pressed && styles.boxPressed]}
              accessibilityRole="button"
              accessibilityLabel="Go to Log In"
            >
              <Text style={styles.boxTitle}>Log In</Text>
              <Text style={styles.boxSubtitle}>Use your account to continue.</Text>
            </Pressable>

            <Pressable
              onPress={() => navigation.navigate('Feed', { screen: 'Register' })}
              style={({ pressed }) => [styles.box, pressed && styles.boxPressed]}
              accessibilityRole="button"
              accessibilityLabel="Go to Register"
            >
              <Text style={styles.boxTitle}>Register</Text>
              <Text style={styles.boxSubtitle}>Create a new account.</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <Text style={styles.title} accessibilityRole="header">
          What do you want to share?
        </Text>

        <View style={styles.grid}>
          <Pressable
            onPress={() => navigation.navigate('Feed', { screen: 'StoryCreate' })}
            style={({ pressed }) => [styles.box, pressed && styles.boxPressed]}
            accessibilityRole="button"
            accessibilityLabel="Share a story"
          >
            <Text style={styles.boxTitle}>Story</Text>
            <Text style={styles.boxSubtitle}>Write and publish a story.</Text>
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate('Feed', { screen: 'RecipeCreate' })}
            style={({ pressed }) => [styles.box, pressed && styles.boxPressed]}
            accessibilityRole="button"
            accessibilityLabel="Share a recipe"
          >
            <Text style={styles.boxTitle}>Recipe</Text>
            <Text style={styles.boxSubtitle}>Upload a recipe with video.</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.colors.bg },
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: tokens.colors.text,
    marginBottom: 10,
    textAlign: 'center',
    fontFamily: tokens.typography.display.fontFamily,
  },
  subtitle: { fontSize: 15, color: tokens.colors.text, lineHeight: 20, textAlign: 'center' },
  grid: { marginTop: 14, gap: 12 },
  box: {
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.xl,
    padding: 16,
    backgroundColor: tokens.colors.surface,
    ...shadows.lg,
  },
  boxPressed: { opacity: 0.9 },
  boxTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: tokens.colors.text,
    marginBottom: 6,
    fontFamily: tokens.typography.display.fontFamily,
  },
  boxSubtitle: { fontSize: 15, color: tokens.colors.textMuted, lineHeight: 20 },
  centered: { flex: 1, justifyContent: 'center', padding: 20 },
});

