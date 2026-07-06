import Foundation

struct AICandidate: Sendable { let index: Int; let text: String }

protocol AIService: Sendable {
    /// Returns a short description of the image (for photo enrichment).
    func describeImage(_ imageData: Data) async throws -> String
    /// Answers `question` grounded in `candidates`; returns prose + used indices.
    func answer(question: String, candidates: [AICandidate]) async throws -> (text: String, sourceIndices: [Int])
}

/// Used when no API key is set: capture still works, enrichment is deferred.
struct NoAIService: AIService {
    struct MissingKey: LocalizedError { var errorDescription: String? { "No Gemini API key set." } }
    func describeImage(_ imageData: Data) async throws -> String { throw MissingKey() }
    func answer(question: String, candidates: [AICandidate]) async throws -> (text: String, sourceIndices: [Int]) {
        throw MissingKey()
    }
}
