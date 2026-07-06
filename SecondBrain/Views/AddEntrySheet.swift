import SwiftUI
import SwiftData
import PhotosUI

struct AddEntrySheet: View {
    @Environment(AppEnvironment.self) private var env
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss

    @State private var kind: EntryType = .text
    @State private var note = ""
    @State private var urlString = ""
    @State private var photoItem: PhotosPickerItem?
    @State private var photoData: Data?
    @State private var saving = false
    @State private var errorText: String?

    private var capture: CaptureService {
        CaptureService(context: context, ai: env.makeAI(),
                       embedder: env.embedder, imageStore: env.imageStore)
    }

    private var canSave: Bool {
        switch kind {
        case .text: !note.trimmingCharacters(in: .whitespaces).isEmpty
        case .url: !urlString.trimmingCharacters(in: .whitespaces).isEmpty
        case .photo: photoData != nil
        }
    }

    var body: some View {
        NavigationStack {
            Form {
                Picker("Type", selection: $kind) {
                    Text("Text").tag(EntryType.text)
                    Text("Photo").tag(EntryType.photo)
                    Text("URL").tag(EntryType.url)
                }
                .pickerStyle(.segmented)

                switch kind {
                case .text:
                    Section("Note") {
                        TextField("What do you want to remember?", text: $note, axis: .vertical)
                            .lineLimit(3...8)
                    }
                case .url:
                    Section("Link") {
                        TextField("https://…", text: $urlString)
                            .textInputAutocapitalization(.never).autocorrectionDisabled()
                            .keyboardType(.URL)
                    }
                    Section("Note (optional)") {
                        TextField("Why are you saving this?", text: $note, axis: .vertical)
                    }
                case .photo:
                    Section {
                        PhotosPicker(selection: $photoItem, matching: .images) {
                            Label("Choose photo", systemImage: "photo")
                        }
                        if let data = photoData, let img = UIImage(data: data) {
                            Image(uiImage: img).resizable().scaledToFit().frame(maxHeight: 200)
                        }
                    }
                    Section("Note (optional)") {
                        TextField("What is this?", text: $note, axis: .vertical)
                    }
                    if !env.hasKey {
                        Text("No AI key set — the photo will be saved now and described once you add a key in Settings.")
                            .font(.footnote).foregroundStyle(.secondary)
                    }
                }

                if let errorText {
                    Text(errorText).foregroundStyle(.red).font(.footnote)
                }
            }
            .navigationTitle("Add to Brain")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    if saving { ProgressView() }
                    else { Button("Save", action: save).disabled(!canSave) }
                }
            }
            .onChange(of: photoItem) { _, item in
                Task { photoData = try? await item?.loadTransferable(type: Data.self) }
            }
        }
    }

    private func save() {
        saving = true; errorText = nil
        Task {
            do {
                switch kind {
                case .text: try await capture.saveText(note: note)
                case .url:  try await capture.saveURL(note: note, urlString: urlString)
                case .photo:
                    if let data = photoData { try await capture.savePhoto(note: note, imageData: data) }
                }
                dismiss()
            } catch {
                errorText = error.localizedDescription
            }
            saving = false
        }
    }
}
