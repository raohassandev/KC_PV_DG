import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SiteConfig } from '../domain/siteProfileSchema';

const KEY_PREFIX = 'pvdg.mobile.profile.';
const KEY_INDEX = 'pvdg.mobile.profileIndex';

export async function listProfiles(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY_INDEX);
    const names = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(names)) return [];
    return names.filter((n) => typeof n === 'string' && n.trim()).map((n) => n.trim());
  } catch {
    return [];
  }
}

async function writeIndex(names: string[]) {
  await AsyncStorage.setItem(KEY_INDEX, JSON.stringify(Array.from(new Set(names)).sort()));
}

export async function saveProfile(name: string, config: SiteConfig) {
  const n = name.trim();
  if (!n) throw new Error('Profile name required');
  await AsyncStorage.setItem(`${KEY_PREFIX}${n}`, JSON.stringify(config));
  const idx = await listProfiles();
  await writeIndex([...idx, n]);
}

export async function loadProfile(name: string): Promise<SiteConfig | null> {
  const n = name.trim();
  if (!n) return null;
  try {
    const raw = await AsyncStorage.getItem(`${KEY_PREFIX}${n}`);
    return raw ? (JSON.parse(raw) as SiteConfig) : null;
  } catch {
    return null;
  }
}

