import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import type { ComponentProps } from 'react';
import { colors } from '../theme/colors';
import { useAppSelector } from '../store/hooks';
import { AccountScreen } from '../screens/AccountScreen';
import { BoardScreen } from '../screens/BoardScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { ExportScreen } from '../screens/ExportScreen';
import { SiteScreen } from '../screens/SiteScreen';
import { SourceSlotsScreen } from '../screens/SourceSlotsScreen';
import { ValidationScreen } from '../screens/ValidationScreen';

const Tab = createBottomTabNavigator();

type IonName = ComponentProps<typeof Ionicons>['name'];
type TabId = 'Dashboard' | 'Board' | 'Site' | 'Slots' | 'Validate' | 'Export' | 'Account';

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

function tabsForRole(role: string): TabId[] {
  if (role === 'manufacturer') return ['Dashboard', 'Board', 'Site', 'Slots', 'Validate', 'Export', 'Account'];
  if (role === 'installer') return ['Dashboard', 'Board', 'Site', 'Slots', 'Validate', 'Export', 'Account'];
  if (role === 'support') return ['Dashboard', 'Board', 'Validate', 'Account'];
  return ['Dashboard', 'Account'];
}

export function RootNavigation() {
  const role = useAppSelector((s) => s.auth.role);
  const tabs = tabsForRole(role);

  return (
    <NavigationContainer theme={navTheme}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarHideOnKeyboard: true,
          tabBarStyle: {
            height: 64,
            paddingTop: 6,
            paddingBottom: 8,
            borderTopColor: colors.border,
            backgroundColor: colors.surface,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '700',
          },
        }}
      >
        {tabs.includes('Dashboard') ? (
          <Tab.Screen
            name='Dashboard'
            component={DashboardScreen}
            options={{
              title: 'Live',
              tabBarIcon: tabBarIcon('pulse-outline', 'pulse'),
            }}
          />
        ) : null}
        {tabs.includes('Board') ? (
          <Tab.Screen
            name='Board'
            component={BoardScreen}
            options={{
              title: 'Board',
              tabBarIcon: tabBarIcon('hardware-chip-outline', 'hardware-chip'),
            }}
          />
        ) : null}
        {tabs.includes('Site') ? (
          <Tab.Screen
            name='Site'
            component={SiteScreen}
            options={{
              title: 'Site',
              tabBarIcon: tabBarIcon('business-outline', 'business'),
            }}
          />
        ) : null}
        {tabs.includes('Slots') ? (
          <Tab.Screen
            name='Slots'
            component={SourceSlotsScreen}
            options={{
              title: 'Slots',
              tabBarIcon: tabBarIcon('git-branch-outline', 'git-branch'),
            }}
          />
        ) : null}
        {tabs.includes('Validate') ? (
          <Tab.Screen
            name='Validate'
            component={ValidationScreen}
            options={{
              title: 'Check',
              tabBarIcon: tabBarIcon('checkmark-circle-outline', 'checkmark-circle'),
            }}
          />
        ) : null}
        {tabs.includes('Export') ? (
          <Tab.Screen
            name='Export'
            component={ExportScreen}
            options={{
              title: 'Export',
              tabBarIcon: tabBarIcon('share-outline', 'share'),
            }}
          />
        ) : null}
        {tabs.includes('Account') ? (
          <Tab.Screen
            name='Account'
            component={AccountScreen}
            options={{
              title: 'Account',
              tabBarIcon: tabBarIcon('person-circle-outline', 'person-circle'),
            }}
          />
        ) : null}
      </Tab.Navigator>
    </NavigationContainer>
  );
}
