import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Text as RNText } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const TextWithDefaults = RNText as unknown as { defaultProps?: { style?: unknown } };
TextWithDefaults.defaultProps = TextWithDefaults.defaultProps ?? {};
TextWithDefaults.defaultProps.style = [
  TextWithDefaults.defaultProps.style,
  {
    textShadowColor: '#1A1A1A',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 0.6,
  },
];
import {
  Fraunces_700Bold,
  Fraunces_900Black,
} from '@expo-google-fonts/fraunces';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
} from '@expo-google-fonts/dm-sans';
import { AuthProvider } from './src/context/AuthContext';
import { ToastProvider } from './src/context/ToastContext';
import { RootTabsNavigator } from './src/navigation/RootTabsNavigator';
import { ThemeProvider } from './src/theme';

export default function App() {
  const [fontsLoaded] = useFonts({
    Fraunces_700Bold,
    Fraunces_900Black,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
  });

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <NavigationContainer>
              <StatusBar style="auto" />
              <RootTabsNavigator />
            </NavigationContainer>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
