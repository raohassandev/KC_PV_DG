import { MD3LightTheme, MD3DarkTheme, type MD3Theme } from 'react-native-paper';

// Brand accents tuned for PV-DG commissioning.
const brand = {
  primary: '#0b6bcb',
  secondary: '#00a3a3',
  tertiary: '#6b4eff',
};

export const paperLightTheme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: brand.primary,
    secondary: brand.secondary,
    tertiary: brand.tertiary,
  },
};

export const paperDarkTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: brand.primary,
    secondary: brand.secondary,
    tertiary: brand.tertiary,
  },
};

