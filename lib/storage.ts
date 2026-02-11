import AsyncStorage from "@react-native-async-storage/async-storage";
import { BirthData } from "./types";

const PROFILES_KEY = "@stellaris_profiles";
const ACTIVE_PROFILE_KEY = "@stellaris_active_profile";
const FTUX_SEEN_KEY = "@stellaris_ftux_seen";

export async function saveProfile(profile: BirthData): Promise<void> {
  const profiles = await getProfiles();
  const index = profiles.findIndex((p) => p.id === profile.id);
  if (index >= 0) {
    profiles[index] = profile;
  } else {
    profiles.push(profile);
  }
  await AsyncStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

export async function getProfiles(): Promise<BirthData[]> {
  const data = await AsyncStorage.getItem(PROFILES_KEY);
  return data ? JSON.parse(data) : [];
}

export async function deleteProfile(id: string): Promise<void> {
  const profiles = await getProfiles();
  const filtered = profiles.filter((p) => p.id !== id);
  await AsyncStorage.setItem(PROFILES_KEY, JSON.stringify(filtered));
  const activeId = await getActiveProfileId();
  if (activeId === id) {
    await setActiveProfileId(filtered.length > 0 ? filtered[0].id : null);
  }
}

export async function setActiveProfileId(id: string | null): Promise<void> {
  if (id) {
    await AsyncStorage.setItem(ACTIVE_PROFILE_KEY, id);
  } else {
    await AsyncStorage.removeItem(ACTIVE_PROFILE_KEY);
  }
}

export async function getActiveProfileId(): Promise<string | null> {
  return AsyncStorage.getItem(ACTIVE_PROFILE_KEY);
}

export async function getActiveProfile(): Promise<BirthData | null> {
  const id = await getActiveProfileId();
  if (!id) return null;
  const profiles = await getProfiles();
  return profiles.find((p) => p.id === id) || null;
}

export async function setFtuxSeen(): Promise<void> {
  await AsyncStorage.setItem(FTUX_SEEN_KEY, "true");
}

export async function isFtuxSeen(): Promise<boolean> {
  const val = await AsyncStorage.getItem(FTUX_SEEN_KEY);
  return val === "true";
}

export function createDemoProfile(): BirthData {
  return {
    id: "demo_profile",
    name: "Demo Chart",
    date: "1990-06-21",
    time: "14:30",
    latitude: 40.7128,
    longitude: -74.006,
    locationName: "New York, NY, USA",
    createdAt: Date.now(),
  };
}
