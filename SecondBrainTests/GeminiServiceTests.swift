import XCTest
@testable import SecondBrain

final class GeminiServiceTests: XCTestCase {
    func testBuildAnswerPromptNumbersCandidates() {
        let body = GeminiRequestBuilder.answerBody(
            question: "where to eat?",
            candidates: [AICandidate(index: 0, text: "sushi bar"),
                         AICandidate(index: 1, text: "pizza place")])
        let json = String(data: try! JSONEncoder().encode(body), encoding: .utf8)!
        XCTAssertTrue(json.contains("[0]"))
        XCTAssertTrue(json.contains("SOURCES"))
    }

    func testParseAnswerExtractsTextAndSources() throws {
        let raw = """
        {"candidates":[{"content":{"parts":[{"text":"Try the sushi bar.\\nSOURCES: 0, 1"}]}}]}
        """.data(using: .utf8)!
        let parsed = try GeminiResponseParser.parseAnswer(raw)
        XCTAssertTrue(parsed.text.contains("sushi bar"))
        XCTAssertEqual(parsed.sourceIndices, [0, 1])
    }

    func testParseAnswerWithoutSources() throws {
        let raw = """
        {"candidates":[{"content":{"parts":[{"text":"I have nothing saved about that yet."}]}}]}
        """.data(using: .utf8)!
        let parsed = try GeminiResponseParser.parseAnswer(raw)
        XCTAssertTrue(parsed.text.contains("nothing"))
        XCTAssertEqual(parsed.sourceIndices, [])
    }
}
