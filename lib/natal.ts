/**
 * Natal chart utilities: Zodiac sign computation from planet positions.
 * Uses ecliptic longitude data already computed by astronomy.ts.
 */
import { PlanetPosition } from "./types";

export interface ZodiacInfo {
    sign: string;
    symbol: string;
    element: "Fire" | "Earth" | "Air" | "Water";
    degree: number; // degree within the sign (0-29)
}

const SIGNS: { name: string; symbol: string; element: ZodiacInfo["element"] }[] = [
    { name: "Aries", symbol: "♈", element: "Fire" },
    { name: "Taurus", symbol: "♉", element: "Earth" },
    { name: "Gemini", symbol: "♊", element: "Air" },
    { name: "Cancer", symbol: "♋", element: "Water" },
    { name: "Leo", symbol: "♌", element: "Fire" },
    { name: "Virgo", symbol: "♍", element: "Earth" },
    { name: "Libra", symbol: "♎", element: "Air" },
    { name: "Scorpio", symbol: "♏", element: "Water" },
    { name: "Sagittarius", symbol: "♐", element: "Fire" },
    { name: "Capricorn", symbol: "♑", element: "Earth" },
    { name: "Aquarius", symbol: "♒", element: "Air" },
    { name: "Pisces", symbol: "♓", element: "Water" },
];

const DEG = Math.PI / 180;

/**
 * Get zodiac sign from ecliptic longitude (0-360°).
 */
export function getZodiacSign(eclipticLon: number): ZodiacInfo {
    // Normalize to 0-360
    let lon = eclipticLon % 360;
    if (lon < 0) lon += 360;
    const signIndex = Math.floor(lon / 30);
    const degree = Math.floor(lon % 30);
    const s = SIGNS[signIndex];
    return { sign: s.name, symbol: s.symbol, element: s.element, degree };
}

/**
 * Compute the Ascendant ecliptic longitude from LST, latitude, and obliquity.
 * Formula: tan(ASC) = -cos(LST) / (sin(obliquity) * tan(lat) + cos(obliquity) * sin(LST))
 */
export function computeAscendant(lstDegrees: number, latDegrees: number, obliquityDegrees: number): number {
    const lst = lstDegrees * DEG;
    const lat = latDegrees * DEG;
    const obl = obliquityDegrees * DEG;

    const numerator = -Math.cos(lst);
    const denominator = Math.sin(obl) * Math.tan(lat) + Math.cos(obl) * Math.sin(lst);

    let ascRad = Math.atan2(numerator, denominator);
    let asc = ascRad / DEG;

    // Normalize to 0-360
    if (asc < 0) asc += 360;

    return asc;
}

/**
 * Element color mapping for UI
 */
export const ELEMENT_COLORS: Record<ZodiacInfo["element"], string> = {
    Fire: "#EF4444",
    Earth: "#8B7355",
    Air: "#60A5FA",
    Water: "#06B6D4",
};

export interface NatalChart {
    sun: ZodiacInfo;
    moon: ZodiacInfo;
    rising: ZodiacInfo;
}

/**
 * Compute the full natal "big three" from planet positions and birth coordinates.
 * @param positions — from calculatePlanetPositions()
 * @param gst — Greenwich Sidereal Time in degrees from calculateGST()
 * @param birthLat — birth latitude
 * @param birthLon — birth longitude
 */
export function computeNatalChart(
    positions: PlanetPosition[],
    gst: number,
    birthLat: number,
    birthLon: number
): NatalChart {
    const sunPos = positions.find(p => p.name === "sun")!;
    const moonPos = positions.find(p => p.name === "moon")!;

    const sun = getZodiacSign(sunPos.eclipticLon);
    const moon = getZodiacSign(moonPos.eclipticLon);

    // Local Sidereal Time = GST + birth longitude
    const lst = gst + birthLon;

    // Obliquity of the ecliptic (~23.44° for current epoch, good enough)
    const obliquity = 23.4393;

    const ascLon = computeAscendant(lst, birthLat, obliquity);
    const rising = getZodiacSign(ascLon);

    return { sun, moon, rising };
}
