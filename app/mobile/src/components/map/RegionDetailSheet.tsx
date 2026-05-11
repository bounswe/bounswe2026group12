import { useEffect, useState } from 'react';
import { FlatList, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { fetchRegionContent, type RegionContent, type RegionContentItem } from '../../services/regionContentService';
import { shadows, tokens, useTheme } from '../../theme';

type Tab = 'recipes' | 'stories';

type Props = {
  /** Region PK to load content for. Null/undefined hides the sheet. */
  regionId: number | null;
  /** Region display name for header/a11y labels. */
  regionName: string | null;
  onDismiss: () => void;
  onItemPress: (kind: Tab, id: string) => void;
};

export function RegionDetailSheet({ regionId, regionName, onDismiss, onItemPress }: Props) {
  const { accent } = useTheme();
  const [content, setContent] = useState<RegionContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('recipes');

  useEffect(() => {
    if (regionId == null) {
      setContent(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setTab('recipes');
    fetchRegionContent(regionId)
      .then((res) => {
        if (!cancelled) setContent(res);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load content.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [regionId]);

  const visible = regionId != null;
  const items = tab === 'recipes' ? (content?.recipes ?? []) : (content?.stories ?? []);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onDismiss}
      accessibilityLabel={regionName ? `${regionName} region content` : 'Region content'}
    >
      <Pressable style={styles.backdrop} onPress={onDismiss} accessibilityLabel="Close region content">
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <View style={[styles.handle, { backgroundColor: accent.accent }]} />

          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
              {regionName ?? ''}
            </Text>
            <Pressable
              onPress={onDismiss}
              style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </View>

          <View style={styles.tabs}>
            <TabButton
              label={`Recipes${content ? ` · ${content.recipes.length}` : ''}`}
              active={tab === 'recipes'}
              onPress={() => setTab('recipes')}
            />
            <TabButton
              label={`Stories${content ? ` · ${content.stories.length}` : ''}`}
              active={tab === 'stories'}
              onPress={() => setTab('stories')}
            />
          </View>

          {loading ? (
            <View style={styles.centered}>
              <Text style={styles.muted}>Loading…</Text>
            </View>
          ) : error ? (
            <View style={styles.centered}>
              <Text style={styles.error}>{error}</Text>
            </View>
          ) : items.length === 0 ? (
            <View style={styles.centered}>
              <Text style={styles.muted}>
                No {tab} for {regionName} yet.
              </Text>
            </View>
          ) : (
            <FlatList
              data={items}
              keyExtractor={(it) => it.key}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => (
                <Row item={item} onPress={() => onItemPress(tab, item.id)} />
              )}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function TabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { accent } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tab,
        active && { backgroundColor: accent.accent, borderColor: accent.accentBorder },
        !active && styles.tabInactive,
        pressed && styles.pressed,
      ]}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
    >
      <Text
        style={[
          styles.tabText,
          active ? { color: accent.accentText } : { color: tokens.colors.text },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Row({ item, onPress }: { item: RegionContentItem; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Open ${item.title}`}
    >
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.thumb} resizeMode="cover" />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]}>
          <Text style={styles.thumbInitial}>{(item.title.charAt(0) || '?').toUpperCase()}</Text>
        </View>
      )}
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={2}>
          {item.title}
        </Text>
        {item.authorUsername ? <Text style={styles.rowMeta}>By {item.authorUsername}</Text> : null}
      </View>
    </Pressable>
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
    maxHeight: '85%',
    minHeight: '50%',
    ...shadows.lg,
  },
  handle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 999, marginBottom: 12 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    color: tokens.colors.text,
    fontFamily: tokens.typography.display.fontFamily,
  },
  closeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.bg,
    borderWidth: 1,
    borderColor: tokens.colors.surfaceDark,
  },
  closeText: { fontSize: 13, fontWeight: '800', color: tokens.colors.text },
  pressed: { opacity: 0.85 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: tokens.radius.pill,
    borderWidth: 2,
    ...shadows.sm,
  },
  tabInactive: { backgroundColor: tokens.colors.bg, borderColor: tokens.colors.surfaceDark },
  tabText: { fontSize: 13, fontWeight: '800' },
  centered: { paddingVertical: 40, alignItems: 'center', justifyContent: 'center' },
  muted: { fontSize: 14, color: tokens.colors.text },
  error: { fontSize: 14, color: tokens.colors.error, fontWeight: '700' },
  list: { paddingBottom: 16, gap: 10 },
  row: {
    flexDirection: 'row',
    gap: 12,
    padding: 10,
    borderRadius: tokens.radius.lg,
    borderWidth: 2,
    borderColor: tokens.colors.surfaceDark,
    backgroundColor: tokens.colors.bg,
    ...shadows.sm,
  },
  thumb: { width: 72, height: 72, borderRadius: tokens.radius.md, overflow: 'hidden' },
  thumbPlaceholder: {
    backgroundColor: tokens.colors.surfaceDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbInitial: { color: tokens.colors.textOnDark, fontSize: 22, fontWeight: '900' },
  rowBody: { flex: 1, justifyContent: 'center', gap: 4 },
  rowTitle: { fontSize: 15, fontWeight: '800', color: tokens.colors.text },
  rowMeta: { fontSize: 12, color: tokens.colors.text },
});
