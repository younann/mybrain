import Foundation

struct URLMetadata { let title: String; let description: String
    var combined: String { description.isEmpty ? title : "\(title). \(description)" } }

enum URLMetadataFetcher {
    static func parse(html: String) -> URLMetadata {
        func firstMatch(_ pattern: String) -> String {
            guard let r = try? NSRegularExpression(pattern: pattern, options: [.caseInsensitive, .dotMatchesLineSeparators]),
                  let m = r.firstMatch(in: html, range: NSRange(html.startIndex..., in: html)),
                  let g = Range(m.range(at: 1), in: html) else { return "" }
            return html[g].trimmingCharacters(in: .whitespacesAndNewlines)
        }
        let title = firstMatch("<title[^>]*>(.*?)</title>")
        var desc = firstMatch("<meta[^>]+name=[\"']description[\"'][^>]+content=[\"'](.*?)[\"']")
        if desc.isEmpty { desc = firstMatch("<meta[^>]+property=[\"']og:description[\"'][^>]+content=[\"'](.*?)[\"']") }
        return URLMetadata(title: title, description: desc)
    }

    static func fetch(_ url: URL, session: URLSession = .shared) async -> URLMetadata {
        guard let (data, _) = try? await session.data(from: url),
              let html = String(data: data, encoding: .utf8) else {
            return URLMetadata(title: url.host ?? url.absoluteString, description: "")
        }
        return parse(html: html)
    }
}
