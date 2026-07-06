import Foundation
import Security

struct KeychainStore {
    let service: String
    init(service: String = "com.younan.secondbrain") { self.service = service }

    private func query(_ account: String) -> [String: Any] {
        [kSecClass as String: kSecClassGenericPassword,
         kSecAttrService as String: service,
         kSecAttrAccount as String: account]
    }

    func save(_ account: String, value: String) {
        let data = Data(value.utf8)
        SecItemDelete(query(account) as CFDictionary)
        var attrs = query(account); attrs[kSecValueData as String] = data
        SecItemAdd(attrs as CFDictionary, nil)
    }

    func read(_ account: String) -> String? {
        var q = query(account)
        q[kSecReturnData as String] = true
        q[kSecMatchLimit as String] = kSecMatchLimitOne
        var out: CFTypeRef?
        guard SecItemCopyMatching(q as CFDictionary, &out) == errSecSuccess,
              let d = out as? Data else { return nil }
        return String(data: d, encoding: .utf8)
    }

    func delete(_ account: String) { SecItemDelete(query(account) as CFDictionary) }
}
