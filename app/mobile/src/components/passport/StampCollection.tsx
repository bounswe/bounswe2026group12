import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { tokens } from '../../theme';
import StampCard from './StampCard';

/**
 * Stamp collection tab body for the user passport (#601, #832).
 *
 * Mirrors web `StampGrid`: per-category sections (always open, no accordion)
 * with a 2-column grid of `StampCard`s inside.
 *
 * Backend probe of GET /api/users/<username>/passport/ returned items with
 * keys: { id, culture, category, rarity, earned_at, source_recipe,
 * source_story }. There is currently no `name`, `is_locked`, or
 * `progress_percent` field on the wire — `normalizeStamp` aliases `culture`
 * onto `name` so older / future shapes still render.
 */

export type StampRarity =
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'emerald'
  | 'legendary'
  | string;

export type StampCategory =
  | 'recipe'
  | 'story'
  | 'heritage'
  | 'exploration'
  | 'community'
  | string;

export type Stamp = {
  id: number | string;
  name: string;
  category: StampCategory;
  rarity: StampRarity;
  earned_at: string | null;
  progress_percent?: number;
  is_locked?: boolean;
};

type Props = {
  stamps: Stamp[];
  loading?: boolean;
};

const CATEGORY_ORDER: StampCategory[] = [
  'recipe',
  'story',
  'heritage',
  'exploration',
  'community',
];

const CATEGORY_LABELS: Record<string, string> = {
  recipe: 'Recipe',
  story: 'Story',
  heritage: 'Heritage',
  exploration: 'Exploration',
  community: 'Community',
  other: 'Other',
};

const titleCase = (s: string): string =>
  s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s;

const categoryLabel = (cat: string): string =>
  CATEGORY_LABELS[cat] || titleCase(cat || 'Other');

/**
 * Map a raw stamp object from the backend (or anywhere) onto the shape this
 * component understands. Robust against minor key drift — e.g. backend's
 * `culture` is aliased onto `name`, `kind` onto `category`, `unlocked_at`
 * onto `earned_at`. Unknown shapes fall back to sensible defaults so the
 * row never blanks.
 */
export function normalizeStamp(raw: any): Stamp {
  const r = raw || {};
  const name: string =
    r.name ?? r.title ?? r.label ?? r.culture ?? r.heritage_group ?? 'Stamp';
  const category: string = r.category ?? r.kind ?? r.type ?? 'other';
  const rarity: string = r.rarity ?? r.tier ?? r.level ?? 'bronze';
  const earned_at: string | null =
    r.earned_at ?? r.unlocked_at ?? r.acquired_at ?? r.awarded_at ?? null;
  const progress_percent: number | undefined =
    typeof r.progress_percent === 'number'
      ? r.progress_percent
      : typeof r.progress === 'number'
        ? r.progress
        : undefined;
  const is_locked: boolean | undefined =
    typeof r.is_locked === 'boolean'
      ? r.is_locked
      : typeof r.locked === 'boolean'
        ? r.locked
        : undefined;
  return {
    id: r.id ?? r.pk ?? `${name}-${category}-${rarity}`,
    name: String(name),
    category,
    rarity,
    earned_at,
    progress_percent,
    is_locked,
  };
}

const isLocked = (s: Stamp): boolean =>
  s.is_locked === true || s.earned_at == null;

function groupByCategory(stamps: Stamp[]): Array<[string, Stamp[]]> {
  const map = new Map<string, Stamp[]>();
  for (const s of stamps) {
    const key = (s.category || 'other').toLowerCase();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }
  const keys = Array.from(map.keys());
  keys.sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a as StampCategory);
    const bi = CATEGORY_ORDER.indexOf(b as StampCategory);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });
  return keys.map((k) => [k, map.get(k)!]);
}

export function StampCollection({ stamps, loading = false }: Props) {
  const groups = useMemo(() => groupByCategory(stamps || []), [stamps]);

  if (loading) {
    return (
      <View style={styles.container} accessibilityLabel="Stamp collection loading">
        <Text style={styles.loadingText}>Loading stamps…</Text>
      </View>
    );
  }

  if (!stamps || stamps.length === 0) {
    return (
      <View style={styles.container} accessibilityLabel="Stamp collection empty">
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No stamps yet</Text>
          <Text style={styles.emptyBody}>
            No stamps earned yet. Try recipes from a new region to earn your
            first.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container} accessibilityLabel="Stamp collection">
      {groups.map(([category, items]) => (
        <View key={category} style={styles.group}>
          <Text
            style={styles.groupTitle}
            accessibilityRole="header"
            accessibilityLabel={`${categoryLabel(category)} stamps, ${items.length}`}
          >
            {categoryLabel(category)}
          </Text>
          <View style={styles.grid} testID={`stamp-grid-${category}`}>
            {items.map((stamp) => (
              <StampCard
                key={String(stamp.id)}
                stamp={stamp}
                locked={isLocked(stamp)}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

export default StampCollection;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 20,
  },
  loadingText: {
    ...tokens.typography.body,
    color: tokens.colors.textMuted,
    paddingVertical: 24,
    textAlign: 'center',
  },
  emptyCard: {
    backgroundColor: tokens.colors.bg,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.primaryBorder,
    padding: 20,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    ...tokens.typography.display,
    fontSize: 18,
    color: tokens.colors.text,
  },
  emptyBody: {
    ...tokens.typography.body,
    color: tokens.colors.textMuted,
    textAlign: 'center',
  },
  group: {
    gap: 12,
  },
  groupTitle: {
    ...tokens.typography.display,
    fontSize: 18,
    color: tokens.colors.text,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
});
