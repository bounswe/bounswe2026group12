import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ErrorView } from '../ui/ErrorView';
import { LoadingView } from '../ui/LoadingView';

export type RecipeLink = { id: string; title: string; region?: string };

type ListItem = RecipeLink & { authorId?: number };

type Props = {
  value: RecipeLink | null;
  onChange: (next: RecipeLink | null) => void;
  /** Fetches recipes (API or mock fallback). */
  fetchRecipes: () => Promise<ListItem[]>;
  /** Current user id to filter to “your recipes” when available. */
  currentUserId?: number | null;
};

function normalize(s: string) {
  return s.trim().toLowerCase();
}

export function RecipeLinkPicker({ value, onChange, fetchRecipes, currentUserId }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ListItem[]>([]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchRecipes();
      setItems(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load recipes.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const filtered = useMemo(() => {
    const q = normalize(query);
    const base = currentUserId
      ? items.filter((r) => (r.authorId == null ? true : r.authorId === currentUserId))
      : items;
    if (!q) return base;
    return base.filter((r) => normalize(r.title).includes(q) || normalize(r.region ?? '').includes(q));
  }, [query, items, currentUserId]);

  const selectedText = value
    ? `${value.title}${value.region ? ` — ${value.region}` : ''}`
    : 'None';

  return (
    <View style={styles.field}>
      <Text style={styles.label}>Linked recipe (optional)</Text>

      <Pressable
        onPress={() => {
          setQuery('');
          setOpen(true);
        }}
        style={({ pressed }) => [styles.shell, pressed && { opacity: 0.92 }]}
        accessibilityRole="button"
        accessibilityLabel="Pick a linked recipe"
      >
        <Text style={[styles.shellText, !value && styles.shellPlaceholder]} numberOfLines={1}>
          {value ? selectedText : 'Tap to link one of your recipes…'}
        </Text>
      </Pressable>

      {value ? (
        <Pressable
          onPress={() => onChange(null)}
          style={({ pressed }) => [styles.clearBtn, pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
          accessibilityLabel="Clear linked recipe"
        >
          <Text style={styles.clearText}>Remove link</Text>
        </Pressable>
      ) : null}

      <Modal visible={open} transparent animationType="slide">
        <View style={styles.backdrop}>
          <View style={styles.card}>
            <View style={styles.header}>
              <Text style={styles.title}>Link a recipe</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={12} accessibilityLabel="Close">
                <Text style={styles.close}>Close</Text>
              </Pressable>
            </View>

            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search your recipes…"
              placeholderTextColor="#94a3b8"
              style={styles.search}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Search recipes"
            />

            {loading ? <LoadingView message="Loading recipes…" /> : null}
            {!loading && error ? <ErrorView message={error} onRetry={() => void load()} /> : null}

            {!loading && !error ? (
              <FlatList
                data={filtered}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <Text style={styles.empty}>No recipes match that search.</Text>
                }
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => {
                      onChange({ id: item.id, title: item.title, region: item.region });
                      setOpen(false);
                    }}
                    style={({ pressed }) => [styles.row, pressed && { backgroundColor: '#e2e8f0' }]}
                    accessibilityRole="button"
                    accessibilityLabel={`Link recipe ${item.title}`}
                  >
                    <Text style={styles.rowTitle}>{item.title}</Text>
                    {item.region ? <Text style={styles.rowMeta}>{item.region}</Text> : null}
                  </Pressable>
                )}
              />
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginTop: 4 },
  label: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 10 },
  shell: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  shellText: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  shellPlaceholder: { color: '#64748b', fontWeight: '600' },
  clearBtn: { marginTop: 10, alignSelf: 'flex-start' },
  clearText: { color: '#dc2626', fontWeight: '800', fontSize: 14 },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  card: {
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    maxHeight: '88%',
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  close: { fontSize: 16, color: '#2563eb', fontWeight: '700' },
  search: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  row: {
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
    borderRadius: 10,
  },
  rowTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  rowMeta: { fontSize: 14, color: '#64748b', marginTop: 4 },
  empty: { paddingVertical: 16, fontSize: 14, color: '#64748b', textAlign: 'center' },
});

