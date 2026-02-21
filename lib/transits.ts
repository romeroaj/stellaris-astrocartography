/**
 * Cyclocartography Transit Engine
 *
 * Combines two timing techniques:
 * - Transits (outer planets: Jupiter–Pluto) — real-time planetary positions
 * - Secondary Progressions (inner planets: Sun–Mars, Moon) — 1 day = 1 year
 *
 * Detects aspects between transiting/progressed planets and natal positions,
 * then computes activation windows for natal astrocartographic lines.
 */

import {
  PlanetName,
  PlanetPosition,
  LineType,
  AspectType,
  ActivationSource,
  TransitAspect,
  ActivationWindow,
  LineActivation,
  CityActivation,
  ImportantDate,
} from "./types";
import {
  calculatePlanetPositions,
  calculateGST,
  generateAstroLines,
  findNearestLines,
} from "./astronomy";
import { filterNearbyByImpact } from "./settings";
import { WORLD_CITIES } from "./cities";
import { classifyLine } from "./lineClassification";

// ── Constants ─────────────────────────────────────────────────────

/** Planets tracked via real-time transits (slow-moving outer planets) */
const TRANSIT_PLANETS: PlanetName[] = [
  "jupiter", "saturn", "uranus", "neptune", "pluto",
];

/** Planets tracked via secondary progressions (fast inner planets) */
const PROGRESSION_PLANETS: PlanetName[] = [
  "sun", "moon", "mercury", "venus", "mars",
];

/** Core natal planets whose lines we check for activation */
const NATAL_PLANETS: PlanetName[] = [
  "sun", "moon", "mercury", "venus", "mars",
  "jupiter", "saturn", "uranus", "neptune", "pluto",
];

/** Default aspect definitions: angle and max orb (in degrees) */
const ASPECTS: { type: AspectType; angle: number; orb: number; strength: number }[] = [
  { type: "conjunction", angle: 0, orb: 8, strength: 1.0 },
  { type: "opposition", angle: 180, orb: 7, strength: 0.9 },
  { type: "trine", angle: 120, orb: 6, strength: 0.7 },
  { type: "square", angle: 90, orb: 6, strength: 0.85 },
  { type: "sextile", angle: 60, orb: 4, strength: 0.5 },
];

const TRANSIT_FAVORABILITY_SCORE: Partial<Record<PlanetName, number>> = {
  jupiter: 1.2,
  venus: 1.0,
  sun: 0.8,
  moon: 0.5,
  mercury: 0.3,
  mars: -1.0,
  saturn: -0.9,
  uranus: -0.4,
  neptune: -0.3,
  pluto: -0.6,
};

const ASPECT_FAVORABILITY_SCORE: Record<AspectType, number> = {
  trine: 1.1,
  sextile: 0.9,
  conjunction: 0.5,
  square: -1.1,
  opposition: -0.8,
};

/**
 * Planet-specific orb multipliers based on Gemini research:
 * - Pluto: very tight orb (stays in range for years, so prevent "permanent" activations)
 * - Neptune/Uranus: moderately tight (slow-moving, multi-year transits)
 * - Saturn: standard orb
 * - Jupiter: slightly wider (moves faster, ~1 year per sign)
 * - Progressed Moon: wider orb (moves ~13°/year, provides emotional "ambience")
 * - Progressed Sun/inner: tight (moves ~1°/year, very precise timing)
 */
const PLANET_ORB_MULTIPLIERS: Partial<Record<PlanetName, number>> = {
  pluto: 0.35,     // Very tight — Pluto can be in orb for years otherwise
  neptune: 0.5,    // Tight — Neptune moves ~2°/year
  uranus: 0.55,    // Tight — Uranus moves ~4°/year
  saturn: 0.8,     // Moderate — Saturn moves ~12°/year
  jupiter: 1.0,    // Standard — Jupiter moves ~30°/year
};

/** Progression-specific orb multipliers (day-for-a-year, very slow movement) */
const PROGRESSION_ORB_MULTIPLIERS: Partial<Record<PlanetName, number>> = {
  moon: 0.6,       // Wider for progressed Moon (~13°/year) — 2-3° effective orb
  sun: 0.15,       // Very tight for progressed Sun (~1°/year) — ~1° effective orb
  mercury: 0.2,    // Tight
  venus: 0.15,     // Very tight (~1.2°/year max)
  mars: 0.15,      // Very tight (~0.5°/year)
};

// ── Helpers ───────────────────────────────────────────────────────

function normalizeAngle(a: number): number {
  a = a % 360;
  if (a < 0) a += 360;
  return a;
}

function angleDiff(a: number, b: number): number {
  let diff = normalizeAngle(a) - normalizeAngle(b);
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return diff;
}

function parseDateParts(dateStr: string): { year: number; month: number; day: number } {
  const [year, month, day] = dateStr.split("-").map(Number);
  return { year, month, day };
}

function parseTimeParts(timeStr: string): { hour: number; minute: number } {
  const [hour, minute] = timeStr.split(":").map(Number);
  return { hour, minute };
}

function dateToISOString(d: Date): string {
  return d.toISOString().split("T")[0];
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function daysBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24);
}

// ── Core: Get planet positions for any date ───────────────────────

/**
 * Calculate planet positions for an arbitrary date (used for transits).
 * This reuses the existing astronomy engine — it already accepts any date.
 */
export function getTransitPositions(date: Date): PlanetPosition[] {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();
  const minute = date.getMinutes();
  return calculatePlanetPositions(year, month, day, hour, minute);
}

// ── Core: Secondary Progressions ──────────────────────────────────

/**
 * Calculate secondary progressed positions.
 * Rule: 1 day after birth = 1 year of life.
 * So for someone born on Jan 1 2000, their progressions for age 25
 * are the planet positions on Jan 26 2000.
 */
export function getProgressedPositions(
  birthDate: string,
  birthTime: string,
  birthLongitude: number,
  targetDate: Date
): PlanetPosition[] {
  const birth = parseDateParts(birthDate);
  const time = parseTimeParts(birthTime);

  const birthDateObj = new Date(birth.year, birth.month - 1, birth.day);
  const yearsElapsed = daysBetween(birthDateObj, targetDate) / 365.25;

  // 1 year of life = 1 day after birth
  const progressedDate = addDays(birthDateObj, yearsElapsed);

  const progYear = progressedDate.getFullYear();
  const progMonth = progressedDate.getMonth() + 1;
  const progDay = progressedDate.getDate();

  return calculatePlanetPositions(
    progYear, progMonth, progDay, time.hour, time.minute, birthLongitude
  );
}

// ── Core: Aspect Detection ────────────────────────────────────────

/**
 * Find all aspects between a set of transiting/progressed positions
 * and natal positions.
 */
export function findTransitAspects(
  transitPositions: PlanetPosition[],
  natalPositions: PlanetPosition[],
  source: ActivationSource,
  planetFilter: PlanetName[]
): TransitAspect[] {
  const aspects: TransitAspect[] = [];

  for (const transit of transitPositions) {
    if (!planetFilter.includes(transit.name)) continue;

    // Get planet-specific orb multiplier
    const orbMultiplier = source === "progression"
      ? (PROGRESSION_ORB_MULTIPLIERS[transit.name] ?? 0.2)
      : (PLANET_ORB_MULTIPLIERS[transit.name] ?? 1.0);

    for (const natal of natalPositions) {
      if (!NATAL_PLANETS.includes(natal.name)) continue;
      // Skip same-planet transits for progressions (progressed Sun to natal Sun
      // is always ~0° for young people and not meaningful)
      if (source === "progression" && transit.name === natal.name) continue;

      const diff = Math.abs(angleDiff(transit.eclipticLon, natal.eclipticLon));

      for (const aspectDef of ASPECTS) {
        const orbFromAspect = Math.abs(diff - aspectDef.angle);
        const maxOrb = aspectDef.orb * orbMultiplier;

        if (orbFromAspect <= maxOrb) {
          // Determine if applying: check if the orb is decreasing
          // Simplified: transit planet longitude approaching the exact aspect angle
          const exactLon = normalizeAngle(natal.eclipticLon + aspectDef.angle);
          const currentDiff = angleDiff(transit.eclipticLon, exactLon);
          const applying = currentDiff < 0 && currentDiff > -maxOrb;

          aspects.push({
            transitPlanet: transit.name,
            natalPlanet: natal.name,
            aspect: aspectDef.type,
            source,
            orb: orbFromAspect,
            applying,
            transitLon: transit.eclipticLon,
            natalLon: natal.eclipticLon,
          });
        }
      }
    }
  }

  // Sort by orb (tightest first)
  return aspects.sort((a, b) => a.orb - b.orb);
}

// ── Line Activation Logic ─────────────────────────────────────────

function getIntensity(orb: number, maxOrb: number): LineActivation["intensity"] {
  const ratio = orb / Math.max(maxOrb, 0.5);
  if (ratio < 0.1) return "exact";
  if (ratio < 0.4) return "strong";
  if (ratio < 0.7) return "moderate";
  return "fading";
}

function getAspectSymbol(aspect: AspectType): string {
  switch (aspect) {
    case "conjunction": return "☌";
    case "opposition": return "☍";
    case "trine": return "△";
    case "square": return "□";
    case "sextile": return "⚹";
  }
}

function getPlanetLabel(planet: PlanetName): string {
  return planet.charAt(0).toUpperCase() + planet.slice(1);
}

/** Tiered window type and short label per transit + aspect (plan 1.2) */
function getWindowTypeAndLabel(transitPlanet: PlanetName, aspect: AspectType): {
  windowType: "benefic" | "evolutionary" | "neutral";
  shortLabel: string;
} {
  const isHarmonious = aspect === "trine" || aspect === "sextile";
  const isBeneficPlanet = transitPlanet === "jupiter" || transitPlanet === "venus";
  const isHeavyPlanet = transitPlanet === "saturn" || transitPlanet === "pluto" || transitPlanet === "uranus" || transitPlanet === "mars";

  if (isBeneficPlanet && (isHarmonious || aspect === "conjunction")) {
    return { windowType: "benefic", shortLabel: isHarmonious ? "Abundance Peak" : "Optimal Window for Flow" };
  }
  if (transitPlanet === "saturn") {
    return { windowType: "evolutionary", shortLabel: "Structure Phase" };
  }
  if (transitPlanet === "pluto") {
    return { windowType: "evolutionary", shortLabel: "Deep Transformation" };
  }
  if (transitPlanet === "uranus") {
    return { windowType: "evolutionary", shortLabel: "Sudden Pivot" };
  }
  if (transitPlanet === "mars") {
    return { windowType: "evolutionary", shortLabel: "Action Phase" };
  }
  return { windowType: "neutral", shortLabel: "Activation Window" };
}

function getAspectQuality(aspect: AspectType): "harmonious" | "challenging" | "neutral" {
  switch (aspect) {
    case "conjunction": return "neutral";
    case "trine":
    case "sextile": return "harmonious";
    case "square":
    case "opposition": return "challenging";
  }
}

function sentimentToScore(sentiment: ReturnType<typeof classifyLine>["sentiment"]): number {
  if (sentiment === "positive") return 1;
  if (sentiment === "difficult") return -1;
  return 0;
}

/** Generate a human-readable summary for a transit aspect */
function generateActivationSummary(aspect: TransitAspect): string {
  const transitLabel = getPlanetLabel(aspect.transitPlanet);
  const natalLabel = getPlanetLabel(aspect.natalPlanet);
  const aspectSymbol = getAspectSymbol(aspect.aspect);
  const sourceLabel = aspect.source === "progression" ? "Progressed" : "Transiting";
  const quality = getAspectQuality(aspect.aspect);
  const applyingSep = aspect.applying ? "applying" : "separating";

  const qualityDesc = quality === "harmonious"
    ? "supportive, flowing energy"
    : quality === "challenging"
      ? "activating tension and growth"
      : "powerful focus and intensity";

  return `${sourceLabel} ${transitLabel} ${aspectSymbol} your natal ${natalLabel} — ${qualityDesc} (${applyingSep}, orb ${aspect.orb.toFixed(1)}°)`;
}

/** Generate an actionable insight for a transit aspect */
function generateActivationInsight(aspect: TransitAspect): string {
  const quality = getAspectQuality(aspect.aspect);
  const natalLabel = getPlanetLabel(aspect.natalPlanet);

  const insights: Record<string, Record<string, string>> = {
    sun: {
      harmonious: "Your identity and vitality lines are energized — great for career moves and self-expression in these locations.",
      challenging: "Your sense of self is being tested in these regions — powerful for growth but expect some friction.",
      neutral: "Intense focus on identity and purpose — these places amplify who you are right now.",
    },
    moon: {
      harmonious: "Emotional connections and home life are flowing easily — ideal for visiting nurturing places.",
      challenging: "Emotional triggers may surface in these areas — healing opportunity but plan for sensitivity.",
      neutral: "Deep emotional processing — these locations will feel intensely personal right now.",
    },
    venus: {
      harmonious: "Love, beauty, and financial luck are activated — perfect timing for romantic getaways or money moves.",
      challenging: "Relationship dynamics are being tested here — good for working through issues, not ideal for new romance.",
      neutral: "Magnetic attraction energy — relationships and finances demand attention in these zones.",
    },
    mars: {
      harmonious: "Energy and ambition are supercharged — great for athletic pursuits or launching projects in these cities.",
      challenging: "Conflict or frustration potential is high — channel this into productive action, avoid confrontations.",
      neutral: "Raw drive and initiative — these places push you to act boldly right now.",
    },
    jupiter: {
      harmonious: "Expansion and luck are on your side — one of the best times to travel to or invest in these locations.",
      challenging: "Overextension risk — opportunities look bigger than they are. Stay grounded while exploring.",
      neutral: "Growth energy is concentrated here — big developments are possible if you show up.",
    },
    saturn: {
      harmonious: "Discipline pays off — these locations support building lasting structures, careers, and commitments.",
      challenging: "Hard lessons and restrictions may come up — but what you build now under pressure will endure.",
      neutral: "Reality checks incoming — these places demand maturity and long-term thinking right now.",
    },
    uranus: {
      harmonious: "Unexpected positive changes — these cities may surprise you with breakthroughs and innovations.",
      challenging: "Disruption and instability — exciting but unpredictable. Not the best time for major commitments here.",
      neutral: "Electric, awakening energy — these places shake up your routine in ways you can't predict.",
    },
    neptune: {
      harmonious: "Spiritual and creative inspiration flows freely — perfect for retreats, art, and romantic escapes.",
      challenging: "Confusion and illusion risk — verify everything twice in these areas. Beautiful but potentially deceptive.",
      neutral: "Dreamy, dissolving energy — boundaries blur in these places. Great for imagination, tricky for decisions.",
    },
    pluto: {
      harmonious: "Deep transformation support — these locations empower you to shed old patterns and rise stronger.",
      challenging: "Power struggles and intense experiences — profound growth potential but emotionally demanding.",
      neutral: "Transformative intensity — these cities pull you into deep, potentially life-changing territory.",
    },
  };

  const planetInsights = insights[aspect.natalPlanet];
  if (planetInsights) {
    return planetInsights[quality] || `Your ${natalLabel} lines are activated — pay attention to themes of ${natalLabel.toLowerCase()} energy.`;
  }

  return `Your ${natalLabel} lines are currently activated — these locations carry extra significance right now.`;
}

// ── Main API ──────────────────────────────────────────────────────

/**
 * Get all currently active line activations for a given birth chart and target date.
 * This is the main entry point for the cyclocartography feature.
 */
export function getCurrentActivations(
  birthDate: string,
  birthTime: string,
  birthLongitude: number,
  targetDate: Date = new Date()
): LineActivation[] {
  // 1. Get natal positions
  const birth = parseDateParts(birthDate);
  const time = parseTimeParts(birthTime);
  const natalPositions = calculatePlanetPositions(
    birth.year, birth.month, birth.day, time.hour, time.minute, birthLongitude
  );

  // 2. Get current transit positions (outer planets)
  const transitPositions = getTransitPositions(targetDate);
  const transitAspects = findTransitAspects(
    transitPositions, natalPositions, "transit", TRANSIT_PLANETS
  );

  // 3. Get progressed positions (inner planets)
  const progressedPositions = getProgressedPositions(
    birthDate, birthTime, birthLongitude, targetDate
  );
  const progressionAspects = findTransitAspects(
    progressedPositions, natalPositions, "progression", PROGRESSION_PLANETS
  );

  // 4. Combine and convert to LineActivations
  const allAspects = [...transitAspects, ...progressionAspects];
  const activations: LineActivation[] = [];
  const seen = new Set<string>();

  for (const aspect of allAspects) {
    // Deduplicate: one activation per natal planet per transit planet
    const key = `${aspect.transitPlanet}-${aspect.natalPlanet}-${aspect.aspect}-${aspect.source}`;
    if (seen.has(key)) continue;
    seen.add(key);

    activations.push({
      natalPlanet: aspect.natalPlanet,
      lineTypes: ["MC", "IC", "ASC", "DSC"],
      transitPlanet: aspect.transitPlanet,
      aspect: aspect.aspect,
      source: aspect.source,
      orb: aspect.orb,
      applying: aspect.applying,
      intensity: getIntensity(aspect.orb,
        aspect.source === "progression"
          ? 8 * (PROGRESSION_ORB_MULTIPLIERS[aspect.transitPlanet] ?? 0.2)
          : 8 * (PLANET_ORB_MULTIPLIERS[aspect.transitPlanet] ?? 1.0)
      ),
      summary: generateActivationSummary(aspect),
      insight: generateActivationInsight(aspect),
    });
  }

  // Sort by intensity (exact > strong > moderate > fading), then by orb
  const intensityOrder = { exact: 0, strong: 1, moderate: 2, fading: 3 };
  return activations.sort((a, b) => {
    const intensityDiff = intensityOrder[a.intensity] - intensityOrder[b.intensity];
    if (intensityDiff !== 0) return intensityDiff;
    return a.orb - b.orb;
  });
}

/**
 * Scan a range of dates to find activation windows for a natal chart.
 * Returns date ranges when specific natal lines are activated.
 */
export function findActivationWindows(
  birthDate: string,
  birthTime: string,
  birthLongitude: number,
  startDate: Date,
  endDate: Date,
  stepDays: number = 7
): ActivationWindow[] {
  const birth = parseDateParts(birthDate);
  const time = parseTimeParts(birthTime);
  const natalPositions = calculatePlanetPositions(
    birth.year, birth.month, birth.day, time.hour, time.minute, birthLongitude
  );

  // Track windows: key = "transitPlanet-natalPlanet-aspect-source"
  const windowMap = new Map<string, {
    natalPlanet: PlanetName;
    transitPlanet: PlanetName;
    aspect: AspectType;
    source: ActivationSource;
    dates: { date: Date; orb: number }[];
  }>();

  let current = new Date(startDate);
  while (current <= endDate) {
    // Check transits
    const transitPositions = getTransitPositions(current);
    const transitAspects = findTransitAspects(
      transitPositions, natalPositions, "transit", TRANSIT_PLANETS
    );

    // Check progressions
    const progressedPositions = getProgressedPositions(
      birthDate, birthTime, birthLongitude, current
    );
    const progressionAspects = findTransitAspects(
      progressedPositions, natalPositions, "progression", PROGRESSION_PLANETS
    );

    for (const aspect of [...transitAspects, ...progressionAspects]) {
      const key = `${aspect.transitPlanet}-${aspect.natalPlanet}-${aspect.aspect}-${aspect.source}`;
      if (!windowMap.has(key)) {
        windowMap.set(key, {
          natalPlanet: aspect.natalPlanet,
          transitPlanet: aspect.transitPlanet,
          aspect: aspect.aspect,
          source: aspect.source,
          dates: [],
        });
      }
      windowMap.get(key)!.dates.push({ date: new Date(current), orb: aspect.orb });
    }

    current = addDays(current, stepDays);
  }

  // Convert tracked date ranges into ActivationWindow objects
  const windows: ActivationWindow[] = [];

  for (const [, data] of windowMap) {
    if (data.dates.length === 0) continue;

    // Find contiguous date ranges (gap > 2*stepDays breaks the window)
    const sorted = data.dates.sort((a, b) => a.date.getTime() - b.date.getTime());
    let windowStart = sorted[0].date;
    let prevDate = sorted[0].date;
    let minOrb = sorted[0].orb;
    let exactDate = sorted[0].date;

    const closeWindow = () => {
      const transitLabel = getPlanetLabel(data.transitPlanet);
      const natalLabel = getPlanetLabel(data.natalPlanet);
      const sourceLabel = data.source === "progression" ? "Progressed" : "Transiting";
      const { windowType, shortLabel } = getWindowTypeAndLabel(data.transitPlanet, data.aspect);

      windows.push({
        natalPlanet: data.natalPlanet,
        lineTypes: ["MC", "IC", "ASC", "DSC"],
        transitPlanet: data.transitPlanet,
        aspect: data.aspect,
        source: data.source,
        startDate: dateToISOString(windowStart),
        endDate: dateToISOString(prevDate),
        exactDate: dateToISOString(exactDate),
        peakDescription: `${sourceLabel} ${transitLabel} ${getAspectSymbol(data.aspect)} natal ${natalLabel} (exact ${dateToISOString(exactDate)})`,
        windowType,
        shortLabel,
      });
    };

    for (let i = 1; i < sorted.length; i++) {
      const gap = daysBetween(prevDate, sorted[i].date);
      if (gap > stepDays * 2.5) {
        closeWindow();
        windowStart = sorted[i].date;
        minOrb = sorted[i].orb;
        exactDate = sorted[i].date;
      } else if (sorted[i].orb < minOrb) {
        minOrb = sorted[i].orb;
        exactDate = sorted[i].date;
      }
      prevDate = sorted[i].date;
    }
    closeWindow();
  }

  return windows.sort((a, b) => a.startDate.localeCompare(b.startDate));
}

/** Range options for transit synthesis */
export type TransitSynthesisRange = "1m" | "3m" | "1y";

export interface TransitSynthesisCity {
  name: string;
  country: string;
  lat: number;
  lon: number;
  score: number;
  topWindow: ActivationWindow | null;
  windowCount: number;
}

export interface TransitSynthesis {
  /** Cities with strong benefic activations (Jupiter/Venus) — optimal for flow */
  optimal: TransitSynthesisCity[];
  /** Cities with strong heavy activations (Saturn/Pluto/Uranus/Mars) — intense/transformative */
  intense: TransitSynthesisCity[];
}

/**
 * Aggregate best vs intense places to go over a time range (1m, 3m, 1y).
 * Uses findActivationWindows and city natal-line proximity.
 */
export function getTransitSynthesis(
  birthDate: string,
  birthTime: string,
  birthLongitude: number,
  range: TransitSynthesisRange,
  cities: { name: string; country: string; lat: number; lon: number }[] = WORLD_CITIES.map((c) => ({
    name: c.name, country: c.country, lat: c.latitude, lon: c.longitude,
  })),
  hideMildImpacts: boolean = false
): TransitSynthesis {
  const startDate = new Date();
  const days = range === "1m" ? 31 : range === "3m" ? 92 : 365;
  const endDate = addDays(startDate, days);
  const windows = findActivationWindows(
    birthDate, birthTime, birthLongitude, startDate, endDate, 14
  );

  const birth = parseDateParts(birthDate);
  const time = parseTimeParts(birthTime);
  const natalPositions = calculatePlanetPositions(
    birth.year, birth.month, birth.day, time.hour, time.minute, birthLongitude
  );
  const gst = calculateGST(
    birth.year, birth.month, birth.day, time.hour, time.minute, birthLongitude
  );
  const astroLines = generateAstroLines(natalPositions, gst);

  const beneficPlanets = new Set<PlanetName>(["jupiter", "venus"]);
  const heavyPlanets = new Set<PlanetName>(["saturn", "pluto", "uranus", "mars"]);
  const beneficAspects = new Set<AspectType>(["trine", "sextile", "conjunction"]);

  const optimalScores: { city: typeof cities[0]; score: number; topWindow: ActivationWindow | null; windowCount: number }[] = [];
  const intenseScores: { city: typeof cities[0]; score: number; topWindow: ActivationWindow | null; windowCount: number }[] = [];

  for (const city of cities) {
    const nearby = filterNearbyByImpact(
      findNearestLines(astroLines, city.lat, city.lon, 15),
      hideMildImpacts
    );
    const nearbyPlanets = new Set(nearby.map((l) => l.planet));

    let beneficScore = 0;
    let heavyScore = 0;
    let bestBenefic: ActivationWindow | null = null;
    let bestBeneficS = 0;
    let bestHeavy: ActivationWindow | null = null;
    let bestHeavyS = 0;
    let beneficCount = 0;
    let heavyCount = 0;

    for (const w of windows) {
      if (!nearbyPlanets.has(w.natalPlanet)) continue;

      const lineDist = nearby.find((l) => l.planet === w.natalPlanet)?.distance ?? 1000;
      const proximity = Math.exp(-0.693 * lineDist / 310);
      const transitWeight = TRANSIT_FAVORABILITY_SCORE[w.transitPlanet] ?? 0;
      const aspectWeight = ASPECT_FAVORABILITY_SCORE[w.aspect];

      if (beneficPlanets.has(w.transitPlanet) && beneficAspects.has(w.aspect)) {
        const s = (transitWeight + aspectWeight + 1) * proximity;
        beneficScore += s;
        beneficCount++;
        if (s > bestBeneficS) { bestBeneficS = s; bestBenefic = w; }
      }
      if (heavyPlanets.has(w.transitPlanet)) {
        const s = (Math.abs(transitWeight) + Math.abs(aspectWeight) + 1) * proximity;
        heavyScore += s;
        heavyCount++;
        if (s > bestHeavyS) { bestHeavyS = s; bestHeavy = w; }
      }
    }

    if (beneficScore > 0) {
      optimalScores.push({
        city,
        score: beneficScore,
        topWindow: bestBenefic,
        windowCount: beneficCount,
      });
    }
    if (heavyScore > 0) {
      intenseScores.push({
        city,
        score: heavyScore,
        topWindow: bestHeavy,
        windowCount: heavyCount,
      });
    }
  }

  const toResult = (list: typeof optimalScores): TransitSynthesisCity[] =>
    list
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map(({ city, score, topWindow, windowCount }) => ({
        name: city.name,
        country: city.country,
        lat: city.lat,
        lon: city.lon,
        score,
        topWindow,
        windowCount,
      }));

  return {
    optimal: toResult(optimalScores),
    intense: toResult(intenseScores),
  };
}

/**
 * Get activation info for a specific city on a given date.
 * Combines transit info with the city's natal line analysis.
 */
export function getCityActivation(
  cityName: string,
  cityLat: number,
  cityLon: number,
  birthDate: string,
  birthTime: string,
  birthLongitude: number,
  targetDate: Date = new Date(),
  hideMildImpacts: boolean = false
): CityActivation {
  // Get natal lines near this city
  const birth = parseDateParts(birthDate);
  const time = parseTimeParts(birthTime);
  const natalPositions = calculatePlanetPositions(
    birth.year, birth.month, birth.day, time.hour, time.minute, birthLongitude
  );
  const gst = calculateGST(
    birth.year, birth.month, birth.day, time.hour, time.minute, birthLongitude
  );
  const astroLines = generateAstroLines(natalPositions, gst);
  const nearbyLines = filterNearbyByImpact(
    findNearestLines(astroLines, cityLat, cityLon, 15),
    hideMildImpacts
  );
  const nearbyPlanets = new Set(nearbyLines.map((l) => l.planet));
  const nearbyPlanetSentiment = new Map<PlanetName, number>();

  for (const line of nearbyLines) {
    const lineSentiment = classifyLine(line.planet, line.lineType).sentiment;
    const sentimentScore = sentimentToScore(lineSentiment);
    const prev = nearbyPlanetSentiment.get(line.planet);
    // Keep the strongest-magnitude local tone for each natal planet near this city.
    if (prev === undefined || Math.abs(sentimentScore) > Math.abs(prev)) {
      nearbyPlanetSentiment.set(line.planet, sentimentScore);
    }
  }

  // Get current activations
  const allActivations = getCurrentActivations(
    birthDate, birthTime, birthLongitude, targetDate
  );

  // Filter to only activations that affect lines near this city
  const cityActivations = allActivations.filter((a) => nearbyPlanets.has(a.natalPlanet));

  // Determine overall activation strength
  let strength: CityActivation["activationStrength"] = "quiet";
  if (cityActivations.some((a) => a.intensity === "exact")) {
    strength = "peak";
  } else if (cityActivations.some((a) => a.intensity === "strong")) {
    strength = "active";
  } else if (cityActivations.length > 0) {
    strength = "building";
  }

  // Find next activation window (scan next 12 months)
  const windowStart = new Date(targetDate);
  const windowEnd = addDays(windowStart, 365);
  const windows = findActivationWindows(
    birthDate, birthTime, birthLongitude, windowStart, windowEnd, 14
  );

  const cityWindows = windows.filter((w) => nearbyPlanets.has(w.natalPlanet));
  const nextActivation = cityWindows.length > 0 ? cityWindows[0] : null;

  // Most supportive visit window:
  // combines transit/aspect quality with whether the natal line near this city
  // is generally supportive or challenging.
  const scoredWindows = cityWindows
    .map((w) => {
      const natalScore = nearbyPlanetSentiment.get(w.natalPlanet) ?? 0;
      const transitScore = TRANSIT_FAVORABILITY_SCORE[w.transitPlanet] ?? 0;
      const aspectScore = ASPECT_FAVORABILITY_SCORE[w.aspect];
      const sourceScore = w.source === "progression" ? 0.15 : 0;
      return { window: w, score: natalScore + transitScore + aspectScore + sourceScore };
    })
    .sort((a, b) => b.score - a.score);

  const bestVisitWindow = scoredWindows.find((entry) => entry.score >= 1.2)?.window || null;

  return {
    cityName,
    activeTransits: cityActivations,
    nextActivation,
    activationStrength: strength,
    bestVisitWindow,
  };
}

/**
 * Find important dates over a time range — significant activations
 * worth notifying about. Filters to only major, actionable events.
 */
export function findImportantDates(
  birthDate: string,
  birthTime: string,
  birthLongitude: number,
  startDate: Date,
  endDate: Date,
  cities?: { name: string; lat: number; lon: number }[]
): ImportantDate[] {
  const windows = findActivationWindows(
    birthDate, birthTime, birthLongitude, startDate, endDate, 7
  );

  const importantDates: ImportantDate[] = [];

  // Only surface significant aspects (conjunction, opposition, trine with major planets)
  const significantAspects: AspectType[] = ["conjunction", "opposition", "trine"];
  const majorPlanets: PlanetName[] = [
    "jupiter", "saturn", "uranus", "neptune", "pluto",
  ];

  for (const window of windows) {
    if (!significantAspects.includes(window.aspect)) continue;
    if (window.source === "transit" && !majorPlanets.includes(window.transitPlanet)) continue;

    const quality = getAspectQuality(window.aspect);
    const transitLabel = getPlanetLabel(window.transitPlanet);
    const natalLabel = getPlanetLabel(window.natalPlanet);

    let category: ImportantDate["category"] = "growth";
    if (["venus", "moon"].includes(window.natalPlanet)) category = "love";
    if (["sun", "jupiter", "saturn"].includes(window.natalPlanet)) category = "career";
    if (quality === "challenging") category = "caution";
    if (window.natalPlanet === "jupiter" && quality === "harmonious") category = "travel";

    let significance: ImportantDate["significance"] = "minor";
    if (window.aspect === "conjunction") significance = "major";
    else if (window.aspect === "opposition") significance = "moderate";
    else if (majorPlanets.includes(window.transitPlanet)) significance = "moderate";

    // Find affected cities
    let affectedCities: string[] = [];
    if (cities) {
      const birth = parseDateParts(birthDate);
      const time = parseTimeParts(birthTime);
      const natalPositions = calculatePlanetPositions(
        birth.year, birth.month, birth.day, time.hour, time.minute, birthLongitude
      );
      const gst = calculateGST(
        birth.year, birth.month, birth.day, time.hour, time.minute, birthLongitude
      );
      const astroLines = generateAstroLines(natalPositions, gst);

      affectedCities = cities
        .filter((city) => {
          const nearby = findNearestLines(astroLines, city.lat, city.lon, 10);
          return nearby.some((l) => l.planet === window.natalPlanet);
        })
        .map((c) => c.name)
        .slice(0, 5);
    }

    const title = quality === "harmonious"
      ? `${transitLabel} activates your ${natalLabel} lines — opportunity window`
      : quality === "challenging"
        ? `${transitLabel} challenges your ${natalLabel} lines — growth period`
        : `${transitLabel} conjuncts your ${natalLabel} lines — intense focus`;

    const description = `From ${window.startDate} to ${window.endDate}, ${window.peakDescription}. ${
      quality === "harmonious"
        ? "This is a favorable period for activities related to your " + natalLabel.toLowerCase() + " energy."
        : quality === "challenging"
          ? "Expect some friction in " + natalLabel.toLowerCase() + "-related areas, but this tension drives meaningful growth."
          : "A concentrated period of " + natalLabel.toLowerCase() + " themes — pay close attention to what comes up."
    }`;

    importantDates.push({
      date: window.exactDate,
      title,
      description,
      affectedCities,
      significance,
      category,
    });
  }

  // Limit to avoid daily-horoscope overload: max ~2–3 per month
  const monthCounts = new Map<string, number>();
  return importantDates.filter((d) => {
    const monthKey = d.date.slice(0, 7);
    const count = monthCounts.get(monthKey) || 0;
    if (d.significance === "major" || count < 3) {
      monthCounts.set(monthKey, count + 1);
      return true;
    }
    return false;
  });
}
