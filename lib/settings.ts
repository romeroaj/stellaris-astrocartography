import { PlanetName, AstroLine } from "./types";

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
