# How to Run Expo & Repo/Worktree Layout

**TL;DR — Run Expo:** `cd ~/Documents/GitHub/stellaris-LUM-16` then `npx expo start`.  
**Sign-in missing?** PR #17 (LUM-15) is already merged into main. Merge main into LUM-16 (see below) to get sign-in + cyclocartography in one branch.

---

## Run Expo (one command)

From **the folder that has your app code** (see "Which folder?" below):

```bash
cd /path/to/that/folder
npx expo start
```

- **iOS simulator:** press `i` in the terminal, or scan QR with Expo Go.
- **Android:** press `a`, or scan with Expo Go.
- **Web:** press `w`.

If you need a fixed API URL (e.g. Railway backend):

```bash
EXPO_PUBLIC_API_URL=https://your-api.up.railway.app npx expo start
```

Or use the script from `package.json`:

```bash
npm run start
# or
npm run start:railway
```

---

## What you have on your machine (simplified)

You have **one Git repo** with several **checkouts** (branches/worktrees). It’s easy to mix them up because they live in different folders.

| Folder | What it is | Branch | Has cyclocartography? | Has sign-in (Supabase email OTP)? |
|--------|------------|--------|------------------------|-----------------------------------|
| `~/Documents/GitHub/stellaris-astrocartography` | Main repo (the real `.git`) | `main` | No | No |
| `~/Documents/GitHub/stellaris-LUM-16` | Worktree for LUM-16 | `codex/LUM-16-cyclocartography` | Yes (and map simple/advanced) | Same as main – may be older auth |
| `~/Documents/GitHub/stellaris-lum-15` | Worktree for LUM-15 | `codex/LUM-15-supabase-db-auth` | No | Yes (Supabase email OTP sign-in) |
| `~/.cursor/worktrees/stellaris-LUM-16/kbf` | Cursor worktree (copy of LUM-16) | detached @ same commit as LUM-16 | Yes | Same as LUM-16 |

So:

- **One repo:** `stellaris-astrocartography`.
- **Branches that matter for you:**
  - **LUM-15** = sign-in feature (Supabase email OTP). Lives in folder `stellaris-lum-15`.
  - **LUM-16** = cyclocartography + map changes. Lives in folder `stellaris-LUM-16` (and in Cursor’s `kbf` worktree).

Sign-in was built and tested on **LUM-15**. Cyclocartography was built on **LUM-16**. They were never merged, so:

- Run from **stellaris-LUM-16** (or `kbf`) → you get cyclocartography + map; sign-in may be missing or older.
- Run from **stellaris-lum-15** → you get the working sign-in; no cyclocartography.

---

## Which folder should you use to run Expo?

- **To use cyclocartography + simple/advanced map:**  
  Use **one** of these (they’re the same branch):
  - `~/Documents/GitHub/stellaris-LUM-16`
  - `~/.cursor/worktrees/stellaris-LUM-16/kbf`

  From that folder:

  ```bash
  cd ~/Documents/GitHub/stellaris-LUM-16
  npx expo start
  ```

- **To use the sign-in you built and tested:**  
  Use:

  ```bash
  cd ~/Documents/GitHub/stellaris-lum-15
  npx expo start
  ```

- **To have both in one place:** merge LUM-15 into LUM-16 (see below).

---

## Getting both sign-in and cyclocartography in one place

Right now:

- **LUM-16** = main + cyclocartography (and map) changes.
- **LUM-15** = main + Supabase email OTP sign-in (one commit ahead of main).

So sign-in exists only on LUM-15; LUM-16 doesn’t have that commit. To have both in a single checkout:

1. In the LUM-16 folder, merge main into your branch (brings in sign-in):

   ```bash
  cd ~/Documents/GitHub/stellaris-LUM-16
  git fetch origin
  git merge origin/main -m "Merge main (incl. LUM-15 sign-in) into LUM-16"
  ```

2. If Git reports conflicts, fix the marked sections in each file, then `git add` and `git commit`. Likely conflict files: `app/(tabs)/insights.tsx`, `app/city-detail.tsx`, `lib/AuthContext.tsx`, `app/auth.tsx`, `package.json`, `server/routes.ts` (keep LUM-16 for map/cyclocartography, LUM-15 for auth).

3. Run Expo from that same folder:

   ```bash
  npx expo start
  ```

After that, **one folder** (`stellaris-LUM-16`) has both sign-in and cyclocartography, and you only need to run Expo from there.

---

## Optional: simplify to one folder

You can ignore Cursor’s worktrees (`kbf`, `frh`, `lsn`) and use only:

- **stellaris-LUM-16** – for daily work (after merging LUM-15 as above).
- **stellaris-lum-15** – only if you need to compare or fix something specific to the sign-in branch.

Then “run in Expo” always means:

```bash
cd ~/Documents/GitHub/stellaris-LUM-16
npx expo start
```

(And make sure `.env` / Supabase config is set in that folder if sign-in depends on it.)
