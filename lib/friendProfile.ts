/**
 * Fetch birth profile for a friend or custom friend.
 * - Real friend: GET /api/friends/:id/profile
 * - Custom friend (id starts with "custom_"): GET /api/custom-friends/:id
 */
import { authFetch } from "./auth";
import type { BirthData } from "./types";

const CUSTOM_PREFIX = "custom_";

export function isCustomFriendId(id: string): boolean {
  return id.startsWith(CUSTOM_PREFIX);
}

export function getCustomFriendId(id: string): string {
  return id.startsWith(CUSTOM_PREFIX) ? id.slice(CUSTOM_PREFIX.length) : id;
}

export async function fetchFriendProfile(
  id: string,
  displayName?: string
): Promise<BirthData | null> {
  if (isCustomFriendId(id)) {
    const cfId = getCustomFriendId(id);
    const res = await authFetch<{ customFriend: any }>("GET", `/api/custom-friends/${cfId}`);
    if (!res.data?.customFriend) return null;
    const cf = res.data.customFriend;
    return {
      id: `custom_${cf.id}`,
      name: displayName || cf.name || "Custom Friend",
      date: cf.birthDate,
      time: cf.birthTime,
      latitude: cf.latitude,
      longitude: cf.longitude,
      locationName: cf.locationName,
      createdAt: cf.createdAt ? new Date(cf.createdAt).getTime() : Date.now(),
    };
  }
  const res = await authFetch<{ profile: any }>("GET", `/api/friends/${id}/profile`);
  if (!res.data?.profile) return null;
  const fp = res.data.profile;
  return {
    id: `friend_${fp.id}`,
    name: displayName || fp.name || "Friend",
    date: fp.birthDate,
    time: fp.birthTime,
    latitude: fp.latitude,
    longitude: fp.longitude,
    locationName: fp.locationName,
    createdAt: fp.createdAt ? new Date(fp.createdAt).getTime() : Date.now(),
  };
}
