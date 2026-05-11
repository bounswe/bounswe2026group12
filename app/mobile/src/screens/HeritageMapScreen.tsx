import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Callout, Marker, Polyline } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapZoomControls } from '../components/map/MapZoomControls';
import { ErrorView } from '../components/ui/ErrorView';
import { LoadingView } from '../components/ui/LoadingView';
import { fetchHeritageGroup, type HeritageGroupDetail } from '../services/heritageService';
import type { RootStackParamList } from '../navigation/types';
import { coordsForRegion, type LatLng } from '../utils/regionGeo';
import { shadows, tokens } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'HeritageMap'>;

type PlottedMember = {
  content_type: 'recipe' | 'story' | string;
  id: number;
  title: string;
  coords: LatLng;
};

/** Resolve coordinates either from backend lat/lng or the hardcoded regionGeo
 * fallback when the backend hasn't seeded coordinates yet (see #657). */
function resolveCoords(member: {
  latitude: number | null;
  longitude: number | null;
  region: string | null;
}): LatLng | null {
  if (member.latitude != null && member.longitude != null) {
    return { latitude: member.latitude, longitude: member.longitude };
  }
  if (member.region) {
    return coordsForRegion(member.region);
  }
  return null;
}

export default function HeritageMapScreen({ route, navigation }: Props) {
  const { heritageGroupId } = route.params;
  const [group, setGroup] = useState<HeritageGroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const mapRef = useRef<MapView | null>(null);

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
          setError(e instanceof Error ? e.message : 'Could not load heritage map.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [heritageGroupId, reloadToken]);

  const plotted = useMemo<PlottedMember[]>(() => {
    if (!group) return [];
    return group.members
      .map((m) => {
        const coords = resolveCoords(m);
        if (!coords) return null;
        return {
          content_type: m.content_type,
          id: m.id,
          title: m.title,
          coords,
        };
      })
      .filter((m): m is PlottedMember => m !== null);
  }, [group]);

  const centerCoord = useMemo<LatLng | null>(() => {
    if (plotted.length === 0) return null;
    const sumLat = plotted.reduce((acc, p) => acc + p.coords.latitude, 0);
    const sumLng = plotted.reduce((acc, p) => acc + p.coords.longitude, 0);
    return {
      latitude: sumLat / plotted.length,
      longitude: sumLng / plotted.length,
    };
  }, [plotted]);

  useEffect(() => {
    if (!mapRef.current || plotted.length === 0 || !centerCoord) return;
    const coords = [centerCoord, ...plotted.map((p) => p.coords)];
    const t = setTimeout(() => {
      mapRef.current?.fitToCoordinates(coords, {
        edgePadding: { top: 80, right: 60, bottom: 80, left: 60 },
        animated: true,
      });
    }, 250);
    return () => clearTimeout(t);
  }, [plotted, centerCoord]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.centered}>
          <LoadingView message="Loading heritage map…" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !group) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.padded}>
          <ErrorView
            message={error ?? 'Heritage map not available.'}
            onRetry={() => setReloadToken((t) => t + 1)}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (plotted.length === 0 || !centerCoord) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.padded}>
          <Text style={styles.emptyHeading}>{group.name}</Text>
          <Text style={styles.emptyBody}>
            None of the members in this heritage group have map coordinates yet. They&apos;ll appear
            here as soon as either the backend seeds region coordinates or members are tagged with
            explicit lat/lng.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.fill}>
        <MapView ref={mapRef} style={styles.map} accessibilityLabel={`Heritage map for ${group.name}`}>
          {/* Polylines from center → each member */}
          {plotted.map((p) => (
            <Polyline
              key={`line-${p.content_type}-${p.id}`}
              coordinates={[centerCoord, p.coords]}
              strokeColor={tokens.colors.surfaceDark}
              strokeWidth={2}
            />
          ))}

          {/* Central heritage marker */}
          <Marker
            coordinate={centerCoord}
            onPress={() => navigation.goBack()}
            pinColor={tokens.colors.accentGreen}
            title={group.name}
            description="Tap to return to heritage details"
          >
            <View style={styles.heritageMarker}>
              <Text style={styles.heritageGlyph}>🏛</Text>
            </View>
          </Marker>

          {/* Member markers */}
          {plotted.map((p) => (
            <Marker
              key={`mk-${p.content_type}-${p.id}`}
              coordinate={p.coords}
              pinColor={tokens.colors.accentMustard}
              onCalloutPress={() => {
                if (p.content_type === 'recipe') {
                  navigation.navigate('RecipeDetail', { id: String(p.id) });
                } else if (p.content_type === 'story') {
                  navigation.navigate('StoryDetail', { id: String(p.id) });
                }
              }}
            >
              <Callout tooltip>
                <View style={styles.callout}>
                  <Text style={styles.calloutKind}>
                    {p.content_type === 'recipe' ? 'RECIPE' : 'STORY'}
                  </Text>
                  <Text style={styles.calloutTitle} numberOfLines={2}>
                    {p.title}
                  </Text>
                  <Text style={styles.calloutHint}>Tap to open →</Text>
                </View>
              </Callout>
            </Marker>
          ))}
        </MapView>

        <MapZoomControls mapRef={mapRef} style={styles.zoomControls} />

        <View style={styles.legend} pointerEvents="none">
          <Text style={styles.legendTitle}>{group.name}</Text>
          <Text style={styles.legendBody}>
            🏛 Centre · {plotted.length} member{plotted.length === 1 ? '' : 's'}
          </Text>
        </View>
      </View>
    </SafeAreaView>
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
  heritageMarker: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: tokens.colors.accentGreen,
    borderWidth: 3,
    borderColor: tokens.colors.surfaceDark,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  heritageGlyph: { fontSize: 22 },
  callout: {
    minWidth: 180,
    maxWidth: 240,
    padding: 10,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.bg,
    borderWidth: 1.5,
    borderColor: tokens.colors.surfaceDark,
    gap: 6,
    ...shadows.md,
  },
  calloutKind: {
    fontSize: 10,
    fontWeight: '900',
    color: tokens.colors.textMuted,
    letterSpacing: 1,
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: tokens.colors.text,
  },
  calloutHint: {
    fontSize: 11,
    color: tokens.colors.textMuted,
    fontStyle: 'italic',
  },
  legend: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    padding: 12,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.bg,
    borderWidth: 1.5,
    borderColor: tokens.colors.surfaceDark,
    gap: 4,
    ...shadows.md,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: tokens.colors.text,
    fontFamily: tokens.typography.display.fontFamily,
  },
  legendBody: { fontSize: 12, color: tokens.colors.textMuted, fontWeight: '700' },
  zoomControls: { top: 90 },
});
