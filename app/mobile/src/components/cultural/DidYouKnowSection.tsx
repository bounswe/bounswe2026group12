import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { shadows, tokens } from '../../theme';
import type { CulturalFact } from '../../services/culturalFactService';

type Props = {
  facts: CulturalFact[];
};

/**
 * "Did You Know?" cards section (#518). Renders the supplied cultural facts
 * as small info cards with an icon, the fact text, and an optional source
 * link. Returns null when there are no facts so the parent doesn't render
 * an empty section.
 */
export function DidYouKnowSection({ facts }: Props) {
  if (!facts || facts.length === 0) return null;

  const onPressSource = (url: string) => {
    if (!url) return;
    Linking.openURL(url).catch(() => undefined);
  };

  return (
    <View style={styles.section} accessibilityLabel="Cultural context facts">
      <View style={styles.headerRow}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconText}>?</Text>
        </View>
        <Text style={styles.heading}>Did you know</Text>
      </View>

      <View style={styles.list}>
        {facts.map((fact) => (
          <View key={fact.id} style={styles.card}>
            <Text style={styles.quoteOpen}>“</Text>
            <Text style={styles.cardText}>{fact.text}</Text>
            {fact.source_url ? (
              <Pressable
                onPress={() => onPressSource(fact.source_url)}
                style={({ pressed }) => [styles.sourcePill, pressed && styles.pressed]}
                accessibilityRole="link"
                accessibilityLabel="Open source link"
                hitSlop={10}
              >
                <Text style={styles.sourcePillText}>Source ↗</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 28,
    paddingTop: 16,
    paddingBottom: 4,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.surfaceDark,
    gap: 14,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: tokens.colors.surfaceDark,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-6deg' }],
  },
  iconText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFE066',
    fontFamily: tokens.typography.display.fontFamily,
  },
  heading: {
    fontSize: 20,
    fontWeight: '800',
    color: tokens.colors.text,
    fontFamily: tokens.typography.display.fontFamily,
    letterSpacing: 0.2,
  },
  list: { gap: 14 },
  card: {
    paddingTop: 22,
    paddingBottom: 16,
    paddingHorizontal: 18,
    borderRadius: 4,
    backgroundColor: '#FFF3B0',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 4,
    borderColor: tokens.colors.surfaceDark,
    gap: 12,
    ...shadows.md,
  },
  quoteOpen: {
    position: 'absolute',
    top: 4,
    left: 10,
    fontSize: 36,
    color: tokens.colors.surfaceDark,
    fontFamily: tokens.typography.display.fontFamily,
    fontWeight: '900',
    lineHeight: 36,
    opacity: 0.35,
  },
  cardText: {
    fontSize: 15,
    color: tokens.colors.surfaceDark,
    lineHeight: 22,
    fontWeight: '600',
  },
  sourcePill: {
    alignSelf: 'flex-start',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.surfaceDark,
  },
  sourcePillText: { fontSize: 12, color: '#FFE066', fontWeight: '800', letterSpacing: 0.3 },
  pressed: { opacity: 0.85 },
});
