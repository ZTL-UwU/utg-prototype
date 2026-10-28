#!/usr/bin/env bash
# Build the web app, copy it into the Capacitor iOS folder, then build + install with xtool.
# Run from anywhere; plug the iPhone in via USB (usbipd attach on WSL) first.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"   # apps/game/ios-xtool
GAME="$(dirname "$HERE")"               # apps/game

cd "$GAME"
pnpm build                  # -> dist/  (make sure VITE_BACKEND_URL is a reachable https URL)
npx cap sync ios            # -> ios/App/App/public + capacitor.config.json + config.xml

# The asset-catalog icon is named AppIcon-512@2x.png; "@2x" in a filename means
# something special to iOS, so copy it under a plain name.
cp ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png "$HERE/icon.png"

cd "$HERE"
xtool dev "$@"              # extra args pass through, e.g. ./run-ios.sh -c release
