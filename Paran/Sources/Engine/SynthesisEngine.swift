import Foundation

/// Three-layer synthesis engine.
/// Combines natal lines + relocated chart + transits into plain-English paragraphs.
enum SynthesisEngine {

    /// Full 3-layer synthesis for a location.
    static func synthesize(
        birthData: BirthData,
        lines: [AstroLine],
        latitude: Double,
        longitude: Double,
        cityName: String,
        targetDate: Date = Date(),
        hideMild: Bool = false
    ) -> LocationSynthesis {
        let nearbyLines = AstroEngine.findNearestLines(lines, latitude: latitude, longitude: longitude, maxDistance: 12)
        let filtered = hideMild ? nearbyLines.filter { $0.distance < 9 } : nearbyLines

        let nearbyPlanets = filtered.map(\.planet)
        let highlights = AstroEngine.getRelocatedHighlights(
            birthData: birthData,
            targetLat: latitude,
            targetLon: longitude,
            nearbyPlanets: nearbyPlanets
        )

        let natalSnippets = buildNatalSnippets(nearbyLines: filtered)
        let paragraph = buildParagraph(
            cityName: cityName,
            nearbyLines: filtered,
            highlights: highlights,
            timing: nil
        )

        return LocationSynthesis(
            natalSnippets: natalSnippets,
            nearbyLines: filtered,
            relocatedHighlights: highlights,
            timingSummary: nil,
            paragraph: paragraph
        )
    }

    // MARK: - Natal Snippets

    private static func buildNatalSnippets(nearbyLines: [LocationAnalysis]) -> [String] {
        nearbyLines.prefix(3).map { analysis in
            let themes = analysis.keywords.prefix(2).joined(separator: " and ")
            let strength = analysis.strengthLabel.lowercased()
            return "\(analysis.planet.displayName) energy is \(strength) here — themes of \(themes)."
        }
    }

    // MARK: - Paragraph Builder (Plain English)

    static func buildParagraph(
        cityName: String,
        nearbyLines: [LocationAnalysis],
        highlights: [RelocatedHighlight],
        timing: TimingSummary?
    ) -> String {
        var parts: [String] = []

        // Layer 1: Natal lines
        if let primary = nearbyLines.first {
            let themes = primary.keywords.prefix(2).joined(separator: " and ")
            let strengthDesc: String
            switch primary.distance {
            case 0..<2: strengthDesc = "runs right through"
            case 2..<4: strengthDesc = "is very close to"
            case 4..<6: strengthDesc = "has a strong presence near"
            default: strengthDesc = "has influence near"
            }
            parts.append("\(primary.planet.displayName) \(strengthDesc) \(cityName), bringing \(themes) energy that's always active for you here.")
        }

        if nearbyLines.count > 1 {
            let secondary = nearbyLines[1]
            let themes = secondary.keywords.prefix(2).joined(separator: " and ")
            parts.append("\(secondary.planet.displayName) adds \(themes) themes nearby.")
        }

        // Layer 2: Relocated chart
        if let highlight = highlights.first {
            parts.append(highlight.plainEnglish)
        }

        // Layer 3: Transits
        if let timing = timing {
            parts.append(timing.plainDescription)
        }

        // Sentiment summary
        let positiveCount = nearbyLines.filter { $0.sentiment == .positive }.count
        let difficultCount = nearbyLines.filter { $0.sentiment == .difficult }.count

        if positiveCount > difficultCount {
            parts.append("Overall, this is a supportive place for you.")
        } else if difficultCount > positiveCount {
            parts.append("This city brings growth through challenge — powerful but demanding.")
        }

        return parts.joined(separator: " ")
    }
}
