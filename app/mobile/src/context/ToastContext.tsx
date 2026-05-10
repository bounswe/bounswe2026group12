import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { shadows, tokens } from '../theme';

/** Matches web `Toast.jsx` (`success` | `error`). */
export type ToastType = 'success' | 'error';

type ToastState = { message: string; type: ToastType } | null;

type ToastContextValue = {
  showToast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

/** Same duration as web `RecipeCreatePage` / `RecipeEditPage` (`setTimeout` 3000). */
const DISMISS_MS = 3000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'success') => {
      clearTimer();
      setToast({ message, type });
      timeoutRef.current = setTimeout(() => {
        setToast(null);
        timeoutRef.current = null;
      }, DISMISS_MS);
    },
    [clearTimer],
  );

  useEffect(() => () => clearTimer(), [clearTimer]);

  const dismiss = useCallback(() => {
    clearTimer();
    setToast(null);
  }, [clearTimer]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastOverlay toast={toast} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

function ToastOverlay({
  toast,
  onDismiss,
}: {
  toast: ToastState;
  onDismiss: () => void;
}) {
  const insets = useSafeAreaInsets();
  const slide = useRef(new Animated.Value(40)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!toast) return;
    slide.setValue(40);
    opacity.setValue(0);
    Animated.parallel([
      Animated.timing(slide, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [toast, opacity, slide]);

  if (!toast) return null;

  const backgroundColor =
    toast.type === 'success' ? tokens.colors.success : tokens.colors.error;

  return (
    <View
      style={[styles.root, { paddingBottom: Math.max(insets.bottom, 8) + 16 }]}
      pointerEvents="box-none"
    >
      <Animated.View
        style={{
          transform: [{ translateY: slide }],
          opacity,
        }}
      >
        <Pressable
          onPress={onDismiss}
          accessibilityRole="alert"
          accessibilityLabel={toast.message}
          style={[styles.banner, { backgroundColor }]}
        >
          <Text style={styles.text}>{toast.message}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    zIndex: 1000,
  },
  banner: {
    maxWidth: '92%',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: tokens.radius.pill,
    borderWidth: 2,
    borderColor: tokens.colors.surfaceDark,
    ...shadows.md,
  },
  text: {
    color: tokens.colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
});
