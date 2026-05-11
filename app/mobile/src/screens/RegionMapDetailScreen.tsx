import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ErrorView } from '../components/ui/ErrorView';
import { LoadingView } from '../components/ui/LoadingView';
import { MapZoomControls } from '../components/map/MapZoomControls';
import {
  fetchRegionRecipes,
  type RegionRecipesPayload,
  type UnlocatedRecipe,
} from '../services/mapDataService';
import type { RootStackParamList } from '../navigation/types';
import { shadows, tokens } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'RegionMapDetail'>;

export default function RegionMapDetailScreen({ route, navigation }: Props) {
  const { regionName } = route.params;
  const [payload, setPayload] = useState<RegionRecipesPayload | null>(null);
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
    const coords = payload.located.map((r) => r.coords);
    if (coords.length === 0) return;
    const t = setTimeout(() => {
      mapRef.current?.fitToCoordinates(coords, {
        edgePadding: { top: 80, right: 60, bottom: 220, left: 60 },
        animated: true,
      });
    }, 250);
    return () => clearTimeout(t);
  }, [payload]);

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
              title={r.title}
              description={r.authorUsername ? `By ${r.authorUsername}` : undefined}
              pinColor={tokens.colors.accentGreen}
              onCalloutPress={() => navigation.navigate('RecipeDetail', { id: r.id })}
            />
          ))}
        </MapView>

        <MapZoomControls mapRef={mapRef} style={styles.zoomControls} />

        <View style={styles.headerOverlay} pointerEvents="none">
          <View style={styles.headerCard}>
            <Text style={styles.headerTitle}>{regionName}</Text>
            <Text style={styles.headerSub}>
              {payload.located.length} on map · {payload.unlocated.length} without a location
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
  headerSub: { fontSize: 12, fontWeight: '700', color: tokens.colors.textMuted },

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
