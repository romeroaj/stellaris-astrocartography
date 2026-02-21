import Foundation
import CoreLocation

// MARK: - Planets

enum PlanetName: String, CaseIterable, Codable, Identifiable {
    case sun, moon, mercury, venus, mars
    case jupiter, saturn, uranus, neptune, pluto
    case chiron, northNode, southNode, lilith
    case ceres, pallas, juno, vesta

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .northNode: return "North Node"
        case .southNode: return "South Node"
        default: return rawValue.capitalized
        }
    }

    var abbreviation: String {
        switch self {
        case .sun: return "Sun"
        case .moon: return "Moon"
        case .mercury: return "Merc"
        case .venus: return "Venus"
        case .mars: return "Mars"
        case .jupiter: return "Jup"
        case .saturn: return "Sat"
        case .uranus: return "Ura"
        case .neptune: return "Nep"
        case .pluto: return "Pluto"
        case .chiron: return "Chi"
        case .northNode: return "NN"
        case .southNode: return "SN"
        case .lilith: return "Lil"
        case .ceres: return "Cer"
        case .pallas: return "Pal"
        case .juno: return "Juno"
        case .vesta: return "Ves"
        }
    }

    var isMinor: Bool {
        switch self {
        case .ceres, .pallas, .juno, .vesta: return true
        default: return false
        }
    }

    static let major: [PlanetName] = [
        .sun, .moon, .mercury, .venus, .mars,
        .jupiter, .saturn, .uranus, .neptune, .pluto
    ]
}

// MARK: - Line Types

enum LineType: String, CaseIterable, Codable {
    case mc = "MC"
    case ic = "IC"
    case asc = "ASC"
    case dsc = "DSC"

    var displayName: String {
        switch self {
        case .mc: return "Midheaven"
        case .ic: return "Imum Coeli"
        case .asc: return "Ascendant"
        case .dsc: return "Descendant"
        }
    }

    var shortDisplay: String { rawValue }
}

// MARK: - Sentiment

enum Sentiment: String, Codable {
    case positive, difficult, neutral
}

// MARK: - Birth Data

struct BirthData: Codable, Equatable {
    let name: String
    let dateOfBirth: Date
    let latitude: Double
    let longitude: Double
    let locationName: String

    var coordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
    }
}

// MARK: - Astro Line

struct AstroLine: Identifiable, Equatable {
    let id: String
    let planet: PlanetName
    let lineType: LineType
    let points: [CLLocationCoordinate2D]
    var sentiment: Sentiment = .neutral
    var keywords: [String] = []

    static func == (lhs: AstroLine, rhs: AstroLine) -> Bool {
        lhs.id == rhs.id
    }
}

// MARK: - Location Analysis

struct LocationAnalysis: Identifiable {
    let id = UUID()
    let planet: PlanetName
    let lineType: LineType
    let distance: Double        // degrees from exact
    let strength: Double        // 0.0–1.0
    let side: LineSide
    let sentiment: Sentiment
    let keywords: [String]

    var activationPercent: Int {
        ActivationStrength.percent(distance: distance)
    }

    var strengthLabel: String {
        ActivationStrength.label(distance: distance)
    }
}

enum LineSide: String {
    case east, west, exact
}

// MARK: - City

struct City: Identifiable, Codable, Equatable {
    var id: String { "\(name)-\(country)" }
    let name: String
    let country: String
    let latitude: Double
    let longitude: Double

    var coordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
    }
}

// MARK: - City Analysis

struct CityAnalysis: Identifiable {
    let id: String
    let city: City
    let nearbyLines: [LocationAnalysis]
    let sentiment: Sentiment
    let score: Double
    let themes: [String]
    let synthesis: LocationSynthesis?
    var transitBoosted: Bool = false
}

// MARK: - Map Hotspot

struct MapHotspot: Identifiable {
    let id: String
    let city: City
    let sentiment: Sentiment
    let strength: Double
    let theme: String
    let isTransitActive: Bool
}

// MARK: - Activation Strength Utility

enum ActivationStrength {
    static let maxOrb: Double = 12.0

    static func percent(distance: Double) -> Int {
        max(0, Int(round(100 - (distance / maxOrb) * 100)))
    }

    static func label(distance: Double) -> String {
        switch distance {
        case 0..<2: return "Very strong"
        case 2..<4: return "Strong"
        case 4..<6: return "Moderate"
        case 6..<9: return "Mild"
        default: return "Faint"
        }
    }

    static func normalizedStrength(distance: Double) -> Double {
        max(0, 1.0 - (distance / maxOrb))
    }
}
