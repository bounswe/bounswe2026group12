import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../navigation/types';
import {
  MOCK_SEARCH_RESULTS,
  type MockSearchItem,
} from '../mocks/searchResults';

type Props = NativeStackScreenProps<RootStackParamList, 'Search'>;

function filterItems(query: string): MockSearchItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return MOCK_SEARCH_RESULTS;
  return MOCK_SEARCH_RESULTS.filter(
    (item) =>
      item.title.toLowerCase().includes(q) ||
      item.subtitle.toLowerCase().includes(q)
  );
}

export default function SearchScreen({ navigation }: Props) {
  const [query, setQuery] = useState('');

  const data = useMemo(() => filterItems(query), [query]);

  function onPressItem(item: MockSearchItem) {
    if (item.kind === 'recipe') {
      navigation.navigate('RecipeDetail', { id: item.id });
    } else {
      navigation.navigate('StoryDetail', { id: item.id });
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <Text style={styles.heading} accessibilityRole="header">
          Search
        </Text>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Filter mock results…"
          style={styles.input}
          accessibilityLabel="Search filter"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <FlatList
          data={data}
          keyExtractor={(item) => item.key}
          ListEmptyComponent={
            <Text style={styles.empty}>No mock matches. Try another filter.</Text>
          }
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              onPress={() => onPressItem(item)}
              accessibilityRole="button"
              accessibilityLabel={`Open ${item.kind} ${item.title}`}
            >
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
            </Pressable>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, padding: 16 },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 16,
  },
  card: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
    backgroundColor: '#f8fafc',
  },
  cardPressed: { opacity: 0.9 },
  cardTitle: { fontSize: 17, fontWeight: '600' },
  cardSubtitle: { fontSize: 14, opacity: 0.7, marginTop: 4 },
  empty: { fontSize: 15, opacity: 0.7, textAlign: 'center', marginTop: 24 },
});
