import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { tokens } from '../../theme';

type Props = {
  message?: string;
};

export function LoadingView({ message = 'Loading…' }: Props) {
  return (
    <View style={styles.container} accessibilityRole="progressbar" accessibilityLabel={message}>
      <ActivityIndicator size="small" color={tokens.colors.surfaceDark} accessibilityLabel="Loading" />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: {
    fontSize: 14,
    color: tokens.colors.textMuted,
  },
});
