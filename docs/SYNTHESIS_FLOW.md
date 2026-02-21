# Location Synthesis Data Flow

The app builds a single “Your story here” narrative per city by layering: **Natal Promise** → **ACG lines** → **Relocated houses** → **CCG (timing)**.

## Acronyms

- **ACG** = Astrocartography. The planetary lines on the map (planet conjunct ASC/DSC/MC/IC).
- **CCG** = Cyclocartography. Timing — when transits and progressions activate those lines.

## Pipeline

Keep this diagram updated when the synthesis pipeline changes.

```mermaid
flowchart LR
  subgraph inputs [Inputs]
    Profile[Birth Profile]
    Target[Target lat lon]
  end
  subgraph engine [Engine]
    Positions[Planet Positions]
    GST[GST]
    Lines[ACG Lines]
    Nearest[findNearestLines]
    Relocated[computeRelocatedChart]
    Highlights[getRelocatedHighlights]
    NatalCond[Natal Condition]
    CCG[getCityActivation CCG]
  end
  subgraph out [Synthesis Output]
    Para[One paragraph]
    Bullets[Natal ACG Relocated CCG]
  end
  Profile --> Positions
  Profile --> GST
  Positions --> Lines
  GST --> Lines
  Lines --> Nearest
  Target --> Nearest
  Positions --> Relocated
  GST --> Relocated
  Target --> Relocated
  Relocated --> Highlights
  Positions --> NatalCond
  Profile --> CCG
  Target --> CCG
  Nearest --> Bullets
  Highlights --> Bullets
  NatalCond --> Bullets
  CCG --> Bullets
  Bullets --> Para
```

## Key modules

- `lib/relocatedChart.ts` — `computeRelocatedChart`, `getRelocatedHighlights`, house themes.
- `lib/natalCondition.ts` — natal aspects and dignity per planet for synthesis.
- `lib/synthesis.ts` — `getLocationSynthesis`, `buildSynthesisParagraph`.
- City Detail uses synthesis for the “Your Story Here” block; parans appear as “Latitude highlights”.
