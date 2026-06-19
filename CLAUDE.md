# Budgeter

This project integrates the [YNAB MCP server](https://github.com/calebl/ynab-mcp-server) so Claude can read and manage YNAB budgets.

## Budgets

Configure your own YNAB budgets. The `YNAB_BUDGET_ID` env var (set in `~/.claude.json`, never committed) selects the default budget used when none is specified; pass `budgetId` to target another. Run `list_budgets` to see the budgets on your account.

## YNAB MCP server

- Configured at Claude Code **local scope** (in `~/.claude.json`, not committed). The `YNAB_API_TOKEN` lives there, never in the repo.
- Launched via the real install path, **not** npx: `node node_modules/ynab-mcp-server/dist/index.js`. Running it through `npx` loads **0 tools** (the framework resolves its tools dir from the `.bin` symlink). The package is vendored locally for this reason.
- Tools (snake_case): `list_budgets`, `budget_summary`, `get_unapproved_transactions`, `create_transaction`, `approve_transaction`.
- `budget_summary` requires a `month` argument (e.g. `"current"`).
- New MCP tools only appear after a Claude Code session reload.

## Conventions

- Do not **approve** transactions or move money automatically — leave those actions to the account owner. Categorizing, summarizing, and creating *unapproved* transactions is fine.
