import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import type { ComponentProps } from 'react';
import { colors } from '../theme/colors';
import { BoardScreen } from '../screens/BoardScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { ExportScreen } from '../screens/ExportScreen';
import { GatewayScreen } from '../screens/GatewayScreen';
import { SiteScreen } from '../screens/SiteScreen';
import { SourceSlotsScreen } from '../screens/SourceSlotsScreen';

const Tab = createBottomTabNavigator();

type IonName = ComponentProps<typeof Ionicons>['name'];

function tabBarIcon(outline: IonName, solid: IonName) {
  return ({
    color,
    size,
    focused,
  }: {
    color: string;
    size: number;
    focused: boolean;
  }) => <Ionicons name={focused ? solid : outline} size={size} color={color} />;
}

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
        <Tab.Screen
          name='Dashboard'
          component={DashboardScreen}
          options={{
            title: 'Dashboard',
            tabBarIcon: tabBarIcon('stats-chart-outline', 'stats-chart'),
          }}
        />
        <Tab.Screen
          name='Board'
          component={BoardScreen}
          options={{
            title: 'Board',
            tabBarIcon: tabBarIcon('hardware-chip-outline', 'hardware-chip'),
          }}
        />
        <Tab.Screen
          name='Site'
          component={SiteScreen}
          options={{
            title: 'Site',
            tabBarIcon: tabBarIcon('clipboard-outline', 'clipboard'),
          }}
        />
        <Tab.Screen
          name='Slots'
          component={SourceSlotsScreen}
          options={{
            title: 'Slots',
            tabBarIcon: tabBarIcon('git-branch-outline', 'git-branch'),
          }}
        />
        <Tab.Screen
          name='Export'
          component={ExportScreen}
          options={{
            title: 'Export',
            tabBarIcon: tabBarIcon('share-outline', 'share'),
          }}
        />
        <Tab.Screen
          name='Gateway'
          component={GatewayScreen}
          options={{
            title: 'Gateway',
            tabBarIcon: tabBarIcon('cloud-outline', 'cloud'),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
