import SwiftUI
import MapKit

struct MapTabView: View {
    @EnvironmentObject var profileManager: ProfileManager
    @State private var mapRegion = MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: 20, longitude: 0),
        span: MKCoordinateSpan(latitudeDelta: 120, longitudeDelta: 120)
    )
    @State private var astroLines: [AstroLine] = []
    @State private var hotspots: [MapHotspot] = []
    @State private var selectedLine: AstroLine?

    var body: some View {
        ZStack {
            ParanTheme.background.ignoresSafeArea()

            Map(coordinateRegion: $mapRegion, annotationItems: hotspots) { hotspot in
                MapAnnotation(coordinate: hotspot.city.coordinate) {
                    HotspotMarker(hotspot: hotspot)
                        .onTapGesture { openCityDetail(hotspot.city) }
                }
            }
            .mapStyle(.imagery(elevation: .flat))
            .ignoresSafeArea()
            .overlay(alignment: .topTrailing) { mapControls }
            .overlay(alignment: .bottom) { lineLabels }
            .onChange(of: mapRegion.span.latitudeDelta) { _ in
                updateHotspotsForZoom()
            }
        }
        .onAppear { generateLines() }
    }

    // MARK: - Controls

    private var mapControls: some View {
        VStack(spacing: 12) {
            MapControlButton(icon: "line.3.horizontal.decrease", label: "Filter") {}
            MapControlButton(icon: "clock", label: "Time") {}
            MapControlButton(icon: "location.fill", label: "GPS") {}
        }
        .padding(.trailing, 16)
        .padding(.top, 60)
    }

    private var lineLabels: some View {
        Group {
            if let line = selectedLine {
                LineInfoCard(line: line)
                    .padding()
                    .transition(.move(edge: .bottom))
            }
        }
    }

    // MARK: - Logic

    private func generateLines() {
        guard let profile = profileManager.activeProfile else { return }
        let planets = profileManager.settings.includeMinorPlanets
            ? PlanetName.allCases
            : PlanetName.major + [.chiron, .northNode, .southNode, .lilith]
        astroLines = AstroEngine.generateLines(birthData: profile, planets: planets)
        updateHotspotsForZoom()
    }

    private func updateHotspotsForZoom() {
        guard let profile = profileManager.activeProfile else { return }

        let zoomDelta = mapRegion.span.latitudeDelta
        let maxHotspots: Int
        let cities: [City]

        if zoomDelta > 60 {
            maxHotspots = 15
            cities = WorldCities.all
        } else if zoomDelta > 15 {
            maxHotspots = 25
            cities = WorldCities.all.filter { cityInBounds($0) }
        } else {
            maxHotspots = 40
            cities = WorldCities.all.filter { cityInBounds($0) }
        }

        var scored: [(hotspot: MapHotspot, score: Double)] = []

        for city in cities {
            let nearby = AstroEngine.findNearestLines(astroLines, latitude: city.latitude, longitude: city.longitude, maxDistance: 12)
            guard !nearby.isEmpty else { continue }

            let dominant = nearby[0]
            let positiveScore = nearby.filter { $0.sentiment == .positive }.reduce(0.0) { $0 + $1.strength }
            let difficultScore = nearby.filter { $0.sentiment == .difficult }.reduce(0.0) { $0 + $1.strength }

            let sentiment: Sentiment = positiveScore > difficultScore * 1.2 ? .positive :
                                       difficultScore > positiveScore * 1.2 ? .difficult : .neutral

            let theme = dominant.keywords.first ?? "general"
            let score = dominant.strength + (sentiment == .positive ? 0.2 : 0.05)

            scored.append((
                MapHotspot(
                    id: city.id,
                    city: city,
                    sentiment: sentiment,
                    strength: dominant.strength,
                    theme: theme,
                    isTransitActive: false
                ),
                score
            ))
        }

        hotspots = scored
            .sorted { $0.score > $1.score }
            .prefix(maxHotspots)
            .map(\.hotspot)
    }

    private func cityInBounds(_ city: City) -> Bool {
        let center = mapRegion.center
        let span = mapRegion.span
        let latRange = (center.latitude - span.latitudeDelta / 2)...(center.latitude + span.latitudeDelta / 2)
        let lonRange = (center.longitude - span.longitudeDelta / 2)...(center.longitude + span.longitudeDelta / 2)
        return latRange.contains(city.latitude) && lonRange.contains(city.longitude)
    }

    private func openCityDetail(_ city: City) {
        // Navigation to city detail
    }
}

// MARK: - Subviews

struct HotspotMarker: View {
    let hotspot: MapHotspot

    var body: some View {
        VStack(spacing: 2) {
            Circle()
                .fill(ParanTheme.sentimentColor(for: hotspot.sentiment))
                .frame(width: markerSize, height: markerSize)
                .overlay {
                    Circle()
                        .stroke(Color.white.opacity(0.3), lineWidth: 1)
                }
                .shadow(color: ParanTheme.sentimentColor(for: hotspot.sentiment).opacity(0.5), radius: 4)

            Text(hotspot.city.name)
                .font(.system(size: 9, weight: .medium))
                .foregroundStyle(.white)
                .padding(.horizontal, 4)
                .padding(.vertical, 2)
                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 4))
        }
    }

    private var markerSize: CGFloat {
        hotspot.strength >= 0.8 ? 16 : hotspot.strength >= 0.55 ? 13 : 10
    }
}

struct MapControlButton: View {
    let icon: String
    let label: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: 16, weight: .medium))
                .foregroundStyle(ParanTheme.textPrimary)
                .frame(width: 44, height: 44)
                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))
        }
    }
}

struct LineInfoCard: View {
    let line: AstroLine

    var body: some View {
        HStack {
            Circle()
                .fill(ParanTheme.planetColor(for: line.planet))
                .frame(width: 12, height: 12)
            Text("\(line.planet.displayName) \(line.lineType.displayName)")
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(ParanTheme.textPrimary)
            Spacer()
            Text(line.sentiment.rawValue.capitalized)
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(ParanTheme.sentimentColor(for: line.sentiment))
        }
        .padding()
        .background(ParanTheme.surface.opacity(0.95), in: RoundedRectangle(cornerRadius: 16))
    }
}
