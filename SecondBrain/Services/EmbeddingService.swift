import Foundation
import NaturalLanguage

struct EmbeddingService {
    private let sentence = NLEmbedding.sentenceEmbedding(for: .english)
    private let word = NLEmbedding.wordEmbedding(for: .english)

    /// Embeds text on-device. Prefers the sentence model when available,
    /// otherwise averages bundled word vectors. nil only if no model is available.
    func embed(_ text: String) -> [Float]? {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return nil }
        if let s = sentence, let vec = s.vector(for: trimmed) {
            return vec.map { Float($0) }
        }
        return averageWordVector(trimmed)
    }

    private func averageWordVector(_ text: String) -> [Float]? {
        guard let w = word else { return nil }
        let tokens = text.lowercased()
            .components(separatedBy: CharacterSet.alphanumerics.inverted)
            .filter { !$0.isEmpty }
        guard !tokens.isEmpty else { return nil }
        var sum = [Double](repeating: 0, count: w.dimension)
        var n = 0
        for t in tokens {
            guard let v = w.vector(for: t) else { continue }
            for i in v.indices { sum[i] += v[i] }
            n += 1
        }
        guard n > 0 else { return nil }
        return sum.map { Float($0 / Double(n)) }
    }

    func cosine(_ a: [Float], _ b: [Float]) -> Float {
        guard a.count == b.count, !a.isEmpty else { return 0 }
        var dot: Float = 0, na: Float = 0, nb: Float = 0
        for i in a.indices { dot += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i] }
        let denom = (na.squareRoot() * nb.squareRoot())
        return denom == 0 ? 0 : dot / denom
    }

    /// Returns items sorted by descending similarity to query.
    func rank<T>(query: [Float], items: [T], key: (T) -> [Float]) -> [T] {
        items.map { ($0, cosine(query, key($0))) }
             .sorted { $0.1 > $1.1 }
             .map { $0.0 }
    }
}
