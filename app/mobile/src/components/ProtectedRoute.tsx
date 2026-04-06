import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

/**
 * Mirrors web `ProtectedRoute.jsx`: unauthenticated users are sent to Login (replace, like `Navigate replace`).
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { token, isReady } = useAuth();
  const navigation = useNavigation<Navigation>();

  useEffect(() => {
    if (!isReady) return;
    if (!token) {
      navigation.replace('Login');
    }
  }, [isReady, token, navigation]);

  if (!isReady) {
    return (
      <View style={styles.centered} accessibilityLabel="Loading session">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!token) {
    return <View style={styles.centered} />;
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
