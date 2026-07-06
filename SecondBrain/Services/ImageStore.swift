import Foundation

struct ImageStore {
    let dir: URL?
    init(inMemory: Bool = false, container: URL? = nil) {
        if inMemory { dir = nil }
        else { dir = (container ?? FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0])
                    .appendingPathComponent("images", isDirectory: true) }
        if let d = dir { try? FileManager.default.createDirectory(at: d, withIntermediateDirectories: true) }
    }
    /// Returns the stored filename (or a fake name in memory mode).
    func save(_ data: Data) -> String {
        let name = UUID().uuidString + ".jpg"
        if let d = dir { try? data.write(to: d.appendingPathComponent(name)) }
        return name
    }
    func load(_ name: String) -> Data? { dir.flatMap { try? Data(contentsOf: $0.appendingPathComponent(name)) } }
}
