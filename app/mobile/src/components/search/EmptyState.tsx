import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Action = { label: string; onPress: () => void; accessibilityLabel?: string };

type Props = {
  title: string;
  message: string;
  /** Simple decorative glyph in a circle (no emoji per project preference). */
  glyph?: string;
  actions?: Action[];
};

export function EmptyState({ title, message, glyph = '?', actions = [] }: Props) {
  return (
    <View style={styles.root} accessibilityRole="summary">
      <View style={styles.glyphWrap} accessibilityElementsHidden>
        <Text style={styles.glyph}>{glyph}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actions.length ? (
        <View style={styles.actions}>
          {actions.map((a) => (
            <Pressable
              key={a.label}
              onPress={a.onPress}
              style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
              accessibilityRole="button"
              accessibilityLabel={a.accessibilityLabel ?? a.label}
            >
              <Text style={styles.actionText}>{a.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 16,
    gap: 10,
  },
  glyphWrap: {
    width: 56,
    height: 56,
    borderRadius: 56,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: { fontSize: 22, fontWeight: '900', color: '#475569' },
  title: { fontSize: 18, fontWeight: '800', color: '#0f172a', textAlign: 'center' },
  message: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 20 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 },
  action: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
  },
  actionPressed: { opacity: 0.9 },
  actionText: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
});

