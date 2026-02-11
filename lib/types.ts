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
  | "pluto";

export type LineType = "MC" | "IC" | "ASC" | "DSC";

export interface PlanetPosition {
  name: PlanetName;
  ra: number;
  dec: number;
  eclipticLon: number;
}

export interface AstroLine {
  planet: PlanetName;
  lineType: LineType;
  points: { latitude: number; longitude: number }[];
}

export interface LocationAnalysis {
  planet: PlanetName;
  lineType: LineType;
  distance: number;
  influence: "very strong" | "strong" | "moderate" | "mild";
}
