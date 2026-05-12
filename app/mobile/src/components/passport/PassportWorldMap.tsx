import React, { useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Callout, Marker } from 'react-native-maps';
import { MapZoomControls } from '../map/MapZoomControls';
import { coordsForRegion, INITIAL_MAP_REGION, type LatLng } from '../../utils/regionGeo';
import {
  ENGAGEMENT_LABELS,
  colorForLevel,
  engagementLevel,
  type EngagementLevel,
} from '../../utils/engagementLevel';
import { shadows, tokens } from '../../theme';

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
  /** Optional override — defaults to a 360pt frame inside the Map tab. */
  height?: number;
};

type Pin = {
  culture: CultureSummary;
  coords: LatLng;
  level: Exclude<EngagementLevel, 0>;
};

const MAP_HEIGHT = 360;

/**
 * Embedded world map for the cultural passport. Renders one pin per culture
 * the user has any engagement with, coloured by the `engagementLevel` ladder
 * (silver → bronze → emerald → legendary purple). Cultures without a known
 * region centroid in `regionGeo` are silently skipped — the parent screen
 * can surface a side-list for those if the design needs it later.
 *
 * Markers use native `pinColor` (default platform teardrop) following the
 * pattern locked in by #769 — custom `borderRadius` views snapshotted as
 * squares on Android, so we don't try to draw bespoke circles here. Legendary
 * pins still get a star glyph inside their Callout to call them out.
 */
export function PassportWorldMap({ cultures, height = MAP_HEIGHT }: Props) {
  const mapRef = useRef<MapView | null>(null);

  const pins = useMemo<Pin[]>(() => {
    const out: Pin[] = [];
    for (const culture of cultures ?? []) {
      const level = engagementLevel(culture);
      if (level === 0) continue;
      const coords = coordsForRegion(culture.culture_name);
      if (!coords) continue;
      out.push({ culture, coords, level });
    }
    return out;
  }, [cultures]);

  return (
    <View style={[styles.wrap, { height }]} accessibilityLabel="Cultural passport world map">
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={INITIAL_MAP_REGION}
        accessibilityLabel="World map of passport cultures"
      >
        {pins.map((pin) => (
          <PassportPin key={`pin-${pin.culture.culture_name}`} pin={pin} />
        ))}
      </MapView>

      <MapZoomControls mapRef={mapRef} style={styles.zoomControls} />

      {pins.length === 0 ? (
        <View style={styles.emptyBanner} pointerEvents="none">
          <Text style={styles.emptyText}>
            No cultures with map coordinates yet. Try a recipe or save a story to start your passport.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function PassportPin({ pin }: { pin: Pin }) {
  const color = colorForLevel(pin.level) ?? tokens.colors.accentGreen;
  const isLegendary = pin.level === 4;
  return (
    <Marker
      coordinate={pin.coords}
      pinColor={color}
      title={pin.culture.culture_name}
      description={ENGAGEMENT_LABELS[pin.level]}
      testID={`passport-pin-${pin.culture.culture_name}`}
    >
      <Callout tooltip={false}>
        <View style={styles.callout}>
          <Text style={styles.calloutTitle}>
            {isLegendary ? '★ ' : ''}
            {pin.culture.culture_name}
          </Text>
          <Text style={styles.calloutLine}>
            Recipes tried: <Text style={styles.calloutValue}>{pin.culture.recipes_tried}</Text>
          </Text>
          <Text style={styles.calloutLine}>
            Stories saved: <Text style={styles.calloutValue}>{pin.culture.stories_saved}</Text>
          </Text>
          <Text style={[styles.calloutTier, { color }]}>{ENGAGEMENT_LABELS[pin.level]}</Text>
        </View>
      </Callout>
    </Marker>
  );
}

export default PassportWorldMap;

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    borderRadius: tokens.radius.lg,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: tokens.colors.surfaceDark,
    backgroundColor: tokens.colors.bg,
    ...shadows.md,
  },
  map: { flex: 1 },
  zoomControls: { top: 12, right: 12 },
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
  },
  emptyText: {
    fontSize: 12,
    color: tokens.colors.text,
    fontWeight: '700',
  },
  callout: {
    minWidth: 160,
    paddingVertical: 6,
    paddingHorizontal: 8,
    gap: 4,
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: tokens.colors.text,
    fontFamily: tokens.typography.display.fontFamily,
  },
  calloutLine: {
    fontSize: 12,
    color: tokens.colors.textMuted,
    fontWeight: '600',
  },
  calloutValue: {
    color: tokens.colors.text,
    fontWeight: '800',
  },
  calloutTier: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 2,
  },
});
