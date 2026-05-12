import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MapZoomControls } from '../map/MapZoomControls';
import {
  coordsForRegion,
  INITIAL_MAP_REGION,
  regionFromPinCoordinates,
  type LatLng,
} from '../../utils/regionGeo';
import {
  ENGAGEMENT_LABELS,
  colorForLevel,
  engagementLevel,
  type EngagementLevel,
} from '../../utils/engagementLevel';
import { shadows, tokens } from '../../theme';
import type { Stamp } from './StampCollection';
import type { RootStackParamList } from '../../navigation/types';

/**
 * Local mirror of the passport `CultureSummary` shape. PR #784 is still open
 * at the time of writing, so we don't import from
 * `services/passportCultureService` to keep this component a self-contained,
 * drop-in module that the follow-up wire-up can plug straight into the Map tab
 * on `PassportScreen`. Keys mirror the service-layer normalization (and stay
 * tolerant of the raw backend keys — see `engagementLevel`).
 */
export type CultureSummary = {
  culture_name: string;
  stamp_rarity: 'bronze' | 'silver' | 'gold' | 'emerald' | 'legendary' | string;
  recipes_tried: number;
  stories_saved: number;
  ingredients_discovered: number;
  heritage_recipes: number;
};

type Props = {
  cultures: CultureSummary[];
  /** Optional — used to resolve `source_recipe` / `source_story` per culture for pin callouts. */
  stamps?: Stamp[];
  /** Optional override — defaults to a 360pt frame inside the Map tab. */
  height?: number;
};

export type PassportMapPin = {
  culture: CultureSummary;
  coords: LatLng;
  level: Exclude<EngagementLevel, 0>;
  recipeId: string | null;
  storyId: string | null;
};

const MAP_HEIGHT = 360;

type Nav = NativeStackNavigationProp<RootStackParamList>;

function cultureKey(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Pick the latest stamp-backed recipe and story ids for a culture (names
 * match `Stamp.name`, which aliases API `culture`).
 */
export function recipeAndStoryIdsForCulture(
  stamps: Stamp[] | undefined,
  cultureName: string,
): { recipeId: string | null; storyId: string | null } {
  if (!stamps?.length) return { recipeId: null, storyId: null };
  const key = cultureKey(cultureName);
  const rows = stamps
    .filter((s) => cultureKey(s.name) === key)
    .sort((a, b) => {
      const ta = new Date(a.earned_at || 0).getTime();
      const tb = new Date(b.earned_at || 0).getTime();
      return tb - ta;
    });
  let recipeId: string | null = null;
  let storyId: string | null = null;
  for (const s of rows) {
    if (!recipeId && s.source_recipe != null) recipeId = String(s.source_recipe);
    if (!storyId && s.source_story != null) storyId = String(s.source_story);
    if (recipeId && storyId) break;
  }
  return { recipeId, storyId };
}

function pinKey(pin: PassportMapPin): string {
  return cultureKey(pin.culture.culture_name);
}

/**
 * Embedded world map for the cultural passport. Native map callouts are
 * unreliable on Android (especially with default pins inside scroll layouts),
 * so pin taps open an in-app **selection card** with normal React `Pressable`
 * buttons to open linked recipe/story. Parent `ScrollView` should disable
 * scroll on the Map tab (`UserProfileScreen`).
 */
export function PassportWorldMap({ cultures, stamps, height = MAP_HEIGHT }: Props) {
  const mapRef = useRef<MapView | null>(null);
  const navigation = useNavigation<Nav>();
  const [selected, setSelected] = useState<PassportMapPin | null>(null);

  const { pins, unmappedCultureNames } = useMemo(() => {
    const out: PassportMapPin[] = [];
    const unmapped: string[] = [];
    for (const culture of cultures ?? []) {
      const level = engagementLevel(culture);
      if (level === 0) continue;
      const coords = coordsForRegion(culture.culture_name);
      if (!coords) {
        unmapped.push(culture.culture_name);
        continue;
      }
      const { recipeId, storyId } = recipeAndStoryIdsForCulture(stamps, culture.culture_name);
      out.push({ culture, coords, level, recipeId, storyId });
    }
    return { pins: out, unmappedCultureNames: unmapped };
  }, [cultures, stamps]);

  useEffect(() => {
    if (!selected) return;
    const still = pins.some((p) => pinKey(p) === pinKey(selected));
    if (!still) setSelected(null);
  }, [pins, selected]);

  const initialRegion = useMemo(
    () =>
      pins.length > 0
        ? regionFromPinCoordinates(pins.map((p) => p.coords))
        : INITIAL_MAP_REGION,
    [pins],
  );

  useLayoutEffect(() => {
    const map = mapRef.current;
    if (!map || pins.length === 0) return;
    const id = requestAnimationFrame(() => {
      try {
        if (pins.length === 1) {
          map.animateToRegion?.(
            {
              latitude: pins[0].coords.latitude,
              longitude: pins[0].coords.longitude,
              latitudeDelta: 9,
              longitudeDelta: 11,
            },
            0,
          );
        } else {
          map.fitToCoordinates?.(pins.map((p) => p.coords), {
            edgePadding: { top: 52, right: 40, bottom: 48, left: 40 },
            animated: false,
          });
        }
      } catch {
        /* map not ready in some environments */
      }
    });
    return () => cancelAnimationFrame(id);
  }, [pins]);

  const unmappedPreview =
    unmappedCultureNames.length <= 8
      ? unmappedCultureNames.join(' · ')
      : `${unmappedCultureNames.slice(0, 8).join(' · ')} · +${
          unmappedCultureNames.length - 8
        } more`;

  const color = selected
    ? colorForLevel(selected.level) ?? tokens.colors.accentGreen
    : tokens.colors.text;

  return (
    <View style={styles.column}>
      <View style={[styles.wrap, { height }]} accessibilityLabel="Cultural passport world map">
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={initialRegion}
          accessibilityLabel="World map of passport cultures"
        >
          {pins.map((pin) => {
            const pinColor = colorForLevel(pin.level) ?? tokens.colors.accentGreen;
            return (
              <Marker
                key={`pin-${pin.culture.culture_name}`}
                coordinate={pin.coords}
                pinColor={pinColor}
                tracksViewChanges={false}
                testID={`passport-pin-${pin.culture.culture_name}`}
                onPress={() => {
                  setSelected((cur) => (cur && pinKey(cur) === pinKey(pin) ? null : pin));
                }}
              />
            );
          })}
        </MapView>

        <MapZoomControls mapRef={mapRef} style={styles.zoomControls} />

        {pins.length === 0 ? (
          <View style={styles.emptyBanner} pointerEvents="none">
            <Text style={styles.emptyText}>
              No cultures with map coordinates yet. Try a recipe or save a story to start your
              passport.
            </Text>
          </View>
        ) : null}

        {selected ? (
          <View
            style={styles.selectionWrap}
            pointerEvents="box-none"
            accessibilityViewIsModal
            accessibilityLabel="Selected culture details"
          >
            <Pressable
              style={styles.selectionBackdrop}
              accessibilityLabel="Dismiss culture details"
              onPress={() => setSelected(null)}
            />
            <View
              style={styles.selectionCard}
              testID="passport-map-selection-card"
              onStartShouldSetResponder={() => true}
            >
              <View style={styles.selectionHeader}>
                <Text style={styles.selectionTitle} numberOfLines={2}>
                  {selected.culture.culture_name}
                </Text>
                <Pressable
                  onPress={() => setSelected(null)}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  style={({ pressed }) => [styles.closeBtn, pressed && styles.closeBtnPressed]}
                >
                  <Text style={styles.closeBtnText}>✕</Text>
                </Pressable>
              </View>
              <Text style={styles.selectionMeta}>
                Recipes tried: <Text style={styles.selectionMetaStrong}>{selected.culture.recipes_tried}</Text>
                {' · '}
                Stories saved:{' '}
                <Text style={styles.selectionMetaStrong}>{selected.culture.stories_saved}</Text>
              </Text>
              <Text style={[styles.selectionTier, { color }]}>{ENGAGEMENT_LABELS[selected.level]}</Text>

              {selected.recipeId || selected.storyId ? (
                <View style={styles.actionRow}>
                  {selected.recipeId ? (
                    <Pressable
                      onPress={() => {
                        navigation.navigate('RecipeDetail', { id: selected.recipeId! });
                        setSelected(null);
                      }}
                      style={({ pressed }) => [styles.actionRecipe, pressed && styles.actionPressed]}
                      accessibilityRole="button"
                      accessibilityLabel="Open linked recipe"
                    >
                      <Text style={styles.actionText}>Open recipe →</Text>
                    </Pressable>
                  ) : null}
                  {selected.storyId ? (
                    <Pressable
                      onPress={() => {
                        navigation.navigate('StoryDetail', { id: selected.storyId! });
                        setSelected(null);
                      }}
                      style={({ pressed }) => [styles.actionStory, pressed && styles.actionPressed]}
                      accessibilityRole="button"
                      accessibilityLabel="Open linked story"
                    >
                      <Text style={styles.actionText}>Open story →</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : (
                <Text style={styles.selectionMuted}>
                  No stamp linked to a recipe or story yet for this culture.
                </Text>
              )}
            </View>
          </View>
        ) : null}
      </View>

      {unmappedCultureNames.length > 0 ? (
        <View style={styles.unmappedStrip} accessibilityLabel="Cultures without map coordinates">
          <Text style={styles.unmappedTitle}>Not on map (no coordinates)</Text>
          <Text style={styles.unmappedList}>{unmappedPreview}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default PassportWorldMap;

const styles = StyleSheet.create({
  column: {
    width: '100%',
    gap: 10,
  },
  wrap: {
    width: '100%',
    borderRadius: tokens.radius.lg,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: tokens.colors.surfaceDark,
    backgroundColor: tokens.colors.bg,
    ...shadows.md,
  },
  map: { flex: 1, borderRadius: tokens.radius.lg, overflow: 'hidden' },
  zoomControls: { top: 12, right: 12, zIndex: 2 },
  emptyBanner: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    padding: 12,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.bg,
    borderWidth: 1.5,
    borderColor: tokens.colors.surfaceDark,
    ...shadows.md,
    zIndex: 1,
  },
  emptyText: {
    fontSize: 12,
    color: tokens.colors.text,
    fontWeight: '700',
  },
  selectionWrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 4,
    justifyContent: 'flex-end',
  },
  selectionBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  selectionCard: {
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 14,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.surface,
    borderWidth: 1.5,
    borderColor: tokens.colors.surfaceDark,
    gap: 8,
    ...shadows.lg,
  },
  selectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  selectionTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: tokens.colors.text,
    fontFamily: tokens.typography.display.fontFamily,
  },
  closeBtn: {
    padding: 4,
    borderRadius: tokens.radius.md,
  },
  closeBtnPressed: { opacity: 0.6 },
  closeBtnText: {
    fontSize: 18,
    fontWeight: '800',
    color: tokens.colors.textMuted,
  },
  selectionMeta: {
    fontSize: 13,
    color: tokens.colors.textMuted,
    fontWeight: '600',
  },
  selectionMetaStrong: {
    color: tokens.colors.text,
    fontWeight: '800',
  },
  selectionTier: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  actionRecipe: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.accentMustard,
    borderWidth: 1,
    borderColor: tokens.colors.surfaceDark,
  },
  actionStory: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.accentGreen,
    borderWidth: 1,
    borderColor: tokens.colors.surfaceDark,
  },
  actionPressed: { opacity: 0.85 },
  actionText: {
    fontSize: 14,
    fontWeight: '800',
    color: tokens.colors.text,
  },
  selectionMuted: {
    fontSize: 13,
    color: tokens.colors.textMuted,
    fontStyle: 'italic',
    marginTop: 4,
  },
  unmappedStrip: {
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: tokens.radius.lg,
    borderWidth: 1.5,
    borderColor: tokens.colors.surfaceDark,
    backgroundColor: tokens.colors.surface,
    gap: 4,
    ...shadows.sm,
  },
  unmappedTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: tokens.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  unmappedList: {
    fontSize: 13,
    fontWeight: '600',
    color: tokens.colors.text,
  },
});
