import Foundation

// MARK: - Transit Aspect

enum AspectType: String, Codable {
    case conjunction, opposition, trine, square, sextile
}

struct TransitAspect: Identifiable {
    let id = UUID()
    let transitPlanet: PlanetName
    let natalPlanet: PlanetName
    let aspect: AspectType
    let orb: Double
    let isProgression: Bool

    var isApplying: Bool { orb >= 0 }
}

// MARK: - Line Activation

struct LineActivation: Identifiable {
    let id = UUID()
    let natalPlanet: PlanetName
    let natalLineType: LineType
    let transitPlanet: PlanetName
    let aspect: AspectType
    let intensity: ActivationIntensity
    let isProgression: Bool
    let summary: String       // plain-English summary
    let insight: String       // actionable insight
    let isApplying: Bool

    var technicalDescription: String {
        let method = isProgression ? "Progressed" : "Transit"
        return "\(method) \(transitPlanet.displayName) \(aspect.rawValue) natal \(natalPlanet.displayName)"
    }
}

enum ActivationIntensity: String, Codable, Comparable {
    case exact, strong, moderate, fading

    static func < (lhs: ActivationIntensity, rhs: ActivationIntensity) -> Bool {
        let order: [ActivationIntensity] = [.fading, .moderate, .strong, .exact]
        return (order.firstIndex(of: lhs) ?? 0) < (order.firstIndex(of: rhs) ?? 0)
    }
}

// MARK: - Activation Window

struct ActivationWindow: Identifiable {
    let id = UUID()
    let planet: PlanetName
    let lineType: LineType
    let transitPlanet: PlanetName
    let aspect: AspectType
    let startDate: Date
    let endDate: Date
    let exactDate: Date?
    let windowType: WindowType
    let label: String          // "Abundance Peak", "Deep Transformation", etc.
    let plainSummary: String   // plain-English description

    var durationDays: Int {
        Calendar.current.dateComponents([.day], from: startDate, to: endDate).day ?? 0
    }
}

enum WindowType: String, Codable {
    case benefic, evolutionary, neutral
}

// MARK: - City Activation

struct CityActivation {
    let city: City
    let activeTransits: [LineActivation]
    let activationStrength: CityActivationStrength
    let bestVisitWindow: ActivationWindow?
    let nextActivation: ActivationWindow?
}

enum CityActivationStrength: String {
    case peak, active, building, quiet

    var displayLabel: String {
        switch self {
        case .peak: return "Peak Activation"
        case .active: return "Active"
        case .building: return "Building"
        case .quiet: return "Quiet"
        }
    }
}

// MARK: - Timeline Entry (for Travel Timeline feature)

struct TimelineEntry: Identifiable {
    let id = UUID()
    let city: City
    let month: Date
    let tier: TimelineTier
    let strengthPercent: Int
    let plainSummary: String
    let themes: [String]
    let window: ActivationWindow?
    let technicalDetail: String   // hidden behind (i) tooltip
}

enum TimelineTier: String {
    case especiallyGoodNow = "Especially good now"
    case watchOut = "Watch out"
    case alwaysGoodForYou = "Always good for you"
    case notRecommended = "Not recommended"

    var color: String {
        switch self {
        case .especiallyGoodNow: return "accent"
        case .watchOut: return "neutral"
        case .alwaysGoodForYou: return "warm"
        case .notRecommended: return "difficult"
        }
    }
}

// MARK: - Transit Synthesis

struct TransitSynthesis {
    let optimal: [CityAnalysis]
    let intense: [CityAnalysis]
    let timelineEntries: [TimelineEntry]
}

// MARK: - Important Date

struct ImportantDate: Identifiable {
    let id = UUID()
    let date: Date
    let planet: PlanetName
    let aspect: AspectType
    let transitPlanet: PlanetName
    let category: DateCategory
    let summary: String
    let affectedCities: [City]
}

enum DateCategory: String {
    case travel, career, love, growth, caution
}
