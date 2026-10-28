// swift-tools-version: 6.0
// xtool wrapper for the Capacitor iOS shell of apps/game.
// Replaces ios/App/App.xcodeproj when building on Linux/WSL.
import PackageDescription

let package = Package(
    name: "SozlerSeylisi",
    platforms: [.iOS(.v15)], // Capacitor 8 requires iOS 15+
    products: [
        // xtool turns this library into the .app
        .library(name: "SozlerSeylisi", targets: ["SozlerSeylisi"]),
    ],
    dependencies: [
        // Capacitor-managed package: future plugins added by `npx cap sync` flow in through here.
        .package(path: "../ios/App/CapApp-SPM"),
        // Direct pin so our Swift files can `import Capacitor`.
        // Keep in sync with the version in ../ios/App/CapApp-SPM/Package.swift.
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.5.3"),
    ],
    targets: [
        .target(
            name: "SozlerSeylisi",
            dependencies: [
                .product(name: "CapApp-SPM", package: "CapApp-SPM"),
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
            ]
        ),
    ],
    // Capacitor's template code predates Swift 6 strict concurrency.
    swiftLanguageModes: [.v5]
)
