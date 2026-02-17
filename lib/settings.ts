import { PlanetName, AstroLine, InfluenceLevel } from "./types";

/** Chiron, Nodes, Lilith, and the asteroids — excluded when minor planets are off */
export const MINOR_PLANETS: PlanetName[] = [
  "chiron",
  "northnode",
  "southnode",
  "lilith",
  "ceres",
  "pallas",
  "juno",
  "vesta",
];

/** Filter planet list to exclude minor planets when includeMinorPlanets is false */
export function filterPlanets<T extends PlanetName>(
  planets: T[],
  includeMinorPlanets: boolean
): T[] {
  if (includeMinorPlanets) return planets;
  return planets.filter((p) => !MINOR_PLANETS.includes(p)) as T[];
}

/** Filter astro lines to exclude minor planets when includeMinorPlanets is false */
export function filterAstroLines(
  lines: AstroLine[],
  includeMinorPlanets: boolean
): AstroLine[] {
  if (includeMinorPlanets) return lines;
  return lines.filter((l) => !MINOR_PLANETS.includes(l.planet));
}

const IMPACT_ORDER: Record<InfluenceLevel, number> = {
  negligible: 0,
  mild: 1,
  moderate: 2,
  strong: 3,
  "very strong": 4,
};

/** Drop mild/negligible line impacts when the setting is enabled. */
export function filterNearbyByImpact<T extends { influence: string }>(
  items: T[],
  hideMildImpacts: boolean
): T[] {
  if (!hideMildImpacts) return items;
  return items.filter((item) => {
    const impact = item.influence as InfluenceLevel;
    return (IMPACT_ORDER[impact] ?? 0) >= IMPACT_ORDER.moderate;
  });
}
