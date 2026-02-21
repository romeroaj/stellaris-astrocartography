import Foundation

/// Planet + line type interpretation library.
/// Plain-English descriptions for livingHere, visitingHere, themes, bestFor, challenges.
struct Interpretation {
    let livingHere: String
    let visitingHere: String
    let themes: [String]
    let bestFor: [String]
    let challenges: [String]
}

enum Interpretations {

    static func get(planet: PlanetName, lineType: LineType) -> Interpretation {
        let key = "\(planet.rawValue)-\(lineType.rawValue)"
        return library[key] ?? fallback(planet: planet, lineType: lineType)
    }

    private static func fallback(planet: PlanetName, lineType: LineType) -> Interpretation {
        let themes = LineClassifier.classify(planet: planet, lineType: lineType).keywords
        return Interpretation(
            livingHere: "\(planet.displayName) energy shapes your daily experience through \(lineType.displayName.lowercased()) themes. Living here means these qualities become part of your routine.",
            visitingHere: "A visit activates \(planet.displayName.lowercased()) themes quickly — you'll feel its influence within days.",
            themes: themes,
            bestFor: themes.prefix(2).map { $0 },
            challenges: ["Overidentification with \(planet.displayName.lowercased()) themes"]
        )
    }

    // MARK: - Library

    static let library: [String: Interpretation] = [
        "sun-MC": Interpretation(
            livingHere: "Your career and public reputation shine here. People see you as a natural leader. Professional success comes more easily, and you're recognized for your talents. This is a power spot for building a public-facing career.",
            visitingHere: "Even a short visit can boost your confidence and professional clarity. Good for networking, pitches, and making bold moves.",
            themes: ["career", "identity", "recognition", "leadership"],
            bestFor: ["career advancement", "public visibility", "starting a business"],
            challenges: ["Ego inflation", "workaholism", "identity tied too strongly to work"]
        ),
        "sun-IC": Interpretation(
            livingHere: "You feel deeply rooted here. Home and family life center your identity. This is where you build a strong internal foundation. Great for settling down and creating a private sanctuary.",
            visitingHere: "Reconnects you with your core self. A retreat-like energy — good for rest, reflection, and family visits.",
            themes: ["home", "family", "roots", "inner self"],
            bestFor: ["settling down", "family life", "self-discovery"],
            challenges: ["Isolation", "reluctance to engage with the outside world"]
        ),
        "sun-ASC": Interpretation(
            livingHere: "You radiate confidence and vitality here. People are drawn to you naturally. Your personality shines through in every interaction. This is where you feel most like yourself.",
            visitingHere: "You'll feel a boost of energy and charisma from the moment you arrive. Great for social events, dating, and making first impressions.",
            themes: ["identity", "confidence", "vitality", "appearance"],
            bestFor: ["personal reinvention", "social life", "health and fitness goals"],
            challenges: ["Self-centeredness", "burnout from being always 'on'"]
        ),
        "sun-DSC": Interpretation(
            livingHere: "Relationships and partnerships define your experience here. You attract significant others and business partners. Collaboration is the key to success in this location.",
            visitingHere: "Expect to meet important people. Travel here for relationship milestones, business partnerships, or collaborative projects.",
            themes: ["relationships", "partnerships", "collaboration"],
            bestFor: ["finding a partner", "business partnerships", "diplomatic work"],
            challenges: ["Losing yourself in others", "codependency"]
        ),
        "venus-ASC": Interpretation(
            livingHere: "Love, beauty, and pleasure follow you here. You're perceived as attractive and charming. Creative pursuits flourish. This is one of the most pleasant places on your map for daily life.",
            visitingHere: "A romantic and indulgent destination. Perfect for honeymoons, creative retreats, and self-care trips.",
            themes: ["love", "beauty", "creativity", "pleasure"],
            bestFor: ["romance", "creative work", "luxury experiences", "self-care"],
            challenges: ["Overindulgence", "superficiality", "avoiding hard work"]
        ),
        "venus-MC": Interpretation(
            livingHere: "Your career benefits from charm, aesthetics, and social grace. Success comes through beauty, diplomacy, and creative industries. You're liked by colleagues and the public.",
            visitingHere: "Good for art exhibitions, fashion events, and career moves in creative fields.",
            themes: ["career", "creativity", "beauty", "social status"],
            bestFor: ["creative careers", "public relations", "arts and design"],
            challenges: ["Prioritizing appearance over substance"]
        ),
        "venus-IC": Interpretation(
            livingHere: "Your home is a beautiful sanctuary. You invest in making your living space gorgeous and comfortable. Family relationships are harmonious. Deep sense of belonging.",
            visitingHere: "Feels like coming home. Comfort, warmth, and beauty surround you. Great for rest and recharging.",
            themes: ["home", "beauty", "family harmony", "comfort"],
            bestFor: ["creating a beautiful home", "family harmony", "comfort"],
            challenges: ["Materialism focused on home", "reluctance to leave"]
        ),
        "venus-DSC": Interpretation(
            livingHere: "You attract loving, beautiful partnerships here. Romantic relationships thrive. Business partnerships are harmonious and profitable. Social life is rich and fulfilling.",
            visitingHere: "Prime destination for romance. You may meet someone special or deepen an existing relationship.",
            themes: ["love", "partnership", "beauty", "harmony"],
            bestFor: ["finding love", "romantic trips", "artistic collaboration"],
            challenges: ["Idealizing partners", "avoiding necessary conflict"]
        ),
        "jupiter-MC": Interpretation(
            livingHere: "Career expansion and abundance flow here. Opportunities come from all directions. You're seen as wise and generous. This is a top location for professional growth and financial success.",
            visitingHere: "Lucky breaks in career matters. Great for job interviews, business launches, and professional networking.",
            themes: ["abundance", "career", "growth", "luck"],
            bestFor: ["career growth", "financial expansion", "higher education"],
            challenges: ["Overcommitting", "taking on too much", "overconfidence"]
        ),
        "jupiter-ASC": Interpretation(
            livingHere: "Life feels expansive and optimistic here. Opportunities find you. You're perceived as generous and wise. Health and vitality improve. Everything feels bigger and more possible.",
            visitingHere: "An energizing, optimistic destination. Come here when you need a perspective shift or lucky break.",
            themes: ["expansion", "luck", "optimism", "growth"],
            bestFor: ["starting fresh", "adventure", "personal growth"],
            challenges: ["Weight gain", "overindulgence", "scattered energy"]
        ),
        "saturn-MC": Interpretation(
            livingHere: "Career demands discipline and long-term commitment here. Success comes slowly but is enduring. You're respected for your work ethic. Authority figures play a significant role.",
            visitingHere: "Not the most fun destination, but productive. Good for serious meetings, strategic planning, and career assessment.",
            themes: ["discipline", "career", "structure", "authority"],
            bestFor: ["building long-term career", "earning respect", "mastering a craft"],
            challenges: ["Rigidity", "loneliness", "excessive pressure"]
        ),
        "saturn-ASC": Interpretation(
            livingHere: "Life here requires maturity and self-discipline. You're taken seriously but may feel weighed down. Growth happens through accepting responsibility. Character-building location.",
            visitingHere: "Sobering and grounding. Good for getting serious about goals, less ideal for vacation.",
            themes: ["discipline", "structure", "maturity", "limitation"],
            bestFor: ["character building", "serious goals", "long-term planning"],
            challenges: ["Depression", "feeling restricted", "aging faster"]
        ),
        "mars-ASC": Interpretation(
            livingHere: "High energy and drive define life here. You're more assertive, competitive, and action-oriented. Physical vitality increases. Conflict is also more likely.",
            visitingHere: "An energizing destination. Great for athletic events, competitions, and taking bold action.",
            themes: ["energy", "drive", "conflict", "action"],
            bestFor: ["athletics", "military careers", "entrepreneurship"],
            challenges: ["Aggression", "accidents", "burnout", "conflicts"]
        ),
        "moon-IC": Interpretation(
            livingHere: "The deepest sense of emotional belonging. This is where your soul feels at home. Family connections are profound. Your emotional life is rich and nurturing.",
            visitingHere: "Deeply comforting. Like a warm hug from the universe. Perfect for healing trips and family reunions.",
            themes: ["home", "emotions", "family", "comfort"],
            bestFor: ["settling down", "raising children", "emotional healing"],
            challenges: ["Moodiness", "over-attachment to home", "resistance to change"]
        ),
        "pluto-MC": Interpretation(
            livingHere: "Powerful transformation through career. You may gain significant influence or go through complete career reinventions. Power dynamics in your professional life are intense.",
            visitingHere: "Can trigger professional breakthroughs or power struggles. Come prepared for intensity.",
            themes: ["transformation", "power", "career", "intensity"],
            bestFor: ["career reinvention", "gaining influence", "deep research"],
            challenges: ["Power struggles", "obsession with control", "enemies"]
        ),
        "neptune-MC": Interpretation(
            livingHere: "Creative, spiritual, or healing work thrives here. Your career may involve arts, music, spirituality, or helping others. Boundaries between work and dreams blur — beautifully or confusingly.",
            visitingHere: "Inspiring and dreamy. Good for creative retreats, spiritual pilgrimages, and artistic inspiration.",
            themes: ["spirituality", "creativity", "dreams", "healing"],
            bestFor: ["artistic careers", "spiritual growth", "healing work"],
            challenges: ["Confusion", "lack of direction", "deception in career"]
        ),
    ]
}
