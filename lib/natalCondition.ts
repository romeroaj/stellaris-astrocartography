/**
 * Natal condition: aspects and dignity per planet for synthesis.
 * Used to temper line interpretations (e.g. "Natally your Venus is challenged").
 */
import { PlanetName, PlanetPosition } from "./types";
import type { AspectType } from "./types";

export type NatalConditionTag = "strong" | "challenged" | "neutral";

/** One natal aspect between two planets (for synthesis context) */
export interface NatalAspect {
  planet1: PlanetName;
  planet2: PlanetName;
  type: AspectType;
  orb: number;
}

export interface PlanetCondition {
  planet: PlanetName;
  tag: NatalConditionTag;
  /** Notable natal aspects involving this planet (hard aspects more salient for "challenged") */
  aspects: NatalAspect[];
  /** Optional short reason, e.g. "in detriment" or "square Saturn" */
  reason?: string;
}

const PTOLEMAIC_ASPECTS: { type: AspectType; angle: number; maxOrb: number }[] = [
  { type: "conjunction", angle: 0, maxOrb: 8 },
  { type: "opposition", angle: 180, maxOrb: 6 },
  { type: "trine", angle: 120, maxOrb: 6 },
  { type: "square", angle: 90, maxOrb: 6 },
  { type: "sextile", angle: 60, maxOrb: 4 },
];

/** Core planets we evaluate for condition (synthesis-relevant). */
const CONDITION_PLANETS: PlanetName[] = [
  "sun", "moon", "mercury", "venus", "mars",
  "jupiter", "saturn", "uranus", "neptune", "pluto",
];

function normalizeAngle(a: number): number {
  a = a % 360;
  if (a < 0) a += 360;
  return a;
}

function angleDiff(a: number, b: number): number {
  let d = normalizeAngle(a) - normalizeAngle(b);
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

/** Sign index 0–11 from ecliptic longitude */
function signIndex(lon: number): number {
  const n = normalizeAngle(lon);
  return Math.floor(n / 30) % 12;
}

/** Find all natal aspects (Ptolemaic) between positions. Tighter orbs for natal. */
function findNatalAspects(positions: PlanetPosition[]): NatalAspect[] {
  const result: NatalAspect[] = [];
  const posByPlanet = new Map(positions.map((p) => [p.name, p]));

  const planets = positions.map((p) => p.name).filter((n) => CONDITION_PLANETS.includes(n));

  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const p1 = posByPlanet.get(planets[i])!;
      const p2 = posByPlanet.get(planets[j])!;
      const lon1 = p1.eclipticLon;
      const lon2 = p2.eclipticLon;

      for (const { type, angle, maxOrb } of PTOLEMAIC_ASPECTS) {
        const rawDiff = angleDiff(lon1, lon2);
        let separation: number;
        if (angle === 0) {
          separation = Math.min(Math.abs(rawDiff), 360 - Math.abs(rawDiff));
        } else {
          const diff = Math.abs(rawDiff);
          separation = Math.min(
            Math.abs(diff - angle),
            Math.abs(diff - (360 - angle))
          );
        }
        if (separation <= maxOrb) {
          result.push({
            planet1: p1.name,
            planet2: p2.name,
            type,
            orb: Math.round(separation * 10) / 10,
          });
        }
      }
    }
  }
  return result;
}

/**
 * Simple dignity: domicile/exaltation → strong, detriment/fall → challenged.
 * Traditional rulership only (core planets used in synthesis).
 */
function dignityTag(planet: PlanetName, signIndexValue: number): NatalConditionTag | null {
  // Sign index: 0 Aries … 11 Pisces. Traditional rulership.
  const domicile: Partial<Record<PlanetName, number[]>> = {
    sun: [4],        // Leo
    moon: [3],       // Cancer
    mercury: [2, 5], // Gemini, Virgo
    venus: [1, 6],   // Taurus, Libra
    mars: [0, 7],    // Aries, Scorpio
    jupiter: [8, 11], // Sagittarius, Pisces
    saturn: [9, 10], // Capricorn, Aquarius
    uranus: [10],
    neptune: [11],
    pluto: [7],
  };
  const detriment: Partial<Record<PlanetName, number[]>> = {
    sun: [10],       // Aquarius
    moon: [9],       // Capricorn
    mercury: [8, 11], // Sagittarius, Pisces
    venus: [7, 0],   // Scorpio, Aries
    mars: [6, 3],    // Libra, Cancer
    jupiter: [2, 5], // Gemini, Virgo
    saturn: [3, 4],  // Cancer, Leo
    uranus: [4],
    neptune: [5],
    pluto: [1],
  };
  const exaltation: Partial<Record<PlanetName, number>> = {
    sun: 0,   // Aries
    moon: 1,  // Taurus
    mercury: 5, // Virgo
    venus: 11, // Pisces
    mars: 9,  // Capricorn
    jupiter: 3, // Cancer
    saturn: 6, // Libra
    uranus: 10,
    neptune: 6,
    pluto: 0,
  };

  const dom = domicile[planet];
  const det = detriment[planet];
  const ex = exaltation[planet];
  if (dom?.includes(signIndexValue)) return "strong";
  if (ex !== undefined && ex === signIndexValue) return "strong";
  if (det?.includes(signIndexValue)) return "challenged";
  return null;
}

/**
 * Compute condition (strong/challenged/neutral) per planet for synthesis.
 * Uses natal aspects (hard aspects → tendency to "challenged") and simple dignity.
 */
export function getNatalConditions(positions: PlanetPosition[]): PlanetCondition[] {
  const aspects = findNatalAspects(positions);
  const posByPlanet = new Map(positions.map((p) => [p.name, p]));

  const conditions: PlanetCondition[] = CONDITION_PLANETS.map((planet) => {
    const pos = posByPlanet.get(planet);
    const aspectsForPlanet = aspects.filter(
      (a) => a.planet1 === planet || a.planet2 === planet
    );

    let tag: NatalConditionTag = "neutral";
    let reason: string | undefined;

    const signIdx = pos ? signIndex(pos.eclipticLon) : 0;
    const dignity = dignityTag(planet, signIdx);
    if (dignity) {
      tag = dignity;
      reason = dignity === "strong" ? "strong sign placement" : "challenging sign placement";
    }

    const hardAspects = aspectsForPlanet.filter(
      (a) => a.type === "square" || a.type === "opposition"
    );
    const softAspects = aspectsForPlanet.filter(
      (a) => a.type === "trine" || a.type === "sextile"
    );
    if (hardAspects.length > softAspects.length && hardAspects.length >= 1) {
      if (tag !== "strong") {
        tag = "challenged";
        const other = hardAspects[0].planet1 === planet ? hardAspects[0].planet2 : hardAspects[0].planet1;
        reason = `${hardAspects[0].type} ${other}`;
      }
    } else if (softAspects.length > 0 && hardAspects.length === 0) {
      if (tag !== "challenged") {
        tag = "strong";
        if (!reason) reason = "supportive aspects";
      }
    }

    return {
      planet,
      tag,
      aspects: aspectsForPlanet,
      reason,
    };
  });

  return conditions;
}

/** Get a short snippet for synthesis, e.g. "Natally, your Venus is strong and supportive." */
export function getNatalConditionSnippet(conditions: PlanetCondition[], planet: PlanetName): string {
  const c = conditions.find((x) => x.planet === planet);
  if (!c) return "";
  if (c.tag === "strong") return `Natally, your ${planet} is strong and supportive.`;
  if (c.tag === "challenged") return `Natally, your ${planet} is challenged${c.reason ? ` (e.g. ${c.reason})` : ""}.`;
  return "";
}
