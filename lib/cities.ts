import { AstroLine } from "./types";

export interface City {
    name: string;
    country: string;
    latitude: number;
    longitude: number;
}

/**
 * Unified global city list (~90 cities) used by both line-detail and insights.
 * Covers every inhabited continent with a mix of capitals, cultural hubs,
 * and popular travel/relocation destinations. Kept curated so insights
 * remain meaningful for recognizable places.
 */
export const WORLD_CITIES: City[] = [
    // ── North America ──
    { name: "New York City", country: "USA", latitude: 40.7128, longitude: -74.0060 },
    { name: "Los Angeles", country: "USA", latitude: 34.0522, longitude: -118.2437 },
    { name: "Chicago", country: "USA", latitude: 41.8781, longitude: -87.6298 },
    { name: "Houston", country: "USA", latitude: 29.7604, longitude: -95.3698 },
    { name: "Phoenix", country: "USA", latitude: 33.4484, longitude: -112.0740 },
    { name: "Philadelphia", country: "USA", latitude: 39.9526, longitude: -75.1652 },
    { name: "San Antonio", country: "USA", latitude: 29.4241, longitude: -98.4936 },
    { name: "San Diego", country: "USA", latitude: 32.7157, longitude: -117.1611 },
    { name: "Dallas", country: "USA", latitude: 32.7767, longitude: -96.7970 },
    { name: "San Jose", country: "USA", latitude: 37.3382, longitude: -121.8863 },
    { name: "Austin", country: "USA", latitude: 30.2672, longitude: -97.7431 },
    { name: "San Francisco", country: "USA", latitude: 37.7749, longitude: -122.4194 },
    { name: "Seattle", country: "USA", latitude: 47.6062, longitude: -122.3321 },
    { name: "Denver", country: "USA", latitude: 39.7392, longitude: -104.9903 },
    { name: "Boston", country: "USA", latitude: 42.3601, longitude: -71.0589 },
    { name: "Washington, D.C.", country: "USA", latitude: 38.9072, longitude: -77.0369 },
    { name: "Atlanta", country: "USA", latitude: 33.7490, longitude: -84.3880 },
    { name: "Miami", country: "USA", latitude: 25.7617, longitude: -80.1918 },
    { name: "Nashville", country: "USA", latitude: 36.1627, longitude: -86.7816 },
    { name: "Las Vegas", country: "USA", latitude: 36.1699, longitude: -115.1398 },
    { name: "Portland", country: "USA", latitude: 45.5152, longitude: -122.6784 },
    { name: "New Orleans", country: "USA", latitude: 29.9511, longitude: -90.0715 },
    { name: "Honolulu", country: "USA", latitude: 21.3069, longitude: -157.8583 },
    { name: "Toronto", country: "Canada", latitude: 43.6510, longitude: -79.3470 },
    { name: "Montreal", country: "Canada", latitude: 45.5017, longitude: -73.5673 },
    { name: "Vancouver", country: "Canada", latitude: 49.2827, longitude: -123.1207 },
    { name: "Mexico City", country: "Mexico", latitude: 19.4326, longitude: -99.1332 },

    // ── Central / South America & Caribbean ──
    { name: "São Paulo", country: "Brazil", latitude: -23.5505, longitude: -46.6333 },
    { name: "Rio de Janeiro", country: "Brazil", latitude: -22.9068, longitude: -43.1729 },
    { name: "Buenos Aires", country: "Argentina", latitude: -34.6037, longitude: -58.3816 },
    { name: "Santiago", country: "Chile", latitude: -33.4489, longitude: -70.6693 },
    { name: "Lima", country: "Peru", latitude: -12.0464, longitude: -77.0428 },
    { name: "Bogotá", country: "Colombia", latitude: 4.7110, longitude: -74.0721 },
    { name: "Medellín", country: "Colombia", latitude: 6.2442, longitude: -75.5812 },
    { name: "San Juan", country: "Puerto Rico", latitude: 18.4655, longitude: -66.1057 },

    // ── Europe ──
    { name: "London", country: "UK", latitude: 51.5074, longitude: -0.1278 },
    { name: "Paris", country: "France", latitude: 48.8566, longitude: 2.3522 },
    { name: "Berlin", country: "Germany", latitude: 52.5200, longitude: 13.4050 },
    { name: "Rome", country: "Italy", latitude: 41.9028, longitude: 12.4964 },
    { name: "Madrid", country: "Spain", latitude: 40.4168, longitude: -3.7038 },
    { name: "Barcelona", country: "Spain", latitude: 41.3851, longitude: 2.1734 },
    { name: "Lisbon", country: "Portugal", latitude: 38.7223, longitude: -9.1393 },
    { name: "Amsterdam", country: "Netherlands", latitude: 52.3676, longitude: 4.9041 },
    { name: "Vienna", country: "Austria", latitude: 48.2082, longitude: 16.3738 },
    { name: "Prague", country: "Czech Republic", latitude: 50.0755, longitude: 14.4378 },
    { name: "Athens", country: "Greece", latitude: 37.9838, longitude: 23.7275 },
    { name: "Copenhagen", country: "Denmark", latitude: 55.6761, longitude: 12.5683 },
    { name: "Stockholm", country: "Sweden", latitude: 59.3293, longitude: 18.0686 },
    { name: "Dublin", country: "Ireland", latitude: 53.3498, longitude: -6.2603 },
    { name: "Zurich", country: "Switzerland", latitude: 47.3769, longitude: 8.5417 },
    { name: "Moscow", country: "Russia", latitude: 55.7558, longitude: 37.6173 },
    { name: "Istanbul", country: "Turkey", latitude: 41.0082, longitude: 28.9784 },
    { name: "Reykjavik", country: "Iceland", latitude: 64.1466, longitude: -21.9426 },

    // ── Middle East ──
    { name: "Dubai", country: "UAE", latitude: 25.2048, longitude: 55.2708 },
    { name: "Tel Aviv", country: "Israel", latitude: 32.0853, longitude: 34.7818 },

    // ── Africa ──
    { name: "Cairo", country: "Egypt", latitude: 30.0444, longitude: 31.2357 },
    { name: "Johannesburg", country: "South Africa", latitude: -26.2041, longitude: 28.0473 },
    { name: "Cape Town", country: "South Africa", latitude: -33.9249, longitude: 18.4241 },
    { name: "Lagos", country: "Nigeria", latitude: 6.5244, longitude: 3.3792 },
    { name: "Nairobi", country: "Kenya", latitude: -1.2921, longitude: 36.8219 },
    { name: "Marrakech", country: "Morocco", latitude: 31.6295, longitude: -7.9811 },
    { name: "Accra", country: "Ghana", latitude: 5.6037, longitude: -0.1870 },

    // ── South / Southeast Asia ──
    { name: "Mumbai", country: "India", latitude: 19.0760, longitude: 72.8777 },
    { name: "New Delhi", country: "India", latitude: 28.6139, longitude: 77.2090 },
    { name: "Bangkok", country: "Thailand", latitude: 13.7563, longitude: 100.5018 },
    { name: "Singapore", country: "Singapore", latitude: 1.3521, longitude: 103.8198 },
    { name: "Bali", country: "Indonesia", latitude: -8.3405, longitude: 115.0920 },
    { name: "Kuala Lumpur", country: "Malaysia", latitude: 3.1390, longitude: 101.6869 },
    { name: "Ho Chi Minh City", country: "Vietnam", latitude: 10.8231, longitude: 106.6297 },

    // ── East Asia ──
    { name: "Tokyo", country: "Japan", latitude: 35.6762, longitude: 139.6503 },
    { name: "Beijing", country: "China", latitude: 39.9042, longitude: 116.4074 },
    { name: "Shanghai", country: "China", latitude: 31.2304, longitude: 121.4737 },
    { name: "Hong Kong", country: "China", latitude: 22.3193, longitude: 114.1694 },
    { name: "Seoul", country: "South Korea", latitude: 37.5665, longitude: 126.9780 },
    { name: "Taipei", country: "Taiwan", latitude: 25.0330, longitude: 121.5654 },

    // ── Oceania ──
    { name: "Sydney", country: "Australia", latitude: -33.8688, longitude: 151.2093 },
    { name: "Melbourne", country: "Australia", latitude: -37.8136, longitude: 144.9631 },
    { name: "Auckland", country: "New Zealand", latitude: -36.8485, longitude: 174.7633 },
];

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export interface CityWithDistance extends City {
    distance: number; // km to the nearest line point
}

/**
 * Try to resolve locationName (e.g. "Vancouver, BC, Canada", "Tokyo, Japan") to coordinates
 * by matching against WORLD_CITIES. Used when lat/lon are missing from a profile.
 */
export function lookupCityCoordinates(locationName: string | null | undefined): { latitude: number; longitude: number } | null {
    if (!locationName?.trim()) return null;
    const normalized = locationName.toLowerCase().trim();
    // Sort by name length desc so "New York City" matches before "New York"
    const sorted = [...WORLD_CITIES].sort((a, b) => b.name.length - a.name.length);
    for (const city of sorted) {
        if (normalized.startsWith(city.name.toLowerCase()) || normalized.includes(city.name.toLowerCase())) {
            return { latitude: city.latitude, longitude: city.longitude };
        }
    }
    return null;
}

/**
 * Find cities near one or more line segments for the same planet+lineType.
 * Pass ALL matching segments so ASC/DSC lines split at the dateline are handled.
 * Returns results sorted by distance (closest first).
 */
export function findCitiesNearLine(
    lines: AstroLine[],
    maxDistanceKm: number = 400
): CityWithDistance[] {
    const results: CityWithDistance[] = [];

    for (const city of WORLD_CITIES) {
        let minDistance = Infinity;

        // Check every segment's points
        for (const line of lines) {
            for (const point of line.points) {
                const dist = haversineDistance(
                    city.latitude,
                    city.longitude,
                    point.latitude,
                    point.longitude
                );
                if (dist < minDistance) {
                    minDistance = dist;
                }
            }
        }

        if (minDistance <= maxDistanceKm) {
            results.push({ ...city, distance: minDistance });
        }
    }

    return results.sort((a, b) => a.distance - b.distance);
}
