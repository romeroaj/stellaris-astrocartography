import { PlanetName, LineType } from "./types";
import { getInterpretation } from "./interpretations";

export type LineSentiment = "positive" | "difficult" | "neutral";

export interface LineClassification {
    sentiment: LineSentiment;
    keywords: string[];
}

/**
 * Classify a planet+lineType combo into positive / difficult / neutral.
 *
 * Positive  → Venus (all), Jupiter (all), Sun MC/ASC, Moon IC/ASC
 * Difficult → Saturn (all), Pluto (all), Mars ASC/DSC/MC, Neptune ASC/IC
 * Neutral   → everything else (mixed energy)
 */
/**
 * Semantic aliases: when the user selects a tag like "love",
 * we also match interpretation text that contains any of these related terms.
 */
const KEYWORD_ALIASES: Record<string, string[]> = {
    love: ["love", "romance", "romantic", "partner", "partnership", "relationship", "marriage", "attraction", "intimacy", "heart", "soulmate"],
    money: ["money", "financ", "wealth", "income", "invest", "profit", "real estate", "property", "abundan", "prosper", "fortun", "luck", "salary", "commerce", "banking", "joint venture"],
    career: ["career", "work", "business", "profession", "job", "vocation", "success", "achievement", "ambition", "management", "entrepreneur"],
    home: ["home", "family", "domestic", "roots", "foundation", "living", "household", "nurtur", "property", "real estate"],
    creativity: ["creativ", "art", "music", "expression", "inspiration", "talent", "performance", "writing", "design", "fashion"],
    spiritual: ["spiritual", "soul", "mystical", "meditation", "transcend", "divine", "intuition", "psychic", "wisdom"],
    travel: ["travel", "international", "abroad", "foreign", "migration", "exploration", "adventure"],
    healing: ["heal", "therap", "recovery", "transform", "renewal", "wellness", "health"],
    leadership: ["leader", "authority", "power", "influence", "command", "govern", "public", "fame"],
    partnerships: ["partner", "collaborat", "relationship", "alliance", "marriage", "teamwork"],
};

/**
 * Check if a line matches a given keyword tag, using alias expansion.
 */
export function lineMatchesKeyword(planet: PlanetName, lineType: LineType, keyword: string): boolean {
    const cls = classifyLine(planet, lineType);
    const aliases = KEYWORD_ALIASES[keyword] || [keyword];
    return cls.keywords.some((kw) =>
        aliases.some((alias) => kw.includes(alias))
    );
}

export function classifyLine(planet: PlanetName, lineType: LineType): LineClassification {
    const sentiment = getSentiment(planet, lineType);
    const interp = getInterpretation(planet, lineType);

    const keywords = [
        ...interp.themes,
        ...interp.bestFor,
    ].map((k) => k.toLowerCase());

    return { sentiment, keywords };
}

function getSentiment(planet: PlanetName, lineType: LineType): LineSentiment {
    // Venus & Jupiter are benefic — positive on all lines
    if (planet === "venus" || planet === "jupiter") return "positive";

    // Saturn: disciplined but challenging — MC can bring lasting success (neutral),
    // other lines lean difficult
    if (planet === "saturn") {
        if (lineType === "MC") return "neutral";
        return "difficult";
    }

    // Pluto: transformative — MC/IC are intense but can be empowering (neutral),
    // ASC/DSC involve power struggles (difficult)
    if (planet === "pluto") {
        if (lineType === "MC" || lineType === "IC") return "neutral";
        return "difficult";
    }

    // Sun: MC & ASC are power lines (positive); IC/DSC are neutral
    if (planet === "sun") {
        if (lineType === "MC" || lineType === "ASC") return "positive";
        return "neutral";
    }

    // Moon: IC (emotional home) & ASC (intuition) are positive
    if (planet === "moon") {
        if (lineType === "IC" || lineType === "ASC") return "positive";
        return "neutral";
    }

    // Mars: ASC/DSC/MC carry intense/difficult energy
    if (planet === "mars") {
        if (lineType === "ASC" || lineType === "DSC" || lineType === "MC") return "difficult";
        return "neutral";
    }

    // Neptune: ASC & IC can be confusing/escapist
    if (planet === "neptune") {
        if (lineType === "ASC" || lineType === "IC") return "difficult";
        return "neutral";
    }

    // Chiron: wounded healer — mixed healing/wound energy
    if (planet === "chiron") return "neutral";

    // North Node: destiny and growth — positive
    if (planet === "northnode") return "positive";

    // South Node: karmic past — neutral (comfort + stagnation)
    if (planet === "southnode") return "neutral";

    // Lilith: shadow and liberation — neutral (empowering but intense)
    if (planet === "lilith") return "neutral";

    // Ceres: nurturing — neutral (nurture + grief)
    if (planet === "ceres") return "neutral";

    // Mercury, Uranus, Pallas, Juno, Vesta default neutral
    return "neutral";
}

/** Sentiment colors for map overlay */
export const SENTIMENT_COLORS: Record<LineSentiment, string> = {
    positive: "#10B981",
    difficult: "#EF4444",
    neutral: "#F59E0B",
};

/** Human-readable labels */
export const SENTIMENT_LABELS: Record<LineSentiment, string> = {
    positive: "Positive",
    difficult: "Difficult",
    neutral: "Neutral",
};
