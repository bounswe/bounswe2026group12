import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ErrorView } from '../components/ui/ErrorView';
import { LoadingView } from '../components/ui/LoadingView';
import {
  fetchCulturalEvents,
  MONTH_LABELS,
  parseEventDate,
  type CulturalEvent,
} from '../services/calendarService';
import type { RootStackParamList } from '../navigation/types';
import { shadows, tokens } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'CulturalCalendar'>;

type Group = { key: string; label: string; events: CulturalEvent[] };

function groupEvents(events: CulturalEvent[]): Group[] {
  const byMonth = new Map<number, CulturalEvent[]>();
  const unresolvedLunar: CulturalEvent[] = [];
  for (const ev of events) {
    const parsed = parseEventDate(ev.date_rule);
    if (parsed.monthIndex == null) {
      // Lunar rules we couldn't resolve to a Gregorian date this year fall to
      // a dedicated bucket at the end. Fixed rules always have a monthIndex.
      unresolvedLunar.push(ev);
      continue;
    }
    const list = byMonth.get(parsed.monthIndex) ?? [];
    list.push(ev);
    byMonth.set(parsed.monthIndex, list);
  }
  const groups: Group[] = [];
  for (let i = 0; i < 12; i += 1) {
    const list = byMonth.get(i);
    if (list && list.length > 0) {
      list.sort((a, b) => {
        const aD = parseEventDate(a.date_rule).day ?? 0;
        const bD = parseEventDate(b.date_rule).day ?? 0;
        return aD - bD;
      });
      groups.push({ key: `m-${i}`, label: MONTH_LABELS[i], events: list });
    }
  }
  if (unresolvedLunar.length > 0) {
    groups.push({ key: 'lunar', label: 'Lunar / movable feasts', events: unresolvedLunar });
  }
  return groups;
}

export default function CulturalCalendarScreen({ navigation }: Props) {
  const [events, setEvents] = useState<CulturalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [monthFilter, setMonthFilter] = useState<number | null>(null);
  const [regionFilter, setRegionFilter] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchCulturalEvents()
      .then((res) => {
        if (!cancelled) setEvents(res);
      })
      .catch((e) => {
        if (!cancelled) {
          setEvents([]);
          setError(e instanceof Error ? e.message : 'Could not load events.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const regions = useMemo(() => {
    const set = new Set<string>();
    for (const ev of events) {
      if (ev.region?.name) set.add(ev.region.name);
    }
    return Array.from(set).sort();
  }, [events]);

  const filtered = useMemo(() => {
    return events.filter((ev) => {
      if (monthFilter != null) {
        const parsed = parseEventDate(ev.date_rule);
        if (parsed.monthIndex !== monthFilter) return false;
      }
      if (regionFilter && ev.region?.name !== regionFilter) return false;
      return true;
    });
  }, [events, monthFilter, regionFilter]);

  const groups = useMemo(() => groupEvents(filtered), [filtered]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.centered}>
          <LoadingView message="Loading calendar…" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.padded}>
          <ErrorView message={error} onRetry={() => setReloadToken((t) => t + 1)} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.heading} accessibilityRole="header">
          Seasonal &amp; ritual calendar
        </Text>
        <Text style={styles.subhead}>
          Festivals, feasts, and the dishes shared around them. Filter by month or region.
        </Text>

        {/* Month filter chips */}
        <Text style={styles.filterLabel}>Month</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRail}
        >
          <Chip
            label="All"
            active={monthFilter == null}
            onPress={() => setMonthFilter(null)}
          />
          {MONTH_LABELS.map((label, idx) => (
            <Chip
              key={`mfilter-${idx}`}
              label={label.slice(0, 3)}
              active={monthFilter === idx}
              onPress={() => setMonthFilter(monthFilter === idx ? null : idx)}
            />
          ))}
        </ScrollView>

        {regions.length > 0 ? (
          <>
            <Text style={styles.filterLabel}>Region</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRail}
            >
              <Chip
                label="All"
                active={regionFilter == null}
                onPress={() => setRegionFilter(null)}
              />
              {regions.map((name) => (
                <Chip
                  key={`rfilter-${name}`}
                  label={name}
                  active={regionFilter === name}
                  onPress={() => setRegionFilter(regionFilter === name ? null : name)}
                />
              ))}
            </ScrollView>
          </>
        ) : null}

        {groups.length === 0 ? (
          <Text style={styles.empty}>
            No events match the current filter. {events.length === 0 ? "The catalogue hasn't been seeded yet." : 'Try clearing a filter.'}
          </Text>
        ) : (
          groups.map((g) => (
            <View key={g.key} style={styles.group}>
              <Text style={styles.groupLabel}>{g.label}</Text>
              {g.events.map((ev) => (
                <EventCard
                  key={`ev-${ev.id}`}
                  event={ev}
                  onPressRecipe={(rid) => navigation.navigate('RecipeDetail', { id: String(rid) })}
                  onPressRegion={(rname) =>
                    navigation.navigate('Search', { region: rname })
                  }
                />
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`Filter ${label}`}
      hitSlop={6}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function EventCard({
  event,
  onPressRecipe,
  onPressRegion,
}: {
  event: CulturalEvent;
  onPressRecipe: (id: number) => void;
  onPressRegion: (name: string) => void;
}) {
  const parsed = parseEventDate(event.date_rule);
  const resolvedLunar = parsed.isLunar && parsed.day != null;
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.dateBadge, parsed.isLunar && styles.dateBadgeLunar]}>
          <Text style={[styles.dateBadgeText, parsed.isLunar && styles.dateBadgeTextLunar]}>
            {parsed.day != null ? String(parsed.day) : '☾'}
          </Text>
          <Text style={[styles.dateBadgeSub, parsed.isLunar && styles.dateBadgeSubLunar]} numberOfLines={1}>
            {parsed.monthIndex != null
              ? MONTH_LABELS[parsed.monthIndex].slice(0, 3).toUpperCase()
              : 'LUNAR'}
          </Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.eventName}>{event.name}</Text>
          {resolvedLunar && parsed.lunarName ? (
            <Text style={styles.lunarSubline}>
              ☾ On the lunar calendar: {parsed.lunarName} this year
            </Text>
          ) : parsed.isLunar && parsed.lunarName ? (
            <Text style={styles.lunarSubline}>
              ☾ Lunar · {parsed.lunarName} (movable)
            </Text>
          ) : null}
          {event.region?.name ? (
            <Pressable
              onPress={() => onPressRegion(event.region!.name)}
              style={({ pressed }) => [styles.regionPill, pressed && styles.pressed]}
              accessibilityRole="link"
              accessibilityLabel={`Browse ${event.region.name} content`}
              hitSlop={10}
            >
              <Text style={styles.regionPillText}>{event.region.name}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {event.description ? (
        <Text style={styles.description}>{event.description}</Text>
      ) : null}

      {event.recipes.length > 0 ? (
        <View style={styles.recipeList}>
          <Text style={styles.recipeListLabel}>Related recipes</Text>
          {event.recipes.map((r) => (
            <Pressable
              key={`r-${r.id}`}
              onPress={() => onPressRecipe(r.id)}
              style={({ pressed }) => [styles.recipePill, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`Open recipe ${r.title}`}
              hitSlop={6}
            >
              <Text style={styles.recipePillText} numberOfLines={1}>
                {r.title}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.colors.bg },
  container: { padding: 20, paddingBottom: 32, gap: 14 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  padded: { flex: 1, padding: 20, justifyContent: 'center' },
  heading: {
    fontSize: 28,
    fontWeight: '800',
    color: tokens.colors.text,
    fontFamily: tokens.typography.display.fontFamily,
  },
  subhead: { fontSize: 14, color: tokens.colors.textMuted, lineHeight: 20 },
  filterLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: tokens.colors.textMuted,
    letterSpacing: 1,
    marginTop: 4,
  },
  chipRail: { gap: 8, paddingRight: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.bg,
    borderWidth: 1.5,
    borderColor: tokens.colors.surfaceDark,
  },
  chipActive: {
    backgroundColor: tokens.colors.accentGreen,
  },
  chipText: { fontSize: 12, fontWeight: '800', color: tokens.colors.text },
  chipTextActive: { color: tokens.colors.textOnDark },
  pressed: { opacity: 0.85 },
  empty: {
    fontSize: 14,
    color: tokens.colors.textMuted,
    fontStyle: 'italic',
    marginTop: 12,
  },
  group: { gap: 10, marginTop: 14 },
  groupLabel: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.5,
    color: tokens.colors.textMuted,
  },
  card: {
    padding: 14,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.surfaceDark,
    gap: 10,
    ...shadows.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dateBadge: {
    width: 56,
    height: 56,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.accentMustard,
    borderWidth: 1.5,
    borderColor: tokens.colors.surfaceDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateBadgeLunar: {
    backgroundColor: tokens.colors.surfaceDark,
  },
  dateBadgeTextLunar: { color: '#FFE066' },
  dateBadgeSubLunar: { color: '#FFE066' },
  lunarSubline: {
    fontSize: 11,
    color: tokens.colors.textMuted,
    fontStyle: 'italic',
    fontWeight: '700',
  },
  dateBadgeText: {
    fontSize: 22,
    fontWeight: '900',
    color: tokens.colors.surfaceDark,
    lineHeight: 24,
    fontFamily: tokens.typography.display.fontFamily,
  },
  dateBadgeSub: {
    fontSize: 10,
    fontWeight: '900',
    color: tokens.colors.surfaceDark,
    letterSpacing: 0.8,
  },
  cardBody: { flex: 1, gap: 6 },
  eventName: {
    fontSize: 16,
    fontWeight: '800',
    color: tokens.colors.text,
    fontFamily: tokens.typography.display.fontFamily,
  },
  regionPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.bg,
    borderWidth: 1.5,
    borderColor: tokens.colors.surfaceDark,
  },
  regionPillText: { fontSize: 11, color: tokens.colors.text, fontWeight: '800' },
  description: { fontSize: 13, color: tokens.colors.text, lineHeight: 18 },
  recipeList: { gap: 6 },
  recipeListLabel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    color: tokens.colors.textMuted,
  },
  recipePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.accentGreenTint,
    borderWidth: 1,
    borderColor: tokens.colors.surfaceDark,
  },
  recipePillText: { fontSize: 13, color: tokens.colors.text, fontWeight: '700' },
});
