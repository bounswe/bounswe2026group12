import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HeritageBadge } from '../components/heritage/HeritageBadge';
import { LinkedRecipePreviewCard } from '../components/story/LinkedRecipePreviewCard';
import { ErrorView } from '../components/ui/ErrorView';
import { LoadingView } from '../components/ui/LoadingView';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { RootStackParamList } from '../navigation/types';
import { saveStoryToPassport } from '../services/passportActionService';
import { fetchRecipeById } from '../services/recipeService';
import { fetchStoryById } from '../services/storyService';
import type { StoryDetail } from '../types/story';
import { shadows, tokens } from '../theme';
import { isStoryAuthor } from '../utils/storyAuthor';

type Props = NativeStackScreenProps<RootStackParamList, 'StoryDetail'>;

export default function StoryDetailScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const { user, isAuthenticated, isReady } = useAuth();
  const [story, setStory] = useState<StoryDetail | null>(null);
  const [linkedRecipeImage, setLinkedRecipeImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [passportBusy, setPassportBusy] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setLinkedRecipeImage(null);
    fetchStoryById(id)
      .then((data) => {
        if (!cancelled) setStory(data);
      })
      .catch((e) => {
        if (!cancelled) {
          setStory(null);
          setError(e instanceof Error ? e.message : 'Could not load story.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, reloadToken]);

  // Backend's story serializer only exposes `linked_recipe` as an integer ID,
  // so to render the recipe's image in the preview card we have to fetch the
  // recipe by id separately. One extra request per story view, accepted cost.
  useEffect(() => {
    const linkedId = story?.linked_recipe?.id;
    if (!linkedId) {
      setLinkedRecipeImage(null);
      return;
    }
    let cancelled = false;
    fetchRecipeById(String(linkedId))
      .then((r) => {
        if (!cancelled) setLinkedRecipeImage(r.image ?? null);
      })
      .catch(() => {
        if (!cancelled) setLinkedRecipeImage(null);
      });
    return () => {
      cancelled = true;
    };
  }, [story?.linked_recipe?.id]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.centered}>
          <LoadingView message="Loading story…" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !story) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.paddedCenter}>
          <ErrorView
            message={error ?? 'Story not found.'}
            onRetry={() => setReloadToken((t) => t + 1)}
          />
        </View>
      </SafeAreaView>
    );
  }

  const canEdit = isReady && isAuthenticated && isStoryAuthor(user, story);

  /**
   * Passport-action toggle (#599). Active state comes from `saved_to_passport`
   * on the story payload (surfaced by backend #584). Optimistic toggle +
   * rollback on error, same shape the recipe detail screen uses.
   */
  const savedToPassport = story.saved_to_passport === true;

  const onTogglePassport = async () => {
    if (!isAuthenticated) {
      navigation.navigate('Login');
      return;
    }
    if (passportBusy) return;
    const prevFlag = savedToPassport;
    const nextFlag = !prevFlag;
    setPassportBusy(true);
    setStory((prev) => (prev ? { ...prev, saved_to_passport: nextFlag } : prev));
    try {
      const result = await saveStoryToPassport(id, nextFlag);
      setStory((prev) => (prev ? { ...prev, saved_to_passport: result.saved } : prev));
    } catch (e) {
      setStory((prev) => (prev ? { ...prev, saved_to_passport: prevFlag } : prev));
      showToast(
        e instanceof Error ? e.message : 'Could not update passport.',
        'error',
      );
    } finally {
      setPassportBusy(false);
    }
  };

  const authorObj =
    story.author && typeof story.author === 'object' && story.author.username && story.author.id != null
      ? story.author
      : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.padded}>
        <View style={styles.card}>
          {story.image ? (
            <View style={styles.thumbWrap} accessibilityLabel="Story image">
              <Image source={{ uri: story.image }} style={styles.thumb} resizeMode="cover" />
            </View>
          ) : null}
          <Text style={styles.title} accessibilityRole="header">
            {story.title}
          </Text>
          {story.region ? (
            <Pressable
              onPress={() =>
                navigation.navigate('Search', { region: story.region as string })
              }
              style={({ pressed }) => [styles.regionPill, pressed && { opacity: 0.85 }]}
              accessibilityRole="link"
              accessibilityLabel={`Browse ${story.region} content`}
              hitSlop={10}
            >
              <Text style={styles.regionPillText}>{story.region}</Text>
            </Pressable>
          ) : null}
          {authorObj ? (
            <Pressable
              onPress={() =>
                navigation.navigate('UserProfile', {
                  userId: authorObj.id as number,
                  username: authorObj.username,
                })
              }
              style={({ pressed }) => [styles.authorPill, pressed && { opacity: 0.85 }]}
              accessibilityRole="link"
              accessibilityLabel={`Open profile of ${authorObj.username}`}
              hitSlop={10}
            >
              <Text style={styles.authorPillText}>By {authorObj.username}</Text>
            </Pressable>
          ) : story.author ? (
            <Text style={styles.meta}>By Author</Text>
          ) : null}
          <View style={styles.actionRow}>
            {canEdit ? (
              <Pressable
                onPress={() => navigation.navigate('StoryEdit', { id })}
                style={({ pressed }) => [styles.editLink, pressed && { opacity: 0.85 }]}
                accessibilityRole="button"
                accessibilityLabel="Edit story"
              >
                <Text style={styles.editLinkText}>Edit story</Text>
              </Pressable>
            ) : null}
            {isAuthenticated ? (
              <Pressable
                onPress={() => void onTogglePassport()}
                disabled={passportBusy}
                style={({ pressed }) => [
                  styles.passportBtn,
                  savedToPassport && styles.passportBtnActive,
                  pressed && { opacity: 0.85 },
                  passportBusy && { opacity: 0.6 },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: savedToPassport, busy: passportBusy }}
                accessibilityLabel={
                  savedToPassport ? 'Remove story from passport' : 'Save story to passport'
                }
                hitSlop={8}
              >
                <Text style={styles.passportIcon}>🛂</Text>
                <Text
                  style={[
                    styles.passportText,
                    savedToPassport && styles.passportTextOnDark,
                  ]}
                >
                  {savedToPassport ? 'Saved to Passport' : 'Save to Passport'}
                </Text>
              </Pressable>
            ) : null}
          </View>
          {story.language ? (
            <Text style={styles.meta}>Language: {story.language.toUpperCase()}</Text>
          ) : null}
          <Text style={styles.body}>{story.body}</Text>

          <View style={styles.linked}>
            <Text style={styles.linkedHeading}>Linked Recipe</Text>
            {story.linked_recipe ? (
              <LinkedRecipePreviewCard
                onPress={() =>
                  navigation.navigate('RecipeDetail', { id: story.linked_recipe!.id })
                }
                recipe={{ ...story.linked_recipe, image: linkedRecipeImage }}
              />
            ) : (
              <Text style={styles.noLinked}>No recipe is linked to the story.</Text>
            )}
          </View>

          {story.heritage_group ? (
            <HeritageBadge
              groupName={story.heritage_group.name}
              onPress={() =>
                navigation.navigate('Heritage', {
                  heritageGroupId: story.heritage_group!.id,
                })
              }
            />
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.colors.bg },
  padded: { padding: 20, paddingBottom: 32 },
  paddedCenter: { flex: 1, padding: 20, justifyContent: 'center' },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.xl,
    backgroundColor: tokens.colors.surface,
    padding: 16,
    ...shadows.lg,
  },
  thumbWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: tokens.radius.xl,
    overflow: 'hidden',
    backgroundColor: tokens.colors.surface,
    marginBottom: 16,
    ...shadows.lg,
  },
  thumb: { width: '100%', height: '100%' },
  title: { fontSize: 24, fontWeight: '800', color: tokens.colors.text, fontFamily: tokens.typography.display.fontFamily },
  meta: { fontSize: 14, color: tokens.colors.textMuted, marginTop: 8 },
  regionPill: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.bg,
    borderWidth: 1.5,
    borderColor: tokens.colors.surfaceDark,
  },
  regionPillText: { fontSize: 12, color: tokens.colors.text, fontWeight: '800', letterSpacing: 0.2 },
  authorPill: {
    alignSelf: 'flex-start',
    marginTop: 10,
    backgroundColor: tokens.colors.bg,
    borderWidth: 2,
    borderColor: tokens.colors.surfaceDark,
    borderRadius: tokens.radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  authorPillText: { fontSize: 13, color: tokens.colors.text, fontWeight: '800', letterSpacing: 0.2 },
  body: { fontSize: 16, marginTop: 16, lineHeight: 24, color: tokens.colors.text },
  linked: { marginTop: 28, paddingTop: 16, borderTopWidth: 1, borderTopColor: tokens.colors.surfaceDark },
  linkedHeading: { fontSize: 18, fontWeight: '800', marginBottom: 10, color: tokens.colors.text, fontFamily: tokens.typography.display.fontFamily },
  noLinked: { fontSize: 15, color: tokens.colors.textMuted, lineHeight: 22 },
  editLink: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.accentGreen,
    borderWidth: 2,
    borderColor: tokens.colors.surfaceDark,
  },
  editLinkText: { fontSize: 14, color: tokens.colors.textOnDark, fontWeight: '800', letterSpacing: 0.3 },
  actionRow: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  passportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.surface,
    borderWidth: 2,
    borderColor: tokens.colors.surfaceDark,
  },
  passportBtnActive: { backgroundColor: tokens.colors.accentMustard },
  passportIcon: { fontSize: 16 },
  passportText: {
    fontSize: 13,
    fontWeight: '800',
    color: tokens.colors.text,
    letterSpacing: 0.3,
  },
  passportTextOnDark: { color: tokens.colors.textOnDark },
});
