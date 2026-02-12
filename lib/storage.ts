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

// ── Server Sync ────────────────────────────────────────────────────
// These functions bridge local AsyncStorage ↔ server database.
// They use authFetch from lib/auth.ts.

import { authFetch } from "./auth";

interface ServerProfile {
  id: string;
  userId: string;
  name: string;
  birthDate: string;
  birthTime: string;
  latitude: number;
  longitude: number;
  locationName: string;
  isActive: boolean;
}

/**
 * Push local profiles to the server.
 * Skips profiles that already exist server-side (by name + date match).
 */
export async function syncProfilesToServer(): Promise<void> {
  try {
    const localProfiles = await getProfiles();
    if (localProfiles.length === 0) return;

    // Get existing server profiles
    const serverRes = await authFetch<{ profiles: ServerProfile[] }>("GET", "/api/profiles");
    const serverProfiles = serverRes.data?.profiles || [];

    for (const local of localProfiles) {
      // Check if already synced (match by name + date)
      const exists = serverProfiles.some(
        (s) => s.name === local.name && s.birthDate === local.date
      );

      if (!exists) {
        await authFetch("POST", "/api/profiles", {
          name: local.name,
          birthDate: local.date,
          birthTime: local.time,
          latitude: local.latitude,
          longitude: local.longitude,
          locationName: local.locationName,
          isActive: local.id === (await getActiveProfileId()),
        });
      }
    }
  } catch (err) {
    console.warn("Profile sync (push) failed:", err);
  }
}

/**
 * Pull server profiles into local AsyncStorage.
 * Merges with existing local data (doesn't overwrite).
 */
export async function fetchProfilesFromServer(): Promise<void> {
  try {
    const serverRes = await authFetch<{ profiles: ServerProfile[] }>("GET", "/api/profiles");
    const serverProfiles = serverRes.data?.profiles || [];
    if (serverProfiles.length === 0) return;

    const localProfiles = await getProfiles();

    for (const sp of serverProfiles) {
      // Check if we already have this profile locally
      const exists = localProfiles.some(
        (l) => l.name === sp.name && l.date === sp.birthDate
      );

      if (!exists) {
        const newLocal: BirthData = {
          id: `server_${sp.id}`,
          name: sp.name,
          date: sp.birthDate,
          time: sp.birthTime,
          latitude: sp.latitude,
          longitude: sp.longitude,
          locationName: sp.locationName,
          createdAt: Date.now(),
        };
        await saveProfile(newLocal);
      }
    }

    // Set active profile if none is set locally
    const activeId = await getActiveProfileId();
    if (!activeId && serverProfiles.length > 0) {
      const localProfs = await getProfiles();
      if (localProfs.length > 0) {
        await setActiveProfileId(localProfs[0].id);
      }
    }
  } catch (err) {
    console.warn("Profile sync (pull) failed:", err);
  }
}

/**
 * Full bidirectional sync: push local → server, then pull server → local.
 * Call this on login.
 */
export async function syncOnLogin(): Promise<void> {
  await syncProfilesToServer();
  await fetchProfilesFromServer();
}

