import Foundation

enum GeminiConfig {
    static let model = "gemini-2.0-flash"
    static func url(key: String) -> URL {
        URL(string: "https://generativelanguage.googleapis.com/v1beta/models/\(model):generateContent?key=\(key)")!
    }
}

// Minimal Codable request shape.
struct GeminiRequest: Codable {
    struct Part: Codable { var text: String?; var inline_data: Inline? }
    struct Inline: Codable { var mime_type: String; var data: String }
    struct Content: Codable { var parts: [Part] }
    var contents: [Content]
}

enum GeminiRequestBuilder {
    static func answerBody(question: String, candidates: [AICandidate]) -> GeminiRequest {
        let notes = candidates.map { "[\($0.index)] \($0.text)" }.joined(separator: "\n")
        let prompt = """
        You are the user's personal memory. Answer using ONLY the notes below. \
        If nothing is relevant, say you have nothing saved about that yet. \
        After your answer, on a new line list the note numbers you used as: SOURCES: n, n

        NOTES:
        \(notes)

        QUESTION: \(question)
        """
        return GeminiRequest(contents: [.init(parts: [.init(text: prompt, inline_data: nil)])])
    }

    static func describeBody(imageData: Data) -> GeminiRequest {
        let b64 = imageData.base64EncodedString()
        return GeminiRequest(contents: [.init(parts: [
            .init(text: "Describe this image in one or two sentences, focusing on what it is (place, product, text visible). Be concise and factual.", inline_data: nil),
            .init(text: nil, inline_data: .init(mime_type: "image/jpeg", data: b64))
        ])])
    }
}

enum GeminiResponseParser {
    struct Resp: Codable {
        struct Cand: Codable { struct Content: Codable { struct Part: Codable { var text: String? }; var parts: [Part] }; var content: Content }
        var candidates: [Cand]
    }
    static func rawText(_ data: Data) throws -> String {
        let r = try JSONDecoder().decode(Resp.self, from: data)
        return r.candidates.first?.content.parts.compactMap { $0.text }.joined() ?? ""
    }
    static func parseAnswer(_ data: Data) throws -> (text: String, sourceIndices: [Int]) {
        let full = try rawText(data)
        guard let range = full.range(of: "SOURCES:", options: .caseInsensitive) else {
            return (full.trimmingCharacters(in: .whitespacesAndNewlines), [])
        }
        let text = String(full[..<range.lowerBound]).trimmingCharacters(in: .whitespacesAndNewlines)
        let tail = String(full[range.upperBound...])
        let idx = tail.split(whereSeparator: { !$0.isNumber }).compactMap { Int($0) }
        return (text, idx)
    }
}

struct GeminiService: AIService {
    let apiKey: String
    var session: URLSession = .shared

    private func send(_ body: GeminiRequest) async throws -> Data {
        var req = URLRequest(url: GeminiConfig.url(key: apiKey))
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try JSONEncoder().encode(body)
        let (data, resp) = try await session.data(for: req)
        guard let http = resp as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw NSError(domain: "Gemini", code: (resp as? HTTPURLResponse)?.statusCode ?? -1,
                          userInfo: [NSLocalizedDescriptionKey: String(data: data, encoding: .utf8) ?? "request failed"])
        }
        return data
    }

    func describeImage(_ imageData: Data) async throws -> String {
        try GeminiResponseParser.rawText(try await send(GeminiRequestBuilder.describeBody(imageData: imageData)))
            .trimmingCharacters(in: .whitespacesAndNewlines)
    }

    func answer(question: String, candidates: [AICandidate]) async throws -> (text: String, sourceIndices: [Int]) {
        try GeminiResponseParser.parseAnswer(try await send(GeminiRequestBuilder.answerBody(question: question, candidates: candidates)))
    }
}
