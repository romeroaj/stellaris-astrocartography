import Foundation

// MARK: - Location Synthesis (Three-Layer Engine)

struct LocationSynthesis {
    let natalSnippets: [String]
    let nearbyLines: [LocationAnalysis]
    let relocatedHighlights: [RelocatedHighlight]
    let timingSummary: TimingSummary?
    let paragraph: String           // plain-English synthesis combining all three layers
}

// MARK: - Natal Condition

struct NatalCondition {
    let planet: PlanetName
    let tag: ConditionTag
    let aspects: [NatalAspect]
    let reason: String?
}

enum ConditionTag: String {
    case strong, challenged, neutral
}

struct NatalAspect {
    let otherPlanet: PlanetName
    let aspect: AspectType
    let isHard: Bool
}

// MARK: - Relocated Chart

struct RelocatedChart {
    let ascendantSign: Int         // 0-11 (Aries=0, Taurus=1, etc.)
    let midheavenSign: Int
    let planetsInHouses: [PlanetHousePlacement]
}

struct PlanetHousePlacement: Identifiable {
    let id = UUID()
    let planet: PlanetName
    let house: Int                 // 1-12
    let isAngular: Bool

    var houseTheme: String {
        HouseThemes.theme(for: house)
    }

    var plainEnglish: String {
        "Your \(planet.displayName.lowercased()) in your \(house.ordinal) house — \(houseTheme) take center stage here."
    }
}

struct RelocatedHighlight: Identifiable {
    let id = UUID()
    let planet: PlanetName
    let house: Int
    let plainEnglish: String
}

// MARK: - Timing Summary

struct TimingSummary {
    let activationStrength: CityActivationStrength
    let bestVisitWindow: ActivationWindow?
    let activeTransitCount: Int
    let plainDescription: String   // "Supportive energy is boosting your career themes here through April."
}

// MARK: - House Themes

enum HouseThemes {
    static func theme(for house: Int) -> String {
        switch house {
        case 1: return "self, identity, and first impressions"
        case 2: return "money, possessions, and self-worth"
        case 3: return "communication, learning, and local connections"
        case 4: return "home, family, and emotional foundations"
        case 5: return "creativity, romance, and self-expression"
        case 6: return "work, health, and daily routines"
        case 7: return "partnerships, relationships, and collaboration"
        case 8: return "transformation, shared resources, and deep bonds"
        case 9: return "travel, philosophy, and expanding horizons"
        case 10: return "career, reputation, and public life"
        case 11: return "community, friendships, and future visions"
        case 12: return "spirituality, solitude, and the subconscious"
        default: return "life themes"
        }
    }
}

// MARK: - Int Extension for Ordinal

extension Int {
    var ordinal: String {
        let suffix: String
        let ones = self % 10
        let tens = (self / 10) % 10
        if tens == 1 {
            suffix = "th"
        } else {
            switch ones {
            case 1: suffix = "st"
            case 2: suffix = "nd"
            case 3: suffix = "rd"
            default: suffix = "th"
            }
        }
        return "\(self)\(suffix)"
    }
}
