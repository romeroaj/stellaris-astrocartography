import Foundation
import CoreLocation

/// Core astronomical calculation engine.
/// Calculates planet positions, astrocartography lines, and relocated charts.
enum AstroEngine {

    // MARK: - Constants

    static let degreesToRadians = Double.pi / 180.0
    static let radiansToDegrees = 180.0 / Double.pi
    static let j2000: Double = 2451545.0

    // MARK: - Julian Date

    static func julianDate(from date: Date) -> Double {
        let calendar = Calendar(identifier: .gregorian)
        let components = calendar.dateComponents(in: TimeZone(identifier: "UTC")!, from: date)
        let year = Double(components.year!)
        let month = Double(components.month!)
        let day = Double(components.day!)
        let hour = Double(components.hour ?? 0)
        let minute = Double(components.minute ?? 0)
        let second = Double(components.second ?? 0)

        let dayFraction = day + (hour + minute / 60.0 + second / 3600.0) / 24.0

        var y = year
        var m = month
        if m <= 2 {
            y -= 1
            m += 12
        }

        let a = floor(y / 100.0)
        let b = 2.0 - a + floor(a / 4.0)

        return floor(365.25 * (y + 4716)) + floor(30.6001 * (m + 1)) + dayFraction + b - 1524.5
    }

    // MARK: - Greenwich Sidereal Time

    static func greenwichSiderealTime(julianDate jd: Double) -> Double {
        let t = (jd - j2000) / 36525.0
        var gst = 280.46061837 + 360.98564736629 * (jd - j2000) + 0.000387933 * t * t - t * t * t / 38710000.0
        gst = gst.truncatingRemainder(dividingBy: 360.0)
        if gst < 0 { gst += 360.0 }
        return gst
    }

    static func localSiderealTime(gst: Double, longitude: Double) -> Double {
        var lst = gst + longitude
        lst = lst.truncatingRemainder(dividingBy: 360.0)
        if lst < 0 { lst += 360.0 }
        return lst
    }

    // MARK: - Planet Positions (Simplified VSOP87-like)

    static func calculatePlanetPositions(julianDate jd: Double) -> [PlanetName: Double] {
        let t = (jd - j2000) / 36525.0
        var positions: [PlanetName: Double] = [:]

        positions[.sun] = normalize(280.46646 + 36000.76983 * t + 0.0003032 * t * t)
        positions[.moon] = normalize(218.3165 + 481267.8813 * t)
        positions[.mercury] = normalize(252.2503 + 149472.6749 * t)
        positions[.venus] = normalize(181.9798 + 58517.8157 * t)
        positions[.mars] = normalize(355.4330 + 19140.2993 * t)
        positions[.jupiter] = normalize(34.3515 + 3034.9057 * t)
        positions[.saturn] = normalize(50.0774 + 1222.1138 * t)
        positions[.uranus] = normalize(314.0550 + 428.4669 * t)
        positions[.neptune] = normalize(304.8803 + 218.4862 * t)
        positions[.pluto] = normalize(238.9290 + 145.2078 * t)
        positions[.chiron] = normalize(209.39 + 1.8955 * t * 100)
        positions[.northNode] = normalize(125.0445 - 1934.1362 * t)
        positions[.southNode] = normalize(positions[.northNode]! + 180)

        let moonNode = positions[.northNode]!
        positions[.lilith] = normalize(moonNode + 180.0 + 3.0 * t)
        positions[.ceres] = normalize(153.89 + 770.39 * t)
        positions[.pallas] = normalize(173.09 + 651.69 * t)
        positions[.juno] = normalize(34.35 + 459.29 * t)
        positions[.vesta] = normalize(20.98 + 554.97 * t)

        return positions
    }

    // MARK: - Ascendant Calculation

    static func computeAscendant(lst: Double, latitude: Double) -> Double {
        let lstRad = lst * degreesToRadians
        let latRad = latitude * degreesToRadians
        let obliquity = 23.4393 * degreesToRadians

        let y = -cos(lstRad)
        let x = sin(lstRad) * cos(obliquity) + tan(latRad) * sin(obliquity)

        var asc = atan2(y, x) * radiansToDegrees
        asc = normalize(asc)
        return asc
    }

    // MARK: - Astrocartography Line Generation

    static func generateLines(birthData: BirthData, planets: [PlanetName] = PlanetName.major) -> [AstroLine] {
        let jd = julianDate(from: birthData.dateOfBirth)
        let gst = greenwichSiderealTime(julianDate: jd)
        let positions = calculatePlanetPositions(julianDate: jd)

        var lines: [AstroLine] = []

        for planet in planets {
            guard let eclipticLon = positions[planet] else { continue }

            for lineType in LineType.allCases {
                let points = computeLinePoints(
                    eclipticLon: eclipticLon,
                    lineType: lineType,
                    gst: gst,
                    birthLat: birthData.latitude
                )

                guard !points.isEmpty else { continue }

                let classification = LineClassifier.classify(planet: planet, lineType: lineType)

                let line = AstroLine(
                    id: "\(planet.rawValue)-\(lineType.rawValue)",
                    planet: planet,
                    lineType: lineType,
                    points: points,
                    sentiment: classification.sentiment,
                    keywords: classification.keywords
                )
                lines.append(line)
            }
        }

        return lines
    }

    // MARK: - Line Point Computation

    private static func computeLinePoints(
        eclipticLon: Double,
        lineType: LineType,
        gst: Double,
        birthLat: Double
    ) -> [CLLocationCoordinate2D] {
        let obliquity = 23.4393

        switch lineType {
        case .mc:
            let lon = normalize(eclipticLon - gst)
            let adjustedLon = lon > 180 ? lon - 360 : lon
            return stride(from: -80.0, through: 80.0, by: 2.0).map {
                CLLocationCoordinate2D(latitude: $0, longitude: adjustedLon)
            }

        case .ic:
            let lon = normalize(eclipticLon - gst + 180)
            let adjustedLon = lon > 180 ? lon - 360 : lon
            return stride(from: -80.0, through: 80.0, by: 2.0).map {
                CLLocationCoordinate2D(latitude: $0, longitude: adjustedLon)
            }

        case .asc:
            return computeAngleLine(eclipticLon: eclipticLon, gst: gst, obliquity: obliquity, isAsc: true)

        case .dsc:
            return computeAngleLine(eclipticLon: eclipticLon, gst: gst, obliquity: obliquity, isAsc: false)
        }
    }

    private static func computeAngleLine(
        eclipticLon: Double,
        gst: Double,
        obliquity: Double,
        isAsc: Bool
    ) -> [CLLocationCoordinate2D] {
        var points: [CLLocationCoordinate2D] = []
        let offset: Double = isAsc ? 0 : 180

        for lat in stride(from: -65.0, through: 65.0, by: 1.0) {
            let latRad = lat * degreesToRadians
            let oblRad = obliquity * degreesToRadians
            let lonRad = (eclipticLon + offset) * degreesToRadians

            let y = -cos(lonRad)
            let x = sin(lonRad) * cos(oblRad) + tan(latRad) * sin(oblRad)
            let lstAngle = atan2(y, x) * radiansToDegrees

            var lon = normalize(lstAngle - gst)
            if lon > 180 { lon -= 360 }

            points.append(CLLocationCoordinate2D(latitude: lat, longitude: lon))
        }

        return points
    }

    // MARK: - Find Nearest Lines to Location

    static func findNearestLines(
        _ lines: [AstroLine],
        latitude: Double,
        longitude: Double,
        maxDistance: Double = 12.0
    ) -> [LocationAnalysis] {
        var results: [LocationAnalysis] = []

        for line in lines {
            guard let nearest = closestPointOnLine(line.points, to: (latitude, longitude)) else { continue }
            let distance = nearest.distance

            guard distance <= maxDistance else { continue }

            let side: LineSide = nearest.longitude > longitude ? .east :
                                 nearest.longitude < longitude ? .west : .exact

            results.append(LocationAnalysis(
                planet: line.planet,
                lineType: line.lineType,
                distance: distance,
                strength: ActivationStrength.normalizedStrength(distance: distance),
                side: side,
                sentiment: line.sentiment,
                keywords: line.keywords
            ))
        }

        return results.sorted { $0.distance < $1.distance }
    }

    // MARK: - Relocated Chart

    static func computeRelocatedChart(
        birthData: BirthData,
        targetLat: Double,
        targetLon: Double
    ) -> RelocatedChart {
        let jd = julianDate(from: birthData.dateOfBirth)
        let gst = greenwichSiderealTime(julianDate: jd)
        let lst = localSiderealTime(gst: gst, longitude: targetLon)
        let positions = calculatePlanetPositions(julianDate: jd)

        let asc = computeAscendant(lst: lst, latitude: targetLat)
        let mc = normalize(lst)
        let ascSign = Int(asc / 30.0) % 12
        let mcSign = Int(mc / 30.0) % 12

        var placements: [PlanetHousePlacement] = []

        for (planet, eclipticLon) in positions {
            let planetSign = Int(eclipticLon / 30.0) % 12
            let house = ((planetSign - ascSign + 12) % 12) + 1
            let isAngular = [1, 4, 7, 10].contains(house)

            placements.append(PlanetHousePlacement(
                planet: planet,
                house: house,
                isAngular: isAngular
            ))
        }

        return RelocatedChart(
            ascendantSign: ascSign,
            midheavenSign: mcSign,
            planetsInHouses: placements
        )
    }

    static func getRelocatedHighlights(
        birthData: BirthData,
        targetLat: Double,
        targetLon: Double,
        nearbyPlanets: [PlanetName] = [],
        maxHighlights: Int = 3
    ) -> [RelocatedHighlight] {
        let chart = computeRelocatedChart(birthData: birthData, targetLat: targetLat, targetLon: targetLon)
        var highlights: [RelocatedHighlight] = []

        let prioritized = chart.planetsInHouses.sorted { a, b in
            let aHasLine = nearbyPlanets.contains(a.planet) ? 1 : 0
            let bHasLine = nearbyPlanets.contains(b.planet) ? 1 : 0
            if aHasLine != bHasLine { return aHasLine > bHasLine }
            let aAngular = a.isAngular ? 1 : 0
            let bAngular = b.isAngular ? 1 : 0
            return aAngular > bAngular
        }

        for placement in prioritized.prefix(maxHighlights) {
            highlights.append(RelocatedHighlight(
                planet: placement.planet,
                house: placement.house,
                plainEnglish: placement.plainEnglish
            ))
        }

        return highlights
    }

    // MARK: - Helpers

    private static func normalize(_ angle: Double) -> Double {
        var a = angle.truncatingRemainder(dividingBy: 360.0)
        if a < 0 { a += 360.0 }
        return a
    }

    private static func closestPointOnLine(
        _ points: [CLLocationCoordinate2D],
        to target: (lat: Double, lon: Double)
    ) -> (distance: Double, longitude: Double)? {
        guard !points.isEmpty else { return nil }
        var minDist = Double.infinity
        var nearestLon = 0.0

        for point in points {
            let dLat = point.latitude - target.lat
            let dLon = point.longitude - target.lon
            let dist = sqrt(dLat * dLat + dLon * dLon)

            if dist < minDist {
                minDist = dist
                nearestLon = point.longitude
            }
        }

        return (minDist, nearestLon)
    }
}
