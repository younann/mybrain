# Second Brain — iOS App Design

**Date:** 2026-07-06
**Status:** Draft for review

## 1. Purpose

A personal iOS "second brain": capture things you encounter in the real world
(a restaurant, a product, a website, a passing thought) with minimal friction,
then later ask questions in natural language and get a conversational answer
grounded in what you saved.

Example flows:
- Photograph a restaurant + write a note → later ask *"what restaurant would I
  love to eat in?"* → get an answer referencing your saved spots.
- Save a perfume-shop URL → later ask *"I want to buy perfume"* → get back the
  places/links you saved, explained.

Single user, single owner (you). Not a shared/social product.

## 2. Scope

### In scope (MVP / v1)
- Three capture types: **text note**, **photo (+ note)**, **URL (+ note)**.
- On-save enrichment: photos get an AI-written description; URLs get their
  title/description fetched. Enrichment happens **once**, at save time.
- A **timeline** screen listing everything captured, newest first, with
  quick-add buttons.
- An **Ask** (chat) screen: type a question → get a conversational answer that
  cites the saved entries it used; tapping a citation opens the original entry.
- **Share Extension**: send a photo or URL into the brain directly from Safari,
  Photos, or the Camera share sheet without opening the app first.
- Local storage with optional iCloud sync/backup (single toggle).

### Out of scope (v1) — YAGNI
- Multi-user / sharing / social features.
- Web or desktop client.
- Audio/voice notes, file/PDF attachments.
- Manual tagging UI (tags may be auto-derived later; not required for v1).
- Editing enrichment text by hand (can be added later).
- Reminders/notifications.

## 3. Architecture

### 3.1 High-level flow
```
Capture (text / photo / URL)
   │
   ├─ enrich once:  photo → Gemini vision description
   │                URL   → fetch <title> + meta description
   │
   ├─ build searchable text = userNote + extractedText
   ├─ compute on-device embedding of searchable text
   └─ persist Entry (+ image file if photo)

Ask (natural-language question)
   │
   ├─ embed the question on-device
   ├─ rank all entries by cosine similarity, take top-K (e.g. 8)
   ├─ send question + top-K entries' text to Gemini
   └─ render conversational answer + tappable citations
```

### 3.2 Retrieval approach — RAG with on-device embeddings (chosen)
Approved approach **A**. When an entry is saved we compute a semantic embedding
locally using Apple's `NaturalLanguage` framework
(`NLContextualEmbedding` / sentence embedding). At query time we embed the
question the same way, rank entries by cosine similarity, and send only the
top-K to Gemini. This keeps per-query cost near-zero, works offline for the
ranking step, and keeps note contents on-device except for the handful sent to
answer a given question.

Rejected alternatives:
- **Send-everything:** simple but breaks past a few hundred entries (cost/limits).
- **AI-driven tool search:** more powerful but more complex and more round-trips
  than v1 needs.

### 3.3 AI provider — Google Gemini (free tier)
- Gemini Flash (multimodal) handles **both** photo description (vision) and the
  conversational answer — one integration.
- API key obtained from Google AI Studio (no credit card for free tier).
- Key stored in the iOS **Keychain**, never in source or UserDefaults.
- Privacy note: Google's *free* tier may use submitted data to improve their
  models. Acceptable for a personal brain; a paid key removes this with no code
  change. Provider is isolated behind an `AIService` protocol so it can be
  swapped.

### 3.4 Embeddings
On-device via `NaturalLanguage`. No network, no cost, private. Embedding vector
stored on the `Entry`. If the framework's model changes, embeddings can be
recomputed by re-indexing (a background pass over all entries).

## 4. Components

| Component | Responsibility | Depends on |
|-----------|----------------|------------|
| `Entry` (SwiftData model) | Persisted record of one captured item | SwiftData |
| `CaptureService` | Create entries; orchestrate enrichment + embedding on save | AIService, URLMetadataFetcher, EmbeddingService |
| `AIService` (protocol) + `GeminiService` | Vision description + conversational answer. Provider-agnostic interface | Gemini API, Keychain |
| `EmbeddingService` | Compute embeddings; cosine similarity ranking | NaturalLanguage |
| `URLMetadataFetcher` | Fetch title/description for a saved URL | URLSession |
| `AskService` | embed question → rank → assemble prompt → call AIService → parse answer + citations | EmbeddingService, AIService |
| `KeychainStore` | Read/write the Gemini API key | Security framework |
| Timeline view | List entries, quick-add | SwiftData, CaptureService |
| Ask view | Chat UI, render answer + citations | AskService |
| Settings view | Enter API key, toggle iCloud sync | KeychainStore |
| Share Extension | Accept shared photo/URL, hand to CaptureService | App Group storage |

Each service has one clear job and talks through a narrow interface, so any one
(e.g. swapping Gemini for another provider) can change without touching the UI.

## 5. Data model

```
Entry
  id: UUID
  createdAt: Date
  type: enum { text, photo, url }
  userNote: String            // what you wrote
  extractedText: String       // vision description OR url title+desc OR ""
  imageRef: String?           // filename in app's images dir (photo only)
  url: String?                // (url only)
  tags: [String]              // reserved; auto-derived later, empty in v1
  embedding: [Float]          // on-device semantic vector of searchable text
```
`searchableText = userNote + "\n" + extractedText` is what gets embedded and
what's sent (per selected entry) to Gemini at answer time.

Storage: **SwiftData**, with the container configured to allow **CloudKit**
sync so iCloud backup/sync is a toggle rather than a rewrite. Image files stored
on disk (in a shared App Group container so the Share Extension can write them),
referenced by `imageRef`.

## 6. Error handling

- **No API key set:** Ask screen and photo enrichment prompt the user to add a
  key in Settings; capture of text/URL still works (enrichment deferred/queued).
- **Gemini call fails (network/quota):** show a clear, retryable error. Saving
  an entry never fails because enrichment failed — enrichment is best-effort and
  can be retried later (entry saved with empty `extractedText`, flagged for
  re-enrichment).
- **URL fetch fails:** save the raw URL + user note; `extractedText` empty.
- **Embedding unavailable:** entry still saved; it just won't rank until
  re-indexed.
- **Empty brain / no relevant matches:** Ask returns a friendly "I don't have
  anything saved about that yet" instead of hallucinating.

## 7. Testing strategy

- **Unit:** `EmbeddingService` cosine ranking (known vectors → expected order);
  `URLMetadataFetcher` parsing (fixture HTML); `AskService` prompt assembly and
  citation parsing; `KeychainStore` round-trip.
- **AIService:** mocked via the protocol so `AskService`/`CaptureService` are
  tested without network; a small number of live smoke tests behind a flag.
- **Model:** `Entry` persistence and query round-trips in an in-memory SwiftData
  container.
- **UI (light):** capture → appears in timeline; ask with seeded entries →
  answer renders with citations.

## 8. Tech stack

- Swift + SwiftUI, iOS (target current-1 to keep APIs modern).
- SwiftData (persistence, optional CloudKit sync).
- `NaturalLanguage` (embeddings).
- Google Gemini API (vision + generation) over `URLSession`.
- Keychain (`Security`) for the API key.
- App Group + Share Extension for external capture.

## 9. Open questions / deferred

- Auto-tagging and filtering the timeline by tag/type (post-v1).
- Re-enrichment queue UI (v1 can retry silently on next launch).
- Choice of exact Gemini model id + confirming current free-tier limits (verify
  at implementation time).
