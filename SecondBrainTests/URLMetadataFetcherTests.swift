import XCTest
@testable import SecondBrain

final class URLMetadataFetcherTests: XCTestCase {
    func testParseTitleAndDescription() {
        let html = """
        <html><head><title>Best Perfumes</title>
        <meta name="description" content="Buy niche perfume online"></head></html>
        """
        let m = URLMetadataFetcher.parse(html: html)
        XCTAssertEqual(m.title, "Best Perfumes")
        XCTAssertEqual(m.description, "Buy niche perfume online")
    }

    func testFallsBackToOgDescription() {
        let html = "<title>Shop</title><meta property=\"og:description\" content=\"og desc\">"
        let m = URLMetadataFetcher.parse(html: html)
        XCTAssertEqual(m.title, "Shop")
        XCTAssertEqual(m.description, "og desc")
    }
}
