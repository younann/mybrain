#!/usr/bin/env bash
set -euo pipefail
xcodegen generate >/dev/null

# Resolve a concrete iPhone simulator UDID (names can be ambiguous across runtimes).
UDID=$(xcrun simctl list devices available -j \
  | python3 -c 'import json,sys;d=json.load(sys.stdin)["devices"];print(next(dev["udid"] for rt in d for dev in d[rt] if dev.get("isAvailable") and "iPhone" in dev["name"]))')
DEST="platform=iOS Simulator,id=${UDID}"

run() {
  xcodebuild test \
    -project SecondBrain.xcodeproj \
    -scheme SecondBrain \
    -destination "$DEST" \
    "$@"
}

if command -v xcbeautify >/dev/null 2>&1; then
  run "$@" | xcbeautify
else
  run "$@"
fi
