import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { shadows, tokens } from '../../theme';
import { formatCountdown } from '../../utils/formatCountdown';
import type { Quest } from '../../services/passportQuestService';

type Props = {
  quests: Quest[];
  loading?: boolean;
};

/**
 * Passport "Quests" tab body (#605). Splits the supplied quests into Active /
 * Completed sections, renders each as a card with a progress bar, optional
 * reward chip, and — for event-bound quests — a live countdown that ticks
 * once per minute. This component is intentionally self-contained so the
 * passport screen (PR #781) can drop it in without further wiring.
 */
export function QuestList({ quests, loading }: Props) {
  const { active, completed } = useMemo(() => groupQuests(quests), [quests]);

  // Single tick clock shared by all event countdowns. Minute granularity is
  // good enough for "ends in 2d 3h" style strings and keeps battery quiet.
  const [now, setNow] = useState<number>(() => Date.now());
  const hasActiveEvent = useMemo(
    () => active.some((q) => !!q.event_end),
    [active],
  );
  useEffect(() => {
    if (!hasActiveEvent) return;
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, [hasActiveEvent]);

  if (loading) {
    return (
      <View style={styles.loaderRow} accessibilityLabel="Loading quests">
        <ActivityIndicator color={tokens.colors.surfaceDark} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Section title="Active quests" count={active.length}>
        {active.length === 0 ? (
          <Text style={styles.emptyText}>
            No quests yet. Check back as the seasons change.
          </Text>
        ) : (
          active.map((q) => <QuestCard key={String(q.id)} quest={q} now={now} />)
        )}
      </Section>

      {completed.length > 0 ? (
        <Section title="Completed quests" count={completed.length}>
          {completed.map((q) => (
            <QuestCard key={String(q.id)} quest={q} now={now} />
          ))}
        </Section>
      ) : null}
    </View>
  );
}

/**
 * Split an unordered quest list into the two sections the UI renders. Pulled
 * out (and exported) so the component test can assert grouping directly
 * without mounting the full tree.
 */
export function groupQuests(quests: Quest[]): {
  active: Quest[];
  completed: Quest[];
} {
  const active: Quest[] = [];
  const completed: Quest[] = [];
  for (const q of quests) {
    if (q.is_completed) completed.push(q);
    else active.push(q);
  }
  return { active, completed };
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section} accessibilityLabel={`${title} (${count})`}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{count}</Text>
        </View>
      </View>
      <View style={styles.cards}>{children}</View>
    </View>
  );
}

function QuestCard({ quest, now }: { quest: Quest; now: number }) {
  const target = Math.max(quest.progress_target, 0);
  const current = Math.min(Math.max(quest.progress_current, 0), Math.max(target, quest.progress_current));
  const ratio = target > 0 ? Math.min(current / target, 1) : quest.is_completed ? 1 : 0;
  const widthPct = `${Math.round(ratio * 100)}%`;

  const countdown =
    quest.event_end && !quest.is_completed ? formatCountdown(quest.event_end, now) : null;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{quest.name}</Text>
      {quest.description ? (
        <Text style={styles.cardDescription}>{quest.description}</Text>
      ) : null}

      <View style={styles.progressBlock}>
        <Text style={styles.progressLabel}>
          {`${current} / ${target}`}
        </Text>
        <View
          style={styles.progressTrack}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: target, now: current }}
          accessibilityLabel={`${quest.name} progress`}
        >
          <View style={[styles.progressFill, { width: widthPct as `${number}%` }]} />
        </View>
      </View>

      <View style={styles.metaRow}>
        {quest.reward ? (
          <View style={styles.rewardChip}>
            <Text style={styles.rewardChipText}>{`🏆 ${quest.reward}`}</Text>
          </View>
        ) : null}
        {countdown ? (
          <Text
            style={[
              styles.countdownText,
              countdown === 'Event ended' && styles.countdownMuted,
            ]}
          >
            {countdown === 'Event ended' ? 'Event ended' : `Ends in ${countdown}`}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 20 },
  loaderRow: { paddingVertical: 24, alignItems: 'center' },
  section: { gap: 12 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: tokens.colors.text,
    fontFamily: tokens.typography.display.fontFamily,
  },
  countBadge: {
    minWidth: 24,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.surfaceDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: {
    color: '#FFE066',
    fontSize: 12,
    fontWeight: '800',
  },
  cards: { gap: 12 },
  card: {
    backgroundColor: tokens.colors.bg,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.colors.surfaceDark,
    padding: 14,
    gap: 10,
    ...shadows.md,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: tokens.colors.surfaceDark,
    fontFamily: tokens.typography.display.fontFamily,
  },
  cardDescription: {
    fontSize: 14,
    color: tokens.colors.text,
    lineHeight: 20,
  },
  progressBlock: { gap: 6 },
  progressLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: tokens.colors.surfaceDark,
  },
  progressTrack: {
    height: 10,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.surface,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: tokens.colors.surfaceDark,
  },
  progressFill: {
    height: '100%',
    backgroundColor: tokens.colors.accentGreen,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  rewardChip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.accentMustard,
    borderWidth: 1,
    borderColor: tokens.colors.surfaceDark,
  },
  rewardChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: tokens.colors.surfaceDark,
  },
  countdownText: {
    fontSize: 12,
    fontWeight: '700',
    color: tokens.colors.surfaceDark,
  },
  countdownMuted: {
    color: tokens.colors.textMuted,
    fontWeight: '600',
    opacity: 0.7,
  },
  emptyText: {
    fontSize: 14,
    color: tokens.colors.textMuted,
    fontStyle: 'italic',
  },
});
