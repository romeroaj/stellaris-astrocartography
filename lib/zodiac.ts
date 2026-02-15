import {
  calculatePlanetPositions,
  calculateGST,
} from "./astronomy";

const ZODIAC_SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
] as const;

const SIGN_ABBREV: Record<string, string> = {
  Aries: "Ari", Taurus: "Tau", Gemini: "Gem", Cancer: "Can", Leo: "Leo", Virgo: "Vir",
  Libra: "Lib", Scorpio: "Sco", Sagittarius: "Sag", Capricorn: "Cap", Aquarius: "Aqu", Pisces: "Pis",
};

/** Shorten sign name for compact display (e.g. friend cards). */
export function abbrevSign(sign: string): string {
  return SIGN_ABBREV[sign] ?? sign.slice(0, 3);
}

function eclipticLonToSign(lon: number): string {
  const idx = Math.floor(((lon % 360) + 360) % 360 / 30) % 12;
  return ZODIAC_SIGNS[idx];
}

/**
 * Compute the Ascendant (Rising) ecliptic longitude.
 * Uses LST, birth latitude, and obliquity.
 */
function computeAscendantLongitude(
  lstDeg: number,
  latDeg: number,
  obliquityDeg: number
): number {
  const DEG = Math.PI / 180;
  const RAD = 180 / Math.PI;
  const lst = lstDeg * DEG;
  const lat = latDeg * DEG;
  const obl = obliquityDeg * DEG;

  const y = Math.sin(lst);
  const x = Math.cos(lst) * Math.cos(obl) + Math.tan(lat) * Math.sin(obl);
  let asc = Math.atan2(y, x) * RAD;
  asc = (asc % 360 + 360) % 360;
  return asc;
}

export interface BigThreeSigns {
  sun: string;
  moon: string;
  rising: string;
}

export interface BirthProfileForBigThree {
  birthDate: string;
  birthTime?: string;
  latitude?: number;
  longitude?: number;
}

/**
 * Get Sun, Moon, and Rising (Ascendant) zodiac signs from birth data.
 * Sun needs only birthDate. Moon and Rising need birthTime + latitude + longitude.
 * Returns partial results when data is incomplete.
 */
export function getBigThreeSigns(profile: BirthProfileForBigThree | null): Partial<BigThreeSigns> | null {
  if (!profile?.birthDate) return null;

  const [y, m, d] = profile.birthDate.split("-").map(Number);
  const hasFullData =
    profile.birthTime &&
    profile.latitude != null &&
    profile.longitude != null;

  // Sun sign: needs only date (approximate with noon)
  const positionsForSun = calculatePlanetPositions(y, m, d, 12, 0);
  const sunPos = positionsForSun.find((p) => p.name === "sun");
  if (!sunPos) return null;

  const result: Partial<BigThreeSigns> = { sun: eclipticLonToSign(sunPos.eclipticLon) };

  if (hasFullData) {
    const [h, mi] = profile.birthTime!.split(":").map(Number);
    const positions = calculatePlanetPositions(y, m, d, h, mi, profile.longitude!);
    const gst = calculateGST(y, m, d, h, mi, profile.longitude!);
    const lst = (gst + profile.longitude! + 360) % 360;
    const moonPos = positions.find((p) => p.name === "moon");
    if (moonPos) result.moon = eclipticLonToSign(moonPos.eclipticLon);
    const ascLon = computeAscendantLongitude(lst, profile.latitude!, 23.44);
    result.rising = eclipticLonToSign(ascLon);
  }

  return result;
}
