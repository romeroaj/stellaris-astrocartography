import SwiftUI
import CoreLocation

struct InsightsTabView: View {
    @EnvironmentObject var profileManager: ProfileManager
    @State private var selectedTab: InsightsTab = .summary

    enum InsightsTab: String, CaseIterable {
        case summary = "Summary"
        case timeline = "Timeline"
        case places = "Places"
    }

    var body: some View {
        ZStack {
            ParanTheme.background.ignoresSafeArea()

            VStack(spacing: 0) {
                header
                tabPicker
                tabContent
            }
        }
    }

    // MARK: - Header

    private var header: some View {
        VStack(spacing: 4) {
            Text("Insights")
                .font(.system(size: 28, weight: .bold))
                .foregroundStyle(ParanTheme.textPrimary)
            if let name = profileManager.activeProfile?.name {
                Text(name)
                    .font(.system(size: 14))
                    .foregroundStyle(ParanTheme.textSecondary)
            }
        }
        .padding(.top, 60)
        .padding(.bottom, 12)
    }

    // MARK: - Tab Picker

    private var tabPicker: some View {
        HStack(spacing: 0) {
            ForEach(InsightsTab.allCases, id: \.self) { tab in
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) { selectedTab = tab }
                } label: {
                    Text(tab.rawValue)
                        .font(.system(size: 14, weight: selectedTab == tab ? .semibold : .regular))
                        .foregroundStyle(selectedTab == tab ? ParanTheme.accent : ParanTheme.textSecondary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .overlay(alignment: .bottom) {
                            if selectedTab == tab {
                                Rectangle()
                                    .fill(ParanTheme.accent)
                                    .frame(height: 2)
                            }
                        }
                }
            }
        }
        .padding(.horizontal)
    }

    // MARK: - Tab Content

    @ViewBuilder
    private var tabContent: some View {
        switch selectedTab {
        case .summary:
            InsightsSummaryView()
        case .timeline:
            TravelTimelineView()
        case .places:
            PlacesView()
        }
    }
}
