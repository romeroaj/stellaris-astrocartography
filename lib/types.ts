export interface BirthData {
  id: string;
  name: string;
  date: string;
  time: string;
  latitude: number;
  longitude: number;
  locationName: string;
  createdAt: number;
}

export type PlanetName =
  | "sun"
  | "moon"
  | "mercury"
  | "venus"
  | "mars"
  | "jupiter"
  | "saturn"
  | "uranus"
  | "neptune"
  | "pluto"
  | "chiron"
  | "northnode"
  | "southnode"
  | "lilith"
  | "ceres"
  | "pallas"
  | "juno"
  | "vesta";

export type LineType = "MC" | "IC" | "ASC" | "DSC";

export interface PlanetPosition {
  name: PlanetName;
  ra: number;
  dec: number;
  eclipticLon: number;
}

export type OverlapClassification =
  | "harmonious"        // both positive
  | "challenging"       // both difficult
  | "tension"           // one positive + one difficult
  | "slightly_positive" // one positive + one neutral
  | "slightly_challenging" // one difficult + one neutral
  | "neutral_overlap";  // both neutral

export interface AstroLine {
  planet: PlanetName;
  lineType: LineType;
  points: { latitude: number; longitude: number }[];
  /** When in Synastry bond mode: which person's chart this line belongs to */
  sourceId?: "user" | "partner" | "transit";
  /** Whether this line overlaps with the other person's matching line */
  isOverlapping?: boolean;
  /** Classification of the overlap (only set when isOverlapping is true) */
  overlapClassification?: OverlapClassification;
  /** Proximity in degrees to the other person's matching line */
  overlapProximityDeg?: number;
}

/** Jim Lewis influence levels based on distance from planetary line */
export type InfluenceLevel = "very strong" | "strong" | "moderate" | "mild" | "negligible";

export interface LocationAnalysis {
  planet: PlanetName;
  lineType: LineType;
  distance: number;
  influence: InfluenceLevel;
  /** Continuous strength value 0.0–1.0 from exponential decay model */
  strength: number;
}

// ── Cyclocartography Types ────────────────────────────────────────

export type AspectType = "conjunction" | "opposition" | "trine" | "square" | "sextile";

/** Whether this activation comes from a real-time transit or a secondary progression */
export type ActivationSource = "transit" | "progression";

/** A transit or progression aspect between a moving planet and a natal position */
export interface TransitAspect {
  /** The transiting or progressed planet */
  transitPlanet: PlanetName;
  /** The natal planet whose line is being activated */
  natalPlanet: PlanetName;
  /** The type of aspect being formed */
  aspect: AspectType;
  /** Whether this comes from a transit or secondary progression */
  source: ActivationSource;
  /** Current orb in degrees (0 = exact) */
  orb: number;
  /** Whether the aspect is applying (getting closer) or separating */
  applying: boolean;
  /** Ecliptic longitude of the transiting/progressed planet */
  transitLon: number;
  /** Ecliptic longitude of the natal planet */
  natalLon: number;
}

/** An activation window — a date range when a natal line is "lit up" by a transit */
export interface ActivationWindow {
  /** The natal planet line being activated */
  natalPlanet: PlanetName;
  /** Which line types are affected (all 4 for a conjunction to the planet) */
  lineTypes: LineType[];
  /** The transiting/progressed planet causing activation */
  transitPlanet: PlanetName;
  /** The aspect type */
  aspect: AspectType;
  /** Transit or progression */
  source: ActivationSource;
  /** Start date of the activation window (ISO string) */
  startDate: string;
  /** End date of the activation window (ISO string) */
  endDate: string;
  /** Date of exact aspect (ISO string) */
  exactDate: string;
  /** Peak intensity description */
  peakDescription: string;
}

/** A single currently-active line activation for display */
export interface LineActivation {
  /** The natal planet line being activated */
  natalPlanet: PlanetName;
  /** Which line types are activated */
  lineTypes: LineType[];
  /** The transiting/progressed planet causing activation */
  transitPlanet: PlanetName;
  /** The aspect type */
  aspect: AspectType;
  /** Transit or progression */
  source: ActivationSource;
  /** Current orb in degrees */
  orb: number;
  /** Whether the aspect is applying or separating */
  applying: boolean;
  /** Intensity level based on orb */
  intensity: "exact" | "strong" | "moderate" | "fading";
  /** Human-readable summary of what this activation means */
  summary: string;
  /** Short actionable insight */
  insight: string;
}

/** Activation info attached to a city — when its lines are more/less impactful */
export interface CityActivation {
  /** City name */
  cityName: string;
  /** Currently active transits affecting this city's lines */
  activeTransits: LineActivation[];
  /** Next upcoming activation window */
  nextActivation: ActivationWindow | null;
  /** Overall activation strength: how "lit up" the city is right now */
  activationStrength: "peak" | "active" | "building" | "quiet";
  /** Best upcoming period to visit */
  bestVisitWindow: ActivationWindow | null;
}

/** Important date — a significant activation worth notifying about */
export interface ImportantDate {
  /** ISO date string */
  date: string;
  /** What's happening */
  title: string;
  /** Longer explanation */
  description: string;
  /** Which cities are most affected */
  affectedCities: string[];
  /** Significance level */
  significance: "major" | "moderate" | "minor";
  /** Category for filtering */
  category: "travel" | "career" | "love" | "growth" | "caution";
}

/** High-signal city/area marker for simple map mode */
export interface MapHotspot {
  id: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  sentiment: "positive" | "difficult" | "neutral";
  strength: number; // 0.0 - 1.0
  emoji: string;
  theme: string;
  isTransitActive?: boolean;
  details: string;
}
