# AI Agents Workflow Agreement

This document defines how humans and multiple AI agents coordinate work in this repo.

## Core Rules

1. Linear is the source of truth for work status and decisions.
2. GitHub is the source of truth for code and review history.
3. No coding starts without a Linear issue ID.
4. No direct pushes to `main`.
5. One logical change at a time; keep PRs small and reversible.

## Lightweight Workflow (Default)

1. Create or pick a Linear issue.
2. Move to `In Progress` and assign owner (human or agent).
3. Create branch: `codex/<LINEAR-ID>-<short-slug>`.
4. Open PR early (draft is fine) and link the Linear issue.
5. Merge after CI passes and at least one review.
6. Move Linear issue to `Done` with a short completion note.

## Minimal Ticket Standard (Fast Tasks)

Every Linear issue should include:

- `Problem`: one sentence
- `Done when`: 1-3 bullets
- `Risk`: Low/Medium/High

If this cannot be written in under 2 minutes, the issue is too big and should be split.

## Minimal PR Standard (Fast Tasks)

Every PR should include:

- `What`: one short paragraph
- `Why`: one short paragraph
- `How tested`: bullets or command output summary
- `Linear`: linked issue ID

## Multi-Agent Coordination

1. One agent owns one branch at a time.
2. Do not have two agents editing the same files concurrently.
3. If shared files are unavoidable, sequence work:
   - Agent A merges first
   - Agent B rebases and resolves conflicts
4. Agents must post a short "start comment" in Linear:
   - planned files
   - expected risk
   - expected test scope
5. Agents must post a short "finish comment" in Linear:
   - files changed
   - tests run
   - known follow-ups

## Branch and PR Conventions

- Branch: `codex/<LINEAR-ID>-<short-slug>`
- PR title: `<LINEAR-ID> <short imperative summary>`
- Commits: small and descriptive; squash merge by default

Examples:

- Branch: `codex/ASTRO-142-fix-map-tooltip`
- PR title: `ASTRO-142 Fix map tooltip overlap on iPhone`

## Splitting Rules

Split work into multiple issues/PRs when any of these are true:

- touches more than one domain (UI + backend + infra)
- estimated review time is over 20 minutes
- high-risk change mixed with low-risk refactors
- migration/schema change plus feature logic in one PR

## Definition of Done

An issue is done only when all are true:

1. Code merged to `main`
2. CI passed
3. Linear status moved to `Done`
4. User-facing changes documented (if applicable)

## Incident and Rollback Rule

If a merge causes regression:

1. Create bug issue immediately
2. Revert PR first, investigate second (unless fix is trivial and safe)
3. Link incident bug to the original issue and PR

## Human Owner Responsibilities

1. Keep backlog clean and prioritized.
2. Prevent duplicate agent work on the same issue.
3. Enforce branch protection and review rules.
4. Decide when to use feature flags for risky work.
