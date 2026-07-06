import Foundation

/// Shared locations used by both the app and the Share Extension.
/// Falls back to a local container when the App Group is unavailable
/// (e.g. simulator without provisioning, or a free Apple ID), so the
/// main app always runs.
enum AppGroup {
    static let id = "group.com.younan.secondbrain"

    static var containerURL: URL? {
        FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: id)
    }

    /// Directory to use for storage: the App Group container if available,
    /// otherwise the process's Application Support directory.
    static var storageDir: URL {
        if let c = containerURL { return c }
        return FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
    }

    static var storeURL: URL {
        let dir = storageDir
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir.appendingPathComponent("SecondBrain.store")
    }

    /// True when the App Group container resolved — data sharing across the
    /// app and the extension is only reliable in this case.
    static var isShared: Bool { containerURL != nil }
}
