# Stellaris - Astrocartography App

## Overview

Stellaris is an astrocartography mobile application built with Expo/React Native that maps a user's birth chart onto the globe, showing where different planetary energies are strongest. Users enter their birth data (date, time, location), and the app calculates planetary positions to generate astrocartographic lines (MC, IC, ASC, DSC) for 10 planets across the world map. The app has three main tabs: an interactive Map view, an Insights/exploration view, and a Profile management view. It includes an onboarding flow (FTUX) for new users.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (Expo/React Native)
- **Framework**: Expo SDK 54 with React Native 0.81, using expo-router v6 for file-based routing
- **Navigation**: Tab-based layout with three tabs (Map, Insights, Profile), plus modal screens for onboarding and line details
- **Routing structure**: `app/(tabs)/` contains the three main tab screens; `app/onboarding.tsx` and `app/line-detail.tsx` are modal screens
- **State management**: React Query (`@tanstack/react-query`) for server state; local React state with `useState` for UI state
- **Local storage**: `@react-native-async-storage/async-storage` for persisting user profiles, active profile selection, and FTUX completion status — no server-side auth currently used
- **Map rendering**: `react-native-maps` for native platforms with a custom SVG-based web fallback (`AstroMap.web.tsx`)
- **Styling**: StyleSheet-based with a dark space theme; custom color system in `constants/colors.ts` with planet-specific colors and line type styles
- **Fonts**: Outfit font family (300-700 weights) via `@expo-google-fonts/outfit`
- **Platform support**: iOS, Android, and Web (with platform-specific components using `.web.tsx` suffix)

### Astronomy Engine
- **Location**: `lib/astronomy.ts` — pure TypeScript astronomical calculations
- **Capabilities**: Julian day calculation, Greenwich Sidereal Time, obliquity of ecliptic, planetary position calculation, and astrocartographic line generation
- **Planets**: Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto
- **Line types**: MC (Midheaven), IC (Nadir), ASC (Ascendant), DSC (Descendant)
- **No external API dependency** for astronomical calculations — everything computed client-side

### Interpretations System
- **Location**: `lib/interpretations.ts`
- **Content**: Detailed interpretations for each planet-line combination (40 total), including themes, best-for recommendations, challenges, and living-there descriptions

### Backend (Express)
- **Framework**: Express 5 with TypeScript, compiled via `tsx` in dev and `esbuild` for production
- **Server file**: `server/index.ts` — handles CORS for Replit domains and localhost
- **Routes**: `server/routes.ts` — currently minimal, with `/api` prefix convention
- **Storage**: `server/storage.ts` — in-memory storage implementation with a `MemStorage` class; interface `IStorage` defined for future database migration
- **Database schema**: `shared/schema.ts` — Drizzle ORM with PostgreSQL dialect; currently defines a `users` table with id, username, password
- **Schema validation**: `drizzle-zod` for generating Zod schemas from Drizzle tables

### Build & Deployment
- **Dev workflow**: Two processes — `expo:dev` for the Expo bundler and `server:dev` for the Express server
- **Production build**: Custom build script (`scripts/build.js`) for static Expo web export, `esbuild` for server bundling
- **Server serves**: Static web build in production, with proxy to Metro in development
- **Database migrations**: Drizzle Kit with `db:push` command; config in `drizzle.config.ts`

### Key Design Decisions
1. **Client-side astronomy**: All planetary calculations run in the browser/app rather than on the server, keeping the app functional offline and reducing server load
2. **Profile storage on device**: User birth data is stored locally via AsyncStorage rather than in the database, prioritizing privacy and offline-first behavior
3. **Platform-specific map components**: Using `.web.tsx` suffix convention for the SVG-based web map fallback, while native platforms use `react-native-maps`
4. **Shared schema directory**: `shared/` folder contains code used by both client and server (Drizzle schema, types)
5. **Path aliases**: `@/*` maps to project root, `@shared/*` maps to `./shared/*`

## External Dependencies

- **Database**: PostgreSQL via Drizzle ORM (configured in `drizzle.config.ts`, requires `DATABASE_URL` environment variable)
- **Geocoding**: Location search functionality exists in the insights and profile screens (likely using an external geocoding API for converting location names to coordinates)
- **Expo Services**: Standard Expo build and development services
- **No external astrology APIs**: All astronomical calculations are self-contained in `lib/astronomy.ts`
- **Key npm packages**: expo, expo-router, react-native-maps, @tanstack/react-query, drizzle-orm, express, pg, react-native-reanimated, expo-linear-gradient, expo-haptics