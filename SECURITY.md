# Security

This project reads real financial and personal data. It is built to keep that data on your machine.

## How secrets are handled

- The committed `.mcp.json` and both in-repo MCP servers read every secret from environment variables. No token, budget id, or account number is hardcoded.
- Put your secrets in your shell environment or in `.claude/settings.local.json`. Both are gitignored. `.env`, `.env.*` (except `.env.example`), and `logs/` are gitignored too.
- The `wave` and `snaptrade` servers are read-only by construction: `wave` rejects any GraphQL `mutation`, and SnapTrade exposes no write tools. Claude creates only *unapproved* YNAB transactions and never approves them or moves money.
- SnapTrade authenticates over OAuth, so no brokerage credential is ever stored in this repo.

## Before you publish a fork

- Run `git status` and confirm no local data file (a vault export, a `logs/` file, `settings.local.json`) is staged. A blanket `git add -A` can stage anything not gitignored.
- Keep secrets out of commits. If a token ever lands in a commit, rotate it — removing the file in a later commit does not remove it from history.
- The MCP servers write request logs to `logs/`, which can contain live budget data. That directory is gitignored, but clear it before zipping or sharing the working folder.

## Reporting a problem

Found a vulnerability or a data-handling bug? Open a GitHub issue for non-sensitive reports. For anything that involves a leaked secret or exposed personal data, contact the maintainer privately rather than filing a public issue.
