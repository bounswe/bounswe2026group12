import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { tokens } from '../../theme';

export type StarScore = 1 | 2 | 3 | 4 | 5;

type Props = {
  /** Current selected score 1-5, or null when unrated. */
  value: number | null;
  /** Defaults to 5. */
  max?: number;
  size?: 'sm' | 'lg';
  /** Disables Pressable wrapping; renders pure visual stars. */
  readOnly?: boolean;
  /**
   * Called with the tapped star value. Tapping the SAME star that is already
   * selected calls onChange(0) — caller maps this to "clear my rating".
   */
  onChange?: (score: StarScore | 0) => void;
  /** Optional override for the whole row's a11y label. */
  ariaLabel?: string;
};

export function StarRatingRow({
  value,
  max = 5,
  size = 'lg',
  readOnly = false,
  onChange,
  ariaLabel,
}: Props) {
  const stars = Array.from({ length: max }, (_, i) => i + 1);
  const fontSize = size === 'lg' ? 28 : 16;
  const gap = size === 'lg' ? 4 : 2;
  const filled = typeof value === 'number' ? Math.round(value) : 0;

  const handlePress = (n: number) => {
    if (!onChange) return;
    const next = n === filled ? 0 : (n as StarScore);
    onChange(next);
  };

  if (readOnly) {
    return (
      <View
        style={[styles.row, { gap }]}
        accessible
        accessibilityRole="text"
        accessibilityLabel={
          ariaLabel ?? (filled > 0 ? `Rated ${filled} of ${max} stars` : 'Not rated')
        }
      >
        {stars.map((n) => {
          const isOn = n <= filled;
          return (
            <Text
              key={n}
              style={{
                fontSize,
                color: isOn ? tokens.colors.accentMustard : tokens.colors.textMuted,
              }}
            >
              {isOn ? '★' : '☆'}
            </Text>
          );
        })}
      </View>
    );
  }

  return (
    <View style={[styles.row, { gap }]} accessibilityLabel={ariaLabel}>
      {stars.map((n) => {
        const isOn = n <= filled;
        return (
          <Pressable
            key={n}
            onPress={() => handlePress(n)}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`Rate ${n} ${n === 1 ? 'star' : 'stars'}`}
            accessibilityState={{ selected: isOn }}
            style={({ pressed }) => [pressed && { opacity: 0.6 }]}
          >
            <Text
              style={{
                fontSize,
                color: isOn ? tokens.colors.accentMustard : tokens.colors.textMuted,
              }}
            >
              {isOn ? '★' : '☆'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
