import SwiftUI

/// Places tab: split into "Always Good For You" and "Currently Activated".
struct PlacesView: View {
    @EnvironmentObject var profileManager: ProfileManager
    @State private var selectedSubTab: PlacesSubTab = .alwaysGood
    @State private var purposeFilter: PurposeFilter = .all
    @State private var selectedThemes: Set<String> = []
    @State private var alwaysGoodCities: [CityAnalysis] = []
    @State private var activatedCities: [CityAnalysis] = []

    enum PlacesSubTab: String, CaseIterable {
        case alwaysGood = "Always Good For You"
        case activated = "Currently Activated"
    }

    enum PurposeFilter: String, CaseIterable {
        case all = "All"
        case living = "Best for Living"
        case visiting = "Best for Visiting"
    }

    private let themeOptions = [
        "love", "career", "creativity", "abundance",
        "growth", "adventure", "peace", "home"
    ]

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(spacing: 16) {
                subTabPicker
                purposePicker
                themeFilterRow
                cityList
            }
            .padding(.horizontal)
            .padding(.top, 16)
            .padding(.bottom, 100)
        }
        .onAppear { loadCities() }
    }

    // MARK: - Sub-Tab Picker

    private var subTabPicker: some View {
        HStack(spacing: 0) {
            ForEach(PlacesSubTab.allCases, id: \.self) { tab in
                Button {
                    withAnimation { selectedSubTab = tab }
                } label: {
                    Text(tab.rawValue)
                        .font(.system(size: 12, weight: selectedSubTab == tab ? .bold : .medium))
                        .foregroundStyle(selectedSubTab == tab ? ParanTheme.background : ParanTheme.textSecondary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .background {
                            if selectedSubTab == tab {
                                Capsule().fill(ParanTheme.accent)
                            }
                        }
                }
            }
        }
        .padding(3)
        .background(ParanTheme.surface, in: Capsule())
    }

    // MARK: - Purpose Picker

    private var purposePicker: some View {
        HStack(spacing: 8) {
            ForEach(PurposeFilter.allCases, id: \.self) { filter in
                Button {
                    withAnimation { purposeFilter = filter }
                } label: {
                    Text(filter.rawValue)
                        .font(.system(size: 11, weight: purposeFilter == filter ? .semibold : .regular))
                        .foregroundStyle(purposeFilter == filter ? ParanTheme.textPrimary : ParanTheme.textMuted)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 5)
                        .background(
                            purposeFilter == filter ? ParanTheme.card : Color.clear,
                            in: Capsule()
                        )
                }
            }
            Spacer()
        }
    }

    // MARK: - Theme Filter

    private var themeFilterRow: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                ForEach(themeOptions, id: \.self) { theme in
                    ThemeChip(theme: theme, isSelected: selectedThemes.contains(theme)) {
                        if selectedThemes.contains(theme) {
                            selectedThemes.remove(theme)
                        } else {
                            selectedThemes.insert(theme)
                        }
                    }
                }
            }
        }
    }

    // MARK: - City List

    private var cityList: some View {
        let cities = selectedSubTab == .alwaysGood ? alwaysGoodCities : activatedCities
        let filtered = applyFilters(cities)

        return LazyVStack(spacing: 12) {
            ForEach(filtered) { city in
                PlaceCityRow(city: city, showTransitBadge: selectedSubTab == .alwaysGood && city.transitBoosted)
            }

            if filtered.isEmpty {
                Text("No cities match your current filters.")
                    .font(.system(size: 14))
                    .foregroundStyle(ParanTheme.textMuted)
                    .padding(.vertical, 40)
            }
        }
    }

    // MARK: - Filters

    private func applyFilters(_ cities: [CityAnalysis]) -> [CityAnalysis] {
        var result = cities

        if !selectedThemes.isEmpty {
            result = result.filter { city in
                !selectedThemes.isDisjoint(with: Set(city.themes))
            }
        }

        return result
    }

    // MARK: - Data Loading

    private func loadCities() {
        guard let profile = profileManager.activeProfile else { return }
        let lines = AstroEngine.generateLines(birthData: profile)

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

        alwaysGoodCities = analyses
            .filter { $0.sentiment == .positive || $0.score > 1.5 }
            .sorted { $0.score > $1.score }

        activatedCities = analyses
            .filter { $0.transitBoosted }
            .sorted { $0.score > $1.score }
    }
}

// MARK: - Place City Row

struct PlaceCityRow: View {
    let city: CityAnalysis
    let showTransitBadge: Bool

    var body: some View {
        HStack(spacing: 14) {
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Text(city.city.name)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(ParanTheme.textPrimary)

                    if showTransitBadge {
                        Text("transit-boosted")
                            .font(.system(size: 9, weight: .semibold))
                            .foregroundStyle(ParanTheme.accent)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(ParanTheme.accent.opacity(0.15), in: Capsule())
                    }
                }

                Text(city.city.country)
                    .font(.system(size: 12))
                    .foregroundStyle(ParanTheme.textSecondary)

                HStack(spacing: 4) {
                    ForEach(city.themes.prefix(3), id: \.self) { theme in
                        Text(theme)
                            .font(.system(size: 10))
                            .foregroundStyle(ParanTheme.textMuted)
                    }
                }
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 4) {
                SignalBars(strength: city.score / 4.0, sentiment: city.sentiment)

                if let primary = city.nearbyLines.first {
                    Text("\(primary.activationPercent)%")
                        .font(.system(size: 13, weight: .bold, design: .monospaced))
                        .foregroundStyle(ParanTheme.sentimentColor(for: city.sentiment))
                }
            }
        }
        .padding(14)
        .background(ParanTheme.cardGradient, in: RoundedRectangle(cornerRadius: 14))
        .overlay {
            RoundedRectangle(cornerRadius: 14)
                .stroke(ParanTheme.cardBorder, lineWidth: 1)
        }
    }
}

struct SignalBars: View {
    let strength: Double // 0-1
    let sentiment: Sentiment

    var body: some View {
        HStack(spacing: 2) {
            ForEach(0..<4) { i in
                Rectangle()
                    .fill(i < filledBars ? ParanTheme.sentimentColor(for: sentiment) : ParanTheme.textMuted.opacity(0.3))
                    .frame(width: 5, height: CGFloat(5 + i * 3))
                    .clipShape(RoundedRectangle(cornerRadius: 1))
            }
        }
    }

    private var filledBars: Int {
        switch strength {
        case 0.75...: return 4
        case 0.5..<0.75: return 3
        case 0.25..<0.5: return 2
        default: return 1
        }
    }
}
