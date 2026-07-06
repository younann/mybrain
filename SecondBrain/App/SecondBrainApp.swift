import SwiftUI
import SwiftData

@main
struct SecondBrainApp: App {
    @State private var env = AppEnvironment()
    let container: ModelContainer

    init() {
        let iCloudOn = UserDefaults.standard.bool(forKey: "icloudSync")
        let config = ModelConfiguration(
            url: AppGroup.storeURL,
            cloudKitDatabase: iCloudOn ? .automatic : .none)
        do {
            container = try ModelContainer(for: Entry.self, configurations: config)
        } catch {
            // Fall back to a default local store if the configured one fails
            // (e.g. iCloud requested without entitlements).
            container = try! ModelContainer(for: Entry.self)
        }
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(env)
        }
        .modelContainer(container)
    }
}

struct RootView: View {
    var body: some View {
        TabView {
            TimelineView()
                .tabItem { Label("Brain", systemImage: "brain.head.profile") }
            AskView()
                .tabItem { Label("Ask", systemImage: "sparkles") }
            SettingsView()
                .tabItem { Label("Settings", systemImage: "gearshape") }
        }
    }
}
