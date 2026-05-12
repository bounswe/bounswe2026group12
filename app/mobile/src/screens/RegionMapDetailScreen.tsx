import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Callout, Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ErrorView } from '../components/ui/ErrorView';
import { LoadingView } from '../components/ui/LoadingView';
import { MapZoomControls } from '../components/map/MapZoomControls';
import {
  fetchRegionRecipes,
  fetchRegionStories,
  type RegionRecipesPayload,
  type RegionStoryPin,
  type UnlocatedRecipe,
} from '../services/mapDataService';
import type { RootStackParamList } from '../navigation/types';
import { shadows, tokens } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'RegionMapDetail'>;

export default function RegionMapDetailScreen({ route, navigation }: Props) {
  const { regionId, regionName } = route.params;
  const [payload, setPayload] = useState<RegionRecipesPayload | null>(null);
  const [stories, setStories] = useState<RegionStoryPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const mapRef = useRef<MapView | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchRegionRecipes(regionName)
      .then((data) => {
        if (!cancelled) setPayload(data);
      })
      .catch((e) => {
        if (!cancelled) {
          setPayload(null);
          setError(e instanceof Error ? e.message : 'Could not load region recipes.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [regionName, reloadToken]);

  // Parallel fetch of story pins (#731). Stories may have no lat/lng yet —
  // backend #730 only just added the fields. If the call fails or returns
  // nothing usable, the recipe map still works untouched.
  useEffect(() => {
    let cancelled = false;
    fetchRegionStories(regionId)
      .then((data) => {
        if (!cancelled) setStories(data);
      })
      .catch(() => {
        if (!cancelled) setStories([]);
      });
    return () => {
      cancelled = true;
    };
  }, [regionId, reloadToken]);

  const initialRegion = useMemo(() => {
    if (!payload) return null;
    if (payload.bbox) {
      const latDelta = Math.max(0.4, Math.abs(payload.bbox.north - payload.bbox.south) * 1.2);
      const lngDelta = Math.max(0.4, Math.abs(payload.bbox.east - payload.bbox.west) * 1.2);
      return {
        latitude: (payload.bbox.north + payload.bbox.south) / 2,
        longitude: (payload.bbox.east + payload.bbox.west) / 2,
        latitudeDelta: latDelta,
        longitudeDelta: lngDelta,
      };
    }
    if (payload.centroid) {
      return {
        latitude: payload.centroid.latitude,
        longitude: payload.centroid.longitude,
        latitudeDelta: 3,
        longitudeDelta: 3,
      };
    }
    return null;
  }, [payload]);

  // After load, fit the map to all located recipes (or the bbox) so users
  // immediately see the spread of pins instead of a static initial frame.
  useEffect(() => {
    if (!mapRef.current || !payload) return;
    const coords = [
      ...payload.located.map((r) => r.coords),
      ...stories.map((s) => s.coords),
    ];
    if (coords.length === 0) return;
    const t = setTimeout(() => {
      mapRef.current?.fitToCoordinates(coords, {
        edgePadding: { top: 80, right: 60, bottom: 220, left: 60 },
        animated: true,
      });
    }, 250);
    return () => clearTimeout(t);
  }, [payload, stories]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.centered}>
          <LoadingView message={`Loading ${regionName} recipes…`} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !payload) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.padded}>
          <ErrorView
            message={error ?? 'Could not load region recipes.'}
            onRetry={() => setReloadToken((t) => t + 1)}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (!initialRegion) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.padded}>
          <Text style={styles.emptyHeading}>{regionName}</Text>
          <Text style={styles.emptyBody}>
            This region has no map coordinates yet. Once recipes get tagged with locations they&apos;ll
            appear here.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.fill}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={initialRegion}
          accessibilityLabel={`Recipes located in ${regionName}`}
        >
          {payload.located.map((r) => (
            <Marker
              key={`r-${r.id}`}
              coordinate={r.coords}
              pinColor={tokens.colors.accentGreen}
              onCalloutPress={() => navigation.navigate('RecipeDetail', { id: r.id })}
            >
              <Callout tooltip>
                <View style={styles.callout}>
                  <Text style={styles.calloutKind}>RECIPE</Text>
                  <Text style={styles.calloutTitle} numberOfLines={2}>
                    {r.title}
                  </Text>
                  {r.authorUsername ? (
                    <Text style={styles.calloutHint}>By {r.authorUsername}</Text>
                  ) : null}
                  <Text style={styles.calloutHint}>Tap to open →</Text>
                </View>
              </Callout>
            </Marker>
          ))}

          {stories.map((s) => (
            <Marker
              key={`s-${s.id}`}
              coordinate={s.coords}
              pinColor={tokens.colors.accentMustard}
              onCalloutPress={() => navigation.navigate('StoryDetail', { id: String(s.id) })}
            >
              <View style={styles.storyMarker}>
                <Text style={styles.storyGlyph}>📖</Text>
              </View>
              <Callout tooltip>
                <View style={styles.callout}>
                  <Text style={styles.calloutKind}>STORY · {s.title}</Text>
                  {s.author ? (
                    <Text style={styles.calloutHint}>By {s.author}</Text>
                  ) : null}
                  <Text style={styles.calloutHint}>Tap to open →</Text>
                </View>
              </Callout>
            </Marker>
          ))}
        </MapView>

        <MapZoomControls mapRef={mapRef} style={styles.zoomControls} />

        <View style={styles.headerOverlay} pointerEvents="none">
          <View style={styles.headerCard}>
            <Text style={styles.headerTitle}>{regionName}</Text>
            <Text style={styles.headerSub}>
              📖 {stories.length} stor{stories.length === 1 ? 'y' : 'ies'} · 📍{' '}
              {payload.located.length} recipe{payload.located.length === 1 ? '' : 's'}
            </Text>
            <Text style={styles.headerSubMuted}>
              {payload.unlocated.length} recipe{payload.unlocated.length === 1 ? '' : 's'} without
              a location
            </Text>
          </View>
        </View>

        {payload.unlocated.length > 0 ? (
          <View style={styles.unlocatedWrap}>
            <Text style={styles.unlocatedHeading}>Without a location</Text>
            <FlatList
              data={payload.unlocated}
              horizontal
              keyExtractor={(item) => `u-${item.id}`}
              contentContainerStyle={styles.unlocatedList}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <UnlocatedCard
                  item={item}
                  onPress={() => navigation.navigate('RecipeDetail', { id: item.id })}
                />
              )}
            />
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function UnlocatedCard({
  item,
  onPress,
}: {
  item: UnlocatedRecipe;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.unlocatedCard, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Open recipe ${item.title}`}
    >
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.unlocatedThumb} resizeMode="cover" />
      ) : (
        <View style={[styles.unlocatedThumb, styles.unlocatedThumbFallback]}>
          <Text style={styles.unlocatedThumbInitial}>{(item.title.charAt(0) || 'R').toUpperCase()}</Text>
        </View>
      )}
      <View style={styles.unlocatedBody}>
        <Text style={styles.unlocatedTitle} numberOfLines={2}>
          {item.title}
        </Text>
        {item.authorUsername ? (
          <Text style={styles.unlocatedAuthor} numberOfLines={1}>
            By {item.authorUsername}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.colors.bg },
  fill: { flex: 1 },
  map: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  padded: { flex: 1, padding: 20, justifyContent: 'center', gap: 12 },
  emptyHeading: {
    fontSize: 24,
    fontWeight: '800',
    color: tokens.colors.text,
    fontFamily: tokens.typography.display.fontFamily,
  },
  emptyBody: { fontSize: 15, color: tokens.colors.textMuted, lineHeight: 22 },

  headerOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
  },
  /** Stacked below the header card (which sits at top:16) so the zoom
   * controls don't overlap the region name. */
  zoomControls: { top: 90 },
  headerCard: {
    padding: 12,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.bg,
    borderWidth: 1.5,
    borderColor: tokens.colors.surfaceDark,
    gap: 4,
    ...shadows.md,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: tokens.colors.text,
    fontFamily: tokens.typography.display.fontFamily,
  },
  headerSub: { fontSize: 12, fontWeight: '700', color: tokens.colors.text },
  headerSubMuted: { fontSize: 11, fontWeight: '600', color: tokens.colors.textMuted },

  storyMarker: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: tokens.colors.accentMustard,
    borderWidth: 2.5,
    borderColor: tokens.colors.surfaceDark,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  storyGlyph: { fontSize: 16 },

  callout: {
    minWidth: 180,
    maxWidth: 240,
    padding: 10,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.bg,
    borderWidth: 1.5,
    borderColor: tokens.colors.surfaceDark,
    gap: 4,
    ...shadows.md,
  },
  calloutKind: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
    color: tokens.colors.textMuted,
  },
  calloutTitle: { fontSize: 13, fontWeight: '800', color: tokens.colors.text },
  calloutHint: { fontSize: 11, fontWeight: '700', color: tokens.colors.textMuted },

  unlocatedWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: tokens.colors.bg,
    borderTopWidth: 1.5,
    borderTopColor: tokens.colors.surfaceDark,
    ...shadows.lg,
  },
  unlocatedHeading: {
    paddingHorizontal: 16,
    marginBottom: 8,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
    color: tokens.colors.textMuted,
  },
  unlocatedList: { gap: 10, paddingHorizontal: 16, paddingRight: 24 },
  unlocatedCard: {
    width: 220,
    flexDirection: 'row',
    gap: 10,
    padding: 8,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.surfaceDark,
    ...shadows.sm,
  },
  unlocatedThumb: {
    width: 56,
    height: 56,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.accentGreenTint,
  },
  unlocatedThumbFallback: { alignItems: 'center', justifyContent: 'center' },
  unlocatedThumbInitial: { fontSize: 20, fontWeight: '900', color: tokens.colors.surfaceDark },
  unlocatedBody: { flex: 1, justifyContent: 'center', gap: 2 },
  unlocatedTitle: { fontSize: 13, fontWeight: '800', color: tokens.colors.text },
  unlocatedAuthor: { fontSize: 11, color: tokens.colors.textMuted, fontWeight: '700' },
  pressed: { opacity: 0.85 },
});
