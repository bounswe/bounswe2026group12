import React from 'react';
import { Text } from 'react-native';
import { recipeFormStyles } from './recipeFormStyles';

export function InlineFieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <Text style={recipeFormStyles.errorText}>{message}</Text>;
}
