import Foundation

/// Assesses natal planet conditions (strong, challenged, neutral)
/// based on aspects in the birth chart.
enum NatalConditions {

    static func assess(birthData: BirthData) -> [NatalCondition] {
        let jd = AstroEngine.julianDate(from: birthData.dateOfBirth)
        let positions = AstroEngine.calculatePlanetPositions(julianDate: jd)

        var conditions: [NatalCondition] = []

        for planet in PlanetName.major {
            guard let lon = positions[planet] else { continue }
            var aspects: [NatalAspect] = []

            for otherPlanet in PlanetName.major where otherPlanet != planet {
                guard let otherLon = positions[otherPlanet] else { continue }
                if let aspect = findNatalAspect(lon1: lon, lon2: otherLon, planet2: otherPlanet) {
                    aspects.append(aspect)
                }
            }

            let tag = classifyCondition(planet: planet, aspects: aspects)
            let reason = buildReason(planet: planet, tag: tag, aspects: aspects)

            conditions.append(NatalCondition(
                planet: planet,
                tag: tag,
                aspects: aspects,
                reason: reason
            ))
        }

        return conditions
    }

    private static func findNatalAspect(lon1: Double, lon2: Double, planet2: PlanetName) -> NatalAspect? {
        let angles: [(AspectType, Double, Bool)] = [
            (.conjunction, 0, false),
            (.opposition, 180, true),
            (.trine, 120, false),
            (.square, 90, true),
            (.sextile, 60, false),
        ]

        for (aspectType, angle, isHard) in angles {
            var diff = abs(lon1 - lon2)
            if diff > 180 { diff = 360 - diff }
            let orbDiff = abs(diff - angle)
            if orbDiff < 8 {
                return NatalAspect(otherPlanet: planet2, aspect: aspectType, isHard: isHard)
            }
        }

        return nil
    }

    private static func classifyCondition(planet: PlanetName, aspects: [NatalAspect]) -> ConditionTag {
        let hardCount = aspects.filter(\.isHard).count
        let softCount = aspects.count - hardCount

        if softCount > hardCount + 1 { return .strong }
        if hardCount > softCount + 1 { return .challenged }
        return .neutral
    }

    private static func buildReason(planet: PlanetName, tag: ConditionTag, aspects: [NatalAspect]) -> String? {
        guard !aspects.isEmpty else { return nil }

        switch tag {
        case .strong:
            let supporters = aspects.filter { !$0.isHard }.map(\.otherPlanet.displayName).prefix(2).joined(separator: " and ")
            return "Your \(planet.displayName.lowercased()) is well-supported by \(supporters)."
        case .challenged:
            let challengers = aspects.filter(\.isHard).map(\.otherPlanet.displayName).prefix(2).joined(separator: " and ")
            return "Your \(planet.displayName.lowercased()) faces tension from \(challengers) — growth comes through overcoming friction."
        case .neutral:
            return nil
        }
    }
}
