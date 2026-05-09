import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ErrorView } from '../components/ui/ErrorView';
import { LoadingView } from '../components/ui/LoadingView';
import type { RootStackParamList } from '../navigation/types';
import { fetchRecipesForEvent, type ExploreItem } from '../services/exploreService';
import { shadows, tokens } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'EventDetail'>;

export default function EventDetailScreen({ route, navigation }: Props) {
  const { eventName } = route.params;
  const [items, setItems] = useState<ExploreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    navigation.setOptions({ title: eventName });
  }, [navigation, eventName]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchRecipesForEvent(eventName, 100)
      .then((res) => {
        if (!cancelled) setItems(res);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load recipes.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [eventName, reloadToken]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.centered}>
          <LoadingView message={`Loading ${eventName} recipes…`} />
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

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        contentContainerStyle={items.length === 0 ? styles.emptyContainer : styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>{eventName}</Text>
            <Text style={styles.subtitle}>
              {items.length} {items.length === 1 ? 'recipe' : 'recipes'}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View>
            <Text style={styles.emptyTitle}>No recipes for {eventName} yet</Text>
            <Text style={styles.emptyHint}>Check back soon — community recipes are tagged often.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => navigation.navigate('RecipeDetail', { id: item.id })}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`Open recipe ${item.title}`}
          >
            {item.image ? (
              <Image source={{ uri: item.image }} style={styles.rowThumb} resizeMode="cover" />
            ) : (
              <View style={[styles.rowThumb, styles.rowThumbPlaceholder]}>
                <Text style={styles.rowThumbInitial}>R</Text>
              </View>
            )}
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle} numberOfLines={2}>
                {item.title}
              </Text>
              {item.region ? <Text style={styles.rowMeta}>{item.region}</Text> : null}
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.colors.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  padded: { flex: 1, padding: 20, justifyContent: 'center' },
  list: { padding: 16, gap: 10 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { marginBottom: 8 },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: tokens.colors.text,
    fontFamily: tokens.typography.display.fontFamily,
  },
  subtitle: { fontSize: 13, color: tokens.colors.text, marginTop: 2 },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: tokens.colors.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  emptyHint: { fontSize: 14, color: tokens.colors.text, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    gap: 12,
    padding: 10,
    borderWidth: 2,
    borderColor: tokens.colors.surfaceDark,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.bg,
    ...shadows.sm,
  },
  pressed: { opacity: 0.9 },
  rowThumb: { width: 84, height: 84, borderRadius: tokens.radius.md, overflow: 'hidden' },
  rowThumbPlaceholder: {
    backgroundColor: tokens.colors.surfaceDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowThumbInitial: { color: tokens.colors.textOnDark, fontSize: 22, fontWeight: '900' },
  rowBody: { flex: 1, justifyContent: 'center', gap: 4 },
  rowTitle: { fontSize: 16, fontWeight: '800', color: tokens.colors.text },
  rowMeta: { fontSize: 13, color: tokens.colors.text },
});
