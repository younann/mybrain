import Foundation
import SwiftData

@Model
final class Entry {
    @Attribute(.unique) var id: UUID
    var createdAt: Date
    var typeRaw: String
    var userNote: String
    var extractedText: String
    var imageRef: String?
    var url: String?
    var tags: [String]
    /// Embedding stored as Data (archived [Float]) to keep SwiftData happy.
    var embeddingData: Data?
    var needsEnrichment: Bool

    var type: EntryType { EntryType(rawValue: typeRaw) ?? .text }
    var searchableText: String {
        extractedText.isEmpty ? userNote : "\(userNote)\n\(extractedText)"
    }
    var embedding: [Float]? {
        get { embeddingData.flatMap { try? JSONDecoder().decode([Float].self, from: $0) } }
        set { embeddingData = newValue.flatMap { try? JSONEncoder().encode($0) } }
    }

    init(type: EntryType, userNote: String, extractedText: String = "",
         imageRef: String? = nil, url: String? = nil, tags: [String] = [],
         needsEnrichment: Bool = false) {
        self.id = UUID(); self.createdAt = Date()
        self.typeRaw = type.rawValue; self.userNote = userNote
        self.extractedText = extractedText; self.imageRef = imageRef
        self.url = url; self.tags = tags; self.needsEnrichment = needsEnrichment
    }
}
