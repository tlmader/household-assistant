# Contributing

This repo is a reference example, not a maintained product. Fixes and improvements are welcome; large feature work may be out of scope. Open an issue before a big change so we can agree it fits.

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
- Docs match the change — update `README.md` and `CLAUDE.md` if you alter servers, skills, or setup.
