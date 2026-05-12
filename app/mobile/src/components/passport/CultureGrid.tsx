import React from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { RootStackParamList } from '../../navigation/types';
import type { CultureSummary } from '../../services/passportCultureService';
import { shadows, tokens } from '../../theme';

type Props = {
  cultures: CultureSummary[];
  username: string;
};

/** Stamp rarity → swatch colour. Sourced from issue #602. */
export const RARITY_COLORS: Record<string, string> = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
  emerald: '#50C878',
  legendary: '#9B59B6',
};

function rarityColor(rarity: string): string {
  return RARITY_COLORS[rarity?.toLowerCase?.()] ?? RARITY_COLORS.bronze;
}

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function CultureGrid({ cultures, username }: Props) {
  const navigation = useNavigation<Nav>();

  if (!cultures || cultures.length === 0) {
    return (
      <View style={styles.empty} accessibilityRole="text">
        <Text style={styles.emptyText}>
          No cultures discovered yet. Try recipes from new regions to unlock cultures.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={cultures}
      keyExtractor={(c) => c.culture_name}
      numColumns={2}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.list}
      scrollEnabled={false}
      renderItem={({ item }) => (
        <Pressable
          onPress={() =>
            navigation.navigate('CultureDetail', {
              username,
              cultureName: item.culture_name,
            })
          }
          style={({ pressed }) => [styles.cell, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={`Open culture ${item.culture_name}`}
        >
          <View style={styles.cellHeader}>
            <View
              style={[
                styles.badge,
                { backgroundColor: rarityColor(item.stamp_rarity) },
              ]}
              accessibilityLabel={`${item.stamp_rarity} stamp`}
            />
            <Text style={styles.rarityLabel} numberOfLines={1}>
              {item.stamp_rarity}
            </Text>
          </View>
          <Text style={styles.cellTitle} numberOfLines={2}>
            {item.culture_name}
          </Text>
          <Text style={styles.cellMeta} numberOfLines={1}>
            {item.recipes_tried} {item.recipes_tried === 1 ? 'recipe' : 'recipes'}
          </Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  row: { gap: 12, marginBottom: 12 },
  cell: {
    flex: 1,
    padding: 12,
    borderRadius: tokens.radius.lg,
    borderWidth: 2,
    borderColor: tokens.colors.surfaceDark,
    backgroundColor: tokens.colors.bg,
    gap: 8,
    minHeight: 110,
    ...shadows.sm,
  },
  pressed: { opacity: 0.85 },
  cellHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: tokens.colors.surfaceDark,
  },
  rarityLabel: {
    fontSize: 11,
    color: tokens.colors.textMuted,
    textTransform: 'capitalize',
  },
  cellTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: tokens.colors.text,
    fontFamily: tokens.typography.display.fontFamily,
  },
  cellMeta: { fontSize: 12, color: tokens.colors.text },
  empty: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: tokens.colors.text,
    textAlign: 'center',
  },
});
