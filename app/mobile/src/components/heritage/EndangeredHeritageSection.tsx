import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { shadows, tokens } from '../../theme';

export type HeritageStatus = 'none' | 'endangered' | 'preserved' | 'revived' | string | null | undefined;

type EndangeredNote = {
  id: number;
  text: string;
  source_url: string;
};

type Props = {
  status: HeritageStatus;
  notes: EndangeredNote[];
};

type Treatment = {
  emoji: string;
  label: string;
  blurb: string;
  badgeBg: string;
  badgeText: string;
};

const TREATMENT: Record<string, Treatment> = {
  endangered: {
    emoji: '⚠️',
    label: 'ENDANGERED',
    blurb: 'This recipe is at risk of being lost. Cooks, source it, share it, keep it on the table.',
    badgeBg: '#DC2626',
    badgeText: '#FFFFFF',
  },
  preserved: {
    emoji: '🛡',
    label: 'PRESERVED',
    blurb: 'A heritage recipe actively kept alive by its community.',
    badgeBg: tokens.colors.accentGreen,
    badgeText: tokens.colors.textOnDark,
  },
  revived: {
    emoji: '🌱',
    label: 'REVIVED',
    blurb: 'Once nearly lost — now coming back through deliberate revival.',
    badgeBg: tokens.colors.accentMustard,
    badgeText: tokens.colors.surfaceDark,
  },
};

/** Renders the endangered-heritage badge and sourced notes (#507, #524). Returns
 * null when there's nothing meaningful to show (status is 'none' or missing
 * AND no notes are attached). */
export function EndangeredHeritageSection({ status, notes }: Props) {
  const treatment = status && status !== 'none' ? TREATMENT[status] : undefined;
  const hasStatus = !!treatment;
  const hasNotes = Array.isArray(notes) && notes.length > 0;
  if (!hasStatus && !hasNotes) return null;

  const onPressSource = (url: string) => {
    if (!url) return;
    Linking.openURL(url).catch(() => undefined);
  };

  return (
    <View style={styles.section} accessibilityLabel="Endangered heritage status">
      {hasStatus ? (
        <View style={[styles.statusCard, { borderColor: treatment.badgeBg }]}>
          <View style={[styles.badge, { backgroundColor: treatment.badgeBg }]}>
            <Text style={styles.badgeEmoji}>{treatment.emoji}</Text>
            <Text style={[styles.badgeLabel, { color: treatment.badgeText }]}>{treatment.label}</Text>
          </View>
          <Text style={styles.blurb}>{treatment.blurb}</Text>
        </View>
      ) : null}

      {hasNotes ? (
        <View style={styles.notes}>
          <Text style={styles.notesHeading}>Sourced notes</Text>
          {notes.map((note) => (
            <View key={note.id} style={styles.noteCard}>
              <Text style={styles.noteText}>{note.text}</Text>
              {note.source_url ? (
                <Pressable
                  onPress={() => onPressSource(note.source_url)}
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
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 28,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.surfaceDark,
    gap: 14,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.bg,
    borderWidth: 2,
    ...shadows.sm,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: tokens.radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeEmoji: { fontSize: 16 },
  badgeLabel: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  blurb: {
    flex: 1,
    fontSize: 13,
    color: tokens.colors.text,
    lineHeight: 18,
    fontWeight: '600',
  },
  notes: { gap: 10 },
  notesHeading: {
    fontSize: 12,
    fontWeight: '900',
    color: tokens.colors.textMuted,
    letterSpacing: 1.2,
  },
  noteCard: {
    padding: 12,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.bg,
    borderLeftWidth: 4,
    borderLeftColor: tokens.colors.surfaceDark,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: tokens.colors.surfaceDark,
    borderRightColor: tokens.colors.surfaceDark,
    borderBottomColor: tokens.colors.surfaceDark,
    gap: 8,
  },
  noteText: {
    fontSize: 13,
    color: tokens.colors.text,
    lineHeight: 19,
  },
  sourcePill: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.surfaceDark,
  },
  sourcePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFE066',
    letterSpacing: 0.3,
  },
  pressed: { opacity: 0.85 },
});
