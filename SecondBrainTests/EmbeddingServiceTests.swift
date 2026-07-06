import XCTest
@testable import SecondBrain

final class EmbeddingServiceTests: XCTestCase {
    func testCosineRankingOrder() {
        let svc = EmbeddingService()
        let query: [Float] = [1, 0, 0]
        let items: [(id: Int, vec: [Float])] = [
            (1, [0, 1, 0]),      // orthogonal
            (2, [0.9, 0.1, 0]),  // close
            (3, [-1, 0, 0]),     // opposite
        ]
        let ranked = svc.rank(query: query, items: items, key: { $0.vec })
                        .map { $0.id }
        XCTAssertEqual(ranked, [2, 1, 3])
    }

    func testEmbedProducesVector() {
        let svc = EmbeddingService()
        // Word-embedding fallback guarantees a vector for English text on-device.
        let v = svc.embed("a nice italian restaurant")
        XCTAssertNotNil(v)
        XCTAssertFalse(v?.isEmpty ?? true)
    }

    func testRelatedTextRanksAboveUnrelated() {
        let svc = EmbeddingService()
        guard let q = svc.embed("where can I eat pasta"),
              let food = svc.embed("great italian restaurant with fresh pasta"),
              let car = svc.embed("car mechanic garage oil change") else {
            return XCTFail("embeddings unavailable")
        }
        XCTAssertGreaterThan(svc.cosine(q, food), svc.cosine(q, car))
    }
}
