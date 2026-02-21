import SwiftUI

struct LineDetailView: View {
    let line: AstroLine
    @EnvironmentObject var profileManager: ProfileManager
    @State private var nearbyCities: [CityAnalysis] = []
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            ParanTheme.background.ignoresSafeArea()

            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: 20) {
                    header
                    interpretationSection
                    nearbyCitiesSection
                }
                .padding(.horizontal, 20)
                .padding(.top, 60)
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
        .onAppear { findNearbyCities() }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 10) {
                Circle()
                    .fill(ParanTheme.planetColor(for: line.planet))
                    .frame(width: 16, height: 16)
                Text("\(line.planet.displayName) \(line.lineType.displayName)")
                    .font(.system(size: 26, weight: .bold))
                    .foregroundStyle(ParanTheme.textPrimary)
            }

            Text(line.sentiment.rawValue.capitalized)
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(ParanTheme.sentimentColor(for: line.sentiment))

            FlowLayout(spacing: 8) {
                ForEach(line.keywords, id: \.self) { keyword in
                    Text(keyword)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(ParanTheme.textSecondary)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 5)
                        .background(ParanTheme.surface, in: Capsule())
                }
            }
        }
    }

    private var interpretationSection: some View {
        let interp = Interpretations.get(planet: line.planet, lineType: line.lineType)

        return VStack(alignment: .leading, spacing: 16) {
            InterpretationCard(
                title: "Living on This Line",
                icon: "house.fill",
                text: interp.livingHere
            )

            InterpretationCard(
                title: "Visiting This Line",
                icon: "airplane",
                text: interp.visitingHere
            )

            if !interp.bestFor.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    SectionHeader(title: "Best For", icon: "star.fill")
                    ForEach(interp.bestFor, id: \.self) { item in
                        HStack(spacing: 8) {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.system(size: 12))
                                .foregroundStyle(ParanTheme.positive)
                            Text(item)
                                .font(.system(size: 14))
                                .foregroundStyle(ParanTheme.textPrimary)
                        }
                    }
                }
            }

            if !interp.challenges.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    SectionHeader(title: "Challenges", icon: "exclamationmark.triangle.fill")
                    ForEach(interp.challenges, id: \.self) { item in
                        HStack(spacing: 8) {
                            Image(systemName: "exclamationmark.circle.fill")
                                .font(.system(size: 12))
                                .foregroundStyle(ParanTheme.neutral)
                            Text(item)
                                .font(.system(size: 14))
                                .foregroundStyle(ParanTheme.textPrimary)
                        }
                    }
                }
            }
        }
    }

    private var nearbyCitiesSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeader(title: "Cities on This Line", icon: "mappin.circle.fill")

            ForEach(nearbyCities.prefix(10)) { cityAnalysis in
                HStack(spacing: 12) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(cityAnalysis.city.name)
                            .font(.system(size: 15, weight: .medium))
                            .foregroundStyle(ParanTheme.textPrimary)
                        Text(cityAnalysis.city.country)
                            .font(.system(size: 12))
                            .foregroundStyle(ParanTheme.textSecondary)
                    }
                    Spacer()
                    if let primary = cityAnalysis.nearbyLines.first {
                        Text("\(primary.activationPercent)%")
                            .font(.system(size: 14, weight: .bold, design: .monospaced))
                            .foregroundStyle(ParanTheme.sentimentColor(for: primary.sentiment))
                    }
                }
                .padding(12)
                .background(ParanTheme.surface, in: RoundedRectangle(cornerRadius: 10))
            }
        }
    }

    private func findNearbyCities() {
        guard let profile = profileManager.activeProfile else { return }
        let lines = [line]
        var results: [CityAnalysis] = []

        for city in WorldCities.all {
            let nearby = AstroEngine.findNearestLines(lines, latitude: city.latitude, longitude: city.longitude, maxDistance: 6)
            guard !nearby.isEmpty else { continue }

            results.append(CityAnalysis(
                id: city.id,
                city: city,
                nearbyLines: nearby,
                sentiment: nearby[0].sentiment,
                score: nearby[0].strength,
                themes: nearby[0].keywords,
                synthesis: nil
            ))
        }

        nearbyCities = results.sorted { $0.score > $1.score }
    }
}
