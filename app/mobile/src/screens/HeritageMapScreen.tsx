import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapZoomControls } from '../components/map/MapZoomControls';
import { ErrorView } from '../components/ui/ErrorView';
import { LoadingView } from '../components/ui/LoadingView';
import {
  fetchHeritageGroup,
  type HeritageGroupDetail,
  type HeritageMember,
} from '../services/heritageService';
import type { RootStackParamList } from '../navigation/types';
import { coordsForRegion, type LatLng } from '../utils/regionGeo';
import { shadows, tokens } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'HeritageMap'>;

type MappedMember = HeritageMember & { coords: LatLng };

type RegionCluster = {
  region: string;
  coords: LatLng;
  members: MappedMember[];
};

/** Resolve coordinates either from backend lat/lng or the hardcoded regionGeo
 * fallback when the backend hasn't seeded coordinates yet (see #657). */
function resolveCoords(member: HeritageMember): LatLng | null {
  if (member.latitude != null && member.longitude != null) {
    return { latitude: member.latitude, longitude: member.longitude };
  }
  if (member.region) {
    return coordsForRegion(member.region);
  }
  return null;
}

/** Three-tier size scale for region pins by member count. */
function markerSizeForCount(count: number): number {
  if (count >= 5) return 56;
  if (count >= 2) return 44;
  return 32;
}

export default function HeritageMapScreen({ route, navigation }: Props) {
  const { heritageGroupId } = route.params;
  const [group, setGroup] = useState<HeritageGroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [expandedRegions, setExpandedRegions] = useState<Record<string, boolean>>({});
  const mapRef = useRef<MapView | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);
  const sectionOffsets = useRef<Record<string, number>>({});
  const insets = useSafeAreaInsets();

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

  /** Members partitioned into mappable (have coords + region) and unmapped. */
  const { mapped, unmapped } = useMemo(() => {
    if (!group) return { mapped: [] as MappedMember[], unmapped: [] as HeritageMember[] };
    const mappedOut: MappedMember[] = [];
    const unmappedOut: HeritageMember[] = [];
    for (const m of group.members) {
      const coords = resolveCoords(m);
      if (!coords || !m.region) {
        unmappedOut.push(m);
      } else {
        mappedOut.push({ ...m, coords });
      }
    }
    return { mapped: mappedOut, unmapped: unmappedOut };
  }, [group]);

  /** Cluster mapped members by region; coord = mean of member coords. */
  const clusters = useMemo<RegionCluster[]>(() => {
    const byRegion = new Map<string, MappedMember[]>();
    for (const m of mapped) {
      const key = m.region as string;
      const arr = byRegion.get(key);
      if (arr) arr.push(m);
      else byRegion.set(key, [m]);
    }
    const result: RegionCluster[] = [];
    for (const [region, members] of byRegion.entries()) {
      const sumLat = members.reduce((acc, p) => acc + p.coords.latitude, 0);
      const sumLng = members.reduce((acc, p) => acc + p.coords.longitude, 0);
      result.push({
        region,
        coords: {
          latitude: sumLat / members.length,
          longitude: sumLng / members.length,
        },
        members,
      });
    }
    // Sort descending by member count, alphabetical tiebreak for determinism.
    result.sort((a, b) => {
      if (b.members.length !== a.members.length) return b.members.length - a.members.length;
      return a.region.localeCompare(b.region);
    });
    return result;
  }, [mapped]);

  const topRegion = clusters[0] ?? null;

  /** Visual base for the fan: mean of all region pin coords. */
  const baseCoord = useMemo<LatLng | null>(() => {
    if (clusters.length === 0) return null;
    const sumLat = clusters.reduce((acc, c) => acc + c.coords.latitude, 0);
    const sumLng = clusters.reduce((acc, c) => acc + c.coords.longitude, 0);
    return {
      latitude: sumLat / clusters.length,
      longitude: sumLng / clusters.length,
    };
  }, [clusters]);

  // Seed expansion state: top region open, others collapsed.
  useEffect(() => {
    if (!topRegion) return;
    setExpandedRegions((prev) => {
      if (Object.prototype.hasOwnProperty.call(prev, topRegion.region)) return prev;
      const next: Record<string, boolean> = {};
      for (const c of clusters) next[c.region] = c.region === topRegion.region;
      return next;
    });
  }, [clusters, topRegion]);

  // Fit all clusters, then animate-center on top region.
  useEffect(() => {
    if (!mapRef.current || clusters.length === 0 || !topRegion) return;
    const coords = clusters.map((c) => c.coords);
    const t = setTimeout(() => {
      if (coords.length === 1) {
        mapRef.current?.animateToRegion(
          {
            latitude: topRegion.coords.latitude,
            longitude: topRegion.coords.longitude,
            latitudeDelta: 4,
            longitudeDelta: 4,
          },
          500,
        );
      } else {
        mapRef.current?.fitToCoordinates(coords, {
          edgePadding: { top: 100, right: 60, bottom: 320, left: 60 },
          animated: true,
        });
        // Nudge center toward the top region after the fit settles.
        setTimeout(() => {
          mapRef.current?.animateCamera(
            { center: topRegion.coords },
            { duration: 450 },
          );
        }, 600);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [clusters, topRegion]);

  const handleMarkerPress = (region: string) => {
    setExpandedRegions((prev) => ({ ...prev, [region]: true }));
    // Defer to next tick so the layout reflects the new expansion before we scroll.
    setTimeout(() => {
      const y = sectionOffsets.current[region];
      if (scrollRef.current && typeof y === 'number') {
        scrollRef.current.scrollTo({ y: Math.max(0, y - 8), animated: true });
      }
    }, 80);
  };

  const handleMemberPress = (member: HeritageMember) => {
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

  if (clusters.length === 0) {
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

  const totalMembers = mapped.length + unmapped.length;
  const sheetBottomInset = Math.max(insets.bottom, 12);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.fill}>
        <MapView
          ref={mapRef}
          style={styles.map}
          accessibilityLabel={`Heritage map for ${group.name}`}
        >
          {baseCoord
            ? clusters.map((cluster) => (
                <Polyline
                  key={`line-${cluster.region}`}
                  coordinates={[baseCoord, cluster.coords]}
                  strokeColor={tokens.colors.surfaceDark}
                  strokeWidth={2}
                />
              ))
            : null}

          {baseCoord ? (
            <Marker
              key="heritage-base"
              coordinate={baseCoord}
              anchor={{ x: 0.5, y: 0.5 }}
              title={group.name}
              description={`${totalMembers} member${totalMembers === 1 ? '' : 's'} across ${clusters.length} region${clusters.length === 1 ? '' : 's'}`}
            >
              <View style={styles.heritageBase}>
                <Text style={styles.heritageBaseGlyph}>🏛</Text>
              </View>
            </Marker>
          ) : null}

          {clusters.map((cluster) => {
            const isTop = topRegion?.region === cluster.region;
            const size = markerSizeForCount(cluster.members.length);
            return (
              <Marker
                key={`region-${cluster.region}`}
                coordinate={cluster.coords}
                onPress={() => handleMarkerPress(cluster.region)}
                title={cluster.region}
                description={`${cluster.members.length} member${cluster.members.length === 1 ? '' : 's'}`}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View
                  style={[
                    styles.regionMarker,
                    {
                      width: size,
                      height: size,
                      borderRadius: size / 2,
                      backgroundColor: isTop
                        ? tokens.colors.accentGreen
                        : tokens.colors.accentMustard,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.regionMarkerCount,
                      { fontSize: size >= 56 ? 20 : size >= 44 ? 16 : 13 },
                    ]}
                  >
                    {cluster.members.length}
                  </Text>
                </View>
              </Marker>
            );
          })}
        </MapView>

        <MapZoomControls mapRef={mapRef} style={styles.zoomControls} />

        <View style={styles.legend} pointerEvents="none">
          <Text style={styles.legendTitle}>{group.name}</Text>
          <Text style={styles.legendBody}>
            {clusters.length} region{clusters.length === 1 ? '' : 's'} · {totalMembers} member
            {totalMembers === 1 ? '' : 's'}
          </Text>
        </View>

        <View style={[styles.sheet, { paddingBottom: sheetBottomInset + 12 }]}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Regions</Text>
          <ScrollView
            ref={scrollRef}
            style={styles.sheetScroll}
            contentContainerStyle={styles.sheetContent}
            showsVerticalScrollIndicator
          >
            {clusters.map((cluster) => {
              const isTop = topRegion?.region === cluster.region;
              const expanded = expandedRegions[cluster.region] ?? isTop;
              return (
                <View
                  key={`sec-${cluster.region}`}
                  style={styles.section}
                  onLayout={(e) => {
                    sectionOffsets.current[cluster.region] = e.nativeEvent.layout.y;
                  }}
                >
                  <Pressable
                    style={({ pressed }) => [styles.sectionHeader, pressed && styles.pressed]}
                    onPress={() =>
                      setExpandedRegions((prev) => ({
                        ...prev,
                        [cluster.region]: !expanded,
                      }))
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`${cluster.region}, ${cluster.members.length} members, ${expanded ? 'collapse' : 'expand'}`}
                  >
                    <View
                      style={[
                        styles.sectionBadge,
                        {
                          backgroundColor: isTop
                            ? tokens.colors.accentGreen
                            : tokens.colors.accentMustard,
                        },
                      ]}
                    >
                      <Text style={styles.sectionBadgeText}>{cluster.members.length}</Text>
                    </View>
                    <View style={styles.sectionTitleWrap}>
                      <Text style={styles.sectionTitle} numberOfLines={1}>
                        {cluster.region}
                      </Text>
                      <Text style={styles.sectionSub}>
                        {cluster.members.length} member{cluster.members.length === 1 ? '' : 's'}
                        {isTop ? ' · Top region' : ''}
                      </Text>
                    </View>
                    <Text style={styles.chevron}>{expanded ? '▾' : '▸'}</Text>
                  </Pressable>

                  {expanded
                    ? cluster.members.map((m) => (
                        <Pressable
                          key={`m-${m.content_type}-${m.id}`}
                          style={({ pressed }) => [styles.memberRow, pressed && styles.pressed]}
                          onPress={() => handleMemberPress(m)}
                          accessibilityRole="button"
                          accessibilityLabel={`Open ${m.title}`}
                        >
                          <Text style={styles.memberTitle} numberOfLines={2}>
                            {m.title}
                          </Text>
                          <View style={styles.chip}>
                            <Text style={styles.chipText}>
                              {m.content_type === 'recipe' ? 'RECIPE' : 'STORY'}
                            </Text>
                          </View>
                        </Pressable>
                      ))
                    : null}
                </View>
              );
            })}

            {unmapped.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionBadge, styles.sectionBadgeMuted]}>
                    <Text style={styles.sectionBadgeText}>{unmapped.length}</Text>
                  </View>
                  <View style={styles.sectionTitleWrap}>
                    <Text style={styles.sectionTitle}>Unmapped</Text>
                    <Text style={styles.sectionSub}>No region or coordinates</Text>
                  </View>
                </View>
                {unmapped.map((m) => (
                  <Pressable
                    key={`u-${m.content_type}-${m.id}`}
                    style={({ pressed }) => [styles.memberRow, pressed && styles.pressed]}
                    onPress={() => handleMemberPress(m)}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${m.title}`}
                  >
                    <Text style={styles.memberTitle} numberOfLines={2}>
                      {m.title}
                    </Text>
                    <View style={styles.chip}>
                      <Text style={styles.chipText}>
                        {m.content_type === 'recipe' ? 'RECIPE' : 'STORY'}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </ScrollView>
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
  regionMarker: {
    borderWidth: 3,
    borderColor: tokens.colors.surfaceDark,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  regionMarkerCount: {
    fontWeight: '900',
    color: tokens.colors.surfaceDark,
  },
  heritageBase: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: tokens.colors.bg,
    borderWidth: 3,
    borderColor: tokens.colors.surfaceDark,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  heritageBaseGlyph: { fontSize: 20 },
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
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: tokens.colors.bg,
    borderTopLeftRadius: tokens.radius.xl,
    borderTopRightRadius: tokens.radius.xl,
    borderTopWidth: 1.5,
    borderColor: tokens.colors.surfaceDark,
    paddingTop: 8,
    paddingHorizontal: 16,
    maxHeight: '55%',
    minHeight: 220,
    ...shadows.lg,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: tokens.colors.surfaceDark,
    marginBottom: 10,
    opacity: 0.5,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: tokens.colors.text,
    fontFamily: tokens.typography.display.fontFamily,
    marginBottom: 8,
  },
  sheetScroll: { flex: 1 },
  sheetContent: { paddingBottom: 12, gap: 12 },
  section: { gap: 8 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  sectionBadge: {
    minWidth: 32,
    height: 32,
    paddingHorizontal: 8,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: tokens.colors.surfaceDark,
  },
  sectionBadgeMuted: {
    backgroundColor: tokens.colors.bg,
  },
  sectionBadgeText: {
    fontSize: 13,
    fontWeight: '900',
    color: tokens.colors.surfaceDark,
  },
  sectionTitleWrap: { flex: 1 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: tokens.colors.text,
    fontFamily: tokens.typography.display.fontFamily,
  },
  sectionSub: { fontSize: 11, color: tokens.colors.textMuted, fontWeight: '700' },
  chevron: { fontSize: 16, color: tokens.colors.textMuted, paddingHorizontal: 6 },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: tokens.radius.lg,
    borderWidth: 1.5,
    borderColor: tokens.colors.surfaceDark,
    backgroundColor: tokens.colors.bg,
  },
  memberTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: tokens.colors.text,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.accentMustard,
    borderWidth: 1,
    borderColor: tokens.colors.surfaceDark,
  },
  chipText: {
    fontSize: 10,
    fontWeight: '900',
    color: tokens.colors.surfaceDark,
    letterSpacing: 1,
  },
  pressed: { opacity: 0.85 },
});
