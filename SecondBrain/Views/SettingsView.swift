import SwiftUI
import SwiftData

struct SettingsView: View {
    @Environment(AppEnvironment.self) private var env
    @Environment(\.modelContext) private var context

    @State private var keyInput = ""
    @State private var reEnriching = false
    @State private var status: String?

    var body: some View {
        NavigationStack {
            Form {
                Section("Gemini API key") {
                    if env.hasKey {
                        Label("Key is set", systemImage: "checkmark.seal.fill")
                            .foregroundStyle(.green)
                        Button("Clear key", role: .destructive) { env.clearKey() }
                    } else {
                        SecureField("Paste your key", text: $keyInput)
                            .textInputAutocapitalization(.never).autocorrectionDisabled()
                        Button("Save key") {
                            env.setKey(keyInput); keyInput = ""
                        }
                        .disabled(keyInput.trimmingCharacters(in: .whitespaces).isEmpty)
                        Link("Get a free key from Google AI Studio",
                             destination: URL(string: "https://aistudio.google.com/app/apikey")!)
                            .font(.footnote)
                    }
                }

                Section("Maintenance") {
                    Button {
                        reEnrich()
                    } label: {
                        if reEnriching { ProgressView() } else { Text("Re-run enrichment for pending items") }
                    }
                    .disabled(reEnriching || !env.hasKey)
                    if let status { Text(status).font(.footnote).foregroundStyle(.secondary) }
                }

                Section {
                    Text("Your notes stay on this device. Only the few notes relevant to a question are sent to Gemini to compose an answer.")
                        .font(.footnote).foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Settings")
        }
    }

    private func reEnrich() {
        reEnriching = true; status = nil
        Task {
            let ai = env.makeAI()
            let pending = (try? context.fetch(
                FetchDescriptor<Entry>(predicate: #Predicate { $0.needsEnrichment }))) ?? []
            var done = 0
            for e in pending {
                guard let ref = e.imageRef, let data = env.imageStore.load(ref) else { continue }
                if let desc = try? await ai.describeImage(data) {
                    e.extractedText = desc
                    e.embedding = env.embedder.embed(e.searchableText)
                    e.needsEnrichment = false
                    done += 1
                }
            }
            try? context.save()
            status = "Enriched \(done) item(s)."
            reEnriching = false
        }
    }
}
