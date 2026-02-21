import SwiftUI

@main
struct ParanApp: App {
    @StateObject private var authManager = AuthManager()
    @StateObject private var profileManager = ProfileManager()
    @AppStorage("hasSeenOnboarding") private var hasSeenOnboarding = false

    var body: some Scene {
        WindowGroup {
            if !hasSeenOnboarding {
                OnboardingView()
                    .environmentObject(authManager)
                    .environmentObject(profileManager)
            } else {
                MainTabView()
                    .environmentObject(authManager)
                    .environmentObject(profileManager)
            }
        }
    }
}
