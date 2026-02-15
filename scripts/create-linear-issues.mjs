#!/usr/bin/env node
/**
 * Creates the 9 Linear issues from docs/SPLIT_PR_PLAN.md
 * Run: LINEAR_API_KEY=your_key node scripts/create-linear-issues.mjs
 *
 * SECURITY: Never commit your API key. Revoke any key that was exposed in chat.
 */

const LINEAR_API = "https://api.linear.app/graphql";

async function graphql(key, query, variables = {}) {
  const res = await fetch(LINEAR_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: key,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0]?.message || JSON.stringify(json.errors));
  return json.data;
}

const ISSUES = [
  {
    title: "PR1: Foundation — Minor planets, nodes, overlap types",
    description: `**Files:**
- lib/types.ts — PlanetName (chiron, nodes, lilith, asteroids), OverlapClassification, AstroLine extensions
- lib/astronomy.ts — chiron, ceres, pallas, juno, vesta, northnode, southnode, lilith
- lib/interpretations.ts — getSideOfLineInfo, new planet content

**Done when:**
- [ ] Types and astronomy support minor planets + nodes
- [ ] Interpretations include new planets and side-of-line info

**Risk:** Medium (core chart logic)`,
  },
  {
    title: "PR2: Settings — Filter preferences",
    description: `**Files:**
- lib/settings.ts
- lib/storage.ts
- app/(tabs)/profile.tsx
- app/(tabs)/learn.tsx

**Depends on:** PR1

**Done when:**
- [ ] Settings persist includeMinorPlanets preference
- [ ] Profile and Learn use filter

**Risk:** Low`,
  },
  {
    title: "PR3: Cities — Locations & city detail",
    description: `**Files:**
- lib/cities.ts
- app/line-detail.tsx
- app/city-detail.tsx
- app/_layout.tsx (city-detail Stack.Screen only)

**Depends on:** PR1, PR2

**Done when:**
- [ ] Cities list, line-detail nearby cities, city-detail screen work

**Risk:** Low`,
  },
  {
    title: "PR4: Friend view & Live Insights",
    description: `**Files:**
- lib/FriendViewContext.tsx
- lib/friendProfile.ts
- components/LiveInsightsCard.tsx
- app/(tabs)/_layout.tsx (FriendViewProvider only)
- app/(tabs)/index.tsx
- app/(tabs)/insights.tsx
- app/friends.tsx

**Depends on:** PR1, 2, 3

**Done when:**
- [ ] View friend's chart works
- [ ] Live Insights card shows on map

**Risk:** Medium`,
  },
  {
    title: "PR5: Bonds — Synastry & Composite",
    description: `**Files:**
- lib/zodiac.ts
- lib/synastryAnalysis.ts
- app/(tabs)/bonds.tsx
- app/bond-results.tsx
- app/(tabs)/_layout.tsx (Bonds tab)
- app/_layout.tsx (bond-results Stack.Screen)
- components/AstroMap.tsx
- components/AstroMap.web.tsx

**Depends on:** PR1, 2, 3, 4

**Done when:**
- [ ] Bonds tab, synastry/composite analysis, bond results work

**Risk:** Medium`,
  },
  {
    title: "PR6: Create custom friend",
    description: `**Files:**
- app/create-custom-friend.tsx
- app/_layout.tsx (create-custom-friend Stack.Screen)
- server/routes.ts (custom-friends)
- shared/schema.ts
- server/storage.ts

**Done when:**
- [ ] Can create birth chart for someone without Stellaris account

**Risk:** Medium`,
  },
  {
    title: "PR7: Supabase auth",
    description: `**Files:**
- lib/supabase.ts
- server/supabase.ts
- app/auth.tsx
- lib/AuthContext.tsx
- lib/auth.ts
- server/auth.ts

**Done when:**
- [ ] Supabase auth integration works

**Risk:** High`,
  },
  {
    title: "PR8: Firebase (phone auth)",
    description: `**Files:**
- lib/firebase.ts
- server/firebase.ts

**Done when:**
- [ ] Firebase SDK ready for iOS phone auth

**Risk:** Medium`,
  },
  {
    title: "PR9: Config & misc",
    description: `**Files:**
- app.json, .env.example, package.json, package-lock.json
- constants/colors.ts, lib/query-client.ts, server/email.ts
- docs/IOS_LAUNCH_PLAN.md, docs/SUPABASE_SETUP.md

**Done when:**
- [ ] Config, deps, docs updated

**Risk:** Low`,
  },
];

async function main() {
  const key = process.env.LINEAR_API_KEY;
  if (!key) {
    console.error("Set LINEAR_API_KEY env var. Example:");
    console.error("  LINEAR_API_KEY=lin_api_xxx node scripts/create-linear-issues.mjs");
    process.exit(1);
  }

  // Linear expects the raw API key, NOT "Bearer <key>"
  const auth = key.replace(/^Bearer\s+/i, "");

  // Get first team
  const { teams } = await graphql(auth, `
    query { teams(first: 1) { nodes { id name key } } }
  `);
  const team = teams?.nodes?.[0];
  if (!team) {
    console.error("No team found. Create a team in Linear first.");
    process.exit(1);
  }
  console.log(`Using team: ${team.name} (${team.key})\n`);

  for (let i = 0; i < ISSUES.length; i++) {
    const issue = ISSUES[i];
    const { issueCreate } = await graphql(auth, `
      mutation Create($input: IssueCreateInput!) {
        issueCreate(input: $input) { success issue { id identifier title url } }
      }
    `, {
      input: {
        teamId: team.id,
        title: issue.title,
        description: issue.description,
      },
    });

    if (!issueCreate?.success) {
      console.error(`Failed: ${issue.title}`);
      continue;
    }
    const { identifier, title, url } = issueCreate.issue;
    console.log(`${identifier} ${title}`);
    console.log(`   ${url}\n`);
  }

  console.log("Done. Update docs/SPLIT_PR_PLAN.md with the real identifiers.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
