import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '../components/search/EmptyState';
import { SearchResultCard } from '../components/search/SearchResultCard';
import type { RootStackParamList } from '../navigation/types';
import {
  MOCK_SEARCH_RESULTS,
  type MockSearchItem,
} from '../mocks/searchResults';
import { shadows, tokens } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Search'>;

type RegionOption = { label: string; value: string };

const REGIONS: RegionOption[] = [
  { label: 'All regions', value: '' },
  { label: 'Anatolia', value: 'Anatolia' },
  { label: 'Aegean', value: 'Aegean' },
];

function filterItems(query: string, region: string): MockSearchItem[] {
  const q = query.trim().toLowerCase();
  const r = region.trim().toLowerCase();
  return MOCK_SEARCH_RESULTS.filter((item) => {
    const matchesQuery =
      !q ||
      item.title.toLowerCase().includes(q) ||
      item.subtitle.toLowerCase().includes(q);
    const matchesRegion = !r || (item.region ?? '').toLowerCase().includes(r);
    return matchesQuery && matchesRegion;
  });
}

export default function SearchScreen({ navigation, route }: Props) {
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('');

  useEffect(() => {
    if (route.params?.query != null) setQuery(route.params.query);
    if (route.params?.region != null) setRegion(route.params.region);
    // only initialize on first mount / param change
  }, [route.params?.query, route.params?.region]);

  const data = useMemo(() => filterItems(query, region), [query, region]);

  const selectedRegionLabel =
    REGIONS.find((r) => r.value === region)?.label ?? 'All regions';

  const isPristine = query.trim() === '' && region.trim() === '';

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

        <View style={styles.filtersRow}>
          <Text style={styles.filterLabel}>Region</Text>
          <View style={styles.pills}>
            {REGIONS.map((opt) => {
              const active = opt.value === region;
              return (
                <Pressable
                  key={opt.value || 'all'}
                  onPress={() => setRegion(opt.value)}
                  style={({ pressed }) => [
                    styles.pill,
                    active && styles.pillActive,
                    pressed && { opacity: 0.9 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Set region filter: ${opt.label}`}
                >
                  <Text style={[styles.pillText, active && styles.pillTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <FlatList
          data={data}
          keyExtractor={(item) => item.key}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.gridRow}
          ListEmptyComponent={
            isPristine ? (
              <EmptyState
                title="Start searching"
                message="Type a keyword or pick a region to discover recipes and stories."
                glyph="S"
                actions={[
                  { label: 'Show all regions', onPress: () => setRegion('') },
                ]}
              />
            ) : (
              <EmptyState
                title="No results found"
                message={`No matches for “${query.trim() || '…'}” in ${selectedRegionLabel}. Try a different keyword or region.`}
                glyph="0"
                actions={[
                  { label: 'Clear keyword', onPress: () => setQuery('') },
                  { label: 'Clear region', onPress: () => setRegion('') },
                  { label: 'Clear all', onPress: () => { setQuery(''); setRegion(''); } },
                ]}
              />
            )
          }
          renderItem={({ item }) => (
            <View style={styles.gridItem}>
              <SearchResultCard item={item} onPress={() => onPressItem(item)} />
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.colors.bg },
  container: { flex: 1, padding: 16 },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
    color: tokens.colors.surface,
    fontFamily: tokens.typography.display.fontFamily,
  },
  input: {
    borderWidth: 2,
    borderColor: tokens.colors.primaryBorder,
    borderRadius: tokens.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: tokens.colors.surfaceInput,
    color: tokens.colors.text,
    ...shadows.sm,
  },
  filtersRow: { marginBottom: 10 },
  filterLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: tokens.colors.surface,
    marginBottom: 8,
    fontFamily: tokens.typography.display.fontFamily,
  },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: tokens.radius.pill,
    borderWidth: 2,
    borderColor: tokens.colors.primary,
    backgroundColor: 'transparent',
  },
  pillActive: { backgroundColor: tokens.colors.primary, borderColor: tokens.colors.primary },
  pillText: { fontSize: 14, fontWeight: '700', color: tokens.colors.surface },
  pillTextActive: { color: tokens.colors.surface },
  grid: { paddingBottom: 24, gap: 12 },
  gridRow: { gap: 12 },
  gridItem: { flex: 1 },
});
