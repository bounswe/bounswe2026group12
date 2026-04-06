import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { PublicStackNavigator } from './src/navigation/PublicStackNavigator';

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <PublicStackNavigator />
    </NavigationContainer>
  );
}
