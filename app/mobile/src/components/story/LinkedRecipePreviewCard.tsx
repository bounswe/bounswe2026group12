import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { shadows, tokens } from '../../theme';

type LinkedRecipe = { id: string; title: string; region?: string; image?: string | null };

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
      {recipe.image ? (
        <View style={styles.thumb}>
          <Image source={{ uri: recipe.image }} style={styles.thumbImage} resizeMode="cover" />
        </View>
      ) : (
        <View style={styles.thumb}>
          <Text style={styles.thumbText}>R</Text>
        </View>
      )}
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
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.xl,
    backgroundColor: tokens.colors.surface,
    overflow: 'hidden',
    flexDirection: 'row',
    ...shadows.md,
  },
  pressed: { opacity: 0.9 },
  thumb: {
    width: 96,
    height: 96,
    backgroundColor: tokens.colors.surfaceDark,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  thumbImage: { width: '100%', height: '100%' },
  thumbText: { color: tokens.colors.text, fontSize: 22, fontWeight: '900' },
  body: { flex: 1, padding: 12, gap: 10 },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: tokens.colors.text,
    fontFamily: tokens.typography.display.fontFamily,
  },
  tag: {
    alignSelf: 'flex-start',
    backgroundColor: tokens.colors.bg,
    borderWidth: 1.5,
    borderColor: tokens.colors.surfaceDark,
    borderRadius: tokens.radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  tagText: { fontSize: 12, fontWeight: '800', color: tokens.colors.text },
});

