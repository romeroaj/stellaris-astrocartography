import SwiftUI
import CoreLocation

/// Summary tab: "Right Now" redesign with 3-layer mini-synthesis,
/// best places, and 4-pillar quick action CTAs.
struct InsightsSummaryView: View {
    @EnvironmentObject var profileManager: ProfileManager
    @StateObject private var locationManager = LocationService()
    @State private var currentSynthesis: LocationSynthesis?
    @State private var topNatalCities: [CityAnalysis] = []
    @State private var transitBoostedCities: [CityAnalysis] = []

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(spacing: 20) {
                currentLocationSection
                bestPlacesSection
                quickActionsSection
            }
            .padding(.horizontal)
            .padding(.top, 16)
            .padding(.bottom, 100)
        }
        .onAppear { loadData() }
    }

    // MARK: - Section 1: Your Location Right Now

    private var currentLocationSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeader(title: "Your Location Right Now", icon: "location.fill")

            if let synthesis = currentSynthesis {
                VStack(alignment: .leading, spacing: 10) {
                    Text(locationManager.cityName ?? "Current Location")
                        .font(.system(size: 20, weight: .bold))
                        .foregroundStyle(ParanTheme.textPrimary)

                    Text(synthesis.paragraph)
                        .font(.system(size: 15, weight: .regular))
                        .foregroundStyle(ParanTheme.textPrimary.opacity(0.9))
                        .lineSpacing(4)
                        .fixedSize(horizontal: false, vertical: true)

                    if !synthesis.nearbyLines.isEmpty {
                        HStack(spacing: 8) {
                            ForEach(synthesis.nearbyLines.prefix(3)) { line in
                                LineChip(analysis: line)
                            }
                        }
                    }
                }
                .padding()
                .background(ParanTheme.cardGradient, in: RoundedRectangle(cornerRadius: 16))
                .overlay {
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(ParanTheme.cardBorder, lineWidth: 1)
                }
            } else {
                PlaceholderCard(text: "Enable location services to see insights for where you are now.")
            }
        }
    }

    // MARK: - Section 2: Best Places Right Now

    private var bestPlacesSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            if !transitBoostedCities.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    SectionHeader(title: "Cities Calling You This Season", icon: "sparkles")
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 12) {
                            ForEach(transitBoostedCities.prefix(5)) { city in
                                CityPreviewCard(city: city, variant: .transitBoosted)
                            }
                        }
                    }
                }
            }

            VStack(alignment: .leading, spacing: 8) {
                SectionHeader(title: "Your Power Places", icon: "star.fill")
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(topNatalCities.prefix(5)) { city in
                            CityPreviewCard(city: city, variant: .alwaysGood)
                        }
                    }
                }
            }
        }
    }

    // MARK: - Section 3: Quick Actions (4 Pillars)

    private var quickActionsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeader(title: "Explore", icon: "compass")

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                PillarButton(
                    title: "Find Where to Live",
                    subtitle: "Best natal matches",
                    icon: "house.fill",
                    color: ParanTheme.warm
                ) {}

                PillarButton(
                    title: "Plan Your Next Trip",
                    subtitle: "Travel timeline",
                    icon: "airplane",
                    color: ParanTheme.accent
                ) {}

                PillarButton(
                    title: "Explore with a Friend",
                    subtitle: "Bond insights",
                    icon: "heart.circle.fill",
                    color: ParanTheme.rose
                ) {}

                PillarButton(
                    title: "Search a City",
                    subtitle: "Any location",
                    icon: "magnifyingglass",
                    color: ParanTheme.teal
                ) {}
            }
        }
    }

    // MARK: - Data Loading

    private func loadData() {
        guard let profile = profileManager.activeProfile else { return }
        let lines = AstroEngine.generateLines(birthData: profile)

        if let location = locationManager.currentLocation {
            currentSynthesis = SynthesisEngine.synthesize(
                birthData: profile,
                lines: lines,
                latitude: location.latitude,
                longitude: location.longitude,
                cityName: locationManager.cityName ?? "Here"
            )
        }

        var analyses: [CityAnalysis] = []
        for city in WorldCities.all {
            let synthesis = SynthesisEngine.synthesize(
                birthData: profile,
                lines: lines,
                latitude: city.latitude,
                longitude: city.longitude,
                cityName: city.name,
                hideMild: true
            )
            guard !synthesis.nearbyLines.isEmpty else { continue }

            let sentiment = synthesis.nearbyLines.first?.sentiment ?? .neutral
            let score = synthesis.nearbyLines.reduce(0.0) { $0 + $1.strength }
            let themes = Array(Set(synthesis.nearbyLines.flatMap(\.keywords))).sorted()

            analyses.append(CityAnalysis(
                id: city.id,
                city: city,
                nearbyLines: synthesis.nearbyLines,
                sentiment: sentiment,
                score: score,
                themes: themes,
                synthesis: synthesis
            ))
        }

        topNatalCities = analyses
            .sorted { $0.score > $1.score }
            .prefix(10)
            .map { $0 }
    }
}

// MARK: - Supporting Views

struct SectionHeader: View {
    let title: String
    let icon: String

    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: icon)
                .font(.system(size: 14))
                .foregroundStyle(ParanTheme.accent)
            Text(title)
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(ParanTheme.textPrimary)
        }
    }
}

struct LineChip: View {
    let analysis: LocationAnalysis

    var body: some View {
        HStack(spacing: 4) {
            Circle()
                .fill(ParanTheme.planetColor(for: analysis.planet))
                .frame(width: 8, height: 8)
            Text("\(analysis.planet.abbreviation) \(analysis.lineType.shortDisplay)")
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(ParanTheme.textPrimary)
            Text("\(analysis.activationPercent)%")
                .font(.system(size: 10, weight: .bold))
                .foregroundStyle(ParanTheme.textSecondary)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(ParanTheme.surface, in: Capsule())
    }
}

struct CityPreviewCard: View {
    let city: CityAnalysis
    let variant: CityPreviewVariant

    enum CityPreviewVariant {
        case alwaysGood, transitBoosted
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(city.city.name)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(ParanTheme.textPrimary)
            Text(city.city.country)
                .font(.system(size: 11))
                .foregroundStyle(ParanTheme.textSecondary)

            HStack(spacing: 2) {
                ForEach(0..<4) { i in
                    Rectangle()
                        .fill(i < signalBars ? accentColor : ParanTheme.textMuted.opacity(0.3))
                        .frame(width: 6, height: CGFloat(6 + i * 3))
                        .clipShape(RoundedRectangle(cornerRadius: 1))
                }
                Text("\(Int(city.score * 25))%")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(ParanTheme.textSecondary)
                    .padding(.leading, 2)
            }

            if variant == .transitBoosted {
                Text("Active now")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundStyle(ParanTheme.accent)
            }
        }
        .padding(12)
        .frame(width: 130)
        .background(ParanTheme.cardGradient, in: RoundedRectangle(cornerRadius: 12))
        .overlay {
            RoundedRectangle(cornerRadius: 12)
                .stroke(variant == .transitBoosted ? ParanTheme.accent.opacity(0.4) : ParanTheme.cardBorder, lineWidth: 1)
        }
    }

    private var signalBars: Int {
        switch city.score {
        case 3...: return 4
        case 2..<3: return 3
        case 1..<2: return 2
        default: return 1
        }
    }

    private var accentColor: Color {
        ParanTheme.sentimentColor(for: city.sentiment)
    }
}

struct PlaceholderCard: View {
    let text: String

    var body: some View {
        Text(text)
            .font(.system(size: 14))
            .foregroundStyle(ParanTheme.textSecondary)
            .multilineTextAlignment(.center)
            .padding()
            .frame(maxWidth: .infinity)
            .background(ParanTheme.surface, in: RoundedRectangle(cornerRadius: 16))
    }
}

struct PillarButton: View {
    let title: String
    let subtitle: String
    let icon: String
    let color: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 6) {
                Image(systemName: icon)
                    .font(.system(size: 22))
                    .foregroundStyle(color)
                Text(title)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(ParanTheme.textPrimary)
                Text(subtitle)
                    .font(.system(size: 11))
                    .foregroundStyle(ParanTheme.textSecondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(14)
            .background(ParanTheme.cardGradient, in: RoundedRectangle(cornerRadius: 14))
            .overlay {
                RoundedRectangle(cornerRadius: 14)
                    .stroke(ParanTheme.cardBorder, lineWidth: 1)
            }
        }
    }
}
