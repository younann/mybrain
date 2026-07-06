import XCTest
import SwiftData
@testable import SecondBrain

final class EntryTests: XCTestCase {
    func testRoundTripAndSearchableText() throws {
        let container = try ModelContainer(
            for: Entry.self,
            configurations: ModelConfiguration(isStoredInMemoryOnly: true))
        let ctx = ModelContext(container)
        let e = Entry(type: .text, userNote: "great sushi", extractedText: "Tokyo bar")
        ctx.insert(e)
        try ctx.save()
        let fetched = try ctx.fetch(FetchDescriptor<Entry>())
        XCTAssertEqual(fetched.count, 1)
        XCTAssertEqual(fetched[0].searchableText, "great sushi\nTokyo bar")
    }

    func testEmbeddingRoundTrips() throws {
        let e = Entry(type: .text, userNote: "x")
        e.embedding = [1.0, 2.5, -3.0]
        XCTAssertEqual(e.embedding, [1.0, 2.5, -3.0])
    }
}
