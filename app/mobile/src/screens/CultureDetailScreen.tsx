import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ErrorView } from '../components/ui/ErrorView';
import { LoadingView } from '../components/ui/LoadingView';
import { RARITY_COLORS } from '../components/passport/CultureGrid';
import type { RootStackParamList } from '../navigation/types';
import {
  fetchCultureDetail,
  type CultureSummary,
} from '../services/passportCultureService';
import { shadows, tokens } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'CultureDetail'>;

function rarityColor(rarity: string): string {
  return RARITY_COLORS[rarity?.toLowerCase?.()] ?? RARITY_COLORS.bronze;
}

export default function CultureDetailScreen({ route, navigation }: Props) {
  const { username, cultureName } = route.params;
  const [culture, setCulture] = useState<CultureSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    navigation.setOptions({ title: cultureName });
  }, [navigation, cultureName]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchCultureDetail(username, cultureName)
      .then((res) => {
        if (!cancelled) setCulture(res);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Could not load culture detail.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [username, cultureName, reloadToken]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.centered}>
          <LoadingView message={`Loading ${cultureName}…`} />
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

  if (!culture) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>No engagement with {cultureName} yet</Text>
          <Text style={styles.emptyHint}>
            Try recipes or save stories tagged with this culture to start filling its stamp.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const stats: { label: string; value: number }[] = [
    { label: 'Recipes tried', value: culture.recipes_tried },
    { label: 'Stories saved', value: culture.stories_saved },
    { label: 'Ingredients discovered', value: culture.ingredients_discovered },
    { label: 'Heritage recipes', value: culture.heritage_recipes },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.header}>
          <Text style={styles.title}>{culture.culture_name}</Text>
          <View style={styles.rarityRow}>
            <View
              style={[
                styles.badge,
                { backgroundColor: rarityColor(culture.stamp_rarity) },
              ]}
              accessibilityLabel={`${culture.stamp_rarity} stamp`}
            />
            <Text style={styles.rarityLabel}>{culture.stamp_rarity} stamp</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          {stats.map((s) => (
            <View key={s.label} style={styles.statBlock}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.colors.bg },
  body: { padding: 20, gap: 20 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 8 },
  padded: { flex: 1, padding: 20, justifyContent: 'center' },
  header: { gap: 10 },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: tokens.colors.text,
    fontFamily: tokens.typography.display.fontFamily,
  },
  rarityRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: tokens.colors.surfaceDark,
  },
  rarityLabel: {
    fontSize: 14,
    color: tokens.colors.text,
    textTransform: 'capitalize',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statBlock: {
    flexBasis: '47%',
    flexGrow: 1,
    padding: 14,
    borderRadius: tokens.radius.lg,
    borderWidth: 2,
    borderColor: tokens.colors.surfaceDark,
    backgroundColor: tokens.colors.bg,
    gap: 4,
    ...shadows.sm,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '900',
    color: tokens.colors.text,
    fontFamily: tokens.typography.display.fontFamily,
  },
  statLabel: { fontSize: 12, color: tokens.colors.text },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: tokens.colors.text,
    textAlign: 'center',
  },
  emptyHint: { fontSize: 14, color: tokens.colors.text, textAlign: 'center' },
});
