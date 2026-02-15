# Stellaris Astrocartography — App Roadmap

## 🔗 Bonds Feature (Relationship Astrocartography)

A new relationship-focused mode that overlays two users' astrocartographic charts on the same map. Requires the Friends system (already built) as a prerequisite.

### Dual-Toggle Interface

Two analysis modes accessible via a toggle at the top of the Bonds map view:

| Toggle | Label | Astrology Term | Purpose |
|--------|-------|----------------|---------|
| **1** | Individual Harmony | Synastry | How each person *individually* feels in a location — short-term comfort, day-to-day energy |
| **2** | Relationship Destiny | Composite | The *merged* energy of the relationship in a location — long-term shared purpose |

---

### 🌀 Synastry View (Individual Harmony)

Overlays **both** users' full line sets on the same map.

**Visual Design:**
- Lines should be rendered **very light and transparent** (high opacity, low stroke weight) to avoid visual clutter — two full charts will have up to 80 lines on screen
- The focus should be on **areas of overlap**, both positive and negative
- Where lines from both charts converge in the same region, highlight those zones (glow, pulse, or fill)
- Use each user's profile color or two distinct tint families so the viewer can tell whose line is whose

**Key Callouts:**
- **Positive overlaps** — regions where both partners have beneficial lines (Jupiter, Venus, Sun) concentrated together; surface these prominently
- **Difficult individual lines** — flag if one partner has a challenging line (Pluto, Saturn) running through an area even when the other partner has positive energy there

---

### 🪐 Composite View (Relationship Destiny)

Calculates a **single composite chart** from the midpoints of both partners' planetary positions and renders one set of astrocartographic lines.

**Visual Design:**
- Should look like a **normal, single-user chart** — clean and simple, not doubled up
- Standard line weight and opacity (same as the solo map experience)

**Language & Tone:**
- All interpretations and card text should be phrased from the perspective of the relationship: *"Your composite chart suggests…"*, *"Together, your shared energy in this region…"*
- Emphasize long-term, shared-purpose language (building a life, partnership goals, collective growth)

---

### 📚 Educational Tooltips

Pop-up tooltips that explain the difference between the two modes when the user first encounters Bonds or taps an info icon:

- **Synastry tooltip:** *"Synastry shows how each of you individually feels in a place — think short-term comfort, personal energy, and day-to-day vibes."*
- **Composite tooltip:** *"The Composite chart merges both of your charts into one. It reveals your shared destiny — where you thrive as a unit over the long term."*

---

### 🚩 Red Flag Notifications (Areas of Interest)

Intelligent alerts that cross-reference the two views to surface important insights:

#### Red Flags
> [!CAUTION]
> If the **Composite view** looks great in a region but the **Synastry view** reveals that one partner has a very difficult line (Pluto or Saturn) running through that same area — trigger a **Red Flag** notification.

- Example: *"⚠️ Your composite chart loves Tokyo, but Partner B has a Pluto-DSC line here. This could mean intense personal transformation for them even though the relationship energy is strong."*
- These alerts help users avoid locations that look ideal on paper but may cause stress for one person individually.

#### Positive Synastry Overlaps
- Surface any regions where both partners share strongly **positive** line overlaps (Venus, Jupiter, Sun near each other)
- Example: *"✨ Both of you have benefic lines converging near Lisbon — this area is harmonious for each of you individually."*

#### Composite Insights
- For the Destiny view, keep insights straightforward — one merged chart, phrased in the collective:
- *"Your composite Sun-MC line runs through this region, suggesting it's a place where your partnership can achieve public recognition and career growth together."*

---

## Birth Time Unknown Mode

Many users don't know their exact birth time. Planet positions (signs) are mostly accurate without time — outer planets barely move in a day, even the Sun only shifts ~1°. The Moon (~13°/day) is the exception. However, **astrocartography lines shift dramatically** — MC/IC/ASC/DSC depend on Greenwich Sidereal Time at birth, which rotates ~360° over 24 hours.

**Plan:**
- Add a "I don't know my birth time" toggle during onboarding
- Default to noon (12:00) when time is unknown
- Show a persistent disclaimer banner on the Map: *"Lines are approximate — exact birth time improves accuracy"*
- Still allow full app usage (insights, city analysis, etc.) with the caveat
- Later: offer birth time rectification as a premium feature

---

## Monetization Strategy

### Competitor Landscape
- **Co-Star:** Free with optional in-app purchases for deeper readings
- **The Pattern:** Completely free (ad-supported / data play)
- **Sanctuary:** Free base + paid astrologer consultations ($20-50/session)
- **Astro.com AstroClick Travel:** Free basic astrocartography; advanced reports behind paywall
- Most successful astrology apps use freemium models — free hook, paid depth

### Recommended Model: Freemium + One-Time Unlock

| Tier | Price | What's Included |
|------|-------|-----------------|
| **Free** | $0 | Birth chart, map with 10 core planets, basic insights summary, 3 city lookups/day |
| **Stellaris Pro** (one-time) | $7.99 | Unlimited city lookups, full Insights (Best Places + Avoid), Chiron + Nodes + Lilith lines, city detail breakdowns, export/share features |
| **Stellaris Pro+** (subscription) | $2.99/mo or $19.99/yr | Everything in Pro + asteroid lines (Ceres/Pallas/Juno/Vesta), Bonds (relationship charts), transit overlays, priority support, future premium features |

### Considerations
- **Free trial:** 7-day free trial of Pro+ to get users hooked on the full experience
- **Don't paywall the core experience** — free users should be able to see their lines and get value
- **Low one-time price** removes friction; subscription captures ongoing value from power users
- **Asteroid lines** as Pro+ feature creates clear value tier for astrology enthusiasts
- **Future:** Birth time rectification, AI-powered city recommendations, relocation reports ($4.99 each) could be add-on purchases

---

## Marketing, Branding & GTM

### Brand Identity
- **Name:** Stellaris (strong, celestial, memorable — check trademark availability)
- **Tagline options:** "Find your place in the stars" / "Where the cosmos says you belong" / "Your map, written in the stars"
- **Tone:** Mystical but accessible. Not woo-woo — smart, modern, design-forward astrology. Think Co-Star's tone meets a travel app.
- **Visual:** Dark mode by default (cosmic feel), warm gold accents, clean typography (Outfit font family)

### Target Audience
1. **Astrology enthusiasts** (18-35, primarily women) who already know their chart
2. **Travel/relocation planners** who are astro-curious ("Where should I move?")
3. **Couples** planning trips or relocations together (Bonds feature)

### Go-To-Market Strategy

**Phase 1: Influencer Seeding**
- **Helena Woods** (@helenawoodsastro) — #1 astrocartography creator, 36K+ TikTok, podcast host, featured in Elle/BuzzFeed/Economist. Ideal launch partner — offer equity/advisory role + revenue share.
- **Cosmic Vibrations** (Dom & Mishell) — married couple doing astrocartography readings on TikTok. Good for the Bonds angle.
- Offer 5-10 astrocartography creators early access + affiliate codes (20% commission on Pro upgrades)

**Phase 2: Content-Led Growth**
- Short-form content: "I moved to my Venus line and this happened" / "The city your chart says you belong in" / "POV: you check your astrocartography before booking a trip"
- Reddit: r/astrology, r/astrocartography, r/digitalnomad
- SEO: Blog posts on "best astrocartography app", "where should I live astrology"

**Phase 3: Virality Mechanics**
- Shareable city cards ("My top 3 cities according to the stars")
- Bonds results sharing ("Our composite chart loves Lisbon!")
- "Invite a friend" — both get 7 days Pro+ free

### Potential Partners
| Creator | Platform | Followers | Fit |
|---------|----------|-----------|-----|
| Helena Woods | TikTok/YT/Podcast | 36K+ TikTok | Perfect — astrocartography is her entire brand |
| Cosmic Vibrations | TikTok | Growing | Relationship astrocartography angle |
| Maren Altman | TikTok/YT | 1M+ TikTok | Broader astrology audience, great for awareness |
| Astro Poets | Twitter/Books | 500K+ | Cultural cachet, literary astro audience |

---

## Cyclocartography — Time-Based Line Activation (Subscription Killer Feature)

Your natal planetary lines never change, but **transiting planets activate them at specific times**. This is called Cyclocartography — the "when" to astrocartography's "where." This feature would give users a reason to check the app daily/weekly and is the strongest case for a subscription model.

### How It Works (Astrology)

Cyclocartography combines two timing techniques:

| Technique | Planets Used | Speed | What It Shows |
|-----------|-------------|-------|---------------|
| **Transits** | Jupiter, Saturn, Uranus, Neptune, Pluto | Slow (months to years) | Long-term activation periods. When transiting Jupiter crosses your natal Venus line, that location becomes extra lucky for love/money for months. |
| **Secondary Progressions** | Sun, Moon, Mercury, Venus, Mars | Very slow (Sun ~1°/year, Moon ~13°/year) | Deep, evolutionary shifts. Progressed Moon takes ~27 years to cycle — when it hits a natal line region, that's a significant life chapter. |

For inner planets (Sun through Mars), we use **progressions** because they transit so fast (Sun = 1°/day) that transit effects are too brief to be useful. For outer planets (Jupiter through Pluto), we use **actual transits** because they move slowly enough to create lasting activations.

### Implementation Plan

#### Phase 1: Transit Calculator (Core Engine)
- **Calculate current transiting planet positions** — extend `calculatePlanetPositions()` to accept any date (not just birth date)
- **Calculate secondary progressions** — for a given birth date and current date, compute progressed positions (1 day of ephemeris = 1 year of life)
- **Transit-to-natal aspect detection** — find when transiting/progressed planets conjunct, square, trine, or oppose natal line positions
- **Activation windows** — compute date ranges when each natal line is "active" (within orb of transit aspect)

#### Phase 2: "Active Now" UI Layer
- **Insights tab: "Active Lines" section** — show which of the user's natal lines are currently being activated by transits
- **Badge on map lines** — pulse/glow effect on lines that are currently transited
- **Activation calendar** — month-by-month view showing which lines will be active when
- **"Best Time to Visit" per city** — for each city in insights, show the next upcoming activation window

#### Phase 3: Notifications & Subscription Hook
- **Push notifications** — "Your Venus ASC line is being activated by Jupiter this month — great time to visit [City]!"
- **Weekly digest** — "This week's cosmic weather for your map"
- **Monthly forecast** — which lines are strongest this month, travel recommendations
- **Gate behind Pro+ subscription** — free users see "You have 3 lines activating this month" teaser, paid users get full details + notifications

#### Phase 4: Visual Timeline
- **Timeline scrubber** — drag a slider to see how transiting lines move across the map over time (like Solar Fire's animation but mobile-friendly)
- **Year-at-a-glance** — calendar heatmap showing which months are best for which cities
- **Transit overlays on map** — show transiting planet lines alongside natal lines in a different style (dotted, different color family)

### Technical Complexity Estimate
- Phase 1: ~2 days (extend astronomy engine, add progression math)
- Phase 2: ~3 days (UI components, integration with existing insights/map)
- Phase 3: ~2 days (push notification setup, subscription gating)
- Phase 4: ~3 days (timeline animation, calendar visualization)
- **Total: ~10 days** for full cyclocartography feature

### Why This Is the Subscription Killer Feature
1. **Daily/weekly engagement** — "What's active on my map right now?" gives users a reason to open the app constantly
2. **Time-sensitive notifications** — creates urgency and FOMO ("Jupiter is crossing your Venus line THIS MONTH")
3. **Travel planning utility** — "When is the best time to visit Paris?" is incredibly actionable
4. **Always changing** — unlike static natal lines, transits ensure fresh content every time the user opens the app
5. **Natural paywall** — free users see that lines are activating but need to subscribe for details

---

## Future Considerations

- **Multiple bonds:** Allow viewing Bonds with different friends (one at a time)
- **Saved locations:** Let couples bookmark locations and add notes
- **Travel planning mode:** Compare Synastry + Composite for a shortlist of cities
- **Temporal layers:** Add transit overlays on top of Bonds charts for "best time to visit" features
- **AI city recommendations:** "Tell me what you're looking for" → personalized city suggestions
- **Relocation reports:** Downloadable PDF with full analysis of a city ($4.99 add-on)
- **Birth time rectification:** Use life events to estimate birth time (premium feature)
