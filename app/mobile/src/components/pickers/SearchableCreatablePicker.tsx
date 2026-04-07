import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { CatalogItem, CatalogSelection } from '../../types/catalog';
import { shadows, tokens } from '../../theme';
import { ErrorView } from '../ui/ErrorView';
import { LoadingView } from '../ui/LoadingView';

type Props = {
  label: string;
  value: CatalogSelection;
  onValueChange: (next: CatalogSelection) => void;
  fetchList: () => Promise<CatalogItem[]>;
  createItem: (name: string) => Promise<CatalogItem>;
  placeholder?: string;
};

function normalize(s: string) {
  return s.trim().toLowerCase();
}

export function SearchableCreatablePicker({
  label,
  value,
  onValueChange,
  fetchList,
  createItem,
  placeholder = 'Tap to search or add…',
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchList();
      setItems(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load list');
    } finally {
      setLoading(false);
    }
  }, [fetchList]);

  const openModal = useCallback(() => {
    setQuery(value.name);
    setOpen(true);
    void load();
  }, [load, value.name]);

  const closeModal = useCallback(() => {
    setOpen(false);
    setError(null);
  }, []);

  const filtered = useMemo(() => {
    const q = normalize(query);
    if (!q) return [];
    return items.filter((i) => normalize(i.name).includes(q));
  }, [items, query]);

  const exactMatch = useMemo(() => {
    const q = normalize(query);
    if (!q) return false;
    return items.some((i) => normalize(i.name) === q);
  }, [items, query]);

  const showAddRow = normalize(query).length > 0 && !exactMatch;

  const pick = useCallback(
    (item: CatalogItem) => {
      onValueChange({ id: item.id, name: item.name });
      closeModal();
    },
    [closeModal, onValueChange],
  );

  const addNew = useCallback(async () => {
    const name = query.trim();
    if (!name) return;
    setCreating(true);
    setError(null);
    try {
      const created = await createItem(name);
      setItems((prev) => {
        const exists = prev.some((p) => p.id === created.id);
        return exists ? prev : [...prev, created];
      });
      pick(created);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create');
    } finally {
      setCreating(false);
    }
  }, [createItem, pick, query]);

  const displayText =
    value.name.trim() || placeholder;

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={openModal}
        style={({ pressed }) => [styles.inputShell, pressed && styles.inputShellPressed]}
        accessibilityRole="button"
        accessibilityLabel={`${label} picker`}
      >
        <Text
          style={[styles.inputText, !value.name.trim() && styles.placeholder]}
          numberOfLines={1}
        >
          {displayText}
        </Text>
      </Pressable>

      <Modal visible={open} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label}</Text>
              <Pressable onPress={closeModal} hitSlop={12} accessibilityLabel="Close">
                <Text style={styles.closeText}>Close</Text>
              </Pressable>
            </View>

            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search…"
              placeholderTextColor="#94a3b8"
              style={styles.search}
              autoCorrect={false}
              autoCapitalize="none"
              accessibilityLabel={`Search ${label}`}
            />

            {loading ? <LoadingView message="Loading list…" /> : null}

            {!loading && error ? (
              <ErrorView message={error} onRetry={() => void load()} />
            ) : null}

            {!loading && !error && !normalize(query) ? (
              <Text style={styles.hint}>Type to filter {label.toLowerCase()}.</Text>
            ) : null}

            {!loading && !error && normalize(query) ? (
              <FlatList
                data={filtered}
                keyExtractor={(item) => String(item.id)}
                keyboardShouldPersistTaps="handled"
                style={styles.list}
                ListFooterComponent={
                  showAddRow ? (
                    <Pressable
                      onPress={() => void addNew()}
                      disabled={creating}
                      style={({ pressed }) => [
                        styles.addRow,
                        pressed && styles.addRowPressed,
                        creating && styles.addRowDisabled,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Add new ${label}: ${query.trim()}`}
                    >
                      <Text style={styles.addRowText}>
                        {creating ? 'Adding…' : `Add "${query.trim()}"`}
                      </Text>
                    </Pressable>
                  ) : null
                }
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => pick(item)}
                    style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                  >
                    <Text style={styles.rowText}>{item.name}</Text>
                  </Pressable>
                )}
                ListEmptyComponent={
                  showAddRow ? null : (
                    <Text style={styles.empty}>No matches. Add a new entry below.</Text>
                  )
                }
              />
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 16 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: tokens.colors.text,
    marginBottom: 6,
  },
  inputShell: {
    borderWidth: 2,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: tokens.colors.surfaceInput,
    ...shadows.sm,
  },
  inputShellPressed: { opacity: 0.92 },
  inputText: { fontSize: 16, color: tokens.colors.text },
  placeholder: { color: tokens.colors.textMuted },
  modalBackdrop: {
    flex: 1,
    backgroundColor: tokens.colors.backdrop,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: tokens.colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    maxHeight: '88%',
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: tokens.colors.text, fontFamily: tokens.typography.display.fontFamily },
  closeText: { fontSize: 16, color: tokens.colors.primary, fontWeight: '700' },
  search: {
    borderWidth: 2,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: tokens.colors.surfaceInput,
    marginBottom: 8,
    color: tokens.colors.text,
  },
  hint: {
    paddingVertical: 12,
    fontSize: 14,
    color: tokens.colors.textMuted,
    textAlign: 'center',
  },
  list: { maxHeight: 360 },
  row: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.colors.border,
  },
  rowPressed: { backgroundColor: tokens.colors.primarySubtle },
  rowText: { fontSize: 16, color: tokens.colors.text },
  addRow: {
    paddingVertical: 14,
    paddingHorizontal: 4,
    backgroundColor: tokens.colors.primaryTint,
    borderRadius: tokens.radius.sm,
    marginTop: 8,
    marginBottom: 4,
    borderWidth: 1.5,
    borderColor: tokens.colors.primaryBorder,
  },
  addRowPressed: { opacity: 0.9 },
  addRowDisabled: { opacity: 0.6 },
  addRowText: {
    fontSize: 16,
    fontWeight: '600',
    color: tokens.colors.primary,
  },
  empty: {
    paddingVertical: 16,
    fontSize: 14,
    color: tokens.colors.textMuted,
    textAlign: 'center',
  },
});
