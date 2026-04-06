import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

type RegionOption = { label: string; value: string };
const REGIONS: RegionOption[] = [
  { label: 'All regions', value: '' },
  { label: 'Anatolia', value: 'Anatolia' },
  { label: 'Aegean', value: 'Aegean' },
];

export default function HomeScreen({ navigation }: Props) {
  const { user, isAuthenticated, logout } = useAuth();
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('');
  const [regionOpen, setRegionOpen] = useState(false);

  const selectedRegionLabel = useMemo(
    () => REGIONS.find((r) => r.value === region)?.label ?? 'All regions',
    [region],
  );

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

          <View style={styles.searchCard}>
            <Text style={styles.searchTitle}>Search &amp; discovery</Text>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search recipes and stories…"
              placeholderTextColor="#94a3b8"
              style={styles.searchInput}
              accessibilityLabel="Search query"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={() =>
                navigation.navigate('Search', { query: query.trim(), region })
              }
            />

            <View style={styles.regionRow}>
              <Text style={styles.regionLabel}>Region</Text>
              <Pressable
                onPress={() => setRegionOpen(true)}
                style={({ pressed }) => [styles.regionButton, pressed && styles.buttonPressed]}
                accessibilityRole="button"
                accessibilityLabel="Pick region filter"
              >
                <Text style={styles.regionButtonText}>{selectedRegionLabel}</Text>
              </Pressable>
            </View>

            <Pressable
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
              onPress={() => navigation.navigate('Search', { query: query.trim(), region })}
              accessibilityRole="button"
              accessibilityLabel="Run search"
            >
              <Text style={styles.buttonText}>Search</Text>
            </Pressable>
          </View>

          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={() => navigation.navigate('Search')}
            accessibilityRole="button"
            accessibilityLabel="Go to Search"
          >
            <Text style={styles.buttonText}>Open Search (legacy)</Text>
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
            onPress={() => navigation.navigate('StoryCreate')}
            accessibilityRole="button"
            accessibilityLabel="Create a story"
          >
            <Text style={styles.buttonText}>Create story</Text>
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

      <Modal visible={regionOpen} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setRegionOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Pick a region</Text>
            {REGIONS.map((opt) => {
              const active = opt.value === region;
              return (
                <Pressable
                  key={opt.value || 'all'}
                  onPress={() => {
                    setRegion(opt.value);
                    setRegionOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.modalRow,
                    pressed && { backgroundColor: '#e2e8f0' },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Select region ${opt.label}`}
                >
                  <Text style={[styles.modalRowText, active && styles.modalRowTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
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
  searchCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#f8fafc',
    marginBottom: 14,
  },
  searchTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 10 },
  searchInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  regionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
  regionLabel: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  regionButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  regionButtonText: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a', marginBottom: 10 },
  modalRow: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  modalRowText: { fontSize: 16, color: '#0f172a', fontWeight: '600' },
  modalRowTextActive: { color: '#2563eb' },
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
