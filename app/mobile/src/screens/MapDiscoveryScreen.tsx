import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RegionDetailSheet } from '../components/map/RegionDetailSheet';
import { ErrorView } from '../components/ui/ErrorView';
import { LoadingView } from '../components/ui/LoadingView';
import type { RootStackParamList } from '../navigation/types';
import { fetchRegionPins, type RegionPin } from '../services/mapDataService';
import { INITIAL_MAP_REGION } from '../utils/regionGeo';
import { shadows, tokens, useTheme } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'MapDiscovery'>;

export default function MapDiscoveryScreen({ navigation }: Props) {
  const [pins, setPins] = useState<RegionPin[]>([]);
  const [focused, setFocused] = useState<RegionPin | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const { accent, setFocusedRegion } = useTheme();

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
          <LoadingView message="Loading map…" />
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
          style={styles.map}
          initialRegion={INITIAL_MAP_REGION}
          onPress={() => setFocused(null)}
          accessibilityLabel="Region discovery map"
        >
          {pins.map((pin) => (
            <Marker
              key={pin.id}
              coordinate={pin.coords}
              title={pin.name}
              description={`${pin.recipeCount} ${pin.recipeCount === 1 ? 'recipe' : 'recipes'}`}
              pinColor={focused?.id === pin.id ? accent.accent : tokens.colors.accentMustard}
              onPress={(e) => {
                e.stopPropagation?.();
                setFocused(pin);
              }}
            />
          ))}
        </MapView>

        {!focused ? (
          <View style={styles.hintWrap} pointerEvents="none">
            <View style={styles.hintCard}>
              <Text style={styles.hintText}>
                {pins.length === 0 ? 'No mappable regions yet.' : 'Tap a pin to open the region.'}
              </Text>
            </View>
          </View>
        ) : null}

        <RegionDetailSheet
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
  summary: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
  },
  summaryCard: {
    padding: 16,
    borderRadius: tokens.radius.xl,
    backgroundColor: tokens.colors.bg,
    borderWidth: 2,
    borderColor: tokens.colors.surfaceDark,
    gap: 8,
    ...shadows.lg,
  },
  summaryRegion: {
    fontSize: 20,
    fontWeight: '800',
    color: tokens.colors.text,
    fontFamily: tokens.typography.display.fontFamily,
  },
  summaryCount: { fontSize: 13, color: tokens.colors.text },
  cta: {
    marginTop: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.accentGreen,
    borderWidth: 2,
    borderColor: tokens.colors.surfaceDark,
    alignItems: 'center',
  },
  ctaPressed: { opacity: 0.9 },
  ctaText: { color: tokens.colors.textOnDark, fontSize: 15, fontWeight: '800' },
  hintWrap: {
    position: 'absolute',
    top: 16,
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
});
