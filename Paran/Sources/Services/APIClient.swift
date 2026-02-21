import Foundation

final class APIClient {
    static let shared = APIClient()

    private var baseURL: URL

    private init() {
        if let envURL = ProcessInfo.processInfo.environment["PARAN_API_URL"],
           let url = URL(string: envURL) {
            baseURL = url
        } else {
            #if targetEnvironment(simulator)
            baseURL = URL(string: "http://localhost:5001")!
            #else
            baseURL = URL(string: "http://localhost:5001")!
            #endif
        }
    }

    func url(for path: String) -> URL {
        baseURL.appendingPathComponent(path)
    }

    func setBaseURL(_ urlString: String) {
        if let url = URL(string: urlString) {
            baseURL = url
        }
    }

    func get<T: Decodable>(_ path: String, token: String? = nil) async throws -> T {
        var request = URLRequest(url: url(for: path))
        if let token { request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            throw APIError.requestFailed
        }
        return try JSONDecoder().decode(T.self, from: data)
    }

    func post<T: Decodable, B: Encodable>(_ path: String, body: B, token: String? = nil) async throws -> T {
        var request = URLRequest(url: url(for: path))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token { request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        request.httpBody = try JSONEncoder().encode(body)

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            throw APIError.requestFailed
        }
        return try JSONDecoder().decode(T.self, from: data)
    }

    enum APIError: Error {
        case requestFailed
        case decodingFailed
    }
}
