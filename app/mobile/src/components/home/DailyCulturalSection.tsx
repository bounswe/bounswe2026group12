import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { shadows, tokens } from '../../theme';
import type { DailyCulturalCard, DailyCulturalKind } from '../../mocks/dailyCultural';
import type { RootStackParamList } from '../../navigation/types';

const KIND_LABEL: Record<DailyCulturalKind, string> = {
  tradition: 'Tradition',
  dish: 'Dish of the Day',
  story: 'Story',
  fact: 'Did you know',
  holiday: 'Holiday',
};

type Props = { items: DailyCulturalCard[] };

export function DailyCulturalSection({ items }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  if (!items || items.length === 0) return null;

  const onCardPress = (card: DailyCulturalCard) => {
    if (!card.link) return;
    if (card.link.kind === 'recipe') {
      navigation.navigate('RecipeDetail', { id: String(card.link.id) });
    } else if (card.link.kind === 'story') {
      navigation.navigate('StoryDetail', { id: String(card.link.id) });
    }
  };

  return (
    <View style={styles.section} accessibilityLabel="Today's cultural content">
      <View style={styles.header}>
        <View style={styles.todayBadge}>
          <Text style={styles.todayText}>TODAY</Text>
        </View>
        <Text style={styles.heading}>From the kitchens</Text>
      </View>
      <FlatList
        data={items}
        horizontal
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const linkLabel =
            item.link?.kind === 'recipe'
              ? 'View recipe →'
              : item.link?.kind === 'story'
                ? 'Read story →'
                : null;
          return (
            <Pressable
              onPress={() => onCardPress(item)}
              disabled={!item.link}
              style={({ pressed }) => [styles.card, pressed && item.link ? styles.cardPressed : null]}
              accessibilityRole={item.link ? 'button' : 'summary'}
              accessibilityLabel={
                item.link ? `${item.title} — ${linkLabel}` : item.title
              }
            >
              <View style={styles.kindRow}>
                <Text style={styles.kindLabel}>{KIND_LABEL[item.kind]}</Text>
                {item.region ? <Text style={styles.region}>{item.region}</Text> : null}
              </View>
              <Text style={styles.title} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.body} numberOfLines={4}>
                {item.body}
              </Text>
              {linkLabel ? (
                <View style={styles.linkPill}>
                  <Text style={styles.linkPillText}>{linkLabel}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 6,
    marginBottom: 18,
    paddingTop: 14,
    paddingBottom: 14,
    paddingLeft: 4,
    borderRadius: tokens.radius.xl,
    backgroundColor: tokens.colors.primarySubtle,
    borderWidth: 1.5,
    borderColor: tokens.colors.primaryBorder,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  todayBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: tokens.colors.accentGreen,
    borderRadius: tokens.radius.pill,
  },
  todayText: {
    color: tokens.colors.text,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  heading: {
    fontSize: 18,
    fontWeight: '800',
    color: tokens.colors.text,
    fontFamily: tokens.typography.display.fontFamily,
  },
  list: { gap: 12, paddingRight: 16, paddingLeft: 12 },
  card: {
    width: 280,
    padding: 14,
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.primaryBorder,
    ...shadows.lg,
  },
  kindRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  kindLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: tokens.colors.text,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  region: { fontSize: 11, color: tokens.colors.textMuted, fontWeight: '700' },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: tokens.colors.text,
    marginBottom: 6,
    fontFamily: tokens.typography.display.fontFamily,
  },
  body: { fontSize: 13, color: tokens.colors.text, lineHeight: 19 },
  cardPressed: { opacity: 0.85 },
  linkPill: {
    alignSelf: 'flex-start',
    marginTop: 12,
    backgroundColor: tokens.colors.primarySubtle,
    borderWidth: 1.5,
    borderColor: tokens.colors.primaryBorder,
    borderRadius: tokens.radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  linkPillText: { fontSize: 12, color: tokens.colors.text, fontWeight: '800' },
});
