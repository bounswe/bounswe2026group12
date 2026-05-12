import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { tokens } from '../../theme';
import type { PassportTheme } from '../../utils/passportTheme';

type Props = {
  theme: PassportTheme;
  level: number;
  totalPoints: number;
  username: string;
};

/**
 * Dynamic Cultural Passport cover (#600). Renders a tall banner whose colours,
 * glyph, and copy come from the resolved {@link PassportTheme}. The cover is
 * intentionally self-contained so any screen that already has a passport
 * payload can drop it in:
 *
 * ```tsx
 * <PassportCover
 *   theme={resolveTheme(passport.active_theme, passport.level)}
 *   level={passport.level}
 *   totalPoints={passport.total_points}
 *   username={user.username}
 * />
 * ```
 */
export function PassportCover({ theme, level, totalPoints, username }: Props) {
  const a11yLabel = `Passport cover, theme ${theme.name}, level ${level}, ${totalPoints} points`;

  return (
    <View
      accessibilityLabel={a11yLabel}
      accessible
      style={[styles.cover, { backgroundColor: theme.background }]}
    >
      <View style={styles.topRow}>
        <View style={[styles.glyphCircle, { backgroundColor: theme.accent }]}>
          <Text style={styles.glyphText}>{theme.glyph}</Text>
        </View>
      </View>

      <View style={styles.centerBlock}>
        <Text style={[styles.username, { color: theme.textOnCover }]} numberOfLines={1}>
          {username}
        </Text>
        <Text style={[styles.copy, { color: theme.textOnCover }]} numberOfLines={1}>
          {theme.copy}
        </Text>
      </View>

      <View style={[styles.stripe, { backgroundColor: theme.accent }]} />

      <View style={styles.bottomRow}>
        <View style={styles.levelPill}>
          <Text style={styles.levelPillText}>
            {`LEVEL ${level} · ${totalPoints} PTS`}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    height: 180,
    borderRadius: tokens.radius.lg,
    borderWidth: 2,
    borderColor: tokens.colors.surfaceDark,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  glyphCircle: {
    width: 44,
    height: 44,
    borderRadius: tokens.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: tokens.colors.surfaceDark,
  },
  glyphText: {
    fontSize: 22,
  },
  centerBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  username: {
    ...tokens.typography.display,
    fontSize: 26,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  copy: {
    ...tokens.typography.body,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 4,
    textAlign: 'center',
    opacity: 0.85,
  },
  stripe: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 38,
    height: 8,
    opacity: 0.45,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  levelPill: {
    backgroundColor: tokens.colors.bg,
    borderRadius: tokens.radius.pill,
    borderWidth: 1.5,
    borderColor: tokens.colors.surfaceDark,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  levelPillText: {
    ...tokens.typography.body,
    color: tokens.colors.surfaceDark,
    fontSize: 12,
    letterSpacing: 1,
    fontWeight: '700',
  },
});

export default PassportCover;
