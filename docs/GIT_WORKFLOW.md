# Git & Linear Workflow Guide

## Worktrees: Run multiple features in parallel

You can work on several Linear issues at once by using **git worktrees** — each branch gets its own folder, so each Cursor window (or AI agent) can work on a different feature.

### Setup a worktree for an issue

From the repo root:

```bash
git checkout main && git pull

# Create the branch (or use existing)
git checkout -b codex/LUM-XX-short-description

# Create a worktree — new folder with this branch checked out
git worktree add ../stellaris-LUM-XX codex/LUM-XX-short-description
```

Then open `../stellaris-LUM-XX` in a new Cursor window. That window = that branch.

### How to ask (you or an AI agent)

Use one of these when you want a worktree for an issue:

- **"Create a worktree for LUM-15"**
- **"Set up a worktree branch for LUM-15 so I can work on it in another window"**
- **"I need a worktree for issue LUM-15 — create the branch and worktree, I'll open it in a new Cursor window"**

The agent should: create the branch from main (if needed), run `git worktree add ../stellaris-LUM-15 codex/LUM-15-slug`, and tell you the path to open.

### Worktree naming

- Path: `../stellaris-LUM-XX` or `../stellaris-astrocartography-LUM-XX`
- Keeps worktrees easy to find by issue ID

### Expo + worktrees

Expo runs against the folder you start it in. To test a feature:

```bash
cd ../stellaris-LUM-15
npx expo start
```

Expo Go will load that worktree’s code.

### Cleanup when done

```bash
# After merging the PR
git worktree remove ../stellaris-LUM-15
# or if it was deleted manually:
git worktree prune
```

---

## The "unsaved work on main" message (GitHub Desktop)

GitHub Desktop shows this when there are **untracked files** in your repo. Common causes:

- **`.cursor/`** — Cursor IDE config (we ignore this in `.gitignore`, but GitHub Desktop may still flag it)
- **New files** you haven't committed yet

**Fix:** If the only untracked item is `.cursor/`, you can ignore it. Or in GitHub Desktop: Repository → Repository Settings → check that `.cursor` is in the ignore list. The repo's `.gitignore` handles it — Git won't commit it; Desktop is just showing "something exists that isn't tracked."

---

## Merging is done

All 10 PRs have been merged. Your `main` branch now has:

- gitignore (.cursor/)
- Foundation (minor planets, nodes, etc.)
- Settings
- Cities
- Friend view & Live Insights
- Bonds (synastry/composite)
- Create custom friend
- Supabase auth
- Firebase
- Config & docs

---

## Follow-up work: Going back to change something that's merged

### Option A: New Linear issue + new branch (recommended)

1. **Create a Linear issue** for the follow-up:
   - Title: e.g. "LUM-8: Add Osaka to cities list"
   - In the description, add:
     ```
     Follow-up to LUM-8 (merged in PR #4).
     Previous work: [PR #4](https://github.com/.../pull/4)
     What we want to change: Add Osaka and Kyoto to the cities list.
     ```
   - Optional: Use Linear's "Related to" / "Blocks" to link to LUM-8

2. **Create a branch from main:**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b codex/LUM-XX-follow-up-description
   ```

3. **Make your changes**, commit, push, open PR. In the PR body:
   ```
   ## What
   Add Osaka and Kyoto to cities list.

   ## Why
   Follow-up to LUM-8 — users requested more Japan coverage.

   ## Linear
   Closes LUM-XX

   ## Context (for reviewers / AI)
   Previous work: PR #4 (LUM-8). We're adding to lib/cities.ts.
   ```

4. **Tell the AI agent** by including in the Linear issue or PR:
   - "Follow-up to LUM-8"
   - Link to the merged PR
   - Brief note: "We added ~90 cities in LUM-8. Now add Osaka, Kyoto."

### Option B: Reopen the Linear issue

- In Linear you can **reopen** a done issue (change status back to In Progress).
- Create a new branch, make changes, open a new PR.
- In the PR: "Reopened LUM-8 — adding Osaka and Kyoto."
- This keeps everything under one Linear issue, but a fresh PR for the new work.

### Option C: Reference in a new issue

- New issue: "LUM-15: Expand Japan cities"
- Description: `Related to LUM-8. PR #4 added the initial cities. We need Osaka, Kyoto.`
- Branch: `codex/LUM-15-expand-japan-cities`

---

## How to tell the AI agent about previous work

When starting a follow-up, give the agent:

1. **Linear issue ID** — e.g. "This is for LUM-15"
2. **Context** — "Follow-up to LUM-8 (cities). We want to add Osaka and Kyoto to lib/cities.ts"
3. **PR link** (optional) — "The previous work was merged in PR #4"

Example prompt:

> "I'm working on LUM-15. It's a follow-up to LUM-8 — we added cities in lib/cities.ts in PR #4. Now we need to add Osaka and Kyoto. Can you make those changes?"

---

## Branch hygiene

- **Always start from `main`** for new work: `git checkout main && git pull`
- **One branch per Linear issue**
- **Delete old branches** after merge (GitHub lets you delete on the PR page)
