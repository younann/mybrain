import SwiftUI
import SwiftData

@main
struct SecondBrainApp: App {
    @State private var env = AppEnvironment()
    let container: ModelContainer

    init() {
        do {
            container = try ModelContainer(for: Entry.self)
        } catch {
            fatalError("Failed to create ModelContainer: \(error)")
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
