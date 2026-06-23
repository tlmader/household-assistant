# Household assistant

This project integrates the [YNAB MCP server](https://github.com/calebl/ynab-mcp-server) so Claude can read and manage YNAB budgets.

## Personal data vault (optional)

If you keep a curated, local source of truth for personal-finance and records questions — for example an Obsidian vault with one structured note per entity (accounts, loans, assets, insurance policies, subscriptions, tax filings, equity grants, trips, medical history) — point Claude at it with the `PERSONAL_VAULT_PATH` env var (set in `~/.claude.json`, not committed).

When a vault is configured, read it first for any question about accounts, net worth, insurance, investments, loans, taxes, subscriptions, travel, or medical history. The vault is the digested answer; YNAB and other portals are the underlying sources you refresh it from. Give each note an `as_of_date` and re-pull from the named source when it's stale.

## Budgets

Configure your own YNAB budgets. The `YNAB_BUDGET_ID` env var (set in `~/.claude.json`, never committed) selects the default budget used when none is specified; pass `budgetId` to target another. Run `list_budgets` to see the budgets on your account.

## MCP servers

Two local-scope stdio servers (configured in `~/.claude.json`, not committed; `YNAB_API_TOKEN` lives there only):

1. **`ynab-mcp-server`** (the `calebl/ynab-mcp-server` npm dependency) — launched from its real install path, **not** npx: `node node_modules/ynab-mcp-server/dist/index.js`. Running it through `npx` loads **0 tools** (the framework resolves its tools dir from the `.bin` symlink), so it must be run from `node_modules` directly.
   - Tools: `list_budgets`, `budget_summary`, `get_unapproved_transactions`, `create_transaction`, `approve_transaction`.
2. **`ynab-transactions`** (in-repo, `mcp-servers/ynab-transactions/index.mjs`) — a small hand-rolled stdio server exposing the transaction reads the dependency omits, backed by the `ynab` SDK.
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

## Google Workspace (optional)

Some skills can pull supporting documents from Google Workspace (Drive, Gmail, Calendar). If you use them, prefer a CLI authenticated as the account that owns your data over the generic MCP connectors — the connectors often authenticate as a different account and silently return the wrong files. The `gws-*` skills wrap a `gws` CLI for this purpose; configure the account and any folder IDs locally (in `~/.claude.json` or env vars), never in this repo.

## Skills and calculations — don't compute from memory

- **For any tax, accounting, or financial calculation, load the authoritative skill first — never compute rates, brackets, thresholds, or penalties from memory.** A "conservative shortcut" presented as a number is an error, not an estimate. (Capital gains, for example, run a bracket stack with a 0% band — a flat 15% assumption overstates the tax.)
- **Front doors, in order:**
  - **OpenAccountants MCP** — call `mcp__openaccountants__start` first to scope by intent + jurisdiction, then `get_skill` each returned slug. Obey its guardrails (use only the skill's rates; flag Classified vs. Assumed vs. Needs-Input).
  - **Local finance skills** (`.claude/skills/`): `net-worth`, `spending-review`, `state-tax-estimator`, `tax-penalty-calc`, `emergency-fund`, `subscription-audit`, `debt-payoff`, `zero-based-budget`, and others. They wrap the YNAB tools — use them instead of re-deriving.
- **Skills carry the year they were written.** Verify every current-year figure (contribution caps, bracket breakpoints, standard deduction, wage bases, foreign-country rules) against a current authoritative source before relying on it.
- **Show the arithmetic and recompute.** Print the steps rather than asserting a total, and label a genuine computation vs. an assumption-driven default vs. a needs-user-input gap.
- **For high-stakes plans (a tax strategy, a large allocation), run an adversarial review** — fan out per-dimension reviewers, each loading the relevant skill, then verify each material finding before trusting it.

## Writing conventions

- **Sentence case** for all filenames and headings — capitalize only the first word and proper nouns. Applies to Markdown headings and any doc this repo produces. Proper nouns (people, brands, institutions — "Fidelity", "State Farm", "YNAB") keep their casing.
- **Always use the `writing-clearly-and-concisely` skill when writing prose** — note bodies, summaries, reports, docs, commit messages, and any human-readable text. Apply it before finalizing the writing, not as an afterthought.

## Conventions

- Do not **approve** transactions or move money automatically — leave those actions to the account owner. Categorizing, summarizing, and creating *unapproved* transactions is fine.
