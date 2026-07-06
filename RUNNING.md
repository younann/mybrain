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

## Install on your iPhone

Open `SecondBrain.xcodeproj` in Xcode, then for **each target** (SecondBrain, ShareExtension):
`Signing & Capabilities` → check **Automatically manage signing** → select your **Team** (your Apple ID).

### Free Apple ID
- The **main app** installs and runs (Apple re-sign required every 7 days).
- **App Groups + iCloud are NOT supported** on a free account, so the **Share Extension and iCloud sync will not run on-device**. Leave iCloud off in Settings. (Both still work in the Simulator.)

### Paid Apple Developer account ($99/yr)
- Add the **App Groups** capability (`group.com.younan.secondbrain`) to both targets, and **iCloud → CloudKit** to the app target, in Xcode's Signing & Capabilities.
- All three work on-device: main app, Share Extension (share a URL/photo from Safari/Photos), and iCloud sync (toggle in Settings, then restart the app).

## Project layout
- `SecondBrain/Models` — SwiftData `Entry`
- `SecondBrain/Services` — Embedding, Keychain, AI/Gemini, URL fetch, Capture, Ask (all unit-tested, shared with the extension)
- `SecondBrain/Views` — Timeline, Add sheet, Ask chat, Settings
- `SecondBrain/Shared` — App Group locations
- `ShareExtension` — system share-sheet capture
- `docs/superpowers/` — design spec + implementation plan
