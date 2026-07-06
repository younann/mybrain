import SwiftUI
import SwiftData

struct QATurn: Identifiable {
    let id = UUID()
    let question: String
    var answer: String
    var sources: [Entry]
    var isLoading: Bool
}

struct AskView: View {
    @Environment(AppEnvironment.self) private var env
    @Environment(\.modelContext) private var context

    @State private var turns: [QATurn] = []
    @State private var input = ""
    @State private var selectedEntry: Entry?

    private var ask: AskService {
        AskService(context: context, ai: env.makeAI(), embedder: env.embedder)
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                if !env.hasKey {
                    banner("Add your Gemini API key in Settings to get answers.")
                }
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(alignment: .leading, spacing: 16) {
                            if turns.isEmpty {
                                Text("Ask your brain anything — “where would I love to eat?”, “what did I save about perfume?”")
                                    .foregroundStyle(.secondary).padding()
                            }
                            ForEach(turns) { turn in
                                MessageBubble(turn: turn) { selectedEntry = $0 }
                                    .id(turn.id)
                            }
                        }
                        .padding()
                    }
                    .onChange(of: turns.count) { _, _ in
                        if let last = turns.last { withAnimation { proxy.scrollTo(last.id, anchor: .bottom) } }
                    }
                }
                inputBar
            }
            .navigationTitle("Ask")
            .navigationDestination(item: $selectedEntry) { entry in
                EntryDetailView(entry: entry, imageStore: env.imageStore)
            }
        }
    }

    private var inputBar: some View {
        HStack(spacing: 8) {
            TextField("Ask a question…", text: $input, axis: .vertical)
                .textFieldStyle(.roundedBorder)
                .lineLimit(1...4)
            Button {
                submit()
            } label: {
                Image(systemName: "arrow.up.circle.fill").font(.title2)
            }
            .disabled(input.trimmingCharacters(in: .whitespaces).isEmpty)
        }
        .padding()
        .background(.bar)
    }

    private func banner(_ text: String) -> some View {
        Text(text).font(.footnote).foregroundStyle(.secondary)
            .frame(maxWidth: .infinity).padding(8)
            .background(Color(.secondarySystemBackground))
    }

    private func submit() {
        let q = input.trimmingCharacters(in: .whitespaces)
        guard !q.isEmpty else { return }
        input = ""
        let idx = turns.count
        turns.append(QATurn(question: q, answer: "", sources: [], isLoading: true))
        Task {
            do {
                let res = try await ask.ask(q)
                turns[idx].answer = res.answer
                turns[idx].sources = res.sources
            } catch {
                turns[idx].answer = "⚠️ \(error.localizedDescription)"
            }
            turns[idx].isLoading = false
        }
    }
}
