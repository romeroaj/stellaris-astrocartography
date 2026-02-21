import Foundation
import Combine

@MainActor
final class AuthManager: ObservableObject {
    @Published var user: AuthUser?
    @Published var isLoading = true
    @Published var isLoggedIn = false

    private let tokenKey = "paran_auth_token"

    struct AuthUser: Codable {
        let id: String
        let username: String
        let displayName: String
        let avatarUrl: String?
        let createdAt: String
    }

    init() {
        Task { await checkAuth() }
    }

    func checkAuth() async {
        isLoading = true
        defer { isLoading = false }

        guard let token = getToken() else {
            user = nil
            isLoggedIn = false
            return
        }

        do {
            let fetchedUser = try await fetchUser(token: token)
            user = fetchedUser
            isLoggedIn = true
        } catch {
            user = nil
            isLoggedIn = false
        }
    }

    func login(token: String) async throws {
        setToken(token)
        let fetchedUser = try await fetchUser(token: token)
        user = fetchedUser
        isLoggedIn = true
    }

    func logout() {
        clearToken()
        user = nil
        isLoggedIn = false
    }

    // MARK: - Token Storage

    private func getToken() -> String? {
        UserDefaults.standard.string(forKey: tokenKey)
    }

    private func setToken(_ token: String) {
        UserDefaults.standard.set(token, forKey: tokenKey)
    }

    private func clearToken() {
        UserDefaults.standard.removeObject(forKey: tokenKey)
    }

    // MARK: - API

    private func fetchUser(token: String) async throws -> AuthUser {
        let url = APIClient.shared.url(for: "/api/auth/me")
        var request = URLRequest(url: url)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw AuthError.unauthorized
        }

        struct MeResponse: Codable { let user: AuthUser }
        return try JSONDecoder().decode(MeResponse.self, from: data).user
    }

    enum AuthError: Error {
        case unauthorized
        case networkError(String)
    }
}
