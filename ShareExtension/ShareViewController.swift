import UIKit
import SwiftUI
import SwiftData
import UniformTypeIdentifiers

/// Hosts a small SwiftUI form to capture a shared URL / image / text into the brain.
final class ShareViewController: UIViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
        Task { await loadAndPresent() }
    }

    private func loadAndPresent() async {
        let shared = await extractSharedItem()
        let root = ShareCaptureView(item: shared,
                                    onDone: { [weak self] in self?.complete() })
        let host = UIHostingController(rootView: root)
        addChild(host)
        host.view.frame = view.bounds
        host.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        view.addSubview(host.view)
        host.didMove(toParent: self)
    }

    private func complete() {
        extensionContext?.completeRequest(returningItems: nil)
    }

    /// Pulls the first URL, image, or text from the extension inputs.
    private func extractSharedItem() async -> SharedItem {
        guard let items = extensionContext?.inputItems as? [NSExtensionItem] else { return .none }
        for item in items {
            for provider in item.attachments ?? [] {
                if provider.hasItemConformingToTypeIdentifier(UTType.url.identifier),
                   let s = await loadURLString(provider) {
                    return .url(s)
                }
                if provider.hasItemConformingToTypeIdentifier(UTType.image.identifier),
                   let data = await loadImageData(provider) {
                    return .image(data)
                }
                if provider.hasItemConformingToTypeIdentifier(UTType.plainText.identifier),
                   let text = await loadText(provider) {
                    return .text(text)
                }
            }
        }
        return .none
    }

    // The callback API keeps the non-Sendable NSSecureCoding value inside the
    // closure and only resumes with Sendable String/Data.
    private func loadURLString(_ p: NSItemProvider) async -> String? {
        await withCheckedContinuation { cont in
            p.loadItem(forTypeIdentifier: UTType.url.identifier, options: nil) { item, _ in
                cont.resume(returning: (item as? URL)?.absoluteString)
            }
        }
    }

    private func loadText(_ p: NSItemProvider) async -> String? {
        await withCheckedContinuation { cont in
            p.loadItem(forTypeIdentifier: UTType.plainText.identifier, options: nil) { item, _ in
                cont.resume(returning: item as? String)
            }
        }
    }

    private func loadImageData(_ p: NSItemProvider) async -> Data? {
        await withCheckedContinuation { cont in
            p.loadItem(forTypeIdentifier: UTType.image.identifier, options: nil) { item, _ in
                if let data = item as? Data { cont.resume(returning: data) }
                else if let url = item as? URL { cont.resume(returning: try? Data(contentsOf: url)) }
                else if let image = item as? UIImage { cont.resume(returning: image.jpegData(compressionQuality: 0.85)) }
                else { cont.resume(returning: nil) }
            }
        }
    }
}

enum SharedItem {
    case url(String), image(Data), text(String), none
}

struct ShareCaptureView: View {
    let item: SharedItem
    let onDone: () -> Void
    @State private var note = ""
    @State private var saving = false
    @State private var message: String?

    var body: some View {
        NavigationStack {
            Form {
                Section("Preview") { preview }
                Section("Note (optional)") {
                    TextField("Why are you saving this?", text: $note, axis: .vertical)
                        .lineLimit(2...5)
                }
                if let message { Text(message).foregroundStyle(.secondary).font(.footnote) }
            }
            .navigationTitle("Save to Brain")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel", action: onDone) }
                ToolbarItem(placement: .confirmationAction) {
                    if saving { ProgressView() } else { Button("Save", action: save) }
                }
            }
        }
    }

    @ViewBuilder private var preview: some View {
        switch item {
        case .url(let s): Label(s, systemImage: "link").lineLimit(2)
        case .text(let s): Text(s).lineLimit(3)
        case .image(let d):
            if let img = UIImage(data: d) {
                Image(uiImage: img).resizable().scaledToFit().frame(maxHeight: 160)
            } else { Text("Image") }
        case .none: Text("Nothing to save").foregroundStyle(.secondary)
        }
    }

    private func save() {
        saving = true
        Task {
            do {
                let ctx = ModelContext(try ModelContainer(
                    for: Entry.self,
                    configurations: ModelConfiguration(url: AppGroup.storeURL)))
                // Extension has no AI key access → photos are deferred for the app to enrich.
                let capture = await MainActor.run {
                    CaptureService(context: ctx, ai: NoAIService(),
                                   embedder: EmbeddingService(), imageStore: ImageStore())
                }
                switch item {
                case .url(let s):   try await capture.saveURL(note: note, urlString: s)
                case .text(let s):  try await capture.saveText(note: note.isEmpty ? s : "\(note)\n\(s)")
                case .image(let d): try await capture.savePhoto(note: note, imageData: d)
                case .none: break
                }
                onDone()
            } catch {
                message = "Couldn't save: \(error.localizedDescription)"
                saving = false
            }
        }
    }
}
