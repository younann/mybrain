# Running Second Brain

## Prerequisites
- Xcode 16+, `brew install xcodegen`
- Regenerate the project any time `project.yml` changes: `xcodegen generate`

## Run in the Simulator (no signing needed)
```bash
open SecondBrain.xcodeproj   # then press ▶︎, or:
./scripts/test.sh            # runs the unit tests
```

## Get a free Gemini API key
1. Visit https://aistudio.google.com/app/apikey (sign in, no credit card).
2. "Create API key" → copy it.
3. In the app: **Settings tab → paste key → Save**. It's stored in the Keychain.
   - Photos are described by Gemini on save; questions in the **Ask** tab are answered by Gemini over your relevant notes.
   - Note: Google's *free* tier may use submitted data to improve their models. A paid key removes this with no code change.

## Install on your iPhone (free personal team — default)

The project is currently configured for a **free Apple ID** (no App Group, no
embedded Share Extension, iCloud off), which is all a personal team can sign.

1. `xcodegen generate` then open `SecondBrain.xcodeproj`.
2. Select the **SecondBrain** target → **Signing & Capabilities** → check
   **Automatically manage signing** → pick your **Team** (your Apple ID).
   - If the bundle id `com.younan.secondbrain` is taken, change it to something
     unique like `com.<you>.secondbrain`.
3. Plug in your iPhone, select it as the run destination, press ▶︎.
4. First run: on the iPhone, **Settings → General → VPN & Device Management** →
   trust your developer certificate.
5. The app re-signs/expires every 7 days on a free account — just re-run from
   Xcode to refresh.

Result: the full core app (capture text/photo/URL, Ask with Gemini) on your phone.

## Enabling Share Extension + iCloud later (paid Developer Program, $99/yr)

If you enroll at developer.apple.com:
- Restore the app target's `dependencies` (embed ShareExtension) and
  `entitlements` (App Group) blocks in `project.yml` — see git commit
  *"feat: Chunk 3 Share Extension, App Group store, iCloud toggle"*.
- In Xcode add **App Groups** (`group.com.younan.secondbrain`) to both targets
  and **iCloud → CloudKit** to the app target.
- Then Share Extension (save from Safari/Photos) and the iCloud toggle work on-device.

## Project layout
- `SecondBrain/Models` — SwiftData `Entry`
- `SecondBrain/Services` — Embedding, Keychain, AI/Gemini, URL fetch, Capture, Ask (all unit-tested, shared with the extension)
- `SecondBrain/Views` — Timeline, Add sheet, Ask chat, Settings
- `SecondBrain/Shared` — App Group locations
- `ShareExtension` — system share-sheet capture
- `docs/superpowers/` — design spec + implementation plan
