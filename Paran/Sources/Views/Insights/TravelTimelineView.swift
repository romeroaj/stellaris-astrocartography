import SwiftUI

/// Travel Timeline: the killer feature for subscriber retention.
/// Vertical descending timeline grouped by month showing transit-activated cities.
struct TravelTimelineView: View {
    @EnvironmentObject var profileManager: ProfileManager
    @State private var selectedRange: TimeRange = .threeMonths
    @State private var selectedThemes: Set<String> = []
    @State private var entries: [MonthGroup] = []
    @State private var showMore = false

    enum TimeRange: String, CaseIterable {
        case oneMonth = "1m"
        case threeMonths = "3m"
        case sixMonths = "6m"
        case oneYear = "1y"

        var months: Int {
            switch self {
            case .oneMonth: return 1
            case .threeMonths: return 3
            case .sixMonths: return 6
            case .oneYear: return 12
            }
        }
    }

    struct MonthGroup: Identifiable {
        let id = UUID()
        let monthLabel: String
        let entries: [TimelineEntry]
    }

    private let availableThemes = [
        "love", "career", "creativity", "abundance",
        "growth", "adventure", "peace", "home"
    ]

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(spacing: 16) {
                rangePicker
                themeChips
                timelineContent
            }
            .padding(.horizontal)
            .padding(.top, 16)
            .padding(.bottom, 100)
        }
        .onAppear { buildTimeline() }
        .onChange(of: selectedRange) { _ in buildTimeline() }
        .onChange(of: selectedThemes) { _ in buildTimeline() }
    }

    // MARK: - Range Picker

    private var rangePicker: some View {
        HStack(spacing: 0) {
            ForEach(TimeRange.allCases, id: \.self) { range in
                Button {
                    withAnimation { selectedRange = range }
                } label: {
                    Text(range.rawValue)
                        .font(.system(size: 13, weight: selectedRange == range ? .bold : .medium))
                        .foregroundStyle(selectedRange == range ? ParanTheme.background : ParanTheme.textSecondary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .background {
                            if selectedRange == range {
                                Capsule().fill(ParanTheme.accent)
                            }
                        }
                }
            }
        }
        .padding(4)
        .background(ParanTheme.surface, in: Capsule())
    }

    // MARK: - Theme Chips

    private var themeChips: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(availableThemes, id: \.self) { theme in
                    ThemeChip(
                        theme: theme,
                        isSelected: selectedThemes.contains(theme)
                    ) {
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

    // MARK: - Timeline Content

    private var timelineContent: some View {
        VStack(alignment: .leading, spacing: 0) {
            ForEach(entries) { group in
                monthSection(group)
            }

            if !showMore {
                Button {
                    withAnimation { showMore = true }
                    buildTimeline()
                } label: {
                    HStack {
                        Image(systemName: "chevron.down")
                        Text("See more")
                    }
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(ParanTheme.accent)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                }
            }
        }
    }

    private func monthSection(_ group: MonthGroup) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(group.monthLabel.uppercased())
                .font(.system(size: 13, weight: .bold, design: .monospaced))
                .foregroundStyle(ParanTheme.textSecondary)
                .padding(.top, 20)

            ForEach(group.entries) { entry in
                TimelineEntryCard(entry: entry)
            }

            if group.entries.isEmpty {
                Text("Quieter period — your natal power places are always there for you.")
                    .font(.system(size: 13))
                    .foregroundStyle(ParanTheme.textMuted)
                    .italic()
                    .padding(.vertical, 8)
            }
        }
    }

    // MARK: - Build Timeline

    private func buildTimeline() {
        guard let profile = profileManager.activeProfile else { return }

        let lines = AstroEngine.generateLines(birthData: profile)
        let now = Date()
        let calendar = Calendar.current
        let endDate = calendar.date(byAdding: .month, value: selectedRange.months, to: now)!

        var monthGroups: [MonthGroup] = []

        var current = now
        while current < endDate {
            let monthLabel = monthFormatter.string(from: current)
            var monthEntries: [TimelineEntry] = []

            for city in WorldCities.all {
                let synthesis = SynthesisEngine.synthesize(
                    birthData: profile,
                    lines: lines,
                    latitude: city.latitude,
                    longitude: city.longitude,
                    cityName: city.name,
                    targetDate: current,
                    hideMild: !showMore
                )

                guard !synthesis.nearbyLines.isEmpty else { continue }

                let filtered: Bool
                if !selectedThemes.isEmpty {
                    let lineThemes = Set(synthesis.nearbyLines.flatMap(\.keywords))
                    filtered = selectedThemes.isDisjoint(with: lineThemes)
                } else {
                    filtered = false
                }
                guard !filtered else { continue }

                let primary = synthesis.nearbyLines[0]
                let tier: TimelineTier
                let themes = Array(Set(synthesis.nearbyLines.prefix(3).flatMap(\.keywords)))

                if primary.sentiment == .positive && primary.distance < 4 {
                    tier = .especiallyGoodNow
                } else if primary.sentiment == .difficult && primary.distance < 4 {
                    tier = .watchOut
                } else if primary.sentiment == .positive {
                    tier = .alwaysGoodForYou
                } else {
                    continue
                }

                monthEntries.append(TimelineEntry(
                    city: city,
                    month: current,
                    tier: tier,
                    strengthPercent: primary.activationPercent,
                    plainSummary: synthesis.paragraph,
                    themes: themes,
                    window: nil,
                    technicalDetail: "\(primary.planet.displayName) \(primary.lineType.rawValue) at \(String(format: "%.1f", primary.distance))° — \(primary.strengthLabel)"
                ))
            }

            monthEntries.sort { $0.strengthPercent > $1.strengthPercent }
            let limit = showMore ? 8 : 4
            monthGroups.append(MonthGroup(
                monthLabel: monthLabel,
                entries: Array(monthEntries.prefix(limit))
            ))

            current = calendar.date(byAdding: .month, value: 1, to: current)!
        }

        entries = monthGroups
    }

    private var monthFormatter: DateFormatter {
        let f = DateFormatter()
        f.dateFormat = "MMMM yyyy"
        return f
    }
}

// MARK: - Timeline Entry Card

struct TimelineEntryCard: View {
    let entry: TimelineEntry
    @State private var showDetail = false

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                TierBadge(tier: entry.tier)
                Spacer()
                Text("\(entry.strengthPercent)%")
                    .font(.system(size: 14, weight: .bold, design: .monospaced))
                    .foregroundStyle(tierColor)
            }

            Text(entry.city.name)
                .font(.system(size: 18, weight: .bold))
                .foregroundStyle(ParanTheme.textPrimary)

            Text(entry.plainSummary)
                .font(.system(size: 14))
                .foregroundStyle(ParanTheme.textPrimary.opacity(0.85))
                .lineSpacing(3)
                .lineLimit(showDetail ? nil : 3)

            HStack(spacing: 6) {
                ForEach(entry.themes.prefix(3), id: \.self) { theme in
                    Text(theme)
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(ParanTheme.textSecondary)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(ParanTheme.surface, in: Capsule())
                }

                Spacer()

                Button {
                    showDetail.toggle()
                } label: {
                    Image(systemName: "info.circle")
                        .font(.system(size: 14))
                        .foregroundStyle(ParanTheme.textMuted)
                }
            }

            if showDetail {
                Text(entry.technicalDetail)
                    .font(.system(size: 12, design: .monospaced))
                    .foregroundStyle(ParanTheme.textMuted)
                    .padding(.top, 4)
            }
        }
        .padding(16)
        .background(ParanTheme.cardGradient, in: RoundedRectangle(cornerRadius: 14))
        .overlay {
            RoundedRectangle(cornerRadius: 14)
                .stroke(tierBorderColor, lineWidth: 1)
        }
    }

    private var tierColor: Color {
        switch entry.tier {
        case .especiallyGoodNow: return ParanTheme.accent
        case .watchOut: return ParanTheme.neutral
        case .alwaysGoodForYou: return ParanTheme.warm
        case .notRecommended: return ParanTheme.difficult
        }
    }

    private var tierBorderColor: Color {
        tierColor.opacity(0.3)
    }
}

struct TierBadge: View {
    let tier: TimelineTier

    var body: some View {
        Text(tier.rawValue)
            .font(.system(size: 11, weight: .semibold))
            .foregroundStyle(badgeColor)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(badgeColor.opacity(0.15), in: Capsule())
    }

    private var badgeColor: Color {
        switch tier {
        case .especiallyGoodNow: return ParanTheme.accent
        case .watchOut: return ParanTheme.neutral
        case .alwaysGoodForYou: return ParanTheme.warm
        case .notRecommended: return ParanTheme.difficult
        }
    }
}

struct ThemeChip: View {
    let theme: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(theme)
                .font(.system(size: 12, weight: isSelected ? .semibold : .regular))
                .foregroundStyle(isSelected ? ParanTheme.background : ParanTheme.textSecondary)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(isSelected ? ParanTheme.accent : ParanTheme.surface, in: Capsule())
        }
    }
}
