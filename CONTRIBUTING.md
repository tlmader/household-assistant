# Contributing

This repo is a reference example, not a maintained product. Fixes and improvements are welcome; large feature work may be out of scope. Open an issue before a big change so we can agree it fits. The shared workflow contract lives in [AGENTS.md](AGENTS.md); start there for structure, commands, and conventions.

## Setup

```bash
pnpm install
```

This installs dev tooling and registers the husky hooks (`commit-msg` + `pre-commit`).

## Commit messages

Commits follow Conventional Commits with no scope and a required GitHub issue tag, subject capped at 72 characters:

```text
type: #123 short description
```

The `commit-msg` hook enforces this. PR titles use the same format so the squash commit can be reused verbatim, and the PR body must follow [the PR template](.github/pull_request_template.md), including a closing keyword such as `Closes #123`.

## Ground rules

- **Never commit secrets or personal data.** Tokens, budget ids, account numbers, exports, and `logs/` stay out of git. See [SECURITY.md](SECURITY.md).
- **Bundled skills are vendored, not authored here.** The finance, Google Workspace (`gws-*`), and productivity skills come from upstream projects tracked in `skills-lock.json`. Fix those upstream and re-vendor rather than editing the copies, unless the change is specific to this project's YNAB wiring.
- **Keep attribution current.** Adding a skill from a new source means adding its license and copyright to [NOTICE](NOTICE).

## Style

- Sentence case for headings and filenames; proper nouns keep their casing (YNAB, Wave, SnapTrade, Google Workspace).
- Write clearly and concisely. Active voice, concrete language, no filler.

## Before you open a pull request

- `pnpm install` succeeds and the MCP servers start.
- `git status` shows nothing personal staged.
- Docs match the change: update `README.md` and `CLAUDE.md` if you alter servers, skills, or setup.
