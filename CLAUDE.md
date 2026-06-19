# Budgeter

This project integrates the [YNAB MCP server](https://github.com/calebl/ynab-mcp-server) so Claude can read and manage YNAB budgets.

## Budgets

Configure your own YNAB budgets. The `YNAB_BUDGET_ID` env var (set in `~/.claude.json`, never committed) selects the default budget used when none is specified; pass `budgetId` to target another. Run `list_budgets` to see the budgets on your account.

## MCP servers

Two local-scope stdio servers (configured in `~/.claude.json`, not committed; `YNAB_API_TOKEN` lives there only):

1. **`ynab-mcp-server`** (vendored `calebl/ynab-mcp-server`) — launched via the real install path, **not** npx: `node node_modules/ynab-mcp-server/dist/index.js`. Running it through `npx` loads **0 tools** (the framework resolves its tools dir from the `.bin` symlink), which is why the package is vendored locally.
   - Tools: `list_budgets`, `budget_summary`, `get_unapproved_transactions`, `create_transaction`, `approve_transaction`.
2. **`ynab-transactions`** (in-repo, `mcp-servers/ynab-transactions/index.mjs`) — a small hand-rolled stdio server exposing the transaction reads the vendored server omits, backed by the `ynab` SDK.
   - Tools: `list_transactions`, `transactions_by_category`.

New MCP tools only appear after a Claude Code session reload.

## YNAB data surface (for skills)

What the tools actually return — the single source of truth the finance skills build on:

- **`budget_summary({ month, budgetId? })`** — `month` is required (ISO `2026-06-01` or `"current"`); `budgetId` defaults to the budget set in `YNAB_BUDGET_ID`. Returns:
  - `monthBudget` — `income`, `budgeted`, `activity`, `to_be_budgeted`, `age_of_money`.
  - `accounts[]` — `name`, `type`, `on_budget`, `closed`, `balance`, `cleared_balance`, `uncleared_balance`, and for debt accounts `debt_interest_rates` / `debt_minimum_payments` (month-keyed maps).
    - Asset types: `checking`, `savings`, `cash`, `otherAsset`. Liability types (negative balance): `creditCard`, `lineOfCredit`, `mortgage`, `autoLoan`, `studentLoan`, `medicalDebt`, `otherLiability`, `otherDebt`. **Net worth = sum of all `balance`.**
  - `categories[]` — `name`, `category_group_name`, `budgeted`, `activity` (spend; negative = outflow), `balance`, and native goal fields `goal_target`, `goal_percentage_complete`, `goal_overall_funded`, `goal_overall_left`, `goal_under_funded`, `goal_target_month`.
- **`list_transactions({ sinceDate?, budgetId? })`** / **`transactions_by_category({ categoryId, sinceDate?, budgetId? })`** — posted transactions newest-first: `date`, `amount` (already dollars), `payee_name`, `category_name`, `memo`, `account_name`, `approved`, `cleared`. `sinceDate` defaults to 1 year ago. YNAB has no server-side text search — filter the returned rows yourself (by payee/memo/category) for keyword lookups.
- **Milliunits:** every amount from `budget_summary` is in milliunits — **divide by 1000** for dollars. `list_transactions` / `transactions_by_category` amounts are already dollars.

## Conventions

- Do not **approve** transactions or move money automatically — leave those actions to the account owner. Categorizing, summarizing, and creating *unapproved* transactions is fine.
