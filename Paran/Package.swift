// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "Paran",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [
        .library(name: "ParanEngine", targets: ["ParanEngine"]),
    ],
    targets: [
        .target(
            name: "ParanEngine",
            path: "Sources/Engine"
        ),
        .testTarget(
            name: "ParanEngineTests",
            dependencies: ["ParanEngine"],
            path: "Tests"
        ),
    ]
)
