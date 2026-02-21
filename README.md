# Paran

> *Find where you shine.*

Paran is an astrocartography app for Apple devices. It maps your birth chart to locations around the world, showing where your planetary energies are strongest and what themes each place activates for you.

## Architecture

- **SwiftUI** — native iOS UI
- **MapKit** — interactive map with astrocartography lines
- **Core Location** — GPS-based insights for your current location
- **Three-Layer Engine** — natal lines + relocated chart + transits for every location
- **Express API** — backend for auth and data persistence
- **Supabase** — authentication (OTP) and database

## Project Structure

```
Paran/
├── Sources/
│   ├── App/            # App entry, tab navigation
│   ├── Engine/         # Astro calculations, synthesis, transits, interpretations
│   ├── Models/         # Data types (CoreTypes, TransitTypes, SynthesisTypes)
│   ├── Services/       # Auth, API, profile, location, cities data
│   ├── Theme/          # Midnight Violet palette and brand constants
│   └── Views/
│       ├── Map/        # Astrocartography map with hotspots
│       ├── Insights/   # Summary, Travel Timeline, Places
│       ├── CityDetail/ # Full city analysis card
│       ├── LineDetail/  # Planet line interpretation
│       ├── Bonds/      # Synastry and shared travel planning
│       ├── Learn/      # Educational content
│       ├── Profile/    # Settings and birth data
│       ├── Onboarding/ # FTUX flow
│       └── Auth/       # Sign-in flow
├── Resources/          # Assets
├── project.yml         # xcodegen spec
└── Package.swift       # SPM for engine module
```

## Getting Started

1. Install [xcodegen](https://github.com/yonaskolb/XcodeGen): `brew install xcodegen`
2. Generate the Xcode project: `cd Paran && xcodegen generate`
3. Open `Paran/Paran.xcodeproj` in Xcode
4. Set your development team in Signing & Capabilities
5. Build and run on an iOS 17+ simulator or device

## React Legacy

The original React Native/Expo codebase is preserved on the `react-legacy` branch and in the `paran-react-archive` repo.

## Taglines

- **App Store**: "Find where you shine."
- **Loading**: "Move with the stars."
- **Onboarding**: "Your chart. Your world."
- **Social**: "Some places just feel like you."
