import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ErrorView } from '../components/ui/ErrorView';
import { LoadingView } from '../components/ui/LoadingView';
import { fetchHeritageGroup, type HeritageGroupDetail, type HeritageMember } from '../services/heritageService';
import type { RootStackParamList } from '../navigation/types';
import { shadows, tokens } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Heritage'>;

export default function HeritageScreen({ route, navigation }: Props) {
  const { heritageGroupId } = route.params;
  const [group, setGroup] = useState<HeritageGroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchHeritageGroup(heritageGroupId)
      .then((data) => {
        if (!cancelled) setGroup(data);
      })
      .catch((e) => {
        if (!cancelled) {
          setGroup(null);
          setError(e instanceof Error ? e.message : 'Could not load heritage group.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [heritageGroupId, reloadToken]);

  const onPressMember = (member: HeritageMember) => {
    if (member.content_type === 'recipe') {
      navigation.navigate('RecipeDetail', { id: String(member.id) });
    } else if (member.content_type === 'story') {
      navigation.navigate('StoryDetail', { id: String(member.id) });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.centered}>
          <LoadingView message="Loading heritage…" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !group) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.padded}>
          <ErrorView
            message={error ?? 'Heritage group not found.'}
            onRetry={() => setReloadToken((t) => t + 1)}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <FlatList
        data={group.members}
        keyExtractor={(item) => `${item.content_type}-${item.id}`}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.glyphRow}>
              <Text style={styles.glyph}>🏛</Text>
              <Text style={styles.label}>HERITAGE</Text>
            </View>
            <Text style={styles.title} accessibilityRole="header">
              {group.name}
            </Text>
            {group.description ? (
              <Text style={styles.description}>{group.description}</Text>
            ) : null}

            <Pressable
              onPress={() => navigation.navigate('HeritageMap', { heritageGroupId: group.id })}
              style={({ pressed }) => [styles.mapCta, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Show heritage map"
            >
              <Text style={styles.mapCtaText}>Show heritage map →</Text>
            </Pressable>

            <Text style={styles.sectionHeading}>
              Recipes &amp; stories in this heritage ({group.members.length})
            </Text>
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>No recipes or stories linked to this heritage yet.</Text>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => onPressMember(item)}
            style={({ pressed }) => [styles.memberCard, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`Open ${item.content_type} ${item.title}`}
          >
            <View style={styles.memberKind}>
              <Text style={styles.memberKindText}>
                {item.content_type === 'recipe' ? 'RECIPE' : 'STORY'}
              </Text>
            </View>
            <View style={styles.memberBody}>
              <Text style={styles.memberTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <View style={styles.memberMetaRow}>
                {item.region ? (
                  <View style={styles.regionPill}>
                    <Text style={styles.regionPillText}>{item.region}</Text>
                  </View>
                ) : null}
                {item.author ? (
                  <Text style={styles.memberAuthor}>By {item.author}</Text>
                ) : null}
              </View>
            </View>
            <Text style={styles.memberArrow}>→</Text>
          </Pressable>
        )}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.colors.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  padded: { flex: 1, padding: 20, justifyContent: 'center' },
  list: { padding: 20, paddingBottom: 32 },
  header: { gap: 14, marginBottom: 18 },
  glyphRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  glyph: { fontSize: 28 },
  label: { fontSize: 12, fontWeight: '900', letterSpacing: 1.4, color: tokens.colors.textMuted },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: tokens.colors.text,
    fontFamily: tokens.typography.display.fontFamily,
  },
  description: { fontSize: 15, color: tokens.colors.text, lineHeight: 22 },
  mapCta: {
    marginTop: 4,
    alignSelf: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.accentGreen,
    borderWidth: 2,
    borderColor: tokens.colors.surfaceDark,
    ...shadows.md,
  },
  mapCtaText: { fontSize: 14, color: tokens.colors.textOnDark, fontWeight: '800', letterSpacing: 0.3 },
  sectionHeading: {
    marginTop: 18,
    fontSize: 16,
    fontWeight: '800',
    color: tokens.colors.text,
    fontFamily: tokens.typography.display.fontFamily,
  },
  empty: { fontSize: 14, color: tokens.colors.textMuted, fontStyle: 'italic', paddingHorizontal: 4 },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.surfaceDark,
    marginBottom: 10,
    ...shadows.sm,
  },
  memberKind: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: tokens.radius.sm,
    backgroundColor: tokens.colors.surfaceDark,
  },
  memberKindText: {
    fontSize: 10,
    fontWeight: '900',
    color: tokens.colors.bg,
    letterSpacing: 1,
  },
  memberBody: { flex: 1, gap: 6 },
  memberTitle: { fontSize: 15, fontWeight: '800', color: tokens.colors.text },
  memberMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  regionPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.bg,
    borderWidth: 1,
    borderColor: tokens.colors.surfaceDark,
  },
  regionPillText: { fontSize: 11, color: tokens.colors.text, fontWeight: '800' },
  memberAuthor: { fontSize: 12, color: tokens.colors.textMuted, fontWeight: '700' },
  memberArrow: { fontSize: 18, fontWeight: '900', color: tokens.colors.surfaceDark },
  pressed: { opacity: 0.85 },
});
