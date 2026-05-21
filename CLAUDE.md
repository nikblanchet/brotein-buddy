# BroteinBuddy

A Progressive Web App for tracking protein shake inventory by flavor and location.

## Tech stack

- Svelte 5 (runes mode) + TypeScript
- Vite (with PWA plugin)
- Vitest (unit/integration), Playwright (E2E), `@testing-library/svelte`
- LocalStorage for offline persistence
- Supabase (Postgres + Auth) for multi-device sync via magic-link
- Deployed on Vercel

## Key features

- Weighted random flavor selection
- Visual inventory with drag-and-drop rearrange
- Box location tracking with conflict resolution
- Configurable favorite-flavor quick-pick
- Smart box selection (open before unopened, lower qty first)
- Multi-device sync with offline resilience and event timeline
- In-app Backup & Restore

## Workflow standards

All work happens in a short-lived worktree branched from `main`, squash-merged, then the worktree is deleted. See the `git-github-workflow` skill for branch-naming conventions, the worktree setup script, and post-merge cleanup. **The skill is canonical for mechanics; this file states the requirements and links out.**

### Process before every merge

1. **Plan-stage critique.** Draft the plan in plan mode. Before presenting the plan for approval, launch a fresh-context `Task` (`Plan` subagent type, framed as a structured devil's advocate) and pass it the goal and the current plan file. It should be willing to attack the premise, the approach, and the design. Incorporate its critique where it has merit. Default cap: one pass. A second pass is permitted only if the first surfaced structural objections that materially reshaped the plan. Skip entirely for changes that fit in one sentence.

2. **Implement.** Many small commits as work progresses.

3. **Local checks pass.** `npm test`, `npm run lint`, `npm run build`.

4. **Fresh-context code review.** Spawn a new `code-reviewer` subagent in a clean session. The reviewer reads only the diff and the existing codebase. **It does NOT read the PR description, planning docs, or commit messages** — those leak authorial intent and bias the review. See `git-github-workflow/references/code-reviewer-guide.md` for the full invocation prompt and blinding contract.

5. **Address blockers.** Small commits per fix. Re-run the fresh-context review if post-review changes are non-trivial.

6. **Teaching-mentor write-up.** After the user confirms ready to merge, invoke the `teaching-mentor` subagent to author an educational document in `docs/teaching/` describing the final delivered state — concepts, trade-offs, design choices a future reader would learn from. Commit to the same branch. (See `git-github-workflow/references/teacher-mentor-guide.md`.)

7. **Squash-merge. Remove worktree. Delete branch.**

### Notes on the critique steps

- **Framing.** Plan-stage critique is "structured devil's advocate" — pushy and willing to attack the premise, but not theatrically adversarial. Aggressive framing has been shown to increase downstream sycophantic deference rather than improve outcomes.
- **Context asymmetry.** The plan-stage critic SHOULD see the goal and the plan (the plan IS intent at this stage). The code-review critic should NOT see authorial intent (PR description / commit metadata / planning docs). Different stages, different blinding.
- **Exit signal.** A critic must explicitly say "no material issues" when there are none. Do not reward critics that invent issues to justify their turn.
- **When to skip.** Single-line / single-file / typo / rename. Anything where the diff describes itself in one sentence.

## Testing requirements

- 90% coverage overall, 100% for critical paths.
- All tests pass before merge. Husky pre-commit hooks enforce ESLint + Prettier.

## Project structure

```
BroteinBuddy/
├── .bare/             # bare git repository
├── .shared/           # personal files (not tracked): CLAUDE_CONTEXT.md, .planning/, .scratch/, .claude/
├── main/              # main branch worktree
├── <branch-dir>/      # short-lived worktrees (deleted after merge)
├── src/               # source
├── tests/             # unit + e2e
└── docs/              # ADRs (docs/adr/) and teaching docs (docs/teaching/)
```

## Documentation

- `README.md` — user-facing.
- `DEVELOPING.md` — developer-facing (architecture, conventions, deeper setup).
- `docs/adr/` — Architecture Decision Records.
- `docs/teaching/` — Educational write-ups, one per merged change, authored by the `teaching-mentor` subagent.

## Claude Code infrastructure

Project-specific skills and subagents are symlinked into each worktree by the setup script:

- **Skills:** `git-github-workflow` (worktree mechanics, branch naming, PR + merge flow), `brotein-buddy-standards` (testing thresholds, lint/format, doc structure).
- **Subagents:** `code-reviewer` (fresh-context diff reviewer), `teaching-mentor` (educational docs).

Skill / subagent sources live in `~/Code/repos/custom-claude-skills/` and `~/Code/repos/custom-claude-agents/`. See `DEVELOPING.md` for the symlink layout.
