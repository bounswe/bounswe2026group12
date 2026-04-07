import type { ViewStyle } from 'react-native';

export const shadows = {
  sm: {
    shadowColor: 'rgba(44, 16, 8, 1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  } satisfies ViewStyle,
  md: {
    shadowColor: 'rgba(44, 16, 8, 1)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  } satisfies ViewStyle,
  lg: {
    shadowColor: 'rgba(44, 16, 8, 1)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 40,
    elevation: 8,
  } satisfies ViewStyle,
} as const;

