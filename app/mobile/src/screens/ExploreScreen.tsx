import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ErrorView } from '../components/ui/ErrorView';
import { LoadingView } from '../components/ui/LoadingView';
import type { RootStackParamList } from '../navigation/types';
import { fetchExploreCategories, type EventCategory, type ExploreItem } from '../services/exploreService';
import { shadows, tokens } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Explore'>;

export default function ExploreScreen({ navigation }: Props) {
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchExploreCategories()
      .then((cats) => {
        if (!cancelled) setCategories(cats);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load Explore.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.centered}>
          <LoadingView message="Loading Explore…" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.padded}>
          <ErrorView message={error} onRetry={() => setReloadToken((t) => t + 1)} />
        </View>
      </SafeAreaView>
    );
  }

  if (categories.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.padded}>
          <Text style={styles.emptyTitle}>Nothing to explore yet</Text>
          <Text style={styles.emptyHint}>
            Recipes will start appearing here once they get tagged with life-event categories.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.heading} accessibilityRole="header">
          Explore by event
        </Text>
        <Text style={styles.lead}>Recipes for the moments that matter.</Text>

        {categories.map((cat) => (
          <View key={cat.id} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{cat.name}</Text>
              <Pressable
                onPress={() =>
                  navigation.navigate('EventDetail', { eventId: cat.id, eventName: cat.name })
                }
                accessibilityRole="link"
                accessibilityLabel={`See all ${cat.name} recipes`}
                hitSlop={8}
              >
                <Text style={styles.seeAll}>See all</Text>
              </Pressable>
            </View>
            <FlatList
              data={cat.recipes}
              horizontal
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.rail}
              renderItem={({ item }) => (
                <RailCard
                  item={item}
                  onPress={() => navigation.navigate('RecipeDetail', { id: item.id })}
                />
              )}
            />
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function RailCard({ item, onPress }: { item: ExploreItem; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Open recipe ${item.title}`}
    >
      <View style={styles.thumbWrap}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <View style={styles.thumbPlaceholder}>
            <Text style={styles.thumbInitial}>R</Text>
          </View>
        )}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>
        {item.region ? <Text style={styles.cardMeta}>{item.region}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.colors.bg },
  scroll: { padding: 16, paddingBottom: 28 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  padded: { flex: 1, padding: 20, justifyContent: 'center' },
  heading: {
    fontSize: 28,
    fontWeight: '800',
    color: tokens.colors.text,
    fontFamily: tokens.typography.display.fontFamily,
  },
  lead: { fontSize: 14, color: tokens.colors.text, marginTop: 4, marginBottom: 12 },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: tokens.colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyHint: { fontSize: 14, color: tokens.colors.text, textAlign: 'center', lineHeight: 20 },
  section: { marginTop: 16, marginBottom: 4 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: tokens.colors.text,
    fontFamily: tokens.typography.display.fontFamily,
  },
  seeAll: { fontSize: 13, fontWeight: '800', color: tokens.colors.text, textDecorationLine: 'underline' },
  rail: { gap: 12, paddingRight: 16 },
  card: {
    width: 200,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.xl,
    backgroundColor: tokens.colors.bg,
    overflow: 'hidden',
    ...shadows.md,
  },
  pressed: { opacity: 0.9 },
  thumbWrap: { width: '100%', height: 110 },
  thumb: { width: '100%', height: '100%' },
  thumbPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: tokens.colors.surfaceDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbInitial: { color: tokens.colors.textOnDark, fontSize: 28, fontWeight: '900' },
  cardBody: { padding: 12, gap: 4 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: tokens.colors.text },
  cardMeta: { fontSize: 12, color: tokens.colors.text },
});
