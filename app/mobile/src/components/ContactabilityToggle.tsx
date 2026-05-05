import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { updateMe } from '../services/authService';
import { tokens } from '../theme';

function readContactable(user: { is_contactable?: boolean } | null): boolean {
  if (!user) return true;
  if (typeof user.is_contactable === 'boolean') return user.is_contactable;
  return true;
}

export function ContactabilityToggle() {
  const { user, updateUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;
  const enabled = readContactable(user);

  const handleChange = async (next: boolean) => {
    if (saving) return;
    setError(null);
    setSaving(true);
    const previous = enabled;
    await updateUser({ ...user, is_contactable: next });
    try {
      const updated = await updateMe({ is_contactable: next });
      await updateUser({ ...user, ...updated });
    } catch (e) {
      await updateUser({ ...user, is_contactable: previous });
      setError(e instanceof Error ? e.message : 'Could not update messaging preference.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.card} accessibilityLabel="Messaging preferences">
      <View style={styles.headerRow}>
        <View style={styles.textCol}>
          <Text style={styles.title}>Messaging preferences</Text>
          <Text style={styles.desc}>
            Allow others to start new message threads with you.
          </Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={handleChange}
          disabled={saving}
          accessibilityLabel={enabled ? 'Allow new threads' : 'Block new threads'}
          trackColor={{ false: '#aaa', true: tokens.colors.accentGreen }}
          thumbColor={'#FAF7EF'}
        />
      </View>
      <Text style={styles.status}>
        {saving ? 'Updating…' : enabled ? 'Allow new threads' : 'Block new threads'}
      </Text>
      {error ? (
        <Pressable onPress={() => setError(null)} hitSlop={6} accessibilityRole="button">
          <Text style={styles.error}>{error} (tap to dismiss)</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: 12,
    padding: 14,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.surfaceInput,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    gap: 6,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  textCol: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontWeight: '900', color: tokens.colors.text },
  desc: { fontSize: 12, color: tokens.colors.textMuted, lineHeight: 16 },
  status: { fontSize: 12, fontWeight: '800', color: tokens.colors.surfaceDark },
  error: { fontSize: 12, fontWeight: '700', color: '#991b1b' },
});
