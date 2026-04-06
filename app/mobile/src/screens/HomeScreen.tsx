import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <View style={styles.main}>
          <Text style={styles.heading} accessibilityRole="header">
            Home
          </Text>
          <Text style={styles.lead}>
            Public routes: Home, Search, Recipe detail, Story detail (no sign-in required).
          </Text>

          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={() => navigation.navigate('Search')}
            accessibilityRole="button"
            accessibilityLabel="Go to Search"
          >
            <Text style={styles.buttonText}>Search</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={() => navigation.navigate('RecipeCreate')}
            accessibilityRole="button"
            accessibilityLabel="Open new recipe screen"
          >
            <Text style={styles.buttonText}>New recipe (selection UI)</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={() => navigation.navigate('RecipeDetail', { id: '1' })}
            accessibilityRole="button"
            accessibilityLabel="Open sample recipe"
          >
            <Text style={styles.buttonText}>Sample recipe (id 1)</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={() => navigation.navigate('StoryDetail', { id: '1' })}
            accessibilityRole="button"
            accessibilityLabel="Open sample story"
          >
            <Text style={styles.buttonText}>Sample story (id 1)</Text>
          </Pressable>
        </View>

        <View style={styles.authFooter}>
          {isAuthenticated ? (
            <>
              <Text style={styles.signedInText}>
                Signed in{user ? ` as ${user.username}` : ''}
              </Text>
              <Pressable
                onPress={() => void logout()}
                accessibilityRole="button"
                accessibilityLabel="Log out"
              >
                <Text style={styles.link}>Log out</Text>
              </Pressable>
            </>
          ) : (
            <View style={styles.authRow}>
              <Pressable
                onPress={() => navigation.navigate('Login')}
                accessibilityRole="button"
                accessibilityLabel="Go to Log In"
              >
                <Text style={styles.link}>Log In</Text>
              </Pressable>
              <Text style={styles.authSep}> · </Text>
              <Pressable
                onPress={() => navigation.navigate('Register')}
                accessibilityRole="button"
                accessibilityLabel="Go to Register"
              >
                <Text style={styles.link}>Register</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: {
    flex: 1,
    padding: 20,
  },
  main: {
    flex: 1,
    justifyContent: 'center',
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  lead: {
    fontSize: 16,
    opacity: 0.75,
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  authFooter: {
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e2e8f0',
    alignItems: 'center',
    gap: 8,
  },
  authRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  authSep: { fontSize: 15, color: '#94a3b8' },
  link: { fontSize: 15, color: '#2563eb', fontWeight: '600' },
  signedInText: { fontSize: 15, color: '#64748b' },
});
