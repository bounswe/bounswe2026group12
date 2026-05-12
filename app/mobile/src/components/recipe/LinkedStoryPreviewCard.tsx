import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { shadows, tokens } from '../../theme';

type Props = {
  title: string;
  excerpt?: string | null;
  image?: string | null;
  authorUsername?: string | null;
  onPress: () => void;
  onPressAuthor?: () => void;
};

export function LinkedStoryPreviewCard({
  title,
  excerpt,
  image,
  authorUsername,
  onPress,
  onPressAuthor,
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
        {excerpt ? (
          <Text style={styles.excerpt} numberOfLines={2}>
            {excerpt}
          </Text>
        ) : null}
        {authorUsername ? (
          onPressAuthor ? (
            <Pressable
              onPress={onPressAuthor}
              style={({ pressed }) => [styles.authorPill, pressed && styles.authorPillPressed]}
              accessibilityRole="link"
              accessibilityLabel={`Open profile of ${authorUsername}`}
              hitSlop={10}
            >
              <Text style={styles.authorPillText} numberOfLines={1}>
                By {authorUsername}
              </Text>
            </Pressable>
          ) : (
            <View style={styles.authorPill}>
              <Text style={styles.authorPillText} numberOfLines={1}>
                By {authorUsername}
              </Text>
            </View>
          )
        ) : null}
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
    width: 86,
    aspectRatio: 1,
    backgroundColor: tokens.colors.accentGreen,
  },
  thumbFallback: { alignItems: 'center', justifyContent: 'center' },
  thumbImage: { width: '100%', height: '100%' },
  thumbText: { color: tokens.colors.text, fontSize: 22, fontWeight: '900' },
  body: { flex: 1, padding: 12, gap: 6 },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: tokens.colors.text,
    fontFamily: tokens.typography.display.fontFamily,
  },
  excerpt: { fontSize: 13, color: tokens.colors.textMuted, lineHeight: 18 },
  authorPill: {
    alignSelf: 'flex-start',
    marginTop: 2,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.bg,
    borderWidth: 1.5,
    borderColor: tokens.colors.surfaceDark,
  },
  authorPillPressed: { opacity: 0.85 },
  authorPillText: { fontSize: 12, color: tokens.colors.text, fontWeight: '800' },
});
