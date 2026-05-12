import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Callout, Marker, Polyline } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapZoomControls } from '../components/map/MapZoomControls';
import { ErrorView } from '../components/ui/ErrorView';
import { LoadingView } from '../components/ui/LoadingView';
import type { RootStackParamList } from '../navigation/types';
import {
  fetchIngredientRoutes,
  type IngredientRoute,
  type IngredientWaypoint,
} from '../services/ingredientRouteService';
import { shadows, tokens } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'IngredientMigrationMap'>;

const INITIAL_REGION = {
  latitude: 25,
  longitude: 20,
  latitudeDelta: 120,
  longitudeDelta: 180,
};

export default function IngredientMigrationMapScreen(_props: Props) {
  const [routes, setRoutes] = useState<IngredientRoute[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const mapRef = useRef<MapView | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchIngredientRoutes()
      .then((data) => {
        if (cancelled) return;
        setRoutes(data);
        setSelectedId(data.length > 0 ? data[0].id : null);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load routes.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const selected = useMemo<IngredientRoute | null>(
    () => routes.find((r) => r.id === selectedId) ?? null,
    [routes, selectedId],
  );

  const polylineCoords = useMemo(
    () => (selected?.waypoints ?? []).map((w) => ({ latitude: w.lat, longitude: w.lng })),
    [selected],
  );

  useEffect(() => {
    if (!mapRef.current || polylineCoords.length === 0) return;
    const t = setTimeout(() => {
      mapRef.current?.fitToCoordinates(polylineCoords, {
        edgePadding: { top: 140, right: 60, bottom: 200, left: 60 },
        animated: true,
      });
    }, 250);
    return () => clearTimeout(t);
  }, [polylineCoords]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.centered}>
          <LoadingView message="Loading migration routes…" />
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

  if (routes.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.padded}>
          <Text style={styles.emptyHeading}>No migration routes yet</Text>
          <Text style={styles.emptyBody}>
            Ingredient migration routes appear here once the backend seeds them. Try again in a
            moment, or pull to refresh.
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
          initialRegion={INITIAL_REGION}
          accessibilityLabel="Ingredient migration map"
        >
          {polylineCoords.length >= 2 ? (
            <Polyline
              coordinates={polylineCoords}
              strokeColor={tokens.colors.surfaceDark}
              strokeWidth={3}
              geodesic
            />
          ) : null}

          {(selected?.waypoints ?? []).map((w, idx) => (
            <Marker
              key={`${selected!.id}-${idx}`}
              coordinate={{ latitude: w.lat, longitude: w.lng }}
              pinColor={idx === 0 ? tokens.colors.accentGreen : tokens.colors.accentMustard}
            >
              <View
                style={[
                  styles.stepMarker,
                  idx === 0 && styles.stepMarkerOrigin,
                ]}
              >
                <Text style={styles.stepMarkerText}>{idx + 1}</Text>
              </View>
              <Callout tooltip>
                <CalloutBubble waypoint={w} step={idx + 1} total={selected!.waypoints.length} />
              </Callout>
            </Marker>
          ))}
        </MapView>

        <MapZoomControls mapRef={mapRef} style={styles.zoomControls} />

        <View style={styles.headerCard} pointerEvents="none">
          <Text style={styles.headerKicker}>INGREDIENT MIGRATION</Text>
          <Text style={styles.headerTitle}>{selected?.ingredient_name ?? '—'}</Text>
          <Text style={styles.headerBody}>
            {selected?.waypoints.length ?? 0} waypoints · origin → today
          </Text>
        </View>

        <View style={styles.pickerWrap}>
          <FlatList
            data={routes}
            keyExtractor={(r) => String(r.id)}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pickerContent}
            renderItem={({ item }) => {
              const active = item.id === selectedId;
              return (
                <Pressable
                  onPress={() => setSelectedId(item.id)}
                  style={({ pressed }) => [
                    styles.chip,
                    active && styles.chipActive,
                    pressed && styles.chipPressed,
                  ]}
                  accessibilityLabel={`Show migration route for ${item.ingredient_name}`}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {item.ingredient_name}
                  </Text>
                </Pressable>
              );
            }}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

function CalloutBubble({
  waypoint,
  step,
  total,
}: {
  waypoint: IngredientWaypoint;
  step: number;
  total: number;
}) {
  return (
    <View style={styles.callout}>
      <Text style={styles.calloutStep}>
        STEP {step} / {total}
      </Text>
      <Text style={styles.calloutLabel} numberOfLines={2}>
        {waypoint.label || 'Unnamed stop'}
      </Text>
      {waypoint.era ? <Text style={styles.calloutEra}>{waypoint.era}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.colors.bg },
  fill: { flex: 1 },
  map: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  padded: { flex: 1, padding: 20, justifyContent: 'center', gap: 12 },
  emptyHeading: {
    fontSize: 22,
    fontWeight: '800',
    color: tokens.colors.text,
    fontFamily: tokens.typography.display.fontFamily,
  },
  emptyBody: { fontSize: 15, color: tokens.colors.textMuted, lineHeight: 22 },
  zoomControls: { top: 130 },
  headerCard: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    padding: 12,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.bg,
    borderWidth: 1.5,
    borderColor: tokens.colors.surfaceDark,
    gap: 2,
    ...shadows.md,
  },
  headerKicker: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
    color: tokens.colors.textMuted,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: tokens.colors.text,
    fontFamily: tokens.typography.display.fontFamily,
  },
  headerBody: { fontSize: 12, color: tokens.colors.textMuted, fontWeight: '700' },
  pickerWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 12,
    backgroundColor: tokens.colors.bg,
    borderTopWidth: 1.5,
    borderTopColor: tokens.colors.surfaceDark,
  },
  pickerContent: { paddingHorizontal: 12, gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: tokens.radius.pill,
    borderWidth: 1.5,
    borderColor: tokens.colors.surfaceDark,
    backgroundColor: tokens.colors.bg,
    marginRight: 8,
  },
  chipActive: { backgroundColor: tokens.colors.accentMustard },
  chipPressed: { opacity: 0.85 },
  chipText: { fontSize: 13, fontWeight: '700', color: tokens.colors.text },
  chipTextActive: { color: tokens.colors.text },
  stepMarker: {
    minWidth: 28,
    height: 28,
    paddingHorizontal: 6,
    borderRadius: 999,
    backgroundColor: tokens.colors.accentMustard,
    borderWidth: 2,
    borderColor: tokens.colors.surfaceDark,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  stepMarkerOrigin: { backgroundColor: tokens.colors.accentGreen },
  stepMarkerText: { fontSize: 12, fontWeight: '900', color: tokens.colors.text },
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
  calloutStep: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    color: tokens.colors.textMuted,
  },
  calloutLabel: { fontSize: 14, fontWeight: '800', color: tokens.colors.text },
  calloutEra: { fontSize: 12, color: tokens.colors.textMuted, fontWeight: '700' },
});
