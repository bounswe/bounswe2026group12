import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Marker } from 'react-native-maps';
import { tokens } from '../../theme';
import type { RegionPin } from '../../services/mapDataService';

/** Three-tier size scale for region pins by recipe count. */
export function markerSizeForRecipeCount(count: number): number {
  if (count >= 6) return 42;
  if (count >= 2) return 32;
  return 24;
}

/** Just the colored circle with the count number inside.
 *
 * Wrapped with `renderToHardwareTextureAndroid` + `needsOffscreenAlphaCompositing`
 * so Android keeps the rounded corners when it snapshots the custom marker view
 * into its bitmap. Without this, borderRadius gets dropped and the marker shows
 * up as a square (same fix as #769 on the heritage map). */
function RegionDot({
  size,
  isFocused,
  count,
}: {
  size: number;
  isFocused: boolean;
  count: number;
}) {
  const fontSize = size >= 42 ? 14 : size >= 32 ? 12 : 10;
  return (
    <View
      collapsable={false}
      renderToHardwareTextureAndroid
      needsOffscreenAlphaCompositing
      style={[styles.outer, { width: size + 8, height: size + 8 }]}
    >
      <View
        style={[
          styles.dot,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: isFocused
              ? tokens.colors.accentGreen
              : tokens.colors.accentMustard,
          },
        ]}
      >
        <Text
          allowFontScaling={false}
          style={[styles.count, { fontSize, color: tokens.colors.surfaceDark }]}
        >
          {count}
        </Text>
      </View>
    </View>
  );
}

/** Region marker for the discovery map.
 *
 * Uses the dual `tracksViewChanges` trick (start true so the layout is
 * captured into the marker bitmap, flip to false after 800ms so Android stops
 * re-snapshotting and reintroducing the square-clipping bug on subsequent
 * renders). Each marker owns its own tracking state so they don't all redraw
 * together. */
export function RegionDotMarker({
  pin,
  isFocused,
  onPress,
}: {
  pin: RegionPin;
  isFocused: boolean;
  onPress: () => void;
}) {
  const [tracks, setTracks] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setTracks(false), 800);
    return () => clearTimeout(t);
  }, []);

  const size = markerSizeForRecipeCount(pin.recipeCount);

  return (
    <Marker
      coordinate={pin.coords}
      onPress={(e) => {
        e.stopPropagation?.();
        onPress();
      }}
      title={pin.name}
      description={`${pin.recipeCount} ${pin.recipeCount === 1 ? 'recipe' : 'recipes'}`}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={tracks}
      accessibilityLabel={`${pin.name}, ${pin.recipeCount} ${
        pin.recipeCount === 1 ? 'recipe' : 'recipes'
      }`}
    >
      <RegionDot size={size} isFocused={isFocused} count={pin.recipeCount} />
    </Marker>
  );
}

const styles = StyleSheet.create({
  outer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  dot: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: tokens.colors.surfaceDark,
  },
  count: {
    fontWeight: '800',
  },
});
