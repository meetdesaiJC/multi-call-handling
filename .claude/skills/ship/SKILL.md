---
name: ship
description: Ship the current JCLite branch — run the full gate, commit everything, push, open a PR against main, and turn on Auto-fix. Use when the user types /ship or asks to ship, push, or open a PR for this work.
---

# /ship — JCLite

Ship the working tree as one PR. The user typing `/ship` is the go-ahead to
commit, push and open the PR; don't ask again. Keep the task list
(`update_plan`) to these four steps: **Review branch changes → Run verify →
Commit and push branch → Open PR**, and advance it as you go so no step is
left spinning.

## 1. Review branch changes

- `git status --short`, `git branch --show-current`, `git remote -v`.
- **On `main`?** Create a branch first: `ui/<short-kebab-summary>`.
- **Other sessions share this folder.** Check
  `mcp__ccd_session_mgmt__list_sessions`. If one with `cwd` = this repo has
  `isRunning: true`, stop and tell the user. Committing now could capture
  half-written work. Otherwise everything in the tree is the user's branch
  work and ships together.
- `gh pr list --head <branch>`: if a PR is already open, this run updates it
  (commit + push); skip creating a new one in step 4.
- **Icon index drift:** every folder in `src/icons/svg/` must be listed in
  `src/icons/svg/index.json`. Other sessions add icon folders without
  updating it, so add any that are missing (sorted). The generator reads the
  folders, so this is bookkeeping and won't change generated code.
- **Boundaries (CLAUDE.md §1):** grep for imports from one prototype into
  another. The check must return nothing:
  `grep -rn 'from "\.\./\.\./prototype-\|from "prototype-' prototype-*/src src --include='*.tsx' --include='*.ts'`

## 2. Run verify

`npm run verify` (run it in the foreground with a long timeout; it takes
~1 min). It must show **0 lint errors** and all three builds (`justcall-ai`,
`add-ons`, Storybook) succeeding. The 7 `exhaustive-deps` warnings are
pre-existing; a new warning is a regression and must be fixed. If anything
fails, fix it and re-run. Never ship red.

## 3. Commit and push branch

- `git add -A`, then a single commit. Subject: imperative, under ~72 chars,
  says what the user gets ("Lock license-blocked actions across …"). Body:
  why, then what — new pages, design-system changes, notable decisions. Match
  the repo's existing commit style (`git log -5`).
- End the message with the attribution line from the session's system
  reminder (currently `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`).
- `git push -u origin <branch>`.

## 4. Open PR

- `gh pr create --base main --head <branch>` with a body of these sections:
  **What** (2–3 short paragraphs) · **New prototype pages** · **Design system** ·
  **Assumptions to review** (every judgement call the user hasn't confirmed:
  which license locks what, hand-drawn icons, copy) · **Checks** (verify
  result, no imports between prototypes, what was checked in the preview).
  End with the PR attribution line from the system reminder.
- `mcp__ccd_pr__get_status`; if the PR isn't bound, `mcp__ccd_pr__bind_pr`
  with its URL.
- Turn on Auto-fix: `mcp__ccd_pr__set_monitor` with `auto_fix: true`,
  `address_comments: true` and the PR url. The user wants Auto-fix on every
  shipped PR. After that, don't poll CI.

## Report back

Give the PR link as `[owner/repo#N](url)`, what the commit contains
(including other sessions' work it swept up), the verify result, anything
fixed along the way, and the PR's "Assumptions to review" list.
