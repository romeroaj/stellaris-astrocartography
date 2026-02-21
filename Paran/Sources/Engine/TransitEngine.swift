import Foundation

/// Transit & cyclocartography engine.
/// Calculates current and upcoming line activations, city activation windows,
/// and timeline entries.
enum TransitEngine {

    // MARK: - Current Activations

    static func getCurrentActivations(
        birthData: BirthData,
        date: Date = Date()
    ) -> [LineActivation] {
        let natalJD = AstroEngine.julianDate(from: birthData.dateOfBirth)
        let transitJD = AstroEngine.julianDate(from: date)
        let natalPositions = AstroEngine.calculatePlanetPositions(julianDate: natalJD)
        let transitPositions = AstroEngine.calculatePlanetPositions(julianDate: transitJD)

        var activations: [LineActivation] = []
        let outerPlanets: [PlanetName] = [.jupiter, .saturn, .uranus, .neptune, .pluto]

        for transitPlanet in outerPlanets {
            guard let transitLon = transitPositions[transitPlanet] else { continue }

            for (natalPlanet, natalLon) in natalPositions {
                for aspect in checkAspects(transitLon: transitLon, natalLon: natalLon) {
                    let classification = LineClassifier.classify(planet: natalPlanet, lineType: .mc)
                    let summary = buildActivationSummary(
                        transitPlanet: transitPlanet,
                        natalPlanet: natalPlanet,
                        aspect: aspect.type,
                        sentiment: classification.sentiment
                    )
                    let insight = buildActivationInsight(
                        transitPlanet: transitPlanet,
                        natalPlanet: natalPlanet,
                        aspect: aspect.type
                    )

                    for lineType in LineType.allCases {
                        activations.append(LineActivation(
                            natalPlanet: natalPlanet,
                            natalLineType: lineType,
                            transitPlanet: transitPlanet,
                            aspect: aspect.type,
                            intensity: aspect.intensity,
                            isProgression: false,
                            summary: summary,
                            insight: insight,
                            isApplying: aspect.orb >= 0
                        ))
                    }
                }
            }
        }

        return activations.sorted { $0.intensity > $1.intensity }
    }

    // MARK: - City Activation

    static func getCityActivation(
        birthData: BirthData,
        city: City,
        lines: [AstroLine],
        date: Date = Date()
    ) -> CityActivation {
        let nearbyLines = AstroEngine.findNearestLines(lines, latitude: city.latitude, longitude: city.longitude, maxDistance: 12)
        let activations = getCurrentActivations(birthData: birthData, date: date)

        let nearbyPlanets = Set(nearbyLines.map(\.planet))
        let relevantTransits = activations.filter { nearbyPlanets.contains($0.natalPlanet) }

        let strength: CityActivationStrength
        if relevantTransits.contains(where: { $0.intensity >= .strong }) {
            strength = .peak
        } else if !relevantTransits.isEmpty {
            strength = .active
        } else {
            strength = .quiet
        }

        return CityActivation(
            city: city,
            activeTransits: relevantTransits,
            activationStrength: strength,
            bestVisitWindow: nil,
            nextActivation: nil
        )
    }

    // MARK: - Activation Windows

    static func findActivationWindows(
        birthData: BirthData,
        startDate: Date,
        endDate: Date,
        step: TimeInterval = 86400 * 7  // weekly steps
    ) -> [ActivationWindow] {
        var windows: [ActivationWindow] = []
        var current = startDate

        while current < endDate {
            let activations = getCurrentActivations(birthData: birthData, date: current)
            for activation in activations where activation.intensity >= .strong {
                let windowStart = Calendar.current.date(byAdding: .day, value: -14, to: current)!
                let windowEnd = Calendar.current.date(byAdding: .day, value: 14, to: current)!
                let windowType: WindowType = activation.aspect == .trine || activation.aspect == .sextile ? .benefic : .evolutionary

                windows.append(ActivationWindow(
                    planet: activation.natalPlanet,
                    lineType: activation.natalLineType,
                    transitPlanet: activation.transitPlanet,
                    aspect: activation.aspect,
                    startDate: windowStart,
                    endDate: windowEnd,
                    exactDate: current,
                    windowType: windowType,
                    label: windowLabel(transitPlanet: activation.transitPlanet, aspect: activation.aspect),
                    plainSummary: activation.summary
                ))
            }
            current = current.addingTimeInterval(step)
        }

        return deduplicateWindows(windows)
    }

    // MARK: - Timeline Entries

    static func getTimelineEntries(
        birthData: BirthData,
        startDate: Date,
        endDate: Date,
        themes: Set<String>? = nil,
        includeModerate: Bool = false
    ) -> [TimelineEntry] {
        let lines = AstroEngine.generateLines(birthData: birthData)
        let calendar = Calendar.current
        var entries: [TimelineEntry] = []

        var current = startDate
        while current < endDate {
            for city in WorldCities.all {
                let nearby = AstroEngine.findNearestLines(lines, latitude: city.latitude, longitude: city.longitude, maxDistance: includeModerate ? 12 : 9)
                guard !nearby.isEmpty else { continue }

                let cityThemes = Set(nearby.flatMap(\.keywords))
                if let themes = themes, !themes.isEmpty {
                    guard !themes.isDisjoint(with: cityThemes) else { continue }
                }

                let activation = getCityActivation(birthData: birthData, city: city, lines: lines, date: current)
                let primary = nearby[0]

                let tier: TimelineTier
                let hasTransit = activation.activationStrength == .peak || activation.activationStrength == .active

                if hasTransit && primary.sentiment == .positive {
                    tier = .especiallyGoodNow
                } else if hasTransit && primary.sentiment == .difficult {
                    tier = .watchOut
                } else if primary.sentiment == .positive && primary.distance < 6 {
                    tier = .alwaysGoodForYou
                } else if !includeModerate {
                    continue
                } else {
                    tier = .alwaysGoodForYou
                }

                let strengthPercent = primary.activationPercent
                let summary = SynthesisEngine.buildParagraph(
                    cityName: city.name,
                    nearbyLines: Array(nearby.prefix(2)),
                    highlights: AstroEngine.getRelocatedHighlights(birthData: birthData, targetLat: city.latitude, targetLon: city.longitude),
                    timing: nil
                )

                entries.append(TimelineEntry(
                    city: city,
                    month: current,
                    tier: tier,
                    strengthPercent: strengthPercent,
                    plainSummary: summary,
                    themes: Array(cityThemes.prefix(4)),
                    window: activation.bestVisitWindow,
                    technicalDetail: "\(primary.planet.displayName) \(primary.lineType.rawValue) at \(String(format: "%.1f", primary.distance))°"
                ))
            }

            current = calendar.date(byAdding: .month, value: 1, to: current)!
        }

        return entries.sorted { $0.strengthPercent > $1.strengthPercent }
    }

    // MARK: - Important Dates

    static func findImportantDates(
        birthData: BirthData,
        startDate: Date,
        endDate: Date
    ) -> [ImportantDate] {
        let windows = findActivationWindows(birthData: birthData, startDate: startDate, endDate: endDate)
        return windows.compactMap { window -> ImportantDate? in
            guard let exactDate = window.exactDate else { return nil }
            let category: DateCategory
            let keywords = LineClassifier.classify(planet: window.planet, lineType: window.lineType).keywords
            if keywords.contains("love") || keywords.contains("beauty") {
                category = .love
            } else if keywords.contains("career") || keywords.contains("abundance") {
                category = .career
            } else if keywords.contains("adventure") || keywords.contains("expansion") {
                category = .travel
            } else if keywords.contains("discipline") || keywords.contains("conflict") {
                category = .caution
            } else {
                category = .growth
            }

            return ImportantDate(
                date: exactDate,
                planet: window.planet,
                aspect: window.aspect,
                transitPlanet: window.transitPlanet,
                category: category,
                summary: window.plainSummary,
                affectedCities: []
            )
        }
    }

    // MARK: - Helpers

    private struct AspectMatch {
        let type: AspectType
        let orb: Double
        let intensity: ActivationIntensity
    }

    private static func checkAspects(transitLon: Double, natalLon: Double) -> [AspectMatch] {
        let aspectAngles: [(AspectType, Double)] = [
            (.conjunction, 0), (.opposition, 180), (.trine, 120), (.square, 90), (.sextile, 60)
        ]

        var matches: [AspectMatch] = []
        for (aspectType, angle) in aspectAngles {
            var diff = abs(transitLon - natalLon - angle)
            if diff > 180 { diff = 360 - diff }

            let orbLimit: Double = aspectType == .conjunction || aspectType == .opposition ? 8 : 6

            if diff < orbLimit {
                let intensity: ActivationIntensity
                switch diff {
                case 0..<1: intensity = .exact
                case 1..<3: intensity = .strong
                case 3..<5: intensity = .moderate
                default: intensity = .fading
                }
                matches.append(AspectMatch(type: aspectType, orb: diff, intensity: intensity))
            }
        }
        return matches
    }

    private static func buildActivationSummary(transitPlanet: PlanetName, natalPlanet: PlanetName, aspect: AspectType, sentiment: Sentiment) -> String {
        let verb: String
        switch aspect {
        case .conjunction: verb = "amplifying"
        case .trine, .sextile: verb = "supporting"
        case .opposition: verb = "challenging"
        case .square: verb = "testing"
        }
        let themes = LineClassifier.classify(planet: natalPlanet, lineType: .mc).keywords.prefix(2).joined(separator: " and ")
        return "\(transitPlanet.displayName) is \(verb) your \(themes) themes."
    }

    private static func buildActivationInsight(transitPlanet: PlanetName, natalPlanet: PlanetName, aspect: AspectType) -> String {
        switch aspect {
        case .trine, .sextile:
            return "A supportive window — lean into opportunities that arise naturally."
        case .conjunction:
            return "Intense amplification — whatever this planet represents is turned up to full volume."
        case .opposition:
            return "A balancing act — relationships and external forces push you to grow."
        case .square:
            return "Friction creates growth — expect challenges that ultimately strengthen you."
        }
    }

    private static func windowLabel(transitPlanet: PlanetName, aspect: AspectType) -> String {
        switch (transitPlanet, aspect) {
        case (.jupiter, .trine), (.jupiter, .sextile): return "Abundance Window"
        case (.jupiter, .conjunction): return "Expansion Peak"
        case (.saturn, _): return "Discipline Phase"
        case (.uranus, _): return "Breakthrough Window"
        case (.neptune, _): return "Inspiration Wave"
        case (.pluto, _): return "Deep Transformation"
        default: return "Activation Window"
        }
    }

    private static func deduplicateWindows(_ windows: [ActivationWindow]) -> [ActivationWindow] {
        var seen = Set<String>()
        return windows.filter { w in
            let key = "\(w.planet)-\(w.lineType)-\(w.transitPlanet)-\(w.aspect)"
            if seen.contains(key) { return false }
            seen.insert(key)
            return true
        }
    }
}
