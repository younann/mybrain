import Foundation
import SwiftUI

@MainActor
@Observable
final class AppEnvironment {
    let keychain = KeychainStore()
    let embedder = EmbeddingService()
    let imageStore = ImageStore()
    private(set) var hasKey: Bool

    init() { hasKey = keychain.read("gemini") != nil }

    var apiKey: String? { keychain.read("gemini") }

    func makeAI() -> AIService { apiKey.map { GeminiService(apiKey: $0) } ?? NoAIService() }

    func setKey(_ key: String) {
        let trimmed = key.trimmingCharacters(in: .whitespacesAndNewlines)
        keychain.save("gemini", value: trimmed)
        hasKey = !trimmed.isEmpty
    }

    func clearKey() { keychain.delete("gemini"); hasKey = false }
}
