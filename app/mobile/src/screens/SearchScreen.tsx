import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '../components/search/EmptyState';
import { FilterChipRail } from '../components/search/FilterChipRail';
import { SearchResultCard } from '../components/search/SearchResultCard';
import type { RootStackParamList } from '../navigation/types';
import { search, type SearchFilters, type SearchResultItem } from '../services/searchService';
import { fetchStoryById } from '../services/storyService';
import { fetchDietaryTags, fetchEventTags } from '../services/tagsService';
import { shadows, tokens } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Search'>;

type RegionOption = { label: string; value: string };

const REGIONS: RegionOption[] = [
  { label: 'All regions', value: '' },
  { label: 'Anatolia', value: 'Anatolia' },
  { label: 'Aegean', value: 'Aegean' },
  { label: 'Black Sea', value: 'Black Sea' },
  { label: 'Marmara', value: 'Marmara' },
  { label: 'Mediterranean', value: 'Mediterranean' },
];

export default function SearchScreen({ navigation, route }: Props) {
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const storyThumbCacheRef = useRef<Map<string, string | null>>(new Map());

  const [dietOptions, setDietOptions] = useState<string[]>([]);
  const [eventOptions, setEventOptions] = useState<string[]>([]);
  const [tagsLoading, setTagsLoading] = useState(true);
  const [dietInclude, setDietInclude] = useState<string[]>([]);
  const [dietExclude, setDietExclude] = useState<string[]>([]);
  const [eventInclude, setEventInclude] = useState<string[]>([]);
  const [eventExclude, setEventExclude] = useState<string[]>([]);
  /** Bumped by the Retry button so the search effect re-runs even when the
   * query/filters haven't changed (`setQuery(q => q)` was a noop because
   * React bails out on identical values). */
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [diets, events] = await Promise.all([fetchDietaryTags(), fetchEventTags()]);
        if (cancelled) return;
        setDietOptions(diets.map((t) => t.name));
        setEventOptions(events.map((t) => t.name));
      } catch {
        if (cancelled) return;
        setDietOptions([]);
        setEventOptions([]);
      } finally {
        if (!cancelled) setTagsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtersKey = useMemo(
    () => [...dietInclude, '|', ...dietExclude, '|', ...eventInclude, '|', ...eventExclude].join(','),
    [dietInclude, dietExclude, eventInclude, eventExclude],
  );

  const hasActiveFilters =
    dietInclude.length + dietExclude.length + eventInclude.length + eventExclude.length > 0;

  useEffect(() => {
    if (route.params?.query != null) setQuery(route.params.query);
    if (route.params?.region != null) setRegion(route.params.region);
    // only initialize on first mount / param change
  }, [route.params?.query, route.params?.region]);

  useEffect(() => {
    const q = query.trim();
    // Keep pristine state empty without calling backend.
    if (!q && !region.trim() && !hasActiveFilters) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    const filters: SearchFilters = {
      diet: dietInclude,
      diet_exclude: dietExclude,
      event: eventInclude,
      event_exclude: eventExclude,
    };
    void (async () => {
      try {
        const data = await search(q, region.trim() || undefined, filters);
        if (cancelled) return;
        setResults(data);

        // Mobile-only enhancement: hydrate story thumbnails by fetching story details (cached).
        const candidates = data
          .filter((r) => r.kind === 'story' && !r.thumbnail)
          .slice(0, 8);
        const cache = storyThumbCacheRef.current;
        await Promise.allSettled(
          candidates.map(async (item) => {
            if (cache.has(item.id)) return;
            const story = await fetchStoryById(item.id);
            const url = story.image ?? null;
            cache.set(item.id, url);
          }),
        );
        if (cancelled) return;
        setResults((prev) =>
          prev.map((r) => {
            if (r.kind !== 'story' || r.thumbnail) return r;
            const url = cache.get(r.id);
            return url ? { ...r, thumbnail: url } : r;
          }),
        );
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Search failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [query, region, filtersKey, hasActiveFilters, retryToken]);

  const selectedRegionLabel =
    REGIONS.find((r) => r.value === region)?.label ?? 'All regions';

  const isPristine = query.trim() === '' && region.trim() === '' && !hasActiveFilters;

  function onPressItem(item: SearchResultItem) {
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
          placeholder="Search recipes and stories…"
          style={styles.input}
          accessibilityLabel="Search filter"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <View style={styles.filtersRow}>
          <Text style={styles.filterLabel}>Region</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.regionRail}
          >
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
          </ScrollView>
        </View>

        <View style={styles.tagFilters}>
          <View style={styles.tagHeaderRow}>
            <Text style={styles.filterLabel}>Tags (tap to include, again to exclude)</Text>
            {hasActiveFilters ? (
              <Pressable
                onPress={() => {
                  setDietInclude([]);
                  setDietExclude([]);
                  setEventInclude([]);
                  setEventExclude([]);
                  setRegion('');
                }}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Clear all filters"
                style={({ pressed }) => [styles.clearBtn, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.clearBtnText}>Clear filters</Text>
              </Pressable>
            ) : null}
          </View>
          <FilterChipRail
            label="Dietary"
            options={dietOptions}
            include={dietInclude}
            exclude={dietExclude}
            onChange={({ include, exclude }) => {
              setDietInclude(include);
              setDietExclude(exclude);
            }}
            loading={tagsLoading}
          />
          <FilterChipRail
            label="Event"
            options={eventOptions}
            include={eventInclude}
            exclude={eventExclude}
            onChange={({ include, exclude }) => {
              setEventInclude(include);
              setEventExclude(exclude);
            }}
            loading={tagsLoading}
          />
        </View>

        <FlatList
          data={results}
          keyExtractor={(item) => item.key}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.gridRow}
          ListEmptyComponent={
            loading ? (
              <EmptyState
                title="Searching…"
                message="Fetching results from the server."
                glyph="…"
              />
            ) : error ? (
              <EmptyState
                title="Search failed"
                message={error}
                glyph="!"
                actions={[{ label: 'Retry', onPress: () => setRetryToken((t) => t + 1) }]}
              />
            ) : isPristine ? (
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
    color: tokens.colors.text,
    fontFamily: tokens.typography.display.fontFamily,
  },
  input: {
    borderWidth: 2,
    borderColor: tokens.colors.surfaceDark,
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
    color: tokens.colors.text,
    marginBottom: 8,
    fontFamily: tokens.typography.display.fontFamily,
  },
  regionRail: { gap: 8, paddingVertical: 4 },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: tokens.radius.pill,
    borderWidth: 2,
    borderColor: '#000000',
    backgroundColor: 'transparent',
  },
  pillActive: { backgroundColor: tokens.colors.accentGreen, borderColor: '#000000' },
  pillText: { fontSize: 13, fontWeight: '800', color: '#000000' },
  pillTextActive: { color: '#FAF7EF' },
  tagFilters: { gap: 10, marginBottom: 10 },
  tagHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  clearBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: tokens.radius.pill,
    borderWidth: 1.5,
    borderColor: '#000000',
    backgroundColor: '#EFBF04',
  },
  clearBtnText: { fontSize: 12, fontWeight: '800', color: '#000000' },
  grid: { paddingBottom: 24, gap: 12 },
  gridRow: { gap: 12 },
  gridItem: { flex: 1 },
});
