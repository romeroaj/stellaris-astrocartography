import Foundation
import Combine

@MainActor
final class ProfileManager: ObservableObject {
    @Published var activeProfile: BirthData?
    @Published var friendProfiles: [BirthData] = []
    @Published var settings = AppSettings()

    private let storageKey = "paran_active_profile"
    private let settingsKey = "paran_settings"

    init() {
        loadProfile()
        loadSettings()
    }

    func saveProfile(_ profile: BirthData) {
        activeProfile = profile
        if let data = try? JSONEncoder().encode(profile) {
            UserDefaults.standard.set(data, forKey: storageKey)
        }
    }

    func loadProfile() {
        guard let data = UserDefaults.standard.data(forKey: storageKey),
              let profile = try? JSONDecoder().decode(BirthData.self, from: data) else { return }
        activeProfile = profile
    }

    func clearProfile() {
        activeProfile = nil
        UserDefaults.standard.removeObject(forKey: storageKey)
    }

    func saveSettings() {
        if let data = try? JSONEncoder().encode(settings) {
            UserDefaults.standard.set(data, forKey: settingsKey)
        }
    }

    private func loadSettings() {
        guard let data = UserDefaults.standard.data(forKey: settingsKey),
              let s = try? JSONDecoder().decode(AppSettings.self, from: data) else { return }
        settings = s
    }
}

struct AppSettings: Codable {
    var includeMinorPlanets: Bool = false
    var hideMildImpacts: Bool = false
    var distanceUnit: DistanceUnit = .km
}

enum DistanceUnit: String, Codable {
    case km, mi
}
