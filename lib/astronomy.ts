import { PlanetName, PlanetPosition, AstroLine, LineType } from "./types";

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

function normalizeAngle(a: number): number {
  a = a % 360;
  if (a < 0) a += 360;
  return a;
}

function normalizeLon(a: number): number {
  while (a > 180) a -= 360;
  while (a < -180) a += 360;
  return a;
}

function julianDay(year: number, month: number, day: number, hour: number): number {
  if (month <= 2) {
    year -= 1;
    month += 12;
  }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return (
    Math.floor(365.25 * (year + 4716)) +
    Math.floor(30.6001 * (month + 1)) +
    day +
    hour / 24 +
    B -
    1524.5
  );
}

function centuriesFromJ2000(jd: number): number {
  return (jd - 2451545.0) / 36525.0;
}

function greenwichSiderealTime(jd: number): number {
  const T = centuriesFromJ2000(jd);
  let gst =
    280.46061837 +
    360.98564736629 * (jd - 2451545.0) +
    0.000387933 * T * T -
    (T * T * T) / 38710000.0;
  return normalizeAngle(gst);
}

function obliquityOfEcliptic(T: number): number {
  return (
    23.439291 -
    0.0130042 * T -
    1.64e-7 * T * T +
    5.04e-7 * T * T * T
  );
}

function eclipticToEquatorial(
  lon: number,
  lat: number,
  obliquity: number
): { ra: number; dec: number } {
  const lonRad = lon * DEG;
  const latRad = lat * DEG;
  const oblRad = obliquity * DEG;

  const sinDec =
    Math.sin(latRad) * Math.cos(oblRad) +
    Math.cos(latRad) * Math.sin(oblRad) * Math.sin(lonRad);
  const dec = Math.asin(sinDec) * RAD;

  const y = Math.sin(lonRad) * Math.cos(oblRad) - Math.tan(latRad) * Math.sin(oblRad);
  const x = Math.cos(lonRad);
  let ra = Math.atan2(y, x) * RAD;
  ra = normalizeAngle(ra);

  return { ra, dec };
}

interface OrbitalElements {
  L: number;
  a: number;
  e: number;
  i: number;
  omega: number;
  Omega: number;
}

function getPlanetElements(planet: PlanetName, T: number): OrbitalElements | null {
  const elements: Record<string, { L: number[]; a: number[]; e: number[]; i: number[]; omega: number[]; Omega: number[] }> = {
    mercury: {
      L: [252.2509, 149472.6746],
      a: [0.387098, 0],
      e: [0.205635, 0.000020],
      i: [7.0050, 0.0019],
      omega: [29.1241, 1.0148],
      Omega: [48.3313, -0.1254],
    },
    venus: {
      L: [181.9798, 58517.8157],
      a: [0.723332, 0],
      e: [0.006773, -0.000048],
      i: [3.3947, 0.0010],
      omega: [54.8842, 0.5082],
      Omega: [76.6799, -0.2780],
    },
    mars: {
      L: [355.4330, 19140.2993],
      a: [1.523679, 0],
      e: [0.093405, 0.000090],
      i: [1.8497, -0.0006],
      omega: [286.5016, 0.7717],
      Omega: [49.5574, -0.2934],
    },
    jupiter: {
      L: [34.3515, 3034.9057],
      a: [5.202561, 0],
      e: [0.048498, 0.000163],
      i: [1.3033, -0.0019],
      omega: [273.8777, 0.3254],
      Omega: [100.4542, 0.1768],
    },
    saturn: {
      L: [49.9429, 1222.1138],
      a: [9.554747, 0],
      e: [0.055546, -0.000346],
      i: [2.4889, 0.0025],
      omega: [339.3939, 0.7372],
      Omega: [113.6634, -0.2507],
    },
    uranus: {
      L: [313.2318, 428.2011],
      a: [19.218446, 0],
      e: [0.046381, -0.000027],
      i: [0.7732, 0.0001],
      omega: [96.9310, 0.3670],
      Omega: [74.0005, 0.0747],
    },
    neptune: {
      L: [304.8800, 218.4616],
      a: [30.110387, 0],
      e: [0.009456, 0.000007],
      i: [1.7700, -0.0093],
      omega: [276.3360, 0.3259],
      Omega: [131.7841, -0.0061],
    },
    pluto: {
      L: [238.9290, 145.2078],
      a: [39.482, 0],
      e: [0.2488, 0],
      i: [17.14, 0],
      omega: [113.76, 0],
      Omega: [110.30, 0],
    },
    chiron: {
      L: [309.8, 714.5],
      a: [13.699, 0],
      e: [0.378, 0],
      i: [6.92, 0],
      omega: [339.25, 0],
      Omega: [209.30, 0],
    },
    ceres: {
      L: [231.36, 7809.0],
      a: [2.7658, 0],
      e: [0.0760, 0],
      i: [10.59, 0],
      omega: [73.60, 0],
      Omega: [80.39, 0],
    },
    pallas: {
      L: [7.49, 7807.0],
      a: [2.7716, 0],
      e: [0.2313, 0],
      i: [34.83, 0],
      omega: [310.20, 0],
      Omega: [173.09, 0],
    },
    juno: {
      L: [173.68, 8259.0],
      a: [2.6691, 0],
      e: [0.2562, 0],
      i: [12.99, 0],
      omega: [248.41, 0],
      Omega: [169.87, 0],
    },
    vesta: {
      L: [274.55, 9920.0],
      a: [2.3615, 0],
      e: [0.0887, 0],
      i: [7.14, 0],
      omega: [149.84, 0],
      Omega: [103.85, 0],
    },
  };

  const el = elements[planet];
  if (!el) return null;

  return {
    L: normalizeAngle(el.L[0] + el.L[1] * T),
    a: el.a[0] + el.a[1] * T,
    e: el.e[0] + el.e[1] * T,
    i: el.i[0] + el.i[1] * T,
    omega: normalizeAngle(el.omega[0] + el.omega[1] * T),
    Omega: normalizeAngle(el.Omega[0] + el.Omega[1] * T),
  };
}

function solveKepler(M: number, e: number): number {
  let E = M;
  for (let i = 0; i < 20; i++) {
    const dE = (M - (E - e * Math.sin(E * DEG) * RAD)) / (1 - e * Math.cos(E * DEG));
    E += dE;
    if (Math.abs(dE) < 1e-8) break;
  }
  return E;
}

function heliocentricToGeocentric(
  planetLon: number,
  planetLat: number,
  planetR: number,
  earthLon: number,
  earthR: number
): { lon: number; lat: number } {
  const xp = planetR * Math.cos(planetLat * DEG) * Math.cos(planetLon * DEG);
  const yp = planetR * Math.cos(planetLat * DEG) * Math.sin(planetLon * DEG);
  const zp = planetR * Math.sin(planetLat * DEG);

  const xe = earthR * Math.cos(earthLon * DEG);
  const ye = earthR * Math.sin(earthLon * DEG);

  const xg = xp - xe;
  const yg = yp - ye;
  const zg = zp;

  const lon = normalizeAngle(Math.atan2(yg, xg) * RAD);
  const lat = Math.atan2(zg, Math.sqrt(xg * xg + yg * yg)) * RAD;

  return { lon, lat };
}

function computePlanetEcliptic(
  planet: PlanetName,
  T: number,
  earthLon: number,
  earthR: number
): { lon: number; lat: number } {
  const el = getPlanetElements(planet, T);
  if (!el) return { lon: 0, lat: 0 };

  const M = normalizeAngle(el.L - el.omega - el.Omega);
  const E = solveKepler(M, el.e);

  const v =
    2 *
    Math.atan2(
      Math.sqrt(1 + el.e) * Math.sin((E / 2) * DEG),
      Math.sqrt(1 - el.e) * Math.cos((E / 2) * DEG)
    ) *
    RAD;

  const r = el.a * (1 - el.e * Math.cos(E * DEG));
  const u = normalizeAngle(v + el.omega);

  const xh =
    r *
    (Math.cos(el.Omega * DEG) * Math.cos(u * DEG) -
      Math.sin(el.Omega * DEG) * Math.sin(u * DEG) * Math.cos(el.i * DEG));
  const yh =
    r *
    (Math.sin(el.Omega * DEG) * Math.cos(u * DEG) +
      Math.cos(el.Omega * DEG) * Math.sin(u * DEG) * Math.cos(el.i * DEG));
  const zh = r * Math.sin(u * DEG) * Math.sin(el.i * DEG);

  const helioLon = normalizeAngle(Math.atan2(yh, xh) * RAD);
  const helioLat = Math.atan2(zh, Math.sqrt(xh * xh + yh * yh)) * RAD;
  const helioR = Math.sqrt(xh * xh + yh * yh + zh * zh);

  return heliocentricToGeocentric(helioLon, helioLat, helioR, earthLon, earthR);
}

function sunPosition(T: number): { lon: number; ra: number; dec: number; earthR: number } {
  const M = normalizeAngle(357.5291 + 35999.0503 * T);
  const C =
    1.9146 * Math.sin(M * DEG) +
    0.02 * Math.sin(2 * M * DEG) +
    0.0003 * Math.sin(3 * M * DEG);
  const sunLon = normalizeAngle(M + C + 180 + 102.9372);
  const obliquity = obliquityOfEcliptic(T);
  const { ra, dec } = eclipticToEquatorial(sunLon, 0, obliquity);

  const v = M + C;
  const R =
    1.000001018 * (1 - 0.016709 * 0.016709) / (1 + 0.016709 * Math.cos(v * DEG));

  return { lon: sunLon, ra, dec, earthR: R };
}

function moonPosition(T: number): { lon: number; ra: number; dec: number } {
  const L0 = normalizeAngle(218.3165 + 481267.8813 * T);
  const M = normalizeAngle(134.9634 + 477198.8676 * T);
  const Msun = normalizeAngle(357.5291 + 35999.0503 * T);
  const D = normalizeAngle(297.8502 + 445267.1115 * T);
  const F = normalizeAngle(93.2720 + 483202.0175 * T);

  let lon =
    L0 +
    6.289 * Math.sin(M * DEG) +
    1.274 * Math.sin((2 * D - M) * DEG) +
    0.658 * Math.sin(2 * D * DEG) +
    0.214 * Math.sin(2 * M * DEG) -
    0.186 * Math.sin(Msun * DEG) -
    0.114 * Math.sin(2 * F * DEG);

  let lat =
    5.128 * Math.sin(F * DEG) +
    0.281 * Math.sin((M + F) * DEG) +
    0.278 * Math.sin((M - F) * DEG);

  lon = normalizeAngle(lon);
  const obliquity = obliquityOfEcliptic(T);
  const { ra, dec } = eclipticToEquatorial(lon, lat, obliquity);

  return { lon, ra, dec };
}

export function estimateTimezoneOffset(longitude: number): number {
  return Math.round(longitude / 15);
}

function localToUTC(
  year: number, month: number, day: number, hour: number, minute: number, tzOffset: number
): { year: number; month: number; day: number; hour: number; minute: number } {
  let utcHour = hour - tzOffset;
  let utcDay = day;
  let utcMonth = month;
  let utcYear = year;

  if (utcHour >= 24) {
    utcHour -= 24;
    utcDay += 1;
    const daysInMonth = new Date(utcYear, utcMonth, 0).getDate();
    if (utcDay > daysInMonth) {
      utcDay = 1;
      utcMonth += 1;
      if (utcMonth > 12) {
        utcMonth = 1;
        utcYear += 1;
      }
    }
  } else if (utcHour < 0) {
    utcHour += 24;
    utcDay -= 1;
    if (utcDay < 1) {
      utcMonth -= 1;
      if (utcMonth < 1) {
        utcMonth = 12;
        utcYear -= 1;
      }
      utcDay = new Date(utcYear, utcMonth, 0).getDate();
    }
  }

  return { year: utcYear, month: utcMonth, day: utcDay, hour: utcHour, minute };
}

export function calculatePlanetPositions(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  birthLongitude?: number
): PlanetPosition[] {
  let y = year, mo = month, d = day, h = hour, mi = minute;
  if (birthLongitude !== undefined) {
    const tzOffset = estimateTimezoneOffset(birthLongitude);
    const utc = localToUTC(year, month, day, hour, minute, tzOffset);
    y = utc.year; mo = utc.month; d = utc.day; h = utc.hour; mi = utc.minute;
  }
  const totalHour = h + mi / 60;
  const jd = julianDay(y, mo, d, totalHour);
  const T = centuriesFromJ2000(jd);
  const obliquity = obliquityOfEcliptic(T);

  const sun = sunPosition(T);
  const earthLon = normalizeAngle(sun.lon + 180);
  const earthR = sun.earthR;

  const positions: PlanetPosition[] = [
    { name: "sun", ra: sun.ra, dec: sun.dec, eclipticLon: sun.lon },
  ];

  const moon = moonPosition(T);
  positions.push({ name: "moon", ra: moon.ra, dec: moon.dec, eclipticLon: moon.lon });

  const planets: PlanetName[] = [
    "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto",
    "chiron", "ceres", "pallas", "juno", "vesta",
  ];

  for (const planet of planets) {
    const geo = computePlanetEcliptic(planet, T, earthLon, earthR);
    const { ra, dec } = eclipticToEquatorial(geo.lon, geo.lat, obliquity);
    positions.push({ name: planet, ra, dec, eclipticLon: geo.lon });
  }

  // ── Lunar Nodes (mathematical points on the ecliptic) ──
  const northNodeLon = normalizeAngle(125.0446 - 1934.1363 * T);
  const nnEq = eclipticToEquatorial(northNodeLon, 0, obliquity);
  positions.push({ name: "northnode", ra: nnEq.ra, dec: nnEq.dec, eclipticLon: northNodeLon });

  const southNodeLon = normalizeAngle(northNodeLon + 180);
  const snEq = eclipticToEquatorial(southNodeLon, 0, obliquity);
  positions.push({ name: "southnode", ra: snEq.ra, dec: snEq.dec, eclipticLon: southNodeLon });

  // ── Black Moon Lilith (mean lunar apogee) ──
  const lilithLon = normalizeAngle(263.3532 + 4069.0137 * T);
  const lilEq = eclipticToEquatorial(lilithLon, 0, obliquity);
  positions.push({ name: "lilith", ra: lilEq.ra, dec: lilEq.dec, eclipticLon: lilithLon });

  return positions;
}

export function calculateGST(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  birthLongitude?: number
): number {
  let y = year, mo = month, d = day, h = hour, mi = minute;
  if (birthLongitude !== undefined) {
    const tzOffset = estimateTimezoneOffset(birthLongitude);
    const utc = localToUTC(year, month, day, hour, minute, tzOffset);
    y = utc.year; mo = utc.month; d = utc.day; h = utc.hour; mi = utc.minute;
  }
  const totalHour = h + mi / 60;
  const jd = julianDay(y, mo, d, totalHour);
  return greenwichSiderealTime(jd);
}

/**
 * Composite chart: midpoint of each planet's position between two charts.
 * Used for "Relationship Destiny" bond view.
 */
export function computeCompositePositions(
  positions1: PlanetPosition[],
  positions2: PlanetPosition[],
  gst1: number,
  gst2: number
): { positions: PlanetPosition[]; gst: number } {
  const T = centuriesFromJ2000(julianDay(2000, 6, 21, 12));
  const obliquity = obliquityOfEcliptic(T);
  const positions: PlanetPosition[] = [];
  const names = [...new Set([...positions1.map((p) => p.name), ...positions2.map((p) => p.name)])];

  for (const name of names) {
    const p1 = positions1.find((p) => p.name === name);
    const p2 = positions2.find((p) => p.name === name);
    if (!p1 || !p2) continue;

    const lon1 = p1.eclipticLon;
    const lon2 = p2.eclipticLon;
    let midLon = (lon1 + lon2) / 2;
    if (Math.abs(lon1 - lon2) > 180) midLon = (midLon + 180) % 360;
    midLon = normalizeAngle(midLon);

    const { ra, dec } = eclipticToEquatorial(midLon, 0, obliquity);
    positions.push({ name: p1.name as PlanetName, ra, dec, eclipticLon: midLon });
  }

  let midGst = (gst1 + gst2) / 2;
  if (Math.abs(gst1 - gst2) > 180) midGst = (midGst + 180) % 360;
  midGst = normalizeAngle(midGst);
  return { positions, gst: midGst };
}

export function generateAstroLines(
  positions: PlanetPosition[],
  gst: number,
  sourceId?: "user" | "partner"
): AstroLine[] {
  const lines: AstroLine[] = [];

  for (const planet of positions) {
    const mcLon = normalizeLon(planet.ra - gst);
    const icLon = normalizeLon(mcLon + 180);

    const mcPoints: { latitude: number; longitude: number }[] = [];
    for (let lat = -89; lat <= 89; lat += 2) {
      mcPoints.push({ latitude: lat, longitude: mcLon });
    }
    lines.push({ planet: planet.name, lineType: "MC", points: mcPoints, ...(sourceId && { sourceId }) });

    const icPoints: { latitude: number; longitude: number }[] = [];
    for (let lat = -89; lat <= 89; lat += 2) {
      icPoints.push({ latitude: lat, longitude: icLon });
    }
    lines.push({ planet: planet.name, lineType: "IC", points: icPoints, ...(sourceId && { sourceId }) });

    const ascPoints: { latitude: number; longitude: number }[] = [];
    const dscPoints: { latitude: number; longitude: number }[] = [];

    // Use finer steps for better resolution and coverage
    // Loop from -89 to +89
    let lat = -89;
    while (lat <= 89) {
      const tanPhi = Math.tan(lat * DEG);
      const tanDec = Math.tan(planet.dec * DEG);
      const cosH = -(tanPhi * tanDec);

      // Allow small epsilon for float precision issues
      if (Math.abs(cosH) <= 1.000001) {
        // Clamp to [-1, 1] to be safe for acos
        const clampedCosH = Math.max(-1, Math.min(1, cosH));
        const H = Math.acos(clampedCosH) * RAD;

        const ascLon = normalizeLon(planet.ra - gst - H);
        const dscLon = normalizeLon(planet.ra - gst + H);

        ascPoints.push({ latitude: lat, longitude: ascLon });
        dscPoints.push({ latitude: lat, longitude: dscLon });
      }

      // Variable step size: finer near poles where curvature is high
      // This prevents jagged lines or premature cutoffs
      const step = Math.abs(lat) > 60 ? 0.5 : 1;
      lat += step;
      // Fix float accumulation
      lat = Math.round(lat * 10) / 10;
    }

    if (ascPoints.length > 2) {
      const splitAsc = splitLineAtDateline(ascPoints);
      for (const segment of splitAsc) {
        lines.push({ planet: planet.name, lineType: "ASC", points: segment, ...(sourceId && { sourceId }) });
      }
    }

    if (dscPoints.length > 2) {
      const splitDsc = splitLineAtDateline(dscPoints);
      for (const segment of splitDsc) {
        lines.push({ planet: planet.name, lineType: "DSC", points: segment, ...(sourceId && { sourceId }) });
      }
    }
  }

  return lines;
}

function splitLineAtDateline(
  points: { latitude: number; longitude: number }[]
): { latitude: number; longitude: number }[][] {
  const segments: { latitude: number; longitude: number }[][] = [];
  let current: { latitude: number; longitude: number }[] = [];

  for (let i = 0; i < points.length; i++) {
    if (current.length === 0) {
      current.push(points[i]);
    } else {
      const prev = current[current.length - 1];
      const diff = Math.abs(points[i].longitude - prev.longitude);
      if (diff > 180) {
        segments.push(current);
        current = [points[i]];
      } else {
        current.push(points[i]);
      }
    }
  }

  if (current.length > 1) {
    segments.push(current);
  }

  return segments;
}

export type SideOfLine = "west" | "east" | "on";

export function findNearestLines(
  lines: AstroLine[],
  lat: number,
  lon: number,
  maxDistanceDeg: number = 15
): { planet: PlanetName; lineType: LineType; distance: number; influence: string; side: SideOfLine }[] {
  const results: { planet: PlanetName; lineType: LineType; distance: number; influence: string; side: SideOfLine }[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const key = `${line.planet}-${line.lineType}`;
    if (seen.has(key)) {
      const existing = results.find((r) => `${r.planet}-${r.lineType}` === key);
      if (existing) {
        let minDist = Infinity;
        let nearestLon = 0;
        for (const pt of line.points) {
          const d = haversineDistance(lat, lon, pt.latitude, pt.longitude);
          if (d < minDist) { minDist = d; nearestLon = pt.longitude; }
        }
        if (minDist < existing.distance) {
          existing.distance = minDist;
          existing.influence = getInfluence(minDist);
          existing.side = determineSide(lon, nearestLon, minDist);
        }
      }
      continue;
    }

    let minDist = Infinity;
    let nearestLon = 0;
    for (const pt of line.points) {
      const d = haversineDistance(lat, lon, pt.latitude, pt.longitude);
      if (d < minDist) { minDist = d; nearestLon = pt.longitude; }
    }

    if (minDist <= maxDistanceDeg * 111) {
      seen.add(key);
      results.push({
        planet: line.planet,
        lineType: line.lineType as LineType,
        distance: minDist,
        influence: getInfluence(minDist),
        side: determineSide(lon, nearestLon, minDist),
      });
    }
  }

  return results.sort((a, b) => a.distance - b.distance);
}

/** Determine if a city is east or west of the nearest line point. */
function determineSide(cityLon: number, lineLon: number, distKm: number): SideOfLine {
  if (distKm < 30) return "on";
  let diff = cityLon - lineLon;
  // Handle dateline wrapping
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return diff > 0 ? "east" : "west";
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * DEG;
  const dLon = (lon2 - lon1) * DEG;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * DEG) * Math.cos(lat2 * DEG) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getInfluence(distanceKm: number): string {
  if (distanceKm < 150) return "very strong";
  if (distanceKm < 400) return "strong";
  if (distanceKm < 800) return "moderate";
  return "mild";
}
