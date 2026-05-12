import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { tokens } from '../../theme';
import type { Stamp } from './StampCollection';

/**
 * StampCard — square stamp tile used inside the category grid (#832).
 *
 * Pure presentational component. Mirrors the web `StampCard.jsx` shape so the
 * mobile passport stamps tab has parity with the web layout: rarity colour
 * stripe on top, display-font name (2 lines max), earned date as "MMM YYYY"
 * or a lock glyph for locked stamps.
 */

export type StampCardProps = {
  stamp: Stamp;
  locked?: boolean;
};

const RARITY_COLOURS: Record<string, string> = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
  emerald: '#50C878',
  legendary: '#9B59B6',
};

const titleCase = (s: string): string =>
  s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s;

const rarityLabel = (rarity: string): string => titleCase(rarity || 'Stamp');

const rarityColour = (rarity: string): string =>
  RARITY_COLOURS[(rarity || '').toLowerCase()] || tokens.colors.primary;

const formatEarned = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
};

export function StampCard({ stamp, locked }: StampCardProps) {
  const isLocked =
    typeof locked === 'boolean'
      ? locked
      : stamp.is_locked === true || stamp.earned_at == null;
  const swatch = rarityColour(stamp.rarity);
  const rLabel = rarityLabel(stamp.rarity);
  const dateStr = formatEarned(stamp.earned_at);
  const a11y = [
    stamp.name,
    rLabel,
    isLocked ? 'locked' : dateStr ? `earned ${dateStr}` : 'earned',
  ].join(', ');

  return (
    <View
      accessibilityLabel={a11y}
      style={[
        styles.card,
        { borderColor: swatch },
        isLocked && styles.cardLocked,
      ]}
      testID={`stamp-card-${stamp.id}`}
    >
      <View style={[styles.stripe, { backgroundColor: swatch }]} />
      <View style={styles.body}>
        <Text
          style={[styles.name, isLocked && styles.nameLocked]}
          numberOfLines={2}
        >
          {stamp.name}
        </Text>
        <Text style={styles.rarity}>{rLabel}</Text>
        {isLocked ? (
          <Text style={styles.lockGlyph} accessibilityLabel="locked">
            🔒
          </Text>
        ) : dateStr ? (
          <Text style={styles.date}>{dateStr}</Text>
        ) : null}
      </View>
    </View>
  );
}

export default StampCard;

const styles = StyleSheet.create({
  card: {
    width: 150,
    height: 150,
    borderRadius: tokens.radius.md,
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  cardLocked: {
    backgroundColor: tokens.colors.surfaceDark,
    opacity: 0.5,
  },
  stripe: {
    height: 8,
    width: '100%',
  },
  body: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 4,
    justifyContent: 'space-between',
  },
  name: {
    ...tokens.typography.display,
    fontSize: 14,
    color: tokens.colors.text,
  },
  nameLocked: {
    color: tokens.colors.bg,
  },
  rarity: {
    ...tokens.typography.body,
    fontSize: 11,
    color: tokens.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  date: {
    ...tokens.typography.body,
    fontSize: 12,
    color: tokens.colors.textMuted,
  },
  lockGlyph: {
    fontSize: 18,
  },
});
