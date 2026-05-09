import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { shadows, tokens } from '../../theme';
import { RankReasonBadge } from '../personalization/RankReasonBadge';
import type { RecommendationItem } from '../../services/recommendationsService';

type Props = {
  items: RecommendationItem[];
  onItemPress: (item: RecommendationItem) => void;
};

export function RecommendationsRail({ items, onItemPress }: Props) {
  if (items.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.title}>Recommended for you</Text>
        <Text style={styles.hint}>Picked from your interests</Text>
      </View>
      <FlatList
        data={items}
        horizontal
        keyExtractor={(item) => item.key}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => onItemPress(item)}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            accessibilityRole="button"
            accessibilityLabel={`Open ${item.kind} ${item.title}`}
          >
            <View style={styles.thumbWrap}>
              {item.image ? (
                <Image source={{ uri: item.image }} style={styles.thumbImage} resizeMode="cover" />
              ) : (
                <View
                  style={[
                    styles.thumbPlaceholder,
                    {
                      backgroundColor:
                        item.kind === 'recipe' ? tokens.colors.surfaceDark : tokens.colors.accentGreen,
                    },
                  ]}
                >
                  <Text style={styles.thumbInitial}>{item.kind === 'recipe' ? 'R' : 'S'}</Text>
                </View>
              )}
            </View>
            <View style={styles.body}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.title}
              </Text>
              {item.snippet ? (
                <Text style={styles.cardSnippet} numberOfLines={2}>
                  {item.snippet}
                </Text>
              ) : null}
              <View style={styles.metaRow}>
                <Text style={styles.kind}>{item.kind === 'recipe' ? 'Recipe' : 'Story'}</Text>
                {item.region ? <Text style={styles.region}>· {item.region}</Text> : null}
              </View>
              <RankReasonBadge reason={item.rankReason} style={styles.badge} />
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 8, marginBottom: 18 },
  header: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginBottom: 10 },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: tokens.colors.text,
    fontFamily: tokens.typography.display.fontFamily,
  },
  hint: { fontSize: 13, color: tokens.colors.primaryTint, fontWeight: '800' },
  list: { gap: 12, paddingRight: 16 },
  card: {
    width: 240,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.xl,
    backgroundColor: tokens.colors.surface,
    overflow: 'hidden',
    ...shadows.lg,
  },
  cardPressed: { opacity: 0.9 },
  thumbWrap: { width: '100%', height: 110 },
  thumbImage: { width: '100%', height: '100%' },
  thumbPlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  thumbInitial: { color: tokens.colors.text, fontSize: 28, fontWeight: '900' },
  body: { padding: 12, gap: 6 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: tokens.colors.text },
  cardSnippet: { fontSize: 12, color: tokens.colors.textMuted, lineHeight: 16 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  kind: { fontSize: 11, color: tokens.colors.textMuted, fontWeight: '800', textTransform: 'uppercase' },
  region: { fontSize: 11, color: tokens.colors.textMuted, fontWeight: '700' },
  badge: { marginTop: 4 },
});
