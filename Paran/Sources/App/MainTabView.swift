import SwiftUI

struct MainTabView: View {
    @State private var selectedTab: Tab = .map

    enum Tab: String, CaseIterable {
        case map = "Map"
        case insights = "Insights"
        case bonds = "Bonds"
        case learn = "Learn"
        case profile = "Profile"

        var icon: String {
            switch self {
            case .map: return "globe"
            case .insights: return "sparkles"
            case .bonds: return "heart.circle"
            case .learn: return "book"
            case .profile: return "person.circle"
            }
        }
    }

    var body: some View {
        TabView(selection: $selectedTab) {
            ForEach(Tab.allCases, id: \.self) { tab in
                tabContent(for: tab)
                    .tabItem {
                        Label(tab.rawValue, systemImage: tab.icon)
                    }
                    .tag(tab)
            }
        }
        .tint(ParanTheme.accent)
    }

    @ViewBuilder
    private func tabContent(for tab: Tab) -> some View {
        switch tab {
        case .map:
            MapTabView()
        case .insights:
            InsightsTabView()
        case .bonds:
            BondsTabView()
        case .learn:
            LearnTabView()
        case .profile:
            ProfileTabView()
        }
    }
}
