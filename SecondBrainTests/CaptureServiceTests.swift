import XCTest
import SwiftData
@testable import SecondBrain

final class CaptureServiceTests: XCTestCase {
    @MainActor func makeCtx() throws -> ModelContext {
        ModelContext(try ModelContainer(for: Entry.self,
            configurations: ModelConfiguration(isStoredInMemoryOnly: true)))
    }

    @MainActor func testSaveTextEmbeds() async throws {
        let ctx = try makeCtx()
        let svc = CaptureService(context: ctx, ai: MockAIService(),
                                 embedder: EmbeddingService(), imageStore: ImageStore(inMemory: true))
        try await svc.saveText(note: "great italian food")
        let all = try ctx.fetch(FetchDescriptor<Entry>())
        XCTAssertEqual(all.count, 1)
        XCTAssertNotNil(all[0].embedding)   // NL model available on the sim
    }

    @MainActor func testSavePhotoUsesVisionDescription() async throws {
        let ctx = try makeCtx()
        let ai = MockAIService(); ai.describeReturn = "an italian restaurant storefront"
        let svc = CaptureService(context: ctx, ai: ai,
                                 embedder: EmbeddingService(), imageStore: ImageStore(inMemory: true))
        try await svc.savePhoto(note: "loved this", imageData: Data([0xFF, 0xD8, 0xFF]))
        let e = try ctx.fetch(FetchDescriptor<Entry>())[0]
        XCTAssertEqual(e.extractedText, "an italian restaurant storefront")
        XCTAssertNotNil(e.imageRef)
    }
}
