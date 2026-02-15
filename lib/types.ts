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
  sourceId?: "user" | "partner";
  /** Whether this line overlaps with the other person's matching line */
  isOverlapping?: boolean;
  /** Classification of the overlap (only set when isOverlapping is true) */
  overlapClassification?: OverlapClassification;
  /** Proximity in degrees to the other person's matching line */
  overlapProximityDeg?: number;
}

export interface LocationAnalysis {
  planet: PlanetName;
  lineType: LineType;
  distance: number;
  influence: "very strong" | "strong" | "moderate" | "mild";
}
