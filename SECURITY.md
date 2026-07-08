# Security

This project reads real financial and personal data. It is built to keep that data on your machine.

## How secrets are handled

- The committed `.mcp.json` and both in-repo MCP servers read every secret from environment variables. No token, budget id, or account number is hardcoded.
- Put your secrets in your shell environment or in `.claude/settings.local.json`. Both are gitignored. `.env`, `.env.*` (except `.env.example`), and `logs/` are gitignored too.
- The `wave` and `snaptrade` servers are read-only by construction: `wave` rejects any GraphQL `mutation`, and SnapTrade exposes no write tools. Claude creates only *unapproved* YNAB transactions and never approves them or moves money.
- SnapTrade authenticates over OAuth, so no brokerage credential is ever stored in this repo.

## PII scanning

Two layers keep personal data out of commits, and both must stay in place:

- **Committed shape rules** (`.gitleaks.toml`): gitleaks runs in the husky pre-commit hook on every staged diff, and in CI (`.github/workflows/pii.yml`) on every PR's diff, full tree, commit messages, and title/body. The rules flag real email addresses, UUIDs (YNAB budget ids), Google Drive ids, `/Users` paths, and SSN, phone, and street-address shapes, on top of the stock gitleaks secret rules. Placeholders like `you@example.com` are allowlisted.
- **Household denylist** (never committed): literal names, emails, addresses, and ids live in `.gitleaks.local.toml` at the primary checkout root (template: `.gitleaks.local.example.toml`) and in the `PII_DENYLIST_TOML` repository secret for CI. Set it up once per machine, and refresh the secret whenever the file changes: `gh secret set PII_DENYLIST_TOML < .gitleaks.local.toml`.

All scans run with `--redact`: a finding reports the rule, file, and line but never prints the matched value, because Actions logs on a public repository are readable by anyone. Fork PRs run with the committed rules only (GitHub withholds secrets from forks).

## Before you publish a fork

- Run `git status` and confirm no local data file (a vault export, a `logs/` file, `settings.local.json`) is staged. A blanket `git add -A` can stage anything not gitignored.
- Keep secrets out of commits. If a token ever lands in a commit, rotate it; removing the file in a later commit does not remove it from history.
- The MCP servers write request logs to `logs/`, which can contain live budget data. That directory is gitignored, but clear it before zipping or sharing the working folder.

## Reporting a problem

Found a vulnerability or a data-handling bug? Open a GitHub issue for non-sensitive reports. For anything that involves a leaked secret or exposed personal data, contact the maintainer privately rather than filing a public issue.
