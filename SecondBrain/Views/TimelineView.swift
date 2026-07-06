import SwiftUI
import SwiftData

struct TimelineView: View {
    @Environment(AppEnvironment.self) private var env
    @Environment(\.modelContext) private var context
    @Query(sort: \Entry.createdAt, order: .reverse) private var entries: [Entry]
    @State private var showAdd = false

    var body: some View {
        NavigationStack {
            Group {
                if entries.isEmpty {
                    ContentUnavailableView {
                        Label("Your brain is empty", systemImage: "brain.head.profile")
                    } description: {
                        Text("Tap + to save a thought, photo, or link. Later, ask about it in the Ask tab.")
                    }
                } else {
                    List {
                        ForEach(entries) { entry in
                            NavigationLink {
                                EntryDetailView(entry: entry, imageStore: env.imageStore)
                            } label: {
                                EntryRow(entry: entry, imageStore: env.imageStore)
                            }
                        }
                        .onDelete(perform: delete)
                    }
                }
            }
            .navigationTitle("Brain")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button { showAdd = true } label: { Image(systemName: "plus") }
                }
            }
            .sheet(isPresented: $showAdd) { AddEntrySheet() }
        }
    }

    private func delete(_ offsets: IndexSet) {
        for i in offsets {
            let e = entries[i]
            if let ref = e.imageRef, let dir = env.imageStore.dir {
                try? FileManager.default.removeItem(at: dir.appendingPathComponent(ref))
            }
            context.delete(e)
        }
    }
}
