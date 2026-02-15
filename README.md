# Stellaris Astrocartography

## Workflow
- AI/human coordination policy: `AGENTS_WORKFLOW.md`
- Lightweight issue/PR templates: `docs/LIGHTWEIGHT_TEMPLATES.md`

## Linear State Policy
Use this default flow for all work:

`Backlog -> Ready -> In Progress -> In Review -> Done`

Rules:
- Every code change starts from a Linear issue.
- One logical change per branch/PR by default.
- PR must link the Linear issue and include basic test notes.
- Move to `Done` only after merge to `main` and passing CI.
