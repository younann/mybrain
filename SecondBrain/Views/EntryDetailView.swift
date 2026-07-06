import SwiftUI

struct EntryDetailView: View {
    let entry: Entry
    let imageStore: ImageStore

    private var image: UIImage? {
        guard let ref = entry.imageRef, let data = imageStore.load(ref) else { return nil }
        return UIImage(data: data)
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                if let img = image {
                    Image(uiImage: img).resizable().scaledToFit()
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                if !entry.userNote.isEmpty {
                    section("Your note", entry.userNote)
                }
                if !entry.extractedText.isEmpty {
                    section(entry.type == .url ? "Page" : "Description", entry.extractedText)
                }
                if let urlStr = entry.url, let url = URL(string: urlStr) {
                    Link(destination: url) {
                        Label(urlStr, systemImage: "safari").lineLimit(1)
                    }
                }
                Text(entry.createdAt, format: .dateTime.weekday().month().day().year().hour().minute())
                    .font(.footnote).foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding()
        }
        .navigationTitle(entry.type.rawValue.capitalized)
        .navigationBarTitleDisplayMode(.inline)
    }

    private func section(_ title: String, _ body: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title).font(.caption).foregroundStyle(.secondary)
            Text(body).font(.body)
        }
    }
}
