# Second Brain — iOS App Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A personal iOS app to capture text/photos/URLs and later ask questions in natural language, answered conversationally by Gemini over your own saved notes.

**Architecture:** RAG. On save, entries are enriched once (Gemini describes photos; URL titles are fetched) and embedded on-device with Apple's `NaturalLanguage`. On Ask, the question is embedded, entries are ranked by cosine similarity, and only the top-K are sent to Gemini to compose an answer with citations. Storage is SwiftData (optional iCloud). Providers sit behind protocols so they can be mocked/swapped.

**Tech Stack:** Swift 6 / SwiftUI, SwiftData, NaturalLanguage, Google Gemini (URLSession), Keychain, XcodeGen, XCTest. iOS 17+.

**Spec:** `docs/superpowers/specs/2026-07-06-second-brain-app-design.md`

**Conventions for every task:** DRY, YAGNI, TDD (write failing test → see it fail → minimal code → see it pass → commit). Commit after each task. Run tests with the helper defined in Task 0.4.

---

## Chunk 1: Project scaffold & headless engine (no UI)

This chunk produces a buildable app skeleton plus fully unit-tested services. Everything here is testable from the command line without a UI.

### Task 0.1: Install tooling & init git

- [ ] **Step 1:** Install XcodeGen: `brew install xcodegen`. Verify: `xcodegen --version`.
- [ ] **Step 2:** `cd /Users/younan.nwesre/Desktop/personal/mybrain && git init && printf "*.xcodeproj\n.build/\nDerivedData/\n.DS_Store\nSecrets.local\n" > .gitignore`
- [ ] **Step 3:** Commit: `git add -A && git commit -m "chore: init repo, gitignore, spec, plan"`

> Note: `.xcodeproj` is gitignored because XcodeGen regenerates it from `project.yml`.

### Task 0.2: Define the project with XcodeGen

**Files:** Create `project.yml`

- [ ] **Step 1:** Write `project.yml`:

```yaml
name: SecondBrain
options:
  bundleIdPrefix: com.younan.secondbrain
  deploymentTarget:
    iOS: "17.0"
settings:
  base:
    SWIFT_VERSION: "6.0"
    GENERATE_INFOPLIST_FILE: YES
    MARKETING_VERSION: "0.1"
    CURRENT_PROJECT_VERSION: "1"
targets:
  SecondBrain:
    type: application
    platform: iOS
    sources: [SecondBrain]
    settings:
      base:
        INFOPLIST_KEY_UILaunchScreen_Generation: YES
        INFOPLIST_KEY_CFBundleDisplayName: "Second Brain"
  SecondBrainTests:
    type: bundle.unit-test
    platform: iOS
    sources: [SecondBrainTests]
    dependencies:
      - target: SecondBrain
    settings:
      base:
        GENERATE_INFOPLIST_FILE: YES
schemes:
  SecondBrain:
    build:
      targets:
        SecondBrain: all
        SecondBrainTests: [test]
    test:
      targets: [SecondBrainTests]
```

- [ ] **Step 2:** Create source dirs & placeholder app entry:
  - Create `SecondBrain/App/SecondBrainApp.swift`:

```swift
import SwiftUI

@main
struct SecondBrainApp: App {
    var body: some Scene {
        WindowGroup { Text("Second Brain") }
    }
}
```
  - Create `SecondBrainTests/SanityTests.swift`:

```swift
import XCTest

final class SanityTests: XCTestCase {
    func testSanity() { XCTAssertEqual(2 + 2, 4) }
}
```

- [ ] **Step 3:** Generate & build: `xcodegen generate`
- [ ] **Step 4:** Commit: `git add -A && git commit -m "chore: xcodegen project + app entry"`

### Task 0.3: Test runner helper

**Files:** Create `scripts/test.sh`

- [ ] **Step 1:** Write `scripts/test.sh` (pick a booted-able simulator; adjust device name if needed):

```bash
#!/usr/bin/env bash
set -euo pipefail
xcodegen generate >/dev/null
xcodebuild test \
  -project SecondBrain.xcodeproj \
  -scheme SecondBrain \
  -destination 'platform=iOS Simulator,name=iPhone 15' \
  "$@" | xcbeautify || xcodebuild test \
  -project SecondBrain.xcodeproj \
  -scheme SecondBrain \
  -destination 'platform=iOS Simulator,name=iPhone 15'
```
  (If `xcbeautify` isn't installed, the fallback runs raw. Optionally `brew install xcbeautify`.)

- [ ] **Step 2:** `chmod +x scripts/test.sh`
- [ ] **Step 3:** Run `./scripts/test.sh` → expect SanityTests PASS.
- [ ] **Step 4:** Commit: `git add -A && git commit -m "chore: test runner script"`

### Task 1: Entry model (SwiftData)

**Files:** Create `SecondBrain/Models/Entry.swift`, `SecondBrain/Models/EntryType.swift`; Test `SecondBrainTests/EntryTests.swift`

- [ ] **Step 1 — failing test:** In `EntryTests.swift`, insert an `Entry` into an in-memory `ModelContainer`, fetch it, assert fields round-trip and `searchableText` concatenates note + extracted text.

```swift
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
}
```

- [ ] **Step 2:** Run → FAIL (no `Entry`).
- [ ] **Step 3 — implement:**

```swift
// EntryType.swift
enum EntryType: String, Codable, CaseIterable { case text, photo, url }
```
```swift
// Entry.swift
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
```
  > `createdAt = Date()` is fine in app code; in tests inject dates if ordering matters.

- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit: `git commit -am "feat: Entry SwiftData model"`

### Task 2: EmbeddingService (on-device + cosine ranking)

**Files:** Create `SecondBrain/Services/EmbeddingService.swift`; Test `SecondBrainTests/EmbeddingServiceTests.swift`

- [ ] **Step 1 — failing test:** Cosine ranking is pure math and must be tested with known vectors (independent of the NL model).

```swift
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
        // May be nil on a language the model doesn't support; assert non-empty when present.
        if let v = svc.embed("a nice italian restaurant") { XCTAssertFalse(v.isEmpty) }
    }
}
```

- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3 — implement:**

```swift
import Foundation
import NaturalLanguage

struct EmbeddingService {
    private let embedding = NLEmbedding.sentenceEmbedding(for: .english)

    /// nil if the on-device model is unavailable for the text.
    func embed(_ text: String) -> [Float]? {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, let e = embedding,
              let vec = e.vector(for: trimmed) else { return nil }
        return vec.map { Float($0) }
    }

    func cosine(_ a: [Float], _ b: [Float]) -> Float {
        guard a.count == b.count, !a.isEmpty else { return 0 }
        var dot: Float = 0, na: Float = 0, nb: Float = 0
        for i in a.indices { dot += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i] }
        let denom = (na.squareRoot() * nb.squareRoot())
        return denom == 0 ? 0 : dot / denom
    }

    /// Returns items sorted by descending similarity to query.
    func rank<T>(query: [Float], items: [T], key: (T) -> [Float]) -> [T] {
        items.map { ($0, cosine(query, key($0))) }
             .sorted { $0.1 > $1.1 }
             .map { $0.0 }
    }
}
```

- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit: `git commit -am "feat: EmbeddingService with cosine ranking"`

### Task 3: KeychainStore (API key storage)

**Files:** Create `SecondBrain/Services/KeychainStore.swift`; Test `SecondBrainTests/KeychainStoreTests.swift`

- [ ] **Step 1 — failing test:** round-trip save/read/delete for the Gemini key.

```swift
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
```

- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3 — implement** a minimal generic-password wrapper:

```swift
import Foundation
import Security

struct KeychainStore {
    let service: String
    init(service: String = "com.younan.secondbrain") { self.service = service }

    private func query(_ account: String) -> [String: Any] {
        [kSecClass as String: kSecClassGenericPassword,
         kSecAttrService as String: service,
         kSecAttrAccount as String: account]
    }

    func save(_ account: String, value: String) {
        let data = Data(value.utf8)
        SecItemDelete(query(account) as CFDictionary)
        var attrs = query(account); attrs[kSecValueData as String] = data
        SecItemAdd(attrs as CFDictionary, nil)
    }

    func read(_ account: String) -> String? {
        var q = query(account)
        q[kSecReturnData as String] = true
        q[kSecMatchLimit as String] = kSecMatchLimitOne
        var out: CFTypeRef?
        guard SecItemCopyMatching(q as CFDictionary, &out) == errSecSuccess,
              let d = out as? Data else { return nil }
        return String(data: d, encoding: .utf8)
    }

    func delete(_ account: String) { SecItemDelete(query(account) as CFDictionary) }
}
```

- [ ] **Step 4:** Run → PASS. (Keychain works in the simulator.)
- [ ] **Step 5:** Commit: `git commit -am "feat: KeychainStore"`

### Task 4: AIService protocol + mock

**Files:** Create `SecondBrain/Services/AIService.swift`; Test uses a mock in `SecondBrainTests/Mocks/MockAIService.swift`

- [ ] **Step 1 — define the protocol** (this is the swap point for providers):

```swift
import Foundation

struct AICandidate { let index: Int; let text: String }

protocol AIService {
    /// Returns a short description of the image (for photo enrichment).
    func describeImage(_ imageData: Data) async throws -> String
    /// Answers `question` grounded in `candidates`; returns prose + used indices.
    func answer(question: String, candidates: [AICandidate]) async throws -> (text: String, sourceIndices: [Int])
}
```

- [ ] **Step 2 — create the mock** for downstream tests:

```swift
@testable import SecondBrain
import Foundation

final class MockAIService: AIService {
    var describeReturn = "a photo"
    var answerReturn: (String, [Int]) = ("mock answer", [])
    private(set) var lastCandidates: [AICandidate] = []
    func describeImage(_ imageData: Data) async throws -> String { describeReturn }
    func answer(question: String, candidates: [AICandidate]) async throws -> (text: String, sourceIndices: [Int]) {
        lastCandidates = candidates; return answerReturn
    }
}
```

- [ ] **Step 3:** Build (`xcodegen generate` + build) to confirm it compiles.
- [ ] **Step 4:** Commit: `git commit -am "feat: AIService protocol + mock"`

### Task 5: GeminiService (real provider)

**Files:** Create `SecondBrain/Services/GeminiService.swift`; Test `SecondBrainTests/GeminiServiceTests.swift` (tests the request-building + response-parsing, NOT the live network).

Design: split pure functions (build request body, parse response) from the network call so they're unit-testable.

- [ ] **Step 1 — failing test** for request/response codecs:

```swift
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
}
```

- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3 — implement.** Model id in a constant so it's easy to change; confirm the current free model id at build time (e.g. `gemini-2.0-flash`).

```swift
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
```

- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit: `git commit -am "feat: GeminiService (request build + response parse tested)"`

### Task 6: URLMetadataFetcher

**Files:** Create `SecondBrain/Services/URLMetadataFetcher.swift`; Test `SecondBrainTests/URLMetadataFetcherTests.swift`

- [ ] **Step 1 — failing test** on fixture HTML (parsing only, no network):

```swift
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
}
```

- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3 — implement** (regex parse; keep dependency-free):

```swift
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
```

- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit: `git commit -am "feat: URLMetadataFetcher"`

### Task 7: CaptureService (orchestrate enrich + embed on save)

**Files:** Create `SecondBrain/Services/ImageStore.swift`, `SecondBrain/Services/CaptureService.swift`; Test `SecondBrainTests/CaptureServiceTests.swift`

- [ ] **Step 1 — failing tests** (with `MockAIService` + in-memory container): saving a text entry embeds it; saving a photo calls `describeImage` and stores the description; a failed enrichment still saves the entry with `needsEnrichment = true`.

```swift
import XCTest
import SwiftData
@testable import SecondBrain

final class CaptureServiceTests: XCTestCase {
    func makeCtx() throws -> ModelContext {
        ModelContext(try ModelContainer(for: Entry.self,
            configurations: ModelConfiguration(isStoredInMemoryOnly: true)))
    }

    func testSaveTextEmbeds() async throws {
        let ctx = try makeCtx()
        let svc = CaptureService(context: ctx, ai: MockAIService(),
                                 embedder: EmbeddingService(), imageStore: ImageStore(inMemory: true))
        try await svc.saveText(note: "great italian food")
        let all = try ctx.fetch(FetchDescriptor<Entry>())
        XCTAssertEqual(all.count, 1)
        XCTAssertNotNil(all[0].embedding)   // NL model available on the sim
    }

    func testSavePhotoUsesVisionDescription() async throws {
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
```

- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3 — implement** `ImageStore` (writes JPEG to a directory; in-memory mode for tests skips disk) and `CaptureService`:

```swift
// ImageStore.swift
import Foundation

struct ImageStore {
    let dir: URL?
    init(inMemory: Bool = false, container: URL? = nil) {
        if inMemory { dir = nil }
        else { dir = (container ?? FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0])
                    .appendingPathComponent("images", isDirectory: true) }
        if let d = dir { try? FileManager.default.createDirectory(at: d, withIntermediateDirectories: true) }
    }
    /// Returns the stored filename (or a fake name in memory mode).
    func save(_ data: Data) -> String {
        let name = UUID().uuidString + ".jpg"
        if let d = dir { try? data.write(to: d.appendingPathComponent(name)) }
        return name
    }
    func load(_ name: String) -> Data? { dir.flatMap { try? Data(contentsOf: $0.appendingPathComponent(name)) } }
}
```
```swift
// CaptureService.swift
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
```

- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit: `git commit -am "feat: ImageStore + CaptureService"`

### Task 8: AskService (embed → rank → ask → map citations)

**Files:** Create `SecondBrain/Services/AskService.swift`; Test `SecondBrainTests/AskServiceTests.swift`

- [ ] **Step 1 — failing tests:** empty brain returns a friendly message without calling AI; a populated brain sends top-K candidates and maps returned indices back to `Entry`s.

```swift
import XCTest
import SwiftData
@testable import SecondBrain

final class AskServiceTests: XCTestCase {
    func makeCtx() throws -> ModelContext {
        ModelContext(try ModelContainer(for: Entry.self,
            configurations: ModelConfiguration(isStoredInMemoryOnly: true)))
    }

    func testEmptyBrainSkipsAI() async throws {
        let ctx = try makeCtx()
        let ai = MockAIService()
        let svc = AskService(context: ctx, ai: ai, embedder: EmbeddingService())
        let res = try await svc.ask("anything?")
        XCTAssertTrue(res.answer.lowercased().contains("nothing"))
        XCTAssertTrue(ai.lastCandidates.isEmpty)
    }

    func testMapsSourcesToEntries() async throws {
        let ctx = try makeCtx()
        for note in ["italian pasta place", "car mechanic", "perfume shop online"] {
            let e = Entry(type: .text, userNote: note)
            e.embedding = EmbeddingService().embed(note); ctx.insert(e)
        }
        try ctx.save()
        let ai = MockAIService(); ai.answerReturn = ("Go to the pasta place.", [0])
        let svc = AskService(context: ctx, ai: ai, embedder: EmbeddingService())
        let res = try await svc.ask("where should I eat pasta?")
        XCTAssertFalse(res.answer.isEmpty)
        XCTAssertEqual(res.sources.count, 1)   // index 0 maps to one entry
    }
}
```

- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3 — implement:**

```swift
import Foundation
import SwiftData

struct AskResult { let answer: String; let sources: [Entry] }

@MainActor
struct AskService {
    let context: ModelContext
    let ai: AIService
    let embedder: EmbeddingService
    var topK = 8

    func ask(_ question: String) async throws -> AskResult {
        let entries = try context.fetch(FetchDescriptor<Entry>())
            .filter { $0.embedding != nil }
        guard !entries.isEmpty, let q = embedder.embed(question) else {
            return AskResult(answer: "I don't have anything saved about that yet.", sources: [])
        }
        let ranked = embedder.rank(query: q, items: entries, key: { $0.embedding ?? [] })
        let top = Array(ranked.prefix(topK))
        let candidates = top.enumerated().map { AICandidate(index: $0.offset, text: $0.element.searchableText) }
        let (text, idxs) = try await ai.answer(question: question, candidates: candidates)
        let sources = idxs.compactMap { top.indices.contains($0) ? top[$0] : nil }
        return AskResult(answer: text, sources: sources)
    }
}
```

- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit: `git commit -am "feat: AskService RAG pipeline"`

**Chunk 1 exit criteria:** `./scripts/test.sh` green; the full capture→rank→answer engine is tested end-to-end with a mocked AI. No UI yet, but the brain works.

---

## Chunk 2: UI & app wiring

Wire the tested engine into SwiftUI. UI is verified by running in the simulator (Task 13) rather than heavy unit tests.

### Task 9: App container & dependency wiring

**Files:** Modify `SecondBrain/App/SecondBrainApp.swift`; Create `SecondBrain/App/AppEnvironment.swift`

- [ ] **Step 1:** Create `AppEnvironment` that builds the `ModelContainer` (SwiftData) and exposes `KeychainStore`, `EmbeddingService`, `ImageStore`, and a factory that returns a `GeminiService` from the stored key (or nil if no key).
- [ ] **Step 2:** In `SecondBrainApp`, create the `ModelContainer` with `Entry.self`, inject it via `.modelContainer(...)`, and show a `RootView` with a `TabView` (Timeline / Ask / Settings).
- [ ] **Step 3:** Build in simulator: `xcodebuild build -project SecondBrain.xcodeproj -scheme SecondBrain -destination 'platform=iOS Simulator,name=iPhone 15'`.
- [ ] **Step 4:** Commit.

### Task 10: Timeline screen + quick add

**Files:** Create `SecondBrain/Views/TimelineView.swift`, `SecondBrain/Views/AddEntrySheet.swift`, `SecondBrain/Views/EntryRow.swift`

- [ ] **Step 1:** `TimelineView` uses `@Query(sort: \Entry.createdAt, order: .reverse)` to list entries; each `EntryRow` shows type icon, note, a snippet of `extractedText`, and thumbnail for photos. Empty state invites first capture.
- [ ] **Step 2:** A `+` toolbar button opens `AddEntrySheet` with a segmented picker (Text / Photo / URL): text field for the note, `PhotosPicker`/camera for photo, URL field for links. On submit, call the matching `CaptureService` method; show a progress spinner during enrichment.
- [ ] **Step 3:** Handle "no API key" for photo capture: allow saving, show a small "will describe once key is added" note; set `needsEnrichment`.
- [ ] **Step 4:** Build & run in simulator; add a text and a URL entry, confirm they appear.
- [ ] **Step 5:** Commit.

### Task 11: Ask (chat) screen

**Files:** Create `SecondBrain/Views/AskView.swift`, `SecondBrain/Views/MessageBubble.swift`

- [ ] **Step 1:** `AskView` holds a list of Q/A turns. On submit, call `AskService.ask`, append the answer bubble, and render `sources` as tappable chips.
- [ ] **Step 2:** Tapping a source opens the underlying `Entry` (detail sheet showing note, extracted text, image, and a link to open the URL).
- [ ] **Step 3:** Loading + error states (network/quota → retryable message; no key → prompt to open Settings).
- [ ] **Step 4:** Build & run; seed a couple of entries, ask a question, confirm answer + citations.
- [ ] **Step 5:** Commit.

### Task 12: Settings (API key + iCloud)

**Files:** Create `SecondBrain/Views/SettingsView.swift`

- [ ] **Step 1:** Secure field to paste the Gemini key → `KeychainStore.save("gemini", ...)`; masked display when set; "Clear key" button. Link/instructions to get a free key from Google AI Studio.
- [ ] **Step 2:** iCloud sync toggle stored in `UserDefaults` (drives the container config on next launch; see Task 15).
- [ ] **Step 3:** "Re-run enrichment" button that finds entries with `needsEnrichment == true`, re-enriches, and re-embeds.
- [ ] **Step 4:** Build & run; paste a real key, verify photo description + Ask work end-to-end against Gemini.
- [ ] **Step 5:** Commit.

### Task 13: Simulator smoke pass

- [ ] **Step 1:** Boot sim, run the app, exercise: add text/photo/URL → see in timeline → ask a question → tap a citation. Fix any issues found.
- [ ] **Step 2:** Commit any fixes.

**Chunk 2 exit criteria:** a working single-user app in the simulator with real Gemini answers.

---

## Chunk 3: Share Extension, iCloud, device install

### Task 14: Share Extension + App Group

**Files:** Add `ShareExtension` target to `project.yml`; create `ShareExtension/ShareViewController.swift`; add App Group entitlement to both targets.

- [ ] **Step 1:** Add an App Group (e.g. `group.com.younan.secondbrain`) to both the app and extension in `project.yml` entitlements. Point `ImageStore` and the SwiftData store at the shared App Group container so both processes read/write the same brain.
- [ ] **Step 2:** Add the `ShareExtension` app-extension target that accepts `public.url`, `public.image`, and `public.text`.
- [ ] **Step 3:** In `ShareViewController`, present a tiny "Add a note?" field, then call the shared `CaptureService` (same code, shared via a small framework or shared source group) to persist the item.
- [ ] **Step 4:** Regenerate, run, and share a URL from Safari and a photo from Photos into the app; confirm they land in the timeline.
- [ ] **Step 5:** Commit.

> Note: Share Extension + App Group requires a signing team/entitlements. Set your Apple ID team in Xcode (`Signing & Capabilities`) before running on device.

### Task 15: iCloud sync (optional toggle)

**Files:** Modify `AppEnvironment` container config.

- [ ] **Step 1:** When the iCloud toggle is on, configure the SwiftData `ModelConfiguration` with a CloudKit container; add the iCloud + CloudKit capability and background modes in `project.yml`.
- [ ] **Step 2:** Test on a signed build (CloudKit needs a real container / Apple Developer account). Verify a new entry appears on a second signed-in device/simulator.
- [ ] **Step 3:** Commit.

### Task 16: Run on your iPhone

- [ ] **Step 1:** In Xcode, select your device + your personal signing team, set unique bundle ids, and Run. (Free Apple ID works for on-device installs; the app expires after 7 days unless you have a paid account.)
- [ ] **Step 2:** Verify capture, ask, and share-extension flows on-device.
- [ ] **Step 3:** Tag the release: `git tag v0.1 && git commit --allow-empty -m "chore: v0.1 on device"`.

**Chunk 3 exit criteria:** the app is installed on your iPhone, captures from other apps via the share sheet, and answers questions from Gemini.

---

## Notes for the implementer

- **Confirm the Gemini model id & free-tier limits** at implementation time (Task 5) — swap `GeminiConfig.model` if needed. Everything else is provider-agnostic behind `AIService`.
- **Signing:** Chunks 1–2 run entirely in the simulator with no signing. Chunk 3 (Share Extension, App Group, iCloud, device) needs your Apple ID team configured.
- **Concurrency:** services touching `ModelContext` are `@MainActor`; network calls are `async` and already off the main actor via `URLSession`.
- **Secrets:** the Gemini key lives only in Keychain — never commit it.
