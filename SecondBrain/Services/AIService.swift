import Foundation

struct AICandidate: Sendable { let index: Int; let text: String }

protocol AIService: Sendable {
    /// Returns a short description of the image (for photo enrichment).
    func describeImage(_ imageData: Data) async throws -> String
    /// Answers `question` grounded in `candidates`; returns prose + used indices.
    func answer(question: String, candidates: [AICandidate]) async throws -> (text: String, sourceIndices: [Int])
}
