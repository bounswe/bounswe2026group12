import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { MockSearchItem } from '../../mocks/searchResults';

type Props = {
  item: MockSearchItem;
  onPress: () => void;
};

function kindLabel(kind: MockSearchItem['kind']) {
  return kind === 'recipe' ? 'Recipe' : 'Story';
}

function thumbColor(kind: MockSearchItem['kind']) {
  return kind === 'recipe' ? '#0ea5e9' : '#a855f7';
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
      <View style={[styles.thumb, { backgroundColor: thumbColor(item.kind) }]}>
        <Text style={styles.thumbText}>{initial}</Text>
      </View>

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
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  cardPressed: { opacity: 0.9 },
  thumb: {
    width: '100%',
    aspectRatio: 16 / 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbText: { color: '#fff', fontSize: 26, fontWeight: '800' },
  body: { padding: 12, gap: 10 },
  title: { fontSize: 16, fontWeight: '700', color: '#0f172a', minHeight: 40 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  kind: { fontSize: 12, color: '#475569', fontWeight: '700', textTransform: 'uppercase' },
  dot: { width: 4, height: 4, borderRadius: 4, backgroundColor: '#cbd5e1' },
  tag: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  tagText: { fontSize: 12, color: '#0f172a', fontWeight: '700' },
});

