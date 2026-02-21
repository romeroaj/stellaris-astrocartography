import Foundation

/// Classifies planet-line combinations by sentiment and keywords.
enum LineClassifier {
    struct Classification {
        let sentiment: Sentiment
        let keywords: [String]
    }

    static func classify(planet: PlanetName, lineType: LineType) -> Classification {
        let sentiment = planetSentiment(planet)
        let keywords = planetKeywords(planet) + lineTypeKeywords(lineType)
        return Classification(sentiment: sentiment, keywords: keywords)
    }

    private static func planetSentiment(_ planet: PlanetName) -> Sentiment {
        switch planet {
        case .sun, .venus, .jupiter, .northNode:
            return .positive
        case .mars, .saturn, .pluto, .southNode, .lilith:
            return .difficult
        case .moon, .mercury, .uranus, .neptune, .chiron,
             .ceres, .pallas, .juno, .vesta:
            return .neutral
        }
    }

    private static func planetKeywords(_ planet: PlanetName) -> [String] {
        switch planet {
        case .sun: return ["identity", "vitality", "career", "confidence"]
        case .moon: return ["home", "emotions", "comfort", "intuition"]
        case .mercury: return ["communication", "learning", "networking", "ideas"]
        case .venus: return ["love", "beauty", "creativity", "money"]
        case .mars: return ["energy", "drive", "conflict", "action"]
        case .jupiter: return ["abundance", "growth", "luck", "expansion"]
        case .saturn: return ["discipline", "structure", "challenges", "mastery"]
        case .uranus: return ["change", "freedom", "innovation", "disruption"]
        case .neptune: return ["spirituality", "dreams", "confusion", "inspiration"]
        case .pluto: return ["transformation", "power", "intensity", "rebirth"]
        case .chiron: return ["healing", "wisdom", "vulnerability", "teaching"]
        case .northNode: return ["destiny", "growth", "purpose", "evolution"]
        case .southNode: return ["comfort zone", "past patterns", "release"]
        case .lilith: return ["independence", "shadow work", "raw power"]
        case .ceres: return ["nurturing", "nourishment", "mother energy"]
        case .pallas: return ["strategy", "wisdom", "creative intelligence"]
        case .juno: return ["partnership", "commitment", "loyalty"]
        case .vesta: return ["dedication", "focus", "sacred purpose"]
        }
    }

    private static func lineTypeKeywords(_ lineType: LineType) -> [String] {
        switch lineType {
        case .mc: return ["career", "public life", "reputation"]
        case .ic: return ["home", "roots", "inner self"]
        case .asc: return ["personality", "appearance", "first impressions"]
        case .dsc: return ["relationships", "partnerships", "others"]
        }
    }
}
