import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { tokens } from '../../theme';

export type ChipState = 'off' | 'include' | 'exclude';

type Props = {
  label: string;
  options: string[];
  include: string[];
  exclude: string[];
  onChange: (next: { include: string[]; exclude: string[] }) => void;
  loading?: boolean;
};

function nextState(current: ChipState): ChipState {
  return current === 'off' ? 'include' : current === 'include' ? 'exclude' : 'off';
}

function stateOf(name: string, include: string[], exclude: string[]): ChipState {
  if (include.includes(name)) return 'include';
  if (exclude.includes(name)) return 'exclude';
  return 'off';
}

export function FilterChipRail({ label, options, include, exclude, onChange, loading }: Props) {
  const handleToggle = (name: string) => {
    const cur = stateOf(name, include, exclude);
    const next = nextState(cur);
    const inc = include.filter((v) => v !== name);
    const exc = exclude.filter((v) => v !== name);
    if (next === 'include') inc.push(name);
    if (next === 'exclude') exc.push(name);
    onChange({ include: inc, exclude: exc });
  };

  return (
    <View style={styles.section}>
      <Text style={styles.label}>{label}</Text>
      {loading ? (
        <Text style={styles.hint}>Loading…</Text>
      ) : options.length === 0 ? (
        <Text style={styles.hint}>No tags available.</Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.rail}
          accessibilityRole="tablist"
        >
          {options.map((name) => {
            const state = stateOf(name, include, exclude);
            return (
              <Pressable
                key={name}
                onPress={() => handleToggle(name)}
                accessibilityRole="button"
                accessibilityLabel={`${name} filter, ${state}`}
                accessibilityState={{ selected: state !== 'off' }}
                style={({ pressed }) => [
                  styles.chip,
                  state === 'include' && styles.chipInclude,
                  state === 'exclude' && styles.chipExclude,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    state === 'include' && styles.chipTextInclude,
                    state === 'exclude' && styles.chipTextExclude,
                  ]}
                >
                  {state === 'exclude' ? `− ${name}` : state === 'include' ? `+ ${name}` : name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 6 },
  label: { fontSize: 13, fontWeight: '900', color: tokens.colors.surfaceDark, letterSpacing: 0.4 },
  hint: { fontSize: 12, color: tokens.colors.textMuted, fontStyle: 'italic' },
  rail: { gap: 8, paddingVertical: 4 },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: tokens.radius.pill,
    borderWidth: 1.5,
    borderColor: '#000000',
    backgroundColor: tokens.colors.accentMustard,
  },
  chipInclude: {
    backgroundColor: tokens.colors.accentGreen,
  },
  chipExclude: {
    backgroundColor: '#B33A3A',
  },
  chipText: { fontSize: 13, fontWeight: '800', color: '#000000' },
  chipTextInclude: { color: '#FAF7EF' },
  chipTextExclude: { color: '#FAF7EF', textDecorationLine: 'line-through' },
});
