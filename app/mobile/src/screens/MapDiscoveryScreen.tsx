import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MapView from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapZoomControls } from '../components/map/MapZoomControls';
import { RegionDetailSheet } from '../components/map/RegionDetailSheet';
import { RegionDotMarker } from '../components/map/RegionDotMarker';
import { ErrorView } from '../components/ui/ErrorView';
import { LoadingView } from '../components/ui/LoadingView';
import type { RootStackParamList } from '../navigation/types';
import { fetchRegionPins, type RegionPin } from '../services/mapDataService';
import { INITIAL_MAP_REGION } from '../utils/regionGeo';
import { shadows, tokens, useTheme } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'MapDiscovery'>;

/** Slight zoom-in when a pin is selected. react-native-maps' `animateCamera`
 * uses Google Maps zoom levels (higher = closer); 5 lands roughly at a country
 * frame, which feels good after the global initial view. */
const FOCUS_ZOOM = 5;

export default function MapDiscoveryScreen({ navigation }: Props) {
  const [pins, setPins] = useState<RegionPin[]>([]);
  const [focused, setFocused] = useState<RegionPin | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const { setFocusedRegion } = useTheme();
  const mapRef = useRef<MapView | null>(null);

  useEffect(() => {
    setFocusedRegion(focused?.name ?? null);
  }, [focused, setFocusedRegion]);

  useEffect(() => () => setFocusedRegion(null), [setFocusedRegion]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchRegionPins()
      .then((res) => {
        if (!cancelled) setPins(res);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load map.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.centered}>
          <LoadingView message="Loading regions across the world…" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.padded}>
          <ErrorView message={error} onRetry={() => setReloadToken((t) => t + 1)} />
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
          initialRegion={INITIAL_MAP_REGION}
          onPress={() => setFocused(null)}
          accessibilityLabel="Region discovery map"
        >
          {pins.map((pin) => (
            <RegionDotMarker
              key={pin.id}
              pin={pin}
              isFocused={focused?.id === pin.id}
              onPress={() => {
                setFocused(pin);
                // Smooth zoom-in on the tapped pin before diving into the
                // per-region map. Animation runs in parallel with navigation
                // so the transition feels continuous instead of janky.
                mapRef.current?.animateCamera(
                  { center: pin.coords, zoom: FOCUS_ZOOM },
                  { duration: 450 },
                );
                navigation.navigate('RegionMapDetail', {
                  regionId: pin.id,
                  regionName: pin.name,
                });
              }}
            />
          ))}
        </MapView>

        <MapZoomControls mapRef={mapRef} />

        <Pressable
          onPress={() => navigation.navigate('Search', { region: '' })}
          style={({ pressed }) => [styles.searchPill, pressed && styles.searchPillPressed]}
          accessibilityRole="button"
          accessibilityLabel="Search for a specific region"
        >
          <Text style={styles.searchPillText}>Search regions →</Text>
        </Pressable>

        <View style={styles.routesCtaWrap} pointerEvents="box-none">
          <Pressable
            onPress={() => navigation.navigate('IngredientMigrationMap')}
            style={({ pressed }) => [styles.routesCta, pressed && styles.routesCtaPressed]}
            accessibilityLabel="Open ingredient migration routes"
          >
            <Text style={styles.routesCtaIcon}>🧭</Text>
            <Text style={styles.routesCtaText}>Ingredient routes</Text>
          </Pressable>
        </View>

        {!focused ? (
          <View style={styles.hintWrap} pointerEvents="none">
            <View style={styles.hintCard} accessible accessibilityRole="text">
              <Text style={styles.hintText}>
                {pins.length === 0
                  ? 'No mappable regions yet. The team is still seeding coordinates.'
                  : 'Tap a pin to open the region. Bigger pins = more recipes.'}
              </Text>
            </View>
          </View>
        ) : null}

        <RegionDetailSheet
          regionId={focused?.id ?? null}
          regionName={focused?.name ?? null}
          onDismiss={() => setFocused(null)}
          onItemPress={(kind, id) => {
            if (kind === 'recipes') navigation.navigate('RecipeDetail', { id });
            else navigation.navigate('StoryDetail', { id });
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.colors.bg },
  fill: { flex: 1 },
  map: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  padded: { flex: 1, padding: 20, justifyContent: 'center' },
  hintWrap: {
    position: 'absolute',
    top: 64,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  hintCard: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.bg,
    borderWidth: 1,
    borderColor: tokens.colors.surfaceDark,
    ...shadows.sm,
  },
  hintText: { fontSize: 13, color: tokens.colors.text, fontWeight: '700' },
  searchPill: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.bg,
    borderWidth: 1.5,
    borderColor: tokens.colors.surfaceDark,
    zIndex: 10,
    ...shadows.md,
  },
  searchPillPressed: { opacity: 0.85 },
  searchPillText: {
    color: tokens.colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  routesCtaWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    alignItems: 'center',
  },
  routesCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.accentGreen,
    borderWidth: 2,
    borderColor: tokens.colors.surfaceDark,
    ...shadows.md,
  },
  routesCtaPressed: { opacity: 0.9 },
  routesCtaIcon: { fontSize: 16 },
  routesCtaText: { color: tokens.colors.textOnDark, fontSize: 15, fontWeight: '800' },
});
