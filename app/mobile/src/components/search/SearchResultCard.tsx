import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { SearchResultItem } from '../../services/searchService';
import { shadows, tokens } from '../../theme';
import { RankReasonBadge } from '../personalization/RankReasonBadge';

type Props = {
  item: SearchResultItem;
  onPress: () => void;
};

function kindLabel(kind: SearchResultItem['kind']) {
  return kind === 'recipe' ? 'Recipe' : 'Story';
}

function thumbColor(kind: SearchResultItem['kind']) {
  return kind === 'recipe' ? tokens.colors.surfaceDark : tokens.colors.accentGreen;
}

export function SearchResultCard({ item, onPress }: Props) {
  const tag = item.region ?? kindLabel(item.kind);
  const initial = kindLabel(item.kind).slice(0, 1);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={`Open ${item.kind} ${item.title}`}
    >
      {item.thumbnail ? (
        <View style={styles.thumb}>
          <Image source={{ uri: item.thumbnail }} style={styles.thumbImage} resizeMode="cover" />
        </View>
      ) : (
        <View style={[styles.thumb, { backgroundColor: thumbColor(item.kind) }]}>
          <Text style={styles.thumbText}>{initial}</Text>
        </View>
      )}

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.kind}>{kindLabel(item.kind)}</Text>
          <View style={styles.dot} />
          <View style={styles.tag}>
            <Text style={styles.tagText} numberOfLines={1}>
              {tag}
            </Text>
          </View>
        </View>
        <RankReasonBadge reason={item.rankReason} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.xl,
    backgroundColor: tokens.colors.surface,
    overflow: 'hidden',
    ...shadows.md,
  },
  cardPressed: { opacity: 0.9 },
  thumb: {
    width: '100%',
    aspectRatio: 16 / 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbImage: { width: '100%', height: '100%' },
  thumbText: { color: tokens.colors.text, fontSize: 26, fontWeight: '800' },
  body: { padding: 12, gap: 10 },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: tokens.colors.text,
    minHeight: 40,
    fontFamily: tokens.typography.display.fontFamily,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  kind: { fontSize: 12, color: tokens.colors.textMuted, fontWeight: '800', textTransform: 'uppercase' },
  dot: { width: 4, height: 4, borderRadius: 4, backgroundColor: tokens.colors.border },
  tag: {
    backgroundColor: tokens.colors.bg,
    borderWidth: 1.5,
    borderColor: tokens.colors.surfaceDark,
    borderRadius: tokens.radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  tagText: { fontSize: 12, color: tokens.colors.text, fontWeight: '800' },
});

