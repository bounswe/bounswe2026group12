import React, { useEffect, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { fetchRegions, type RegionOption } from '../../services/mapDataService';
import { tokens } from '../../theme';

type Props = {
  /** Currently selected region id, or null when none. */
  value: number | null;
  /** Display label to show on the trigger when a value is selected and we don't yet have it in the loaded list. */
  fallbackLabel?: string | null;
  onChange: (next: { id: number; name: string } | null) => void;
};

export function RegionPicker({ value, fallbackLabel, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [regions, setRegions] = useState<RegionOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchRegions()
      .then((list) => {
        if (!cancelled) setRegions(list);
      })
      .catch(() => {
        if (!cancelled) setRegions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedName =
    regions.find((r) => r.id === value)?.name ??
    (value != null ? fallbackLabel ?? `Region ${value}` : null);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={selectedName ? `Change region (currently ${selectedName})` : 'Pick a region'}
      >
        <Text style={[styles.triggerText, !selectedName && styles.triggerPlaceholder]} numberOfLines={1}>
          {selectedName ?? 'Pick a region…'}
        </Text>
      </Pressable>

      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Pick a region</Text>
              <Pressable
                onPress={() => setOpen(false)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Close region picker"
              >
                <Text style={styles.close}>Close</Text>
              </Pressable>
            </View>

            {loading ? (
              <Text style={styles.helper}>Loading regions…</Text>
            ) : regions.length === 0 ? (
              <Text style={styles.helper}>No regions available.</Text>
            ) : (
              <FlatList
                data={regions}
                keyExtractor={(item) => String(item.id)}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                ListHeaderComponent={
                  <Pressable
                    onPress={() => {
                      onChange(null);
                      setOpen(false);
                    }}
                    style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                    accessibilityRole="button"
                    accessibilityLabel="Clear region"
                  >
                    <Text style={[styles.rowText, value == null && styles.rowTextSelected]}>
                      None
                    </Text>
                    {value == null ? <Text style={styles.checkMark}>✓</Text> : null}
                  </Pressable>
                }
                renderItem={({ item }) => {
                  const selected = item.id === value;
                  return (
                    <Pressable
                      onPress={() => {
                        onChange({ id: item.id, name: item.name });
                        setOpen(false);
                      }}
                      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                      accessibilityRole="button"
                      accessibilityLabel={selected ? `${item.name} (selected)` : `Pick ${item.name}`}
                    >
                      <Text style={[styles.rowText, selected && styles.rowTextSelected]}>
                        {item.name}
                      </Text>
                      {selected ? <Text style={styles.checkMark}>✓</Text> : null}
                    </Pressable>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    borderWidth: 1.5,
    borderColor: tokens.colors.surfaceDark,
    borderRadius: tokens.radius.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: tokens.colors.bg,
  },
  triggerText: { fontSize: 16, fontWeight: '700', color: tokens.colors.text },
  triggerPlaceholder: { fontWeight: '500', color: tokens.colors.textMuted },
  pressed: { opacity: 0.85 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: tokens.colors.surface,
    maxHeight: '70%',
    borderTopLeftRadius: tokens.radius.xl,
    borderTopRightRadius: tokens.radius.xl,
    padding: 18,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.surfaceDark,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: tokens.colors.text,
    fontFamily: tokens.typography.display.fontFamily,
  },
  close: { fontSize: 14, fontWeight: '700', color: tokens.colors.text, textDecorationLine: 'underline' },
  helper: { fontSize: 14, color: tokens.colors.textMuted, fontStyle: 'italic' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 6,
  },
  rowPressed: { backgroundColor: tokens.colors.bg },
  rowText: { fontSize: 16, color: tokens.colors.text, fontWeight: '600' },
  rowTextSelected: { fontWeight: '900' },
  checkMark: { fontSize: 16, fontWeight: '900', color: tokens.colors.accentGreen },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: tokens.colors.surfaceDark, opacity: 0.3 },
});
