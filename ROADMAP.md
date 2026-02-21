# Paran — Strategic Roadmap

> *Find where you shine.*

## Status

- **Platform**: Swift / SwiftUI (Apple-native)
- **React Legacy**: Preserved on `react-legacy` branch and `paran-react-archive` repo
- **Current Phase**: Phase 1 complete — Swift project scaffolded

---

## Core Architecture

### Three-Layer Interpretation Engine

Every city card, timeline entry, and insight flows from three layers:

1. **Natal Lines** — always true for you (which planets are activated at a location, how strong, what themes)
2. **Relocated Chart** — how it manifests (where planets land in houses at that location, which life areas light up)
3. **Transits / CCG** — when it peaks (are current transits boosting or stressing your lines, when does it peak)

All interpretations are **plain English** — no jargon like "Venus trine Jupiter" on main cards. Technical details available behind (i) tooltips for advanced users.

### Four Pillars

Every screen, CTA, and feature maps to one of these:

| Pillar | Question | Data Source |
|--------|----------|-------------|
| **Live** | Where should I live? | Natal + Relocated baseline |
| **Travel** | Where and WHEN should I travel? | Natal + Transits + Timeline |
| **Bonds** | Where should WE go together? | Synastry + Shared timeline |
| **Themes** | What am I looking for? | Keyword filtering across all |

---

## Completed

### Phase 1: Swift Migration

- [x] Archived React codebase to `paran-react-archive` repo
- [x] Created `react-legacy` branch preserving all React history
- [x] Created orphan `main` branch for Swift
- [x] Generated Xcode project via xcodegen
- [x] Core data models (CoreTypes, TransitTypes, SynthesisTypes)
- [x] Astronomical engine (AstroEngine: planet positions, line generation, relocated charts)
- [x] Three-layer synthesis engine (SynthesisEngine)
- [x] Transit engine (TransitEngine: activations, windows, timeline entries, important dates)
- [x] Natal conditions assessment (NatalConditions)
- [x] Line classification and interpretations library
- [x] Midnight Violet theme system (ParanTheme) with full brand palette
- [x] App entry point with onboarding flow
- [x] Tab navigation (Map, Insights, Bonds, Learn, Profile)
- [x] Auth system (Supabase OTP flow, token management)
- [x] API client with proper localhost handling

### Phase 2: Foundation + Quick Wins

- [x] Activation % calculation (ActivationStrength utility)
- [x] City card layout: full synthesis text (no truncation), reordered sections
- [x] Signal bars + percentage display
- [x] Formalized Midnight Violet palette
- [x] App renamed to "Paran" throughout

### Phase 3: Insights Redesign

- [x] Summary tab: 3-layer mini-synthesis for current GPS location
- [x] Summary tab: "Cities Calling You This Season" + "Your Power Places"
- [x] 4-pillar quick action CTAs (Find Where to Live, Plan Your Next Trip, etc.)
- [x] Places tab: split into "Always Good For You" and "Currently Activated"
- [x] Places tab: living/visiting toggle + theme filtering
- [x] % strength next to signal bars everywhere

### Phase 4: Travel Timeline

- [x] Timeline UI (vertical descending, grouped by month)
- [x] Range selector (1m / 3m / 6m / 1y)
- [x] Three tiers: "Especially good now" / "Watch out" / "Always good for you"
- [x] Theme filtering chips
- [x] Plain-English summaries (no jargon on main cards)
- [x] (i) tooltip for technical details
- [x] "See more" expansion for moderate entries

### Phase 5: Map + Bonds

- [x] Zoom-dependent hotspot density (15 global → 25 regional → 40 zoomed)
- [x] Hotspot filtering to visible map bounds
- [x] Map control buttons (Filter, Time, GPS)
- [x] Bonds tab with friend management
- [x] "Plan Together" CTA for shared travel timeline
- [x] Line detail view with interpretation + nearby cities

### Phase 6: Branding

- [x] Taglines integrated: "Your chart. Your world." (onboarding), "Move with the stars." (loading)
- [x] Onboarding flow with 4-pillar feature showcase
- [x] Learn tab with educational content cards

---

## Remaining / Future

- [ ] Supabase SDK integration for real OTP auth flow
- [ ] MapKit polyline rendering for astrocartography lines
- [ ] Map line labels (abbreviated text: "Venus AC", "Jupiter MC")
- [ ] Shared travel timeline for Bonds (both charts' transit windows)
- [ ] App icon iteration (crossing-lines + globe concept)
- [ ] App Store screenshots and metadata
- [ ] RevenueCat subscription integration
- [ ] Push notifications ("Some places just feel like you. That's not coincidence.")
- [ ] Additional city data beyond curated 90
- [ ] Swiss Ephemeris integration for precise planetary calculations
