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

/** Regional zoom-in when a pin is selected. react-native-maps' `animateCamera`
 * uses Google Maps zoom levels (higher = closer); zoom 9 lands at a roughly
 * 10 km regional frame — close enough to feel like we're "going there" but
 * still wide enough to read the surrounding geography rather than dropping
 * the user on top of a single building. */
const FOCUS_ZOOM = 9;
/** Camera animation duration. Matches the navigation push delay so the camera
 * visibly settles before RegionMapDetail mounts. */
const FOCUS_ANIM_MS = 700;

export default function MapDiscoveryScreen({ navigation }: Props) {
  const [pins, setPins] = useState<RegionPin[]>([]);
  const [focused, setFocused] = useState<RegionPin | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const { setFocusedRegion } = useTheme();
  const mapRef = useRef<MapView | null>(null);
  const navTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setFocusedRegion(focused?.name ?? null);
  }, [focused, setFocusedRegion]);

  useEffect(() => () => setFocusedRegion(null), [setFocusedRegion]);

  // If the screen unmounts mid-animation (e.g. user backs out), make sure the
  // queued navigation push doesn't fire on a dead component.
  useEffect(
    () => () => {
      if (navTimeoutRef.current) {
        clearTimeout(navTimeoutRef.current);
        navTimeoutRef.current = null;
      }
    },
    [],
  );

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
                // NOTE: deliberately do NOT call setFocused(pin) here.
                // The user is about to navigate away — mounting the region
                // bottom sheet for ~50ms only to tear it down again when
                // RegionMapDetail pushes causes a visible flicker (#825).
                // Smooth regional zoom on the tapped pin, then push the next
                // screen once the animation has visibly settled.
                mapRef.current?.animateCamera(
                  { center: pin.coords, zoom: FOCUS_ZOOM },
                  { duration: FOCUS_ANIM_MS },
                );
                if (navTimeoutRef.current) {
                  clearTimeout(navTimeoutRef.current);
                }
                navTimeoutRef.current = setTimeout(() => {
                  navTimeoutRef.current = null;
                  navigation.navigate('RegionMapDetail', {
                    regionId: pin.id,
                    regionName: pin.name,
                  });
                }, FOCUS_ANIM_MS);
              }}
            />
          ))}
        </MapView>

        <MapZoomControls mapRef={mapRef} />

        <View style={styles.searchPillWrap} pointerEvents="box-none">
          <Pressable
            onPress={() => navigation.navigate('Search', { region: '' })}
            style={({ pressed }) => [styles.searchPill, pressed && styles.searchPillPressed]}
            accessibilityRole="button"
            accessibilityLabel="Search regions"
          >
            <Text style={styles.searchPillText}>Search regions →</Text>
          </Pressable>
        </View>

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
  searchPillWrap: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  searchPill: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.bg,
    borderWidth: 2,
    borderColor: tokens.colors.surfaceDark,
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
