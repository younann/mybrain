import XCTest
import SwiftData
@testable import SecondBrain

final class AskServiceTests: XCTestCase {
    @MainActor func makeCtx() throws -> ModelContext {
        ModelContext(try ModelContainer(for: Entry.self,
            configurations: ModelConfiguration(isStoredInMemoryOnly: true)))
    }

    @MainActor func testEmptyBrainSkipsAI() async throws {
        let ctx = try makeCtx()
        let ai = MockAIService()
        let svc = AskService(context: ctx, ai: ai, embedder: EmbeddingService())
        let res = try await svc.ask("anything?")
        XCTAssertTrue(res.answer.lowercased().contains("nothing"))
        XCTAssertTrue(ai.lastCandidates.isEmpty)
    }

    @MainActor func testMapsSourcesToEntries() async throws {
        let ctx = try makeCtx()
        for note in ["italian pasta place", "car mechanic", "perfume shop online"] {
            let e = Entry(type: .text, userNote: note)
            e.embedding = EmbeddingService().embed(note); ctx.insert(e)
        }
        try ctx.save()
        let ai = MockAIService(); ai.answerReturn = ("Go to the pasta place.", [0])
        let svc = AskService(context: ctx, ai: ai, embedder: EmbeddingService())
        let res = try await svc.ask("where should I eat pasta?")
        XCTAssertFalse(res.answer.isEmpty)
        XCTAssertEqual(res.sources.count, 1)   // index 0 maps to one entry
    }
}
