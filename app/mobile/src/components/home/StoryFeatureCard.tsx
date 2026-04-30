import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { shadows, tokens } from '../../theme';

type Props = {
  title: string;
  body?: string | null;
  image?: string | null;
  authorUsername?: string | null;
  recipeTitle?: string | null;
  onPress: () => void;
  onPressAuthor?: () => void;
  onPressRecipe?: () => void;
};

export function StoryFeatureCard({
  title,
  body,
  image,
  authorUsername,
  recipeTitle,
  onPress,
  onPressAuthor,
  onPressRecipe,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Open story ${title}`}
    >
      {image ? (
        <View style={styles.thumb}>
          <Image source={{ uri: image }} style={styles.thumbImage} resizeMode="cover" />
        </View>
      ) : (
        <View style={[styles.thumb, styles.thumbFallback]}>
          <Text style={styles.thumbText}>S</Text>
        </View>
      )}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        {body ? (
          <Text style={styles.excerpt} numberOfLines={3}>
            {body}
          </Text>
        ) : null}
        <View style={styles.metaRow}>
          {authorUsername ? (
            <Pressable
              onPress={onPressAuthor}
              disabled={!onPressAuthor}
              style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
              accessibilityRole="link"
              accessibilityLabel={`Open profile of ${authorUsername}`}
              hitSlop={6}
            >
              <Text style={styles.pillText}>By {authorUsername}</Text>
            </Pressable>
          ) : null}
          {recipeTitle && onPressRecipe ? (
            <Pressable
              onPress={onPressRecipe}
              style={({ pressed }) => [styles.recipePill, pressed && styles.pressed]}
              accessibilityRole="link"
              accessibilityLabel={`Open linked recipe ${recipeTitle}`}
              hitSlop={6}
            >
              <Text style={styles.recipePillText} numberOfLines={1}>
                Recipe: {recipeTitle}
              </Text>
            </Pressable>
          ) : null}
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
    ...shadows.lg,
  },
  pressed: { opacity: 0.9 },
  thumb: {
    width: '100%',
    height: 160,
    backgroundColor: tokens.colors.accentGreen,
  },
  thumbFallback: { alignItems: 'center', justifyContent: 'center' },
  thumbImage: { width: '100%', height: '100%' },
  thumbText: { color: tokens.colors.textOnDark, fontSize: 36, fontWeight: '900' },
  body: { padding: 14, gap: 8 },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: tokens.colors.text,
    fontFamily: tokens.typography.display.fontFamily,
  },
  excerpt: { fontSize: 14, color: tokens.colors.textMuted, lineHeight: 20 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  pill: {
    backgroundColor: tokens.colors.primarySubtle,
    borderWidth: 1.5,
    borderColor: tokens.colors.primaryBorder,
    borderRadius: tokens.radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  pillText: { fontSize: 12, color: tokens.colors.primary, fontWeight: '800' },
  recipePill: {
    backgroundColor: tokens.colors.surfaceDark,
    borderRadius: tokens.radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 10,
    maxWidth: '70%',
  },
  recipePillText: { fontSize: 12, color: tokens.colors.textOnDark, fontWeight: '800' },
});
