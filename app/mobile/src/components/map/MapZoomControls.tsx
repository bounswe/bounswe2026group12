import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import type MapView from 'react-native-maps';
import { shadows, tokens } from '../../theme';

type Props = {
  mapRef: React.RefObject<MapView | null>;
  style?: StyleProp<ViewStyle>;
};

const MIN_ZOOM = 3;
const MAX_ZOOM = 18;

function clampZoom(z: number): number {
  if (Number.isNaN(z)) return MIN_ZOOM;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
}

async function step(mapRef: React.RefObject<MapView | null>, delta: 1 | -1): Promise<void> {
  const map = mapRef.current;
  if (!map) return;
  try {
    const cam = await map.getCamera();
    if (cam && typeof cam.zoom === 'number') {
      // Android path: Camera.zoom is populated.
      const next = clampZoom(cam.zoom + delta);
      map.animateCamera({ zoom: next }, { duration: 250 });
      return;
    }
  } catch {
    // fall through to region-based zoom
  }

  // iOS fallback: scale region deltas via current map bounds.
  try {
    const bounds = await map.getMapBoundaries();
    const ne = bounds.northEast;
    const sw = bounds.southWest;
    const latitudeDelta = Math.abs(ne.latitude - sw.latitude);
    const longitudeDelta = Math.abs(ne.longitude - sw.longitude);
    const center = {
      latitude: (ne.latitude + sw.latitude) / 2,
      longitude: (ne.longitude + sw.longitude) / 2,
    };
    // +1 zoom = halve deltas; −1 zoom = double deltas.
    const factor = delta === 1 ? 0.5 : 2;
    // Clamp deltas to keep within rough min/max zoom envelope.
    const minDelta = 0.0005; // ~zoom 18
    const maxDelta = 90;     // ~zoom 3
    const nextLat = Math.min(maxDelta, Math.max(minDelta, latitudeDelta * factor));
    const nextLng = Math.min(maxDelta, Math.max(minDelta, longitudeDelta * factor));
    map.animateToRegion(
      {
        latitude: center.latitude,
        longitude: center.longitude,
        latitudeDelta: nextLat,
        longitudeDelta: nextLng,
      },
      250,
    );
  } catch {
    // give up silently — pinch still works.
  }
}

export function MapZoomControls({ mapRef, style }: Props) {
  const onZoomIn = useCallback(() => {
    void step(mapRef, 1);
  }, [mapRef]);
  const onZoomOut = useCallback(() => {
    void step(mapRef, -1);
  }, [mapRef]);

  return (
    <View style={[styles.card, style]} pointerEvents="box-none">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Zoom in"
        hitSlop={10}
        onPress={onZoomIn}
        style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
      >
        <Text style={styles.glyph}>＋</Text>
      </Pressable>
      <View style={styles.divider} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Zoom out"
        hitSlop={10}
        onPress={onZoomOut}
        style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
      >
        <Text style={styles.glyph}>－</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: tokens.colors.bg,
    borderWidth: 1.5,
    borderColor: tokens.colors.surfaceDark,
    borderRadius: tokens.radius.lg,
    overflow: 'hidden',
    ...shadows.md,
  },
  btn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPressed: {
    opacity: 0.6,
  },
  divider: {
    height: 1,
    backgroundColor: tokens.colors.surfaceDark,
    opacity: 0.4,
  },
  glyph: {
    fontSize: 22,
    fontWeight: '800',
    color: tokens.colors.text,
    lineHeight: 24,
  },
});

export default MapZoomControls;
