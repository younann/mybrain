import Foundation
import SwiftData

struct AskResult { let answer: String; let sources: [Entry] }

@MainActor
struct AskService {
    let context: ModelContext
    let ai: AIService
    let embedder: EmbeddingService
    var topK = 8

    func ask(_ question: String) async throws -> AskResult {
        let entries = try context.fetch(FetchDescriptor<Entry>())
            .filter { $0.embedding != nil }
        guard !entries.isEmpty, let q = embedder.embed(question) else {
            return AskResult(answer: "I have nothing saved about that yet.", sources: [])
        }
        let ranked = embedder.rank(query: q, items: entries, key: { $0.embedding ?? [] })
        let top = Array(ranked.prefix(topK))
        let candidates = top.enumerated().map { AICandidate(index: $0.offset, text: $0.element.searchableText) }
        let (text, idxs) = try await ai.answer(question: question, candidates: candidates)
        let sources = idxs.compactMap { top.indices.contains($0) ? top[$0] : nil }
        return AskResult(answer: text, sources: sources)
    }
}
