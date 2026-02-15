import { AstroLine, BirthData, PlanetName, LineType, OverlapClassification } from "./types";
import { classifyLine, LineSentiment } from "./lineClassification";
import { getInterpretation, getPlanetSymbol } from "./interpretations";
import { findCitiesNearLine, CityWithDistance } from "./cities";
import {
  calculatePlanetPositions,
  calculateGST,
  generateAstroLines,
} from "./astronomy";
import { filterAstroLines } from "./settings";

/** Maximum longitude distance (degrees) to consider lines as overlapping */
const OVERLAP_THRESHOLD_DEG = 10;

/**
 * Compute the shortest longitude distance accounting for dateline wrap.
 */
function lonDistance(a: number, b: number): number {
  let diff = Math.abs(a - b);
  if (diff > 180) diff = 360 - diff;
  return diff;
}

/**
 * Find the point in a line segment closest to a target latitude.
 */
function findNearestPoint(
  points: { latitude: number; longitude: number }[],
  targetLat: number
): { latitude: number; longitude: number } | null {
  if (points.length === 0) return null;
  let best = points[0];
  let bestDist = Math.abs(best.latitude - targetLat);
  for (let i = 1; i < points.length; i++) {
    const dist = Math.abs(points[i].latitude - targetLat);
    if (dist < bestDist) {
      bestDist = dist;
      best = points[i];
    }
  }
  return best;
}

/**
 * Compute the proximity in degrees between two lines of the same planet+lineType.
 * For MC/IC (vertical) lines: direct longitude comparison.
 * For ASC/DSC (curved) lines: sample at several latitudes and return minimum distance.
 */
function computeLineProximity(
  userSegments: AstroLine[],
  partnerSegments: AstroLine[]
): number {
  const lineType = userSegments[0]?.lineType;
  let minDist = Infinity;

  if (lineType === "MC" || lineType === "IC") {
    // Vertical lines — compare the constant longitude
    for (const uSeg of userSegments) {
      for (const pSeg of partnerSegments) {
        const uLon = uSeg.points[0]?.longitude ?? 0;
        const pLon = pSeg.points[0]?.longitude ?? 0;
        minDist = Math.min(minDist, lonDistance(uLon, pLon));
      }
    }
  } else {
    // Curved lines — sample at several latitudes
    const sampleLats = [-60, -40, -20, 0, 20, 40, 60];
    for (const uSeg of userSegments) {
      for (const pSeg of partnerSegments) {
        for (const lat of sampleLats) {
          const uPt = findNearestPoint(uSeg.points, lat);
          const pPt = findNearestPoint(pSeg.points, lat);
          if (uPt && pPt) {
            minDist = Math.min(minDist, lonDistance(uPt.longitude, pPt.longitude));
          }
        }
      }
    }
  }

  return minDist;
}

/**
 * Classify the overlap between two sentiments.
 */
function classifyOverlap(
  userSentiment: LineSentiment,
  partnerSentiment: LineSentiment
): OverlapClassification {
  const pair = [userSentiment, partnerSentiment].sort().join("+");
  switch (pair) {
    case "positive+positive":
      return "harmonious";
    case "difficult+difficult":
      return "challenging";
    case "difficult+positive":
      return "tension";
    case "neutral+positive":
      return "slightly_positive";
    case "difficult+neutral":
      return "slightly_challenging";
    case "neutral+neutral":
      return "neutral_overlap";
    default:
      return "neutral_overlap";
  }
}

export interface SynastryOverlap {
  planet: PlanetName;
  lineType: LineType;
  classification: OverlapClassification;
  userSentiment: LineSentiment;
  partnerSentiment: LineSentiment;
  proximityDeg: number;
}

/**
 * Analyze synastry lines to find overlapping pairs and tag them.
 * Returns the lines array with overlap metadata set.
 */
export function tagSynastryOverlaps(lines: AstroLine[]): {
  lines: AstroLine[];
  overlaps: SynastryOverlap[];
} {
  const userLines = lines.filter((l) => l.sourceId === "user");
  const partnerLines = lines.filter((l) => l.sourceId === "partner");

  // Group by planet+lineType
  const userGroups = groupByPlanetLine(userLines);
  const partnerGroups = groupByPlanetLine(partnerLines);

  const overlaps: SynastryOverlap[] = [];
  const overlapKeys = new Set<string>();

  for (const [key, uSegments] of userGroups.entries()) {
    const pSegments = partnerGroups.get(key);
    if (!pSegments) continue;

    const proximity = computeLineProximity(uSegments, pSegments);
    if (proximity <= OVERLAP_THRESHOLD_DEG) {
      const planet = uSegments[0].planet;
      const lineType = uSegments[0].lineType;
      const uSentiment = classifyLine(planet, lineType).sentiment;
      const pSentiment = classifyLine(planet, lineType).sentiment;
      const classification = classifyOverlap(uSentiment, pSentiment);

      overlapKeys.add(key);
      overlaps.push({
        planet,
        lineType,
        classification,
        userSentiment: uSentiment,
        partnerSentiment: pSentiment,
        proximityDeg: proximity,
      });
    }
  }

  // Sort overlaps: closest first
  overlaps.sort((a, b) => a.proximityDeg - b.proximityDeg);

  // Tag lines
  const taggedLines = lines.map((line) => {
    const key = `${line.planet}-${line.lineType}`;
    if (overlapKeys.has(key)) {
      const overlap = overlaps.find(
        (o) => o.planet === line.planet && o.lineType === line.lineType
      );
      return {
        ...line,
        isOverlapping: true,
        overlapClassification: overlap?.classification,
        overlapProximityDeg: overlap?.proximityDeg,
      };
    }
    return { ...line, isOverlapping: false };
  });

  return { lines: taggedLines, overlaps };
}

function groupByPlanetLine(lines: AstroLine[]): Map<string, AstroLine[]> {
  const map = new Map<string, AstroLine[]>();
  for (const line of lines) {
    const key = `${line.planet}-${line.lineType}`;
    const arr = map.get(key) || [];
    arr.push(line);
    map.set(key, arr);
  }
  return map;
}

// ─── Visual constants ───

export const OVERLAP_COLORS: Record<OverlapClassification, string> = {
  harmonious: "#10B981",
  challenging: "#EF4444",
  tension: "#A855F7",
  slightly_positive: "#34D399",
  slightly_challenging: "#F97316",
  neutral_overlap: "#F59E0B",
};

export const OVERLAP_LABELS: Record<OverlapClassification, string> = {
  harmonious: "Harmonious",
  challenging: "Challenging",
  tension: "Tension",
  slightly_positive: "Slightly Positive",
  slightly_challenging: "Slightly Challenging",
  neutral_overlap: "Neutral",
};

export const OVERLAP_DESCRIPTIONS: Record<OverlapClassification, string> = {
  harmonious: "Both of you thrive here — great energy for shared experiences",
  challenging: "A place of shared intensity — requires patience from both",
  tension: "Mixed energy — one partner may feel great while the other struggles",
  slightly_positive: "Generally good vibes, leaning positive for you both",
  slightly_challenging: "Slightly stressful — one partner faces more friction here",
  neutral_overlap: "Balanced shared energy — neither strongly positive nor difficult",
};

// ─── Bond Summary Generation ───

export interface OverlapInsight {
  planet: PlanetName;
  lineType: LineType;
  classification: OverlapClassification;
  proximityDeg: number;
  themes: string[];
  shortDesc: string;
  title: string;
  nearbyCities: CityWithDistance[];
}

export interface BondSummary {
  harmonious: OverlapInsight[];
  challenging: OverlapInsight[];
  tension: OverlapInsight[];
  slightlyPositive: OverlapInsight[];
  slightlyChallenging: OverlapInsight[];
  neutralOverlap: OverlapInsight[];
  totalOverlaps: number;
  allOverlaps: OverlapInsight[];
}

/**
 * Produce a rich summary of synastry overlaps between two birth profiles.
 * Generates lines for both charts, finds overlaps, and enriches each
 * overlap with interpretation data and nearby cities.
 */
export function generateBondSummary(
  userProfile: BirthData,
  partnerProfile: BirthData,
  includeMinorPlanets: boolean
): BondSummary {
  // Generate both charts
  const [y1, m1, d1] = userProfile.date.split("-").map(Number);
  const [h1, mi1] = userProfile.time.split(":").map(Number);
  const [y2, m2, d2] = partnerProfile.date.split("-").map(Number);
  const [h2, mi2] = partnerProfile.time.split(":").map(Number);

  const pos1 = calculatePlanetPositions(y1, m1, d1, h1, mi1, userProfile.longitude);
  const pos2 = calculatePlanetPositions(y2, m2, d2, h2, mi2, partnerProfile.longitude);
  const gst1 = calculateGST(y1, m1, d1, h1, mi1, userProfile.longitude);
  const gst2 = calculateGST(y2, m2, d2, h2, mi2, partnerProfile.longitude);

  const raw1 = generateAstroLines(pos1, gst1, "user");
  const raw2 = generateAstroLines(pos2, gst2, "partner");
  const filtered1 = filterAstroLines(raw1, includeMinorPlanets);
  const filtered2 = filterAstroLines(raw2, includeMinorPlanets);
  const allLines = [...filtered1, ...filtered2];

  const { overlaps } = tagSynastryOverlaps(allLines);

  // Enrich each overlap with interpretation + cities
  const insights: OverlapInsight[] = overlaps.map((o) => {
    const interp = getInterpretation(o.planet, o.lineType);
    // Find cities near the user's version of this line
    const userSegments = filtered1.filter(
      (l) => l.planet === o.planet && l.lineType === o.lineType
    );
    const nearbyCities = findCitiesNearLine(userSegments, 500).slice(0, 3);

    return {
      planet: o.planet,
      lineType: o.lineType,
      classification: o.classification,
      proximityDeg: o.proximityDeg,
      themes: interp.themes,
      shortDesc: interp.shortDesc,
      title: interp.title,
      nearbyCities,
    };
  });

  return {
    harmonious: insights.filter((i) => i.classification === "harmonious"),
    challenging: insights.filter((i) => i.classification === "challenging"),
    tension: insights.filter((i) => i.classification === "tension"),
    slightlyPositive: insights.filter((i) => i.classification === "slightly_positive"),
    slightlyChallenging: insights.filter((i) => i.classification === "slightly_challenging"),
    neutralOverlap: insights.filter((i) => i.classification === "neutral_overlap"),
    totalOverlaps: insights.length,
    allOverlaps: insights,
  };
}
