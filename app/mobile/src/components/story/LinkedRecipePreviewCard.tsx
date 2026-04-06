import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type LinkedRecipe = { id: string; title: string; region?: string };

type Props = {
  recipe: LinkedRecipe;
  onPress: () => void;
};

export function LinkedRecipePreviewCard({ recipe, onPress }: Props) {
  const tag = recipe.region ?? 'Recipe';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Open linked recipe ${recipe.title}`}
    >
      <View style={styles.thumb}>
        <Text style={styles.thumbText}>R</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {recipe.title}
        </Text>
        <View style={styles.tag}>
          <Text style={styles.tagText} numberOfLines={1}>
            {tag}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  pressed: { opacity: 0.9 },
  thumb: {
    width: 78,
    backgroundColor: '#0ea5e9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbText: { color: '#fff', fontSize: 22, fontWeight: '900' },
  body: { flex: 1, padding: 12, gap: 10 },
  title: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  tag: {
    alignSelf: 'flex-start',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  tagText: { fontSize: 12, fontWeight: '800', color: '#0f172a' },
});

