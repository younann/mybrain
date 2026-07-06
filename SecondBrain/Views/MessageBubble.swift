import SwiftUI

struct MessageBubble: View {
    let turn: QATurn
    let onSelect: (Entry) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Question (right-aligned)
            HStack {
                Spacer(minLength: 40)
                Text(turn.question)
                    .padding(10)
                    .background(Color.accentColor.opacity(0.15))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            // Answer (left-aligned)
            HStack {
                if turn.isLoading {
                    ProgressView().padding(10)
                } else {
                    VStack(alignment: .leading, spacing: 8) {
                        Text(turn.answer)
                            .padding(10)
                            .background(Color(.secondarySystemBackground))
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        if !turn.sources.isEmpty {
                            sourceChips
                        }
                    }
                }
                Spacer(minLength: 40)
            }
        }
    }

    private var sourceChips: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                ForEach(turn.sources) { entry in
                    Button { onSelect(entry) } label: {
                        Label(chipTitle(entry), systemImage: entry.type.icon)
                            .font(.caption).lineLimit(1)
                            .padding(.horizontal, 10).padding(.vertical, 5)
                            .background(Color(.tertiarySystemBackground))
                            .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private func chipTitle(_ e: Entry) -> String {
        let base = e.userNote.isEmpty ? e.extractedText : e.userNote
        return String(base.prefix(28))
    }
}
