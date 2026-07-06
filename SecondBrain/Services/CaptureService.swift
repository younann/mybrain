import Foundation
import SwiftData

@MainActor
struct CaptureService {
    let context: ModelContext
    let ai: AIService
    let embedder: EmbeddingService
    let imageStore: ImageStore

    func saveText(note: String) async throws {
        let e = Entry(type: .text, userNote: note)
        embed(e); context.insert(e); try context.save()
    }

    func savePhoto(note: String, imageData: Data) async throws {
        let ref = imageStore.save(imageData)
        let e = Entry(type: .photo, userNote: note, imageRef: ref)
        do { e.extractedText = try await ai.describeImage(imageData) }
        catch { e.needsEnrichment = true }
        embed(e); context.insert(e); try context.save()
    }

    func saveURL(note: String, urlString: String) async throws {
        let e = Entry(type: .url, userNote: note, url: urlString)
        if let u = URL(string: urlString) { e.extractedText = await URLMetadataFetcher.fetch(u).combined }
        embed(e); context.insert(e); try context.save()
    }

    private func embed(_ e: Entry) { e.embedding = embedder.embed(e.searchableText) }
}
