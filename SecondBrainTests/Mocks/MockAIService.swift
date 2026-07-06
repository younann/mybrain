@testable import SecondBrain
import Foundation

final class MockAIService: AIService, @unchecked Sendable {
    var describeReturn = "a photo"
    var answerReturn: (String, [Int]) = ("mock answer", [])
    private(set) var lastCandidates: [AICandidate] = []
    func describeImage(_ imageData: Data) async throws -> String { describeReturn }
    func answer(question: String, candidates: [AICandidate]) async throws -> (text: String, sourceIndices: [Int]) {
        lastCandidates = candidates; return answerReturn
    }
}
