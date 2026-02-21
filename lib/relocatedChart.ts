/**
 * Relocated chart: same birth moment, different location.
 * Planets keep the same sign/degree; angles and house placements change.
 * Used for synthesis so we can say "In this city, your Jupiter is in your 10th house."
 */
import { PlanetName, PlanetPosition } from "./types";
import { computeAscendant, getZodiacSign, type ZodiacInfo } from "./natal";

const OBLIQUITY = 23.4393;

function normalizeAngle(a: number): number {
  a = a % 360;
  if (a < 0) a += 360;
  return a;
}

/** Ecliptic longitude → zodiac sign index 0–11 (Aries–Pisces) */
function signIndexFromLongitude(lon: number): number {
  const n = normalizeAngle(lon);
  return Math.floor(n / 30) % 12;
}

/** Angles at the target location (ecliptic longitudes) */
export interface RelocatedAngles {
  asc: number;
  mc: number;
  ic: number;
  dsc: number;
}

/** Planet placed in a house at the target location (whole-sign) */
export interface PlanetInHouse {
  planet: PlanetName;
  sign: ZodiacInfo;
  house: number; // 1–12
  eclipticLon: number;
}

export interface RelocatedChart {
  angles: RelocatedAngles;
  /** All planets with house placement (whole-sign). Excludes nodes/lilith/asteroids if desired for synthesis; we include all from positions. */
  planetsInHouses: PlanetInHouse[];
}

/**
 * Compute the relocated chart for a target (lat, lon).
 * Same GST (birth moment); target LST = GST + targetLon.
 * Whole-sign houses: ASC sign = house 1.
 */
export function computeRelocatedChart(
  positions: PlanetPosition[],
  gst: number,
  targetLat: number,
  targetLon: number
): RelocatedChart {
  const lstTarget = normalizeAngle(gst + targetLon);
  const ascLon = computeAscendant(lstTarget, targetLat, OBLIQUITY);
  const ascNorm = normalizeAngle(ascLon);
  const mcLon = normalizeAngle(ascNorm + 90);
  const icLon = normalizeAngle(ascNorm + 180);
  const dscLon = normalizeAngle(ascNorm + 270);

  const ascSignIndex = signIndexFromLongitude(ascLon);

  const planetsInHouses: PlanetInHouse[] = positions.map((pos) => {
    const lon = normalizeAngle(pos.eclipticLon);
    const sign = getZodiacSign(lon);
    const planetSignIndex = signIndexFromLongitude(lon);
    // Whole-sign: house 1 = ASC sign, then next sign = house 2, etc.
    const house = ((planetSignIndex - ascSignIndex + 12) % 12) + 1;
    return {
      planet: pos.name,
      sign,
      house,
      eclipticLon: lon,
    };
  });

  return {
    angles: { asc: ascNorm, mc: mcLon, ic: icLon, dsc: dscLon },
    planetsInHouses,
  };
}

// ── House → plain English (synthesis) ─────────────────────────────

export const HOUSE_THEMES: Record<number, string> = {
  1: "self, body, and first impressions",
  2: "money, values, and resources",
  3: "communication, local community, and learning",
  4: "home, roots, and family",
  5: "creativity, romance, and self-expression",
  6: "daily routines, health, and service",
  7: "partnerships and marriage",
  8: "transformation, shared resources, and the unseen",
  9: "travel, philosophy, and higher learning",
  10: "career, reputation, and public life",
  11: "friends, hopes, and community",
  12: "subconscious, dreams, and spiritual life",
};

const ANGULAR_HOUSES = [1, 4, 7, 10];

export interface RelocatedHighlight {
  house: number;
  planet: PlanetName;
  plainEnglish: string;
}

/**
 * Pick 1–3 relocated house highlights for synthesis.
 * Priority: (1) planets with lines near this city (nearbyPlanets), (2) angular houses (1,4,7,10), (3) optional house shifts. Cap at max (default 3).
 */
export function getRelocatedHighlights(
  relocated: RelocatedChart,
  options?: { nearbyPlanets?: PlanetName[]; max?: number; natalChart?: RelocatedChart }
): RelocatedHighlight[] {
  const max = options?.max ?? 3;
  const nearbySet = new Set(options?.nearbyPlanets ?? []);
  const result: RelocatedHighlight[] = [];
  const seen = new Set<string>();

  function add(entry: PlanetInHouse): boolean {
    const key = `${entry.planet}-${entry.house}`;
    if (seen.has(key) || result.length >= max) return false;
    seen.add(key);
    const theme = HOUSE_THEMES[entry.house] ?? "life";
    result.push({
      house: entry.house,
      planet: entry.planet,
      plainEnglish: `Your ${entry.planet} in your ${ordinal(entry.house)} house — ${theme} take center stage here.`,
    });
    return true;
  }

  // 1) Nearby line planets’ relocated house placement
  for (const p of relocated.planetsInHouses) {
    if (nearbySet.has(p.planet)) {
      if (add(p)) continue;
      if (result.length >= max) break;
    }
  }

  // 2) Angular house placements (1, 4, 7, 10) not yet added
  if (result.length < max) {
    for (const house of ANGULAR_HOUSES) {
      if (result.length >= max) break;
      const inHouse = relocated.planetsInHouses.filter((p) => p.house === house);
      for (const p of inHouse) {
        if (add(p)) break;
      }
    }
  }

  // 3) Optional: one notable house shift (natal vs relocated)
  if (result.length < max && options?.natalChart) {
    const natalByPlanet = new Map(options.natalChart.planetsInHouses.map((p) => [p.planet, p.house]));
    for (const p of relocated.planetsInHouses) {
      const natalHouse = natalByPlanet.get(p.planet);
      if (natalHouse != null && natalHouse !== p.house) {
        const key = `${p.planet}-${p.house}`;
        if (!seen.has(key) && result.length < max) {
          seen.add(key);
          const theme = HOUSE_THEMES[p.house] ?? "life";
          result.push({
            house: p.house,
            planet: p.planet,
            plainEnglish: `Your ${p.planet} moves into your ${ordinal(p.house)} house here — ${theme} take center stage.`,
          });
          break;
        }
      }
    }
  }

  return result;
}

function ordinal(n: number): string {
  const s = ["", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];
  return s[n] ?? `${n}th`;
}
