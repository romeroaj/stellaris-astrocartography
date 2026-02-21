/**
 * Location synthesis: Natal Promise → ACG lines → Relocated houses → CCG (timing).
 * Single entry point for "Your story here" narrative per city.
 */
import type { BirthData } from "./types";
import {
  calculatePlanetPositions,
  calculateGST,
  generateAstroLines,
  findNearestLines,
} from "./astronomy";
import { filterAstroLines, filterNearbyByImpact } from "./settings";
import { getCityActivation } from "./transits";
import { computeRelocatedChart, getRelocatedHighlights, type RelocatedChart, type RelocatedHighlight } from "./relocatedChart";
import { getNatalConditions, getNatalConditionSnippet, type PlanetCondition } from "./natalCondition";

export interface NearbyLineWithDistance {
  planet: string;
  lineType: string;
  distance: number;
  influence: string;
}

export interface LocationSynthesis {
  natalConditionSnippets: string[];
  nearbyLinesWithDistance: NearbyLineWithDistance[];
  relocatedHighlights: RelocatedHighlight[];
  timingSummary: {
    activationStrength: string;
    bestVisitWindow: { startDate: string; endDate: string; description: string } | null;
    activeTransitsCount: number;
  };
  /** One-paragraph summary (Natal → ACG → Relocated → CCG) */
  paragraph: string;
}

export interface SynthesisOptions {
  hideMildImpacts?: boolean;
  targetDate?: Date;
  cityName?: string;
  includeMinorPlanets?: boolean;
  maxHighlights?: number;
}

/**
 * Build the full location synthesis for a target (lat, lon) and birth profile.
 */
export function getLocationSynthesis(
  profile: BirthData,
  targetLat: number,
  targetLon: number,
  options: SynthesisOptions = {}
): LocationSynthesis {
  const {
    hideMildImpacts = false,
    targetDate = new Date(),
    cityName = "",
    includeMinorPlanets = true,
    maxHighlights = 3,
  } = options;

  const [y, m, d] = profile.date.split("-").map(Number);
  const [h, mi] = profile.time.split(":").map(Number);
  const positions = calculatePlanetPositions(y, m, d, h, mi, profile.longitude);
  const gst = calculateGST(y, m, d, h, mi, profile.longitude);

  const rawLines = generateAstroLines(positions, gst);
  const astroLines = filterAstroLines(rawLines, includeMinorPlanets);
  const nearby = filterNearbyByImpact(
    findNearestLines(astroLines, targetLat, targetLon, 15),
    hideMildImpacts
  );
  const nearbyPlanets = nearby.map((l) => l.planet);

  const relocated = computeRelocatedChart(positions, gst, targetLat, targetLon);
  const natalChartForShift = undefined; // optional: computeRelocatedChart(positions, gst, profile.latitude, profile.longitude) for house-shift highlight
  const relocatedHighlights = getRelocatedHighlights(relocated, {
    nearbyPlanets,
    max: maxHighlights,
    natalChart: natalChartForShift,
  });

  const conditions = getNatalConditions(positions);
  const natalConditionSnippets: string[] = [];
  const planetsToCheck = new Set([...nearbyPlanets, ...relocatedHighlights.map((h) => h.planet)]);
  for (const planet of planetsToCheck) {
    const snippet = getNatalConditionSnippet(conditions, planet);
    if (snippet) natalConditionSnippets.push(snippet);
  }

  const activation = getCityActivation(
    cityName,
    targetLat,
    targetLon,
    profile.date,
    profile.time,
    profile.longitude,
    targetDate,
    hideMildImpacts
  );

  const timingSummary = {
    activationStrength: activation.activationStrength,
    bestVisitWindow: activation.bestVisitWindow
      ? {
          startDate: activation.bestVisitWindow.startDate,
          endDate: activation.bestVisitWindow.endDate,
          description: activation.bestVisitWindow.peakDescription,
        }
      : null,
    activeTransitsCount: activation.activeTransits.length,
  };

  const nearbyLinesWithDistance: NearbyLineWithDistance[] = nearby.map((l) => ({
    planet: l.planet,
    lineType: l.lineType,
    distance: l.distance,
    influence: l.influence,
  }));

  const paragraph = buildSynthesisParagraph({
    natalConditionSnippets,
    nearbyLinesWithDistance: nearbyLinesWithDistance.slice(0, 3),
    relocatedHighlights,
    timingSummary,
  });

  return {
    natalConditionSnippets,
    nearbyLinesWithDistance,
    relocatedHighlights,
    timingSummary,
    paragraph,
  };
}

/**
 * Build one paragraph: Natal → ACG → Relocated → CCG (timing).
 */
export function buildSynthesisParagraph(synthesis: {
  natalConditionSnippets: string[];
  nearbyLinesWithDistance: NearbyLineWithDistance[];
  relocatedHighlights: RelocatedHighlight[];
  timingSummary: LocationSynthesis["timingSummary"];
}): string {
  const parts: string[] = [];

  if (synthesis.natalConditionSnippets.length > 0) {
    parts.push(synthesis.natalConditionSnippets[0]);
  }

  if (synthesis.nearbyLinesWithDistance.length > 0) {
    const top = synthesis.nearbyLinesWithDistance[0];
    parts.push(
      `You're near a ${top.planet} ${top.lineType} line (${top.influence} influence).`
    );
  }

  if (synthesis.relocatedHighlights.length > 0) {
    const first = synthesis.relocatedHighlights[0];
    parts.push(first.plainEnglish);
  }

  if (synthesis.timingSummary.bestVisitWindow) {
    parts.push(
      `Transit-wise (CCG), ${synthesis.timingSummary.bestVisitWindow.description} — a good window to visit.`
    );
  } else if (synthesis.timingSummary.activationStrength !== "quiet") {
    parts.push(
      `Right now your lines here are ${synthesis.timingSummary.activationStrength} (cyclocartography).`
    );
  }

  return parts.length > 0 ? parts.join(" ") : "No major planetary lines or timing highlights for this location.";
}
