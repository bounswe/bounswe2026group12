import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import { PublicStackNavigator } from './src/navigation/PublicStackNavigator';

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar style="auto" />
        <PublicStackNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
