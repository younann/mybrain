import XCTest
@testable import SecondBrain

final class KeychainStoreTests: XCTestCase {
    func testRoundTrip() {
        let store = KeychainStore(service: "test.secondbrain")
        store.delete("gemini")
        XCTAssertNil(store.read("gemini"))
        store.save("gemini", value: "abc123")
        XCTAssertEqual(store.read("gemini"), "abc123")
        store.delete("gemini")
        XCTAssertNil(store.read("gemini"))
    }
}
