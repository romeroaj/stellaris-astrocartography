import SwiftUI

/// Redesigned city card: full synthesis text (no truncation), reordered sections,
/// enlarged side-of-line message, activation % next to signal bars.
struct CityDetailView: View {
    let city: City
    @EnvironmentObject var profileManager: ProfileManager
    @State private var synthesis: LocationSynthesis?
    @State private var selectedTab: CityTab = .summary
    @Environment(\.dismiss) private var dismiss

    enum CityTab: String, CaseIterable {
        case summary = "Summary"
        case cosmicTiming = "Cosmic Timing"
        case natalLines = "Natal Lines"
    }

    var body: some View {
        ZStack {
            ParanTheme.background.ignoresSafeArea()

            ScrollView(showsIndicators: false) {
                VStack(spacing: 0) {
                    heroSection
                    tabPickerSection
                    tabContentSection
                }
                .padding(.bottom, 40)
            }
        }
        .navigationBarBackButtonHidden()
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                Button { dismiss() } label: {
                    Image(systemName: "chevron.left")
                        .foregroundStyle(ParanTheme.textPrimary)
                }
            }
        }
        .onAppear { loadSynthesis() }
    }

    // MARK: - Hero Section

    private var heroSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            // City name & vibe
            VStack(alignment: .leading, spacing: 4) {
                Text(city.name)
                    .font(.system(size: 28, weight: .bold))
                    .foregroundStyle(ParanTheme.textPrimary)
                Text(city.country)
                    .font(.system(size: 15))
                    .foregroundStyle(ParanTheme.textSecondary)

                if let syn = synthesis {
                    let dominantSentiment = syn.nearbyLines.first?.sentiment ?? .neutral
                    Text(sentimentVibe(dominantSentiment))
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(ParanTheme.sentimentColor(for: dominantSentiment))
                }
            }

            // Synthesis paragraph: FULL text, no truncation
            if let syn = synthesis {
                Text(syn.paragraph)
                    .font(.system(size: 16, weight: .regular))
                    .foregroundStyle(ParanTheme.textPrimary)
                    .lineSpacing(5)
                    .fixedSize(horizontal: false, vertical: true)
            }

            // Active transit insight (side-of-line message made prominent)
            if let timing = synthesis?.timingSummary {
                HStack(spacing: 10) {
                    Image(systemName: "bolt.circle.fill")
                        .font(.system(size: 20))
                        .foregroundStyle(ParanTheme.accent)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(timing.activationStrength.displayLabel)
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(ParanTheme.accent)
                        Text(timing.plainDescription)
                            .font(.system(size: 14))
                            .foregroundStyle(ParanTheme.textPrimary)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
                .padding(14)
                .background(ParanTheme.accent.opacity(0.1), in: RoundedRectangle(cornerRadius: 12))
            }
        }
        .padding(.horizontal, 20)
        .padding(.top, 60)
        .padding(.bottom, 20)
    }

    // MARK: - Tab Picker

    private var tabPickerSection: some View {
        HStack(spacing: 0) {
            ForEach(CityTab.allCases, id: \.self) { tab in
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) { selectedTab = tab }
                } label: {
                    Text(tab.rawValue)
                        .font(.system(size: 13, weight: selectedTab == tab ? .semibold : .regular))
                        .foregroundStyle(selectedTab == tab ? ParanTheme.accent : ParanTheme.textSecondary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .overlay(alignment: .bottom) {
                            if selectedTab == tab {
                                Rectangle().fill(ParanTheme.accent).frame(height: 2)
                            }
                        }
                }
            }
        }
        .padding(.horizontal)
    }

    // MARK: - Tab Content

    @ViewBuilder
    private var tabContentSection: some View {
        switch selectedTab {
        case .summary:
            summaryTabContent
        case .cosmicTiming:
            cosmicTimingContent
        case .natalLines:
            natalLinesContent
        }
    }

    // MARK: - Summary Tab (reordered per plan)

    private var summaryTabContent: some View {
        VStack(alignment: .leading, spacing: 20) {
            // 1. Strongest planetary lines with % activation
            if let syn = synthesis, !syn.nearbyLines.isEmpty {
                VStack(alignment: .leading, spacing: 10) {
                    SectionHeader(title: "Strongest Lines", icon: "line.diagonal")

                    ForEach(syn.nearbyLines.prefix(4)) { line in
                        PlanetLineRow(analysis: line)
                    }
                }
            }

            // 2. Key themes
            if let syn = synthesis {
                let allThemes = Array(Set(syn.nearbyLines.flatMap(\.keywords)))
                if !allThemes.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        SectionHeader(title: "Themes", icon: "tag.fill")
                        FlowLayout(spacing: 8) {
                            ForEach(allThemes.prefix(8), id: \.self) { theme in
                                Text(theme)
                                    .font(.system(size: 12, weight: .medium))
                                    .foregroundStyle(ParanTheme.textSecondary)
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 5)
                                    .background(ParanTheme.surface, in: Capsule())
                            }
                        }
                    }
                }
            }

            // 3. Relocated chart highlights
            if let syn = synthesis, !syn.relocatedHighlights.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    SectionHeader(title: "Your Chart Here", icon: "circle.grid.cross.fill")

                    ForEach(syn.relocatedHighlights) { highlight in
                        HStack(spacing: 10) {
                            Circle()
                                .fill(ParanTheme.planetColor(for: highlight.planet))
                                .frame(width: 8, height: 8)
                            Text(highlight.plainEnglish)
                                .font(.system(size: 14))
                                .foregroundStyle(ParanTheme.textPrimary)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }
                }
            }

            // 4. Living Here / Visiting Here (full text, no truncation)
            livingVisitingSection

            // 5. Coordinates at bottom
            coordinatesSection
        }
        .padding(.horizontal, 20)
        .padding(.top, 20)
    }

    private var livingVisitingSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            InterpretationCard(
                title: "Living Here",
                icon: "house.fill",
                text: livingHereText
            )

            InterpretationCard(
                title: "Visiting Here",
                icon: "airplane",
                text: visitingHereText
            )
        }
    }

    private var coordinatesSection: some View {
        HStack {
            Text("\(String(format: "%.4f", city.latitude))° \(city.latitude >= 0 ? "N" : "S"), \(String(format: "%.4f", city.longitude))° \(city.longitude >= 0 ? "E" : "W")")
                .font(.system(size: 11, design: .monospaced))
                .foregroundStyle(ParanTheme.textMuted)
            Spacer()
        }
        .padding(.top, 20)
    }

    // MARK: - Cosmic Timing

    private var cosmicTimingContent: some View {
        VStack(alignment: .leading, spacing: 16) {
            PlaceholderCard(text: "Cosmic timing details for \(city.name) will appear here based on active transits.")
        }
        .padding(.horizontal, 20)
        .padding(.top, 20)
    }

    // MARK: - Natal Lines

    private var natalLinesContent: some View {
        VStack(alignment: .leading, spacing: 16) {
            if let syn = synthesis {
                ForEach(syn.nearbyLines) { line in
                    DetailedLineCard(analysis: line)
                }
            }
        }
        .padding(.horizontal, 20)
        .padding(.top, 20)
    }

    // MARK: - Helpers

    private func loadSynthesis() {
        guard let profile = profileManager.activeProfile else { return }
        let lines = AstroEngine.generateLines(birthData: profile)
        synthesis = SynthesisEngine.synthesize(
            birthData: profile,
            lines: lines,
            latitude: city.latitude,
            longitude: city.longitude,
            cityName: city.name
        )
    }

    private var livingHereText: String {
        guard let syn = synthesis, let primary = syn.nearbyLines.first else {
            return "No strong planetary influences detected for this location."
        }
        let themes = primary.keywords.prefix(2).joined(separator: " and ")
        return "\(city.name) offers a consistent environment of \(themes). " +
               "Living here, you'd find these energies woven into your daily life — " +
               "from the people you meet to the opportunities that arise. " +
               (primary.sentiment == .positive
                ? "This is a place where things tend to flow naturally for you."
                : "Growth happens here through challenge — expect to be pushed and transformed.")
    }

    private var visitingHereText: String {
        guard let syn = synthesis, let primary = syn.nearbyLines.first else {
            return "This city doesn't have a strong pull on your chart."
        }
        let themes = primary.keywords.prefix(2).joined(separator: " and ")
        return "A visit to \(city.name) activates your \(themes) themes quickly. " +
               "Even a short trip can shift your energy — " +
               (primary.sentiment == .positive
                ? "this is a place that recharges and inspires you."
                : "expect intense experiences that push your boundaries.")
    }

    private func sentimentVibe(_ sentiment: Sentiment) -> String {
        switch sentiment {
        case .positive: return "Supportive & enriching"
        case .difficult: return "Challenging & transformative"
        case .neutral: return "Balanced & mixed"
        }
    }
}

// MARK: - Supporting Views

struct PlanetLineRow: View {
    let analysis: LocationAnalysis

    var body: some View {
        HStack(spacing: 12) {
            Circle()
                .fill(ParanTheme.planetColor(for: analysis.planet))
                .frame(width: 10, height: 10)

            Text("\(analysis.planet.displayName) \(analysis.lineType.rawValue)")
                .font(.system(size: 15, weight: .medium))
                .foregroundStyle(ParanTheme.textPrimary)

            Spacer()

            SignalBars(strength: analysis.strength, sentiment: analysis.sentiment)

            Text("\(analysis.activationPercent)%")
                .font(.system(size: 14, weight: .bold, design: .monospaced))
                .foregroundStyle(ParanTheme.sentimentColor(for: analysis.sentiment))
                .frame(width: 40, alignment: .trailing)
        }
        .padding(.vertical, 6)
    }
}

struct InterpretationCard: View {
    let title: String
    let icon: String
    let text: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 6) {
                Image(systemName: icon)
                    .font(.system(size: 14))
                    .foregroundStyle(ParanTheme.warm)
                Text(title)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(ParanTheme.textPrimary)
            }

            Text(text)
                .font(.system(size: 14))
                .foregroundStyle(ParanTheme.textPrimary.opacity(0.85))
                .lineSpacing(4)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(16)
        .background(ParanTheme.cardGradient, in: RoundedRectangle(cornerRadius: 14))
        .overlay {
            RoundedRectangle(cornerRadius: 14)
                .stroke(ParanTheme.cardBorder, lineWidth: 1)
        }
    }
}

struct DetailedLineCard: View {
    let analysis: LocationAnalysis
    @State private var showTechnical = false

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Circle()
                    .fill(ParanTheme.planetColor(for: analysis.planet))
                    .frame(width: 12, height: 12)
                Text("\(analysis.planet.displayName) \(analysis.lineType.displayName)")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(ParanTheme.textPrimary)
                Spacer()
                Text("\(analysis.activationPercent)%")
                    .font(.system(size: 15, weight: .bold, design: .monospaced))
                    .foregroundStyle(ParanTheme.sentimentColor(for: analysis.sentiment))
            }

            Text(analysis.strengthLabel)
                .font(.system(size: 13))
                .foregroundStyle(ParanTheme.sentimentColor(for: analysis.sentiment))

            if !analysis.keywords.isEmpty {
                HStack(spacing: 6) {
                    ForEach(analysis.keywords.prefix(4), id: \.self) { kw in
                        Text(kw)
                            .font(.system(size: 11))
                            .foregroundStyle(ParanTheme.textSecondary)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 3)
                            .background(ParanTheme.surface, in: Capsule())
                    }
                }
            }

            Button {
                showTechnical.toggle()
            } label: {
                HStack(spacing: 4) {
                    Image(systemName: "info.circle")
                    Text(showTechnical ? "Hide details" : "Technical details")
                }
                .font(.system(size: 12))
                .foregroundStyle(ParanTheme.textMuted)
            }

            if showTechnical {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Distance: \(String(format: "%.2f", analysis.distance))°")
                    Text("Side: \(analysis.side.rawValue)")
                    Text("Strength: \(String(format: "%.1f", analysis.strength * 100))%")
                }
                .font(.system(size: 12, design: .monospaced))
                .foregroundStyle(ParanTheme.textMuted)
                .padding(.top, 4)
            }
        }
        .padding(16)
        .background(ParanTheme.cardGradient, in: RoundedRectangle(cornerRadius: 14))
        .overlay {
            RoundedRectangle(cornerRadius: 14)
                .stroke(ParanTheme.cardBorder, lineWidth: 1)
        }
    }
}

/// Simple flow layout for theme chips.
struct FlowLayout: Layout {
    let spacing: CGFloat

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = layout(proposal: proposal, subviews: subviews)
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = layout(proposal: proposal, subviews: subviews)
        for (index, position) in result.positions.enumerated() {
            subviews[index].place(at: CGPoint(x: bounds.minX + position.x, y: bounds.minY + position.y), proposal: .unspecified)
        }
    }

    private func layout(proposal: ProposedViewSize, subviews: Subviews) -> (positions: [CGPoint], size: CGSize) {
        let maxWidth = proposal.width ?? .infinity
        var positions: [CGPoint] = []
        var x: CGFloat = 0
        var y: CGFloat = 0
        var rowHeight: CGFloat = 0
        var maxX: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > maxWidth && x > 0 {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            positions.append(CGPoint(x: x, y: y))
            x += size.width + spacing
            maxX = max(maxX, x)
            rowHeight = max(rowHeight, size.height)
        }

        return (positions, CGSize(width: maxX, height: y + rowHeight))
    }
}
