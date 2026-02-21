import SwiftUI

enum ParanTheme {
    // MARK: - Core Palette (Midnight Violet)

    static let background = Color(hex: 0x0B1026)
    static let surface = Color(hex: 0x141A38)
    static let card = Color(hex: 0x1C2451)
    static let cardBorder = Color(hex: 0x252D5E)

    static let accent = Color(hex: 0xA78BFA)       // Violet — primary brand color
    static let accentDeep = Color(hex: 0x7C3AED)    // Deeper violet
    static let warm = Color(hex: 0xD4A373)           // Gold — complementary accent
    static let teal = Color(hex: 0x5EEAD4)           // Positive/supportive
    static let rose = Color(hex: 0xF472B6)           // Venus/love themes
    static let gold = Color(hex: 0xFBBF24)           // Special moments

    // MARK: - Text

    static let textPrimary = Color(hex: 0xE8E2D6)
    static let textSecondary = Color(hex: 0x8B8FA3)
    static let textMuted = Color(hex: 0x565B73)

    // MARK: - Sentiment

    static let positive = Color(hex: 0x10B981)
    static let difficult = Color(hex: 0xEF4444)
    static let neutral = Color(hex: 0xF59E0B)

    // MARK: - Planet Colors

    static func planetColor(for planet: PlanetName) -> Color {
        switch planet {
        case .sun: return Color(hex: 0xFFB800)
        case .moon: return Color(hex: 0xE8E2D6)
        case .mercury: return Color(hex: 0x43D9AD)
        case .venus: return Color(hex: 0xF472B6)
        case .mars: return Color(hex: 0xEF4444)
        case .jupiter: return Color(hex: 0x8B5CF6)
        case .saturn: return Color(hex: 0xF59E0B)
        case .uranus: return Color(hex: 0x06B6D4)
        case .neptune: return Color(hex: 0x3B82F6)
        case .pluto: return Color(hex: 0xDC2626)
        case .chiron: return Color(hex: 0xA78BFA)
        case .northNode: return Color(hex: 0x14B8A6)
        case .southNode: return Color(hex: 0x78716C)
        case .lilith: return Color(hex: 0xD946EF)
        case .ceres: return Color(hex: 0x84CC16)
        case .pallas: return Color(hex: 0x6366F1)
        case .juno: return Color(hex: 0xFB923C)
        case .vesta: return Color(hex: 0xF43F5E)
        }
    }

    static func sentimentColor(for sentiment: Sentiment) -> Color {
        switch sentiment {
        case .positive: return positive
        case .difficult: return difficult
        case .neutral: return neutral
        }
    }

    // MARK: - Gradients

    static let backgroundGradient = LinearGradient(
        colors: [background, surface, card],
        startPoint: .top,
        endPoint: .bottom
    )

    static let cardGradient = LinearGradient(
        colors: [surface.opacity(0.8), card.opacity(0.6)],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    // MARK: - Taglines

    static let appStoreSubtitle = "Find where you shine."
    static let loadingTagline = "Move with the stars."
    static let onboardingHero = "Your chart. Your world."
    static let emotionalHook = "Some places just feel like you."
    static let appStoreOpener = "Where your stars cross."
}

// MARK: - Color Extension

extension Color {
    init(hex: UInt, alpha: Double = 1.0) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255,
            opacity: alpha
        )
    }
}
