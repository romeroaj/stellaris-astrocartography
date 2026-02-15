# Split PR Plan — Option B

This document maps accumulated work into logical PRs for Linear + GitHub workflow. PRs must be merged **in order** due to dependencies.

## Quick start

1. Linear issues LUM-6 through LUM-14 are already created.

2. Execute PR 0 first (gitignore), merge it.

3. Work through PR 1, 2, 3… **in order**. For each PR:
   - `git checkout main && git pull` (after the previous PR is merged)
   - `git checkout -b codex/LUM-XX-slug`
   - `git add <only the files listed for this PR>`
   - For files with mixed changes (e.g. `_layout.tsx`): use `git add -p` to stage only relevant hunks
   - `git commit` and push
   - Open PR, link Linear, merge
   - Repeat for next PR

**Tip:** Your uncommitted changes will remain in the working dir between PRs. After merging a PR, when you `git checkout main && git pull`, files you already committed will sync with main; the rest stay as local modifications for the next PR.

Use branch format: `codex/<LINEAR-ID>-<short-slug>`. Your Linear IDs: LUM-6 through LUM-14.

---

## Merge Order & File Assignments

### PR 0: Chore — gitignore (no Linear required)
**Branch:** `chore/gitignore-cursor`  
**Files:**
- `.gitignore` (add `.cursor/`)

**Commands:**
```bash
git checkout -b chore/gitignore-cursor
git add .gitignore
git commit -m "chore: ignore .cursor/ in gitignore"
git push -u origin chore/gitignore-cursor
```

---

### PR 1: Foundation — Minor planets, nodes, overlap types
**Linear:** [LUM-6](https://linear.app/lumina-astro/issue/LUM-6)  
**Branch:** `codex/LUM-6-foundation-minor-planets`

**Files:**
- `lib/types.ts` — PlanetName (chiron, nodes, lilith, asteroids), OverlapClassification, AstroLine extensions
- `lib/astronomy.ts` — chiron, ceres, pallas, juno, vesta, northnode, southnode, lilith
- `lib/interpretations.ts` — getSideOfLineInfo, new planet content

**Commands:**
```bash
git checkout main && git pull
git checkout -b codex/ASTRO-XXX-foundation-minor-planets
git add lib/types.ts lib/astronomy.ts lib/interpretations.ts
git commit -m "feat: add minor planets, nodes, overlap types, side-of-line"
git push -u origin codex/ASTRO-XXX-foundation-minor-planets
```

---

### PR 2: Settings — Filter preferences
**Linear:** [LUM-7](https://linear.app/lumina-astro/issue/LUM-7)  
**Branch:** `codex/LUM-7-settings-minor-planets`

**Files:**
- `lib/settings.ts`
- `lib/storage.ts`
- `app/(tabs)/profile.tsx`
- `app/(tabs)/learn.tsx`

**Depends on:** PR 1 (PlanetName, filterAstroLines)

**Commands:**
```bash
git checkout main && git pull   # after PR1 merged
git checkout -b codex/ASTRO-XXX-settings-minor-planets
git add lib/settings.ts lib/storage.ts app/\(tabs\)/profile.tsx app/\(tabs\)/learn.tsx
git commit -m "feat: settings for minor planets filter"
git push -u origin codex/ASTRO-XXX-settings-minor-planets
```

---

### PR 3: Cities — Locations & city detail
**Linear:** [LUM-8](https://linear.app/lumina-astro/issue/LUM-8)  
**Branch:** `codex/LUM-8-cities-locations`

**Files:**
- `lib/cities.ts`
- `app/line-detail.tsx`
- `app/city-detail.tsx`
- `app/_layout.tsx` — add only the `city-detail` Stack.Screen line (use `git add -p`)

**Depends on:** PR 1, PR 2 (filterAstroLines, getSideOfLineInfo)

**Commands:**
```bash
git checkout main && git pull
git checkout -b codex/ASTRO-XXX-cities-locations
git add lib/cities.ts app/line-detail.tsx app/city-detail.tsx
git commit -m "feat: cities list, line-detail nearby cities, city-detail screen"
git push -u origin codex/ASTRO-XXX-cities-locations
```

---

### PR 4: Friend view & Live Insights
**Linear:** [LUM-9](https://linear.app/lumina-astro/issue/LUM-9)  
**Branch:** `codex/LUM-9-friend-view-live-insights`

**Files:**
- `lib/FriendViewContext.tsx`
- `lib/friendProfile.ts`
- `components/LiveInsightsCard.tsx`
- `app/(tabs)/_layout.tsx` — add FriendViewProvider wrapper only; do NOT add Bonds tab yet (use `git add -p`)
- `app/(tabs)/index.tsx`
- `app/(tabs)/insights.tsx`
- `app/friends.tsx`

**Depends on:** PR 1, 2, 3 (cities, settings, interpretations)

**Commands:**
```bash
git checkout main && git pull
git checkout -b codex/ASTRO-XXX-friend-view-live-insights
git add lib/FriendViewContext.tsx lib/friendProfile.ts components/LiveInsightsCard.tsx
git add app/\(tabs\)/_layout.tsx app/\(tabs\)/index.tsx app/\(tabs\)/insights.tsx app/friends.tsx
git commit -m "feat: view friend's chart, Live Insights card"
git push -u origin codex/ASTRO-XXX-friend-view-live-insights
```

---

### PR 5: Bonds — Synastry & Composite
**Linear:** [LUM-10](https://linear.app/lumina-astro/issue/LUM-10)  
**Branch:** `codex/LUM-10-bonds-synastry-composite`

**Files:**
- `lib/zodiac.ts`
- `lib/synastryAnalysis.ts`
- `app/(tabs)/bonds.tsx`
- `app/bond-results.tsx`
- `app/(tabs)/_layout.tsx` — add Bonds tab only (use `git add -p`; FriendViewProvider was added in PR 4)
- `app/_layout.tsx` — add only the `bond-results` Stack.Screen line (use `git add -p`)
- `components/AstroMap.tsx`
- `components/AstroMap.web.tsx`

**Depends on:** PR 1, 2, 3, 4 (cities, types, settings)

**Commands:**
```bash
git checkout main && git pull
git checkout -b codex/ASTRO-XXX-bonds-synastry-composite
git add lib/zodiac.ts lib/synastryAnalysis.ts app/\(tabs\)/bonds.tsx app/bond-results.tsx
git add components/AstroMap.tsx components/AstroMap.web.tsx
git commit -m "feat: Bonds tab, synastry/composite analysis, bond results"
git push -u origin codex/ASTRO-XXX-bonds-synastry-composite
```

---

### PR 6: Create custom friend
**Linear:** [LUM-11](https://linear.app/lumina-astro/issue/LUM-11)  
**Branch:** `codex/LUM-11-create-custom-friend`

**Files:**
- `app/create-custom-friend.tsx`
- `app/_layout.tsx` — add only the `create-custom-friend` Stack.Screen line (use `git add -p`)
- `server/routes.ts` (custom-friends endpoints)
- `shared/schema.ts` (custom-friends table)
- `server/storage.ts` (if custom-friend storage)

**Depends on:** auth (may overlap with PR 7)

**Commands:**
```bash
git checkout main && git pull
git checkout -b codex/ASTRO-XXX-create-custom-friend
git add app/create-custom-friend.tsx server/routes.ts shared/schema.ts server/storage.ts
# Only add the relevant portions if routes/storage have other changes - may need manual split
git commit -m "feat: create custom friend (birth chart without account)"
git push -u origin codex/ASTRO-XXX-create-custom-friend
```

**Note:** If `server/routes.ts` or `server/storage.ts` mix custom-friend logic with Supabase/auth, you may need to combine PR 6 and 7 or do a careful manual split.

---

### PR 7: Supabase auth
**Linear:** [LUM-12](https://linear.app/lumina-astro/issue/LUM-12)  
**Branch:** `codex/LUM-12-supabase-auth`

**Files:**
- `lib/supabase.ts`
- `server/supabase.ts`
- `app/auth.tsx`
- `lib/AuthContext.tsx`
- `lib/auth.ts`
- `server/auth.ts`

**Commands:**
```bash
git checkout main && git pull
git checkout -b codex/ASTRO-XXX-supabase-auth
git add lib/supabase.ts server/supabase.ts app/auth.tsx lib/AuthContext.tsx lib/auth.ts server/auth.ts
git commit -m "feat: Supabase auth integration"
git push -u origin codex/ASTRO-XXX-supabase-auth
```

---

### PR 8: Firebase (phone auth)
**Linear:** [LUM-13](https://linear.app/lumina-astro/issue/LUM-13)  
**Branch:** `codex/LUM-13-firebase-phone-auth`

**Files:**
- `lib/firebase.ts`
- `server/firebase.ts`

**Commands:**
```bash
git checkout main && git pull
git checkout -b codex/ASTRO-XXX-firebase-phone-auth
git add lib/firebase.ts server/firebase.ts
git commit -m "feat: Firebase SDK for phone auth (iOS launch)"
git push -u origin codex/ASTRO-XXX-firebase-phone-auth
```

---

### PR 9: Config & misc
**Linear:** [LUM-14](https://linear.app/lumina-astro/issue/LUM-14)  
**Branch:** `codex/LUM-14-config-misc`

**Files:**
- `app.json`
- `.env.example`
- `package.json`
- `package-lock.json`
- `constants/colors.ts`
- `lib/query-client.ts`
- `lib/types.ts` (if any remaining)
- `server/email.ts`
- `docs/IOS_LAUNCH_PLAN.md`
- `docs/SUPABASE_SETUP.md`

**Commands:**
```bash
git checkout main && git pull
git checkout -b codex/ASTRO-XXX-config-misc
git add app.json .env.example package.json package-lock.json constants/colors.ts lib/query-client.ts server/email.ts docs/IOS_LAUNCH_PLAN.md docs/SUPABASE_SETUP.md
git commit -m "chore: config, deps, docs for iOS/Supabase"
git push -u origin codex/ASTRO-XXX-config-misc
```

**Note:** `lib/types.ts` was in PR 1; if there are leftover edits, add them to PR 1 or handle here.

---

## Handling Overlaps

Some files (e.g. `server/routes.ts`, `shared/schema.ts`) may touch multiple features. Options:

1. **Combine PRs** — e.g. merge PR 6 and 7 if routes/auth are intertwined.
2. **Manual split** — use `git add -p` to stage only relevant hunks.
3. **Defer** — put the whole file in the first PR that needs it, document in the next PR that it builds on that.

---

## Workflow Reminder

1. Create Linear issue for each PR (except PR 0).
2. Move to "In Progress", assign owner.
3. Create branch, commit, push.
4. Open PR, link Linear issue, fill template.
5. Merge after review.
6. Move Linear issue to "Done".
7. Pull `main` before starting the next PR.
