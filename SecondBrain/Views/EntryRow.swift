import SwiftUI

extension EntryType {
    var icon: String {
        switch self { case .text: "note.text"; case .photo: "photo"; case .url: "link" }
    }
}

struct EntryRow: View {
    let entry: Entry
    let imageStore: ImageStore

    private var thumbnail: UIImage? {
        guard let ref = entry.imageRef, let data = imageStore.load(ref) else { return nil }
        return UIImage(data: data)
    }

    var body: some View {
        HStack(spacing: 12) {
            if let img = thumbnail {
                Image(uiImage: img)
                    .resizable().scaledToFill()
                    .frame(width: 48, height: 48)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
            } else {
                Image(systemName: entry.type.icon)
                    .font(.title3).foregroundStyle(.secondary)
                    .frame(width: 48, height: 48)
                    .background(Color(.secondarySystemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(entry.userNote.isEmpty ? (entry.url ?? "(no note)") : entry.userNote)
                    .font(.body).lineLimit(1)
                if !entry.extractedText.isEmpty {
                    Text(entry.extractedText).font(.caption).foregroundStyle(.secondary).lineLimit(2)
                }
                Text(entry.createdAt, format: .dateTime.month().day().hour().minute())
                    .font(.caption2).foregroundStyle(.tertiary)
            }
            Spacer()
        }
        .padding(.vertical, 4)
    }
}
