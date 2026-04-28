import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { BoardScreen } from '../screens/BoardScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { GatewayScreen } from '../screens/GatewayScreen';
import { SiteScreen } from '../screens/SiteScreen';

const Tab = createBottomTabNavigator();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    primary: colors.primary,
  },
};

export function RootNavigation() {
  return (
    <NavigationContainer theme={navTheme}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
        }}
      >
        <Tab.Screen name='Dashboard' component={DashboardScreen} options={{ title: 'Dashboard' }} />
        <Tab.Screen name='Board' component={BoardScreen} options={{ title: 'Board' }} />
        <Tab.Screen name='Site' component={SiteScreen} options={{ title: 'Site' }} />
        <Tab.Screen name='Gateway' component={GatewayScreen} options={{ title: 'Gateway' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
