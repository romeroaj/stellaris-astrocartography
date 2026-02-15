# Stellaris Astrocartography

## Workflow
- AI/human coordination policy: `AGENTS_WORKFLOW.md`
- Lightweight issue/PR templates: `docs/LIGHTWEIGHT_TEMPLATES.md`
- **Git + Linear + worktrees:** `docs/GIT_WORKFLOW.md` — worktrees, follow-ups, how to ask for a worktree branch

### Worktrees: parallel work on multiple issues

To work on several Linear issues at once (e.g. different Cursor chats or windows):

- **Ask:** *"Create a worktree for LUM-15"* or *"Set up a worktree branch for LUM-XX"*
- Opens a separate folder per branch so each window can work on a different feature
- See `docs/GIT_WORKFLOW.md` for setup and usage

## Linear State Policy
Use this default flow for all work:

`Backlog -> Ready -> In Progress -> In Review -> Done`

Rules:
- Every code change starts from a Linear issue.
- One logical change per branch/PR by default.
- PR must link the Linear issue and include basic test notes.
- Move to `Done` only after merge to `main` and passing CI.
