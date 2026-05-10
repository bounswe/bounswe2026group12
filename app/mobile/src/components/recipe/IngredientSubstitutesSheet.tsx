import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { fetchSubstitutes, type SubstituteGroups, type Substitute } from '../../services/substitutionService';
import { shadows, tokens } from '../../theme';

type Props = {
  ingredientId: number | string | null;
  ingredientName: string;
  onClose: () => void;
};

const CATEGORY_LABEL: Record<'flavor' | 'texture' | 'chemical', string> = {
  flavor: 'Flavor matches',
  texture: 'Texture matches',
  chemical: 'Chemical matches',
};

function formatCloseness(closeness: number): string {
  if (closeness <= 0) return '';
  return `${Math.round(closeness * 100)}%`;
}

export function IngredientSubstitutesSheet({ ingredientId, ingredientName, onClose }: Props) {
  const visible = ingredientId != null;
  const [data, setData] = useState<SubstituteGroups | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ingredientId == null) {
      setData(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchSubstitutes(ingredientId)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((e) => {
        if (!cancelled) {
          setData(null);
          setError(e instanceof Error ? e.message : 'Could not load substitutes.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ingredientId]);

  const isEmpty =
    !loading &&
    !error &&
    data != null &&
    data.flavor.length === 0 &&
    data.texture.length === 0 &&
    data.chemical.length === 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      accessibilityLabel={`Substitutes for ${ingredientName}`}
    >
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close substitutes">
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
              Substitutes for {ingredientName}
            </Text>
            <Pressable onPress={onClose} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Close">
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator color={tokens.colors.surfaceDark} />
              <Text style={styles.muted}>Loading…</Text>
            </View>
          ) : error ? (
            <View style={styles.centered}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : isEmpty ? (
            <View style={styles.centered}>
              <Text style={styles.muted}>No substitutes found for this ingredient.</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.scroll}>
              {(['flavor', 'texture', 'chemical'] as const).map((cat) => {
                const items = data?.[cat] ?? [];
                if (items.length === 0) return null;
                return (
                  <View key={cat} style={styles.group}>
                    <Text style={styles.groupTitle}>{CATEGORY_LABEL[cat]}</Text>
                    {items.map((s) => (
                      <SubstituteRow key={`${cat}-${s.id}`} item={s} />
                    ))}
                  </View>
                );
              })}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function SubstituteRow({ item }: { item: Substitute }) {
  const closeness = formatCloseness(item.closeness);
  return (
    <View style={styles.row}>
      <View style={styles.rowHead}>
        <Text style={styles.rowName} numberOfLines={1}>
          {item.name}
        </Text>
        {closeness ? (
          <View style={styles.closenessPill}>
            <Text style={styles.closenessText}>{closeness}</Text>
          </View>
        ) : null}
      </View>
      {item.notes ? <Text style={styles.rowNotes}>{item.notes}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: tokens.colors.backdrop,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: tokens.colors.bg,
    borderTopLeftRadius: tokens.radius.xl,
    borderTopRightRadius: tokens.radius.xl,
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 28,
    maxHeight: '80%',
    ...shadows.lg,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: tokens.colors.border,
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: tokens.colors.text,
    fontFamily: tokens.typography.display.fontFamily,
  },
  closeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  closeText: { fontSize: 13, fontWeight: '800', color: tokens.colors.text },
  centered: { paddingVertical: 40, alignItems: 'center', gap: 8 },
  muted: { fontSize: 14, color: tokens.colors.textMuted },
  errorText: { fontSize: 14, color: tokens.colors.error, fontWeight: '700' },
  scroll: { paddingBottom: 16 },
  group: { marginBottom: 18 },
  groupTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: tokens.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  row: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    marginBottom: 8,
    ...shadows.sm,
  },
  rowHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  rowName: { flex: 1, fontSize: 15, fontWeight: '800', color: tokens.colors.text },
  rowNotes: { marginTop: 4, fontSize: 13, color: tokens.colors.textMuted, lineHeight: 18 },
  closenessPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.accentGreen,
    borderWidth: 1,
    borderColor: tokens.colors.surfaceDark,
  },
  closenessText: { fontSize: 11, fontWeight: '800', color: tokens.colors.textOnDark },
});
