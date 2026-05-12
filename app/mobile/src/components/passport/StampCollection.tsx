import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { tokens } from '../../theme';

/**
 * Stamp collection tab body for the user passport (#601).
 *
 * Standalone, reusable component — does NOT touch PassportScreen. PR #781
 * scaffolds the passport tab bar and will import this component into the
 * Stamps tab body.
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

const RARITY_COLOURS: Record<string, string> = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
  emerald: '#50C878',
  legendary: '#9B59B6',
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
};

const titleCase = (s: string): string =>
  s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s;

const categoryLabel = (cat: string): string =>
  CATEGORY_LABELS[cat] || titleCase(cat || 'Other');

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
  // Sort: known categories first in declared order, then alphabetical for the rest.
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
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggle = (cat: string) =>
    setCollapsed((c) => ({ ...c, [cat]: !c[cat] }));

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
      {groups.map(([category, items]) => {
        const isOpen = !collapsed[category];
        return (
          <View key={category} style={styles.group}>
            <Pressable
              onPress={() => toggle(category)}
              accessibilityRole="button"
              accessibilityLabel={`${categoryLabel(category)} stamps, ${items.length} ${
                isOpen ? 'expanded' : 'collapsed'
              }`}
              style={({ pressed }) => [
                styles.groupHeader,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.groupTitle}>{categoryLabel(category)}</Text>
              <View style={styles.headerRight}>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{items.length}</Text>
                </View>
                <Text style={styles.chevron}>{isOpen ? '▾' : '▸'}</Text>
              </View>
            </Pressable>

            {isOpen ? (
              <View style={styles.rows}>
                {items.map((stamp) => {
                  const locked = isLocked(stamp);
                  const swatch = rarityColour(stamp.rarity);
                  const dateStr = formatEarned(stamp.earned_at);
                  const progress =
                    typeof stamp.progress_percent === 'number'
                      ? Math.max(0, Math.min(100, stamp.progress_percent))
                      : null;
                  const a11y = [
                    stamp.name,
                    rarityLabel(stamp.rarity),
                    locked
                      ? 'locked'
                      : dateStr
                        ? `earned ${dateStr}`
                        : 'earned',
                  ].join(', ');
                  return (
                    <View
                      key={String(stamp.id)}
                      accessibilityLabel={a11y}
                      style={[styles.row, locked && styles.rowLocked]}
                    >
                      <View
                        style={[
                          styles.swatch,
                          {
                            backgroundColor: locked ? '#B8B8B8' : swatch,
                            borderColor: locked ? '#8A8A8A' : '#1A1A1A',
                          },
                        ]}
                      >
                        {locked ? <Text style={styles.lockGlyph}>🔒</Text> : null}
                      </View>
                      <View style={styles.rowBody}>
                        <Text
                          style={[styles.rowName, locked && styles.rowNameLocked]}
                          numberOfLines={1}
                        >
                          {stamp.name}
                        </Text>
                        <View style={styles.rowMetaRow}>
                          <Text style={styles.rowMeta}>
                            {rarityLabel(stamp.rarity)}
                          </Text>
                          {!locked && dateStr ? (
                            <>
                              <Text style={styles.dot}>·</Text>
                              <Text style={styles.rowMeta}>{dateStr}</Text>
                            </>
                          ) : null}
                        </View>
                        {progress != null ? (
                          <View
                            style={styles.progressTrack}
                            accessibilityLabel={`progress ${progress} percent`}
                          >
                            <View
                              style={[
                                styles.progressFill,
                                {
                                  width: `${progress}%`,
                                  backgroundColor: locked ? '#8A8A8A' : swatch,
                                },
                              ]}
                            />
                          </View>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

export default StampCollection;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 12,
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
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.colors.primaryBorder,
    backgroundColor: tokens.colors.bg,
    overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: tokens.colors.primarySubtle,
  },
  pressed: {
    opacity: 0.7,
  },
  groupTitle: {
    ...tokens.typography.display,
    fontSize: 16,
    color: tokens.colors.text,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countBadge: {
    minWidth: 24,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: {
    ...tokens.typography.body,
    color: tokens.colors.textOnDark,
    fontSize: 12,
    fontWeight: '700',
  },
  chevron: {
    ...tokens.typography.body,
    color: tokens.colors.text,
    fontSize: 14,
  },
  rows: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: tokens.radius.sm,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: tokens.colors.primaryBorder,
  },
  rowLocked: {
    backgroundColor: '#ECECEC',
    borderColor: '#CFCFCF',
  },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockGlyph: {
    fontSize: 16,
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowName: {
    ...tokens.typography.body,
    fontSize: 15,
    fontWeight: '600',
    color: tokens.colors.text,
  },
  rowNameLocked: {
    color: '#6B6B6B',
  },
  rowMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowMeta: {
    ...tokens.typography.body,
    fontSize: 12,
    color: tokens.colors.textMuted,
  },
  dot: {
    color: tokens.colors.textMuted,
    fontSize: 12,
  },
  progressTrack: {
    marginTop: 6,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});
